import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  OffthreadVideo,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const inter = loadInter("normal", {
  weights: ["700", "800", "900"],
});

// ── Types ──

interface SpiralWord {
  text: string;
  startFrame: number;
}

interface SpiralCaptionsData {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  words: SpiralWord[];
  videoSrc?: string | null;
  showBackground?: boolean;
  backgroundColor?: string;
  textColor?: string;
  spiral?: {
    startRadius?: number;
    radiusDecayPerRevolution?: number;
    startAngle?: number;
    maxFontSize?: number;
    minFontSize?: number;
    totalRevolutions?: number;
    wordGap?: number;
    charWidthFactor?: number;
  };
}

/** A single character with its computed position on the spiral */
interface PlacedChar {
  char: string;
  x: number;
  y: number;
  fontSize: number;
  rotationDeg: number;
  opacity: number; // base opacity (fades toward center)
  startFrame: number;
}

// ── Spring config ──
const SPRING_CONFIG = { damping: 12, stiffness: 200, mass: 0.5 };

// ── Approximate character width for Inter (as fraction of fontSize) ──
const CHAR_WIDTHS: Record<string, number> = {
  // Narrow
  i: 0.24, l: 0.24, I: 0.26, "!": 0.26, ".": 0.26, ",": 0.26, "'": 0.18,
  t: 0.33, r: 0.35, f: 0.33, j: 0.24,
  // Medium-narrow
  a: 0.52, e: 0.52, s: 0.46, c: 0.48, n: 0.54, o: 0.54, u: 0.54,
  // Medium
  v: 0.50, p: 0.54, d: 0.54, b: 0.54, g: 0.54, h: 0.54, k: 0.50, y: 0.48, x: 0.48, z: 0.46,
  // Wide
  m: 0.82, w: 0.76,
  // Uppercase
  T: 0.56, R: 0.60, A: 0.62, V: 0.60, E: 0.52, L: 0.50, O: 0.64, F: 0.50,
  S: 0.54, P: 0.56, I_up: 0.26, N: 0.64, G: 0.64, H: 0.64, B: 0.58,
  C: 0.60, D: 0.64, K: 0.58, M: 0.76, W: 0.80, U: 0.64, Y: 0.56, X: 0.56, Z: 0.54,
  // Space
  " ": 0.26,
};

function charWidth(ch: string, fontSize: number, factor: number): number {
  const w = CHAR_WIDTHS[ch] ?? (ch === ch.toUpperCase() ? 0.60 : 0.52);
  return w * fontSize * factor;
}

// ── Spiral math ──

function spiralRadius(angle: number, startRadius: number, decayPerRev: number): number {
  return Math.max(0, startRadius - (decayPerRev / (2 * Math.PI)) * angle);
}

function fontSizeAtRadius(
  radius: number,
  startRadius: number,
  minRadius: number,
  maxFont: number,
  minFont: number,
): number {
  const range = startRadius - minRadius;
  const frac = range > 0 ? Math.max(0, Math.min(1, (radius - minRadius) / range)) : 1;
  return minFont + (maxFont - minFont) * frac;
}

/**
 * Walk the spiral character by character, placing each one along the arc.
 * Returns an array of PlacedChar with absolute positions relative to center.
 */
function computeCharPositions(
  words: SpiralWord[],
  startRadius: number,
  decayPerRev: number,
  startAngle: number,
  maxFontSize: number,
  minFontSize: number,
  totalRevolutions: number,
  wordGap: number,
  charFactor: number,
): PlacedChar[] {
  const maxAngle = startAngle + totalRevolutions * 2 * Math.PI;
  const endRadius = spiralRadius(maxAngle, startRadius, decayPerRev);

  let theta = startAngle;
  const placed: PlacedChar[] = [];

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const chars = word.text.split("");

    for (let ci = 0; ci < chars.length; ci++) {
      const ch = chars[ci];
      const r = spiralRadius(theta, startRadius, decayPerRev);
      if (r <= 2) break; // spiral collapsed

      const fs = fontSizeAtRadius(r, startRadius, endRadius, maxFontSize, minFontSize);
      const cw = charWidth(ch, fs, charFactor);

      // Advance by half the char width (place char at midpoint of its arc)
      const halfAngle = r > 0 ? (cw / 2) / r : 0;
      const midTheta = theta + halfAngle;

      // Position
      const mr = spiralRadius(midTheta, startRadius, decayPerRev);
      const x = mr * Math.cos(midTheta);
      const y = mr * Math.sin(midTheta);

      // Tangent rotation: +90° from radial direction
      const rotDeg = (midTheta * 180) / Math.PI + 90;

      // Opacity fades gently toward center for that reference-image look
      const range = startRadius - endRadius;
      const frac = range > 0 ? (mr - endRadius) / range : 1;
      const baseOpacity = 0.35 + 0.65 * frac; // 0.35 at center → 1.0 at edge

      placed.push({
        char: ch,
        x,
        y,
        fontSize: fs,
        rotationDeg: rotDeg,
        opacity: baseOpacity,
        startFrame: word.startFrame,
      });

      // Advance theta past the full character
      const fullAngle = r > 0 ? cw / r : 0.02;
      theta += fullAngle;

      if (theta > maxAngle) break;
    }

    if (theta > maxAngle) break;

    // Space between words
    const gapR = spiralRadius(theta, startRadius, decayPerRev);
    if (gapR > 0) {
      const gapFs = fontSizeAtRadius(gapR, startRadius, endRadius, maxFontSize, minFontSize);
      const spaceWidth = gapFs * 0.30; // inter-word space
      theta += (spaceWidth + wordGap) / gapR;
    }
  }

  return placed;
}

// ── Single character view ──

const SpiralChar: React.FC<{
  pc: PlacedChar;
  fps: number;
  frame: number;
  textColor: string;
}> = React.memo(({ pc, fps, frame, textColor }) => {
  if (frame < pc.startFrame) return null;

  const localFrame = Math.max(0, frame - pc.startFrame);
  const popIn = spring({ frame: localFrame, fps, config: SPRING_CONFIG });
  const animOpacity = interpolate(popIn, [0, 1], [0, pc.opacity]);
  const scale = interpolate(popIn, [0, 1], [0.5, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(${pc.x}px, ${pc.y}px) rotate(${pc.rotationDeg}deg) translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
        opacity: animOpacity,
        fontSize: pc.fontSize,
        fontFamily: inter.fontFamily,
        fontWeight: pc.fontSize > 36 ? 900 : pc.fontSize > 22 ? 800 : 700,
        color: textColor,
        whiteSpace: "pre",
        lineHeight: 1,
      }}
    >
      {pc.char}
    </div>
  );
});

// ── Main component ──

export const SpiralCaptions: React.FC<{
  data: SpiralCaptionsData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = {
    startRadius: data.spiral?.startRadius ?? 460,
    radiusDecayPerRevolution: data.spiral?.radiusDecayPerRevolution ?? 124,
    startAngle: data.spiral?.startAngle ?? -Math.PI / 2,
    maxFontSize: data.spiral?.maxFontSize ?? 68,
    minFontSize: data.spiral?.minFontSize ?? 22,
    totalRevolutions: data.spiral?.totalRevolutions ?? 2.8,
    wordGap: data.spiral?.wordGap ?? 16,
    charWidthFactor: data.spiral?.charWidthFactor ?? 1.12,
  };

  const bgColor = data.backgroundColor ?? "#4a5568";
  const textColor = data.textColor ?? "#FFFFFF";

  const chars = useMemo(
    () =>
      computeCharPositions(
        data.words,
        cfg.startRadius,
        cfg.radiusDecayPerRevolution,
        cfg.startAngle,
        cfg.maxFontSize,
        cfg.minFontSize,
        cfg.totalRevolutions,
        cfg.wordGap,
        cfg.charWidthFactor,
      ),
    [
      data.words,
      cfg.startRadius,
      cfg.radiusDecayPerRevolution,
      cfg.startAngle,
      cfg.maxFontSize,
      cfg.minFontSize,
      cfg.totalRevolutions,
      cfg.wordGap,
      cfg.charWidthFactor,
    ],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: data.showBackground !== false ? bgColor : "transparent",
      }}
    >
      {data.videoSrc && (
        <AbsoluteFill>
          <OffthreadVideo
            src={data.videoSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}

      <AbsoluteFill>
        {chars.map((pc, i) => (
          <SpiralChar
            key={i}
            pc={pc}
            fps={fps}
            frame={frame}
            textColor={textColor}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default SpiralCaptions;
