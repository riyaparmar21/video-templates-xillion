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

export const TitleSlide: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults + alias support
  const title = params.title ?? params.heading ?? "Welcome";
  const subtitle = params.subtitle ?? params.subheading ?? undefined;
  const rawStyle = params.style ?? "centered";
  const style =
    rawStyle === "minimal" || rawStyle === "bold"
      ? "centered"
      : rawStyle === "cinematic"
        ? "split"
        : rawStyle; // "centered" | "bottom" | "split"
  const accentColor = params.accentColor ?? palette.accent;
  const accentLine =
    params.accentLine ?? (rawStyle === "minimal" ? false : true);
  const logo = params.logo ?? undefined;
  const tagline = params.tagline ?? undefined;

  // Title entrance: slide up + scale + blur
  const titleOpacity = fadeIn(frame, 0, 15);
  const titleScale = scaleIn(frame, 0, 0.7, 1, 30);
  const titleBlur = blurIn(frame, 0, 10, 20);
  const titleSlide = slideIn(frame, 0, "up", 80, 30);

  // Subtitle entrance with delay
  const subtitleOpacity = fadeIn(frame, 20, 15);
  const subtitleScale = scaleIn(frame, 20, 0.8, 1, 25);
  const subtitleSlide = slideIn(frame, 20, "up", 40, 25);

  // Accent line entrance - draws from center outward
  const lineProgress = interpolate(frame, [15, 45], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Tagline entrance (last)
  const taglineOpacity = fadeIn(frame, 50, 15);

  // Continuous motion after entrance
  const titleFloat = frame > 35 ? float(frame - 35, 50, 3) : 0;
  const subtitleFloat = frame > 45 ? float(frame - 45, 55, 2, 10) : 0;

  // Animated background gradient
  const gradientPos = shimmer(frame, 80, 0);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${palette.background} 0%, ${rgba(palette.primary, 0.08)} ${gradientPos}%, ${palette.background} 100%)`,
      }}
    >
      {/* Full-screen ambient glow — creates color atmosphere across entire canvas */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse 90% 70% at 50% 45%, ${rgba(palette.primary, 0.15)} 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 25% 70%, ${rgba(palette.accent, 0.08)} 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 75% 25%, ${rgba(palette.secondary, 0.06)} 0%, transparent 50%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Vignette — darkens edges, focuses attention center */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {style === "centered" && (
        <>
          {/* Centered title */}
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: `translate(-50%, -50%) translateY(${titleSlide.y}px) scale(${titleScale})`,
              fontSize: "96px",
              fontWeight: 900,
              color: palette.primary,
              fontFamily: typography.heading,
              textAlign: "center",
              opacity: titleOpacity,
              filter: `blur(${titleBlur}px)`,
              letterSpacing: "-2px",
              textShadow: glowShadow(palette.primary, pulseGlow(frame, 30, 0.3, 0.7), 25),
              maxWidth: "90%",
              lineHeight: 1.1,
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            {title}
          </div>

          {/* Shimmer overlay on title */}
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${titleScale})`,
              fontSize: "96px",
              fontWeight: 900,
              color: "transparent",
              fontFamily: typography.heading,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              background: `linear-gradient(90deg, transparent ${shimmer(frame, 25, 0) - 10}%, ${rgba(palette.primary, 0.5)} ${shimmer(frame, 25, 0)}%, transparent ${shimmer(frame, 25, 0) + 10}%)`,
              opacity: titleOpacity * 0.4,
              textAlign: "center",
              letterSpacing: "-2px",
              maxWidth: "90%",
              lineHeight: 1.1,
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            {title}
          </div>

          {/* Subtitle below title */}
          {subtitle && (
            <div
              style={{
                position: "absolute",
                top: "52%",
                left: "50%",
                transform: `translate(-50%, -50%) translateY(${subtitleSlide.y}px) scale(${subtitleScale})`,
                fontSize: "40px",
                fontWeight: 400,
                color: rgba(palette.text, 0.7),
                fontFamily: typography.body,
                textAlign: "center",
                opacity: subtitleOpacity,
                maxWidth: "85%",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Optional accent line - centered below title */}
          {accentLine && (
            <div
              style={{
                position: "absolute",
                top: "58%",
                left: "50%",
                transform: "translateX(-50%)",
                height: "5px",
                background: accentColor,
                width: `${lineProgress * 200}px`,
                boxShadow: glowShadow(accentColor, pulseGlow(frame, 25, 0.4, 1), 15),
              }}
            />
          )}

          {/* Tagline at bottom */}
          {tagline && (
            <div
              style={{
                position: "absolute",
                bottom: "15%",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "26px",
                fontWeight: 500,
                color: rgba(palette.text, 0.5),
                fontFamily: typography.mono,
                textAlign: "center",
                opacity: taglineOpacity,
                letterSpacing: "2px",
              }}
            >
              {tagline}
            </div>
          )}
        </>
      )}

      {style === "bottom" && (
        <>
          {/* Title at bottom third */}
          <div
            style={{
              position: "absolute",
              bottom: "25%",
              left: "50%",
              transform: `translate(-50%, 0) translateY(${titleSlide.y}px) scale(${titleScale})`,
              fontSize: "88px",
              fontWeight: 900,
              color: palette.primary,
              fontFamily: typography.heading,
              textAlign: "center",
              opacity: titleOpacity,
              filter: `blur(${titleBlur}px)`,
              letterSpacing: "-2px",
              textShadow: glowShadow(palette.primary, pulseGlow(frame, 30, 0.3, 0.7), 25),
              maxWidth: "90%",
              lineHeight: 1.1,
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            {title}
          </div>

          {/* Accent line above title */}
          {accentLine && (
            <div
              style={{
                position: "absolute",
                bottom: "32%",
                left: "50%",
                transform: "translateX(-50%)",
                height: "5px",
                background: accentColor,
                width: `${lineProgress * 200}px`,
                boxShadow: glowShadow(accentColor, pulseGlow(frame, 25, 0.4, 1), 20),
              }}
            />
          )}

          {/* Subtitle below */}
          {subtitle && (
            <div
              style={{
                position: "absolute",
                bottom: "15%",
                left: "50%",
                transform: `translate(-50%, 0) translateY(${subtitleSlide.y}px) scale(${subtitleScale})`,
                fontSize: "36px",
                fontWeight: 400,
                color: rgba(palette.text, 0.6),
                fontFamily: typography.body,
                textAlign: "center",
                opacity: subtitleOpacity,
                maxWidth: "85%",
              }}
            >
              {subtitle}
            </div>
          )}
        </>
      )}

      {style === "split" && (
        <>
          {/* Vertical accent line on left */}
          {accentLine && (
            <div
              style={{
                position: "absolute",
                left: "15%",
                top: "35%",
                width: "7px",
                height: `${lineProgress * 300}px`,
                background: accentColor,
                boxShadow: glowShadow(accentColor, pulseGlow(frame, 25, 0.4, 1), 20),
              }}
            />
          )}

          {/* Left-aligned title */}
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "25%",
              transform: `translateY(${titleSlide.y}px) scale(${titleScale})`,
              fontSize: "88px",
              fontWeight: 900,
              color: palette.primary,
              fontFamily: typography.heading,
              textAlign: "left",
              opacity: titleOpacity,
              filter: `blur(${titleBlur}px)`,
              letterSpacing: "-2px",
              textShadow: glowShadow(palette.primary, pulseGlow(frame, 30, 0.3, 0.7), 25),
              maxWidth: "60%",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                position: "absolute",
                top: "54%",
                left: "25%",
                transform: `translateY(${subtitleSlide.y}px) scale(${subtitleScale})`,
                fontSize: "36px",
                fontWeight: 400,
                color: rgba(palette.text, 0.65),
                fontFamily: typography.body,
                textAlign: "left",
                opacity: subtitleOpacity,
                maxWidth: "55%",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};
