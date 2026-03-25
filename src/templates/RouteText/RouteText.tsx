import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
} from "remotion";
import { loadFont as loadInstrumentSans } from "@remotion/google-fonts/InstrumentSans";

const instrumentSans = loadInstrumentSans("normal", {
  weights: ["700"],
});

// ── Types ──

interface RowData {
  cities: string[];
  scrollX: number;    // total px to scroll (left-to-right)
  group?: number;     // 0 = top group (front-loaded), 1 = bottom group (back-loaded)
}

interface RouteTextData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  textColor: string;
  arrowColor: string;
  fontSize: number;
  rowHeight: number;
  rows: RowData[];
}

// ── Easing curves per group ──
// Group 0 (rows 1-2): Front-loaded — fast start, long deceleration
// Most distance covered in first ~45% of time, then gentle coast to stop
const easingFrontLoaded = Easing.bezier(0.0, 0.0, 0.15, 1);

// Group 1 (rows 3-4): Back-loaded — slow crawl, then burst, then ease out
// Barely moves first ~35%, then "pushed" into fast motion, eases to stop
const easingBackLoaded = Easing.bezier(0.7, 0.0, 0.25, 1);

// Arrow character — sharp angular arrow matching reference
const ARROW = "\u2794"; // ➔

// ── Main Component ──

export const RouteText: React.FC<{ data: RouteTextData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    bgColor = "#000000",
    textColor = "#ffffff",
    arrowColor = "#ffbf26",
    fontSize = 220,
    rowHeight = 270,
    rows = [],
    durationMs = 6000,
  } = data;

  const ms = (frame / fps) * 1000;
  const fitScale = Math.min(width / 1920, height / 1080);

  // Base canvas: 1920×1080 (16:9), scaled to fit
  const CW = 1920;
  const CH = 1080;

  // How many rows fit in the viewport
  const visibleRows = Math.min(rows.length, Math.ceil(CH / rowHeight));

  // ── Render a single scrolling row ──
  const renderRow = (row: RowData, idx: number) => {
    const { cities, scrollX, group = idx < 2 ? 0 : 1 } = row;

    // Pick easing based on group
    const easing = group === 0 ? easingFrontLoaded : easingBackLoaded;

    // All rows animate for the full duration — no delays, always moving
    const tx = interpolate(
      ms,
      [0, durationMs],
      [-scrollX, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      },
    );

    // Build the row text: City → City → City → ...
    const segments: React.ReactNode[] = [];
    for (let i = 0; i < cities.length; i++) {
      if (i > 0) {
        segments.push(
          <span
            key={`arrow-${i}`}
            style={{
              color: arrowColor,
              margin: "0 0.15em",
            }}
          >
            {ARROW}
          </span>,
        );
      }
      segments.push(
        <span key={`city-${i}`} style={{ color: textColor }}>
          {cities[i]}
        </span>,
      );
    }

    return (
      <div
        key={`row-${idx}`}
        style={{
          position: "absolute",
          left: 0,
          top: idx * rowHeight,
          height: rowHeight,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          transform: `translateX(${tx}px)`,
          willChange: "transform",
          fontFamily: instrumentSans.fontFamily,
          fontSize,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {segments}
      </div>
    );
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
        {rows.slice(0, visibleRows).map((row, idx) => renderRow(row, idx))}
      </div>
    </AbsoluteFill>
  );
};
