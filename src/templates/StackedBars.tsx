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

export const StackedBars: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const items = params.items ?? [
    { value: 85, label: "Quality", color: palette.primary },
    { value: 72, label: "Performance", color: palette.secondary },
    { value: 91, label: "Reliability", color: palette.accent },
  ];
  const orientation = params.orientation ?? "horizontal";
  const barStyle = params.style ?? params.animationStyle ?? "gradient";
  const title = params.title ?? undefined;
  const showValues = params.showValues ?? params.showPercentage ?? true;

  // Layout dimensions
  const chartWidth = orientation === "horizontal" ? 700 : 150;
  const chartHeight = orientation === "horizontal" ? 120 : 400;
  const barSpacing = orientation === "horizontal" ? 40 : 50;
  const maxValue = Math.max(...items.map((i: any) => i.value), 100);

  // Title animation
  const titleSlide = slideIn(frame, 0, "up", 40, 25);
  const titleOpacity = fadeIn(frame, 0, 20);

  // Background grid lines
  const gridLines = 5;
  const gridSpacing = (orientation === "horizontal" ? chartWidth : chartHeight) / gridLines;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        flexDirection: "column",
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

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "500px",
          height: "500px",
          background: `radial-gradient(circle, ${rgba(palette.primary, 0.08)}, transparent)`,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "40px",
          zIndex: 10,
        }}
      >
        {/* Title if provided */}
        {title && (
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: palette.text,
              fontFamily: typography.heading,
              opacity: titleOpacity,
              transform: `translateY(${titleSlide.y}px)`,
              margin: 0,
              textAlign: "center",
            }}
          >
            {title}
          </h1>
        )}

        {/* Chart container */}
        <div
          style={{
            position: "relative",
            width: chartWidth,
            height: chartHeight,
            display: "flex",
            flexDirection: orientation === "horizontal" ? "column" : "row",
            gap: barSpacing,
            alignItems: orientation === "horizontal" ? "flex-start" : "flex-end",
            justifyContent: "center",
          }}
        >
          {/* Grid lines background */}
          {orientation === "horizontal" ? (
            <>
              {Array.from({ length: gridLines }).map((_: any, i: number) => (
                <div
                  key={`grid-h-${i}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: (i / (gridLines - 1)) * chartHeight,
                    width: chartWidth,
                    height: "1px",
                    background: rgba(palette.text, 0.08),
                  }}
                />
              ))}
            </>
          ) : (
            <>
              {Array.from({ length: gridLines }).map((_: any, i: number) => (
                <div
                  key={`grid-v-${i}`}
                  style={{
                    position: "absolute",
                    left: (i / (gridLines - 1)) * chartWidth,
                    top: 0,
                    width: "1px",
                    height: chartHeight,
                    background: rgba(palette.text, 0.08),
                  }}
                />
              ))}
            </>
          )}

          {/* Render bars */}
          {items.map((item: any, idx: number) => {
            const delay = staggerDelay(idx, items.length, 30);
            const progress = staggerProgress(frame, idx, items.length, 30, 35);
            const barOpacity = fadeIn(frame, delay, 15);

            // Bar growth animation with spring
            const growthProgress = Math.min(
              1,
              Math.max(0, (frame - delay) / 35)
            );
            const barValue = item.value * growthProgress;

            // Breathing after full growth
            const breatheAmount = breathe(frame - delay - 35, 45, 0.04);

            // Bar dimensions
            const barLength =
              orientation === "horizontal"
                ? (barValue / maxValue) * chartWidth
                : (barValue / maxValue) * chartHeight;

            // Colors and styles
            let barColor = item.color;
            let barGradient = `linear-gradient(${orientation === "horizontal" ? "90deg" : "180deg"}, ${rgba(item.color, 0.8)}, ${item.color})`;

            if (barStyle === "metallic") {
              barGradient = metallicGradient(item.color, orientation === "horizontal" ? 0 : 90);
            } else if (barStyle === "flat") {
              barGradient = item.color;
            }

            // Shimmer effect for metallic bars
            const shimmerPos = shimmer(frame - delay, 20, 0);

            return (
              <div key={idx} style={{ position: "relative", zIndex: 5 }}>
                {/* Bar */}
                <div
                  style={{
                    width: orientation === "horizontal" ? barLength : "40px",
                    height: orientation === "horizontal" ? "30px" : barLength,
                    background: barGradient,
                    borderRadius: "6px",
                    opacity: barOpacity,
                    boxShadow: glowShadow(item.color, pulseGlow(frame, 30, 0.2, 0.6), 15),
                    transform: `scale(${breatheAmount})`,
                    transformOrigin: orientation === "horizontal" ? "left" : "bottom",
                    transition: barStyle === "metallic" ? undefined : "all 0.1s ease-out",
                  }}
                >
                  {/* Shimmer overlay for metallic */}
                  {barStyle === "metallic" && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                          orientation === "horizontal"
                            ? `linear-gradient(90deg, transparent ${shimmerPos - 15}%, ${rgba(palette.text, 0.3)} ${shimmerPos}%, transparent ${shimmerPos + 15}%)`
                            : `linear-gradient(180deg, transparent ${shimmerPos - 15}%, ${rgba(palette.text, 0.3)} ${shimmerPos}%, transparent ${shimmerPos + 15}%)`,
                        borderRadius: "6px",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>

                {/* Label */}
                {item.label && (
                  <div
                    style={{
                      position: "absolute",
                      [orientation === "horizontal" ? "top" : "left"]: "-25px",
                      [orientation === "horizontal" ? "left" : "bottom"]: 0,
                      fontSize: "13px",
                      fontWeight: 500,
                      color: palette.text,
                      fontFamily: typography.body,
                      opacity: fadeIn(frame, delay + 10, 15),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </div>
                )}

                {/* Value label if showValues */}
                {showValues && (
                  <div
                    style={{
                      position: "absolute",
                      [orientation === "horizontal" ? "left" : "bottom"]:
                        orientation === "horizontal" ? barLength / 2 : barLength / 2,
                      [orientation === "horizontal" ? "top" : "left"]: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: palette.background,
                      fontFamily: typography.mono,
                      opacity: fadeIn(frame, delay + 20, 15),
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {Math.round(barValue)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chart axis labels if horizontal */}
        {orientation === "horizontal" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: chartWidth,
              marginTop: "30px",
              fontSize: "11px",
              fontWeight: 400,
              color: rgba(palette.text, 0.6),
              fontFamily: typography.mono,
            }}
          >
            {Array.from({ length: gridLines }).map((_, i) => (
              <span key={`label-${i}`}>
                {Math.round((i / (gridLines - 1)) * maxValue)}%
              </span>
            ))}
          </div>
        )}

        {/* Chart axis labels if vertical */}
        {orientation === "vertical" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column-reverse",
              justifyContent: "space-between",
              height: chartHeight,
              marginRight: "30px",
              fontSize: "10px",
              fontWeight: 400,
              color: rgba(palette.text, 0.6),
              fontFamily: typography.mono,
              position: "absolute",
              right: "-50px",
            }}
          >
            {Array.from({ length: gridLines }).map((_, i) => (
              <span key={`label-v-${i}`}>
                {Math.round((i / (gridLines - 1)) * maxValue)}%
              </span>
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
