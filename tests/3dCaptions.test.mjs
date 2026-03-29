import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const specPath = resolve(root, "src", "3dCaptions-spec.json");
const planPath = resolve(root, "public", "3dCaptions", "demo", "plan.json");
const manifestPath = resolve(root, "public", "3dCaptions", "demo", "mask-manifest.json");
const transcriptPath = resolve(root, "public", "3dCaptions", "demo", "transcript.json");

describe("3dCaptions sample assets", () => {
  it("has a standalone spec", () => {
    assert.ok(existsSync(specPath), "src/3dCaptions-spec.json is missing");
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    assert.equal(spec.videoSrc, "3dCaptions/demo/source.mp4");
    assert.equal(spec.planSrc, "3dCaptions/demo/plan.json");
    assert.equal(spec.maskManifestSrc, "3dCaptions/demo/mask-manifest.json");
    assert.equal(spec.fps, 30);
  });

  it("has a valid public plan", () => {
    assert.ok(existsSync(planPath), "public/3dCaptions/demo/plan.json is missing");
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    assert.equal(plan.jobId, "demo");
    assert.ok(Array.isArray(plan.blocks) && plan.blocks.length > 0, "plan blocks missing");
  });

  it("has a valid mask manifest", () => {
    assert.ok(existsSync(manifestPath), "public/3dCaptions/demo/mask-manifest.json is missing");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.jobId, "demo");
    assert.equal(manifest.maskPattern, "3dCaptions/demo/masks/mask_%05d.png");
    assert.ok(manifest.frameCount > 0, "mask manifest frameCount missing");
    const firstMask = resolve(root, "public", manifest.maskPattern.replace("%05d", "00001"));
    assert.ok(existsSync(firstMask), `missing first mask: ${firstMask}`);
  });

  it("has a transcript sample", () => {
    assert.ok(existsSync(transcriptPath), "public/3dCaptions/demo/transcript.json is missing");
    const transcript = JSON.parse(readFileSync(transcriptPath, "utf8"));
    assert.ok(Array.isArray(transcript.segments), "segments missing from transcript");
  });
});
