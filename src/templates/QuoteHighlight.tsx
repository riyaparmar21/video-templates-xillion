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

export const QuoteHighlight: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const quote = params.quote ?? "Your quote goes here";
  const author = params.author ?? undefined;
  const role = params.role ?? undefined;
  const attribution =
    params.attribution ??
    (author ? (role ? `${author}, ${role}` : author) : undefined);
  const style = params.style ?? "elegant"; // "elegant", "bold", "minimal"
  const accentColor = params.accentColor ?? palette.accent;
  const icon = params.icon ?? "quote"; // "quote", "star", "lightning", "none"

  // Icon elements
  const renderIcon = () => {
    const iconOpacity = fadeIn(frame, 0, 20);
    const iconScale = scaleIn(frame, 0, 0.3, 1, 25);
    const iconY = slideIn(frame, 0, "down", 40, 25).y;

    switch (icon) {
      case "quote":
        return (
          <div
            style={{
              fontSize: "80px",
              fontWeight: 300,
              color: accentColor,
              opacity: iconOpacity,
              transform: `scale(${iconScale}) translateY(${iconY}px)`,
              textAlign: "center",
              fontFamily: typography.heading,
              textShadow: glowShadow(accentColor, 0.4, 20),
            }}
          >
            "
          </div>
        );
      case "star":
        return (
          <div
            style={{
              fontSize: "60px",
              opacity: iconOpacity,
              transform: `scale(${iconScale}) translateY(${iconY}px) rotate(${rotate(frame - 25, 45, fps)})`,
              textAlign: "center",
              color: accentColor,
              filter: glowShadow(accentColor, 0.5, 15),
            }}
          >
            ★
          </div>
        );
      case "lightning":
        return (
          <div
            style={{
              fontSize: "60px",
              opacity: iconOpacity,
              transform: `scale(${iconScale}) translateY(${iconY}px)`,
              textAlign: "center",
              color: accentColor,
              filter: `drop-shadow(0 0 15px ${rgba(accentColor, 0.6)})`,
            }}
          >
            ⚡
          </div>
        );
      default:
        return null;
    }
  };

  // Accent line animation width
  const accentLineWidth = interpolate(frame, [20, 50], [0, 100], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px",
      }}
    >
      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(accentColor, 0.12)} 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.primary, 0.07)} 0%, transparent 55%),
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

      {/* Glassmorphism card background */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "900px",
          height: "auto",
          minHeight: "500px",
          ...glassStyle(0.08, 25, 0.15),
          opacity: fadeIn(frame, 5, 20),
          zIndex: 1,
        }}
      />

      {/* Corner decorative brackets */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "5%",
          fontSize: "40px",
          color: accentColor,
          opacity: fadeIn(frame, 10, 15) * 0.5,
          fontFamily: "monospace",
        }}
      >
        [
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "8%",
          right: "5%",
          fontSize: "40px",
          color: accentColor,
          opacity: fadeIn(frame, 15, 15) * 0.5,
          fontFamily: "monospace",
        }}
      >
        ]
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: "800px" }}>
        {/* Icon section */}
        {icon !== "none" && (
          <div style={{ marginBottom: "30px", display: "flex", justifyContent: "center" }}>
            {renderIcon()}
          </div>
        )}

        {/* Accent line above quote */}
        {style === "elegant" && (
          <div
            style={{
              height: "1px",
              width: `${accentLineWidth}%`,
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              margin: "0 auto 40px auto",
              opacity: fadeIn(frame, 20, 15),
            }}
          />
        )}

        {/* Bold style: left accent bar */}
        {style === "bold" && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "8px",
              height: "100%",
              background: accentColor,
              opacity: fadeIn(frame, 10, 15),
              borderRadius: "4px",
            }}
          />
        )}

        {/* Quote text */}
        <div
          style={{
            fontSize: style === "bold" ? "48px" : style === "elegant" ? "42px" : "40px",
            fontWeight: style === "bold" ? 700 : 600,
            color: palette.text,
            fontFamily: style === "elegant" ? typography.heading : typography.heading,
            textAlign: "center",
            marginBottom: "30px",
            lineHeight: 1.6,
            opacity: fadeIn(frame, 25, 25),
            transform: `translateY(${slideIn(frame, 25, "up", 30, 25).y}px)`,
            paddingLeft: style === "bold" ? "40px" : "0",
          }}
        >
          {quote}
        </div>

        {/* Minimal style: underline */}
        {style === "minimal" && (
          <div
            style={{
              height: "2px",
              width: `${accentLineWidth}%`,
              background: accentColor,
              margin: "30px auto",
              opacity: fadeIn(frame, 40, 15),
            }}
          />
        )}

        {/* Attribution */}
        {attribution && (
          <div
            style={{
              fontSize: "20px",
              fontWeight: 500,
              color: rgba(palette.text, 0.7),
              fontFamily: typography.body,
              textAlign: "center",
              marginTop: "30px",
              opacity: fadeIn(frame, 50, 20),
              transform: `translateY(${slideIn(frame, 50, "up", 20, 20).y}px)`,
            }}
          >
            — {attribution}
          </div>
        )}
      </div>

      {/* Shimmer overlay on quote */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "800px",
          fontSize: "42px",
          color: "transparent",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          background: `linear-gradient(90deg, transparent ${shimmer(frame, 30, 0) - 20}%, ${rgba(accentColor, 0.5)} ${shimmer(frame, 30, 0)}%, transparent ${shimmer(frame, 30, 0) + 20}%)`,
          fontFamily: typography.heading,
          textAlign: "center",
          pointerEvents: "none",
          opacity: 0.2,
          lineHeight: 1.6,
          zIndex: 2,
        }}
      >
        {quote}
      </div>

      {/* Breathing pulse effect on accent color */}
      {frame > 60 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "600px",
            border: `2px solid ${rgba(accentColor, pulseGlow(frame, 30, 0.1, 0.3))}`,
            borderRadius: "20px",
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
