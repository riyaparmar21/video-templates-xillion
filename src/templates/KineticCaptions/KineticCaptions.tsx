import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
  AbsoluteFill,
  Img,
  staticFile,
  OffthreadVideo,
} from "remotion";
// Spring config — snappy pop-in for word entrances
const SPRING_POP_IN = { damping: 12, stiffness: 200, mass: 0.5 };
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";

// Load fonts with specific weights/styles
const montserrat = loadMontserrat("normal", {
  weights: ["800", "900"],
});
const montserratItalic = loadMontserrat("italic", {
  weights: ["800", "900"],
});
const raleway = loadRaleway("italic", {
  weights: ["300"],
});

// ── Style Token Types ──

type StyleToken =
  | "normal"      // white, Montserrat 800
  | "filler"      // gray, Raleway 300 italic
  | "big"         // white, Montserrat 900 extra large
  | "emphasis-blue"  // #3B9EFF, Montserrat 900
  | "emphasis-gold"  // #F5A623, Montserrat 900
  | "accent-blue"    // #3B9EFF, Montserrat 800
  | "big-blue";      // #3B9EFF, Montserrat 900 large

interface Word {
  text: string;
  style: StyleToken;
}

interface CaptionLine {
  words: Word[];
}

interface CaptionGroup {
  id: number;
  startFrame: number;
  durationFrames: number;
  lines: CaptionLine[];
}

interface KineticCaptionsData {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  groups: CaptionGroup[];
  videoSrc?: string;
  showBackground?: boolean;
}

// ── Style Map ──

const STYLE_MAP: Record<StyleToken, {
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  opacity: number;
  letterSpacing: number;
}> = {
  normal: {
    color: "#FFFFFF",
    fontSize: 96,
    fontFamily: montserrat.fontFamily,
    fontWeight: 800,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -2,
  },
  filler: {
    color: "#AAAAAA",
    fontSize: 78,
    fontFamily: raleway.fontFamily,
    fontWeight: 300,
    fontStyle: "italic",
    opacity: 0.6,
    letterSpacing: 0,
  },
  big: {
    color: "#FFFFFF",
    fontSize: 108,
    fontFamily: montserrat.fontFamily,
    fontWeight: 900,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -3,
  },
  "emphasis-blue": {
    color: "#3B9EFF",
    fontSize: 100,
    fontFamily: montserrat.fontFamily,
    fontWeight: 900,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -2,
  },
  "emphasis-gold": {
    color: "#F5A623",
    fontSize: 100,
    fontFamily: montserrat.fontFamily,
    fontWeight: 900,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -2,
  },
  "accent-blue": {
    color: "#3B9EFF",
    fontSize: 96,
    fontFamily: montserrat.fontFamily,
    fontWeight: 800,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -2,
  },
  "big-blue": {
    color: "#3B9EFF",
    fontSize: 108,
    fontFamily: montserrat.fontFamily,
    fontWeight: 900,
    fontStyle: "normal",
    opacity: 1,
    letterSpacing: -3,
  },
};

// ── Animated Word Component ──

const AnimatedWord: React.FC<{
  word: Word;
  delay: number;
  groupFrame: number;
  fps: number;
}> = ({ word, delay, groupFrame, fps }) => {
  const style = STYLE_MAP[word.style];

  // Spring pop-in animation
  const progress = spring({
    frame: Math.max(0, groupFrame - delay),
    fps,
    config: SPRING_POP_IN,
  });

  const scale = interpolate(progress, [0, 1], [0.6, 1]);
  const opacity = interpolate(progress, [0, 1], [0, style.opacity]);
  const translateY = interpolate(progress, [0, 1], [12, 0]);

  return (
    <span
      style={{
        display: "inline-block",
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle as React.CSSProperties["fontStyle"],
        letterSpacing: style.letterSpacing,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transformOrigin: "center bottom",
        marginRight: 14,
        textShadow: "0 2px 14px rgba(0,0,0,0.9), 0 0px 6px rgba(0,0,0,0.7)",
        lineHeight: 0.88,
        whiteSpace: "nowrap",
      }}
    >
      {word.text}
    </span>
  );
};

// ── Caption Group Component ──

const CaptionGroupView: React.FC<{
  group: CaptionGroup;
  fps: number;
}> = ({ group, fps }) => {
  const frame = useCurrentFrame();

  // Exit animation (fade + scale down in last 4 frames)
  const exitStart = group.durationFrames - 4;
  const exitProgress = interpolate(
    frame,
    [exitStart, group.durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.95]);

  // Count total words across all lines for stagger calculation
  let wordIndex = 0;

  return (
    <div
      style={{
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
        transformOrigin: "center center",
      }}
    >
      {group.lines.map((line, lineIdx) => {
        const lineWords = line.words.map((word, wIdx) => {
          const currentWordIndex = wordIndex;
          wordIndex++;
          return (
            <AnimatedWord
              key={`${group.id}-${lineIdx}-${wIdx}`}
              word={word}
              delay={currentWordIndex * 3} // 3 frames stagger per word (~100ms at 30fps)
              groupFrame={frame}
              fps={fps}
            />
          );
        });

        return (
          <div
            key={`line-${group.id}-${lineIdx}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              lineHeight: 0.82,
              marginTop: lineIdx > 0 ? -22 : 0, // aggressive overlap — descenders tuck into ascenders
            }}
          >
            {lineWords}
          </div>
        );
      })}
    </div>
  );
};

// ── Main KineticCaptions Component ──

export const KineticCaptions: React.FC<{
  captionData: KineticCaptionsData;
}> = ({ captionData }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: captionData.showBackground !== false ? "#0A0A0F" : "transparent",
      }}
    >
      {/* Optional background video */}
      {captionData.videoSrc && (
        <AbsoluteFill>
          <OffthreadVideo
            src={captionData.videoSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Caption overlay container — centered */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: 40,
          paddingRight: 40,
        }}
      >
        {captionData.groups.map((group) => (
          <Sequence
            key={group.id}
            from={group.startFrame}
            durationInFrames={group.durationFrames}
            layout="none"
          >
            <CaptionGroupView group={group} fps={fps} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default KineticCaptions;
