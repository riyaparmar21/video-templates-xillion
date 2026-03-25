#!/usr/bin/env bash
#
# Fetch SVGs from Iconify API
# Downloads curated icons from multiple icon sets via Iconify's free API.
# No authentication required. No rate limits for reasonable usage.
#
# Usage: ./fetch-iconify.sh
# Requires: curl, mkdir
# Internet: YES (will not work offline)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SVG_DIR="$(dirname "$SCRIPT_DIR")/assets/svg/iconify"
API_BASE="https://api.iconify.design"

mkdir -p "$SVG_DIR"

# Curated list of useful icons for video templates
# Format: "icon-set:icon-name" -> saved as "icon-set--icon-name.svg"
ICONS=(
    # Material Design Icons (mdi)
    "mdi:movie-open"
    "mdi:filmstrip"
    "mdi:animation"
    "mdi:transition"
    "mdi:image-filter-vintage"
    "mdi:sparkles"
    "mdi:gradient-horizontal"
    "mdi:blur"
    "mdi:timer-sand"
    "mdi:auto-fix"
    # Phosphor Icons
    "ph:film-strip"
    "ph:camera"
    "ph:video-camera"
    "ph:waveform"
    "ph:equalizer"
    "ph:sparkle"
    "ph:magic-wand"
    "ph:paint-brush"
    "ph:palette"
    "ph:circles-three"
    # Tabler Icons
    "tabler:brand-cinema-4d"
    "tabler:color-filter"
    "tabler:photo-edit"
    "tabler:ripple"
    "tabler:wave-sine"
    "tabler:prism"
    "tabler:lollipop"
    "tabler:topology-star-3"
    "tabler:3d-cube-sphere"
    "tabler:shape"
    # Lucide (via Iconify)
    "lucide:clapperboard"
    "lucide:scan"
    "lucide:layers"
    "lucide:blend"
    "lucide:aperture"
    # Carbon
    "carbon:chart-ring"
    "carbon:flow"
    "carbon:network-3"
    "carbon:data-vis-1"
    "carbon:star-review"
)

echo "Fetching ${#ICONS[@]} icons from Iconify API..."
echo ""

success=0
fail=0

for icon in "${ICONS[@]}"; do
    # Split "set:name" into parts
    set_name="${icon%%:*}"
    icon_name="${icon##*:}"
    filename="${set_name}--${icon_name}.svg"
    url="${API_BASE}/${set_name}/${icon_name}.svg?width=24&height=24"

    if curl -sf -o "$SVG_DIR/$filename" "$url"; then
        echo "  ✓ $icon"
        ((success++))
    else
        echo "  ✗ $icon (failed)"
        ((fail++))
    fi

    # Small delay to be respectful
    sleep 0.1
done

echo ""
echo "Done: $success downloaded, $fail failed"
echo "Location: $SVG_DIR"
