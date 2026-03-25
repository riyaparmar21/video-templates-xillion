import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

/* ─── Types ─── */
interface SplitScreenMorphData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  imageLeft: string;
  imageRight: string;
  labelLeft?: string;
  labelRight?: string;
  revealStyle?: "slide" | "wipe" | "push";
  orientation?: "vertical" | "horizontal";
  dividerColor?: string;
  dividerWidth?: number;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: SplitScreenMorphData;
}

/* ─── Helpers ─── */
function resolveImg(src: string): string {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
}

/* ─── Sub-components ─── */
const Label: React.FC<{
  text: string;
  side: "left" | "right" | "top" | "bottom";
  textColor: string;
  accentColor: string;
  frame: number;
  fps: number;
  delay: number;
  totalFrames: number;
}> = ({ text, side, textColor, accentColor, frame, fps, delay, totalFrames }) => {
  const entrance = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.5 },
  });
  const exitStart = totalFrames * 0.85;
  const exitOp = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isLeft = side === "left" || side === "top";
  const posStyle: React.CSSProperties = isLeft
    ? { left: 40, bottom: 80 }
    : { right: 40, bottom: 80 };

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        opacity: entrance * exitOp,
        transform: `translateY(${interpolate(entrance, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          background: accentColor,
          borderRadius: 6,
          padding: "8px 20px",
          fontSize: 24,
          fontWeight: 700,
          color: textColor,
          fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          boxShadow: `0 4px 20px ${accentColor}44`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Divider: React.FC<{
  orientation: "vertical" | "horizontal";
  progress: number;
  dividerColor: string;
  dividerWidth: number;
  width: number;
  height: number;
  frame: number;
  totalFrames: number;
}> = ({ orientation, progress, dividerColor, dividerWidth, width, height, frame, totalFrames }) => {
  const exitStart = totalFrames * 0.85;
  const exitOp = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shimmer effect on divider
  const shimmerY = interpolate(frame % 60, [0, 60], [0, 100]);

  if (orientation === "vertical") {
    const x = width * progress;
    return (
      <div
        style={{
          position: "absolute",
          left: x - dividerWidth / 2,
          top: 0,
          width: dividerWidth,
          height: "100%",
          background: `linear-gradient(180deg, ${dividerColor}00 0%, ${dividerColor} ${shimmerY}%, ${dividerColor}00 100%)`,
          opacity: exitOp,
          zIndex: 10,
          boxShadow: `0 0 20px ${dividerColor}66, 0 0 40px ${dividerColor}33`,
        }}
      />
    );
  }
  const y = height * progress;
  return (
    <div
      style={{
        position: "absolute",
        top: y - dividerWidth / 2,
        left: 0,
        height: dividerWidth,
        width: "100%",
        background: `linear-gradient(90deg, ${dividerColor}00 0%, ${dividerColor} ${shimmerY}%, ${dividerColor}00 100%)`,
        opacity: exitOp,
        zIndex: 10,
        boxShadow: `0 0 20px ${dividerColor}66, 0 0 40px ${dividerColor}33`,
      }}
    />
  );
};

/* ─── Main Component ─── */
export const SplitScreenMorph: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = data.durationFrames || Math.round((data.durationMs / 1000) * fps);
  const imageLeft = resolveImg(data.imageLeft || "");
  const imageRight = resolveImg(data.imageRight || "");
  const labelLeft = data.labelLeft || "";
  const labelRight = data.labelRight || "";
  const revealStyle = data.revealStyle || "slide";
  const orientation = data.orientation || "vertical";
  const dividerColor = data.dividerColor || data.accentColor || "#FFFFFF";
  const dividerWidth = data.dividerWidth || 4;
  const bgColor = data.bgColor || "#0A0A0A";
  const textColor = data.textColor || "#FFFFFF";
  const accentColor = data.accentColor || "#FF6B35";
  const w = data.width || 1080;
  const h = data.height || 1920;

  // Main reveal animation (0-60% of duration)
  const revealEnd = totalFrames * 0.6;
  const revealProgress = interpolate(frame, [0, revealEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Divider settles at 50%
  const dividerPos = interpolate(revealProgress, [0, 1], [0, 0.5]);

  // Exit fade
  const exitStart = totalFrames * 0.85;
  const sceneOpacity = interpolate(frame, [0, 6, exitStart, totalFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isVertical = orientation === "vertical";

  // Image positioning based on reveal style
  let leftClip: string;
  let rightClip: string;
  let leftTransform = "";
  let rightTransform = "";

  if (revealStyle === "slide") {
    if (isVertical) {
      const leftEdge = dividerPos * 100;
      leftClip = `inset(0 ${100 - leftEdge}% 0 0)`;
      rightClip = `inset(0 0 0 ${leftEdge}%)`;
      leftTransform = `translateX(${interpolate(revealProgress, [0, 1], [-30, 0])}%)`;
      rightTransform = `translateX(${interpolate(revealProgress, [0, 1], [30, 0])}%)`;
    } else {
      const topEdge = dividerPos * 100;
      leftClip = `inset(0 0 ${100 - topEdge}% 0)`;
      rightClip = `inset(${topEdge}% 0 0 0)`;
      leftTransform = `translateY(${interpolate(revealProgress, [0, 1], [-30, 0])}%)`;
      rightTransform = `translateY(${interpolate(revealProgress, [0, 1], [30, 0])}%)`;
    }
  } else if (revealStyle === "wipe") {
    if (isVertical) {
      const leftEdge = dividerPos * 100;
      leftClip = `inset(0 ${100 - leftEdge}% 0 0)`;
      rightClip = `inset(0 0 0 ${leftEdge}%)`;
    } else {
      const topEdge = dividerPos * 100;
      leftClip = `inset(0 0 ${100 - topEdge}% 0)`;
      rightClip = `inset(${topEdge}% 0 0 0)`;
    }
  } else {
    // push
    if (isVertical) {
      const offset = interpolate(revealProgress, [0, 1], [50, 0]);
      leftClip = `inset(0 50% 0 0)`;
      rightClip = `inset(0 0 0 50%)`;
      leftTransform = `translateX(${-offset}%)`;
      rightTransform = `translateX(${offset}%)`;
    } else {
      const offset = interpolate(revealProgress, [0, 1], [50, 0]);
      leftClip = `inset(0 0 50% 0)`;
      rightClip = `inset(50% 0 0 0)`;
      leftTransform = `translateY(${-offset}%)`;
      rightTransform = `translateY(${offset}%)`;
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, opacity: sceneOpacity }}>
      {/* Left/Top image */}
      {imageLeft && (
        <AbsoluteFill
          style={{
            clipPath: leftClip,
            transform: leftTransform,
          }}
        >
          <Img
            src={imageLeft}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Right/Bottom image */}
      {imageRight && (
        <AbsoluteFill
          style={{
            clipPath: rightClip,
            transform: rightTransform,
          }}
        >
          <Img
            src={imageRight}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Divider line */}
      {revealProgress > 0.05 && (
        <Divider
          orientation={orientation}
          progress={dividerPos}
          dividerColor={dividerColor}
          dividerWidth={dividerWidth}
          width={w}
          height={h}
          frame={frame}
          totalFrames={totalFrames}
        />
      )}

      {/* Labels */}
      {labelLeft && (
        <Label
          text={labelLeft}
          side={isVertical ? "left" : "top"}
          textColor={textColor}
          accentColor={accentColor}
          frame={frame}
          fps={fps}
          delay={Math.round(revealEnd * 0.7)}
          totalFrames={totalFrames}
        />
      )}
      {labelRight && (
        <Label
          text={labelRight}
          side={isVertical ? "right" : "bottom"}
          textColor={textColor}
          accentColor={accentColor}
          frame={frame}
          fps={fps}
          delay={Math.round(revealEnd * 0.8)}
          totalFrames={totalFrames}
        />
      )}
    </AbsoluteFill>
  );
};
