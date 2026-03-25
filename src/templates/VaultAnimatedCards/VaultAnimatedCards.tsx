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
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const inter = loadInter("normal", {
  weights: ["400", "600", "700", "800", "900"],
});

// ── Types ──

interface CardConfig {
  bgColor: string;
  textColor: string;
  brand?: string;
  cardNumber?: string;
  network?: string;
  /** "credit" (default), "chart" for analytics card, or "image" for image-only card */
  type?: string;
  /** URL or staticFile path for a background image on the card */
  bgImage?: string;
  /** Object-fit for background image: "cover" (default) or "contain" */
  bgImageFit?: "cover" | "contain";
}

interface VaultAnimatedCardsData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor?: string;
  cards: CardConfig[];
  gridCols?: number;
  gridRows?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  startAngle?: number;
  tagline?: string;
  taglineBrand?: string;
  taglineColor?: string;
}

// ── Credit Card Sub-Component ──

/** Resolve image src — if it starts with http or data:, use as-is; otherwise treat as staticFile */
const resolveImageSrc = (src: string): string => {
  if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }
  return staticFile(src);
};

const CreditCard: React.FC<{
  card: CardConfig;
  w: number;
  h: number;
  r: number;
}> = ({ card, w, h, r }) => {
  if (card.type === "chart") {
    return <ChartCard w={w} h={h} r={r} />;
  }

  // Image-only card — just the image, no text overlays
  if (card.type === "image" && card.bgImage) {
    return (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: r,
          backgroundColor: card.bgColor || "#000",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        <Img
          src={resolveImageSrc(card.bgImage)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: card.bgImageFit || "cover",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: card.bgColor,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      {/* Background image (optional) — sits behind all text */}
      {card.bgImage && (
        <Img
          src={resolveImageSrc(card.bgImage)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: card.bgImageFit || "cover",
          }}
        />
      )}

      {/* Network badge — top right */}
      {card.network && (
        <div
          style={{
            position: "absolute",
            top: h * 0.08,
            right: w * 0.06,
            fontSize: h * 0.1,
            fontFamily: inter.fontFamily,
            fontWeight: 700,
            fontStyle: "italic",
            color: card.textColor,
            letterSpacing: 1,
          }}
        >
          {card.network}
        </div>
      )}

      {/* Card number dots — mid left */}
      {card.cardNumber && (
        <div
          style={{
            position: "absolute",
            top: h * 0.4,
            left: w * 0.06,
            fontSize: h * 0.06,
            fontFamily: inter.fontFamily,
            fontWeight: 400,
            color: card.textColor,
            opacity: 0.7,
            letterSpacing: 2,
          }}
        >
          ····&nbsp;&nbsp;{card.cardNumber}
        </div>
      )}

      {/* Brand name — large, bottom left */}
      {card.brand && (
        <div
          style={{
            position: "absolute",
            bottom: h * 0.06,
            left: w * 0.06,
            fontSize: h * 0.28,
            fontFamily: inter.fontFamily,
            fontWeight: 800,
            color: card.textColor,
            letterSpacing: -1,
            lineHeight: 1,
          }}
        >
          {card.brand}
        </div>
      )}
    </div>
  );
};

// ── Analytics/Chart Card ──

const ChartCard: React.FC<{ w: number; h: number; r: number }> = ({
  w,
  h,
  r,
}) => {
  const barHeights = [0.55, 0.7, 0.85, 0.6, 0.9, 0.45, 0.35];
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: "#1a1a1a",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        padding: h * 0.08,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: h * 0.06,
          fontFamily: inter.fontFamily,
          fontWeight: 400,
          color: "#888888",
          marginBottom: h * 0.02,
        }}
      >
        Total Spending
      </div>

      {/* Amount */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: w * 0.02,
          marginBottom: h * 0.06,
        }}
      >
        <span
          style={{
            fontSize: h * 0.14,
            fontFamily: inter.fontFamily,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          $489.72
        </span>
        <span
          style={{
            fontSize: h * 0.06,
            fontFamily: inter.fontFamily,
            fontWeight: 400,
            color: "#666666",
          }}
        >
          ↓ 8%
        </span>
      </div>

      {/* Bar chart */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          gap: w * 0.02,
          paddingBottom: h * 0.1,
          position: "relative",
        }}
      >
        {barHeights.map((bh, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "70%",
                height: `${bh * 100}%`,
                backgroundColor: "#333333",
                borderRadius: r * 0.3,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                fontSize: h * 0.05,
                fontFamily: inter.fontFamily,
                fontWeight: 400,
                color: "#555555",
              }}
            >
              {days[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Easing ──

const smoothEase = Easing.bezier(0.25, 0.1, 0.25, 1);

// ── Main Component ──

export const VaultAnimatedCards: React.FC<{
  data: VaultAnimatedCardsData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "#ebebeb";
  const cards = data.cards || [];
  const gridCols = data.gridCols ?? 5;
  const gridRows = data.gridRows ?? 5;
  const cardW = data.cardWidth ?? 340;
  const cardH = data.cardHeight ?? 212;
  const cardR = data.cardRadius ?? 20;
  const startAngle = data.startAngle ?? -35;
  const tagline = data.tagline || "";
  const taglineBrand = data.taglineBrand || "";
  const taglineColor = data.taglineColor || "#1a1a1a";

  if (cards.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: bgColor }} />;
  }

  const totalFrames = (data.durationMs / 1000) * fps;
  const progress = Math.min(frame / totalFrames, 1);

  // ── Animation Timeline ──
  // Phase 1 (0–45%):   Very zoomed in, steep tilt, tight gaps, per-row alternating scroll
  // Phase 2 (45–75%):  Zoom out, straighten, spread gaps, scroll to center
  // Phase 3 (75–100%): Center card fades, tagline appears and holds

  const angle = interpolate(
    progress,
    [0, 0.45, 0.75],
    [startAngle, startAngle * 0.85, 0],
    { extrapolateRight: "clamp", easing: smoothEase }
  );

  const gridScale = interpolate(
    progress,
    [0, 0.45, 0.75],
    [2.8, 2.4, 0.95],
    { extrapolateRight: "clamp", easing: smoothEase }
  );

  const gap = interpolate(
    progress,
    [0, 0.45, 0.75],
    [8, 12, 80],
    { extrapolateRight: "clamp", easing: smoothEase }
  );

  // Per-row alternating horizontal scroll:
  // Even rows (0, 2, 4) scroll RIGHT, odd rows (1, 3) scroll LEFT
  // Conveyor-belt: continuous linear motion during phase 1, then ease to 0
  const scrollSpeed = 2.2; // px per frame — fast, steady conveyor feel
  const phase1Frames = 0.45 * totalFrames;
  const rawScroll = Math.min(frame, phase1Frames) * scrollSpeed;
  const scrollBlend = interpolate(
    progress,
    [0.45, 0.65],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase }
  );
  const rowScrollAmount = progress <= 0.45
    ? rawScroll
    : rawScroll * scrollBlend;

  // Vertical drift — subtle, shared by all rows
  const scrollY = interpolate(
    progress,
    [0, 0.45, 0.75],
    [0, -50, 0],
    { extrapolateRight: "clamp", easing: smoothEase }
  );

  // Center card fade-out (makes room for tagline)
  const centerRow = Math.floor(gridRows / 2);
  const centerCol = Math.floor(gridCols / 2);
  const centerCardOpacity = interpolate(
    progress,
    [0.65, 0.78],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Tagline reveal — fades in and holds
  const taglineOpacity = interpolate(
    progress,
    [0.72, 0.82],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const taglineScale = interpolate(
    progress,
    [0.72, 0.82],
    [0.6, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.3)),
    }
  );

  // Surrounding cards blur when tagline is visible — pulls focus to center text
  const gridBlur = interpolate(
    progress,
    [0.68, 0.82],
    [0, 6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const gridDim = interpolate(
    progress,
    [0.68, 0.82],
    [1, 0.45],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // fitScale for non-1080 compositions
  const fitScale = Math.min(data.width / 1080, data.height / 1080);

  // ── Build Grid ──
  const gridItems: React.ReactNode[] = [];
  let cardIdx = 0;

  for (let row = 0; row < gridRows; row++) {
    // Alternating scroll: even rows go right (+), odd rows go left (-)
    const rowDirection = row % 2 === 0 ? 1 : -1;
    const rowOffset = rowDirection * rowScrollAmount;

    for (let col = 0; col < gridCols; col++) {
      const isCenterSlot = row === centerRow && col === centerCol;
      const card = cards[cardIdx % cards.length];
      cardIdx++;

      const x = col * (cardW + gap) + rowOffset;
      const y = row * (cardH + gap);

      const opacity = isCenterSlot ? centerCardOpacity : 1;

      gridItems.push(
        <div
          key={`${row}-${col}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: cardW,
            height: cardH,
            opacity,
            willChange: "transform, opacity",
          }}
        >
          <CreditCard card={card} w={cardW} h={cardH} r={cardR} />
        </div>
      );
    }
  }

  // Grid total dimensions (for centering)
  const gridW = gridCols * cardW + (gridCols - 1) * gap;
  const gridH = gridRows * cardH + (gridRows - 1) * gap;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {/* Card grid — rotated, scaled, scrolling; blurs when tagline appears */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: gridW,
          height: gridH,
          transform: [
            `translate(-50%, -50%)`,
            `scale(${fitScale * gridScale})`,
            `rotate(${angle}deg)`,
            `translate(0px, ${scrollY}px)`,
          ].join(" "),
          transformOrigin: "center center",
          filter: gridBlur > 0.1 ? `blur(${gridBlur}px)` : "none",
          opacity: gridDim,
        }}
      >
        {gridItems}
      </div>

      {/* Tagline — separate layer, always at viewport center */}
      {tagline && taglineOpacity > 0.01 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${fitScale * taglineScale})`,
            opacity: taglineOpacity,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontFamily: inter.fontFamily,
              fontWeight: 800,
              color: taglineColor,
              lineHeight: 1.2,
              whiteSpace: "pre-line",
              letterSpacing: -0.5,
            }}
          >
            {tagline}
          </div>
          {taglineBrand && (
            <div
              style={{
                marginTop: 14,
                fontSize: 16,
                fontFamily: inter.fontFamily,
                fontWeight: 600,
                color: taglineColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: 0.8,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  backgroundColor: taglineColor,
                  opacity: 0.2,
                }}
              />
              {taglineBrand}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

export default VaultAnimatedCards;
