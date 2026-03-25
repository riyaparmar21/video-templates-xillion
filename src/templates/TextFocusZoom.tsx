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

export const TextFocusZoom: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Params with defaults
  const text = params.text ?? "Focus Zoom";
  const color = params.color ?? params.accentColor ?? palette.accent;
  const blurBackground = params.blurBackground !== false;
  const fontWeight = params.fontWeight ?? 900;
  const zoomScale = params.zoomScale ?? 3.5;
  const fontSizeOverride = params.fontSize ?? undefined;

  // Main zoom animation: starts small (0.3), zooms to fill viewport
  const zoomProgress = interpolate(frame, [0, 50], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  const currentScale = 0.3 + zoomProgress * (zoomScale - 0.3);

  // Spring-based zoom for organic feel (override linear zoom)
  const springZoom = springIn(frame, fps, 0, {
    damping: 18,
    stiffness: 80,
    mass: 1,
  });
  const organicScale = 0.3 + springZoom * (zoomScale - 0.3);

  // Glow intensity increases with zoom
  const glowIntensity = interpolate(zoomProgress, [0, 1], [0.2, 0.8], {
    extrapolateRight: "clamp",
  });

  // Background blur increases as text approaches
  const backgroundBlur = blurBackground
    ? interpolate(zoomProgress, [0, 1], [0, 20], {
        extrapolateRight: "clamp",
      })
    : 0;

  // Text blur starts sharp and gets blur on entry
  const textBlur = interpolate(frame, [0, 25], [12, 0], {
    extrapolateRight: "clamp",
  });

  // Opacity fade in
  const textOpacity = fadeIn(frame, 0, 20);

  // Post-zoom breathing
  const breatheScale = frame > 55 ? breathe(frame - 55, 45, 0.04) : 1;

  // Particle/dust effect positioning
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const seed = `particle-${i}`;
    const randomX = random(seed) * 200 - 100;
    const randomY = random(seed + "-y") * 200 - 100;
    const randomDelay = random(seed + "-delay") * 15;
    const particleFrame = Math.max(0, frame - randomDelay);

    const particleOpacity = interpolate(particleFrame, [0, 20], [0, 1], {
      extrapolateRight: "clamp",
    });
    const particleFade = interpolate(particleFrame, [20, 60], [1, 0], {
      extrapolateRight: "clamp",
    });

    const pX = (randomX * particleFrame) / 30;
    const pY = (randomY * particleFrame) / 30;

    return {
      id: i,
      opacity: particleOpacity * particleFade,
      x: pX,
      y: pY,
      scale: random(seed + "-scale") * 0.5 + 0.5,
    };
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        overflow: "hidden",
      }}
    >
      {/* Background with optional blur */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: palette.background,
          filter: `blur(${backgroundBlur}px)`,
          transition: "filter 0.05s linear",
        }}
      />

      {/* Particle/dust effect */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: color,
            transform: `translate(${particle.x}px, ${particle.y}px) scale(${particle.scale})`,
            opacity: particle.opacity,
            filter: `blur(1px) drop-shadow(0 0 4px ${rgba(color, particle.opacity)})`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Main text container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${organicScale})`,
          transformOrigin: "center center",
          textAlign: "center",
          maxWidth: "85%",
          padding: "0 40px",
        }}
      >
        {/* Text with glow */}
        <div
          style={{
            fontSize: `${fontSizeOverride ?? Math.min(120, Math.max(56, width * 0.08))}px`,
            fontWeight: fontWeight as any,
            color: color,
            fontFamily: typography.heading,
            textShadow: glowShadow(color, glowIntensity * 0.8, 40),
            opacity: textOpacity,
            filter: `blur(${textBlur}px)`,
            letterSpacing: "-2px",
            lineHeight: 1.15,
            wordWrap: "break-word" as const,
          }}
        >
          {text}
        </div>

        {/* Shimmer/glow overlay on text */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            fontSize: `${fontSizeOverride ?? Math.min(120, Math.max(56, width * 0.08))}px`,
            fontWeight: fontWeight as any,
            fontFamily: typography.heading,
            color: "transparent",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            background: `linear-gradient(135deg, transparent ${shimmer(frame, 25, 0) - 15}%, ${rgba(color, glowIntensity)} ${shimmer(frame, 25, 0)}%, transparent ${shimmer(frame, 25, 0) + 15}%)`,
            opacity: textOpacity * 0.6,
            filter: `blur(${textBlur}px)`,
            letterSpacing: "-2px",
            lineHeight: 1.15,
            wordWrap: "break-word" as const,
            padding: "0 40px",
          }}
        >
          {text}
        </div>
      </div>

      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(color, 0.12)} 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.primary, 0.07)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
        `,
        pointerEvents: "none",
        opacity: fadeIn(frame, 0, 30),
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
        pointerEvents: "none",
      }} />

      {/* Breathing scale after zoom settles */}
      {frame > 55 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${organicScale * breatheScale})`,
            fontSize: `${fontSizeOverride ?? Math.min(120, Math.max(56, width * 0.08))}px`,
            fontWeight: fontWeight as any,
            color: color,
            fontFamily: typography.heading,
            textShadow: glowShadow(color, glowIntensity * 0.5, 30),
            opacity: textOpacity * 0.3,
            letterSpacing: "-2px",
            lineHeight: 1.15,
            pointerEvents: "none",
            textAlign: "center",
            maxWidth: "85%",
            padding: "0 40px",
            wordWrap: "break-word" as const,
          }}
        >
          {text}
        </div>
      )}

      {/* Vignette effect (darken edges as text zooms) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle, transparent 30%, ${rgba("#000000", zoomProgress * 0.4)})`,
          pointerEvents: "none",
        }}
      />

    </AbsoluteFill>
  );
};
