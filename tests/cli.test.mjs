/**
 * Smoke tests for CLI scripts.
 * Verifies help output works and known templates are accepted.
 *
 * Run: node --test tests/cli.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", timeout: 10000 });
}

function runMayFail(cmd) {
  try {
    return execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    // CLI exits with code 0 or 1 for help — capture combined output
    return (e.stdout || "") + (e.stderr || "");
  }
}

describe("set-text.mjs", () => {
  it("shows help without error", () => {
    const out = runMayFail("node scripts/set-text.mjs");
    assert.ok(out.includes("set-text"), "Help should mention set-text");
    assert.ok(out.includes("Templates:"), "Help should list templates");
  });

  const expectedTemplates = [
    "search-bar",
    "notification",
    "inflate",
    "progress-bar",
    "blur-scroller",
    "vault-cards",
    "tweet",
    "product-reveal",
    "social-handle",
    "showreel-grid",
    "showreel-frames",
    "stack-hiring",
    "slideshow",
    "design-preview",
    "gen-ai-features",
    "vault-card-features",
    "showcase",
    "route-text",
    "web-screens",
  ];

  for (const tpl of expectedTemplates) {
    it(`lists "${tpl}" in help`, () => {
      const out = runMayFail("node scripts/set-text.mjs");
      assert.ok(
        out.includes(tpl),
        `Help output should mention template "${tpl}"`
      );
    });
  }

  it("shows font flags in help", () => {
    const out = runMayFail("node scripts/set-text.mjs");
    assert.ok(out.includes("Font flags"), "Help should have Font flags section");
    assert.ok(out.includes("--titleFont"), "Should list --titleFont");
    assert.ok(out.includes("--headlineFont"), "Should list --headlineFont");
    assert.ok(out.includes("--labelFont"), "Should list --labelFont");
  });
});

describe("set-aspect.mjs", () => {
  it("shows help without error", () => {
    const out = runMayFail("node scripts/set-aspect.mjs");
    assert.ok(out.includes("set-aspect"), "Help should mention set-aspect");
    assert.ok(out.includes("Presets:"), "Help should list presets");
  });

  const expectedTemplates = [
    "search-bar",
    "notification",
    "inflate",
    "progress-bar",
    "web-screens",
    "captions",
    "blur-scroller",
    "vault-cards",
    "tweet",
    "product-reveal",
    "social-handle",
    "showreel-grid",
    "showreel-frames",
    "stack-hiring",
    "slideshow",
    "design-preview",
    "gen-ai-features",
    "vault-card-features",
    "showcase",
    "route-text",
    "color-blend",
  ];

  for (const tpl of expectedTemplates) {
    it(`supports "${tpl}" template`, () => {
      const out = runMayFail("node scripts/set-aspect.mjs");
      assert.ok(
        out.includes(tpl),
        `Help output should list template "${tpl}"`
      );
    });
  }
});

describe("set-screens.mjs", () => {
  it("shows help without error", () => {
    const out = runMayFail("node scripts/set-screens.mjs");
    assert.ok(
      out.includes("set-screens") || out.includes("screens") || out.includes("Usage"),
      "Help should show usage info"
    );
  });
});
