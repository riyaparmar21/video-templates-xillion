import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

const manrope = loadManrope("normal", {
  weights: ["400", "800"],
});

// ── Types ──

interface CardSpec {
  bgColor: string;
  textColor: string;
  brand: string;
  cardNumber?: string;
  network?: string;
}

interface VaultCardFeaturesData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgGradientStart: string;
  bgGradientEnd: string;
  featureWords: string[];
  subtitle: string;
  poweredByBrand: string;
  cards: CardSpec[];
  wordFontSize?: number;
  wordLineHeight?: number;
}

// ── Smooth easing (Jitter "smooth:standard:v1" at intensity 50) ──
const smoothEase = Easing.bezier(0.4, 0, 0.2, 1);

// ── Credit Card Sub-Component ──
const CreditCard: React.FC<{
  card: CardSpec;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  x: number;
  y: number;
}> = ({ card, w, h, rotation, opacity, x, y }) => {
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        width: w,
        height: h,
        borderRadius: 20,
        backgroundColor: card.bgColor,
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
        opacity,
        // Shadow concentrated on the lower side for depth
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.35), 0 20px 40px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.10)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 24,
      }}
    >
      {/* Card number dots + last 4 */}
      {card.cardNumber && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: manrope.fontFamily,
            fontSize: 16,
            fontWeight: 400,
            color: card.textColor,
            letterSpacing: 2,
            opacity: 0.8,
          }}
        >
          <span>····</span>
          <span>{card.cardNumber}</span>
        </div>
      )}

      {/* Network badge (top-right) */}
      {card.network && (
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 20,
            fontFamily: manrope.fontFamily,
            fontSize: 16,
            fontWeight: 800,
            color: card.textColor,
            letterSpacing: 1,
            fontStyle: "italic",
          }}
        >
          {card.network}
        </div>
      )}

      {/* Brand name (large, bottom) */}
      <div
        style={{
          fontFamily: manrope.fontFamily,
          fontSize: 42,
          fontWeight: 800,
          color: card.textColor,
          lineHeight: 1,
        }}
      >
        {card.brand}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────
// Card animation helper
// Progressive tilt: 0° → peakTilt → 0°
// Cards enter from BELOW, exit UPWARD
// ──────────────────────────────────────────────────────────
function cardAnim(
  ms: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
  peakTilt: number,
) {
  const enterY = interpolate(
    ms,
    [enterStart, enterEnd],
    [1350, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );
  const exitY = interpolate(
    ms,
    [exitStart, exitEnd],
    [0, -1350],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );

  let y: number;
  if (ms < enterEnd) y = enterY;
  else if (ms < exitStart) y = 0;
  else y = exitY;

  const enterRot = interpolate(
    ms,
    [enterStart, enterEnd],
    [0, peakTilt],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );
  const exitRot = interpolate(
    ms,
    [exitStart, exitEnd],
    [peakTilt, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );

  let rot: number;
  if (ms < enterEnd) rot = enterRot;
  else if (ms < exitStart) rot = peakTilt;
  else rot = exitRot;

  const op = interpolate(
    ms,
    [enterStart, enterStart + 80, exitEnd - 80, exitEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return { y, rot, op };
}

// ──────────────────────────────────────────────────────────
// Word batch animation helper
// Word batches enter from ABOVE (opposite to cards), exit DOWNWARD
// ──────────────────────────────────────────────────────────
function batchAnim(
  ms: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
) {
  // Enter: from above (-1350) → centre (0) — slides DOWN into view
  const enterY = interpolate(
    ms,
    [enterStart, enterEnd],
    [-1350, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );
  // Exit: centre (0) → below (+1350) — slides DOWN out of view
  const exitY = interpolate(
    ms,
    [exitStart, exitEnd],
    [0, 1350],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );

  let y: number;
  if (ms < enterEnd) y = enterY;
  else if (ms < exitStart) y = 0;
  else y = exitY;

  const op = interpolate(
    ms,
    [enterStart, enterStart + 100, exitEnd - 100, exitEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return { y, op };
}

// ── Main Component ──

export const VaultCardFeatures: React.FC<{
  data: VaultCardFeaturesData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    bgGradientStart = "#ebedef",
    bgGradientEnd = "#c9c9cb",
    featureWords = [],
    cards = [],
    wordFontSize = 160,
    wordLineHeight = 192,
  } = data;

  const totalDurationMs = data.durationMs || 3750;
  const ms = (frame / fps) * 1000;

  // ── Fit scale ──
  const fitScale = Math.min(width / 1080, height / 1350);
  const CW = 1080;
  const CH = 1350;

  // ── Card defaults ──
  const card0 = cards[0] || { bgColor: "#0000c7", textColor: "#ffffff", brand: "Acme", cardNumber: "3346", network: "VISA" };
  const card1 = cards[1] || { bgColor: "#c8e6ff", textColor: "#0000c7", brand: "Acme", cardNumber: "3346", network: "VISA" };
  const card2 = cards[2] || { bgColor: "#1a1a1a", textColor: "#ffffff", brand: "Acme", cardNumber: "3346", network: "VISA" };

  const cardW = 430 * fitScale;
  const cardH = 268 * fitScale;

  // ──────────────────────────────────────────
  //  WORD BATCHES
  //
  //  Split 20 feature words into 3 batches (~7 each).
  //  Each batch is tied to a card phase:
  //    Batch 0 → Blue card
  //    Batch 1 → Light card
  //    Batch 2 → Dark card
  //
  //  Words arranged vertically with a gap in the
  //  middle where the card sits. ~3 words above
  //  the card centre, ~4 words below.
  //
  //  Batches enter from ABOVE (slide down into view)
  //  and exit DOWNWARD (slide further down out of view),
  //  opposite to cards which enter from below & exit up.
  // ──────────────────────────────────────────

  // Split words into 3 overlapping batches of 8.
  // Each batch takes 8 consecutive words from the list,
  // cycling back to the start when needed. This ensures
  // every batch fills the viewport edge-to-edge.
  const WORDS_PER_BATCH = 8;
  const wLen = featureWords.length;
  const makeBatch = (startIdx: number) => {
    const batch: string[] = [];
    for (let i = 0; i < WORDS_PER_BATCH; i++) {
      batch.push(featureWords[(startIdx + i) % wLen]);
    }
    return batch;
  };
  const wordBatches = [
    makeBatch(0),                         // Cards → Wallet
    makeBatch(Math.floor(wLen / 3)),      // Analytics → Statements
    makeBatch(Math.floor((wLen * 2) / 3)), // Loans → People
  ];

  // ──────────────────────────────────────────
  //  CARD + BATCH TIMING
  //
  //  Timeline (3750ms, 3 cards):
  //    0–400ms:      TRANSITION: blue exits up, light enters from below
  //                  + batch0 exits down, batch1 enters from above
  //    400–1250ms:   HOLD: light card + batch1 paused at centre
  //    1250–1650ms:  TRANSITION: light exits up, dark enters from below
  //                  + batch1 exits down, batch2 enters from above
  //    1650–2500ms:  HOLD: dark card + batch2 paused at centre
  //    2500–2900ms:  TRANSITION: dark exits up, blue enters from below
  //                  + batch2 exits down, batch0 enters from above
  //    2900–3750ms:  HOLD: blue card + batch0 paused at centre → loops
  // ──────────────────────────────────────────

  const TRANS = 400;

  // ── Card animations ──
  // Card 0 (Blue): Phase A exit, Phase B re-enter
  const c0a = cardAnim(ms, -1000, -TRANS, 0, TRANS, -15);
  const c0b = cardAnim(ms, 2500, 2500 + TRANS, totalDurationMs + 500, totalDurationMs + 900, -15);
  const c0blend = ms < 1250;
  const c0y = c0blend ? c0a.y : c0b.y;
  const c0rot = c0blend ? c0a.rot : c0b.rot;
  const c0op = c0blend ? c0a.op : c0b.op;

  // Card 1 (Light)
  const c1 = cardAnim(ms, 0, TRANS, 1250, 1250 + TRANS, 15);

  // Card 2 (Dark)
  const c2 = cardAnim(ms, 1250, 1250 + TRANS, 2500, 2500 + TRANS, -15);

  // ── Word batch animations ──
  // Batch 0 (Blue card words): Phase A exit, Phase B re-enter
  const b0a = batchAnim(ms, -1000, -TRANS, 0, TRANS);
  const b0b = batchAnim(ms, 2500, 2500 + TRANS, totalDurationMs + 500, totalDurationMs + 900);
  const b0y = c0blend ? b0a.y : b0b.y;
  const b0op = c0blend ? b0a.op : b0b.op;

  // Batch 1 (Light card words)
  const b1 = batchAnim(ms, 0, TRANS, 1250, 1250 + TRANS);

  // Batch 2 (Dark card words)
  const b2 = batchAnim(ms, 1250, 1250 + TRANS, 2500, 2500 + TRANS);

  // ── Render a word batch ──
  // Words are stacked CONTINUOUSLY with NO gap.
  // The card simply overlays on top. Words fill the
  // full viewport height, centred vertically so some
  // words peek above/below the viewport edges.
  const renderBatch = (
    words: string[],
    yOffset: number,
    opacity: number,
    key: string,
  ) => {
    if (opacity <= 0) return null;

    // Centre the word column vertically in the viewport
    const totalH = words.length * wordLineHeight;
    const startY = (CH - totalH) / 2;

    return (
      <div
        key={key}
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${yOffset}px)`,
          opacity,
        }}
      >
        {words.map((word, i) => (
          <div
            key={`w-${i}`}
            style={{
              position: "absolute",
              top: startY + i * wordLineHeight,
              left: 0,
              width: CW,
              height: wordLineHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: manrope.fontFamily,
              fontSize: wordFontSize * 0.8,
              fontWeight: 800,
              color: "#444444",
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: -2,
              userSelect: "none",
            }}
          >
            {word}
          </div>
        ))}
      </div>
    );
  };

  // Card center position
  const cx = CW / 2 - cardW / 2;
  const cy = CH / 2 - cardH / 2;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${bgGradientStart} 0%, ${bgGradientEnd} 100%)`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: CW,
          height: CH,
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
          overflow: "hidden",
        }}
      >
        {/* ── Layer 1: Word batches ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          {renderBatch(wordBatches[0], b0y, b0op, "batch0")}
          {renderBatch(wordBatches[1], b1.y, b1.op, "batch1")}
          {renderBatch(wordBatches[2], b2.y, b2.op, "batch2")}
        </div>

        {/* ── Layer 2: Credit Cards ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
          {/* Card 0 — Blue */}
          <CreditCard
            card={card0}
            w={cardW}
            h={cardH}
            rotation={c0rot}
            opacity={c0op}
            x={cx}
            y={cy + c0y * fitScale}
          />

          {/* Card 1 — Light */}
          <CreditCard
            card={card1}
            w={cardW}
            h={cardH}
            rotation={c1.rot}
            opacity={c1.op}
            x={cx}
            y={cy + c1.y * fitScale}
          />

          {/* Card 2 — Dark */}
          <CreditCard
            card={card2}
            w={cardW}
            h={cardH}
            rotation={c2.rot}
            opacity={c2.op}
            x={cx}
            y={cy + c2.y * fitScale}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
