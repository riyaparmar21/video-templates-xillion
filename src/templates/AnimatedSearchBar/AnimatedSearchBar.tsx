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
  weights: ["400", "500", "600"],
});

// ── Types ──

interface AnimatedSearchBarData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** Search query text to type out */
  searchText: string;
  /** Optional icon URL (SVG or PNG). Falls back to a built-in magnifying glass. */
  iconSrc?: string;
  /** Background color of the artboard */
  bgColor?: string;
  /** Search bar background color */
  barColor?: string;
  /** Text color */
  textColor?: string;
  /** Bar corner radius */
  barRadius?: number;
  /** Font size for the search text */
  fontSize?: number;
}

// ── Easing helpers ──

const easeOut = Easing.out(Easing.quad);
const easeIn = Easing.in(Easing.quad);

// ── Built-in magnifying glass SVG (inline data URI) ──

const MAGNIFYING_GLASS_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`
)}`;

// ── Timing (ms) — mirrors the Figma spec operations ──

const TIMING = {
  // Phase 1: Search bar group grows in from center (scale 0.5 → 1)
  barGrowIn: { start: 0, end: 400 },
  // Phase 2: Icon grows in (slightly staggered)
  iconGrowIn: { start: 100, end: 500 },
  // Phase 3: Bar resizes from narrow (80px) to full width
  barResize: { start: 400, end: 1100 },
  // Phase 4: Typewriter — each letter appears instantly, one after another
  textIn: { start: 900, letterIntervalMs: 60 },
  // Phase 5: Bar shrinks out at the end
  barShrinkOut: { start: 3200, end: 3500 },
};

// ── Helper: ms → frame ──

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

// ── Blinking Cursor Component ──

const BlinkingCursor: React.FC<{
  visible: boolean;
  color: string;
  fontSize: number;
}> = ({ visible, color, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Blink every 530ms (roughly 16 frames at 30fps)
  const blinkCycle = Math.floor((frame / fps) * 1000 / 530) % 2 === 0;

  if (!visible) return null;

  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: fontSize * 0.75,
        backgroundColor: color,
        opacity: blinkCycle ? 1 : 0,
        marginLeft: 2,
        verticalAlign: "middle",
      }}
    />
  );
};

// ── Typewriter Text — reveals characters one at a time (instant appear) ──

const TypewriterText: React.FC<{
  text: string;
  startMs: number;
  letterIntervalMs: number;
  textColor: string;
  fontSize: number;
}> = ({ text, startMs, letterIntervalMs, textColor, fontSize }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate how many characters are visible at this frame
  const elapsedMs = (frame / fps) * 1000 - startMs;
  const visibleCount =
    elapsedMs < 0 ? 0 : Math.min(Math.floor(elapsedMs / letterIntervalMs) + 1, text.length);

  const displayed = text.slice(0, visibleCount);

  return (
    <span
      style={{
        color: textColor,
        fontSize,
        fontFamily: inter.fontFamily,
        fontWeight: 500,
        whiteSpace: "pre",
      }}
    >
      {displayed}
    </span>
  );
};

// ── Main AnimatedSearchBar Component ──

export const AnimatedSearchBar: React.FC<{
  data: AnimatedSearchBarData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Defaults
  const bgColor = data.bgColor || "transparent";
  const barColor = data.barColor || "#ffffff";
  const textColor = data.textColor || "#404040";
  const barRadius = data.barRadius ?? 40;
  const fontSize = data.fontSize ?? 24;
  const iconSrc = data.iconSrc || MAGNIFYING_GLASS_SVG;
  const searchText = data.searchText || "Best motion design tool";

  // ── Artboard dimensions (from Figma spec) ──
  const ARTBOARD = { w: 680, h: 120 };
  const BAR = { fullW: 640, h: 80, narrowW: 80 };
  const ICON = { size: 40 };

  // ── Phase 1: Bar grow-in (scale 0.5→1, opacity 0→1) ──
  const barGrowStart = msToFrame(TIMING.barGrowIn.start, fps);
  const barGrowEnd = msToFrame(TIMING.barGrowIn.end, fps);

  const barGrowProgress = interpolate(
    frame,
    [barGrowStart, barGrowEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const barGrowEased = easeOut(barGrowProgress);
  const barEntranceScale = interpolate(barGrowEased, [0, 1], [0.5, 1]);
  const barEntranceOpacity = interpolate(barGrowEased, [0, 1], [0, 1]);

  // ── Phase 2: Icon grow-in (staggered) ──
  const iconGrowStart = msToFrame(TIMING.iconGrowIn.start, fps);
  const iconGrowEnd = msToFrame(TIMING.iconGrowIn.end, fps);

  const iconGrowProgress = interpolate(
    frame,
    [iconGrowStart, iconGrowEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const iconGrowEased = easeOut(iconGrowProgress);
  const iconScale = interpolate(iconGrowEased, [0, 1], [0.5, 1]);
  const iconOpacity = interpolate(iconGrowEased, [0, 1], [0, 1]);

  // ── Phase 3: Bar resize (narrow→full width) ──
  const resizeStart = msToFrame(TIMING.barResize.start, fps);
  const resizeEnd = msToFrame(TIMING.barResize.end, fps);

  const resizeProgress = interpolate(
    frame,
    [resizeStart, resizeEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "natural" easing — cubic bezier approximation
  const resizeEased = Easing.bezier(0.25, 0.1, 0.25, 1)(resizeProgress);
  const barWidth = interpolate(resizeEased, [0, 1], [BAR.narrowW, BAR.fullW]);

  // ── Phase 4: Typewriter text ──
  const textStartMs = TIMING.textIn.start;
  const letterIntervalMs = TIMING.textIn.letterIntervalMs;

  // Show cursor during and after typing, hide after shrink starts
  const shrinkStart = msToFrame(TIMING.barShrinkOut.start, fps);
  const showCursor = frame >= msToFrame(textStartMs, fps) && frame < shrinkStart;

  // ── Phase 5: Bar shrink-out (scale 1→0.8, opacity 1→0) ──
  const shrinkEnd = msToFrame(TIMING.barShrinkOut.end, fps);

  const shrinkProgress = interpolate(
    frame,
    [shrinkStart, shrinkEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shrinkEased = easeIn(shrinkProgress);
  const barExitScale = interpolate(shrinkEased, [0, 1], [1, 0.8]);
  const barExitOpacity = interpolate(shrinkEased, [0, 1], [1, 0]);

  // ── Combined transforms ──
  const combinedScale = barEntranceScale * barExitScale;
  const combinedOpacity = barEntranceOpacity * barExitOpacity;

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
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Search bar group — animated scale + opacity */}
        <div
          style={{
            width: barWidth,
            height: BAR.h,
            borderRadius: barRadius,
            backgroundColor: barColor,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            transform: `scale(${combinedScale})`,
            transformOrigin: "center center",
            opacity: combinedOpacity,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            padding: "0 20px",
          }}
        >
          {/* Search icon */}
          <div
            style={{
              width: ICON.size,
              height: ICON.size,
              flexShrink: 0,
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
                objectFit: "contain",
              }}
            />
          </div>

          {/* Text area — only visible when bar is wide enough */}
          <div
            style={{
              marginLeft: 16,
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              opacity: resizeProgress > 0.3 ? 1 : 0,
            }}
          >
            <TypewriterText
              text={searchText}
              startMs={textStartMs}
              letterIntervalMs={letterIntervalMs}
              textColor={textColor}
              fontSize={fontSize}
            />
            <BlinkingCursor
              visible={showCursor}
              color={textColor}
              fontSize={fontSize}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default AnimatedSearchBar;
