import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";

// Load Lato font with required weights
const lato = loadLato("normal", {
  weights: ["400", "700"],
});

// ── Types ──

interface IOSNotificationData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** App icon URL (SVG or PNG) */
  iconSrc?: string;
  /** Title text (bold, e.g. sender name) */
  title: string;
  /** Body text (regular weight, e.g. message content) */
  body: string;
  /** Timestamp label shown top-right */
  timestamp?: string;
  /** Notification background color */
  notifColor?: string;
  /** Notification background opacity (0-100) */
  notifOpacity?: number;
  /** Text color */
  textColor?: string;
  /** Timestamp text color */
  timestampColor?: string;
  /** Corner radius of the notification pill */
  cornerRadius?: number;
  /** Artboard background color */
  bgColor?: string;
}

// ── Easing helpers ──

const easeOut = Easing.out(Easing.quad);
const easeIn = Easing.in(Easing.quad);

// "back" easing — overshoot for the bouncy pop-in feel
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ── Default iMessage icon (inline SVG data URI) ──

const DEFAULT_ICON_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
    <rect width="120" height="120" rx="24" fill="#34C759"/>
    <path d="M60 28c-18.8 0-34 13.4-34 30 0 9.4 4.8 17.8 12.4 23.4L36 92l13.2-6.6c3.4 1 7 1.6 10.8 1.6 18.8 0 34-13.4 34-30S78.8 28 60 28z" fill="white"/>
  </svg>`
)}`;

// ── Timing (ms) — from the Figma spec ──

const TIMING = {
  // Phase 1: Notification card scale + opacity (grows in with back easing)
  cardGrowIn: { start: 0, end: 400, scaleFrom: 0.6 },
  cardFadeIn: { start: 0, end: 150 },
  // Phase 2: Icon grows in (staggered, back easing)
  iconGrowIn: { start: 100, end: 400, scaleFrom: 0.5 },
  // Phase 3: Title text — word-by-word slide+fade from bottom
  titleTextIn: { start: 200, wordOffsetMs: 50, wordDurationMs: 200, travel: 50 },
  // Phase 4: Body text — word-by-word slide+fade from bottom
  bodyTextIn: { start: 500, wordOffsetMs: 50, wordDurationMs: 200, travel: 50 },
  // Phase 5: Card shrinks out
  cardShrinkOut: { start: 2800, end: 3000, scaleTo: 0.8 },
};

// ── Helper: ms → frame ──

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

// ── Animated Word Component ──

const AnimatedWord: React.FC<{
  word: string;
  delayMs: number;
  durationMs: number;
  travelDistance: number;
  color: string;
  fontSize: number;
  fontWeight: number;
  opacity?: number;
}> = ({ word, delayMs, durationMs, travelDistance, color, fontSize, fontWeight, opacity: textOpacity = 100 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = msToFrame(delayMs, fps);
  const endFrame = msToFrame(delayMs + durationMs, fps);

  const progress = interpolate(
    frame,
    [startFrame, endFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "natural" easing (cubic bezier approximation)
  const eased = Easing.bezier(0.25, 0.1, 0.25, 1)(progress);
  const translateY = interpolate(eased, [0, 1], [travelDistance, 0]);
  const wordOpacity = interpolate(eased, [0, 1], [0, 1]);

  return (
    <span
      style={{
        display: "inline-block",
        color,
        fontSize,
        fontFamily: lato.fontFamily,
        fontWeight,
        opacity: wordOpacity * (textOpacity / 100),
        transform: `translateY(${translateY}px)`,
        whiteSpace: "pre",
        lineHeight: 1.2,
      }}
    >
      {word}
    </span>
  );
};

// ── Text Line with word-by-word animation ──

const AnimatedTextLine: React.FC<{
  text: string;
  startMs: number;
  wordOffsetMs: number;
  wordDurationMs: number;
  travelDistance: number;
  color: string;
  fontSize: number;
  fontWeight: number;
  textOpacity?: number;
}> = ({ text, startMs, wordOffsetMs, wordDurationMs, travelDistance, color, fontSize, fontWeight, textOpacity }) => {
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
            travelDistance={travelDistance}
            color={color}
            fontSize={fontSize}
            fontWeight={fontWeight}
            opacity={textOpacity}
          />
        );
      })}
    </div>
  );
};

// ── Main IOSNotification Component ──

export const IOSNotification: React.FC<{
  data: IOSNotificationData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "transparent";
  const notifColor = data.notifColor || "#e6e6e6";
  const notifOpacity = data.notifOpacity ?? 90;
  const textColor = data.textColor || "#000000";
  const timestampColor = data.timestampColor || "#000000";
  const cornerRadius = data.cornerRadius ?? 56;
  const iconSrc = data.iconSrc || DEFAULT_ICON_SVG;
  const timestamp = data.timestamp || "now";

  // ── Layout constants (from Figma spec) ──
  const ARTBOARD = { w: 1080, h: 312 };
  const NOTIF = { x: 60, y: 60, w: 960, h: 192 };
  const ICON = { x: 36, y: 36, w: 120, h: 120, radius: 12 };
  const TITLE = { x: 192, y: 40, w: 600, h: 56, fontSize: 42 };
  const BODY = { x: 192, y: 96, w: 728, h: 56, fontSize: 42 };
  const TIMESTAMP = { x: 844, y: 40, w: 68, h: 56, fontSize: 36 };

  // ── Phase 1: Card grow-in (scale 0.6→1 with back easing, opacity 0→1) ──
  const cardGrowStart = msToFrame(TIMING.cardGrowIn.start, fps);
  const cardGrowEnd = msToFrame(TIMING.cardGrowIn.end, fps);
  const cardFadeEnd = msToFrame(TIMING.cardFadeIn.end, fps);

  const cardGrowProgress = interpolate(
    frame,
    [cardGrowStart, cardGrowEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cardScale = interpolate(
    easeOutBack(cardGrowProgress),
    [0, 1],
    [TIMING.cardGrowIn.scaleFrom, 1]
  );

  const cardFadeProgress = interpolate(
    frame,
    [cardGrowStart, cardFadeEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const cardOpacity = cardFadeProgress; // linear fade-in (easing: "none" in spec)

  // ── Phase 2: Icon grow-in (back easing, staggered) ──
  const iconGrowStart = msToFrame(TIMING.iconGrowIn.start, fps);
  const iconGrowEnd = msToFrame(TIMING.iconGrowIn.end, fps);

  const iconGrowProgress = interpolate(
    frame,
    [iconGrowStart, iconGrowEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const iconScale = interpolate(
    easeOutBack(iconGrowProgress),
    [0, 1],
    [TIMING.iconGrowIn.scaleFrom, 1]
  );
  const iconOpacity = interpolate(
    iconGrowProgress,
    [0, 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Phase 5: Card shrink-out ──
  const shrinkStart = msToFrame(TIMING.cardShrinkOut.start, fps);
  const shrinkEnd = msToFrame(TIMING.cardShrinkOut.end, fps);

  const shrinkProgress = interpolate(
    frame,
    [shrinkStart, shrinkEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shrinkEased = easeIn(shrinkProgress);
  const exitScale = interpolate(shrinkEased, [0, 1], [1, TIMING.cardShrinkOut.scaleTo]);
  const exitOpacity = interpolate(shrinkEased, [0, 1], [1, 0]);

  // ── Combined transforms ──
  const combinedScale = cardScale * exitScale;
  const combinedOpacity = cardOpacity * exitOpacity;

  // Scale factor to fit artboard into composition
  const scaleX = data.width / ARTBOARD.w;
  const scaleY = data.height / ARTBOARD.h;
  const fitScale = Math.min(scaleX, scaleY);

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
        {/* Notification card — animated scale + opacity */}
        <div
          style={{
            position: "absolute",
            left: NOTIF.x,
            top: NOTIF.y,
            width: NOTIF.w,
            height: NOTIF.h,
            transform: `scale(${combinedScale})`,
            transformOrigin: "center center",
            opacity: combinedOpacity,
          }}
        >
          {/* Background rectangle with rounded corners */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: NOTIF.w,
              height: NOTIF.h,
              borderRadius: cornerRadius,
              backgroundColor: notifColor,
              opacity: notifOpacity / 100,
            }}
          />

          {/* App icon */}
          <div
            style={{
              position: "absolute",
              left: ICON.x,
              top: ICON.y,
              width: ICON.w,
              height: ICON.h,
              borderRadius: ICON.radius,
              overflow: "hidden",
              transform: `scale(${iconScale})`,
              opacity: iconOpacity,
              transformOrigin: "center center",
            }}
          >
            <Img
              src={iconSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* Timestamp — static "now" label */}
          <div
            style={{
              position: "absolute",
              left: TIMESTAMP.x,
              top: TIMESTAMP.y,
              width: TIMESTAMP.w,
              height: TIMESTAMP.h,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                fontFamily: lato.fontFamily,
                fontWeight: 400,
                fontSize: TIMESTAMP.fontSize,
                color: timestampColor,
                opacity: 0.4,
                lineHeight: 1.2,
              }}
            >
              {timestamp}
            </span>
          </div>

          {/* Title text — word-by-word slide+fade */}
          <div
            style={{
              position: "absolute",
              left: TITLE.x,
              top: TITLE.y,
              width: TITLE.w,
              height: TITLE.h,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <AnimatedTextLine
              text={data.title}
              startMs={TIMING.titleTextIn.start}
              wordOffsetMs={TIMING.titleTextIn.wordOffsetMs}
              wordDurationMs={TIMING.titleTextIn.wordDurationMs}
              travelDistance={TIMING.titleTextIn.travel}
              color={textColor}
              fontSize={TITLE.fontSize}
              fontWeight={700}
            />
          </div>

          {/* Body text — word-by-word slide+fade */}
          <div
            style={{
              position: "absolute",
              left: BODY.x,
              top: BODY.y,
              width: BODY.w,
              height: BODY.h,
              display: "flex",
              alignItems: "flex-start",
              overflow: "hidden",
            }}
          >
            <AnimatedTextLine
              text={data.body}
              startMs={TIMING.bodyTextIn.start}
              wordOffsetMs={TIMING.bodyTextIn.wordOffsetMs}
              wordDurationMs={TIMING.bodyTextIn.wordDurationMs}
              travelDistance={TIMING.bodyTextIn.travel}
              color={textColor}
              fontSize={BODY.fontSize}
              fontWeight={400}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default IOSNotification;
