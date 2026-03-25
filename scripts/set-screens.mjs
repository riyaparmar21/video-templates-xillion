#!/usr/bin/env node
/**
 * CLI to load screen images into the AnimatedWebScreens template.
 *
 * ── Mode 1: Folder (bulk) ──
 *
 *   node scripts/set-screens.mjs ./my-screenshots
 *   npm run screens -- ./my-screenshots
 *
 *   Name files to match slots:
 *     1.png  2.png  3.png        ← top row
 *     4.png  5.png  6.png        ← middle row (5 = center device)
 *     7.png  8.png  9.png        ← bottom row
 *     c1.png c2.png c3.png c4.png ← center slides
 *
 * ── Mode 2: Single slot ──
 *
 *   node scripts/set-screens.mjs --slot 3 ./path/to/image.png
 *   node scripts/set-screens.mjs --slot 5 "https://example.com/hero.png"
 *   node scripts/set-screens.mjs --center 2 ./slide.png
 *   node scripts/set-screens.mjs --center 1 "https://example.com/slide.png"
 *
 *   npm run screens -- --slot 3 ./path/to/image.png
 *   npm run screens -- --center 2 "https://example.com/slide.png"
 *
 * Options:
 *   --clear    Remove all existing images from public/screens/ first
 *   --dry-run  Show what would happen without changing anything
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, extname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SPEC_PATH = resolve(root, "src/animated-web-screens-spec.json");
const SCREENS_DIR = resolve(root, "public/screens");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]);

// ── Slot parsing (from filename stem) ──

function parseSlotFromStem(stem) {
  const lower = stem.toLowerCase();
  const centerMatch = lower.match(/^c(\d)$/);
  if (centerMatch) {
    const idx = Number(centerMatch[1]);
    if (idx >= 1 && idx <= 4) return { type: "center", index: idx - 1 };
  }
  const gridMatch = lower.match(/^(\d)$/);
  if (gridMatch) {
    const idx = Number(gridMatch[1]);
    if (idx >= 1 && idx <= 9) return { type: "grid", index: idx - 1 };
  }
  return null;
}

// ── Helpers ──

function loadSpec() {
  return JSON.parse(readFileSync(SPEC_PATH, "utf8"));
}

function saveSpec(data) {
  writeFileSync(SPEC_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function isUrl(str) {
  return str.startsWith("http://") || str.startsWith("https://");
}

function isLocalFile(str) {
  try { return existsSync(resolve(str)); } catch { return false; }
}

function printHelp() {
  console.log("set-screens — Load images into AnimatedWebScreens\n");
  console.log("Bulk from folder:");
  console.log("  npm run screens -- ./my-screenshots");
  console.log("  npm run screens -- ./my-screenshots --clear\n");
  console.log("Single slot:");
  console.log('  npm run screens -- --slot 3 ./hero.png');
  console.log('  npm run screens -- --slot 5 "https://example.com/img.png"');
  console.log('  npm run screens -- --center 2 ./slide.png');
  console.log('  npm run screens -- --center 1 "https://example.com/slide.png"\n');
  console.log("Options:");
  console.log("  --clear     Remove existing images from public/screens/ first");
  console.log("  --dry-run   Preview changes without writing anything\n");
  printGrid();
  console.log("  Best image size: 348x224 (3:2 ratio). Any size works — images");
  console.log("  are displayed with object-fit: cover (crops to fill the frame).");
}

function printGrid() {
  console.log("  Grid layout (name files 1–9):");
  console.log("  ┌──────┬──────┬──────┐");
  console.log("  │ 1    │ 2    │ 3    │  top row");
  console.log("  ├──────┼──────┼──────┤");
  console.log("  │ 4    │ 5    │ 6    │  middle (5 = center)");
  console.log("  ├──────┼──────┼──────┤");
  console.log("  │ 7    │ 8    │ 9    │  bottom row");
  console.log("  └──────┴──────┴──────┘");
  console.log("  Center slides: c1, c2, c3, c4\n");
}

/**
 * Copy a local file into public/screens/ and return the staticFile path.
 * If src is a URL, just return it as-is (no copy needed).
 */
function resolveSource(src, slotType, slotIndex, dryRun) {
  if (isUrl(src)) return src;

  const absPath = resolve(src);
  if (!existsSync(absPath)) {
    console.error(`✗ File not found: ${absPath}`);
    process.exit(1);
  }

  const ext = extname(absPath);
  const destName = slotType === "grid"
    ? `screen-${slotIndex + 1}${ext}`
    : `center-${slotIndex + 1}${ext}`;
  const destPath = join(SCREENS_DIR, destName);
  const staticPath = `screens/${destName}`;

  if (!dryRun) {
    mkdirSync(SCREENS_DIR, { recursive: true });
    copyFileSync(absPath, destPath);
  }

  return staticPath;
}

function updateSpecSlot(spec, slotType, slotIndex, newSrc) {
  if (slotType === "grid") {
    const old = spec.screens[slotIndex]?.src || "(none)";
    spec.screens[slotIndex].src = newSrc;
    return { label: `screen ${slotIndex + 1}`, old, newSrc };
  } else {
    if (!spec.centerSlides) spec.centerSlides = [];
    while (spec.centerSlides.length <= slotIndex) {
      spec.centerSlides.push({ id: `slide0${spec.centerSlides.length + 2}`, src: "" });
    }
    const old = spec.centerSlides[slotIndex]?.src || "(none)";
    spec.centerSlides[slotIndex].src = newSrc;
    return { label: `center slide ${slotIndex + 1}`, old, newSrc };
  }
}

// ── Parse args ──

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const clear = rawArgs.includes("--clear");

// Filter out flag-only args for positional parsing
const flagArgs = {};
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === "--dry-run" || a === "--clear") continue;
  if ((a === "--slot" || a === "--center") && i + 2 < rawArgs.length) {
    flagArgs.mode = a === "--slot" ? "grid" : "center";
    flagArgs.num = Number(rawArgs[i + 1]);
    flagArgs.src = rawArgs[i + 2];
    i += 2;
  } else {
    positional.push(a);
  }
}

// ── Route to correct mode ──

if (flagArgs.mode) {
  // ═══ Single-slot mode ═══
  const slotType = flagArgs.mode;
  const num = flagArgs.num;
  const src = flagArgs.src;

  if (slotType === "grid" && (num < 1 || num > 9)) {
    console.error("✗ --slot must be 1–9");
    process.exit(1);
  }
  if (slotType === "center" && (num < 1 || num > 4)) {
    console.error("✗ --center must be 1–4");
    process.exit(1);
  }
  if (!src) {
    console.error("✗ Missing image path or URL");
    process.exit(1);
  }

  const slotIndex = num - 1;
  const resolvedSrc = resolveSource(src, slotType, slotIndex, dryRun);
  const spec = loadSpec();
  const result = updateSpecSlot(spec, slotType, slotIndex, resolvedSrc);

  if (!dryRun) saveSpec(spec);

  const prefix = dryRun ? "[DRY RUN] " : "✓ ";
  console.log(`${prefix}${result.label}: ${result.newSrc}`);
  if (!isUrl(src)) {
    console.log(`  Copied to: public/${resolvedSrc}`);
  }
  console.log(`  Spec: src/animated-web-screens-spec.json`);

} else if (positional.length > 0) {
  // ═══ Folder mode ═══
  const folderArg = positional[0];
  const inputDir = resolve(folderArg);

  if (!existsSync(inputDir) || !statSync(inputDir).isDirectory()) {
    console.error(`✗ Not a folder: ${inputDir}`);
    console.error('  For single files use: npm run screens -- --slot 3 ./image.png');
    process.exit(1);
  }

  const files = readdirSync(inputDir).filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error(`✗ No image files found in ${inputDir}`);
    process.exit(1);
  }

  const matched = [];
  const unmatched = [];
  for (const file of files) {
    const stem = basename(file, extname(file));
    const slot = parseSlotFromStem(stem);
    if (slot) {
      matched.push({ file, slot, ext: extname(file) });
    } else {
      unmatched.push(file);
    }
  }

  if (matched.length === 0) {
    console.error("✗ No files matched slot names (1–9, c1–c4).");
    printGrid();
    process.exit(1);
  }

  matched.sort((a, b) => {
    if (a.slot.type !== b.slot.type) return a.slot.type === "grid" ? -1 : 1;
    return a.slot.index - b.slot.index;
  });

  console.log(`${dryRun ? "[DRY RUN] " : ""}Processing ${matched.length} image(s) from ${inputDir}\n`);

  if (clear && existsSync(SCREENS_DIR)) {
    if (dryRun) {
      console.log("  Would clear public/screens/");
    } else {
      rmSync(SCREENS_DIR, { recursive: true });
      console.log("  Cleared public/screens/");
    }
  }

  if (!dryRun) mkdirSync(SCREENS_DIR, { recursive: true });

  const spec = loadSpec();

  for (const { file, slot, ext } of matched) {
    const destName = slot.type === "grid"
      ? `screen-${slot.index + 1}${ext}`
      : `center-${slot.index + 1}${ext}`;
    const destPath = join(SCREENS_DIR, destName);
    const staticPath = `screens/${destName}`;

    if (!dryRun) copyFileSync(join(inputDir, file), destPath);

    const result = updateSpecSlot(spec, slot.type, slot.index, staticPath);
    console.log(`  ✓ ${result.label}: ${file} → ${staticPath}`);
  }

  if (!dryRun) saveSpec(spec);

  if (unmatched.length > 0) {
    console.log(`\n  ⚠ ${unmatched.length} file(s) skipped (name didn't match a slot):`);
    unmatched.forEach((f) => console.log(`    ${f}`));
    console.log("  Rename them to 1–9 or c1–c4 to use them.");
  }

  console.log(`\n  ${dryRun ? "Would update" : "Updated"}: src/animated-web-screens-spec.json`);
  console.log(`  ${dryRun ? "Would copy to" : "Copied to"}: public/screens/`);

} else {
  printHelp();
  process.exit(0);
}
