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

export interface LogoBounceConfig {
  startX: number;
  startY: number;
  /** Pixels per millisecond — horizontal speed */
  velocityX: number;
  /** Pixels per millisecond — vertical speed */
  velocityY: number;
  /** Approximate badge width for wall collision */
  badgeWidth: number;
  /** Approximate badge height for wall collision */
  badgeHeight: number;
  /** Max rotation tilt in degrees when bouncing */
  rotationAmount: number;
}

export interface CardItem {
  /** "card" = full design card with chrome; "photo" = just a rounded image */
  type: "card" | "photo";
  image: string;
  /** Only used when type === "card" */
  dimensions: string;
  /** Only used when type === "card" */
  categories: string[];
  /** Only used when type === "card" – portrait cards have taller images */
  isPortrait: boolean;
  /** Fixed position (top-left anchor) */
  x: number;
  y: number;
  /** Fixed rotation in degrees */
  rotation: number;
  /** When this item pops in (ms) */
  enterMs: number;
  /** How long this item stays visible (ms) */
  holdMs: number;
}

export interface DesignPreviewData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  logoText: string;
  logoBgColor: string;
  logoTextColor: string;
  logoBounce: LogoBounceConfig;
  cardWidth: number;
  photoSize: number;
  cardBorderRadius: number;
  pillActiveColor: string;
  pillInactiveColor: string;
  pillTextColor: string;
  pillActiveTextColor: string;
  dimensionFont: string;
  dimensionFontSize: number;
  dimensionFontWeight: number;
  /** Duration of scale-in / scale-out animation in ms */
  scaleDurationMs: number;
  items: CardItem[];
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

/**
 * Deterministic wall-bouncing simulation.
 * Given a start position, velocity, and bounding box, computes exact position
 * at any time using reflection. Fully dynamic — adapts to any canvas size.
 */
function bounceSim(
  timeMs: number,
  startPos: number,
  velocity: number,
  minBound: number,
  maxBound: number
): { pos: number; direction: number } {
  const range = maxBound - minBound;
  if (range <= 0) return { pos: startPos, direction: 1 };

  // Total distance traveled
  const dist = velocity * timeMs;
  // Position within the range (offset from minBound)
  const offset = startPos - minBound + dist;

  // Use modular arithmetic with reflection (triangle wave)
  // Period = 2 * range (go forward then bounce back)
  const period = 2 * range;
  let phase = ((offset % period) + period) % period; // always positive

  let pos: number;
  let direction: number;
  if (phase <= range) {
    pos = minBound + phase;
    direction = 1;
  } else {
    pos = minBound + (period - phase);
    direction = -1;
  }

  return { pos, direction: velocity >= 0 ? direction : -direction };
}

/**
 * Compute scale for a card item based on current time.
 * Pops in (0→1) over `scaleDur` ms, holds at 1, shrinks out (1→0) over `scaleDur` ms.
 */
function getItemScale(
  timeMs: number,
  enterMs: number,
  holdMs: number,
  scaleDur: number
): number {
  const exitMs = enterMs + holdMs;
  const enterEnd = enterMs + scaleDur;
  const exitStart = exitMs - scaleDur;

  if (timeMs < enterMs) return 0;
  if (timeMs > exitMs) return 0;

  // Entry: scale 0 → 1
  if (timeMs < enterEnd) {
    return interpolate(timeMs, [enterMs, enterEnd], [0, 1], {
      ...CL,
      easing: Easing.out(Easing.back(1.4)),
    });
  }

  // Exit: scale 1 → 0
  if (timeMs > exitStart) {
    return interpolate(timeMs, [exitStart, exitMs], [1, 0], {
      ...CL,
      easing: Easing.in(Easing.cubic),
    });
  }

  // Hold
  return 1;
}

// ── Logo Badge ──

const LogoBadge: React.FC<{
  text: string;
  bgColor: string;
  textColor: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}> = ({ text, bgColor, textColor, x, y, rotation, scale, opacity }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `rotate(${rotation}deg) scale(${scale})`,
      transformOrigin: "center center",
      opacity,
      backgroundColor: bgColor,
      borderRadius: 20,
      padding: "24px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      zIndex: 100,
    }}
  >
    <span
      style={{
        fontFamily: "Inter, Helvetica Neue, Arial, sans-serif",
        fontWeight: 800,
        fontSize: 48,
        color: textColor,
        letterSpacing: -2,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  </div>
);

// ── Design Card (full chrome) ──

const DesignCard: React.FC<{
  item: CardItem;
  data: DesignPreviewData;
  scale: number;
}> = ({ item, data, scale }) => {
  const cardW = data.cardWidth;
  const imgH = item.isPortrait ? cardW * 1.5 : cardW * 0.7;

  return (
    <div
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: cardW,
        transform: `rotate(${item.rotation}deg) scale(${scale})`,
        transformOrigin: "center center",
        backgroundColor: "#ffffff",
        borderRadius: data.cardBorderRadius,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      }}
    >
      {/* Thumbnail image */}
      <div
        style={{
          width: cardW,
          height: imgH,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Img
          src={resolveImg(item.image)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Small logo icon top-right */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path
              d="M2 18L8 4L14 12L18 6L26 18"
              stroke="#222423"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Dimensions text */}
      <div style={{ padding: "16px 20px 8px 20px", textAlign: "center" }}>
        <span
          style={{
            fontFamily: data.dimensionFont,
            fontWeight: data.dimensionFontWeight,
            fontSize: data.dimensionFontSize,
            color: "#222423",
            letterSpacing: -1,
          }}
        >
          {item.dimensions}
        </span>
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          padding: "0 20px 20px 20px",
        }}
      >
        {item.categories.map((cat, i) => (
          <div
            key={cat}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              backgroundColor:
                i === 0 ? data.pillActiveColor : data.pillInactiveColor,
              color:
                i === 0 ? data.pillActiveTextColor : data.pillTextColor,
              fontFamily: data.dimensionFont,
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Photo Image (no chrome) ──

const PhotoImage: React.FC<{
  item: CardItem;
  data: DesignPreviewData;
  scale: number;
}> = ({ item, data, scale }) => {
  const size = data.photoSize;

  return (
    <div
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: size,
        height: size,
        transform: `rotate(${item.rotation}deg) scale(${scale})`,
        transformOrigin: "center center",
        borderRadius: data.cardBorderRadius,
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      }}
    >
      <Img
        src={resolveImg(item.image)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

// ── Main Component ──

export const DesignPreview: React.FC<{ data: DesignPreviewData }> = ({
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  // ── Wall-bouncing logo ──
  // Uses the actual canvas width/height so it adapts to any aspect ratio
  const bounce = data.logoBounce;
  const bw = bounce.badgeWidth;
  const bh = bounce.badgeHeight;

  const xSim = bounceSim(timeMs, bounce.startX, bounce.velocityX, 0, width - bw);
  const ySim = bounceSim(timeMs, bounce.startY, bounce.velocityY, 0, height - bh);

  const logoX = xSim.pos;
  const logoY = ySim.pos;
  // No rotation — badge stays straight and steady
  const logoRot = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: data.bgColor,
        overflow: "hidden",
      }}
    >
      {/* Render items (cards + photos) — fixed positions, scale in/out only */}
      {data.items.map((item, i) => {
        const exitMs = item.enterMs + item.holdMs;
        // Skip if outside visible window (with buffer for scale animation)
        if (timeMs < item.enterMs - 50 || timeMs > exitMs + 50) return null;

        const scale = getItemScale(
          timeMs,
          item.enterMs,
          item.holdMs,
          data.scaleDurationMs
        );
        if (scale <= 0) return null;

        if (item.type === "photo") {
          return (
            <PhotoImage key={i} item={item} data={data} scale={scale} />
          );
        }

        return (
          <DesignCard key={i} item={item} data={data} scale={scale} />
        );
      })}

      {/* Logo badge — bounces wall to wall, adapts to canvas size */}
      <LogoBadge
        text={data.logoText}
        bgColor={data.logoBgColor}
        textColor={data.logoTextColor}
        x={logoX}
        y={logoY}
        rotation={logoRot}
        scale={1}
        opacity={1}
      />
    </AbsoluteFill>
  );
};
