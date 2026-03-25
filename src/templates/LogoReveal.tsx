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

export const LogoReveal: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const text = params.text ?? "BRAND";
  const tagline = params.tagline ?? params.subtitle ?? undefined;
  const style = params.style ?? "fade"; // "fade", "assemble", "glitch", "sweep"
  const letterSpacing = params.letterSpacing ?? 8;
  const fontSize = params.fontSize ?? 120;
  const color = params.color ?? params.accentColor ?? palette.primary;

  const letters = text.split("");
  const totalLetters = letters.length;

  // Animation timing
  const revealDuration = 40;
  const revealEnd = revealDuration;
  const glowStartFrame = revealEnd + 10;

  const renderLetters = () => {
    if (style === "fade") {
      // Fade in with scale from center
      const letterOpacity = fadeIn(frame, 0, revealDuration);
      const letterScale = scaleIn(frame, 0, 0.7, 1, revealDuration);
      const letterBlur = blurIn(frame, 0, 8, revealDuration);

      return (
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${letterScale})`,
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            letterSpacing: `${letterSpacing}px`,
            opacity: letterOpacity,
            filter: `blur(${letterBlur}px)`,
            whiteSpace: "nowrap",
            textShadow: glowShadow(color, pulseGlow(frame, 25, 0.4, 0.8), 25),
          }}
        >
          {text}
        </div>
      );
    } else if (style === "assemble") {
      // Each letter comes from random direction and assembles
      return (
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            letterSpacing: `${letterSpacing}px`,
            display: "flex",
            whiteSpace: "nowrap",
          }}
        >
          {letters.map((letter: string, idx: number) => {
            const letterDelay = staggerDelay(idx, totalLetters, 40);
            const letterProgress = staggerProgress(
              frame,
              idx,
              totalLetters,
              40,
              30
            );

            // Random direction for each letter
            const seed = `assemble-${idx}`;
            const direction = random(seed) > 0.5 ? "left" : "right";
            const fromX = direction === "left" ? -200 : 200;
            const currentX = fromX * (1 - letterProgress);

            const letterOpacity = interpolate(letterProgress, [0, 1], [0, 1]);
            const letterScale = interpolate(letterProgress, [0, 1], [0.5, 1]);

            return (
              <div
                key={idx}
                style={{
                  display: "inline-block",
                  transform: `translateX(${currentX}px) scale(${letterScale})`,
                  opacity: letterOpacity,
                  textShadow: glowShadow(color, letterProgress * 0.7, 20),
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      );
    } else if (style === "glitch") {
      // Digital glitch effect with offset channels and flicker
      const glitchIntensity = interpolate(
        frame,
        [0, 10, revealDuration - 10, revealDuration],
        [0.8, 0, 0, 0.3]
      );

      const letters_jsx = (
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            letterSpacing: `${letterSpacing}px`,
            whiteSpace: "nowrap",
            textShadow: glowShadow(color, pulseGlow(frame, 20, 0.3, 0.9), 20),
          }}
        >
          {text}
        </div>
      );

      const offset = glitchIntensity * 12;
      const glitchOpacity = interpolate(frame, [0, revealDuration], [0, 1]);

      return (
        <div style={{ position: "relative" }}>
          {/* Red channel offset */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              color: "#FF0000",
              opacity: glitchIntensity * 0.6,
              transform: `translateX(${offset}px)`,
              filter: `blur(${glitchIntensity * 2}px)`,
            }}
          >
            {text}
          </div>

          {/* Blue channel offset */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              color: "#0000FF",
              opacity: glitchIntensity * 0.6,
              transform: `translateX(${-offset}px)`,
              filter: `blur(${glitchIntensity * 2}px)`,
            }}
          >
            {text}
          </div>

          {/* Main text */}
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: `${fontSize}px`,
              fontWeight: 900,
              color: color,
              fontFamily: typography.heading,
              letterSpacing: `${letterSpacing}px`,
              whiteSpace: "nowrap",
              opacity: glitchOpacity,
              textShadow: glowShadow(color, 0.7, 20),
            }}
          >
            {text}
          </div>
        </div>
      );
    } else if (style === "sweep") {
      // Light sweep passes across revealing text
      const sweepOpacity = fadeIn(frame, 0, revealDuration);
      const sweepPosition = shimmer(frame, 40, 0) - 50;

      return (
        <div
          style={{
            position: "relative",
            display: "inline-block",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: `${fontSize}px`,
              fontWeight: 900,
              color: color,
              fontFamily: typography.heading,
              letterSpacing: `${letterSpacing}px`,
              whiteSpace: "nowrap",
              textShadow: glowShadow(color, pulseGlow(frame, 25, 0.4, 0.8), 25),
              opacity: sweepOpacity,
            }}
          >
            {text}
          </div>

          {/* Sweep light effect */}
          <div
            style={{
              position: "absolute",
              top: "35%",
              left: `calc(50% + ${(sweepPosition - 50) * 10}px)`,
              transform: "translate(-50%, -50%)",
              width: "200%",
              height: "120px",
              background: `linear-gradient(90deg,
                transparent 0%,
                ${rgba("#FFFFFF", 0.6)} 40%,
                ${rgba("#FFFFFF", 0.8)} 50%,
                ${rgba("#FFFFFF", 0.6)} 60%,
                transparent 100%)`,
              marginLeft: "-100%",
              opacity: Math.max(0, 1 - frame / (revealDuration * 1.2)),
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />
        </div>
      );
    }
    return null;
  };

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

      {/* Radial gradient background behind logo */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(color, 0.15)} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(80px)",
          opacity: fadeIn(frame, 0, revealDuration),
        }}
      />

      {/* Main logo text */}
      {renderLetters()}

      {/* Pulsing glow after reveal */}
      {frame > glowStartFrame && (
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "50%",
            width: "500px",
            height: "200px",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${rgba(color, 0.2)} 0%, transparent 70%)`,
            filter: `blur(40px)`,
            opacity: pulseGlow(frame - glowStartFrame, 30, 0.2, 0.5),
          }}
        />
      )}

      {/* Tagline */}
      {tagline && (
        <div
          style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${slideIn(frame, revealEnd + 5, "up", 20, 25).y}px)`,
            fontSize: "24px",
            fontWeight: 300,
            color: rgba(palette.text, 0.7),
            fontFamily: typography.body,
            letterSpacing: "2px",
            opacity: fadeIn(frame, revealEnd + 5, 20),
            textAlign: "center",
          }}
        >
          {tagline}
        </div>
      )}

      {/* Accent line below logo */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: "50%",
          width: interpolate(
            fadeIn(frame, 0, revealDuration),
            [0, 1],
            [0, 300]
          ),
          height: "2px",
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          transform: "translate(-50%, -50%)",
          opacity: fadeIn(frame, 5, 25),
        }}
      />
    </AbsoluteFill>
  );
};
