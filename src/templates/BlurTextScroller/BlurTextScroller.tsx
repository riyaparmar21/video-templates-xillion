import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Load Inter — bold weight for the word list
const inter = loadInter("normal", {
  weights: ["700", "800", "900"],
});

// ── Types ──

interface BlurTextScrollerData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Array of words/phrases to scroll through */
  words: string[];
  /** Background color */
  bgColor?: string;
  /** Text color */
  textColor?: string;
  /** Font size of the active (focused) word */
  fontSize?: number;
  /** Font weight */
  fontWeight?: number;
  /** Letter spacing in px */
  letterSpacing?: number;
  /** Rotation angle of the entire list (degrees) */
  angle?: number;
  /** Line height multiplier */
  lineHeight?: number;
  /** Arrow indicator character */
  arrow?: string;
  /** How many words visible above and below the active word */
  visibleAbove?: number;
  visibleBelow?: number;
  /** Maximum blur in px for the furthest words */
  maxBlur?: number;
  /** Whether the list loops continuously */
  loop?: boolean;
  /** Time per word in ms (how long each word is in focus) */
  msPerWord?: number;
}

// ── Main BlurTextScroller Component ──

export const BlurTextScroller: React.FC<{
  data: BlurTextScrollerData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "#000000";
  const textColor = data.textColor || "#FFFFFF";
  const fontSize = data.fontSize ?? 68;
  const fontWeight = data.fontWeight ?? 800;
  const letterSpacing = data.letterSpacing ?? -3;
  const angle = data.angle ?? -18;
  const lineHeightMult = data.lineHeight ?? 1.35;
  const arrow = data.arrow ?? "→";
  const visibleAbove = data.visibleAbove ?? 3;
  const visibleBelow = data.visibleBelow ?? 3;
  const maxBlur = data.maxBlur ?? 10;
  const loop = data.loop !== false;
  const msPerWord = data.msPerWord ?? 600;
  const words = data.words || [];

  const totalWords = words.length;
  if (totalWords === 0)
    return <AbsoluteFill style={{ backgroundColor: bgColor }} />;

  // ── 3D Drum / Barrel Parameters ──
  // The words are placed on the surface of a vertical cylinder.
  // The cylinder radius determines how pronounced the curve is.
  const lineH = fontSize * lineHeightMult;
  // Angular spacing between words on the drum (in degrees)
  const angleBetweenWords = 22;
  // Radius of the drum — calculated so the arc-spacing matches lineH
  // r = lineH / (2 * sin(angleBetweenWords/2 * PI/180))
  const drumRadius =
    lineH / (2 * Math.sin(((angleBetweenWords / 2) * Math.PI) / 180));

  // ── Continuous scroll position (in "word units") ──
  const elapsedMs = (frame / fps) * 1000;
  const scrollPos = elapsedMs / msPerWord;

  // ── Determine which words to render ──
  const renderBuffer = Math.max(visibleAbove, visibleBelow) + 2;
  const centerWordIdx = Math.floor(scrollPos);
  const fractional = scrollPos - centerWordIdx;

  const wordItems: React.ReactNode[] = [];

  for (
    let i = centerWordIdx - renderBuffer;
    i <= centerWordIdx + renderBuffer;
    i++
  ) {
    // Resolve word index
    let wordIndex: number;
    if (loop) {
      wordIndex = ((i % totalWords) + totalWords) % totalWords;
    } else {
      if (i < 0 || i >= totalWords) continue;
      wordIndex = i;
    }

    // Distance from the current scroll position (in word units, fractional)
    const distWords = i - scrollPos;

    // Angle on the drum for this word
    const drumAngle = distWords * angleBetweenWords;

    // 3D position on the drum surface
    // Y = R * sin(angle) — vertical displacement
    // Z = R * (1 - cos(angle)) — depth displacement (0 at front, increases toward back)
    const radAngle = (drumAngle * Math.PI) / 180;
    const yPos = drumRadius * Math.sin(radAngle);
    const zPos = drumRadius * (1 - Math.cos(radAngle));

    // Absolute distance for visual effects
    const absDist = Math.abs(distWords);

    // ── Blur: increases with distance from center ──
    const blur = interpolate(
      absDist,
      [0, 0.5, 1.5, renderBuffer],
      [0, 0, maxBlur * 0.5, maxBlur],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );

    // ── Opacity: full at center, fades with distance ──
    const opacity = interpolate(
      absDist,
      [0, 0.5, 2, renderBuffer],
      [1, 0.95, 0.3, 0.08],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );

    // ── Scale: words recede as they go around the drum ──
    // Perspective-based scale: further words (higher Z) appear smaller
    const perspectiveDistance = 1200;
    const perspScale = perspectiveDistance / (perspectiveDistance + zPos);

    // ── Arrow: only visible near the focal point ──
    const arrowOpacity = interpolate(absDist, [0, 0.35, 0.6], [1, 0.4, 0], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });

    const word = words[wordIndex];

    wordItems.push(
      <div
        // Key by absolute scroll index `i` — React reuses elements as they scroll
        key={i}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          transform: `translateY(${yPos - lineH / 2}px) scale(${perspScale})`,
          transformOrigin: "left center",
          display: "flex",
          alignItems: "center",
          gap: fontSize * 0.35,
          filter: blur > 0.3 ? `blur(${blur}px)` : "none",
          opacity,
          willChange: "transform, filter, opacity",
          whiteSpace: "nowrap",
        }}
      >
        {/* Arrow indicator */}
        <span
          style={{
            fontSize: fontSize * 0.65,
            fontFamily: inter.fontFamily,
            fontWeight: 800,
            color: textColor,
            opacity: arrowOpacity,
            width: fontSize * 0.7,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {arrowOpacity > 0.01 ? arrow : ""}
        </span>

        {/* Word */}
        <span
          style={{
            fontSize,
            fontFamily: inter.fontFamily,
            fontWeight,
            color: textColor,
            letterSpacing,
            lineHeight: `${lineH}px`,
          }}
        >
          {word}
        </span>
      </div>
    );
  }

  // ── fitScale: scale the design artboard to fit the composition ──
  const designW = 750;
  const designH = 750;
  const fitScale = Math.min(data.width / designW, data.height / designH);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        overflow: "hidden",
      }}
    >
      {/* Rotated + scaled container holding the 3D drum */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: designW,
          height: designH,
          transform: `translate(-50%, -50%) scale(${fitScale}) rotate(${angle}deg)`,
          transformOrigin: "center center",
        }}
      >
        {/* Word list container — shifted right so text is visible after rotation */}
        <div
          style={{
            position: "absolute",
            left: designW * 0.15,
            top: 0,
            width: designW * 0.82,
            height: "100%",
          }}
        >
          {wordItems}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default BlurTextScroller;
