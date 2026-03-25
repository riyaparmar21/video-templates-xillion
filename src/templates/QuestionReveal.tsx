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

export const QuestionReveal: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const question = params.question ?? "What's next?";
  const style = params.style ?? "dramatic"; // "dramatic" | "casual" | "typewriter"
  const punctuation = params.punctuation ?? "question"; // "question" | "exclamation" | "ellipsis"
  const color = params.color ?? params.accentColor ?? palette.accent;
  const fontSize = params.fontSize ?? 88;

  // Extract question text without punctuation
  let baseQuestion = question.replace(/[?!.]+$/, "");
  const hasPunctuation =
    question.match(/[?!.]+$/) && style !== "typewriter";

  // Get punctuation mark
  let punctMark = "?";
  if (punctuation === "exclamation") punctMark = "!";
  else if (punctuation === "ellipsis") punctMark = "...";

  // Typewriter effect: character by character reveal
  const charsPerFrame = 0.25;
  const typewriterProgress = Math.floor((frame / charsPerFrame) * 100) / 100;
  const displayedChars = Math.round(typewriterProgress);
  const revealedQuestion =
    style === "typewriter"
      ? baseQuestion.substring(0, displayedChars)
      : baseQuestion;

  // Dramatic style: zoom + spring + shake
  let questionScale = 1;
  let questionOpacity = 1;
  let questionY = 0;
  let questionBlur = 0;
  let shakeX = 0;

  if (style === "dramatic") {
    const dramaticProgress = interpolate(frame, [0, 25], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    questionScale = scaleIn(frame, 0, 0.3, 1, 25);
    questionOpacity = fadeIn(frame, 0, 20);
    questionBlur = blurIn(frame, 0, 12, 20);

    // Spring overshoot
    const springVal = springIn(frame, fps, 0, {
      damping: 8,
      stiffness: 120,
      mass: 0.4,
    });
    questionScale = 0.4 + springVal * 0.6;

    // Shake during entrance
    const shakeIntensity = (1 - dramaticProgress) * 15;
    shakeX = Math.sin(frame * 0.4) * shakeIntensity;
    questionY = Math.cos(frame * 0.3) * (shakeIntensity * 0.7);
  } else if (style === "casual") {
    // Smooth fade + slide up
    questionOpacity = fadeIn(frame, 0, 20);
    questionScale = scaleIn(frame, 0, 0.85, 1, 30);
    questionBlur = blurIn(frame, 0, 8, 18);
  }

  // Punctuation entrance: appears separately with spring
  const punctOpacity = fadeIn(frame, 20, 15);
  const punctScale = scaleIn(frame, 20, 0.4, 1, 20);
  const punctSpring = springIn(frame, fps, 20, {
    damping: 10,
    stiffness: 110,
    mass: 0.6,
  });

  // Ellipsis animation: dots appear one by one
  const ellipsisFrame1 = fadeIn(frame, 20, 15);
  const ellipsisFrame2 = fadeIn(frame, 30, 15);
  const ellipsisFrame3 = fadeIn(frame, 40, 15);

  // After reveal: punctuation bounces
  const punctAfterReveal = frame > 50 ? float(frame - 50, 15, 6) : 0;

  // Background darkening/vignetting
  const vignetteFade = fadeIn(frame, 0, 30);

  // Ambient floating shapes
  const shape1Float = float(frame, 60, 8, 0);
  const shape2Float = float(frame, 70, 6, 30);

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
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.primary, 0.07)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
        `,
        pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
        opacity: vignetteFade * 0.7,
        pointerEvents: "none",
      }} />

      {/* Floating abstract shapes - top left */}
      {style === "dramatic" && (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "10%",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            border: `2px solid ${rgba(color, 0.15)}`,
            transform: `translateY(${shape1Float}px) scale(${0.8 + Math.sin(frame / 50) * 0.1})`,
          }}
        />
      )}

      {/* Floating abstract shapes - bottom right */}
      {style === "dramatic" && (
        <div
          style={{
            position: "absolute",
            bottom: "12%",
            right: "8%",
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            border: `2px solid ${rgba(color, 0.12)}`,
            transform: `translateY(${shape2Float}px) scale(${0.85 + Math.sin(frame / 60) * 0.12})`,
          }}
        />
      )}

      {/* Main question text */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: `translate(-50%, -50%) translateX(${shakeX}px) translateY(${questionY}px) scale(${questionScale})`,
          fontSize: `${fontSize}px`,
          fontWeight: style === "casual" ? 600 : 900,
          color: color,
          fontFamily: typography.heading,
          textAlign: "center",
          opacity: questionOpacity,
          filter: `blur(${questionBlur}px)`,
          letterSpacing: style === "dramatic" ? "-2px" : "-1px",
          textShadow: glowShadow(color, pulseGlow(frame, 30, 0.3, 0.8), 30),
          maxWidth: "85%",
          paddingLeft: "20px",
          paddingRight: "20px",
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {revealedQuestion}

        {/* Typewriter cursor */}
        {style === "typewriter" && displayedChars < baseQuestion.length && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: `${fontSize * 0.8}px`,
              background: color,
              marginLeft: "4px",
              animation: "none",
              opacity: Math.sin(frame / 8) > 0 ? 1 : 0,
              verticalAlign: "middle",
            }}
          />
        )}
      </div>

      {/* Shimmer overlay on text */}
      {style !== "typewriter" && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${questionScale})`,
            fontSize: `${fontSize}px`,
            fontWeight: style === "casual" ? 600 : 900,
            color: "transparent",
            fontFamily: typography.heading,
            textAlign: "center",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            background: `linear-gradient(90deg, transparent ${shimmer(frame, 30, 0) - 10}%, ${rgba(color, 0.4)} ${shimmer(frame, 30, 0)}%, transparent ${shimmer(frame, 30, 0) + 10}%)`,
            opacity: questionOpacity * 0.3,
            letterSpacing: style === "dramatic" ? "-2px" : "-1px",
            maxWidth: "90%",
            lineHeight: 1.2,
            pointerEvents: "none",
          }}
        >
          {revealedQuestion}
        </div>
      )}

      {/* Punctuation mark - separate element */}
      {style !== "typewriter" && hasPunctuation && (
        <>
          {punctuation === "question" && (
            <div
              style={{
                position: "absolute",
                top: "48%",
                left: "52%",
                transform: `scale(${punctSpring * 0.6 + 0.4}) translateY(${punctAfterReveal}px)`,
                fontSize: `${fontSize * 1.2}px`,
                fontWeight: 900,
                color: color,
                fontFamily: typography.heading,
                opacity: punctOpacity,
                textShadow: glowShadow(color, pulseGlow(frame, 25, 0.4, 0.9), 30),
                lineHeight: 1,
              }}
            >
              ?
            </div>
          )}

          {punctuation === "exclamation" && (
            <div
              style={{
                position: "absolute",
                top: "48%",
                left: "52%",
                transform: `scale(${punctSpring * 0.6 + 0.4}) translateY(${punctAfterReveal}px)`,
                fontSize: `${fontSize * 1.2}px`,
                fontWeight: 900,
                color: color,
                fontFamily: typography.heading,
                opacity: punctOpacity,
                textShadow: glowShadow(color, pulseGlow(frame, 25, 0.4, 0.9), 30),
                lineHeight: 1,
              }}
            >
              !
            </div>
          )}

          {punctuation === "ellipsis" && (
            <div
              style={{
                position: "absolute",
                top: "48%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: `${fontSize * 0.6}px`,
                  fontWeight: 900,
                  color: color,
                  opacity: ellipsisFrame1,
                  transform: `scale(${scaleIn(frame, 20, 0.5, 1, 15)})`,
                  textShadow: glowShadow(color, 0.5, 15),
                }}
              >
                •
              </span>
              <span
                style={{
                  fontSize: `${fontSize * 0.6}px`,
                  fontWeight: 900,
                  color: color,
                  opacity: ellipsisFrame2,
                  transform: `scale(${scaleIn(frame, 30, 0.5, 1, 15)})`,
                  textShadow: glowShadow(color, 0.5, 15),
                }}
              >
                •
              </span>
              <span
                style={{
                  fontSize: `${fontSize * 0.6}px`,
                  fontWeight: 900,
                  color: color,
                  opacity: ellipsisFrame3,
                  transform: `scale(${scaleIn(frame, 40, 0.5, 1, 15)})`,
                  textShadow: glowShadow(color, 0.5, 15),
                }}
              >
                •
              </span>
            </div>
          )}
        </>
      )}

      {/* Typewriter punctuation */}
      {style === "typewriter" && displayedChars >= baseQuestion.length && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: `translate(calc(-50% + ${fontSize * 0.35}px), -50%) scale(${punctSpring * 0.7 + 0.3}) translateY(${punctAfterReveal}px)`,
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            color: color,
            fontFamily: typography.heading,
            marginLeft: "8px",
            opacity: punctOpacity,
            textShadow: glowShadow(color, pulseGlow(frame, 25, 0.4, 0.9), 30),
          }}
        >
          {punctuation === "question" ? "?" : punctuation === "exclamation" ? "!" : "..."}
        </div>
      )}

      {/* Thinking dots (optional ambient animation for casual style) */}
      {style === "casual" && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "6px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: rgba(color, 0.4),
                opacity: fadeIn(frame, 50 + i * 8, 20),
                transform: `translateY(${Math.sin((frame + i * 10) / 15) * 4}px)`,
              }}
            />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
