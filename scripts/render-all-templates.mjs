#!/usr/bin/env node
/**
 * Batch-render all standalone template compositions (excludes GeneratedVideo).
 *
 * Usage:
 *   node scripts/render-all-templates.mjs            # render all
 *   node scripts/render-all-templates.mjs --only KineticCaptions,Tweet  # render specific ones
 *   node scripts/render-all-templates.mjs --list      # just list composition IDs
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outDir = resolve(projectRoot, "output", "templates");
mkdirSync(outDir, { recursive: true });

const COMPOSITIONS = [
  "KineticCaptions",
  "AnimatedWebScreens",
  "AnimatedSearchBar",
  "IOSNotification",
  "InflatingText",
  "ProgressBar",
  "BlurTextScroller",
  "VaultAnimatedCards",
  "ColorBlendBlocks",
  "Tweet",
  "ProductRevealTrack",
  "WhiteSocialHandle",
  "ShowreelGrid",
  "MobileShowreelFrames",
  "StackHiring",
  "SlideshowSocial",
  "DesignPreview",
  "GenAiFeatures",
  "VaultCardFeatures",
  "Showcase",
  "RouteText",
  "ParallaxImageReveal",
  "ThreeDCardFlip",
  "GradientWash",
  "SplitScreenMorph",
  "NumberCounterScene",
  "TextRevealWipe",
  "LogoStinger",
  "SpiralCaptions",
  "DepthCaptions",
];

// Parse args
const args = process.argv.slice(2);

if (args.includes("--list")) {
  console.log(`\n  ${COMPOSITIONS.length} standalone template compositions:\n`);
  for (const c of COMPOSITIONS) console.log(`    • ${c}`);
  console.log();
  process.exit(0);
}

let toRender = [...COMPOSITIONS];

const onlyIdx = args.indexOf("--only");
if (onlyIdx !== -1 && args[onlyIdx + 1]) {
  const filter = args[onlyIdx + 1].split(",").map(s => s.trim());
  const invalid = filter.filter(f => !COMPOSITIONS.includes(f));
  if (invalid.length) {
    console.error(`Unknown composition(s): ${invalid.join(", ")}`);
    process.exit(1);
  }
  toRender = filter;
}

console.log(`\n${"=".repeat(60)}`);
console.log(`  Batch Render — ${toRender.length} template(s)`);
console.log(`  Output: ${outDir}/`);
console.log(`${"=".repeat(60)}\n`);

let success = 0;
let failed = 0;
const errors = [];

for (let i = 0; i < toRender.length; i++) {
  const comp = toRender[i];
  const outPath = resolve(outDir, `${comp}.mp4`);
  const label = `[${i + 1}/${toRender.length}]`;

  console.log(`${label} Rendering ${comp}...`);

  try {
    execFileSync("npx", [
      "remotion", "render",
      "src/index.ts",
      comp,
      outPath,
    ], {
      stdio: "inherit",
      cwd: projectRoot,
      timeout: 5 * 60 * 1000, // 5 min per template
    });
    success++;
    console.log(`${label} ✓ ${comp} → ${outPath}\n`);
  } catch (err) {
    failed++;
    errors.push(comp);
    console.error(`${label} ✗ ${comp} failed: ${err.message}\n`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`  Done — ${success} rendered, ${failed} failed`);
if (errors.length) console.log(`  Failed: ${errors.join(", ")}`);
console.log(`  Files: ${outDir}/`);
console.log(`${"=".repeat(60)}\n`);
