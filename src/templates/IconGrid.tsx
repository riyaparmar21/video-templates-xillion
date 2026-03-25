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

export const IconGrid: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Params with defaults
  const items = params.items ?? [
    { icon: "🎯", label: "Focus" },
    { icon: "⚡", label: "Energy" },
    { icon: "✨", label: "Shine" },
    { icon: "🚀", label: "Launch" },
    { icon: "💎", label: "Quality" },
    { icon: "🔥", label: "Passion" },
  ];
  const columns = Math.max(2, Math.min(4, params.columns ?? 3));
  const title = params.title ?? undefined;
  const style = params.style ?? "cards";

  // Layout calculation (responsive to actual canvas dimensions)
  const rows = Math.ceil(items.length / columns);
  const itemWidth = width / columns;
  const itemHeight = 280;
  const gridHeight = rows * itemHeight;
  const gridTop = (height - gridHeight) / 2 - (title ? 80 : 0);

  // Title animation
  const titleSlide = slideIn(frame, 0, "up", 50, 25);
  const titleOpacity = fadeIn(frame, 0, 20);

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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

      {/* Background glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "-10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(palette.primary, 0.08)}, transparent)`,
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "-10%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(palette.secondary, 0.08)}, transparent)`,
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />

      {/* Title if provided */}
      {title && (
        <h1
          style={{
            marginTop: "60px",
            marginBottom: "40px",
            fontSize: "64px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: titleOpacity,
            transform: `translateY(${titleSlide.y}px)`,
            textAlign: "center",
            padding: "0 40px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
      )}

      {/* Grid container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "24px",
          padding: "20px 40px",
          maxWidth: `${width}px`,
          flex: 1,
          alignContent: "center",
        }}
      >
        {items.map((item: any, idx: number) => {
          const row = Math.floor(idx / columns);
          const col = idx % columns;

          // Stagger based on grid position (top-left to bottom-right)
          const staggerIndex = row * columns + col;
          const delay = staggerDelay(staggerIndex, items.length, 40);

          // Entrance animations
          const itemProgress = staggerProgress(frame, staggerIndex, items.length, 40, 25);
          const itemOpacity = fadeIn(frame, delay, 20);
          const itemScale = scaleIn(frame, delay, 0.7, 1, 25);
          const itemSlide = slideIn(frame, delay, "up", 40, 25);

          // Post-entrance breathing
          const breatheScale = breathe(frame - delay, 50, 0.04);
          const glowIntensity = pulseGlow(frame - delay, 35, 0.2, 0.8);

          // Render card or minimal item
          const cardContent = (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                width: "100%",
                height: "100%",
                padding: "24px",
                fontFamily: typography.heading,
              }}
            >
              <div style={{ fontSize: "72px" }}>{item.icon}</div>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: palette.text,
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {item.label}
              </div>
            </div>
          );

          return (
            <div
              key={idx}
              style={{
                position: "relative",
                opacity: itemOpacity,
                transform: `scale(${itemScale * breatheScale}) translateY(${itemSlide.y}px)`,
                transformOrigin: "center",
              }}
            >
              {style === "cards" && (
                <div
                  style={{
                    ...glassStyle(0.12, 20, 0.2),
                    height: "220px",
                    boxShadow: `0 0 30px ${rgba(palette.accent, glowIntensity * 0.3)}, inset 0 0 20px ${rgba(palette.text, 0.08)}`,
                  }}
                >
                  {cardContent}
                </div>
              )}

              {style === "minimal" && (
                <div
                  style={{
                    height: "220px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  {cardContent}
                </div>
              )}

              {style === "bordered" && (
                <div
                  style={{
                    height: "220px",
                    border: `2px solid ${rgba(palette.accent, glowIntensity * 0.6)}`,
                    borderRadius: "12px",
                    boxShadow: `0 0 20px ${rgba(palette.accent, glowIntensity * 0.2)}`,
                  }}
                >
                  {cardContent}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle shimmer overlay for cards */}
      {style === "cards" &&
        items.map((_: any, idx: number) => {
          const row = Math.floor(idx / columns);
          const col = idx % columns;
          const staggerIndex = row * columns + col;
          const delay = staggerDelay(staggerIndex, items.length, 40);
          const shimmerPos = shimmer(frame - delay, 20, 0);

          return (
            <div
              key={`shimmer-${idx}`}
              style={{
                position: "absolute",
                top: gridTop + (row * itemHeight + 20),
                left: col * itemWidth + 30,
                width: itemWidth - 60,
                height: "120px",
                background: `linear-gradient(90deg, transparent ${shimmerPos - 20}%, ${rgba(palette.text, 0.1)} ${shimmerPos}%, transparent ${shimmerPos + 20}%)`,
                pointerEvents: "none",
                borderRadius: "12px",
                opacity: fadeIn(frame, delay + 20, 15) * 0.3,
              }}
            />
          );
        })}
    </AbsoluteFill>
  );
};
