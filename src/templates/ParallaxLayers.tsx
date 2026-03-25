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

export const ParallaxLayers: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const layerCount = Math.max(2, Math.min(5, params.layers ?? 3));
  const direction = params.direction ?? "up";
  const speed = params.speed ?? "medium";
  const content = params.content ?? "Parallax Depth";
  const layerStyle = params.style ?? "geometric";
  const accentColor = params.accentColor ?? palette.accent;

  // Speed multipliers
  const speedMultiplier = speed === "slow" ? 0.3 : speed === "fast" ? 1.5 : 0.8;

  // Direction vector
  const directionVec = {
    up: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    diagonal: { x: -0.7, y: -0.7 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
  };
  const dir = directionVec[direction as keyof typeof directionVec] || directionVec.up;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Render layers from back to front */}
      {Array.from({ length: layerCount }).map((_, layerIdx) => {
        // Layer depth: 0 = back, layerCount-1 = front
        const depthRatio = layerIdx / Math.max(1, layerCount - 1);
        const layerOpacity = 0.3 + depthRatio * 0.7;
        const layerBlur = (1 - depthRatio) * 15;
        const layerScale = 0.9 + depthRatio * 0.1;

        // Parallax motion: each layer moves at different speed
        const parallaxMultiplier = 0.3 + depthRatio * 0.7;
        const parallaxX = (frame * speedMultiplier * parallaxMultiplier * dir.x) % 1920;
        const parallaxY = (frame * speedMultiplier * parallaxMultiplier * dir.y) % 1920;

        // Entrance animation
        const layerEntranceDelay = staggerDelay(layerIdx, layerCount, 15);
        const layerEntranceOpacity = fadeIn(frame, layerEntranceDelay, 20);

        if (layerStyle === "geometric") {
          // Geometric style: grids, rectangles, circles
          const elementCount = Math.floor(4 + depthRatio * 6);
          return (
            <div
              key={`geometric-${layerIdx}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1080px",
                height: "1920px",
                opacity: layerEntranceOpacity * layerOpacity,
                filter: `blur(${layerBlur}px)`,
                transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${layerScale})`,
                overflow: "hidden",
              }}
            >
              {/* Grid lines */}
              <svg
                width="1080"
                height="1920"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  opacity: 0.15 - depthRatio * 0.1,
                }}
              >
                {/* Vertical lines */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 90}
                    y1="0"
                    x2={i * 90}
                    y2="1920"
                    stroke={accentColor}
                    strokeWidth="1"
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: 22 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 90}
                    x2="1080"
                    y2={i * 90}
                    stroke={accentColor}
                    strokeWidth="1"
                  />
                ))}
              </svg>

              {/* Geometric shapes scattered */}
              {Array.from({ length: elementCount }).map((_, elemIdx) => {
                const seed = `geo-${layerIdx}-${elemIdx}`;
                const shapeX = random(seed + "-x") * 1080;
                const shapeY = random(seed + "-y") * 1920;
                const shapeType = Math.floor(random(seed + "-type") * 3);
                const shapeSize = 20 + random(seed + "-size") * 80;
                const shapeRotation = random(seed + "-rot") * 360;
                const colorIdx = Math.floor(random(seed + "-color") * 3);
                const colors = [palette.primary, palette.secondary, palette.accent];

                return (
                  <div
                    key={`shape-${elemIdx}`}
                    style={{
                      position: "absolute",
                      left: shapeX,
                      top: shapeY,
                      width: shapeSize,
                      height: shapeSize,
                      borderRadius: shapeType === 0 ? "50%" : shapeType === 1 ? "0%" : "8px",
                      background: rgba(colors[colorIdx], 0.3 + depthRatio * 0.3),
                      transform: `rotate(${shapeRotation}deg)`,
                      border: `1px solid ${rgba(colors[colorIdx], 0.5)}`,
                    }}
                  />
                );
              })}
            </div>
          );
        } else if (layerStyle === "organic") {
          // Organic style: blurred blobs and gradients
          const blobCount = 2 + Math.floor(depthRatio * 4);
          return (
            <div
              key={`organic-${layerIdx}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1080px",
                height: "1920px",
                opacity: layerEntranceOpacity * layerOpacity,
                filter: `blur(${layerBlur}px)`,
                transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${layerScale})`,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: blobCount }).map((_, blobIdx) => {
                const seed = `blob-${layerIdx}-${blobIdx}`;
                const blobX = random(seed + "-x") * 1080;
                const blobY = random(seed + "-y") * 1920;
                const blobSize = 150 + random(seed + "-size") * 250;
                const colorIdx = Math.floor(random(seed + "-color") * 3);
                const colors = [palette.primary, palette.secondary, palette.accent];
                const driftX = float(frame, 60 + blobIdx * 20, 30, random(seed + "-drift-x"));
                const driftY = float(
                  frame,
                  70 + blobIdx * 25,
                  30,
                  random(seed + "-drift-y")
                );

                return (
                  <div
                    key={`blob-${blobIdx}`}
                    style={{
                      position: "absolute",
                      left: blobX + driftX,
                      top: blobY + driftY,
                      width: blobSize,
                      height: blobSize,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${rgba(colors[colorIdx], 0.6)}, ${rgba(colors[colorIdx], 0.1)})`,
                      filter: "blur(40px)",
                    }}
                  />
                );
              })}
            </div>
          );
        } else {
          // Grid/technical style
          return (
            <div
              key={`grid-${layerIdx}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1080px",
                height: "1920px",
                opacity: layerEntranceOpacity * layerOpacity,
                filter: `blur(${layerBlur}px)`,
                transform: `translate(${parallaxX}px, ${parallaxY}px) scale(${layerScale})`,
                overflow: "hidden",
              }}
            >
              {/* Technical grid with data points */}
              <svg width="1080" height="1920">
                {/* Grid lines */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <line
                    key={`vline-${i}`}
                    x1={i * 72}
                    y1="0"
                    x2={i * 72}
                    y2="1920"
                    stroke={rgba(accentColor, 0.2 - depthRatio * 0.1)}
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 27 }).map((_, i) => (
                  <line
                    key={`hline-${i}`}
                    x1="0"
                    y1={i * 71.1}
                    x2="1080"
                    y2={i * 71.1}
                    stroke={rgba(accentColor, 0.2 - depthRatio * 0.1)}
                    strokeWidth="0.5"
                  />
                ))}

                {/* Data points */}
                {Array.from({ length: 20 }).map((_, pointIdx) => {
                  const seed = `point-${layerIdx}-${pointIdx}`;
                  const pointX = random(seed + "-x") * 1080;
                  const pointY = random(seed + "-y") * 1920;
                  const pointSize = 3 + random(seed + "-size") * 4;
                  const pulse = pulseGlow(frame, 25 + pointIdx * 2, 0.3, 1);

                  return (
                    <circle
                      key={`point-${pointIdx}`}
                      cx={pointX}
                      cy={pointY}
                      r={pointSize}
                      fill={accentColor}
                      opacity={pulse * (0.3 + depthRatio * 0.4)}
                    />
                  );
                })}
              </svg>
            </div>
          );
        }
      })}

      {/* Center content text */}
      <div
        style={{
          position: "relative",
          zIndex: layerCount,
          fontSize: "48px",
          fontWeight: 700,
          color: palette.text,
          fontFamily: typography.heading,
          textAlign: "center",
          opacity: fadeIn(frame, 20, 25),
          textShadow: glowShadow(accentColor, pulseGlow(frame, 30, 0.3, 0.8), 25),
          transform: `translateY(${float(frame, 50, 8)})`,
        }}
      >
        {content}
      </div>

      {/* Subtle vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 30%, ${rgba(palette.background, 0.5)} 100%)`,
          pointerEvents: "none",
          zIndex: layerCount + 1,
        }}
      />
    </AbsoluteFill>
  );
};
