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

export const TransitionWipe: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const style = params.style ?? "horizontal"; // "radial", "diagonal", "horizontal", "vertical", "zoom"
  const color = params.color ?? palette.primary;
  const text = params.text ?? undefined;
  const duration = params.duration ?? sceneDurationFrames;

  // Calculate wipe progress (0 → 1)
  const wipeProgress = interpolate(frame, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Text entrance (if provided)
  const textOpacity = fadeIn(frame, duration * 0.3, duration * 0.4);
  const textScale = scaleIn(frame, duration * 0.3, 0.8, 1, duration * 0.3);

  const renderWipe = () => {
    if (style === "radial") {
      // Circle expands from center
      const radius = interpolate(wipeProgress, [0, 1], [0, 1200], {
        easing: Easing.out(Easing.cubic),
      });
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            borderRadius: "50%",
            background: color,
            transform: "translate(-50%, -50%)",
            opacity: 1,
          }}
        />
      );
    } else if (style === "diagonal") {
      // Diagonal wipe from top-left to bottom-right
      const offset = interpolate(wipeProgress, [0, 1], [-1500, 1500], {
        easing: Easing.inOut(Easing.cubic),
      });
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: color,
            clipPath: `polygon(
              ${offset}px 0,
              100% ${offset}px,
              100% 100%,
              0 100%
            )`,
          }}
        />
      );
    } else if (style === "horizontal") {
      // Left to right sweep
      const xPos = interpolate(wipeProgress, [0, 1], [-1080, 1080], {
        easing: Easing.inOut(Easing.cubic),
      });
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)`,
            transform: `translateX(${xPos}px)`,
          }}
        />
      );
    } else if (style === "vertical") {
      // Top to bottom sweep
      const yPos = interpolate(wipeProgress, [0, 1], [-1920, 1920], {
        easing: Easing.inOut(Easing.cubic),
      });
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(180deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)`,
            transform: `translateY(${yPos}px)`,
          }}
        />
      );
    } else if (style === "zoom") {
      // Zoom in then back out with color shift
      const scale = interpolate(wipeProgress, [0, 0.5, 1], [0.2, 1.2, 0.8], {
        easing: Easing.inOut(Easing.cubic),
      });
      const opacity = interpolate(wipeProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.5]);
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "150%",
            height: "150%",
            background: color,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: opacity,
          }}
        />
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

      {/* Starting background glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(palette.secondary, 0.2)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
          opacity: 1 - wipeProgress * 0.7,
        }}
      />

      {/* Main wipe effect */}
      {renderWipe()}

      {/* Ending glow in wipe color */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(color, 0.25)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
          opacity: wipeProgress * 0.5,
        }}
      />

      {/* Text overlay during transition */}
      {text && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${textScale})`,
            fontSize: "52px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            textAlign: "center",
            opacity: textOpacity,
            textShadow: glowShadow(color, 0.6, 15),
            maxWidth: "80%",
            zIndex: 10,
          }}
        >
          {text}
        </div>
      )}

      {/* Accent line animation (for visual interest) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${wipeProgress * 100}%`,
          width: "3px",
          height: "400px",
          background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: "translate(-50%, -50%)",
          opacity: Math.sin(wipeProgress * Math.PI) * 0.8,
        }}
      />
    </AbsoluteFill>
  );
};
