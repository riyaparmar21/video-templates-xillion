import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  random,
} from "remotion";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  slideIn,
  scaleIn,
  blurIn,
  springIn,
  float,
  breathe,
  shimmer,
  rotate,
  pulseGlow,
  staggerDelay,
  staggerProgress,
  rgba,
  metallicGradient,
  glowShadow,
  depthShadow,
  glassStyle,
} from "../lib/animations";

export const SplitCompare: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Params with defaults
  const title = params.title ?? undefined;
  const leftTitle = params.leftTitle ?? "Option A";
  const rightTitle = params.rightTitle ?? "Option B";
  const leftItems = params.leftItems ?? [];
  const rightItems = params.rightItems ?? [];
  const dividerStyle = params.dividerStyle ?? "line"; // "line" | "vs" | "arrow"
  const leftColor = params.leftColor ?? palette.primary;
  const rightColor = params.rightColor ?? palette.secondary;

  // Portrait mode: stack top/bottom instead of left/right
  const isPortrait = height > width;

  // Left/top side slides in
  const leftSlide = slideIn(frame, 0, isPortrait ? "up" : "left", 80, 30);
  const leftOpacity = fadeIn(frame, 0, 20);
  const leftScale = scaleIn(frame, 0, 0.9, 1, 30);

  // Right/bottom side slides in
  const rightSlide = slideIn(frame, 10, isPortrait ? "down" : "right", 80, 30);
  const rightOpacity = fadeIn(frame, 10, 20);
  const rightScale = scaleIn(frame, 10, 0.9, 1, 30);

  // Divider entrance
  const dividerScale = scaleIn(frame, 5, 0.5, 1, 25);
  const dividerOpacity = fadeIn(frame, 5, 20);

  // Continuous breathing
  const leftBreathe = breathe(frame, 50, 0.015);
  const rightBreathe = breathe(frame, 50, 0.015, 25);

  // Main title entrance
  const titleOpacity = fadeIn(frame, 0, 15);
  const titleSlide = slideIn(frame, 0, "down", 40, 20);

  // Side content top position
  const contentTop = title ? "16%" : "8%";

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
      }}
    >
      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(palette.primary, 0.12)} 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.accent, 0.07)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
        `,
        pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
        pointerEvents: "none",
      }} />

      {/* Background tints */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: isPortrait ? "100%" : "50%",
          height: isPortrait ? "50%" : "100%",
          background: `linear-gradient(${isPortrait ? "180deg" : "135deg"}, ${rgba(leftColor, 0.08)} 0%, transparent 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...(isPortrait ? { left: 0, bottom: 0 } : { right: 0, top: 0 }),
          width: isPortrait ? "100%" : "50%",
          height: isPortrait ? "50%" : "100%",
          background: `linear-gradient(${isPortrait ? "0deg" : "-135deg"}, ${rgba(rightColor, 0.08)} 0%, transparent 100%)`,
        }}
      />

      {/* Main title at top */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "6%",
            left: "50%",
            transform: `translate(-50%, 0) translateY(${titleSlide.y}px)`,
            fontSize: "56px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            textAlign: "center",
            opacity: titleOpacity,
            maxWidth: "90%",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      )}

      {/* Top/Left side */}
      <div
        style={{
          position: "absolute",
          left: isPortrait ? "5%" : "2%",
          top: contentTop,
          width: isPortrait ? "90%" : "46%",
          height: isPortrait ? "32%" : "78%",
          transform: isPortrait
            ? `translateY(${leftSlide.y || 0}px) scale(${leftScale})`
            : `translateX(${leftSlide.x}px) scale(${leftScale})`,
          opacity: leftOpacity * leftBreathe,
          boxSizing: "border-box" as const,
          display: "flex",
          flexDirection: "column" as const,
          padding: isPortrait ? "0 10px" : "0 20px",
        }}
      >
        {/* Left/top title */}
        <div
          style={{
            fontSize: "44px",
            fontWeight: 700,
            color: leftColor,
            fontFamily: typography.heading,
            textAlign: isPortrait ? "left" : "center",
            marginBottom: "20px",
            textShadow: glowShadow(leftColor, 0.4, 15),
          }}
        >
          {leftTitle}
        </div>

        {/* Left/top items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {leftItems.map((item: string, idx: number) => {
            const progress = staggerProgress(frame, idx, leftItems.length, 25, 15);
            const itemSlide = slideIn(frame, staggerDelay(idx, leftItems.length, 25), "left", 40, 15);
            return (
              <div
                key={idx}
                style={{
                  fontSize: "28px",
                  fontWeight: 500,
                  color: rgba(palette.text, 0.85),
                  fontFamily: typography.body,
                  padding: "14px 20px",
                  borderLeft: `5px solid ${leftColor}`,
                  opacity: progress,
                  transform: `translateX(${itemSlide.x}px)`,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          position: "absolute",
          ...(isPortrait
            ? {
                left: "10%",
                top: "50%",
                width: "80%",
                transform: "translate(0, -50%)",
              }
            : {
                left: "50%",
                top: contentTop,
                height: "78%",
                transform: "translate(-50%, 0)",
              }),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: dividerOpacity,
          zIndex: 5,
        }}
      >
        {dividerStyle === "line" && (
          <div
            style={{
              ...(isPortrait
                ? { height: "3px", width: "100%" }
                : { width: "3px", height: "100%" }),
              background: isPortrait
                ? `linear-gradient(to right, transparent, ${palette.accent}, transparent)`
                : `linear-gradient(to bottom, transparent, ${palette.accent}, transparent)`,
              boxShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.5, 0.9), 20),
            }}
          />
        )}

        {dividerStyle === "vs" && (
          <div
            style={{
              fontSize: "48px",
              fontWeight: 900,
              color: palette.accent,
              fontFamily: typography.heading,
              transform: `scale(${dividerScale})`,
              textShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.5, 1), 25),
              width: "80px",
              height: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: `3px solid ${rgba(palette.accent, 0.5)}`,
              boxShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.4, 0.8), 30),
              background: rgba(palette.background, 0.9),
            }}
          >
            VS
          </div>
        )}

        {dividerStyle === "arrow" && (
          <div
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: palette.accent,
              fontFamily: typography.heading,
              textShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.5, 1), 20),
              transform: `scale(${dividerScale}) rotate(${isPortrait ? 90 : 0}deg)`,
            }}
          >
            ↔
          </div>
        )}
      </div>

      {/* Bottom/Right side */}
      <div
        style={{
          position: "absolute",
          ...(isPortrait
            ? { left: "5%", bottom: "6%", width: "90%", height: "32%" }
            : { right: "2%", top: contentTop, width: "46%", height: "78%" }),
          transform: isPortrait
            ? `translateY(${-(rightSlide.y || 0)}px) scale(${rightScale})`
            : `translateX(${rightSlide.x}px) scale(${rightScale})`,
          opacity: rightOpacity * rightBreathe,
          boxSizing: "border-box" as const,
          display: "flex",
          flexDirection: "column" as const,
          padding: isPortrait ? "0 10px" : "0 20px",
        }}
      >
        {/* Right/bottom title */}
        <div
          style={{
            fontSize: "44px",
            fontWeight: 700,
            color: rightColor,
            fontFamily: typography.heading,
            textAlign: isPortrait ? "left" : "center",
            marginBottom: "20px",
            textShadow: glowShadow(rightColor, 0.4, 15),
          }}
        >
          {rightTitle}
        </div>

        {/* Right/bottom items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {rightItems.map((item: string, idx: number) => {
            const progress = staggerProgress(frame, idx, rightItems.length, 25, 15);
            const itemSlide = slideIn(frame, staggerDelay(idx, rightItems.length, 25), "right", 40, 15);
            return (
              <div
                key={idx}
                style={{
                  fontSize: "28px",
                  fontWeight: 500,
                  color: rgba(palette.text, 0.85),
                  fontFamily: typography.body,
                  padding: "14px 20px",
                  borderLeft: `5px solid ${rightColor}`,
                  opacity: progress,
                  transform: `translateX(${itemSlide.x}px)`,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
