import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Img,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const inter = loadInter("normal", {
  weights: ["700", "800", "900"],
});

// ── Types ──

type AnimationDirection = "top" | "bottom" | "left" | "right" | "scale" | "none";

interface DepthWord {
  text: string;
  startFrame: number;
  /** Duration this word stays visible in frames (0 = stays forever once appeared) */
  durationFrames?: number;
  /** Position as fraction of canvas: 0 = left/top edge, 1 = right/bottom edge */
  x: number;
  y: number;
  /** Font size in px */
  fontSize?: number;
  /** Color override (default: white) */
  color?: string;
  /** Entrance animation direction */
  entrance?: AnimationDirection;
  /** Text alignment at the anchor point */
  align?: "left" | "center" | "right";
}

interface DepthCaptionsData {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  /** Path to the source video */
  videoSrc: string;
  /**
   * Mask pattern — a path with %05d or similar printf placeholder for frame number.
   * Example: "depth_captions_data/masks/mask_%05d.png"
   * Masks are loaded via staticFile().
   */
  maskPattern: string;
  /** Total number of mask frames available */
  maskFrameCount: number;
  /** Starting frame offset for masks (default 1 for 1-indexed) */
  maskStartIndex?: number;
  /** Words to render between video and person layers */
  words: DepthWord[];
  /** Default font size when not specified per word */
  defaultFontSize?: number;
  /** Default text color */
  defaultColor?: string;
  /** Optional text shadow for readability */
  textShadow?: string;
}

// ── Spring configs ──
const SPRING_POP = { damping: 12, stiffness: 180, mass: 0.6 };
const SPRING_SLIDE = { damping: 14, stiffness: 120, mass: 0.8 };
const EXIT_DURATION_FRAMES = 12; // smoother exit over 12 frames (0.4s at 30fps)
const ENTRANCE_DURATION_FRAMES = 10;

// ── Animated Word Component ──

const DepthWordView: React.FC<{
  word: DepthWord;
  fps: number;
  frame: number;
  canvasWidth: number;
  canvasHeight: number;
  defaultFontSize: number;
  defaultColor: string;
  textShadow: string;
}> = ({ word, fps, frame, canvasWidth, canvasHeight, defaultFontSize, defaultColor, textShadow }) => {
  // Not yet visible
  if (frame < word.startFrame) return null;

  // Past duration — hide
  if (word.durationFrames && word.durationFrames > 0) {
    if (frame >= word.startFrame + word.durationFrames) return null;
  }

  const localFrame = frame - word.startFrame;
  const fontSize = word.fontSize ?? defaultFontSize;
  const color = word.color ?? defaultColor;
  const entrance = word.entrance ?? "scale";
  const align = word.align ?? "left";

  // Entrance animation
  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  if (entrance === "scale") {
    const s = spring({ frame: localFrame, fps, config: SPRING_POP });
    scale = interpolate(s, [0, 1], [0.3, 1]);
    opacity = interpolate(s, [0, 1], [0, 1]);
  } else if (entrance === "top") {
    const s = spring({ frame: localFrame, fps, config: SPRING_SLIDE });
    translateY = interpolate(s, [0, 1], [-80, 0]);
    opacity = interpolate(s, [0, 1], [0, 1]);
  } else if (entrance === "bottom") {
    const s = spring({ frame: localFrame, fps, config: SPRING_SLIDE });
    translateY = interpolate(s, [0, 1], [80, 0]);
    opacity = interpolate(s, [0, 1], [0, 1]);
  } else if (entrance === "left") {
    const s = spring({ frame: localFrame, fps, config: SPRING_SLIDE });
    translateX = interpolate(s, [0, 1], [-120, 0]);
    opacity = interpolate(s, [0, 1], [0, 1]);
  } else if (entrance === "right") {
    const s = spring({ frame: localFrame, fps, config: SPRING_SLIDE });
    translateX = interpolate(s, [0, 1], [120, 0]);
    opacity = interpolate(s, [0, 1], [0, 1]);
  }

  // Exit animation (smooth fade + scale out over EXIT_DURATION_FRAMES)
  if (word.durationFrames && word.durationFrames > 0) {
    const exitStart = word.durationFrames - EXIT_DURATION_FRAMES;
    if (localFrame >= exitStart) {
      const exitProgress = Math.min(1, (localFrame - exitStart) / EXIT_DURATION_FRAMES);
      // Smooth ease-in for exit (starts slow, accelerates)
      const easedExit = exitProgress * exitProgress;
      opacity *= 1 - easedExit;
      scale *= interpolate(easedExit, [0, 1], [1, 0.85], {
        extrapolateRight: "clamp",
      });
      // Slide out in the opposite direction of entrance
      if (entrance === "left") translateX -= easedExit * 60;
      else if (entrance === "right") translateX += easedExit * 60;
      else if (entrance === "top") translateY -= easedExit * 40;
      else if (entrance === "bottom") translateY += easedExit * 40;
    }
  }

  // Convert normalized position to pixel coordinates
  const pixelX = word.x * canvasWidth;
  const pixelY = word.y * canvasHeight;

  // Anchor point based on alignment
  let textAlign: React.CSSProperties["textAlign"] = "left";
  let anchorTranslateX = "0%";
  if (align === "center") {
    textAlign = "center";
    anchorTranslateX = "-50%";
  } else if (align === "right") {
    textAlign = "right";
    anchorTranslateX = "-100%";
  }

  return (
    <div
      style={{
        position: "absolute",
        left: pixelX,
        top: pixelY,
        transform: `translate(${anchorTranslateX}, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: `${align} center`,
        opacity,
        fontSize,
        fontFamily: inter.fontFamily,
        fontWeight: fontSize > 80 ? 900 : fontSize > 50 ? 800 : 700,
        color,
        textShadow,
        whiteSpace: "nowrap",
        lineHeight: 1.1,
        letterSpacing: -1,
        textAlign,
      }}
    >
      {word.text}
    </div>
  );
};

// ── Person mask overlay ──
// Uses the grayscale mask as a CSS mask-image so only the person area shows through

const PersonMaskLayer: React.FC<{
  videoSrc: string;
  maskSrc: string;
  width: number;
  height: number;
}> = ({ videoSrc, maskSrc, width, height }) => {
  return (
    <AbsoluteFill
      style={{
        // The mask: white areas of the mask = visible, black = transparent
        WebkitMaskImage: `url(${maskSrc})`,
        maskImage: `url(${maskSrc})`,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    >
      <OffthreadVideo
        src={videoSrc}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// ── Main Component ──

export const DepthCaptions: React.FC<{
  data: DepthCaptionsData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const defaultFontSize = data.defaultFontSize ?? 72;
  const defaultColor = data.defaultColor ?? "#FFFFFF";
  const textShadow = data.textShadow ?? "0 2px 20px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)";

  // Resolve video source — use staticFile if it's a relative path
  const videoSrc = data.videoSrc.startsWith("http")
    ? data.videoSrc
    : staticFile(data.videoSrc);

  // Compute which mask frame to load
  const maskStart = data.maskStartIndex ?? 1;
  const maskIndex = Math.min(frame + maskStart, data.maskFrameCount + maskStart - 1);
  const maskPadded = String(maskIndex).padStart(5, "0");
  const maskSrc = staticFile(data.maskPattern.replace("%05d", maskPadded));

  return (
    <AbsoluteFill>
      {/* LAYER 1: Original video (full frame background) */}
      <AbsoluteFill>
        <OffthreadVideo
          src={videoSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* LAYER 2: Caption text (sandwiched between bg and person) */}
      <AbsoluteFill>
        {data.words.map((word, i) => (
          <DepthWordView
            key={`${i}-${word.text}`}
            word={word}
            fps={fps}
            frame={frame}
            canvasWidth={data.width}
            canvasHeight={data.height}
            defaultFontSize={defaultFontSize}
            defaultColor={defaultColor}
            textShadow={textShadow}
          />
        ))}
      </AbsoluteFill>

      {/* LAYER 3: Person cutout on top (occludes text behind body) */}
      <PersonMaskLayer
        videoSrc={videoSrc}
        maskSrc={maskSrc}
        width={data.width}
        height={data.height}
      />
    </AbsoluteFill>
  );
};

export default DepthCaptions;
