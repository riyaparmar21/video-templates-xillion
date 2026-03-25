#!/usr/bin/env node
/**
 * Postinstall script — verifies platform-specific native bindings exist.
 *
 * npm has a known bug (https://github.com/npm/cli/issues/4828) where it
 * silently skips optional platform-specific packages. This script detects
 * the problem immediately after `npm install` and tells you how to fix it.
 */

const os = require("os");
const path = require("path");
const fs = require("fs");

const platform = os.platform();   // "darwin", "linux", "win32"
const arch = os.arch();           // "arm64", "x64"

const checks = [];

// rspack binding
const rspackPkg = `@rspack/binding-${platform}-${arch === "arm64" ? "arm64" : "x64"}`;
const rspackDir = path.join(__dirname, "..", "node_modules", "@rspack", `binding-${platform}-${arch === "arm64" ? "arm64" : "x64"}`);
checks.push({ name: rspackPkg, dir: rspackDir });

// Also check the .node file directly in @rspack/binding/
const rspackNode = path.join(
  __dirname, "..", "node_modules", "@rspack", "binding",
  `rspack.${platform}-${arch === "arm64" ? "arm64" : "x64"}.node`
);

// Remotion compositor
const remotionSuffix = platform === "darwin"
  ? `darwin-${arch}`
  : `linux-${arch}-gnu`;
const remotionPkg = `@remotion/compositor-${remotionSuffix}`;
const remotionDir = path.join(__dirname, "..", "node_modules", "@remotion", `compositor-${remotionSuffix}`);
checks.push({ name: remotionPkg, dir: remotionDir });

// Check ffmpeg dylibs for remotion
const ffmpegBin = path.join(remotionDir, "ffmpeg");

let allGood = true;
const missing = [];

for (const check of checks) {
  if (!fs.existsSync(check.dir)) {
    allGood = false;
    missing.push(check.name);
  }
}

// Check rspack .node file
if (!fs.existsSync(rspackNode) && !fs.existsSync(rspackDir)) {
  allGood = false;
  if (!missing.includes(rspackPkg)) {
    missing.push(rspackPkg);
  }
}

// Check ffmpeg binary and dylibs
if (fs.existsSync(remotionDir)) {
  if (platform === "darwin") {
    const dylibs = ["libavcodec.dylib", "libavfilter.dylib", "libavformat.dylib", "libavutil.dylib", "libswresample.dylib", "libswscale.dylib"];
    const missingDylibs = dylibs.filter(d => !fs.existsSync(path.join(remotionDir, d)));
    if (missingDylibs.length > 0) {
      allGood = false;
      missing.push(`${remotionPkg} (missing: ${missingDylibs.join(", ")})`);
    }
  }
}

if (allGood) {
  console.log(`[postinstall] ✓ Native bindings verified for ${platform}-${arch}`);
} else {
  console.error(`\n${"=".repeat(60)}`);
  console.error(`  ⚠  MISSING NATIVE BINDINGS (${platform}-${arch})`);
  console.error(`${"=".repeat(60)}`);
  console.error(`\n  The following packages failed to install:\n`);
  for (const m of missing) {
    console.error(`    ✗ ${m}`);
  }
  console.error(`\n  This is a known npm bug. Fix it by running:\n`);
  console.error(`    rm -rf node_modules package-lock.json`);
  console.error(`    npm install --force`);
  console.error(`\n  Or install the missing packages directly:\n`);
  for (const m of missing) {
    const pkgName = m.split(" ")[0]; // strip the "(missing: ...)" suffix
    console.error(`    npm install ${pkgName}`);
  }
  console.error(`\n${"=".repeat(60)}\n`);
  // Don't exit(1) — let the install complete, just warn loudly
}
