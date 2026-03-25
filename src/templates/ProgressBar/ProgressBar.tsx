import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";

// ── Types ──

interface ProgressBarData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Target fill percentage (0–100) */
  percentage: number;
  /** Background color of the artboard */
  bgColor?: string;
  /** Track (unfilled) color */
  trackColor?: string;
  /** Track opacity (0–100) */
  trackOpacity?: number;
  /** Left (start) gradient color of the filled bar */
  fillColorStart?: string;
  /** Right (end) gradient color of the filled bar */
  fillColorEnd?: string;
  /** Bar height in px (design space) */
  barHeight?: number;
  /** Bar corner radius */
  barRadius?: number;
  /** Total bar width in px (design space) */
  barWidth?: number;
}

// ── Easing helpers ──

const easeOut = Easing.out(Easing.quad);
const easeIn = Easing.in(Easing.quad);
const naturalEase = Easing.bezier(0.25, 0.1, 0.25, 1);

// ── Timing (ms) — inspired by the Jitter spec operations ──

const TIMING = {
  // Phase 1: Track grows in from center (scale 0.5→1)
  trackGrowIn: { start: 0, end: 400 },
  // Phase 2: Progress fill animates from 0% to target
  fillAnimate: { start: 400, end: 2200 },
  // Phase 3: Hold (visible)
  // Phase 4: Shrink out at the end
  shrinkOut: { start: 3200, end: 3500 },
};

// ── Helper: ms → frame ──

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

// ── Shimmer overlay — subtle moving highlight on the filled bar ──

const ShimmerOverlay: React.FC<{
  fillWidth: number;
  barHeight: number;
  barRadius: number;
}> = ({ fillWidth, barHeight, barRadius }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shimmer cycles continuously once fill starts
  const elapsed = (frame / fps) * 1000;
  const shimmerCycle = 2000; // ms per pass
  const shimmerProgress = (elapsed % shimmerCycle) / shimmerCycle;
  // Move from left to right
  const shimmerX = interpolate(shimmerProgress, [0, 1], [-0.3, 1.3]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: fillWidth,
        height: barHeight,
        borderRadius: barRadius,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${shimmerX * 100}%`,
          width: "30%",
          height: "100%",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
          filter: "blur(6px)",
        }}
      />
    </div>
  );
};

// ── Main ProgressBar Component ──

export const ProgressBar: React.FC<{
  data: ProgressBarData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults (matched to screenshot look)
  const bgColor = data.bgColor || "#EFEFEF";
  const trackColor = data.trackColor || "#F5B8C4";
  const trackOpacity = (data.trackOpacity ?? 40) / 100;
  const fillColorStart = data.fillColorStart || "#FF1150";
  const fillColorEnd = data.fillColorEnd || "#FF6B8A";
  const barHeight = data.barHeight ?? 18;
  const barRadius = data.barRadius ?? 50;
  const barWidth = data.barWidth ?? 540;
  const percentage = Math.max(0, Math.min(data.percentage ?? 65, 100));

  // Artboard design space (centered layout)
  const ARTBOARD = { w: 680, h: 120 };

  // ── Phase 1: Track grow-in (scale 0.5→1, opacity 0→1) ──
  const growStart = msToFrame(TIMING.trackGrowIn.start, fps);
  const growEnd = msToFrame(TIMING.trackGrowIn.end, fps);

  const growProgress = interpolate(frame, [growStart, growEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const growEased = easeOut(growProgress);
  const entranceScale = interpolate(growEased, [0, 1], [0.5, 1]);
  const entranceOpacity = interpolate(growEased, [0, 1], [0, 1]);

  // ── Phase 2: Progress fill (0% → target%) ──
  const fillStart = msToFrame(TIMING.fillAnimate.start, fps);
  const fillEnd = msToFrame(TIMING.fillAnimate.end, fps);

  const fillProgress = interpolate(frame, [fillStart, fillEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fillEased = naturalEase(fillProgress);
  const currentPercent = interpolate(fillEased, [0, 1], [0, percentage]);
  const fillWidth = (currentPercent / 100) * barWidth;

  // ── Phase 3: Shrink-out (scale 1→0.8, opacity 1→0) ──
  const shrinkStart = msToFrame(TIMING.shrinkOut.start, fps);
  const shrinkEnd = msToFrame(TIMING.shrinkOut.end, fps);

  const shrinkProgress = interpolate(
    frame,
    [shrinkStart, shrinkEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shrinkEased = easeIn(shrinkProgress);
  const exitScale = interpolate(shrinkEased, [0, 1], [1, 0.8]);
  const exitOpacity = interpolate(shrinkEased, [0, 1], [1, 0]);

  // ── Combined transforms ──
  const combinedScale = entranceScale * exitScale;
  const combinedOpacity = entranceOpacity * exitOpacity;

  // Scale factor to fit artboard into composition
  const scaleX = data.width / ARTBOARD.w;
  const scaleY = data.height / ARTBOARD.h;
  const fitScale = Math.min(scaleX, scaleY);

  // Show shimmer only while filling or holding
  const showShimmer = frame >= fillStart && frame < shrinkStart;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Artboard container */}
      <div
        style={{
          width: ARTBOARD.w,
          height: ARTBOARD.h,
          position: "relative",
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Animated bar group */}
        <div
          style={{
            width: barWidth,
            height: barHeight,
            position: "relative",
            transform: `scale(${combinedScale})`,
            transformOrigin: "center center",
            opacity: combinedOpacity,
          }}
        >
          {/* Track (unfilled background) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: barRadius,
              backgroundColor: trackColor,
              opacity: trackOpacity,
            }}
          />

          {/* Filled bar with gradient */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: Math.max(fillWidth, barHeight), // min width = pill shape
              height: "100%",
              borderRadius: barRadius,
              background: `linear-gradient(90deg, ${fillColorStart} 0%, ${fillColorEnd} 100%)`,
              boxShadow: `0 2px 12px rgba(255, 17, 80, 0.3), 0 0 20px rgba(255, 17, 80, 0.15)`,
              // Clamp to bar width
              maxWidth: barWidth,
            }}
          />

          {/* Shimmer highlight */}
          {showShimmer && fillWidth > barHeight && (
            <ShimmerOverlay
              fillWidth={fillWidth}
              barHeight={barHeight}
              barRadius={barRadius}
            />
          )}

          {/* Bright dot at the leading edge of the fill */}
          {fillWidth > barHeight && frame >= fillStart && frame < shrinkStart && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: fillWidth - barHeight / 2,
                width: barHeight * 0.6,
                height: barHeight * 0.6,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.45)",
                transform: "translate(-50%, -50%)",
                filter: "blur(3px)",
              }}
            />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ProgressBar;
