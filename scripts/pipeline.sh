#!/usr/bin/env bash
#
# Master SVG Asset Pipeline
# Runs all steps in order: generate → validate → optimize → manifest
#
# Usage:
#   ./pipeline.sh              # Run full pipeline (offline steps only)
#   ./pipeline.sh --all        # Run everything including network fetches
#   ./pipeline.sh --fetch-only # Only run network fetch scripts
#   ./pipeline.sh --no-optimize # Skip SVGO optimization
#
# Exit codes:
#   0 = success
#   1 = validation failed (SVGs have errors)
#   2 = dependency missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/assets"
SVG_DIR="$ASSETS_DIR/svg"
SVGO_CONFIG="$PROJECT_DIR/svgo.config.cjs"

# Parse flags
RUN_FETCH=false
RUN_OPTIMIZE=true
for arg in "$@"; do
    case "$arg" in
        --all) RUN_FETCH=true ;;
        --fetch-only) RUN_FETCH=true; RUN_OPTIMIZE=false ;;
        --no-optimize) RUN_OPTIMIZE=false ;;
    esac
done

echo "╔══════════════════════════════════════════╗"
echo "║     SVG Asset Pipeline                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --------------------------------------------------
# Step 0: Check dependencies
# --------------------------------------------------
echo "▸ Step 0: Checking dependencies..."

if ! command -v python3 &>/dev/null; then
    echo "  ✗ python3 not found"
    exit 2
fi
echo "  ✓ python3 $(python3 --version 2>&1 | cut -d' ' -f2)"

if [ "$RUN_OPTIMIZE" = true ]; then
    # Check if svgo is available (project-local or global)
    if npx svgo --version &>/dev/null 2>&1; then
        SVGO_VERSION=$(npx svgo --version 2>/dev/null || echo "unknown")
        echo "  ✓ svgo $SVGO_VERSION"
    else
        echo "  ⚠ svgo not found — installing..."
        cd "$PROJECT_DIR"
        npm install -D svgo
        cd -
        echo "  ✓ svgo installed"
    fi
fi

echo ""

# --------------------------------------------------
# Step 1: Generate SVG library
# --------------------------------------------------
echo "▸ Step 1: Generating SVG library..."
python3 "$SCRIPT_DIR/generate-svg-library.py"
echo ""

# --------------------------------------------------
# Step 2: Fetch from external sources (optional)
# --------------------------------------------------
if [ "$RUN_FETCH" = true ]; then
    echo "▸ Step 2a: Fetching from Iconify API..."
    bash "$SCRIPT_DIR/fetch-iconify.sh"
    echo ""

    echo "▸ Step 2b: Fetching from GitHub repos..."
    bash "$SCRIPT_DIR/fetch-github-icons.sh"
    echo ""
else
    echo "▸ Step 2: Skipping network fetches (use --all to include)"
    echo ""
fi

# --------------------------------------------------
# Step 3: Validate all SVGs
# --------------------------------------------------
echo "▸ Step 3: Validating SVGs for Remotion compatibility..."
python3 "$SCRIPT_DIR/validate-svg-remotion.py"
echo ""

# --------------------------------------------------
# Step 4: Optimize with SVGO
# --------------------------------------------------
if [ "$RUN_OPTIMIZE" = true ]; then
    echo "▸ Step 4: Optimizing SVGs with SVGO..."

    if [ ! -f "$SVGO_CONFIG" ]; then
        echo "  ✗ SVGO config not found at $SVGO_CONFIG"
        exit 2
    fi

    # Count files before
    before_size=$(find "$SVG_DIR" -name "*.svg" -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1)
    file_count=$(find "$SVG_DIR" -name "*.svg" | wc -l)

    # Run SVGO recursively on the svg directory
    cd "$PROJECT_DIR"
    npx svgo -f "$SVG_DIR" -r --config "$SVGO_CONFIG" --quiet 2>/dev/null || \
    npx svgo -f "$SVG_DIR" -r --config "$SVGO_CONFIG"
    cd -

    # Count files after
    after_size=$(find "$SVG_DIR" -name "*.svg" -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1)

    if [ "$before_size" -gt 0 ]; then
        saved=$((before_size - after_size))
        pct=$((saved * 100 / before_size))
        echo "  ✓ Optimized $file_count SVGs"
        echo "  ✓ Size: $(numfmt --to=iec $before_size 2>/dev/null || echo "$before_size bytes") → $(numfmt --to=iec $after_size 2>/dev/null || echo "$after_size bytes") (saved ${pct}%)"
    else
        echo "  ✓ Optimized $file_count SVGs"
    fi
    echo ""

    # Re-validate after optimization to make sure SVGO didn't break anything
    echo "▸ Step 4b: Re-validating after optimization..."
    python3 "$SCRIPT_DIR/validate-svg-remotion.py"
    echo ""
else
    echo "▸ Step 4: Skipping SVGO optimization (use without --no-optimize to include)"
    echo ""
fi

# --------------------------------------------------
# Step 5: Build manifest
# --------------------------------------------------
echo "▸ Step 5: Building manifest..."
python3 "$SCRIPT_DIR/build-manifest.py"
echo ""

# --------------------------------------------------
# Summary
# --------------------------------------------------
echo "╔══════════════════════════════════════════╗"
echo "║     Pipeline Complete ✓                  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Count total SVGs
total=$(find "$SVG_DIR" -name "*.svg" | wc -l)
categories=$(find "$SVG_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
echo "  Total SVGs: $total"
echo "  Categories: $categories"
echo "  Manifest: $SVG_DIR/manifest.json"
echo ""

# List categories
for dir in "$SVG_DIR"/*/; do
    if [ -d "$dir" ]; then
        name=$(basename "$dir")
        count=$(ls -1 "$dir"*.svg 2>/dev/null | wc -l)
        echo "    $name: $count"
    fi
done
