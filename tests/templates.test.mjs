/**
 * Smoke tests for template folder structure.
 * Verifies each template folder has required files and SKILL.md.
 *
 * Run: node --test tests/templates.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const templatesDir = resolve(root, "src", "templates");

// Get all template folders (exclude index.ts and other files)
const templateFolders = readdirSync(templatesDir).filter((entry) => {
  try {
    return readdirSync(resolve(templatesDir, entry)).length > 0;
  } catch {
    return false;
  }
});

// Pipeline-only templates (no standalone spec or SKILL.md expected)
const pipelineOnly = new Set([
  "ImpactNumber", "TypewriterReveal", "QuoteHighlight", "TextFocusZoom",
  "ListReveal", "FloatingObjects", "GlassPanel", "IconGrid", "StackedBars",
  "ParallaxLayers", "TitleSlide", "SplitCompare", "Timeline", "CallToAction",
  "QuestionReveal", "TransitionWipe", "Atmosphere", "LogoReveal", "CountUp",
  "GlobeScene", "AnimatedChart", "SvgMorph", "LottieScene", "ParticleField",
  "ThreeScene", "VideoOverlay", "AudioWaveform",
]);

const standaloneFolders = templateFolders.filter((f) => !pipelineOnly.has(f));

describe("Template folder structure", () => {
  for (const folder of templateFolders) {
    const folderPath = resolve(templatesDir, folder);

    it(`${folder}/ has index.ts`, () => {
      assert.ok(
        existsSync(resolve(folderPath, "index.ts")),
        `${folder}/ is missing index.ts`
      );
    });

    it(`${folder}/ has a .tsx component file`, () => {
      const files = readdirSync(folderPath);
      const hasTsx = files.some((f) => f.endsWith(".tsx"));
      assert.ok(hasTsx, `${folder}/ is missing a .tsx component file`);
    });
  }
});

describe("Standalone templates have SKILL.md", () => {
  for (const folder of standaloneFolders) {
    it(`${folder}/ has SKILL.md`, () => {
      const skillPath = resolve(templatesDir, folder, "SKILL.md");
      assert.ok(
        existsSync(skillPath),
        `Standalone template ${folder}/ is missing SKILL.md`
      );
    });
  }
});

describe("Standalone templates have spec JSON", () => {
  const srcDir = resolve(root, "src");
  const specFiles = readdirSync(srcDir).filter((f) => f.endsWith("-spec.json"));

  it(`at least 21 standalone spec files exist`, () => {
    assert.ok(
      specFiles.length >= 21,
      `Expected >= 21 spec files, found ${specFiles.length}`
    );
  });
});
