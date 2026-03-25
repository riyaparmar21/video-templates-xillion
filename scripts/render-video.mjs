#!/usr/bin/env node
// Simple wrapper to render the latest spec with Remotion CLI.
// Usage: npm run render -- output/my-video.mp4

import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Output path from CLI arg or default
const outPath = resolve(projectRoot, process.argv[2] || "output/render.mp4");
mkdirSync(dirname(outPath), {recursive: true});

// Load the latest spec written by generate.py
const spec = readFileSync(join(projectRoot, "src", "latest-spec.json"), "utf8");
const props = JSON.stringify({specJson: spec});

const args = [
  "remotion",
  "render",
  "src/index.ts",
  "GeneratedVideo",
  outPath,
  "--props",
  props,
];

console.log("[render-video] Running:", ["npx", ...args].join(" "));
execFileSync("npx", args, {stdio: "inherit", cwd: projectRoot});

console.log("\n[render-video] Done →", outPath);
