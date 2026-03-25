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

export const TypewriterReveal: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const text = params.text ?? "Type your text here";
  const speed = params.speed ?? "medium"; // "slow", "medium", "fast"
  const fontSize = Math.max(52, params.fontSize ?? 64);
  const align = params.align ?? "center"; // "left", "center", "right"
  const cursorColor = params.cursorColor ?? palette.accent;
  const showCursor = params.showCursor !== false;
  const charMode = params.charMode === true; // per-character typewriter
  const fontFamily = params.fontFamily || typography.heading;
  const italicWords: string[] = params.italicWords || []; // words to render italic

  // Split text into words
  const words = text.split(" ");
  const totalWords = words.length;

  // Timing config based on speed
  let wordDelayFrames = 15;
  if (speed === "slow") wordDelayFrames = 25;
  else if (speed === "fast") wordDelayFrames = 8;

  // --- Character mode: reveal letter by letter ---
  const charDelayFrames = speed === "slow" ? 4 : speed === "fast" ? 1.5 : 2.5;
  const totalChars = text.length;
  const charsRevealed = charMode
    ? Math.min(totalChars, Math.floor(frame / charDelayFrames))
    : totalChars;
  const typingDone = charMode ? charsRevealed >= totalChars : frame > totalWords * wordDelayFrames;

  // Calculate each word's appearance (word mode only)
  interface WordStyle {
    opacity: number;
    scale: number;
    y: number;
    blur: number;
  }

  const getWordStyle = (index: number): WordStyle => {
    if (charMode) return { opacity: 1, scale: 1, y: 0, blur: 0 };
    const wordDelay = index * wordDelayFrames;
    const wordFrame = frame - wordDelay;

    if (wordFrame < 0) {
      return { opacity: 0, scale: 0.85, y: 20, blur: 8 };
    }

    const progress = interpolate(wordFrame, [0, 15], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return {
      opacity: progress,
      scale: 0.85 + progress * 0.15,
      y: 20 * (1 - progress),
      blur: 8 * (1 - progress),
    };
  };

  // Calculate cursor blink
  const cursorOpacity = Math.sin(frame / 10) > 0 ? 1 : 0.3;
  const cursorVisible = typingDone;

  // Post-animation floating effect
  const floatingY = frame > totalWords * wordDelayFrames + 30 ? float(frame, 35, 3) : 0;

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
      }}
    >
      {/* Full-screen ambient glow — fills the canvas with color atmosphere */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, ${rgba(palette.accent, 0.12)} 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.primary, 0.06)} 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 70% 30%, ${rgba(palette.secondary, 0.05)} 0%, transparent 60%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Grid pattern background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, ${rgba(palette.text, 0.04)} 25%, ${rgba(palette.text, 0.04)} 26%, transparent 27%, transparent 74%, ${rgba(palette.text, 0.04)} 75%, ${rgba(palette.text, 0.04)} 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, ${rgba(palette.text, 0.04)} 25%, ${rgba(palette.text, 0.04)} 26%, transparent 27%, transparent 74%, ${rgba(palette.text, 0.04)} 75%, ${rgba(palette.text, 0.04)} 76%, transparent 77%, transparent)
          `,
          backgroundSize: "80px 80px",
          pointerEvents: "none",
        }}
      />

      {/* Vignette — darkens edges, keeps focus center */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, transparent 40%, ${rgba(palette.background, 0.6)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Text container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${floatingY}px)`,
          maxWidth: "90%",
          textAlign: align as any,
          fontFamily,
        }}
      >
        {/* Word-by-word or character-by-character reveal */}
        <div
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color: palette.text,
            lineHeight: 1.4,
            wordWrap: "break-word",
          }}
        >
          {charMode ? (
            // Character-by-character typewriter mode
            <>
              {(() => {
                const revealed = text.slice(0, charsRevealed);
                // Split into words and render with italic support
                const renderedWords = revealed.split(" ");
                let charIdx = 0;
                return renderedWords.map((word: string, i: number) => {
                  // Find the full word (may be partially revealed)
                  const fullWord = words[i] || "";
                  const isItalic = italicWords.some(
                    (iw: string) => fullWord.toLowerCase().replace(/[.,!?]/g, "") === iw.toLowerCase().replace(/[.,!?]/g, "")
                  );
                  charIdx += word.length + 1;
                  return (
                    <span
                      key={i}
                      style={{
                        fontStyle: isItalic ? "italic" : "normal",
                        marginRight: "0.3em",
                      }}
                    >
                      {word}
                    </span>
                  );
                });
              })()}
              {/* Blinking cursor — inline next to last typed character */}
              {showCursor && (
                <span
                  style={{
                    display: "inline",
                    borderRight: `4px solid ${cursorColor}`,
                    paddingRight: "2px",
                    opacity: typingDone ? cursorOpacity : 1,
                  }}
                />
              )}
            </>
          ) : (
            // Word-by-word mode (default)
            <>
              {words.map((word: string, index: number) => {
                const style = getWordStyle(index);
                const isItalic = italicWords.some(
                  (iw: string) => word.toLowerCase().replace(/[.,!?]/g, "") === iw.toLowerCase().replace(/[.,!?]/g, "")
                );
                return (
                  <span
                    key={index}
                    style={{
                      display: "inline-block",
                      marginRight: "0.3em",
                      opacity: style.opacity,
                      transform: `scale(${style.scale}) translateY(${style.y}px)`,
                      filter: `blur(${style.blur}px)`,
                      transition: "none",
                      transformOrigin: "center bottom",
                      fontStyle: isItalic ? "italic" : "normal",
                    }}
                  >
                    {word}
                  </span>
                );
              })}

              {/* Blinking cursor */}
              {showCursor && cursorVisible && (
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: `${fontSize * 1.2}px`,
                    marginLeft: "8px",
                    backgroundColor: cursorColor,
                    opacity: cursorOpacity,
                    animation: "none",
                    verticalAlign: "middle",
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Glow effect — full-screen atmospheric radial gradient (NOT clipped to text area) */}
      {frame > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${rgba(palette.accent, 0.12)} 0%, ${rgba(palette.accent, 0.04)} 40%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Continuous shimmer over text (subtle) */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%)`,
          maxWidth: "90%",
          textAlign: align as any,
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: "transparent",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          background: `linear-gradient(90deg, transparent ${shimmer(frame, 25, 0) - 15}%, ${rgba(palette.accent, 0.4)} ${shimmer(frame, 25, 0)}%, transparent ${shimmer(frame, 25, 0) + 15}%)`,
          fontFamily,
          pointerEvents: "none",
          opacity: 0.3,
          lineHeight: 1.4,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
