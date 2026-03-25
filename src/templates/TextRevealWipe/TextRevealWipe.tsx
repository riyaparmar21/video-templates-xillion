import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  AbsoluteFill,
} from "remotion";

/* ─── Types ─── */
interface TextRevealWipeData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  headline: string;
  subtitle?: string;
  wipeDirection?: "left" | "right" | "top" | "bottom" | "center";
  wipeColor?: string;
  headlineSize?: number;
  subtitleSize?: number;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: TextRevealWipeData;
}

/* ─── Helpers ─── */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/*
 * ─── WipeRevealBlock ───
 *
 * The core mechanic: a thick colored bar sweeps across the text region.
 * The text is clipped to only show where the bar's TRAILING edge has passed.
 * So the bar "paints" the text onto the screen as it moves.
 *
 * Timeline for one block:
 *   [startFrame → startFrame + sweepDuration]  bar enters and crosses the text area
 *   The trailing edge of the bar is the clip boundary for the text.
 *   After the bar passes, all text is visible.
 */
const WipeRevealBlock: React.FC<{
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: string;
  textTransform?: string;
  wipeColor: string;
  direction: string;
  frame: number;
  startFrame: number;
  sweepDuration: number;
  totalFrames: number;
  containerWidth: number;
  containerHeight: number;
  barWidth: number;
  yPosition: number; // center Y of this text block in the full frame
  textBlockHeight: number; // how tall this text block is
}> = ({
  text,
  fontSize,
  fontWeight,
  color,
  letterSpacing,
  textTransform,
  wipeColor,
  direction,
  frame,
  startFrame,
  sweepDuration,
  totalFrames,
  containerWidth,
  containerHeight,
  barWidth,
  yPosition,
  textBlockHeight,
}) => {
  if (!text) return null;

  const rgb = hexToRgb(wipeColor);
  const localFrame = frame - startFrame;

  // Bar sweep progress: 0 = bar hasn't entered, 1 = bar has fully exited
  // The bar travels: from off-screen → across the full width → off-screen
  const totalTravel = containerWidth + barWidth * 2; // extra for enter/exit
  const sweepProgress = interpolate(localFrame, [0, sweepDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Bar leading edge position (left edge of bar for right-moving)
  const isLeftToRight = direction === "left"; // "left" = bar enters from left, moves right (standard motion graphics convention... actually let's think about this)
  // Actually "left" wipe = text reveals left-to-right = bar moves left-to-right
  // "right" wipe = text reveals right-to-left = bar moves right-to-left

  let barLeadingEdge: number;
  let barTrailingEdge: number;
  let textClip: string;

  if (direction === "left" || direction === "right") {
    // Horizontal sweep
    const movesRight = direction === "left"; // "left" direction = sweeps left-to-right

    if (movesRight) {
      barLeadingEdge = interpolate(sweepProgress, [0, 1], [-barWidth, containerWidth]);
      barTrailingEdge = barLeadingEdge - barWidth * 0.1; // slight offset so text appears just behind
    } else {
      barLeadingEdge = interpolate(sweepProgress, [0, 1], [containerWidth, -barWidth]);
      barTrailingEdge = barLeadingEdge + barWidth + barWidth * 0.1;
    }

    // Text clip: reveal where trailing edge has passed
    if (movesRight) {
      const revealRight = Math.max(0, barLeadingEdge) / containerWidth;
      const revealPercent = Math.min(1, Math.max(0, revealRight));
      textClip = `inset(0 ${(1 - revealPercent) * 100}% 0 0)`;
    } else {
      const revealLeft = Math.min(containerWidth, barLeadingEdge + barWidth) / containerWidth;
      const revealPercent = Math.min(1, Math.max(0, 1 - revealLeft));
      textClip = `inset(0 0 0 ${revealPercent * 100}%)`;
    }
  } else if (direction === "top" || direction === "bottom") {
    const movesDown = direction === "top"; // "top" direction = sweeps top-to-bottom

    if (movesDown) {
      barLeadingEdge = interpolate(sweepProgress, [0, 1], [-barWidth, textBlockHeight]);
      const revealPercent = Math.min(1, Math.max(0, Math.max(0, barLeadingEdge) / textBlockHeight));
      textClip = `inset(0 0 ${(1 - revealPercent) * 100}% 0)`;
    } else {
      barLeadingEdge = interpolate(sweepProgress, [0, 1], [textBlockHeight, -barWidth]);
      const revealPercent = Math.min(1, Math.max(0, 1 - Math.min(textBlockHeight, barLeadingEdge + barWidth) / textBlockHeight));
      textClip = `inset(${revealPercent * 100}% 0 0 0)`;
    }
    barTrailingEdge = barLeadingEdge;
  } else {
    // center-out
    const halfReveal = sweepProgress;
    textClip = `inset(0 ${(1 - halfReveal) * 50}% 0 ${(1 - halfReveal) * 50}%)`;
    barLeadingEdge = 0;
    barTrailingEdge = 0;
  }

  // After sweep completes, text stays fully visible
  if (sweepProgress >= 1) {
    textClip = "inset(0 0 0 0)";
  }
  // Before sweep starts, text is hidden
  if (sweepProgress <= 0) {
    textClip = direction === "right"
      ? "inset(0 0 0 100%)"
      : direction === "top"
        ? "inset(100% 0 0 0)"
        : direction === "bottom"
          ? "inset(0 0 100% 0)"
          : direction === "center"
            ? "inset(0 50% 0 50%)"
            : "inset(0 100% 0 0)";
  }

  // Exit fade in last 15%
  const exitStart = totalFrames * 0.85;
  const exitOpacity = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bar visibility: only while sweeping
  const barVisible = sweepProgress > 0 && sweepProgress < 1;

  // Render the bar as a full-height colored block positioned over the text area
  const renderBar = () => {
    if (!barVisible) return null;

    const isHorizontal = direction === "left" || direction === "right" || direction === "center";

    if (direction === "center") {
      // Two bars expanding from center
      const leftPos = containerWidth / 2 - sweepProgress * (containerWidth / 2) - barWidth / 2;
      const rightPos = containerWidth / 2 + sweepProgress * (containerWidth / 2) - barWidth / 2;
      return (
        <>
          <div
            style={{
              position: "absolute",
              top: yPosition - textBlockHeight / 2 - 20,
              left: leftPos,
              width: barWidth,
              height: textBlockHeight + 40,
              background: `linear-gradient(270deg, ${wipeColor} 0%, ${wipeColor}CC 60%, transparent 100%)`,
              boxShadow: `0 0 40px 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`,
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: yPosition - textBlockHeight / 2 - 20,
              left: rightPos,
              width: barWidth,
              height: textBlockHeight + 40,
              background: `linear-gradient(90deg, ${wipeColor} 0%, ${wipeColor}CC 60%, transparent 100%)`,
              boxShadow: `0 0 40px 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`,
              borderRadius: 4,
            }}
          />
        </>
      );
    }

    if (isHorizontal) {
      const movesRight = direction === "left";
      return (
        <div
          style={{
            position: "absolute",
            top: yPosition - textBlockHeight / 2 - 30,
            left: barLeadingEdge,
            width: barWidth,
            height: textBlockHeight + 60,
            background: movesRight
              ? `linear-gradient(90deg, transparent 0%, ${wipeColor}AA 15%, ${wipeColor} 40%, ${wipeColor} 85%, ${wipeColor}66 100%)`
              : `linear-gradient(270deg, transparent 0%, ${wipeColor}AA 15%, ${wipeColor} 40%, ${wipeColor} 85%, ${wipeColor}66 100%)`,
            boxShadow: `0 0 50px 15px rgba(${rgb.r},${rgb.g},${rgb.b},0.5), 0 0 100px 30px rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`,
            borderRadius: 4,
          }}
        />
      );
    }

    // Vertical
    const movesDown = direction === "top";
    return (
      <div
        style={{
          position: "absolute",
          left: containerWidth * 0.1,
          top: yPosition - textBlockHeight / 2 + barLeadingEdge,
          width: containerWidth * 0.8,
          height: barWidth,
          background: movesDown
            ? `linear-gradient(180deg, transparent 0%, ${wipeColor}AA 15%, ${wipeColor} 40%, ${wipeColor} 85%, ${wipeColor}66 100%)`
            : `linear-gradient(0deg, transparent 0%, ${wipeColor}AA 15%, ${wipeColor} 40%, ${wipeColor} 85%, ${wipeColor}66 100%)`,
          boxShadow: `0 0 50px 15px rgba(${rgb.r},${rgb.g},${rgb.b},0.5), 0 0 100px 30px rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`,
          borderRadius: 4,
        }}
      />
    );
  };

  return (
    <>
      {/* Text layer — clipped to reveal behind bar */}
      <div
        style={{
          position: "absolute",
          top: yPosition - textBlockHeight / 2,
          left: 0,
          right: 0,
          height: textBlockHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          clipPath: textClip,
          WebkitClipPath: textClip,
          opacity: exitOpacity,
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight,
            color,
            fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
            lineHeight: 1.15,
            textAlign: "center",
            letterSpacing,
            padding: "0 80px",
            textTransform: textTransform as any,
          }}
        >
          {text}
        </div>
      </div>

      {/* Bar layer — the colored block that sweeps */}
      {renderBar()}
    </>
  );
};

/* ─── Accent Decoration ─── */
const AccentLine: React.FC<{
  frame: number;
  fps: number;
  wipeColor: string;
  startFrame: number;
  width: number;
  yPosition: number;
  totalFrames: number;
}> = ({ frame, fps, wipeColor, startFrame, width, yPosition, totalFrames }) => {
  const progress = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 18, stiffness: 100, mass: 0.5 },
  });

  const lineWidth = progress * width * 0.22;
  const exitStart = totalFrames * 0.85;
  const exitOpacity = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rgb = hexToRgb(wipeColor);

  return (
    <div
      style={{
        position: "absolute",
        top: yPosition,
        left: "50%",
        transform: "translateX(-50%)",
        width: lineWidth,
        height: 3,
        backgroundColor: wipeColor,
        borderRadius: 2,
        opacity: progress * 0.9 * exitOpacity,
        boxShadow: `0 0 16px 3px rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`,
      }}
    />
  );
};

/* ─── Main Component ─── */
export const TextRevealWipe: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = data.durationFrames || Math.round((data.durationMs / 1000) * fps);
  const headline = data.headline || "Section Title";
  const subtitle = data.subtitle || "";
  const wipeDirection = data.wipeDirection || "left";
  const wipeColor = data.wipeColor || data.accentColor || "#FF6B35";
  const headlineSize = data.headlineSize || 80;
  const subtitleSize = data.subtitleSize || 36;
  const bgColor = data.bgColor || "#0A0A0A";
  const textColor = data.textColor || "#FFFFFF";
  const w = data.width || 1080;
  const h = data.height || 1920;

  const rgb = hexToRgb(wipeColor);

  /* ── Layout: position text blocks in the frame ── */
  // Estimate wrapped line count: ~12 chars per line at given fontSize for 1080px with 80px padding each side
  const charsPerLine = Math.max(10, Math.floor((w - 160) / (headlineSize * 0.48)));
  const headlineLines = Math.max(1, Math.ceil(headline.length / charsPerLine));
  const headlineBlockHeight = headlineSize * 1.3 * headlineLines;

  const subCharsPerLine = Math.max(10, Math.floor((w - 160) / (subtitleSize * 0.48)));
  const subtitleLines = Math.max(1, Math.ceil((subtitle || "").length / subCharsPerLine));
  const subtitleBlockHeight = subtitleSize * 1.5 * subtitleLines;
  const gap = subtitle ? 50 : 0;
  const totalContentHeight = headlineBlockHeight + (subtitle ? gap + subtitleBlockHeight : 0);

  // Center the content vertically
  const contentTop = (h - totalContentHeight) / 2;
  const headlineY = contentTop + headlineBlockHeight / 2;
  const accentLineY = contentTop + headlineBlockHeight + gap * 0.35;
  const subtitleY = contentTop + headlineBlockHeight + gap + subtitleBlockHeight / 2;

  /* ── Timing ── */
  // Headline: bar sweeps from frame 8% to 40%
  const headlineStart = Math.round(totalFrames * 0.08);
  const headlineSweep = Math.round(totalFrames * 0.30);

  // Accent line: appears right after headline sweep
  const accentStart = headlineStart + headlineSweep + 2;

  // Subtitle: bar sweeps from frame 42% to 68%
  const subtitleStart = Math.round(totalFrames * 0.42);
  const subtitleSweep = Math.round(totalFrames * 0.24);

  // Bar width — thick enough to feel substantial
  const barWidth = 70;

  /* ── Scene opacity ── */
  const sceneOpacity = interpolate(
    frame,
    [0, 5, totalFrames * 0.85, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, opacity: sceneOpacity }}>
      {/* ── Subtle ambient background ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse 70% 40% at 50% 50%, rgba(${rgb.r},${rgb.g},${rgb.b},0.035) 0%, transparent 70%)`,
        }}
      />

      {/* ── Headline wipe reveal ── */}
      <WipeRevealBlock
        text={headline}
        fontSize={headlineSize}
        fontWeight={800}
        color={textColor}
        letterSpacing="-0.03em"
        wipeColor={wipeColor}
        direction={wipeDirection}
        frame={frame}
        startFrame={headlineStart}
        sweepDuration={headlineSweep}
        totalFrames={totalFrames}
        containerWidth={w}
        containerHeight={h}
        barWidth={barWidth}
        yPosition={headlineY}
        textBlockHeight={headlineBlockHeight}
      />

      {/* ── Accent line ── */}
      {subtitle && (
        <AccentLine
          frame={frame}
          fps={fps}
          wipeColor={wipeColor}
          startFrame={accentStart}
          width={w}
          yPosition={accentLineY}
          totalFrames={totalFrames}
        />
      )}

      {/* ── Subtitle wipe reveal ── */}
      {subtitle && (
        <WipeRevealBlock
          text={subtitle}
          fontSize={subtitleSize}
          fontWeight={500}
          color={`${textColor}CC`}
          letterSpacing="0.08em"
          textTransform="uppercase"
          wipeColor={wipeColor}
          direction={wipeDirection}
          frame={frame}
          startFrame={subtitleStart}
          sweepDuration={subtitleSweep}
          totalFrames={totalFrames}
          containerWidth={w}
          containerHeight={h}
          barWidth={barWidth * 0.8}
          yPosition={subtitleY}
          textBlockHeight={subtitleBlockHeight}
        />
      )}
    </AbsoluteFill>
  );
};
