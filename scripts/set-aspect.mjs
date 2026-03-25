#!/usr/bin/env node
/**
 * CLI to change the aspect ratio / resolution of any standalone template.
 *
 * Usage:
 *   node scripts/set-aspect.mjs <template> <preset|WxH>
 *
 * Presets:
 *   1:1       1080×1080   Square (Instagram post, default)
 *   9:16      1080×1920   Vertical (Stories, Reels, TikTok)
 *   16:9      1920×1080   Landscape (YouTube, presentations)
 *   4:5       1080×1350   Portrait (Instagram feed)
 *   4:3       1200×900    Classic (presentations)
 *
 * Custom:
 *   node scripts/set-aspect.mjs search-bar 1280x720
 *
 * npm shortcuts:
 *   npm run aspect -- search-bar 9:16
 *   npm run aspect -- notification 16:9
 *   npm run aspect -- all 9:16
 *
 * "all" applies the same aspect ratio to every standalone template.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Spec file paths ──
const SPECS = {
  "search-bar": resolve(root, "src/animated-search-bar-spec.json"),
  notification: resolve(root, "src/ios-notification-spec.json"),
  inflate: resolve(root, "src/inflating-text-spec.json"),
  "progress-bar": resolve(root, "src/progress-bar-spec.json"),
  "web-screens": resolve(root, "src/animated-web-screens-spec.json"),
  captions: resolve(root, "src/kinetic-captions-spec.json"),
  "blur-scroller": resolve(root, "src/blur-text-scroller-spec.json"),
  "vault-cards": resolve(root, "src/vault-animated-cards-spec.json"),
  tweet: resolve(root, "src/tweet-spec.json"),
  "product-reveal": resolve(root, "src/product-reveal-track-spec.json"),
  "social-handle": resolve(root, "src/white-social-handle-spec.json"),
  "showreel-grid": resolve(root, "src/showreel-grid-spec.json"),
  "showreel-frames": resolve(root, "src/mobile-showreel-frames-spec.json"),
  "stack-hiring": resolve(root, "src/stack-hiring-spec.json"),
  slideshow: resolve(root, "src/slideshow-social-spec.json"),
  "design-preview": resolve(root, "src/design-preview-spec.json"),
  "gen-ai-features": resolve(root, "src/gen-ai-features-spec.json"),
  "vault-card-features": resolve(root, "src/vault-card-features-spec.json"),
  showcase: resolve(root, "src/showcase-spec.json"),
  "route-text": resolve(root, "src/route-text-spec.json"),
  "color-blend": resolve(root, "src/color-blend-blocks-spec.json"),
};

// ── Preset resolutions ──
const PRESETS = {
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "4:3": { width: 1200, height: 900 },
};

// ── Template-specific content adjustments per aspect ratio ──
// Adjusts internal sizing so content looks right, not just the canvas.

function adjustContent(template, spec, width, height) {
  const ratio = width / height;

  switch (template) {
    case "search-bar": {
      // Search bar width should span ~80% of composition, scaled to design space
      // Design artboard is 680×120; bar is max 640px wide
      // For wider compositions, we keep bar the same design-space size (fitScale handles it)
      // No content adjustment needed — fitScale auto-adapts
      break;
    }

    case "notification": {
      // Notification artboard is 1080×312 internally
      // For wider compositions, notification auto-centers via fitScale
      // No content adjustment needed
      break;
    }

    case "inflate": {
      // InflatingText is fully responsive — uses data.width/height to compute letter size
      // No adjustment needed
      break;
    }

    case "progress-bar": {
      // Bar width should feel proportional to the composition width
      // In 1:1 (1080px wide), barWidth=540 is 50% — keep that ratio
      const designBarRatio = 540 / 1080;
      spec.barWidth = Math.round(width * designBarRatio);
      break;
    }

    case "web-screens": {
      // AnimatedWebScreens has internal ARTBOARD 1600×1200 with fitScale
      // No content adjustment needed
      break;
    }

    case "blur-scroller": {
      // BlurTextScroller has internal design space 750×750 with fitScale
      // No content adjustment needed — auto-scales
      break;
    }

    case "vault-cards": {
      // VaultAnimatedCards uses fitScale based on min(w,h)/1080
      // No content adjustment needed — grid auto-scales
      break;
    }

    case "captions": {
      // KineticCaptions has hard-coded font sizes — scale them for the target resolution
      // Base design is 1080×1920 (9:16), font sizes tuned for that
      const baseH = 1920;
      const scale = height / baseH;
      // Only adjust if groups exist and scale differs significantly
      if (spec.groups && Math.abs(scale - 1) > 0.1) {
        // We don't touch individual word styles, but we could add a fontScale field
        // For now, just document that captions are optimized for 9:16
        console.log(
          `  ⚠  KineticCaptions font sizes are optimized for 9:16 (1080×1920).`
        );
        console.log(
          `     At ${width}×${height}, text may appear ${ scale < 1 ? "smaller" : "larger"} than intended.`
        );
      }
      break;
    }

    case "tweet":
    case "social-handle":
    case "showreel-grid":
    case "showreel-frames":
    case "slideshow":
    case "design-preview":
    case "gen-ai-features":
    case "vault-card-features":
    case "showcase":
    case "color-blend": {
      // These templates use fitScale or internal design spaces — no content adjustment needed
      break;
    }

    case "product-reveal": {
      // ProductRevealTrack uses fitScale internally — no content adjustment needed
      break;
    }

    case "stack-hiring": {
      // Scale title and role font sizes proportionally to height change
      const baseH = 1350; // original 4:5 design height
      const scale = height / baseH;
      if (Math.abs(scale - 1) > 0.15) {
        console.log(
          `  ⚠  StackHiring fonts are tuned for 4:5 (1080×1350). At ${width}×${height}, consider adjusting --titleFontSize and --roleFontSize.`
        );
      }
      break;
    }

    case "route-text": {
      // Scale fontSize and rowHeight proportionally to height change
      const baseH = 1080; // original 16:9 design height
      const scale = height / baseH;
      if (Math.abs(scale - 1) > 0.15) {
        spec.fontSize = Math.round(220 * scale);
        spec.rowHeight = Math.round(270 * scale);
        console.log(
          `  ℹ  RouteText: auto-scaled fontSize → ${spec.fontSize}, rowHeight → ${spec.rowHeight}`
        );
      }
      break;
    }
  }
}

// ── Helpers ──

function loadSpec(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveSpec(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function parseResolution(input) {
  // Check presets first
  if (PRESETS[input]) return PRESETS[input];

  // Try WxH or WIDTHxHEIGHT format
  const match = input.match(/^(\d+)[x×X](\d+)$/);
  if (match) {
    return { width: Number(match[1]), height: Number(match[2]) };
  }

  return null;
}

function applyAspect(template, resolution) {
  const specPath = SPECS[template];
  const spec = loadSpec(specPath);
  const oldW = spec.width;
  const oldH = spec.height;

  spec.width = resolution.width;
  spec.height = resolution.height;

  // Run template-specific content adjustments
  adjustContent(template, spec, resolution.width, resolution.height);

  saveSpec(specPath, spec);

  const specFile = specPath.replace(root + "/", "");
  console.log(`  ${template}: ${oldW}×${oldH} → ${resolution.width}×${resolution.height}  (${specFile})`);
}

// ── Main ──

const [target, ratioInput] = process.argv.slice(2);

if (!target || !ratioInput) {
  console.log("set-aspect — Change template aspect ratio / resolution\n");
  console.log("Usage: node scripts/set-aspect.mjs <template|all> <preset|WxH>\n");
  console.log("Templates:");
  Object.keys(SPECS).forEach((t) => console.log(`  ${t}`));
  console.log("  all            (apply to every template)\n");
  console.log("Presets:");
  Object.entries(PRESETS).forEach(([name, { width, height }]) => {
    const label = {
      "1:1": "Square (Instagram post)",
      "9:16": "Vertical (Stories, Reels, TikTok)",
      "16:9": "Landscape (YouTube, presentations)",
      "4:5": "Portrait (Instagram feed)",
      "4:3": "Classic (presentations)",
    }[name];
    console.log(`  ${name.padEnd(10)} ${width}×${height}  ${label}`);
  });
  console.log("\nCustom:  node scripts/set-aspect.mjs search-bar 1280x720");
  console.log("\nExamples:");
  console.log('  npm run aspect -- search-bar 9:16');
  console.log('  npm run aspect -- all 16:9');
  console.log('  npm run aspect -- progress-bar 1280x720');
  process.exit(target ? 1 : 0);
}

const resolution = parseResolution(ratioInput);
if (!resolution) {
  console.error(`✗ Unknown resolution: "${ratioInput}"`);
  console.error('  Use a preset (1:1, 9:16, 16:9, 4:5, 4:3) or WxH (e.g. 1280x720)');
  process.exit(1);
}

if (target === "all") {
  console.log(`✓ Updating all templates to ${resolution.width}×${resolution.height}`);
  Object.keys(SPECS).forEach((t) => applyAspect(t, resolution));
} else if (SPECS[target]) {
  console.log(`✓ Updating ${target} to ${resolution.width}×${resolution.height}`);
  applyAspect(target, resolution);
} else {
  console.error(`✗ Unknown template: "${target}"`);
  console.error(`  Available: ${Object.keys(SPECS).join(", ")}, all`);
  process.exit(1);
}
