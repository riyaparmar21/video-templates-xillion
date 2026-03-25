/**
 * ShowreelGrid — Horizontal phone-mockup carousel.
 *
 * A strip of phone-sized cards scrolls left in 3 timed steps.
 * The centre card scales up while flanking cards stay smaller.
 *
 * Images are auto-discovered from `screenFolder` inside public/ —
 * just drop any image files in and they'll be picked up.
 *
 * 1600×1200, 3 000 ms, bg #ecf2eb.
 */
import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
  getStaticFiles,
} from "remotion";

// ── Types ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(png|jpe?g|webp|avif|gif|bmp|svg)$/i;

export interface ShowreelGridData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor?: string;
  /** Folder inside public/ to auto-scan for card images (e.g. "showreel-grid") */
  screenFolder?: string;
  /** Explicit fallback paths if screenFolder isn't set */
  screens?: string[];
  cardRadius?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardGap?: number;
  heroScale?: number;
  sideScale?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const msToFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);

const resolveImg = (src: string): string => {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
};

const natural = Easing.bezier(0.4, 0, 0.2, 1);

// ── Component ─────────────────────────────────────────────────────────────

export const ShowreelGrid: React.FC<{ data: ShowreelGridData }> = ({
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    width: W,
    height: H,
    bgColor = "#ecf2eb",
    screenFolder,
    screens: explicitScreens,
    cardRadius = 40,
    cardWidth = 375,
    cardHeight = 812,
    cardGap = 700,
    heroScale = 1.3,
    sideScale = 1.1,
  } = data;

  // Auto-discover images from screenFolder, fall back to explicit list
  const screens = useMemo(() => {
    if (screenFolder) {
      try {
        const prefix = screenFolder.replace(/\/$/, "") + "/";
        const found = getStaticFiles()
          .filter((f) => f.name.startsWith(prefix) && IMAGE_EXTS.test(f.name))
          .map((f) => f.name)
          .sort();
        if (found.length > 0) return found;
      } catch {
        // getStaticFiles unavailable (Player / SSR)
      }
    }
    return explicitScreens ?? [];
  }, [screenFolder, explicitScreens]);

  // Duplicate to fill 8 card slots for seamless wrap
  const strip: string[] = [];
  const base = screens.length > 0 ? screens : [];
  if (base.length > 0) {
    while (strip.length < 8) {
      for (const s of base) {
        strip.push(s);
        if (strip.length >= 8) break;
      }
    }
  }

  // 3 step-moves, each shifting one cardGap to the left
  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: natural };
  const step1 = interpolate(frame, [msToFrame(0, fps), msToFrame(800, fps)], [0, cardGap], clamp);
  const step2 = interpolate(frame, [msToFrame(1000, fps), msToFrame(1800, fps)], [0, cardGap], clamp);
  const step3 = interpolate(frame, [msToFrame(2030, fps), msToFrame(2830, fps)], [0, cardGap], clamp);
  const totalShift = step1 + step2 + step3;

  const viewCx = W / 2;
  // Position strip so card at index 2 starts centred
  const sliderX0 = viewCx - (2 * cardGap + cardWidth / 2);

  const getCardScale = (i: number) => {
    const cardCx = sliderX0 + i * cardGap + cardWidth / 2 - totalShift;
    const dist = Math.abs(cardCx - viewCx);
    const t = interpolate(dist, [0, cardGap * 0.6], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return sideScale + t * (heroScale - sideScale);
  };

  const cardTop = (H - cardHeight * heroScale) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {strip.map((screen, i) => {
        const scale = getCardScale(i);
        const cardX = sliderX0 + i * cardGap - totalShift;
        if (cardX + cardWidth * scale < -cardWidth || cardX > W + cardWidth) {
          return null;
        }
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cardX,
              top: cardTop,
              width: cardWidth,
              height: cardHeight,
              borderRadius: cardRadius,
              overflow: "hidden",
              transform: `scale(${scale})`,
              transformOrigin: "center top",
              backgroundColor: "#e0e0e0",
              boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            }}
          >
            <Img
              src={resolveImg(screen)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
