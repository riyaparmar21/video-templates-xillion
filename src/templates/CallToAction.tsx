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

export const CallToAction: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const heading = params.heading ?? "Ready to Get Started?";
  const subheading = params.subheading ?? params.subtitle ?? undefined;
  const buttonText = params.buttonText ?? "Click Here";
  const buttonColor = params.buttonColor ?? params.accentColor ?? palette.accent;
  const style = params.style ?? "bold"; // "bold" | "elegant" | "minimal"
  const urgency = params.urgency ?? "medium"; // "low" | "medium" | "high"

  // Entrance animations
  const headingOpacity = fadeIn(frame, 0, 15);
  const headingScale = scaleIn(frame, 0, 0.7, 1, 25);
  const headingSpring = springIn(frame, fps, 0, {
    damping: 12,
    stiffness: 100,
    mass: 0.5,
  });

  const subheadingOpacity = fadeIn(frame, 15, 15);
  const subheadingSlide = slideIn(frame, 15, "up", 40, 25);

  const buttonOpacity = fadeIn(frame, 30, 15);
  const buttonScale = scaleIn(frame, 30, 0.8, 1, 20);

  // Urgency intensity (pulsing/shaking effect)
  const urgencyIntensity =
    urgency === "high" ? 1 : urgency === "medium" ? 0.6 : 0.2;
  const pulseSpeed = urgency === "high" ? 15 : urgency === "medium" ? 25 : 40;

  // Screen shake for high urgency
  const shakeAmount =
    frame > 30 && urgency === "high" ? Math.sin(frame / 3) * 3 : 0;

  // Button pulsing/breathing
  const buttonGlowIntensity = pulseGlow(frame, pulseSpeed, 0.3, 1) * urgencyIntensity;

  // Radial gradient focus
  const bgGradientAngle = (frame / 30) * 360;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        transform: `translateX(${shakeAmount}px)`,
      }}
    >
      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(buttonColor, 0.12)} 0%, transparent 60%),
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

      {/* Main heading */}
      <div
        style={{
          position: "absolute",
          top: style === "minimal" ? "35%" : "30%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${headingScale * headingSpring}) translateY(${shakeAmount / 2}px)`,
          fontSize: style === "bold" ? "72px" : style === "elegant" ? "64px" : "48px",
          fontWeight: style === "elegant" ? 300 : 900,
          color: palette.text,
          fontFamily: typography.heading,
          textAlign: "center",
          opacity: headingOpacity,
          maxWidth: "90%",
          lineHeight: 1.2,
          letterSpacing: style === "elegant" ? "1px" : "-1px",
          textShadow:
            style === "bold"
              ? glowShadow(palette.accent, 0.6, 30)
              : style === "elegant"
                ? "0 4px 16px rgba(0,0,0,0.3)"
                : "none",
        }}
      >
        {heading}
      </div>

      {/* Subheading */}
      {subheading && (
        <div
          style={{
            position: "absolute",
            top: style === "minimal" ? "48%" : "43%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${subheadingSlide.y}px)`,
            fontSize: style === "bold" ? "34px" : style === "elegant" ? "28px" : "22px",
            fontWeight: style === "elegant" ? 300 : 500,
            color: rgba(palette.text, 0.75),
            fontFamily: typography.body,
            textAlign: "center",
            opacity: subheadingOpacity,
            maxWidth: "85%",
            lineHeight: 1.5,
            letterSpacing: style === "elegant" ? "0.5px" : "0",
          }}
        >
          {subheading}
        </div>
      )}

      {/* CTA Button */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${buttonScale})`,
          opacity: buttonOpacity,
        }}
      >
        {style === "bold" && (
          <div
            style={{
              padding: "24px 80px",
              fontSize: "24px",
              fontWeight: 700,
              color: palette.background,
              fontFamily: typography.heading,
              background: buttonColor,
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: glowShadow(buttonColor, buttonGlowIntensity, 40),
              border: `3px solid ${rgba(buttonColor, 0.5 + buttonGlowIntensity * 0.3)}`,
              transform: `scale(${1 + Math.sin(frame / pulseSpeed) * 0.02})`,
              textAlign: "center",
              whiteSpace: "nowrap",
              letterSpacing: "1px",
            }}
          >
            {buttonText}
          </div>
        )}

        {style === "elegant" && (
          <div
            style={{
              padding: "18px 50px",
              fontSize: "18px",
              fontWeight: 400,
              color: buttonColor,
              fontFamily: typography.heading,
              background: "transparent",
              borderRadius: "0",
              cursor: "pointer",
              border: `2px solid ${buttonColor}`,
              boxShadow: glowShadow(buttonColor, buttonGlowIntensity * 0.4, 15),
              textAlign: "center",
              whiteSpace: "nowrap",
              letterSpacing: "2px",
            }}
          >
            {buttonText}
          </div>
        )}

        {style === "minimal" && (
          <div
            style={{
              padding: "12px 0",
              fontSize: "16px",
              fontWeight: 600,
              color: buttonColor,
              fontFamily: typography.heading,
              background: "transparent",
              borderRadius: "0",
              cursor: "pointer",
              borderBottom: `3px solid ${buttonColor}`,
              boxShadow: glowShadow(buttonColor, buttonGlowIntensity * 0.3, 10),
              textAlign: "center",
              whiteSpace: "nowrap",
              letterSpacing: "1px",
              transform: `scaleX(${0.8 + Math.sin(frame / pulseSpeed) * 0.1})`,
              transformOrigin: "center",
            }}
          >
            {buttonText}
          </div>
        )}
      </div>

      {/* Pulsing pointer/arrow animation below button */}
      {style === "bold" && (
        <div
          style={{
            position: "absolute",
            top: "68%",
            left: "50%",
            transform: `translate(-50%, ${Math.sin(frame / 12) * 8}px)`,
            fontSize: "36px",
            color: buttonColor,
            opacity: buttonGlowIntensity * 0.7,
            animation: "none",
          }}
        >
          ↓
        </div>
      )}

      {/* Additional accent decorations for high urgency */}
      {urgency === "high" && (
        <>
          {/* Left accent pulse */}
          <div
            style={{
              position: "absolute",
              left: "10%",
              top: "55%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: `2px solid ${rgba(buttonColor, buttonGlowIntensity * 0.5)}`,
              opacity: buttonGlowIntensity * 0.3,
              transform: `scale(${0.7 + Math.sin(frame / 15) * 0.3})`,
            }}
          />

          {/* Right accent pulse */}
          <div
            style={{
              position: "absolute",
              right: "10%",
              top: "55%",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: `2px solid ${rgba(buttonColor, buttonGlowIntensity * 0.5)}`,
              opacity: buttonGlowIntensity * 0.3,
              transform: `scale(${0.7 + Math.sin(frame / 15 + Math.PI) * 0.3})`,
            }}
          />
        </>
      )}

      {/* Corner accent elements */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          right: "12%",
          width: "40px",
          height: "40px",
          borderTop: `3px solid ${rgba(buttonColor, 0.4)}`,
          borderRight: `3px solid ${rgba(buttonColor, 0.4)}`,
          opacity: fadeIn(frame, 10, 20),
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "12%",
          width: "40px",
          height: "40px",
          borderBottom: `3px solid ${rgba(buttonColor, 0.4)}`,
          borderLeft: `3px solid ${rgba(buttonColor, 0.4)}`,
          opacity: fadeIn(frame, 10, 20),
        }}
      />
    </AbsoluteFill>
  );
};
