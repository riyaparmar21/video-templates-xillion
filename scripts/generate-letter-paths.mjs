#!/usr/bin/env node
/**
 * Generates SVG path data for A-Z (+ digits/punctuation) in two states:
 *   - "normal"   : Inter Bold paths as-is
 *   - "inflated" : paths inflated outward along per-point normals for
 *                  organic, non-uniform bubbly shapes
 *
 * The inflation uses outward-normal offsetting which naturally:
 *   - Makes thin strokes proportionally thicker
 *   - Rounds sharp corners
 *   - Shrinks inner holes (O, P, R, B, etc.)
 *   - Creates the organic blob look (not just a uniform scale)
 *
 * Output: src/templates/InflatingText/letter-paths.json
 *
 * Usage:
 *   node scripts/generate-letter-paths.mjs
 *   npm run paths:inflate
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Config ──
const FONT_PATH = resolve(__dirname, "fonts/inter-bold.ttf");
const FONT_SIZE = 200;

// Normal offset pushes each point outward along its edge normal.
// At FONT_SIZE=200, typical stroke width is ~35 units, so offset of 10
// expands each side by 10 units (making strokes ~28% thicker).
const OFFSET_AMOUNT = 12;
const WOBBLE_AMOUNT = 0; // Normal-offset itself creates enough organic variation
const SMOOTH_PASSES = 1; // Light Chaikin for minor corner softening
const SAMPLES_PER_SEGMENT = 12; // Dense polyline sampling for smooth curves
const RDP_TOLERANCE = 0.5; // Keep more points for clean polyline edges
const USE_POLYLINE = true; // Use L commands instead of Catmull-Rom (cleaner straight edges)

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const EXTRA_CHARS = "0123456789!?.,-'\"()&";
const ALL_CHARS = LETTERS + EXTRA_CHARS;

// ── Math helpers ──

function round(n) {
  return Math.round(n * 100) / 100;
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── SVG Path parsing ──

function parsePath(d) {
  const commands = [];
  const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    const type = match[1];
    const nums = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number);
    commands.push({ type, coords: nums });
  }
  return commands;
}

function commandsToPath(commands) {
  return commands
    .map((cmd) => {
      if (cmd.coords.length === 0) return cmd.type;
      const nums = cmd.coords.map((n) => round(n));
      return cmd.type + nums.join(" ");
    })
    .join("");
}

// ── Contour operations ──

/**
 * Split path commands into separate contours (subpaths).
 * Each contour starts with M and ends with Z.
 */
function splitIntoContours(commands) {
  const contours = [];
  let current = [];
  for (const cmd of commands) {
    current.push(cmd);
    if (cmd.type === "Z" || cmd.type === "z") {
      contours.push(current);
      current = [];
    }
  }
  if (current.length > 0) contours.push(current);
  return contours;
}

/**
 * Sample a contour's bezier curves into a dense polyline.
 */
function sampleContour(commands) {
  const points = [];
  let cx = 0,
    cy = 0;
  let startX = 0,
    startY = 0;
  const n = SAMPLES_PER_SEGMENT;

  for (const cmd of commands) {
    const co = cmd.coords;
    switch (cmd.type) {
      case "M":
        cx = co[0];
        cy = co[1];
        startX = cx;
        startY = cy;
        points.push({ x: cx, y: cy });
        break;

      case "L":
        for (let t = 1; t <= n; t++) {
          const f = t / n;
          points.push({ x: cx + (co[0] - cx) * f, y: cy + (co[1] - cy) * f });
        }
        cx = co[0];
        cy = co[1];
        break;

      case "H":
        for (let t = 1; t <= n; t++) {
          const f = t / n;
          points.push({ x: cx + (co[0] - cx) * f, y: cy });
        }
        cx = co[0];
        break;

      case "V":
        for (let t = 1; t <= n; t++) {
          const f = t / n;
          points.push({ x: cx, y: cy + (co[0] - cy) * f });
        }
        cy = co[0];
        break;

      case "Q":
        for (let t = 1; t <= n; t++) {
          const f = t / n;
          const mt = 1 - f;
          points.push({
            x: mt * mt * cx + 2 * mt * f * co[0] + f * f * co[2],
            y: mt * mt * cy + 2 * mt * f * co[1] + f * f * co[3],
          });
        }
        cx = co[2];
        cy = co[3];
        break;

      case "C":
        for (let t = 1; t <= n; t++) {
          const f = t / n;
          const mt = 1 - f;
          points.push({
            x:
              mt * mt * mt * cx +
              3 * mt * mt * f * co[0] +
              3 * mt * f * f * co[2] +
              f * f * f * co[4],
            y:
              mt * mt * mt * cy +
              3 * mt * mt * f * co[1] +
              3 * mt * f * f * co[3] +
              f * f * f * co[5],
          });
        }
        cx = co[4];
        cy = co[5];
        break;

      case "Z":
      case "z":
        // Close path — add points back to start if needed
        if (Math.abs(cx - startX) > 0.5 || Math.abs(cy - startY) > 0.5) {
          for (let t = 1; t <= n; t++) {
            const f = t / n;
            points.push({
              x: cx + (startX - cx) * f,
              y: cy + (startY - cy) * f,
            });
          }
        }
        cx = startX;
        cy = startY;
        break;
    }
  }

  // Remove duplicate consecutive points
  return points.filter((p, i) => {
    if (i === 0) return true;
    return dist(p, points[i - 1]) > 0.01;
  });
}

/**
 * Signed area of polygon (in SVG coords where y increases downward).
 * Positive = clockwise (outer contour in TrueType convention)
 * Negative = counter-clockwise (inner contour / hole)
 */
function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

/**
 * Compute outward normal at each point based on contour winding direction.
 * For CW (outer) contours: outward points away from the letter center.
 * For CCW (inner/hole) contours: outward points toward letter center (shrinks hole).
 */
function computeNormals(points, isCW) {
  const normals = [];
  const len = points.length;

  for (let i = 0; i < len; i++) {
    const prev = points[(i - 1 + len) % len];
    const next = points[(i + 1) % len];

    // Tangent direction (prev → next)
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag < 0.001) {
      normals.push({ x: 0, y: 0 });
      continue;
    }
    dx /= mag;
    dy /= mag;

    // In SVG coords (y-down):
    // CW contour → outward normal is right-hand: (dy, -dx)
    // CCW contour → outward normal is left-hand: (-dy, dx)
    if (isCW) {
      normals.push({ x: dy, y: -dx });
    } else {
      normals.push({ x: -dy, y: dx });
    }
  }

  return normals;
}

/**
 * Offset each point along its normal by amount + seeded wobble.
 */
function offsetPoints(points, normals, amount, wobble, seed) {
  return points.map((p, i) => {
    const n = normals[i];
    if (n.x === 0 && n.y === 0) return { ...p };

    // Deterministic pseudo-random wobble per point
    const hash = Math.sin(seed * 13.37 + i * 7.91 + i * i * 0.17) * 43758.5453;
    const wobbleVal = (hash - Math.floor(hash)) * 2 - 1; // -1 to 1
    const offset = amount + wobble * wobbleVal;

    return {
      x: p.x + n.x * offset,
      y: p.y + n.y * offset,
    };
  });
}

/**
 * Chaikin corner-cutting smoothing (rounds corners).
 */
function chaikinSmooth(points, iterations) {
  let result = points;
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed = [];
    for (let i = 0; i < result.length; i++) {
      const j = (i + 1) % result.length;
      smoothed.push({
        x: 0.75 * result[i].x + 0.25 * result[j].x,
        y: 0.75 * result[i].y + 0.25 * result[j].y,
      });
      smoothed.push({
        x: 0.25 * result[i].x + 0.75 * result[j].x,
        y: 0.25 * result[i].y + 0.75 * result[j].y,
      });
    }
    result = smoothed;
  }
  return result;
}

/**
 * Ramer-Douglas-Peucker point reduction to keep paths manageable.
 */
function rdpSimplify(points, tolerance) {
  if (points.length <= 2) return points;

  // Find point furthest from line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), tolerance);
    const right = rdpSimplify(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function pointToLineDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * Convert a closed polyline to a simple SVG path using L commands.
 * Straight edges stay perfectly straight; corners are handled by
 * the render-time puffy stroke (strokeLinejoin="round").
 */
function pointsToLinePath(points) {
  if (points.length < 3) return "";
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    d += `L${round(points[i].x)} ${round(points[i].y)}`;
  }
  d += "Z";
  return d;
}

/**
 * Convert a closed polyline to a smooth SVG path using Catmull-Rom → cubic bezier.
 */
function pointsToSmoothPath(points) {
  if (points.length < 3) return "";

  const n = points.length;
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    // Catmull-Rom to cubic bezier control points (tension = 0, alpha = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += `C${round(cp1x)} ${round(cp1y)} ${round(cp2x)} ${round(cp2y)} ${round(p2.x)} ${round(p2.y)}`;
  }

  d += "Z";
  return d;
}

// ── Font extraction ──

function extractPaths(fontPath) {
  const font = opentype.loadSync(fontPath);
  const result = {};

  for (const char of ALL_CHARS) {
    const glyph = font.charToGlyph(char);
    if (!glyph || glyph.index === 0) continue;

    const path = font.getPath(char, 0, FONT_SIZE, FONT_SIZE);
    const pathData = path.toPathData(2);
    if (!pathData || pathData.length < 5) continue;

    const bbox = path.getBoundingBox();
    const advanceWidth = (glyph.advanceWidth / font.unitsPerEm) * FONT_SIZE;

    result[char] = {
      path: pathData,
      bbox: {
        x1: round(bbox.x1),
        y1: round(bbox.y1),
        x2: round(bbox.x2),
        y2: round(bbox.y2),
      },
      width: round(bbox.x2 - bbox.x1),
      height: round(bbox.y2 - bbox.y1),
      advanceWidth: round(advanceWidth),
    };
  }

  return result;
}

/**
 * Create inflated paths using outward-normal offsetting.
 *
 * For each character:
 * 1. Split into contours (outer shell + inner holes)
 * 2. Sample each contour into dense polyline
 * 3. Compute per-point outward normals
 * 4. Offset along normals (with wobble)
 * 5. Chaikin smooth for organic roundness
 * 6. RDP simplify to keep file size sane
 * 7. Convert back to smooth SVG path (Catmull-Rom → cubic bezier)
 */
function createInflatedPaths(normalPaths) {
  const result = {};

  for (const [char, data] of Object.entries(normalPaths)) {
    const commands = parsePath(data.path);
    const contours = splitIntoContours(commands);
    const charSeed = char.charCodeAt(0);

    const inflatedParts = [];

    for (const contour of contours) {
      // Sample to dense polyline
      const points = sampleContour(contour);
      if (points.length < 4) continue;

      // Determine winding
      const area = signedArea(points);
      const isCW = area > 0;

      // Compute outward normals
      const normals = computeNormals(points, isCW);

      // Offset outward
      const offsetPts = offsetPoints(
        points,
        normals,
        OFFSET_AMOUNT,
        WOBBLE_AMOUNT,
        charSeed
      );

      // Smooth for organic rounded feel
      const smoothed = chaikinSmooth(offsetPts, SMOOTH_PASSES);

      // Reduce point count
      const simplified = rdpSimplify(smoothed, RDP_TOLERANCE);

      // Ensure minimum points for smooth path
      if (simplified.length < 4) continue;

      // Convert to SVG path
      const pathStr = USE_POLYLINE
        ? pointsToLinePath(simplified)
        : pointsToSmoothPath(simplified);
      inflatedParts.push(pathStr);
    }

    if (inflatedParts.length === 0) {
      // Fallback to original
      result[char] = data;
      continue;
    }

    const inflatedPath = inflatedParts.join("");

    // Compute bounding box of inflated path
    const allCmds = parsePath(inflatedPath);
    const allPts = extractAllCoords(allCmds);

    if (allPts.length === 0) {
      result[char] = data;
      continue;
    }

    const minX = Math.min(...allPts.map((p) => p.x));
    const minY = Math.min(...allPts.map((p) => p.y));
    const maxX = Math.max(...allPts.map((p) => p.x));
    const maxY = Math.max(...allPts.map((p) => p.y));

    result[char] = {
      path: inflatedPath,
      bbox: { x1: round(minX), y1: round(minY), x2: round(maxX), y2: round(maxY) },
      width: round(maxX - minX),
      height: round(maxY - minY),
      // Advance width grows proportionally
      advanceWidth: round(data.advanceWidth * ((maxX - minX) / data.width)),
    };
  }

  return result;
}

/**
 * Extract all coordinate points from parsed commands (for bbox calculation).
 */
function extractAllCoords(commands) {
  const points = [];
  let cx = 0,
    cy = 0;
  for (const cmd of commands) {
    const c = cmd.coords;
    switch (cmd.type) {
      case "M":
      case "L":
        cx = c[0];
        cy = c[1];
        points.push({ x: cx, y: cy });
        break;
      case "H":
        cx = c[0];
        points.push({ x: cx, y: cy });
        break;
      case "V":
        cy = c[0];
        points.push({ x: cx, y: cy });
        break;
      case "Q":
        points.push({ x: c[0], y: c[1] });
        cx = c[2];
        cy = c[3];
        points.push({ x: cx, y: cy });
        break;
      case "C":
        points.push({ x: c[0], y: c[1] });
        points.push({ x: c[2], y: c[3] });
        cx = c[4];
        cy = c[5];
        points.push({ x: cx, y: cy });
        break;
    }
  }
  return points;
}

// ── Build output ──

function buildOutput(normalPaths, inflatedPaths) {
  const result = {};

  for (const char of ALL_CHARS) {
    const normal = normalPaths[char];
    const inflated = inflatedPaths[char];
    if (!normal) continue;

    const inf = inflated || normal;

    result[char] = {
      normal: {
        path: normal.path,
        viewBox: `${normal.bbox.x1} ${normal.bbox.y1} ${normal.width} ${normal.height}`,
        width: normal.advanceWidth,
        height: normal.height,
      },
      inflated: {
        path: inf.path,
        viewBox: `${inf.bbox.x1} ${inf.bbox.y1} ${inf.width} ${inf.height}`,
        width: inf.advanceWidth,
        height: inf.height,
      },
    };
  }

  return result;
}

// ── Main ──
console.log("Loading Inter Bold...");
const normalPaths = extractPaths(FONT_PATH);
console.log(`Extracted: ${Object.keys(normalPaths).length} characters`);

console.log(
  `Creating inflated paths (offset: ${OFFSET_AMOUNT}, wobble: ${WOBBLE_AMOUNT}, smooth: ${SMOOTH_PASSES} passes)...`
);
const inflatedPaths = createInflatedPaths(normalPaths);

console.log("Building output...");
const letterPaths = buildOutput(normalPaths, inflatedPaths);
console.log(`Result: ${Object.keys(letterPaths).length} characters`);

// Save
const outputPath = resolve(
  root,
  "src/templates/InflatingText/letter-paths.json"
);
writeFileSync(outputPath, JSON.stringify(letterPaths, null, 2) + "\n", "utf8");
console.log(`\nSaved to: src/templates/InflatingText/letter-paths.json`);

// Sample comparison
const sample = letterPaths["M"];
if (sample) {
  console.log(`\nSample — "M":`);
  console.log(`  Normal viewBox:   ${sample.normal.viewBox}`);
  console.log(`  Inflated viewBox: ${sample.inflated.viewBox}`);
  console.log(
    `  Normal path length:   ${sample.normal.path.length} chars`
  );
  console.log(
    `  Inflated path length: ${sample.inflated.path.length} chars`
  );
}
