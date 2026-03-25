/**
 * WhiteSocialHandle — Animated social-handle badge.
 *
 * A white rounded pill scales in as a small circle, then expands to reveal
 * an icon and a text handle with per-letter fade-in.
 *
 * Based on a Jitter export: 456×160, 4 000 ms.
 *
 * Animation timeline (from the Jitter operationsTree):
 *   0–300 ms   Badge group grows in (scale 0 → 1) — starts as small circle
 *  100–400 ms  Icon grows in (scale 0 → 1)
 *  310–910 ms  Pill rectangle resizes width 120 → 416
 *              Icon slides right→left (offset 148 → 0)
 *              Text slides left→right (offset -148 → 0)
 *  410 ms+     Text letters fade in (backward order, slight upward slide)
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

export interface WhiteSocialHandleData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** The handle / username text */
  handleText?: string;
  /** Icon image path (relative to public/) — square, will be clipped round */
  iconImage?: string;
  /** Pill fill colour */
  pillColor?: string;
  /** Pill fill opacity (0–100) */
  pillOpacity?: number;
  /** Text colour */
  textColor?: string;
  /** Corner radius of the pill */
  pillRadius?: number;
  /** Font size in px */
  fontSize?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function msToFrame(ms: number, fps: number) {
  return Math.round((ms / 1000) * fps);
}

const resolveImg = (src: string): string => {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return staticFile(src);
};

/** Jitter "natural" easing ≈ cubic-bezier(0.4, 0, 0.2, 1) */
const natural = Easing.bezier(0.4, 0, 0.2, 1);

/** Jitter "slowDown" easing */
const slowDown = Easing.bezier(0, 0, 0.2, 1);

// ── Main component ─────────────────────────────────────────────────────────

export const WhiteSocialHandle: React.FC<{
  data: WhiteSocialHandleData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    width: W,
    height: H,
    handleText = "jitter.video",
    iconImage = "",
    pillColor = "#ffffff",
    pillOpacity = 80,
    textColor = "#666666",
    pillRadius = 40,
    fontSize = 48,
  } = data;

  // Derived layout (from Jitter layer positions)
  const pad = 20; // Badge inset from artboard edges
  const badgeH = H - pad * 2; // 120
  const fullBadgeW = W - pad * 2; // 416
  const iconSize = badgeH - 40; // ~80
  const iconPad = 20; // inside badge

  // ── Animation progress values ──

  // 1. Badge group grow-in: 0–300 ms (scale 0→1, slowDown)
  const badgeScale = interpolate(
    frame,
    [msToFrame(0, fps), msToFrame(300, fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: slowDown }
  );

  // 2. Icon grow-in: 100–400 ms (scale 0→1, natural)
  const iconScale = interpolate(
    frame,
    [msToFrame(100, fps), msToFrame(400, fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: natural }
  );

  // 3. Pill resize: width 120→416 over 310–910 ms (natural)
  const pillW = interpolate(
    frame,
    [msToFrame(310, fps), msToFrame(910, fps)],
    [badgeH, fullBadgeW], // starts as circle (120×120) → full width
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: natural }
  );

  // 4. Icon move: offset 148→0 over 310–910 ms (natural)
  //    When the pill is a circle the icon sits centred; as it expands
  //    the icon slides to its final left position.
  const iconOffsetX = interpolate(
    frame,
    [msToFrame(310, fps), msToFrame(910, fps)],
    [148, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: natural }
  );

  // 5. Text move: offset -148→0 over 310–910 ms (natural)
  const textOffsetX = interpolate(
    frame,
    [msToFrame(310, fps), msToFrame(910, fps)],
    [-148, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: natural }
  );

  // 6. Text opacity (don't show until pill starts expanding)
  const textMasterOpacity = interpolate(
    frame,
    [msToFrame(380, fps), msToFrame(500, fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Per-letter fade-in (backward order, slight upward slide) ──
  // Starts at 410 ms; each letter takes 200 ms; offset between letters 50 ms;
  // backward order = last letter animates first.
  const letters = handleText.split("");
  const letterStartMs = 410;
  const letterDuration = 200;
  const letterOffset = 50;

  const letterAnimations = letters.map((_, i) => {
    // backward order: last letter starts first
    const reverseIndex = letters.length - 1 - i;
    const startMs = letterStartMs + reverseIndex * letterOffset;
    const endMs = startMs + letterDuration;

    const opacity = interpolate(
      frame,
      [msToFrame(startMs, fps), msToFrame(endMs, fps)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    const translateY = interpolate(
      frame,
      [msToFrame(startMs, fps), msToFrame(endMs, fps)],
      [20, 0], // travelDistance: 20, slideDirection: up
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    const scale = interpolate(
      frame,
      [msToFrame(startMs, fps), msToFrame(endMs, fps)],
      [1.2, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return { opacity, translateY, scale };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Badge group — scales in from 0 */}
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: fullBadgeW,
          height: badgeH,
          transform: `scale(${badgeScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Pill background — resizes width, centred */}
        <div
          style={{
            position: "absolute",
            left: (fullBadgeW - pillW) / 2,
            top: 0,
            width: pillW,
            height: badgeH,
            borderRadius: pillRadius,
            backgroundColor: pillColor,
            opacity: pillOpacity / 100,
          }}
        />

        {/* Icon — grows in, then slides to final position */}
        <div
          style={{
            position: "absolute",
            left: iconPad + iconOffsetX,
            top: iconPad,
            width: iconSize,
            height: iconSize,
            borderRadius: iconImage ? iconSize / 2 : 0,
            overflow: iconImage ? "hidden" : "visible",
            transform: `scale(${iconScale})`,
            transformOrigin: "center center",
          }}
        >
          {iconImage ? (
            <Img
              src={resolveImg(iconImage)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            /* Default Instagram logo */
            <svg
              viewBox="0 0 132 132"
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75" />
                  <stop offset="20%" stopColor="#fa7e1e" />
                  <stop offset="40%" stopColor="#d62976" />
                  <stop offset="60%" stopColor="#962fbf" />
                  <stop offset="100%" stopColor="#4f5bd5" />
                </linearGradient>
              </defs>
              {/* Rounded square background */}
              <rect
                x="4"
                y="4"
                width="124"
                height="124"
                rx="32"
                ry="32"
                fill="url(#ig-grad)"
              />
              {/* Inner rounded square outline */}
              <rect
                x="18"
                y="18"
                width="96"
                height="96"
                rx="22"
                ry="22"
                fill="none"
                stroke="#ffffff"
                strokeWidth="8"
              />
              {/* Center circle (lens) */}
              <circle
                cx="66"
                cy="66"
                r="23"
                fill="none"
                stroke="#ffffff"
                strokeWidth="8"
              />
              {/* Flash dot (top-right) */}
              <circle cx="96" cy="36" r="7" fill="#ffffff" />
            </svg>
          )}
        </div>

        {/* Handle text — slides in, per-letter fade */}
        <div
          style={{
            position: "absolute",
            left: iconPad + iconSize + iconPad + textOffsetX,
            top: 0,
            height: badgeH,
            display: "flex",
            alignItems: "center",
            opacity: textMasterOpacity,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              fontFamily: "Inter, Helvetica, Arial, sans-serif",
              fontWeight: 700,
              fontSize,
              color: textColor,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {letters.map((char, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: letterAnimations[i].opacity,
                  transform: `translateY(${letterAnimations[i].translateY}px) scale(${letterAnimations[i].scale})`,
                  transformOrigin: "center bottom",
                }}
              >
                {char}
              </span>
            ))}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
