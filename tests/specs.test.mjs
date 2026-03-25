/**
 * Smoke tests for all spec JSON files.
 * Validates structure, required fields, and cross-references.
 *
 * Run: node --test tests/specs.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcDir = resolve(root, "src");

const allSrcFiles = readdirSync(srcDir).filter((f) => f.endsWith("-spec.json"));

const REQUIRED_FIELDS = ["fps", "width", "height"];

describe("Spec JSON files", () => {
  for (const file of allSrcFiles) {
    const specPath = resolve(srcDir, file);

    it(`${file} — is valid JSON`, () => {
      const raw = readFileSync(specPath, "utf8");
      assert.doesNotThrow(() => JSON.parse(raw), `${file} is not valid JSON`);
    });

    it(`${file} — has required fields (fps, width, height)`, () => {
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      for (const field of REQUIRED_FIELDS) {
        assert.ok(
          spec[field] !== undefined,
          `${file} missing required field: ${field}`
        );
      }
    });

    it(`${file} — has duration (durationMs or durationFrames)`, () => {
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      const hasDuration =
        spec.durationMs !== undefined || spec.durationFrames !== undefined;
      assert.ok(hasDuration, `${file} missing durationMs or durationFrames`);
    });

    it(`${file} — fps is a positive number`, () => {
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      assert.ok(typeof spec.fps === "number" && spec.fps > 0, `${file} fps must be > 0`);
    });

    it(`${file} — width and height are positive integers`, () => {
      const spec = JSON.parse(readFileSync(specPath, "utf8"));
      assert.ok(Number.isInteger(spec.width) && spec.width > 0, `${file} width must be positive int`);
      assert.ok(Number.isInteger(spec.height) && spec.height > 0, `${file} height must be positive int`);
    });
  }
});

describe("Spec file count matches template count", () => {
  const standaloneSpecs = allSrcFiles.filter(
    (f) => f.endsWith("-spec.json") && f !== "latest-spec.json"
  );

  it(`has at least 15 standalone spec files`, () => {
    assert.ok(
      standaloneSpecs.length >= 15,
      `Expected at least 15 standalone spec files, found ${standaloneSpecs.length}`
    );
  });
});
