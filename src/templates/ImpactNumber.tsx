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

export const ImpactNumber: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const number = params.number ?? "42";
  const label = params.label ?? "Impact";
  const sublabel = params.sublabel ?? undefined;
  const color = params.color ?? palette.accent;
  const entrance = params.entrance ?? "spring"; // "slam", "fade", "spring", "count"

  // Calculate entrance animations
  let numberScale = 1;
  let numberOpacity = 1;
  let numberY = 0;
  let numberBlur = 0;

  if (entrance === "slam") {
    // Starts at 2x, drops to 1x with screen shake
    const slamProgress = interpolate(frame, [0, 20], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    numberScale = 2 - slamProgress; // 2 → 1
    numberOpacity = fadeIn(frame, 0, 15);
    // Screen shake simulation with small Y offsets
    const shakeIntensity = (1 - slamProgress) * 8;
    numberY = Math.sin(frame * 0.3) * shakeIntensity;
  } else if (entrance === "fade") {
    // Smooth fade + scale from 0.5 to 1
    numberOpacity = fadeIn(frame, 0, 20);
    numberScale = scaleIn(frame, 0, 0.5, 1, 25);
    numberBlur = blurIn(frame, 0, 12, 20);
  } else if (entrance === "spring") {
    // Spring entrance with overshoot
    numberOpacity = fadeIn(frame, 0, 10);
    const springVal = springIn(frame, fps, 0, {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    });
    numberScale = 0.2 + springVal * 0.8; // 0.2 → 1
  } else if (entrance === "count") {
    // Number ticks up from 0 to final value
    const countProgress = interpolate(frame, [0, 40], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    numberOpacity = fadeIn(frame, 0, 15);
    numberScale = scaleIn(frame, 0, 0.7, 1, 30);
    const finalNum = parseInt(number) || 42;
    const currentNum = Math.round(finalNum * countProgress);
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
            radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(color, 0.12)} 0%, transparent 60%),
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

        {/* Main number display */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${numberScale}) translateY(${numberY}px)`,
            fontSize: "160px",
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            textShadow: glowShadow(color, pulseGlow(frame, 25, 0.3, 0.8), 30),
            opacity: numberOpacity,
            filter: `blur(${numberBlur}px)`,
            whiteSpace: "nowrap",
            letterSpacing: "-4px",
          }}
        >
          {currentNum}
        </div>

        {/* Shimmer gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${numberScale})`,
            fontSize: "160px",
            fontWeight: 900,
            color: "transparent",
            fontFamily: typography.heading,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            background: `linear-gradient(90deg, transparent ${shimmer(frame, 20, 0) - 10}%, ${rgba(color, 0.6)} ${shimmer(frame, 20, 0)}%, transparent ${shimmer(frame, 20, 0) + 10}%)`,
            opacity: numberOpacity * 0.5,
            letterSpacing: "-4px",
          }}
        >
          {currentNum}
        </div>

        {/* Label below */}
        <div
          style={{
            position: "absolute",
            top: "58%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${slideIn(frame, 15, "up", 30, 20).y}px)`,
            fontSize: "42px",
            fontWeight: 600,
            color: palette.text,
            fontFamily: typography.heading,
            opacity: fadeIn(frame, 15, 20),
            textAlign: "center",
          }}
        >
          {label}
        </div>

        {/* Sublabel if provided */}
        {sublabel && (
          <div
            style={{
              position: "absolute",
              top: "64%",
              left: "50%",
              transform: `translate(-50%, -50%) translateY(${slideIn(frame, 25, "up", 25, 20).y}px)`,
              fontSize: "34px",
              fontWeight: 400,
              color: rgba(palette.text, 0.65),
              fontFamily: typography.body,
              maxWidth: "85%",
              lineHeight: 1.4,
              opacity: fadeIn(frame, 25, 15),
              textAlign: "center",
            }}
          >
            {sublabel}
          </div>
        )}
      </AbsoluteFill>
    );
  }

  // For other entrance types (slam, fade, spring)
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
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(color, 0.12)} 0%, transparent 60%),
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

      {/* Main number display */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${numberScale}) translateY(${numberY}px)`,
          fontSize: "160px",
          fontWeight: 900,
          color: color,
          fontFamily: typography.heading,
          textShadow: glowShadow(color, pulseGlow(frame, 25, 0.3, 0.8), 30),
          opacity: numberOpacity,
          filter: `blur(${numberBlur}px)`,
          whiteSpace: "nowrap",
          letterSpacing: "-4px",
        }}
      >
        {number}
      </div>

      {/* Shimmer gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${numberScale})`,
          fontSize: "160px",
          fontWeight: 900,
          color: "transparent",
          fontFamily: typography.heading,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          background: `linear-gradient(90deg, transparent ${shimmer(frame, 20, 0) - 10}%, ${rgba(color, 0.6)} ${shimmer(frame, 20, 0)}%, transparent ${shimmer(frame, 20, 0) + 10}%)`,
          opacity: numberOpacity * 0.5,
          letterSpacing: "-4px",
        }}
      >
        {number}
      </div>

      {/* Post-entrance breathing animation */}
      {frame > 40 && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${breathe(frame - 40, 40, 0.03)})`,
            fontSize: "160px",
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            textShadow: glowShadow(color, pulseGlow(frame, 25, 0.3, 0.8), 30),
            opacity: numberOpacity,
            whiteSpace: "nowrap",
            letterSpacing: "-4px",
            pointerEvents: "none",
          }}
        >
          {number}
        </div>
      )}

      {/* Label below */}
      <div
        style={{
          position: "absolute",
          top: "58%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${slideIn(frame, 15, "up", 30, 20).y}px)`,
          fontSize: "42px",
          fontWeight: 600,
          color: palette.text,
          fontFamily: typography.heading,
          opacity: fadeIn(frame, 15, 20),
          textAlign: "center",
        }}
      >
        {label}
      </div>

      {/* Sublabel if provided */}
      {sublabel && (
        <div
          style={{
            position: "absolute",
            top: "64%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${slideIn(frame, 25, "up", 25, 20).y}px)`,
            fontSize: "26px",
            fontWeight: 400,
            color: rgba(palette.text, 0.6),
            fontFamily: typography.body,
            opacity: fadeIn(frame, 25, 15),
            textAlign: "center",
          }}
        >
          {sublabel}
        </div>
      )}
    </AbsoluteFill>
  );
};
