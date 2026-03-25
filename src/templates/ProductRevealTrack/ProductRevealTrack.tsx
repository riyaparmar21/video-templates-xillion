/**
 * ProductRevealTrack — 3-sequence product reveal for track/running gear.
 *
 * Sequence 01 (0 – ~2200ms): White bg, concentric running-track / stadium
 *   outlines morph from circular-oval to full elongated stadium shape.
 *   A JL-style logo mark sits in the centre.
 * Sequence 02 (~2200 – ~4400ms): Dark atmospheric bg (red/maroon), product
 *   shoe floating centre, concentric track ovals behind, large geometric
 *   "CO2" text, "acme" brand, corner grid-dot markers, small tagline text.
 * Sequence 03 (~4400 – 6620ms): White bg, track outlines expand outward,
 *   bottom-centre row: logo mark + "RACING SHOES DESIGNED & ENGINEERED IN
 *   ITALY" + brand name.  Grid dots at corners/midpoints.
 *
 * 1080×1350, 6620 ms, 30 fps.
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

export interface ProductRevealTrackData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Product image path (relative to public/) */
  productImage: string;
  /** Background image path for Seq 02 (relative to public/) — dark terrain */
  bgImage?: string;
  /** Brand name — e.g. "acme" */
  brandName?: string;
  /** Large hero text on Seq 02 — e.g. "CO2" */
  heroLabel?: string;
  /** Small date/year text — e.g. "20\n25" */
  dateText?: string;
  /** Small tagline bottom-right of Seq 02 — e.g. "designed & crafted\nin ITALY" */
  craftedText?: string;
  /** Full bottom tagline for Seq 03 */
  bottomTagline?: string;
  /** Dark background colour for Seq 02 */
  darkBg?: string;
  /** Number of concentric track lanes */
  laneCount?: number;
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

const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);
const smooth = Easing.bezier(0.4, 0, 0.2, 1);
const slowdown = Easing.bezier(0, 0, 0.2, 1);

// ── Sub-components ─────────────────────────────────────────────────────────

/**
 * Concentric running-track (stadium) outlines.
 *
 * `elongation` 0 → circular-oval, 1 → full elongated stadium.
 * `scaleOut` grows the whole set outward (used in Seq 03 reveal).
 */
const TrackLanes: React.FC<{
  cx: number;
  cy: number;
  baseW: number;
  baseH: number;
  lanes: number;
  strokeColor: string;
  strokeWidth?: number;
  elongation: number;
  scaleOut?: number;
  opacity?: number;
}> = ({
  cx,
  cy,
  baseW,
  baseH,
  lanes,
  strokeColor,
  strokeWidth = 1.2,
  elongation,
  scaleOut = 1,
  opacity = 1,
}) => {
  const gap = 14;
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        opacity,
      }}
      viewBox={`0 0 ${baseW} ${baseH}`}
    >
      {Array.from({ length: lanes }).map((_, i) => {
        const offset = i * gap * scaleOut;
        // rx grows with elongation; ry stays proportional
        const ovalW = 220 + offset;
        const ovalH = 300 + offset;
        // elongated stadium: wider with flat tops
        const stadW = 340 + offset;
        const stadH = 480 + offset;

        const w = interpolate(elongation, [0, 1], [ovalW, stadW]);
        const h = interpolate(elongation, [0, 1], [ovalH, stadH]);
        const rx = w / 2;
        const ry = Math.min(rx, w / 2); // full round ends

        return (
          <rect
            key={i}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </svg>
  );
};

/**
 * JL-style logo mark — two mirrored bracket / corner shapes.
 *
 * Left bracket = ┘ rotated, right bracket = └ rotated.
 * Built from thick strokes that form an open-bottom "J" and "L" pair.
 */
const JLLogoMark: React.FC<{
  size: number;
  color: string;
  gap?: number;
}> = ({ size, color, gap = 0.08 }) => {
  const half = size / 2;
  const thick = size * 0.16;
  const armLen = size * 0.42;
  const cornerR = thick * 0.6;
  const gapPx = size * gap;

  const bracketStyle: React.CSSProperties = {
    position: "absolute",
    width: armLen,
    height: armLen,
    borderColor: color,
    borderStyle: "solid",
    borderWidth: thick,
    boxSizing: "border-box",
  };

  return (
    <div style={{ width: size, height: size * 0.55, position: "relative" }}>
      {/* Left bracket — bottom-right corner shape (┘) */}
      <div
        style={{
          ...bracketStyle,
          right: half + gapPx / 2,
          bottom: 0,
          borderTop: "none",
          borderLeft: "none",
          borderBottomRightRadius: cornerR,
        }}
      />
      {/* Right bracket — bottom-left corner shape (└) */}
      <div
        style={{
          ...bracketStyle,
          left: half + gapPx / 2,
          bottom: 0,
          borderTop: "none",
          borderRight: "none",
          borderBottomLeftRadius: cornerR,
        }}
      />
      {/* Small horizontal bar connecting tops — visible in middle frames */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: half - armLen + thick - gapPx / 2,
          width: (armLen - thick) * 2 + gapPx,
          height: thick,
          backgroundColor: color,
        }}
      />
    </div>
  );
};

/** Small square dot — used as grid markers at corners / midpoints. */
const GridDot: React.FC<{
  x: number;
  y: number;
  size?: number;
  color: string;
  opacity?: number;
}> = ({ x, y, size = 10, color, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      backgroundColor: color,
      opacity,
    }}
  />
);

/** Six-dot grid pattern at corners + midpoints matching the recording. */
const GridDots: React.FC<{
  w: number;
  h: number;
  color: string;
  inset?: number;
  dotSize?: number;
  opacity?: number;
}> = ({ w, h, color, inset = 40, dotSize = 10, opacity = 1 }) => {
  const positions = [
    // Top row
    { x: inset, y: inset },
    { x: w / 2, y: inset },
    { x: w - inset, y: inset },
    // Middle row
    { x: inset, y: h / 2 },
    { x: w - inset, y: h / 2 },
    // Bottom row
    { x: inset, y: h - inset },
    { x: w / 2, y: h - inset },
    { x: w - inset, y: h - inset },
  ];
  return (
    <AbsoluteFill style={{ opacity }}>
      {positions.map((p, i) => (
        <GridDot key={i} x={p.x} y={p.y} size={dotSize} color={color} />
      ))}
    </AbsoluteFill>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export const ProductRevealTrack: React.FC<{
  data: ProductRevealTrackData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    width: W,
    height: H,
    durationMs,
    productImage,
    bgImage = "",
    brandName = "acme",
    heroLabel = "CO2",
    dateText = "20\n25",
    craftedText = "designed & crafted\nin ITALY",
    bottomTagline = "RACING SHOES DESIGNED\n& ENGINEERED IN ITALY",
    darkBg = "#1a0000",
    laneCount = 6,
  } = data;

  const totalFrames = msToFrame(durationMs, fps);

  // ── Sequence boundaries ──
  const seq1End = msToFrame(2200, fps);
  const seq2Start = msToFrame(1900, fps);
  const seq2End = msToFrame(4400, fps);
  const seq3Start = msToFrame(4100, fps);

  // ── Sequence 01 progress ──
  const s1 = interpolate(frame, [0, seq1End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s1Opacity = interpolate(frame, [seq1End - msToFrame(300, fps), seq1End], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Track elongation: oval → stadium shape
  const s1Elongation = interpolate(s1, [0, 0.7], [0, 1], {
    easing: smooth,
    extrapolateRight: "clamp",
  });

  // Logo scale-in
  const s1LogoScale = interpolate(s1, [0.05, 0.4], [0.4, 1], {
    easing: overshoot,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s1LogoOpacity = interpolate(s1, [0.05, 0.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo halves separate as track elongates
  const s1LogoGap = interpolate(s1, [0.3, 0.8], [0.08, 0.35], {
    easing: smooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Sequence 02 progress ──
  const s2Opacity = interpolate(
    frame,
    [seq2Start, seq2Start + msToFrame(350, fps), seq2End - msToFrame(350, fps), seq2End],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const s2 = interpolate(frame, [seq2Start, seq2End], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Product shoe scale
  const shoeScale = interpolate(s2, [0.05, 0.4, 0.85, 1], [0.85, 1.05, 1.05, 0.95], {
    easing: smooth,
    extrapolateRight: "clamp",
  });
  const shoeOpacity = interpolate(s2, [0.03, 0.15, 0.8, 0.95], [0, 1, 1, 0.6], {
    extrapolateRight: "clamp",
  });

  // CO2 text reveal
  const co2Scale = interpolate(s2, [0.08, 0.35], [0.7, 1], {
    easing: overshoot,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const co2Opacity = interpolate(s2, [0.08, 0.2, 0.82, 0.95], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Brand + small text fade-in
  const brandOpacity = interpolate(s2, [0.2, 0.35, 0.82, 0.95], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Grid dots
  const dotsOpacity = interpolate(s2, [0.1, 0.25, 0.82, 0.95], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  // Concentric track ovals behind shoe (lighter, subtle)
  const s2TrackOpacity = interpolate(s2, [0.05, 0.25, 0.8, 0.95], [0, 0.25, 0.25, 0], {
    extrapolateRight: "clamp",
  });

  // ── Sequence 03 progress ──
  const s3Opacity = interpolate(
    frame,
    [seq3Start, seq3Start + msToFrame(350, fps), totalFrames - msToFrame(100, fps), totalFrames],
    [0, 1, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const s3 = interpolate(frame, [seq3Start, totalFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Track lanes expand outward
  const s3TrackScale = interpolate(s3, [0, 0.6], [0.8, 1.15], {
    easing: smooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s3TrackOpacity = interpolate(s3, [0, 0.15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bottom row content (logo + tagline + brand)
  const s3ContentOpacity = interpolate(s3, [0.15, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: slowdown,
  });
  const s3ContentY = interpolate(s3, [0.15, 0.4], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: slowdown,
  });

  // Grid dots for seq 3
  const s3DotsOpacity = interpolate(s3, [0.08, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Track rounded-rect radius morph (seq 3: starts rounded stadium → opens to more rect-ish)
  const s3Elongation = interpolate(s3, [0, 0.7], [0.9, 1.3], {
    easing: smooth,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cX = W / 2;
  const cY = H / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff", overflow: "hidden" }}>
      {/* ═══════════ Sequence 01: Logo + Track Outlines ═══════════ */}
      <AbsoluteFill style={{ opacity: s1Opacity }}>
        {/* Concentric track/stadium outlines */}
        <TrackLanes
          cx={cX}
          cy={cY}
          baseW={W}
          baseH={H}
          lanes={laneCount}
          strokeColor="#00000018"
          strokeWidth={1.5}
          elongation={s1Elongation}
        />

        {/* JL logo mark — centre */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${s1LogoScale})`,
            opacity: s1LogoOpacity,
          }}
        >
          <JLLogoMark size={W * 0.35} color="#000000" gap={s1LogoGap} />
        </div>
      </AbsoluteFill>

      {/* ═══════════ Sequence 02: Dark + Shoe + CO2 ═══════════ */}
      <AbsoluteFill style={{ opacity: s2Opacity }}>
        {/* Dark background fill */}
        <AbsoluteFill style={{ backgroundColor: darkBg }} />

        {/* Atmospheric background image (terrain / landscape) */}
        {bgImage ? (
          <Img
            src={resolveImg(bgImage)}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.85,
            }}
          />
        ) : (
          /* Fallback gradient if no bgImage */
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              background:
                "radial-gradient(ellipse at 50% 35%, #4a0e0e 0%, #1a0000 55%, #0a0000 100%)",
            }}
          />
        )}

        {/* Concentric track ovals (subtle, behind shoe) */}
        <TrackLanes
          cx={cX}
          cy={cY * 0.82}
          baseW={W}
          baseH={H}
          lanes={5}
          strokeColor="#ffffff"
          strokeWidth={1}
          elongation={0.6}
          opacity={s2TrackOpacity}
        />

        {/* Grid dots — small squares at corners + midpoints */}
        <GridDots w={W} h={H} color="#ffffff" inset={42} dotSize={9} opacity={dotsOpacity} />

        {/* Product shoe — floating center */}
        <div
          style={{
            position: "absolute",
            top: "28%",
            left: "50%",
            width: W * 0.72,
            height: W * 0.55,
            transform: `translate(-50%, 0) scale(${shoeScale})`,
            opacity: shoeOpacity,
          }}
        >
          {productImage && (
            <Img
              src={resolveImg(productImage)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>

        {/* Large "CO2" text — geometric, overlapping shoe */}
        <div
          style={{
            position: "absolute",
            top: "48%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${co2Scale})`,
            opacity: co2Opacity,
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: W * 0.3,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: -8,
            lineHeight: 1,
            whiteSpace: "nowrap",
            textShadow: "0 4px 40px rgba(0,0,0,0.5)",
          }}
        >
          {heroLabel}
        </div>

        {/* Brand name below CO2 */}
        <div
          style={{
            position: "absolute",
            top: "62%",
            left: W * 0.1,
            opacity: brandOpacity,
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: W * 0.065,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: 1,
          }}
        >
          {brandName}
          <span
            style={{
              fontSize: W * 0.02,
              verticalAlign: "super",
              marginLeft: 2,
              opacity: 0.6,
            }}
          >
            co
          </span>
        </div>

        {/* Date text — small, bottom right area */}
        <div
          style={{
            position: "absolute",
            bottom: H * 0.15,
            right: W * 0.08,
            opacity: brandOpacity * 0.7,
            fontFamily: "monospace",
            fontSize: W * 0.022,
            color: "#ffffff",
            lineHeight: 1.1,
            whiteSpace: "pre-line",
            textAlign: "right",
          }}
        >
          {dateText}
        </div>

        {/* "designed & crafted in ITALY" — small text bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: H * 0.15,
            right: W * 0.18,
            opacity: brandOpacity * 0.6,
            fontFamily: "monospace",
            fontSize: W * 0.018,
            color: "#ffffff",
            lineHeight: 1.3,
            whiteSpace: "pre-line",
            textAlign: "left",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {craftedText}
        </div>
      </AbsoluteFill>

      {/* ═══════════ Sequence 03: White + Track + Brand Row ═══════════ */}
      <AbsoluteFill style={{ opacity: s3Opacity }}>
        <AbsoluteFill style={{ backgroundColor: "#ffffff" }} />

        {/* Concentric track lanes — expanding outward */}
        <TrackLanes
          cx={cX}
          cy={cY}
          baseW={W}
          baseH={H}
          lanes={laneCount}
          strokeColor="#00000015"
          strokeWidth={1.5}
          elongation={s3Elongation}
          scaleOut={s3TrackScale}
          opacity={s3TrackOpacity}
        />

        {/* Grid dots */}
        <GridDots w={W} h={H} color="#000000" inset={42} dotSize={9} opacity={s3DotsOpacity} />

        {/* Bottom-centre content row: Logo | Tagline | Brand */}
        <div
          style={{
            position: "absolute",
            bottom: H * 0.38,
            left: 0,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: W * 0.06,
            opacity: s3ContentOpacity,
            transform: `translateY(${s3ContentY}px)`,
          }}
        >
          {/* JL logo mark (small) */}
          <JLLogoMark size={W * 0.12} color="#000000" gap={0.15} />

          {/* Tagline text */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: W * 0.02,
              color: "#000000",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              lineHeight: 1.4,
              whiteSpace: "pre-line",
              textAlign: "center",
            }}
          >
            {bottomTagline}
          </div>

          {/* Brand name */}
          <div
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: W * 0.06,
              fontWeight: 700,
              color: "#000000",
              letterSpacing: 1,
            }}
          >
            {brandName}
            <span
              style={{
                fontSize: W * 0.018,
                verticalAlign: "super",
                marginLeft: 2,
                opacity: 0.5,
              }}
            >
              co
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
