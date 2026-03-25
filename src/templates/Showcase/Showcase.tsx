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
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";

const manrope = loadManrope("normal", {
  weights: ["400", "800"],
});

// ── Types ──

interface ShowcaseItem {
  color: string;
  image?: string; // optional staticFile path (e.g. "showcase/01.png")
  x: number; // offset from center
  y: number; // offset from center
}

interface ShowcaseData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  title: string;
  website: string;
  bgColor: string;
  titleFontSize: number;
  showcaseItems: ShowcaseItem[];
}

const smoothEase = Easing.bezier(0.4, 0, 0.2, 1);

// ── Main Component ──

export const Showcase: React.FC<{ data: ShowcaseData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    title = "Social Template",
    website = "www.website.com",
    bgColor = "#ffffff",
    titleFontSize = 60,
    showcaseItems = [],
    durationMs = 12000,
  } = data;

  const ms = (frame / fps) * 1000;
  const fitScale = Math.min(width / 1080, height / 1350);
  const CW = 1080;
  const CH = 1350;

  // ──────────────────────────────────────────
  //  PHASE 1 — INTRO (0–1000ms)
  //
  //  • Two vertical lines start close to centre,
  //    spread outward to the page margins
  //  • "Social Template" types in letter by letter
  //  • "www.website.com" types in
  //  • Thin decorative lines at top/bottom
  // ──────────────────────────────────────────

  const INTRO_END = 1000;

  // Vertical border lines: spread from centre to margins
  const lineSpread = interpolate(
    ms,
    [0, INTRO_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );
  const lineLeftX = interpolate(lineSpread, [0, 1], [CW / 2 - 20, 80]);
  const lineRightX = interpolate(lineSpread, [0, 1], [CW / 2 + 20, CW - 80]);

  // Title typewriter effect
  const titleChars = title.length;
  const typedCount = Math.floor(
    interpolate(
      ms,
      [200, INTRO_END - 100],
      [0, titleChars],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  const visibleTitle = title.slice(0, typedCount);

  // Website typewriter
  const webChars = website.length;
  const webTypedCount = Math.floor(
    interpolate(
      ms,
      [300, INTRO_END],
      [0, webChars],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  const visibleWebsite = website.slice(0, webTypedCount);

  // After intro, title and website are fully visible
  const titleText = ms >= INTRO_END ? title : visibleTitle;
  const websiteText = ms >= INTRO_END ? website : visibleWebsite;

  // ──────────────────────────────────────────
  //  PHASE 2 — IMAGE SHOWCASE (1000ms – endingStart)
  //
  //  Each image follows the same lifecycle:
  //    1. Appears TINY at a unique position (scale ≈ 0)
  //    2. Zooms/scales up from that position
  //    3. Continues scaling way past viewport size
  //    4. As it oversizes, it BLURS heavily and fades out
  //    5. Next image starts its cycle
  //
  //  Images are at DIFFERENT positions each time.
  // ──────────────────────────────────────────

  const SHOWCASE_START = 1000;
  const ENDING_DURATION = 2000;
  const SHOWCASE_END = durationMs - ENDING_DURATION;
  const itemCount = showcaseItems.length;

  // Each image's full lifecycle (appear → zoom → blur → gone)
  const CYCLE_DURATION = 1400;
  // Time between each image START — shorter than cycleDuration = overlap
  // This means the next image appears while the current is still zooming/blurring
  const STAGGER = itemCount > 1
    ? Math.min(
        (SHOWCASE_END - SHOWCASE_START - CYCLE_DURATION) / (itemCount - 1),
        CYCLE_DURATION * 0.6, // max 60% of cycle = 40% overlap
      )
    : CYCLE_DURATION;

  // ──────────────────────────────────────────
  //  PHASE 3 — ENDING (last 2000ms)
  //
  //  "Social Template" text zooms up from centre,
  //  blurs out, everything fades to white.
  // ──────────────────────────────────────────

  const ENDING_START = SHOWCASE_END;

  // Title zoom for ending
  const titleScale = interpolate(
    ms,
    [ENDING_START, durationMs - 500],
    [1, 8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );

  const titleBlur = interpolate(
    ms,
    [ENDING_START + 400, durationMs - 200],
    [0, 30],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
  );

  const titleEndOpacity = interpolate(
    ms,
    [durationMs - 600, durationMs - 100],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Overall fade to white at the end
  const endFade = interpolate(
    ms,
    [durationMs - 400, durationMs],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Border line opacity — fade during ending
  const borderOpacity = interpolate(
    ms,
    [ENDING_START, ENDING_START + 600],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Website text opacity
  const websiteOpacity = interpolate(
    ms,
    [ENDING_START, ENDING_START + 400],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // In ending phase, apply zoom to title
  const isEnding = ms >= ENDING_START;

  // ── Render showcase images ──
  const renderShowcaseItems = () => {
    return showcaseItems.map((item, idx) => {
      // Stagger start: each image begins STAGGER ms after the previous,
      // but its full cycle is CYCLE_DURATION — so images overlap
      const itemStart = SHOWCASE_START + idx * STAGGER;
      const itemEnd = itemStart + CYCLE_DURATION;

      // Scale: 0 → 1 (normal) → 9 (oversized)
      const scalePhase1End = itemStart + CYCLE_DURATION * 0.30; // zoom in (30%)
      const scalePhase2End = itemEnd;                            // zoom out (70%)

      const scale1 = interpolate(
        ms,
        [itemStart, scalePhase1End],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
      );

      const scale2 = interpolate(
        ms,
        [scalePhase1End, scalePhase2End],
        [1, 9],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0, 0.8, 1) },
      );

      const imgScale = ms < scalePhase1End ? scale1 : scale2;

      // Blur: kicks in once past ~scale 2 (around 50% through cycle)
      const blurStart = itemStart + CYCLE_DURATION * 0.50;
      const imgBlur = interpolate(
        ms,
        [blurStart, itemEnd],
        [0, 40],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothEase },
      );

      // Opacity: fade in quickly, hold, then fade out with the blur
      const fadeOutStart = itemStart + CYCLE_DURATION * 0.65;
      const imgOpacity = interpolate(
        ms,
        [itemStart, itemStart + 100, fadeOutStart, itemEnd],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

      if (imgOpacity <= 0) return null;

      // Card dimensions (base size before scaling)
      const cardW = 158;
      const cardH = 196;

      // Position: centered + offset
      const cx = CW / 2 - cardW / 2 + item.x;
      const cy = CH / 2 - cardH / 2 + item.y;

      return (
        <div
          key={`img-${idx}`}
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: cardW,
            height: cardH,
            borderRadius: 16,
            backgroundColor: item.color,
            transform: `scale(${imgScale})`,
            transformOrigin: "center center",
            filter: imgBlur > 0 ? `blur(${imgBlur}px)` : undefined,
            opacity: imgOpacity,
            zIndex: 20 + idx,
            overflow: "hidden",
          }}
        >
          {item.image && (
            <Img
              src={staticFile(item.image)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </div>
      );
    });
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
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
        {/* ── Layer 1: Border lines ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, opacity: borderOpacity }}>
          {/* Left vertical line */}
          <div
            style={{
              position: "absolute",
              left: lineLeftX,
              top: 60,
              width: 1,
              height: CH - 120,
              backgroundColor: "#cccccc",
            }}
          />
          {/* Right vertical line */}
          <div
            style={{
              position: "absolute",
              left: lineRightX,
              top: 60,
              width: 1,
              height: CH - 120,
              backgroundColor: "#cccccc",
            }}
          />
          {/* Top horizontal line */}
          <div
            style={{
              position: "absolute",
              left: lineLeftX,
              top: 60,
              width: lineRightX - lineLeftX,
              height: 1,
              backgroundColor: "#cccccc",
            }}
          />
          {/* Bottom horizontal line */}
          <div
            style={{
              position: "absolute",
              left: lineLeftX,
              top: CH - 60,
              width: lineRightX - lineLeftX,
              height: 1,
              backgroundColor: "#cccccc",
            }}
          />
          {/* Top centre tick */}
          <div
            style={{
              position: "absolute",
              left: CW / 2,
              top: 50,
              width: 1,
              height: 20,
              backgroundColor: "#cccccc",
            }}
          />
          {/* Bottom centre tick */}
          <div
            style={{
              position: "absolute",
              left: CW / 2,
              top: CH - 70,
              width: 1,
              height: 20,
              backgroundColor: "#cccccc",
            }}
          />
        </div>

        {/* ── Layer 2: Showcase images ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
          {renderShowcaseItems()}
        </div>

        {/* ── Layer 3: Title text ── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: CH / 2 - 30,
            zIndex: 10,
            textAlign: "center",
            fontFamily: manrope.fontFamily,
            fontSize: titleFontSize,
            fontWeight: 800,
            color: "#000000",
            letterSpacing: -1,
            transform: isEnding ? `scale(${titleScale})` : undefined,
            transformOrigin: "center center",
            filter: isEnding && titleBlur > 0 ? `blur(${titleBlur}px)` : undefined,
            opacity: isEnding ? titleEndOpacity : 1,
          }}
        >
          {titleText}
        </div>

        {/* ── Layer 4: Website URL ── */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: CH - 130,
            zIndex: 10,
            textAlign: "center",
            fontFamily: manrope.fontFamily,
            fontSize: 18,
            fontWeight: 400,
            color: "#000000",
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: websiteOpacity,
          }}
        >
          {websiteText}
        </div>

        {/* ── Layer 5: End fade to white ── */}
        {endFade > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: bgColor,
              opacity: endFade,
              zIndex: 100,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
