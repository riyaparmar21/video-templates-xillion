#!/usr/bin/env bash
#
# Fetch SVG icon libraries from GitHub repos
# Downloads Iconoir and Lucide icon sets (MIT/ISC licensed).
#
# Usage: ./fetch-github-icons.sh
# Requires: git, cp
# Internet: YES (will not work offline)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/assets"
SVG_DIR="$ASSETS_DIR/svg"
TEMP_DIR="$ASSETS_DIR/.tmp-git-clones"

mkdir -p "$SVG_DIR" "$TEMP_DIR"

echo "=== Fetching Icon Libraries from GitHub ==="
echo ""

# --- Iconoir ---
echo "1. Cloning Iconoir (MIT license)..."
ICONOIR_DIR="$SVG_DIR/iconoir"
if [ -d "$ICONOIR_DIR" ] && [ "$(ls -A "$ICONOIR_DIR" 2>/dev/null)" ]; then
    echo "   Already exists, skipping (delete $ICONOIR_DIR to re-download)"
else
    rm -rf "$TEMP_DIR/iconoir"
    git clone --depth 1 --filter=blob:none --sparse https://github.com/iconoir-icons/iconoir.git "$TEMP_DIR/iconoir"
    cd "$TEMP_DIR/iconoir"
    git sparse-checkout set icons/regular
    cd -

    mkdir -p "$ICONOIR_DIR"
    cp "$TEMP_DIR/iconoir/icons/regular/"*.svg "$ICONOIR_DIR/" 2>/dev/null || true
    count=$(ls -1 "$ICONOIR_DIR/"*.svg 2>/dev/null | wc -l)
    echo "   ✓ Copied $count SVGs to $ICONOIR_DIR"
fi

echo ""

# --- Lucide ---
echo "2. Cloning Lucide (ISC license)..."
LUCIDE_DIR="$SVG_DIR/lucide"
if [ -d "$LUCIDE_DIR" ] && [ "$(ls -A "$LUCIDE_DIR" 2>/dev/null)" ]; then
    echo "   Already exists, skipping (delete $LUCIDE_DIR to re-download)"
else
    rm -rf "$TEMP_DIR/lucide"
    git clone --depth 1 --filter=blob:none --sparse https://github.com/lucide-icons/lucide.git "$TEMP_DIR/lucide"
    cd "$TEMP_DIR/lucide"
    git sparse-checkout set icons
    cd -

    mkdir -p "$LUCIDE_DIR"
    # Lucide stores each icon in its own folder with an SVG inside
    find "$TEMP_DIR/lucide/icons" -name "*.svg" -exec cp {} "$LUCIDE_DIR/" \;
    count=$(ls -1 "$LUCIDE_DIR/"*.svg 2>/dev/null | wc -l)
    echo "   ✓ Copied $count SVGs to $LUCIDE_DIR"
fi

echo ""

# --- Cleanup ---
echo "3. Cleaning up temp clones..."
rm -rf "$TEMP_DIR"
echo "   ✓ Done"

echo ""
echo "=== Summary ==="
for dir in "$SVG_DIR"/iconoir "$SVG_DIR"/lucide; do
    name=$(basename "$dir")
    if [ -d "$dir" ]; then
        count=$(ls -1 "$dir/"*.svg 2>/dev/null | wc -l)
        echo "  $name: $count SVGs"
    fi
done
