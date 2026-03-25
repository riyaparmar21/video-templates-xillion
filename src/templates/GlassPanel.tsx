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

export const GlassPanel: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const title = params.title ?? "Glass Panel";
  const body = params.body ?? undefined;
  const accentColor = params.accentColor ?? palette.accent;
  const panelSize = params.size ?? "medium";
  const icon = params.icon ?? undefined;
  const cornerBrackets = params.cornerBrackets ?? false;

  // Size dimensions (percentage-based for responsive layout)
  const panelDims =
    panelSize === "small"
      ? { width: "88%", height: "auto", minHeight: "40%" }
      : panelSize === "large"
        ? { width: "92%", height: "auto", minHeight: "55%" }
        : { width: "90%", height: "auto", minHeight: "48%" };

  // Entrance animations
  const panelScale = springIn(frame, fps, 0, {
    damping: 10,
    stiffness: 120,
    mass: 0.6,
  });
  const panelOpacity = fadeIn(frame, 0, 20);
  const panelBlur = blurIn(frame, 0, 10, 20);

  // Post-entrance floating
  const postEntranceFloat = float(Math.max(0, frame - 30), 50, 4);

  // Title animation
  const titleSlide = slideIn(frame, 15, "up", 40, 25);
  const titleOpacity = fadeIn(frame, 15, 20);

  // Body text fade with staggered lines
  const bodyOpacity = fadeIn(frame, 40, 20);

  // Border glow animation
  const borderGlow = pulseGlow(frame, 30, 0.3, 1);

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
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

      {/* Main glass panel */}
      <div
        style={{
          position: "relative",
          width: panelDims.width as any,
          height: panelDims.height as any,
          minHeight: panelDims.minHeight as any,
          ...glassStyle(0.12, 35, 0.25),
          transform: `scale(${0.8 + panelScale * 0.2}) translateY(${postEntranceFloat}px)`,
          opacity: panelOpacity,
          filter: `blur(${panelBlur}px)`,
          boxShadow: `0 0 40px ${rgba(accentColor, borderGlow * 0.4)}, inset 0 0 30px ${rgba(palette.text, 0.1)}`,
          zIndex: 20,
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "50px 44px",
        }}
      >
        {/* Accent bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: accentColor,
            boxShadow: glowShadow(accentColor, 0.6, 15),
          }}
        />

        {/* Icon if provided */}
        {icon && (
          <div
            style={{
              fontSize: panelSize === "small" ? "64px" : panelSize === "large" ? "80px" : "72px",
              textAlign: "center",
              marginBottom: "28px",
              opacity: fadeIn(frame, 20, 15),
              transform: `scale(${scaleIn(frame, 20, 0.6, 1, 20)})`,
            }}
          >
            {icon}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            margin: "0 0 24px 0",
            fontSize: panelSize === "small" ? "52px" : panelSize === "large" ? "72px" : "60px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            lineHeight: 1.2,
            opacity: titleOpacity,
            transform: `translateY(${titleSlide.y}px)`,
          }}
        >
          {title}
        </h1>

        {/* Body text */}
        {body && (
          <p
            style={{
              margin: "0",
              fontSize: panelSize === "small" ? "34px" : panelSize === "large" ? "40px" : "36px",
              fontWeight: 400,
              color: rgba(palette.text, 0.85),
              fontFamily: typography.body,
              lineHeight: "1.5",
              opacity: bodyOpacity,
            }}
          >
            {body}
          </p>
        )}

        {/* Corner brackets if enabled */}
        {cornerBrackets && (
          <>
            {/* Top-left bracket */}
            <svg
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                width: "24px",
                height: "24px",
                opacity: fadeIn(frame, 25, 15),
                stroke: accentColor,
                strokeWidth: "2",
                fill: "none",
              }}
              viewBox="0 0 24 24"
            >
              <path d="M 4 4 L 4 12 M 4 4 L 12 4" />
            </svg>

            {/* Top-right bracket */}
            <svg
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "24px",
                height: "24px",
                opacity: fadeIn(frame, 25, 15),
                stroke: accentColor,
                strokeWidth: "2",
                fill: "none",
              }}
              viewBox="0 0 24 24"
            >
              <path d="M 20 4 L 20 12 M 20 4 L 12 4" />
            </svg>

            {/* Bottom-left bracket */}
            <svg
              style={{
                position: "absolute",
                bottom: "12px",
                left: "12px",
                width: "24px",
                height: "24px",
                opacity: fadeIn(frame, 25, 15),
                stroke: accentColor,
                strokeWidth: "2",
                fill: "none",
              }}
              viewBox="0 0 24 24"
            >
              <path d="M 4 20 L 4 12 M 4 20 L 12 20" />
            </svg>

            {/* Bottom-right bracket */}
            <svg
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                width: "24px",
                height: "24px",
                opacity: fadeIn(frame, 25, 15),
                stroke: accentColor,
                strokeWidth: "2",
                fill: "none",
              }}
              viewBox="0 0 24 24"
            >
              <path d="M 20 20 L 20 12 M 20 20 L 12 20" />
            </svg>
          </>
        )}
      </div>

      {/* Subtle vignette around panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, ${rgba(palette.background, 0.4)} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
