/**
 * MobileShowreelFrames — Mobile gallery showreel.
 *
 * Animation sequence:
 *   1. Single small card appears centred on dark bg
 *   2. Cards fan out into a vertical 4-card grid column
 *   3. Grid holds with 4 corner dot markers
 *   4. Grid collapses back — last card remains
 *   5. That card zooms to fill the viewport
 *   6. Vertical scroll parade: each card full-screen with "/0N" label
 *
 * 30 fps · 1080×1920 default (9:16)
 */
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

// ── Types ──────────────────────────────────────────────────────────────────

export interface MobileShowreelFramesData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Background colour */
  bgColor?: string;
  /** Array of image paths (relative to public/) — 4 recommended */
  images: string[];
  /** Card border radius at thumbnail size (px) */
  cardRadius?: number;
  /** Gap between cards in grid view (px) */
  cardGap?: number;
  /** Thumbnail card width (px) */
  thumbWidth?: number;
  /** Thumbnail card height (px) */
  thumbHeight?: number;
  /** Corner dot size (px) */
  dotSize?: number;
  /** Number label font family */
  labelFont?: string;
  /** Number label font size at full-screen (px) */
  labelFontSize?: number;
  /** Duration of full-screen hold per card in ms */
  cardHoldMs?: number;
  /** Duration of scroll transition between cards in ms */
  scrollTransitionMs?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const msToFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

const resolveImg = (src: string): string => {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

// ── Main Component ─────────────────────────────────────────────────────────

export const MobileShowreelFrames: React.FC<{
  data: MobileShowreelFramesData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    bgColor = "#111111",
    images = [],
    cardRadius = 22,
    cardGap = 14,
    thumbWidth = 200,
    thumbHeight = 200,
    dotSize = 6,
    labelFont = "Neue Haas Unica W1G Bold, Helvetica Neue, Arial, sans-serif",
    labelFontSize = 48,
    cardHoldMs = 900,
    scrollTransitionMs = 500,
  } = data;

  const N = images.length;
  if (N === 0) {
    return <AbsoluteFill style={{ background: bgColor }} />;
  }

  // ── Phase timing (ms) ──
  // Phase 1: Single card appears
  const p1Start = 0;
  const p1Dur = 400;
  // Phase 2: Fan out to grid
  const p2Start = p1Start + p1Dur;
  const p2Dur = 800;
  // Phase 3: Grid hold
  const p3Start = p2Start + p2Dur;
  const p3Dur = 700;
  // Phase 4: Collapse back to single card (last card)
  const p4Start = p3Start + p3Dur;
  const p4Dur = 500;
  // Phase 5: Zoom to full-screen
  const p5Start = p4Start + p4Dur;
  const p5Dur = 600;
  // Phase 6: Scroll parade
  const p6Start = p5Start + p5Dur;

  // Convert current frame to ms
  const timeMs = (frame / fps) * 1000;

  // ── Progress helpers (0..1 within each phase) ──
  const p = (start: number, dur: number) =>
    clamp((timeMs - start) / Math.max(1, dur), 0, 1);

  const p1 = p(p1Start, p1Dur);
  const p2 = p(p2Start, p2Dur);
  const p3 = p(p3Start, p3Dur);
  const p4 = p(p4Start, p4Dur);
  const p5 = p(p5Start, p5Dur);

  // ── Grid geometry ──
  const totalGridH = N * thumbHeight + (N - 1) * cardGap;
  const gridTop = (height - totalGridH) / 2;

  // Position for each card in grid (centred horizontally)
  const gridPositions = images.map((_, i) => ({
    x: (width - thumbWidth) / 2,
    y: gridTop + i * (thumbHeight + cardGap),
    w: thumbWidth,
    h: thumbHeight,
  }));

  // Corner dot positions (around the grid, with some padding)
  const dotPad = 30;
  const gridLeft = (width - thumbWidth) / 2 - dotPad;
  const gridRight = (width + thumbWidth) / 2 + dotPad;
  const gridTopY = gridTop - dotPad;
  const gridBottomY = gridTop + totalGridH + dotPad;

  // ── Determine which animation phase we're in ──
  const inPhase1 = timeMs < p2Start;
  const inPhase2 = timeMs >= p2Start && timeMs < p3Start;
  const inPhase3 = timeMs >= p3Start && timeMs < p4Start;
  const inPhase4 = timeMs >= p4Start && timeMs < p5Start;
  const inPhase5 = timeMs >= p5Start && timeMs < p6Start;
  const inPhase6 = timeMs >= p6Start;

  // ── Phase 6: Scroll parade math ──
  // Cards scroll bottom-to-top (last card in array shown first as /01)
  const paradeDur = cardHoldMs + scrollTransitionMs;
  const paradeTimeMs = timeMs - p6Start;
  // Current card index in parade (0-based, reversed from grid)
  const paradeCardFloat = paradeTimeMs / paradeDur;
  const paradeCardIdx = clamp(Math.floor(paradeCardFloat), 0, N - 1);
  const paradeLocalMs = paradeTimeMs - paradeCardIdx * paradeDur;

  // scrollY offset: 0 = current card centred, scrolling up as transition progresses
  let paradeScrollY = 0;
  if (paradeLocalMs > cardHoldMs) {
    const scrollP = clamp(
      (paradeLocalMs - cardHoldMs) / scrollTransitionMs,
      0,
      1,
    );
    paradeScrollY = interpolate(scrollP, [0, 1], [0, -height], {
      easing: easeInOut,
    });
  }

  // ── Render helper: card at a position with size ──
  const renderCard = (
    imgIdx: number,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    opacity: number,
    label?: string,
  ) => (
    <div
      key={`card-${imgIdx}-${label || "g"}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        overflow: "hidden",
        opacity,
      }}
    >
      <Img
        src={resolveImg(images[imgIdx])}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            left: 24,
            bottom: 32,
            transform: "rotate(-90deg)",
            transformOrigin: "left bottom",
            color: "#fff",
            fontFamily: labelFont,
            fontSize: labelFontSize,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1,
            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );

  // ── Corner dots ──
  const renderDots = (opacity: number, spread: number) => {
    // spread: 0 = tight around center, 1 = full grid size
    const cx = width / 2;
    const cy = height / 2;
    const halfW = interpolate(spread, [0, 1], [thumbWidth * 0.4, (gridRight - gridLeft) / 2]);
    const halfH = interpolate(spread, [0, 1], [thumbHeight * 0.4, (gridBottomY - gridTopY) / 2]);

    const dots = [
      { x: cx - halfW, y: cy - halfH },
      { x: cx + halfW, y: cy - halfH },
      { x: cx - halfW, y: cy + halfH },
      { x: cx + halfW, y: cy + halfH },
    ];

    return dots.map((d, i) => (
      <div
        key={`dot-${i}`}
        style={{
          position: "absolute",
          left: d.x - dotSize / 2,
          top: d.y - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          background: "#fff",
          opacity,
        }}
      />
    ));
  };

  // ── Phase 6: Full-screen scroll parade ──
  if (inPhase6) {
    // Reverse order: last image in array = /01
    const reversedImages = [...images].reverse();

    return (
      <AbsoluteFill style={{ background: bgColor, overflow: "hidden" }}>
        {reversedImages.map((_, i) => {
          // Only render current card and next card
          if (i < paradeCardIdx - 1 || i > paradeCardIdx + 1) return null;

          const offsetY = (i - paradeCardIdx) * height + paradeScrollY;
          const num = String(i + 1).padStart(2, "0");
          const originalIdx = N - 1 - i; // Map back to original array index

          return renderCard(
            originalIdx,
            0,
            offsetY,
            width,
            height,
            0,
            1,
            `/${num}`,
          );
        })}
      </AbsoluteFill>
    );
  }

  // ── Phases 1–5: Grid animation ──

  // Compute per-card animation state
  const cards = images.map((_, i) => {
    const gp = gridPositions[i];
    const centerX = (width - thumbWidth) / 2;
    const centerY = (height - thumbHeight) / 2;
    const isLastCard = i === N - 1;

    // Phase 1: All cards start at centre, only last card visible
    // scale from 0.3 to 0.5 of thumb size
    let x = centerX;
    let y = centerY;
    let w = thumbWidth;
    let h = thumbHeight;
    let opacity = 0;
    let radius = cardRadius;
    let scale = 0.3;

    if (inPhase1) {
      // Only the last card is visible, growing from tiny
      if (isLastCard) {
        scale = interpolate(easeOut(p1), [0, 1], [0.2, 0.5]);
        opacity = interpolate(p1, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
      }
      x = centerX;
      y = centerY;
    }

    if (inPhase2) {
      // Fan out: cards emerge from behind the last card and move to their grid position
      // Stagger: last card moves first (it's already visible), others appear with delay
      const stagger = isLastCard ? 0 : (N - 1 - i) * 0.15;
      const cardP = clamp((p2 - stagger) / (1 - stagger), 0, 1);
      const easedP = easeOut(cardP);

      x = interpolate(easedP, [0, 1], [centerX, gp.x]);
      y = interpolate(easedP, [0, 1], [centerY, gp.y]);
      scale = interpolate(easedP, [0, 1], [0.5, 1]);
      opacity = isLastCard ? 1 : interpolate(cardP, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });
      radius = cardRadius;
    }

    if (inPhase3) {
      // Grid hold — all cards at final grid positions
      x = gp.x;
      y = gp.y;
      scale = 1;
      opacity = 1;
      radius = cardRadius;
    }

    if (inPhase4) {
      // Collapse back: all cards move to centre, non-last cards fade out
      const easedP4 = easeInOut(p4);
      x = interpolate(easedP4, [0, 1], [gp.x, centerX]);
      y = interpolate(easedP4, [0, 1], [gp.y, centerY]);
      scale = interpolate(easedP4, [0, 1], [1, 0.6]);
      opacity = isLastCard ? 1 : interpolate(p4, [0, 0.6], [1, 0], { extrapolateRight: "clamp" });
      radius = cardRadius;
    }

    if (inPhase5) {
      // Zoom last card to fill viewport
      if (isLastCard) {
        const easedP5 = easeInOut(p5);
        // Scale from thumb at centre to full viewport
        const targetW = width;
        const targetH = height;
        w = interpolate(easedP5, [0, 1], [thumbWidth * 0.6, targetW]);
        h = interpolate(easedP5, [0, 1], [thumbHeight * 0.6, targetH]);
        x = interpolate(easedP5, [0, 1], [centerX, 0]);
        y = interpolate(easedP5, [0, 1], [centerY, 0]);
        scale = 1; // size is now handled by w/h
        radius = interpolate(easedP5, [0, 1], [cardRadius, 0]);
        opacity = 1;
      } else {
        opacity = 0;
      }
    }

    return { i, x, y, w, h, scale, opacity, radius };
  });

  // Dot visibility & spread
  let dotOpacity = 0;
  let dotSpread = 0;

  if (inPhase1) {
    dotOpacity = interpolate(p1, [0.4, 1], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    dotSpread = 0;
  }
  if (inPhase2) {
    dotOpacity = 0.9;
    dotSpread = easeOut(p2);
  }
  if (inPhase3) {
    dotOpacity = 0.9;
    dotSpread = 1;
  }
  if (inPhase4) {
    dotOpacity = interpolate(p4, [0, 0.5], [0.9, 0], { extrapolateRight: "clamp" });
    dotSpread = interpolate(easeInOut(p4), [0, 1], [1, 0]);
  }
  if (inPhase5) {
    dotOpacity = 0;
  }

  // Number label for phase 5 (appears as card reaches full-screen)
  const showP5Label = inPhase5 && p5 > 0.7;

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {/* Render cards in order (last card on top) */}
      {cards.map((c) => {
        if (c.opacity <= 0) return null;

        const actualW = (inPhase5 || false) ? c.w : thumbWidth;
        const actualH = (inPhase5 || false) ? c.h : thumbHeight;

        return (
          <div
            key={`card-${c.i}`}
            style={{
              position: "absolute",
              left: inPhase5 ? c.x : c.x + (thumbWidth * (1 - c.scale)) / 2,
              top: inPhase5 ? c.y : c.y + (thumbHeight * (1 - c.scale)) / 2,
              width: inPhase5 ? c.w : thumbWidth * c.scale,
              height: inPhase5 ? c.h : thumbHeight * c.scale,
              borderRadius: c.radius,
              overflow: "hidden",
              opacity: c.opacity,
            }}
          >
            <Img
              src={resolveImg(images[c.i])}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Number label during phase 5 zoom */}
            {showP5Label && c.i === N - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  bottom: 32,
                  transform: "rotate(-90deg)",
                  transformOrigin: "left bottom",
                  color: "#fff",
                  fontFamily: labelFont,
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  letterSpacing: -1,
                  lineHeight: 1,
                  opacity: interpolate(p5, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                /01
              </div>
            )}
          </div>
        );
      })}

      {/* Corner dots */}
      {dotOpacity > 0 && renderDots(dotOpacity, dotSpread)}
    </AbsoluteFill>
  );
};
