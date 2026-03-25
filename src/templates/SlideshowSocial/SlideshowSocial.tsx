import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

// ── Types ──
export interface SlideConfig {
  layout:
    | "twoImagesCentered"
    | "imageAboveTextBelow"
    | "fullBleedImage"
    | "gridLeftTextRight"
    | "imageLargeLeftTextRight";
  headline: string;
  images: string[];
  counter: string;
  holdMs: number;
}

export interface SlideshowSocialData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  accentColor: string;
  textColor: string;
  dotColor: string;
  headlineFont: string;
  headlineFontWeight: number;
  headlineFontSize: number;
  headlineLetterSpacing: number;
  bodyFont: string;
  bodyFontSize: number;
  copyrightText: string;
  lineHeight: number;
  dotSize: number;
  slides: SlideConfig[];
  transitionMs: number;
}

// ── Helpers ──
function resolveImg(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  return staticFile(src);
}

const CL = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

// Exit duration for element-level drift before the hard cut
const EXIT_MS = 300;

// ── Word-by-word text reveal ──
const WordReveal: React.FC<{
  text: string;
  progress: number;
  font: string;
  weight: number;
  size: number;
  letterSpacing: number;
  color: string;
  textShadow?: string;
  exitOpacity?: number;
  exitX?: number;
}> = ({
  text,
  progress,
  font,
  weight,
  size,
  letterSpacing,
  color,
  textShadow,
  exitOpacity = 1,
  exitX = 0,
}) => {
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: size * 0.22,
        opacity: exitOpacity,
        transform: `translateX(${exitX}px)`,
      }}
    >
      {words.map((word, i) => {
        const wordStart = i / words.length;
        const wordEnd = Math.min((i + 0.7) / words.length, 1);
        const wordOpacity = interpolate(
          progress,
          [wordStart, wordEnd],
          [0, 1],
          CL
        );
        const wordY = interpolate(progress, [wordStart, wordEnd], [24, 0], {
          ...CL,
          easing: EASE_OUT,
        });
        return (
          <span
            key={i}
            style={{
              fontFamily: font,
              fontWeight: weight,
              fontSize: size,
              fontStyle: "italic",
              color,
              letterSpacing,
              opacity: wordOpacity,
              transform: `translateY(${wordY}px)`,
              display: "inline-block",
              textShadow: textShadow || "none",
              whiteSpace: "nowrap",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

// ── Shared UI atoms ──
const RedLine: React.FC<{
  color: string;
  thickness: number;
  scaleX: number;
  style?: React.CSSProperties;
}> = ({ color, thickness, scaleX, style }) => (
  <div
    style={{
      height: thickness,
      backgroundColor: color,
      transform: `scaleX(${scaleX})`,
      transformOrigin: "left center",
      ...style,
    }}
  />
);

const Dot: React.FC<{
  color: string;
  size: number;
  opacity: number;
  style?: React.CSSProperties;
}> = ({ color, size, opacity, style }) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      opacity,
      position: "absolute",
      ...style,
    }}
  />
);

const CopyrightBlock: React.FC<{
  text: string;
  color: string;
  font: string;
  fontSize: number;
  opacity: number;
  style?: React.CSSProperties;
}> = ({ text, color, font, fontSize, opacity, style }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      opacity,
      ...style,
    }}
  >
    {text.split("\n").map((line, i) => (
      <span
        key={i}
        style={{
          fontFamily: font,
          fontWeight: 400,
          fontSize,
          color,
          lineHeight: 1.3,
        }}
      >
        {line}
      </span>
    ))}
  </div>
);

const CounterText: React.FC<{
  text: string;
  color: string;
  font: string;
  fontSize: number;
  opacity: number;
  style?: React.CSSProperties;
}> = ({ text, color, font, fontSize, opacity, style }) => (
  <span
    style={{
      fontFamily: font,
      fontWeight: 400,
      fontSize,
      color,
      opacity,
      ...style,
    }}
  >
    {text}
  </span>
);

// ── Layout prop types ──
interface LayoutProps {
  slide: SlideConfig;
  data: SlideshowSocialData;
  /** 0→1 during entry phase (element stagger window) */
  enterP: number;
  /** 1→0 during exit phase (last EXIT_MS before slide ends) */
  exitP: number;
}

// ─────────────────────────────────────────────────────
// LAYOUT 1 — Single Image Centered
// One image centered, thick red line crossing over it,
// headline left, thin line at top. Entry: subtle zoom-out.
// ─────────────────────────────────────────────────────
const LayoutTwoImagesCentered: React.FC<LayoutProps> = ({
  slide,
  data,
  enterP,
  exitP,
}) => {
  // Thin line at top: first element to appear
  const thinLineScale = interpolate(enterP, [0, 0.25], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Image fades in + subtle zoom-out (starts slightly zoomed, settles to 1)
  const imgOpacity = interpolate(enterP, [0.05, 0.35], [0, 1], CL);
  const imgScale = interpolate(enterP, [0.05, 0.6], [1.06, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Dots appear mid-entry
  const dotOpacity = interpolate(enterP, [0.25, 0.45], [0, 1], CL);

  // Thick red line across middle (after image)
  const thickLineScale = interpolate(enterP, [0.3, 0.6], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Headline word-by-word reveal
  const textReveal = interpolate(enterP, [0.45, 0.8], [0, 1], CL);

  // Copyright + counter
  const metaOpacity = interpolate(enterP, [0.6, 0.85], [0, 1], CL);

  // Exit: elements drift DOWN
  const exitDriftY = interpolate(exitP, [0, 1], [60, 0], {
    ...CL,
    easing: Easing.out(Easing.cubic),
  });
  const exitFade = exitP;

  const hs = data.headlineFontSize * 1.5;

  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${exitDriftY}px)`,
        opacity: exitFade,
      }}
    >
      {/* Thin red line near top */}
      <div style={{ position: "absolute", top: 80, left: 60, right: 60 }}>
        <RedLine color={data.accentColor} thickness={3} scaleX={thinLineScale} />
      </div>

      {/* Full-bleed image — subtle zoom-out on entry */}
      <Img
        src={resolveImg(slide.images[0])}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: imgOpacity,
          transform: `scale(${imgScale})`,
          transformOrigin: "center center",
        }}
      />

      {/* Thick red line across middle (overlapping image) */}
      <div
        style={{
          position: "absolute",
          top: "58%",
          left: 60,
          right: 60,
          transform: "translateY(-50%)",
        }}
      >
        <RedLine
          color={data.accentColor}
          thickness={data.lineHeight}
          scaleX={thickLineScale}
        />
      </div>

      {/* Headline — word-by-word reveal, left side above thick line */}
      <div style={{ position: "absolute", left: 60, top: "26%" }}>
        <WordReveal
          text={slide.headline}
          progress={textReveal}
          font={data.headlineFont}
          weight={data.headlineFontWeight}
          size={hs}
          letterSpacing={data.headlineLetterSpacing}
          color={data.textColor}
        />
      </div>

      {/* Two dots at bottom */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity}
        style={{ bottom: 80, left: 80 }}
      />
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity}
        style={{ bottom: 80, right: 120 }}
      />

      {/* Copyright + counter top-right */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 60,
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
        }}
      >
        <CopyrightBlock
          text={data.copyrightText}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={metaOpacity}
        />
        <CounterText
          text={slide.counter}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={metaOpacity}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// LAYOUT 2 — Image Above, Text Below
// Small centered image, dots at top corners, red line
// below image, headline bottom-left, copyright right
// Special exit: image ZOOMS UP (for zoom into slide 3)
// ─────────────────────────────────────────────────────
const LayoutImageAboveTextBelow: React.FC<LayoutProps> = ({
  slide,
  data,
  enterP,
  exitP,
}) => {
  // Dots at top corners - appear early
  const dotOpacity = interpolate(enterP, [0, 0.25], [0, 1], CL);

  // Image fades in + scales from center
  const imgOpacity = interpolate(enterP, [0, 0.3], [0, 1], CL);
  const imgScale = interpolate(enterP, [0, 0.35], [0.75, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Red line below image
  const lineScale = interpolate(enterP, [0.2, 0.5], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Headline word reveal
  const textReveal = interpolate(enterP, [0.3, 0.7], [0, 1], CL);

  // Copyright + counter
  const metaOpacity = interpolate(enterP, [0.4, 0.7], [0, 1], CL);

  // EXIT: Image zooms UP to fill frame (transition to fullBleedImage)
  // exitP goes 1→0. At exitP=0 image should be very large
  const exitImgScale = interpolate(exitP, [0, 1], [4.0, 1], {
    ...CL,
    easing: Easing.out(Easing.quad),
  });
  // Other elements fade out quickly during exit
  const exitTextFade = interpolate(exitP, [0, 0.6], [0, 1], CL);

  const hs = data.headlineFontSize * 1.5;

  return (
    <AbsoluteFill>
      {/* Red dots at top corners */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity * exitTextFade}
        style={{ top: 100, left: 80 }}
      />
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity * exitTextFade}
        style={{ top: 100, right: 80 }}
      />

      {/* Centered image — zooms during exit to become full-bleed */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -55%) scale(${imgScale * exitImgScale})`,
          opacity: imgOpacity,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={resolveImg(slide.images[0])}
          style={{
            width: 480,
            height: 320,
            objectFit: "cover",
          }}
        />
      </div>

      {/* Red line below image area */}
      <div
        style={{
          position: "absolute",
          bottom: 240,
          left: 60,
          right: 60,
          opacity: exitTextFade,
        }}
      >
        <RedLine
          color={data.accentColor}
          thickness={data.lineHeight}
          scaleX={lineScale}
        />
      </div>

      {/* Headline word reveal — bottom-left */}
      <div
        style={{
          position: "absolute",
          left: 60,
          bottom: 70,
          opacity: exitTextFade,
        }}
      >
        <WordReveal
          text={slide.headline}
          progress={textReveal}
          font={data.headlineFont}
          weight={data.headlineFontWeight}
          size={hs}
          letterSpacing={data.headlineLetterSpacing}
          color={data.textColor}
        />
      </div>

      {/* Copyright + Counter — right side above line */}
      <div
        style={{
          position: "absolute",
          bottom: 185,
          right: 60,
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          opacity: metaOpacity * exitTextFade,
        }}
      >
        <CopyrightBlock
          text={data.copyrightText}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={1}
        />
        <CounterText
          text={slide.counter}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={1}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// LAYOUT 3 — Full Bleed Image
// Image fills entire frame, headline overlaid top-left,
// line above text, dots at bottom corners, copyright
// Subtle Ken Burns slow zoom during hold.
// Exit: text + line slide RIGHT
// ─────────────────────────────────────────────────────
const LayoutFullBleedImage: React.FC<
  LayoutProps & { holdP: number }
> = ({ slide, data, enterP, exitP, holdP }) => {
  // Image is already full-bleed from start (enters from zoom of prev slide)
  // Subtle slow Ken Burns zoom during hold
  const kenBurns = interpolate(holdP, [0, 1], [1.0, 1.06], CL);

  // Red line near top
  const lineScale = interpolate(enterP, [0.1, 0.45], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Headline word reveal
  const textReveal = interpolate(enterP, [0.2, 0.65], [0, 1], CL);

  // Copyright + counter
  const metaOpacity = interpolate(enterP, [0.35, 0.6], [0, 1], CL);

  // Dots at bottom
  const dotOpacity = interpolate(enterP, [0.3, 0.55], [0, 1], CL);

  // Exit: text + line SLIDE RIGHT
  const exitSlideX = interpolate(exitP, [0, 1], [400, 0], {
    ...CL,
    easing: Easing.out(Easing.cubic),
  });
  const exitFade = interpolate(exitP, [0, 0.7], [0, 1], CL);

  const hs = data.headlineFontSize * 1.5;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Full-bleed image with Ken Burns */}
      <Img
        src={resolveImg(slide.images[0])}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${kenBurns})`,
          transformOrigin: "center center",
        }}
      />

      {/* Red line near top */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 60,
          right: 60,
          transform: `translateX(${exitSlideX}px)`,
          opacity: exitFade,
        }}
      >
        <RedLine
          color={data.accentColor}
          thickness={3}
          scaleX={lineScale}
        />
      </div>

      {/* Headline overlaid — top-left area */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 110,
          transform: `translateX(${exitSlideX}px)`,
          opacity: exitFade,
        }}
      >
        <WordReveal
          text={slide.headline}
          progress={textReveal}
          font={data.headlineFont}
          weight={data.headlineFontWeight}
          size={hs}
          letterSpacing={data.headlineLetterSpacing}
          color={data.textColor}
          textShadow="0 2px 24px rgba(255,255,255,0.6)"
        />
      </div>

      {/* Two dots at bottom corners */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity * exitFade}
        style={{ bottom: 80, left: 80 }}
      />
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity * exitFade}
        style={{ bottom: 80, right: 100 }}
      />

      {/* Copyright + Counter — top-right */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 80,
          display: "flex",
          gap: 40,
          alignItems: "flex-start",
          opacity: metaOpacity * exitFade,
          transform: `translateX(${exitSlideX * 0.5}px)`,
        }}
      >
        <CopyrightBlock
          text={data.copyrightText}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={1}
        />
        <CounterText
          text={slide.counter}
          color={data.accentColor}
          font={data.bodyFont}
          fontSize={data.bodyFontSize}
          opacity={1}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// LAYOUT 4 — Grid Left, Text Right
// 3 stacked images in left column (~33%), headline +
// line + copyright on right side, dots top-right &
// bottom-right
// ─────────────────────────────────────────────────────
const LayoutGridLeftTextRight: React.FC<LayoutProps> = ({
  slide,
  data,
  enterP,
  exitP,
}) => {
  // Images stagger in from top to bottom
  const img0Opacity = interpolate(enterP, [0, 0.25], [0, 1], CL);
  const img1Opacity = interpolate(enterP, [0.08, 0.3], [0, 1], CL);
  const img2Opacity = interpolate(enterP, [0.15, 0.35], [0, 1], CL);
  const imgOpacities = [img0Opacity, img1Opacity, img2Opacity];

  // Dot top-right
  const dotOpacity = interpolate(enterP, [0.15, 0.35], [0, 1], CL);

  // Copyright + counter
  const metaOpacity = interpolate(enterP, [0.25, 0.5], [0, 1], CL);

  // Line
  const lineScale = interpolate(enterP, [0.3, 0.6], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Headline word reveal
  const textReveal = interpolate(enterP, [0.35, 0.75], [0, 1], CL);

  // Exit: fade out
  const exitFade = exitP;

  const hs = data.headlineFontSize * 1.5;

  return (
    <AbsoluteFill style={{ opacity: exitFade }}>
      {/* Stacked images left column */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 80,
          bottom: 80,
          width: "30%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {slide.images.slice(0, 3).map((img, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              overflow: "hidden",
              opacity: imgOpacities[i] ?? 1,
            }}
          >
            <Img
              src={resolveImg(img)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ))}
      </div>

      {/* Right side: copyright + line + headline */}
      <div
        style={{
          position: "absolute",
          right: 80,
          left: "40%",
          bottom: "25%",
        }}
      >
        {/* Copyright + Counter above line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            opacity: metaOpacity,
          }}
        >
          <CopyrightBlock
            text={data.copyrightText}
            color={data.accentColor}
            font={data.bodyFont}
            fontSize={data.bodyFontSize}
            opacity={1}
          />
          <CounterText
            text={slide.counter}
            color={data.accentColor}
            font={data.bodyFont}
            fontSize={data.bodyFontSize}
            opacity={1}
          />
        </div>

        {/* Red line */}
        <RedLine
          color={data.accentColor}
          thickness={data.lineHeight}
          scaleX={lineScale}
          style={{ width: "100%" }}
        />

        {/* Headline */}
        <div style={{ marginTop: 16 }}>
          <WordReveal
            text={slide.headline}
            progress={textReveal}
            font={data.headlineFont}
            weight={data.headlineFontWeight}
            size={hs}
            letterSpacing={data.headlineLetterSpacing}
            color={data.textColor}
          />
        </div>
      </div>

      {/* Dot top-right */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity}
        style={{ top: 80, right: 80 }}
      />
      {/* Dot bottom-right */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity}
        style={{ bottom: 80, right: 80 }}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────
// LAYOUT 5 — Large Image Left, Text Right
// Single large image left (~42%), headline + line +
// copyright on right, dot bottom-right
// ─────────────────────────────────────────────────────
const LayoutImageLargeLeftTextRight: React.FC<LayoutProps> = ({
  slide,
  data,
  enterP,
  exitP,
}) => {
  // Image fades in + slight scale
  const imgOpacity = interpolate(enterP, [0, 0.3], [0, 1], CL);
  const imgScale = interpolate(enterP, [0, 0.4], [0.92, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Copyright + counter
  const metaOpacity = interpolate(enterP, [0.2, 0.45], [0, 1], CL);

  // Line
  const lineScale = interpolate(enterP, [0.25, 0.55], [0, 1], {
    ...CL,
    easing: EASE_OUT,
  });

  // Headline word reveal
  const textReveal = interpolate(enterP, [0.3, 0.7], [0, 1], CL);

  // Dot
  const dotOpacity = interpolate(enterP, [0.3, 0.5], [0, 1], CL);

  const hs = data.headlineFontSize * 1.5;

  return (
    <AbsoluteFill>
      {/* Large image left */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          bottom: 60,
          width: "38%",
          overflow: "hidden",
          opacity: imgOpacity,
          transform: `scale(${imgScale})`,
          transformOrigin: "left center",
        }}
      >
        <Img
          src={resolveImg(slide.images[0])}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Right side content */}
      <div
        style={{
          position: "absolute",
          left: "44%",
          top: "18%",
          right: 80,
        }}
      >
        {/* Copyright + Counter above line */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            opacity: metaOpacity,
          }}
        >
          <CopyrightBlock
            text={data.copyrightText}
            color={data.accentColor}
            font={data.bodyFont}
            fontSize={data.bodyFontSize}
            opacity={1}
          />
          <CounterText
            text={slide.counter}
            color={data.accentColor}
            font={data.bodyFont}
            fontSize={data.bodyFontSize}
            opacity={1}
          />
        </div>

        {/* Red line */}
        <RedLine
          color={data.accentColor}
          thickness={data.lineHeight}
          scaleX={lineScale}
          style={{ width: "100%" }}
        />

        {/* Headline */}
        <div style={{ marginTop: 16 }}>
          <WordReveal
            text={slide.headline}
            progress={textReveal}
            font={data.headlineFont}
            weight={data.headlineFontWeight}
            size={hs}
            letterSpacing={data.headlineLetterSpacing}
            color={data.textColor}
          />
        </div>
      </div>

      {/* Dot bottom-right */}
      <Dot
        color={data.dotColor}
        size={data.dotSize}
        opacity={dotOpacity}
        style={{ bottom: 120, right: 120 }}
      />
    </AbsoluteFill>
  );
};

// ── Main Component ──
export const SlideshowSocial: React.FC<{ data: SlideshowSocialData }> = ({
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  const { slides, transitionMs, bgColor } = data;

  // ── Slide timing ──
  // Each slide occupies holdMs of screen time (sequential, no overlap).
  // Entry animation plays during first transitionMs of each slide's time.
  // Exit animation plays during last EXIT_MS.
  const slideStarts: number[] = [];
  let cumMs = 0;
  for (const slide of slides) {
    slideStarts.push(cumMs);
    cumMs += slide.holdMs;
  }

  // Find the active slide index
  let activeIdx = 0;
  for (let i = slides.length - 1; i >= 0; i--) {
    if (timeMs >= slideStarts[i]) {
      activeIdx = i;
      break;
    }
  }

  const activeSlide = slides[activeIdx];
  const startMs = slideStarts[activeIdx];
  const endMs = startMs + activeSlide.holdMs;

  // Entry progress: 0→1 over transitionMs from slide start
  const enterP = interpolate(
    timeMs,
    [startMs, startMs + transitionMs],
    [0, 1],
    CL
  );

  // Hold progress: 0→1 from after entry to slide end
  const holdP = interpolate(
    timeMs,
    [startMs + transitionMs, endMs],
    [0, 1],
    CL
  );

  // Exit progress: 1→0 during last EXIT_MS of slide
  const exitP = interpolate(
    timeMs,
    [endMs - EXIT_MS, endMs],
    [1, 0],
    CL
  );

  const layoutProps: LayoutProps = {
    slide: activeSlide,
    data,
    enterP,
    exitP,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {activeSlide.layout === "twoImagesCentered" && (
        <LayoutTwoImagesCentered {...layoutProps} />
      )}
      {activeSlide.layout === "imageAboveTextBelow" && (
        <LayoutImageAboveTextBelow {...layoutProps} />
      )}
      {activeSlide.layout === "fullBleedImage" && (
        <LayoutFullBleedImage {...layoutProps} holdP={holdP} />
      )}
      {activeSlide.layout === "gridLeftTextRight" && (
        <LayoutGridLeftTextRight {...layoutProps} />
      )}
      {activeSlide.layout === "imageLargeLeftTextRight" && (
        <LayoutImageLargeLeftTextRight {...layoutProps} />
      )}
    </AbsoluteFill>
  );
};
