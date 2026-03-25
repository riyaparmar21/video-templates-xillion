import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Load Inter font with required weights
const inter = loadInter("normal", {
  weights: ["400", "500", "700"],
});

// ── Types ──

interface TweetData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Display name (bold) */
  displayName: string;
  /** Handle (e.g. @johnkappa) */
  handle: string;
  /** Tweet body text */
  tweetText: string;
  /** Timestamp (e.g. "12:30 PM · Jun 21, 2021") */
  timestamp: string;
  /** Source label (e.g. "Twitter Web App") */
  source: string;
  /** Profile picture URL */
  avatarSrc?: string | null;
  /** Show verified badge */
  verified?: boolean;
  /** Card background color */
  cardColor?: string;
  /** Artboard background color */
  bgColor?: string;
  /** Text color for name and body */
  textColor?: string;
  /** Color for handle and timestamp */
  secondaryColor?: string;
  /** Color for source link */
  accentColor?: string;
}

// ── Easing helpers ──

const easeOut = Easing.out(Easing.quad);
const easeIn = Easing.in(Easing.quad);
const natural = Easing.bezier(0.25, 0.1, 0.25, 1);

// ── Default avatar (inline SVG) ──

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
    <rect width="120" height="120" rx="60" fill="#ccc"/>
    <circle cx="60" cy="45" r="20" fill="#fff"/>
    <ellipse cx="60" cy="95" rx="35" ry="25" fill="#fff"/>
  </svg>`
)}`;

// ── Verified badge (inline SVG) ──

const VERIFIED_BADGE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1d9bf0">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75S9.33 2.63 8.66 3.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.08 4.33l-3.54-3.54 1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z"/>
  </svg>`
)}`;

// ── Timing (ms) ──

const TIMING = {
  // Phase 1: Card slides in from right
  cardSlideIn: { start: 0, end: 500, travelX: 200 },
  // Phase 2: Avatar slides in from right (staggered)
  avatarSlideIn: { start: 100, end: 500, travelX: 150 },
  // Phase 3: Display name slides in
  nameSlideIn: { start: 200, end: 600, travelX: 120 },
  // Phase 4: Verified badge slides in
  verifiedSlideIn: { start: 300, end: 650, travelX: 100 },
  // Phase 5: Handle slides in
  handleSlideIn: { start: 250, end: 650, travelX: 120 },
  // Phase 6: Tweet body slides in (word-by-word stagger)
  bodySlideIn: { start: 400, wordOffsetMs: 60, wordDurationMs: 400, travelX: 80 },
  // Phase 7: Timestamp row slides in
  timestampSlideIn: { start: 700, end: 1100, travelX: 100 },
  // Phase 8: Card shrinks out at end
  cardShrinkOut: { start: 4600, end: 4800, scaleTo: 0.9 },
};

// ── Helper: ms → frame ──

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

// ── Slide-in helper hook ──

function useSlideInFromRight(
  startMs: number,
  endMs: number,
  travelX: number,
): { translateX: number; opacity: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = msToFrame(startMs, fps);
  const endFrame = msToFrame(endMs, fps);

  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eased = natural(progress);
  const translateX = interpolate(eased, [0, 1], [travelX, 0]);
  const opacity = interpolate(eased, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return { translateX, opacity };
}

// ── Animated Word Component (slides in from right) ──

const AnimatedWord: React.FC<{
  word: string;
  delayMs: number;
  durationMs: number;
  travelX: number;
  color: string;
  fontSize: number;
  fontWeight: number;
}> = ({ word, delayMs, durationMs, travelX, color, fontSize, fontWeight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = msToFrame(delayMs, fps);
  const endFrame = msToFrame(delayMs + durationMs, fps);

  const progress = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eased = natural(progress);
  const translateX = interpolate(eased, [0, 1], [travelX, 0]);
  const wordOpacity = interpolate(eased, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        display: "inline-block",
        color,
        fontSize,
        fontFamily: inter.fontFamily,
        fontWeight,
        opacity: wordOpacity,
        transform: `translateX(${translateX}px)`,
        whiteSpace: "pre",
        lineHeight: 1.3,
      }}
    >
      {word}
    </span>
  );
};

// ── Animated Text Line (word-by-word slide from right) ──

const AnimatedTextLine: React.FC<{
  text: string;
  startMs: number;
  wordOffsetMs: number;
  wordDurationMs: number;
  travelX: number;
  color: string;
  fontSize: number;
  fontWeight: number;
}> = ({
  text,
  startMs,
  wordOffsetMs,
  wordDurationMs,
  travelX,
  color,
  fontSize,
  fontWeight,
}) => {
  const words = text.split(" ");

  return (
    <div style={{ overflow: "hidden" }}>
      {words.map((word, i) => {
        const delayMs = startMs + i * wordOffsetMs;
        const displayWord = i < words.length - 1 ? word + " " : word;
        return (
          <AnimatedWord
            key={`word-${i}`}
            word={displayWord}
            delayMs={delayMs}
            durationMs={wordDurationMs}
            travelX={travelX}
            color={color}
            fontSize={fontSize}
            fontWeight={fontWeight}
          />
        );
      })}
    </div>
  );
};

// ── Slide-in wrapper component ──

const SlideInFromRight: React.FC<{
  startMs: number;
  endMs: number;
  travelX: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ startMs, endMs, travelX, children, style }) => {
  const { translateX, opacity } = useSlideInFromRight(startMs, endMs, travelX);

  return (
    <div
      style={{
        ...style,
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

// ── Main Tweet Component ──

export const Tweet: React.FC<{ data: TweetData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "#ffffff";
  const cardColor = data.cardColor || "#ffffff";
  const textColor = data.textColor || "#000000";
  const secondaryColor = data.secondaryColor || "#8e8e8e";
  const accentColor = data.accentColor || "#2aa3ef";
  const avatarSrc = data.avatarSrc || DEFAULT_AVATAR;
  const verified = data.verified !== false;

  // ── Layout constants (from the Figma spec) ──
  // Dynamic card height: estimate lines based on text length and width
  const BODY_FONT = 42;
  const BODY_W = 794;
  const AVG_CHAR_WIDTH = BODY_FONT * 0.52; // approximate average character width
  const CHARS_PER_LINE = Math.floor(BODY_W / AVG_CHAR_WIDTH);
  const estimatedLines = Math.ceil(data.tweetText.length / CHARS_PER_LINE);
  const bodyHeight = estimatedLines * (BODY_FONT * 1.35); // line-height ~1.35
  const BODY_TOP = 190;
  const TIMESTAMP_PADDING = 20;
  const TIMESTAMP_HEIGHT = 30;
  const CARD_BOTTOM_PADDING = 30;
  const dynamicCardH = BODY_TOP + bodyHeight + TIMESTAMP_PADDING + TIMESTAMP_HEIGHT + CARD_BOTTOM_PADDING;
  const cardH = Math.max(411, dynamicCardH); // never smaller than original

  const ARTBOARD = { w: 1080, h: 1080 };
  const CARD = { x: 95, y: Math.max(200, (ARTBOARD.h - cardH) / 2), w: 890, h: cardH, radius: 24 };
  const AVATAR = { x: 50, y: 50, w: 120, h: 120 };
  const NAME = { x: 186, y: 68, fontSize: 32 };
  const VERIFIED = { x: 195, y: 3, w: 32, h: 32 }; // relative to name group
  const HANDLE = { x: 186, y: 113, fontSize: 32 };
  const BODY = { x: 50, y: BODY_TOP, w: BODY_W, fontSize: BODY_FONT };
  const TIMESTAMP_ROW = { x: 50, y: BODY_TOP + bodyHeight + TIMESTAMP_PADDING };
  const TIMESTAMP_FONT = 26;

  // ── Card slide-in from right ──
  const cardStartFrame = msToFrame(TIMING.cardSlideIn.start, fps);
  const cardEndFrame = msToFrame(TIMING.cardSlideIn.end, fps);
  const cardProgress = interpolate(frame, [cardStartFrame, cardEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardEased = natural(cardProgress);
  const cardTranslateX = interpolate(cardEased, [0, 1], [TIMING.cardSlideIn.travelX, 0]);
  const cardEnterOpacity = interpolate(cardEased, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ── Card shrink-out ──
  const shrinkStart = msToFrame(TIMING.cardShrinkOut.start, fps);
  const shrinkEnd = msToFrame(TIMING.cardShrinkOut.end, fps);
  const shrinkProgress = interpolate(frame, [shrinkStart, shrinkEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shrinkEased = easeIn(shrinkProgress);
  const exitScale = interpolate(shrinkEased, [0, 1], [1, TIMING.cardShrinkOut.scaleTo]);
  const exitOpacity = interpolate(shrinkEased, [0, 1], [1, 0]);

  // ── Combined transforms ──
  const combinedOpacity = cardEnterOpacity * exitOpacity;

  // Scale factor to fit artboard into composition
  const fitScale = Math.min(data.width / ARTBOARD.w, data.height / ARTBOARD.h);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Artboard container — scaled to fit composition */}
      <div
        style={{
          width: ARTBOARD.w,
          height: ARTBOARD.h,
          position: "relative",
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Tweet card — slide-in + shrink-out */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            transform: `translateX(${cardTranslateX}px) scale(${exitScale})`,
            transformOrigin: "center center",
            opacity: combinedOpacity,
          }}
        >
          {/* Card background with shadow */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CARD.w,
              height: CARD.h,
              borderRadius: CARD.radius,
              backgroundColor: cardColor,
              boxShadow: "0px 20px 60px rgba(0, 0, 0, 0.2)",
            }}
          />

          {/* Avatar — slides in from right */}
          <SlideInFromRight
            startMs={TIMING.avatarSlideIn.start}
            endMs={TIMING.avatarSlideIn.end}
            travelX={TIMING.avatarSlideIn.travelX}
            style={{
              position: "absolute",
              left: AVATAR.x,
              top: AVATAR.y,
              width: AVATAR.w,
              height: AVATAR.h,
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            <Img
              src={avatarSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </SlideInFromRight>

          {/* Display name — slides in from right */}
          <SlideInFromRight
            startMs={TIMING.nameSlideIn.start}
            endMs={TIMING.nameSlideIn.end}
            travelX={TIMING.nameSlideIn.travelX}
            style={{
              position: "absolute",
              left: NAME.x,
              top: NAME.y,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: inter.fontFamily,
                fontWeight: 700,
                fontSize: NAME.fontSize,
                color: textColor,
                lineHeight: 1.17,
              }}
            >
              {data.displayName}
            </span>

            {/* Verified badge — slides in slightly later */}
            {verified && (
              <SlideInFromRight
                startMs={TIMING.verifiedSlideIn.start}
                endMs={TIMING.verifiedSlideIn.end}
                travelX={TIMING.verifiedSlideIn.travelX}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Img
                  src={VERIFIED_BADGE}
                  style={{ width: 32, height: 32 }}
                />
              </SlideInFromRight>
            )}
          </SlideInFromRight>

          {/* Handle — slides in from right */}
          <SlideInFromRight
            startMs={TIMING.handleSlideIn.start}
            endMs={TIMING.handleSlideIn.end}
            travelX={TIMING.handleSlideIn.travelX}
            style={{
              position: "absolute",
              left: HANDLE.x,
              top: HANDLE.y,
            }}
          >
            <span
              style={{
                fontFamily: inter.fontFamily,
                fontWeight: 400,
                fontSize: HANDLE.fontSize,
                color: secondaryColor,
                lineHeight: 1.17,
              }}
            >
              {data.handle}
            </span>
          </SlideInFromRight>

          {/* Tweet body — word-by-word slide from right */}
          <div
            style={{
              position: "absolute",
              left: BODY.x,
              top: BODY.y,
              width: BODY.w,
            }}
          >
            <AnimatedTextLine
              text={data.tweetText}
              startMs={TIMING.bodySlideIn.start}
              wordOffsetMs={TIMING.bodySlideIn.wordOffsetMs}
              wordDurationMs={TIMING.bodySlideIn.wordDurationMs}
              travelX={TIMING.bodySlideIn.travelX}
              color={textColor}
              fontSize={BODY.fontSize}
              fontWeight={400}
            />
          </div>

          {/* Timestamp row — slides in from right */}
          <SlideInFromRight
            startMs={TIMING.timestampSlideIn.start}
            endMs={TIMING.timestampSlideIn.end}
            travelX={TIMING.timestampSlideIn.travelX}
            style={{
              position: "absolute",
              left: TIMESTAMP_ROW.x,
              top: TIMESTAMP_ROW.y,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: inter.fontFamily,
                fontWeight: 500,
                fontSize: TIMESTAMP_FONT,
                color: secondaryColor,
                lineHeight: 1.17,
              }}
            >
              {data.timestamp}
            </span>
            <span
              style={{
                fontFamily: inter.fontFamily,
                fontWeight: 500,
                fontSize: TIMESTAMP_FONT,
                color: secondaryColor,
                lineHeight: 1.17,
              }}
            >
              ·
            </span>
            <span
              style={{
                fontFamily: inter.fontFamily,
                fontWeight: 500,
                fontSize: TIMESTAMP_FONT,
                color: accentColor,
                lineHeight: 1.17,
              }}
            >
              {data.source}
            </span>
          </SlideInFromRight>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default Tweet;
