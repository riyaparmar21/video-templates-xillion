import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import { interpolate as flubberInterpolate } from "flubber";
import letterPathsData from "./letter-paths.json";

// ── Types ──

interface LetterPathEntry {
  normal: { path: string; viewBox: string; width: number; height: number };
  inflated: { path: string; viewBox: string; width: number; height: number };
}

type LetterPathsMap = Record<string, LetterPathEntry>;

const letterPaths: LetterPathsMap = letterPathsData as LetterPathsMap;

interface InflatingTextData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Text to display and inflate (default: "MORPH") — uppercase recommended */
  text: string;
  /** Background color (default: #121232) */
  bgColor?: string;
  /** Text fill color (default: #00BAFF) */
  textColor?: string;
  /** Stroke color around letters (default: #121232) */
  strokeColor?: string;
  /** Stroke width in px (default: 2) */
  strokeWidth?: number;
  /** Letter gap in px (default: 4) */
  letterGap?: number;
}

// ── Easing helpers ──

/** Back easing with configurable overshoot intensity */
function easeOutBack(t: number, intensity: number = 1.70158): number {
  const c1 = intensity;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Smooth ease-out for inflate phase */
const smoothEasing = Easing.bezier(0.25, 0.1, 0.25, 1);

/** Overshoot easing matching Figma spec */
function overshootEasing(t: number): number {
  return easeOutBack(t, 0.37 * 1.70158);
}

// ── ms → frame ──

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

// ── Animation Timeline ──
//
// Based on the Figma spec screen recording:
//   Phase 1 (0–800ms):     Initial morph — letters begin morphing from normal to inflated
//   Phase 2 (310–1540ms):  Group scales up with overshoot
//   Phase 3 (310–1540ms):  Per-letter staggered shape morph (normal → inflated)
//   Phase 4 (1300–2220ms): Final group scale continues
//   The text stays within bounds throughout

const TIMING = {
  // Shape morph: normal → inflated (staggered per letter, ~110ms apart)
  morphStagger: 110, // ms between each letter starting its morph
  morphStart: 100, // first letter starts morphing
  morphDuration: 800, // each letter takes this long to fully morph

  // Group scale-up with overshoot
  groupScaleUp: { start: 310, end: 1540 },

  // Final inflate scale
  groupInflate: { start: 1300, end: 2220 },
};

// ── Morphing Letter (SVG path) ──

const MorphingLetter: React.FC<{
  char: string;
  index: number;
  totalLetters: number;
  morphProgress: number; // 0 = normal, 1 = inflated
  fillColor: string;
  strokeColor: string;
  outlineWidth: number;
  letterHeight: number;
  /** Max puffy stroke width in SVG units — grows with morphProgress */
  maxPuffStroke: number;
}> = React.memo(
  ({
    char,
    index,
    morphProgress,
    fillColor,
    strokeColor,
    outlineWidth,
    letterHeight,
    maxPuffStroke,
  }) => {
    const entry = letterPaths[char];
    if (!entry) {
      return null;
    }

    // Create flubber interpolator (memoized per character)
    const interpolator = useMemo(() => {
      try {
        return flubberInterpolate(entry.normal.path, entry.inflated.path, {
          maxSegmentLength: 8,
        });
      } catch {
        return null;
      }
    }, [entry.normal.path, entry.inflated.path]);

    // Get the morphed path
    const clampedProgress = Math.max(0, Math.min(1, morphProgress));
    const currentPath = interpolator
      ? interpolator(clampedProgress)
      : clampedProgress < 0.5
        ? entry.normal.path
        : entry.inflated.path;

    // Interpolate viewBox
    const normalVB = entry.normal.viewBox.split(" ").map(Number);
    const inflatedVB = entry.inflated.viewBox.split(" ").map(Number);
    const currentVB = normalVB.map((n, i) =>
      n + (inflatedVB[i] - n) * clampedProgress
    );

    // Interpolate dimensions
    const currentWidth =
      entry.normal.width +
      (entry.inflated.width - entry.normal.width) * clampedProgress;
    const currentHeight =
      entry.normal.height +
      (entry.inflated.height - entry.normal.height) * clampedProgress;

    // Scale to match desired letter height
    const scale = letterHeight / currentHeight;
    const svgWidth = currentWidth * scale;
    const svgHeight = letterHeight;

    // ── Puffy stroke effect ──
    // A thick stroke with the SAME fill color + round joins/caps
    // makes the letter look inflated/puffy as it grows with morphProgress.
    // The outline stroke (bg color) sits behind to separate from background.
    const puffStrokeWidth = maxPuffStroke * clampedProgress;

    // Expand the viewBox slightly to accommodate the thick stroke
    const strokePad = puffStrokeWidth * 0.6;
    const paddedVB = [
      currentVB[0] - strokePad,
      currentVB[1] - strokePad,
      currentVB[2] + strokePad * 2,
      currentVB[3] + strokePad * 2,
    ];

    return (
      <svg
        width={svgWidth + strokePad * scale * 2}
        height={svgHeight + strokePad * scale * 2}
        viewBox={paddedVB.join(" ")}
        style={{ overflow: "visible", display: "block" }}
      >
        {/* Background outline stroke (dark, for separation) */}
        {outlineWidth > 0 && (
          <path
            d={currentPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={(puffStrokeWidth + outlineWidth * 2) / scale}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Puffy fill stroke — same color as fill, round joins make it bubbly */}
        <path
          d={currentPath}
          fill={fillColor}
          stroke={fillColor}
          strokeWidth={puffStrokeWidth / scale}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
);

MorphingLetter.displayName = "MorphingLetter";

// ── Main InflatingText Component ──

export const InflatingText: React.FC<{
  data: InflatingTextData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "#121232";
  const fillColor = data.textColor || "#00BAFF";
  const strokeColor = data.strokeColor || "#121232";
  const strokeWidth = data.strokeWidth ?? 2;
  const letterGap = data.letterGap ?? 4;
  const text = (data.text || "MORPH").toUpperCase();

  const letters = text.split("");

  // ── Per-letter morph progress (staggered) ──
  const getMorphProgress = (index: number): number => {
    const startMs = TIMING.morphStart + index * TIMING.morphStagger;
    const endMs = startMs + TIMING.morphDuration;
    const startFrame = msToFrame(startMs, fps);
    const endFrame = msToFrame(endMs, fps);

    const raw = interpolate(frame, [startFrame, endFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return overshootEasing(raw);
  };

  // ── Group scale animation ──

  // Phase 2: Scale-up with overshoot (1 → 1.8)
  const scaleUpStart = msToFrame(TIMING.groupScaleUp.start, fps);
  const scaleUpEnd = msToFrame(TIMING.groupScaleUp.end, fps);
  const scaleUpRaw = interpolate(frame, [scaleUpStart, scaleUpEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scaleUp = 1 + (0.8 * overshootEasing(scaleUpRaw)); // 1 → 1.8

  // Phase 4: Continue inflating — this should push the text to fill the screen
  // From the Figma spec: group scales from 1.8 to 2.5 (factor of ~1.39)
  const inflateStart = msToFrame(TIMING.groupInflate.start, fps);
  const inflateEnd = msToFrame(TIMING.groupInflate.end, fps);
  const inflateRaw = interpolate(frame, [inflateStart, inflateEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const inflateScale = 1 + (0.39 * smoothEasing(inflateRaw)); // 1.8 * 1.39 ≈ 2.5

  const groupScale = scaleUp * inflateScale;

  // ── Fade in ──
  const fadeIn = interpolate(frame, [0, msToFrame(150, fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Calculate base letter height to fit within composition ──
  // The final inflate should nearly fill the entire screen.
  // Max group scale = 1.8 * 1.39 ≈ 2.5
  // At max scale, text should fill ~95% of the frame (edge-to-edge feel).
  // So at scale=1, the text should be ~95% / 2.5 = ~38% of frame size.
  const maxGroupScale = 2.5;
  const finalFill = 0.95; // at max scale, fill 95% of screen

  // Start by sizing to fit height
  const baseLetterHeight = (data.height * finalFill) / maxGroupScale;

  // Also constrain width: estimate total text width and ensure it fits
  const estimateTextWidth = () => {
    let totalWidth = 0;
    for (const char of letters) {
      const entry = letterPaths[char];
      if (entry) {
        // Use inflated width (larger) as worst case at full inflation
        const scale = baseLetterHeight / entry.inflated.height;
        totalWidth += entry.inflated.width * scale + letterGap;
      }
    }
    return totalWidth;
  };

  const estimatedWidth = estimateTextWidth();
  const maxTextWidth = (data.width * finalFill) / maxGroupScale;
  const widthScaleFactor =
    estimatedWidth > maxTextWidth ? maxTextWidth / estimatedWidth : 1;
  const letterHeight = baseLetterHeight * widthScaleFactor;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Text group — animated scale */}
      <div
        style={{
          transform: `scale(${groupScale})`,
          transformOrigin: "center center",
          opacity: fadeIn,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: letterGap,
        }}
      >
        {letters.map((char, i) => (
          <MorphingLetter
            key={`${char}-${i}`}
            char={char}
            index={i}
            totalLetters={letters.length}
            morphProgress={getMorphProgress(i)}
            fillColor={fillColor}
            strokeColor={strokeColor}
            outlineWidth={strokeWidth}
            letterHeight={letterHeight}
            maxPuffStroke={letterHeight * 0.12}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default InflatingText;
