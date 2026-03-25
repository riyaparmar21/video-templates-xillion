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

export const CountUp: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const target = params.target ?? params.number ?? 100;
  const prefix = params.prefix ?? "";
  const suffix = params.suffix ?? "";
  const duration = params.duration ?? Math.min(sceneDurationFrames - 40, 60);
  const label = params.label ?? params.sublabel ?? undefined;
  const decimals = params.decimals ?? 0;
  const color = params.color ?? palette.accent;
  const fontSize = params.fontSize ?? 140;

  // Counting progress (0 → 1)
  const countProgress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Calculate current number
  const currentNumber = countProgress * target;
  const displayNumber =
    decimals > 0
      ? currentNumber.toFixed(decimals)
      : Math.round(currentNumber).toString();

  // Color transition as number grows
  const colorTransition = interpolate(countProgress, [0, 1], [0, 1]);
  const transitionColor = rgba(color, 0.5 + colorTransition * 0.5);

  // Entrance animations
  const numberOpacity = fadeIn(frame, 0, 20);
  const numberScale = scaleIn(frame, 0, 0.5, 1, 30);
  const numberBlur = blurIn(frame, 0, 12, 20);

  // Post-count animations (after counting finishes)
  const postCountFrame = frame - duration;
  const springOvershotY =
    postCountFrame > 0
      ? spring({
          frame: postCountFrame,
          fps,
          config: { damping: 10, stiffness: 150, mass: 0.8 },
        })
      : 0;

  // Label animation (appears after count)
  const labelDelay = duration + 10;
  const labelOpacity = fadeIn(frame, labelDelay, 20);
  const labelSlide = slideIn(frame, labelDelay, "up", 30, 25);

  // Background glow intensity
  const glowIntensity = interpolate(
    countProgress,
    [0, 0.5, 1],
    [0.2, 0.6, 0.8]
  );

  // Particle burst when reaching target
  const isBurstFrame = frame === Math.floor(duration);
  const burstIntensity = isBurstFrame ? 1 : Math.max(0, 1 - (postCountFrame / 20));

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

      {/* Background glow that intensifies */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(color, glowIntensity)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
          opacity: numberOpacity,
        }}
      />

      {/* Animated accent ring */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: `${300 + countProgress * 100}px`,
          height: `${300 + countProgress * 100}px`,
          borderRadius: "50%",
          border: `3px solid ${rgba(color, glowIntensity * 0.4)}`,
          transform: "translate(-50%, -50%)",
          opacity: numberOpacity * (1 - countProgress * 0.3),
        }}
      />

      {/* Main counter number */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${numberScale}) translateY(${-springOvershotY * 20}px)`,
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          color: color,
          fontFamily: typography.heading,
          opacity: numberOpacity,
          filter: `blur(${numberBlur}px)`,
          whiteSpace: "nowrap",
          textShadow: glowShadow(color, glowIntensity, 35),
          letterSpacing: "-2px",
        }}
      >
        {prefix}
        {displayNumber}
        {suffix}
      </div>

      {/* Shimmer effect overlay */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${numberScale})`,
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          color: "transparent",
          fontFamily: typography.heading,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          background: `linear-gradient(90deg, transparent ${shimmer(frame, 25, 0) - 15}%, ${rgba(color, 0.5)} ${shimmer(frame, 25, 0)}%, transparent ${shimmer(frame, 25, 0) + 15}%)`,
          opacity: numberOpacity * countProgress * 0.6,
          letterSpacing: "-2px",
        }}
      >
        {prefix}
        {displayNumber}
        {suffix}
      </div>

      {/* Particle burst when target reached */}
      {burstIntensity > 0 &&
        Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const distance = burstIntensity * 100;
          const burstX = Math.cos(angle) * distance;
          const burstY = Math.sin(angle) * distance;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "40%",
                left: "50%",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: color,
                transform: `translate(${burstX}px, ${burstY + -springOvershotY * 10}px)`,
                opacity: burstIntensity * (1 - postCountFrame / 30),
              }}
            />
          );
        })}

      {/* Breathing pulse on number after count */}
      {postCountFrame > 0 && postCountFrame < 50 && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${breathe(postCountFrame, 25, 0.05)})`,
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            textShadow: glowShadow(color, glowIntensity * 0.7, 35),
            opacity: numberOpacity * Math.max(0, 1 - postCountFrame / 50),
            letterSpacing: "-2px",
            pointerEvents: "none",
          }}
        >
          {prefix}
          {displayNumber}
          {suffix}
        </div>
      )}

      {/* Label appears after counting */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${labelSlide.y}px)`,
            fontSize: "32px",
            fontWeight: 600,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: labelOpacity,
            textAlign: "center",
            letterSpacing: "1px",
          }}
        >
          {label}
        </div>
      )}

      {/* Subtle secondary glow pulse */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(palette.secondary, glowIntensity * 0.3)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
          opacity: pulseGlow(frame, 40, 0.1, 0.3),
        }}
      />
    </AbsoluteFill>
  );
};
