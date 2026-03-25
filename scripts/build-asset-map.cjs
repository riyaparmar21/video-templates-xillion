#!/usr/bin/env node
/**
 * build-asset-map.js
 *
 * Scans public/assets/ for all project folders and builds a role → path map.
 * Writes src/asset-map.json so the spec can reference assets by role name
 * (e.g. "@kanban") instead of hardcoded paths (e.g. "assets/saas_v3/kanban.jpeg").
 *
 * Role detection: the filename (without extension) becomes the role.
 *   - "kanban.jpeg" → role "kanban"
 *   - "dashboard.png" → role "dashboard"
 *   - "logo.jpeg" → role "logo"
 *   - "my-product-hero.jpg" → role "my-product-hero"
 *
 * Usage:
 *   node scripts/build-asset-map.js                    # scans all projects
 *   node scripts/build-asset-map.js --project saas_v3  # scans specific project
 */

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const ASSETS_DIR = path.join(PUBLIC_DIR, "assets");
const OUTPUT_FILE = path.resolve(__dirname, "..", "src", "asset-map.json");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".aac"]);

function classifyFile(ext) {
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return "other";
}

function scanProject(projectDir, projectName) {
  const entries = {};
  if (!fs.existsSync(projectDir)) return entries;

  const files = fs.readdirSync(projectDir);
  for (const file of files) {
    const fullPath = path.join(projectDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    const role = path.basename(file, ext).toLowerCase().replace(/\s+/g, "-");
    const relativePath = `assets/${projectName}/${file}`;

    // If role already exists, keep the most recently modified file
    if (entries[role] && entries[role].modified > stat.mtimeMs) {
      continue;
    }
    entries[role] = {
      path: relativePath,
      type: classifyFile(ext),
      size: stat.size,
      modified: stat.mtimeMs,
    };
  }
  return entries;
}

function main() {
  const args = process.argv.slice(2);
  let targetProject = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" && args[i + 1]) {
      targetProject = args[i + 1];
      i++;
    }
  }

  const assetMap = {};

  if (!fs.existsSync(ASSETS_DIR)) {
    console.log("No assets directory found, writing empty map.");
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assetMap, null, 2));
    return;
  }

  const projects = targetProject
    ? [targetProject]
    : fs.readdirSync(ASSETS_DIR).filter((d) =>
        fs.statSync(path.join(ASSETS_DIR, d)).isDirectory()
      );

  for (const project of projects) {
    const projectDir = path.join(ASSETS_DIR, project);
    assetMap[project] = scanProject(projectDir, project);
  }

  // Also build a "latest" key that points to the most recently modified project
  let latestProject = null;
  let latestTime = 0;
  for (const [proj, entries] of Object.entries(assetMap)) {
    for (const entry of Object.values(entries)) {
      if (entry.modified > latestTime) {
        latestTime = entry.modified;
        latestProject = proj;
      }
    }
  }
  if (latestProject) {
    assetMap._latest = latestProject;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assetMap, null, 2));
  console.log(`Asset map written to ${OUTPUT_FILE}`);
  console.log(`Projects: ${projects.join(", ")}`);
  if (latestProject) {
    console.log(`Latest project: ${latestProject}`);
  }
  for (const project of projects) {
    const roles = Object.keys(assetMap[project]);
    console.log(`  ${project}: ${roles.join(", ")}`);
  }
}

main();
