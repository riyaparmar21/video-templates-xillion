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

export const Atmosphere: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const style = params.style ?? "gradient"; // "grid", "particles", "gradient", "waves", "bokeh"
  const intensity = params.intensity ?? "medium"; // "subtle", "medium", "strong"
  const primaryColor = params.primaryColor ?? palette.primary;
  const secondaryColor = params.secondaryColor ?? palette.secondary;
  const speed = params.speed ?? "medium"; // "slow", "medium", "fast"

  // Speed multipliers
  const speedMult =
    speed === "slow" ? 0.5 : speed === "fast" ? 2 : 1;

  // Intensity values
  const opacityBase =
    intensity === "subtle" ? 0.15 : intensity === "strong" ? 0.5 : 0.3;
  const elementCount =
    intensity === "subtle" ? 30 : intensity === "strong" ? 100 : 60;

  const renderAtmosphere = () => {
    if (style === "grid") {
      // Animated scrolling grid with intersection dots
      const scrollOffset = interpolate(
        frame,
        [0, sceneDurationFrames],
        [0, 200 * speedMult],
        { extrapolateLeft: "extend", extrapolateRight: "extend" }
      );

      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `
              repeating-linear-gradient(
                0deg,
                ${rgba(primaryColor, opacityBase * 0.5)} 0px,
                ${rgba(primaryColor, opacityBase * 0.5)} 1px,
                transparent 1px,
                transparent 80px
              ),
              repeating-linear-gradient(
                90deg,
                ${rgba(primaryColor, opacityBase * 0.5)} 0px,
                ${rgba(primaryColor, opacityBase * 0.5)} 1px,
                transparent 1px,
                transparent 80px
              )
            `,
            transform: `translateY(${scrollOffset}px)`,
          }}
        >
          {/* Intersection dots */}
          {Array.from({ length: elementCount }).map((_, i) => {
            const row = Math.floor(i / 12);
            const col = i % 12;
            const x = (col * 90 + scrollOffset * 0.3) % 1080;
            const y = (row * 80 + scrollOffset) % 1920;
            const glow = pulseGlow(frame + i * 5, 30, 0.3, 1);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(col * 90) % 1080}px`,
                  top: `${(row * 80 + (scrollOffset % 1600)) % 1920}px`,
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: primaryColor,
                  opacity: opacityBase * glow,
                  boxShadow: `0 0 8px ${rgba(primaryColor, glow * 0.6)}`,
                }}
              />
            );
          })}
        </div>
      );
    } else if (style === "particles") {
      // Floating particles drifting upward
      return (
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
          {Array.from({ length: elementCount }).map((_, i) => {
            const seed = `particle-${i}`;
            const startX = random(seed) * 1080;
            const startY = 1920 + random(seed + "-y") * 200;
            const driftX = (random(seed + "-drift") - 0.5) * 100;
            const duration = 200 + random(seed + "-dur") * 100;
            const size = 2 + random(seed + "-size") * 6;

            const y = interpolate(
              frame % duration,
              [0, duration],
              [startY, -100],
              { extrapolateLeft: "extend", extrapolateRight: "extend" }
            );

            const x = startX + driftX * ((frame % duration) / duration);
            const particleOpacity = interpolate(
              frame % duration,
              [0, duration * 0.1, duration * 0.9, duration],
              [0, opacityBase, opacityBase, 0]
            );

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: "50%",
                  background: random(seed + "-color") > 0.5 ? primaryColor : secondaryColor,
                  opacity: particleOpacity,
                  filter: "blur(0.5px)",
                }}
              />
            );
          })}
        </div>
      );
    } else if (style === "gradient") {
      // Slowly shifting color gradient (aurora effect)
      const hueShift = rotate(frame, 20 * speedMult, fps, 0) % 360;
      const gradientOffset = shimmer(frame, 100 / speedMult, 0);

      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `
              linear-gradient(
                ${hueShift}deg,
                ${rgba(primaryColor, opacityBase)} 0%,
                ${rgba(secondaryColor, opacityBase * 0.6)} 50%,
                ${rgba(palette.accent, opacityBase * 0.4)} 100%
              )
            `,
            opacity: breathe(frame, 80 / speedMult, 0.1),
          }}
        />
      );
    } else if (style === "waves") {
      // Sine wave lines flowing across screen
      return (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          viewBox="0 0 1080 1920"
          preserveAspectRatio="none"
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const yBase = (i / 12) * 1920;
            const amplitude = 30 * (intensity === "strong" ? 1.5 : 1);
            const frequency = 0.01;
            const phase = (frame * 0.05 * speedMult + i * 10) % (Math.PI * 2);

            let pathData = "";
            for (let x = 0; x <= 1080; x += 20) {
              const y =
                yBase +
                Math.sin(x * frequency + phase) * amplitude;
              pathData += `${x === 0 ? "M" : "L"} ${x} ${y}`;
            }

            return (
              <path
                key={i}
                d={pathData}
                stroke={i % 2 === 0 ? primaryColor : secondaryColor}
                strokeWidth="1"
                fill="none"
                opacity={opacityBase}
              />
            );
          })}
        </svg>
      );
    } else if (style === "bokeh") {
      // Large blurred circles (bokeh lights) drifting
      return (
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
          {Array.from({ length: elementCount }).map((_, i) => {
            const seed = `bokeh-${i}`;
            const startX = random(seed) * 1080;
            const startY = random(seed + "-y") * 1920;
            const driftX = (random(seed + "-drift-x") - 0.5) * 200 * speedMult;
            const driftY = (random(seed + "-drift-y") - 0.5) * 200 * speedMult;
            const size = 80 + random(seed + "-size") * 160;
            const duration = 300 + random(seed + "-dur") * 200;

            const x = startX + (driftX * frame) / duration;
            const y = startY + (driftY * frame) / duration;
            const bokehOpacity =
              opacityBase *
              0.6 *
              pulseGlow(frame + i * 10, 50 / speedMult, 0.3, 1);

            const color =
              random(seed + "-color") > 0.5 ? primaryColor : secondaryColor;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x % 1080}px`,
                  top: `${y % 1920}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: "50%",
                  background: color,
                  opacity: bokehOpacity,
                  filter: `blur(${size * 0.3}px)`,
                }}
              />
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
      }}
    >
      {/* Base decorative atmosphere layer */}
      {renderAtmosphere()}

      {/* Subtle vignette edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(
              ellipse at center,
              transparent 40%,
              ${rgba(palette.background, 0.3)} 100%
            )
          `,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
