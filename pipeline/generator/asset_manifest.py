"""
Asset Manifest Builder

Scans a user-provided assets folder, classifies each file by type
(logo, product, lifestyle, icon, texture, screenshot, data-visual, uncategorized),
extracts metadata (dimensions, dominant colors via PIL), and outputs a structured
JSON manifest.

Extends MediaInventory from generator/media.py for scanning and captioning.

Usage:
    from generator.asset_manifest import build_manifest

    manifest = await build_manifest(
        assets_dir="./test_scripts/assets_saas",
        caption_images=False,
    )
"""

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

from generator.media import MediaInventory, IMAGE_EXTS, SVG_EXTS


def _get_image_dimensions(filepath: str) -> Optional[Dict[str, int]]:
    """Get image width/height using PIL if available."""
    if not PIL_AVAILABLE:
        return None
    try:
        with PILImage.open(filepath) as img:
            return {"width": img.width, "height": img.height}
    except Exception:
        return None


# ── Classification patterns ──

CATEGORY_PATTERNS: Dict[str, List[str]] = {
    "logo":        ["logo", "brand", "mark", "wordmark", "logotype"],
    "product":     ["product", "hero", "screenshot", "app", "device", "mockup", "phone"],
    "lifestyle":   ["photo", "lifestyle", "team", "people", "person", "group", "office"],
    "icon":        ["icon", "glyph", "symbol", "emoji"],
    "texture":     ["bg", "background", "texture", "pattern", "gradient", "noise"],
    "screenshot":  ["screen", "ui", "dashboard", "web", "interface", "wireframe"],
    "data-visual": ["chart", "graph", "diagram", "infographic", "data", "analytics"],
}

# Dimension-based heuristics (width, height thresholds)
SMALL_THRESHOLD = 256   # icons/logos tend to be ≤256px
LARGE_THRESHOLD = 1200  # textures/backgrounds tend to be ≥1200px


def classify_asset(
    filename: str,
    ext: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    has_transparency: bool = False,
) -> str:
    """
    Classify an asset into a category based on filename patterns and image dimensions.

    Priority: filename match > dimension heuristics > format heuristics > uncategorized
    """
    name_lower = Path(filename).stem.lower()
    name_tokens = re.split(r'[-_.\s]+', name_lower)

    # 1. Filename pattern matching (highest priority)
    for category, keywords in CATEGORY_PATTERNS.items():
        for keyword in keywords:
            if keyword in name_tokens or keyword in name_lower:
                return category

    # 2. Format-based heuristics
    if ext == ".svg":
        # SVGs are usually icons or logos
        return "icon"

    # 3. Dimension-based heuristics (only for images)
    if width and height:
        max_dim = max(width, height)
        min_dim = min(width, height)

        # Tiny + transparent PNG → likely logo
        if max_dim <= SMALL_THRESHOLD and has_transparency:
            return "logo"

        # Very small → icon
        if max_dim <= SMALL_THRESHOLD:
            return "icon"

        # Small-ish with transparency → logo
        if max_dim <= 512 and has_transparency:
            return "logo"

        # Large + roughly square → texture/background
        if min_dim >= LARGE_THRESHOLD and 0.7 <= (min_dim / max_dim) <= 1.0:
            return "texture"

        # Desktop ratio (roughly 16:9 or 16:10) + medium-large → screenshot
        aspect = max_dim / min_dim if min_dim > 0 else 1
        if 1.5 <= aspect <= 2.0 and max_dim >= 800:
            return "screenshot"

        # Tall aspect (phone) + medium-large → product/app screenshot
        if aspect >= 1.8 and height > width and max_dim >= 600:
            return "product"

    return "uncategorized"


def _check_transparency(filepath: str) -> bool:
    """Check if a PNG has an alpha channel with transparency."""
    if not PIL_AVAILABLE:
        return False
    try:
        with PILImage.open(filepath) as img:
            if img.mode in ("RGBA", "LA", "PA"):
                # Check if alpha actually has transparent pixels
                if img.mode == "RGBA":
                    alpha = img.getchannel("A")
                    extrema = alpha.getextrema()
                    return extrema[0] < 255  # Has at least some transparency
            return False
    except Exception:
        return False


def extract_dominant_colors(filepath: str, n_colors: int = 5) -> List[str]:
    """
    Extract dominant colors from an image using PIL's getcolors on a downsampled version.
    Returns hex color strings sorted by frequency.
    """
    if not PIL_AVAILABLE:
        return []
    try:
        with PILImage.open(filepath) as img:
            # Downsample for speed
            img = img.convert("RGB").resize((100, 100), PILImage.LANCZOS)
            colors = img.getcolors(maxcolors=10000)
            if not colors:
                return []

            # Sort by count (most frequent first)
            colors.sort(key=lambda c: c[0], reverse=True)

            # Convert to hex, skipping near-duplicates
            seen: List[str] = []
            for count, (r, g, b) in colors:
                hex_color = f"#{r:02X}{g:02X}{b:02X}"
                # Skip if too close to an already-seen color
                is_dupe = False
                for s in seen:
                    sr, sg, sb = int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)
                    if abs(r - sr) + abs(g - sg) + abs(b - sb) < 60:
                        is_dupe = True
                        break
                if not is_dupe:
                    seen.append(hex_color)
                if len(seen) >= n_colors:
                    break
            return seen
    except Exception:
        return []


async def build_manifest(
    assets_dir: str,
    caption_images: bool = False,
) -> Dict[str, Any]:
    """
    Build a structured asset manifest from a folder of media files.

    Args:
        assets_dir: Path to the assets folder
        caption_images: Whether to generate AI captions for images

    Returns:
        Structured manifest dict with by_category grouping, metadata, and colors.
    """
    assets_path = Path(assets_dir)
    if not assets_path.exists():
        raise FileNotFoundError(f"Assets directory not found: {assets_dir}")

    # Use MediaInventory for scanning
    inv = MediaInventory(str(assets_path))

    if caption_images:
        items = await inv.scan_with_captions()
    else:
        items = inv.scan()

    # Enrich each item with classification, colors, and transparency
    enriched_items: List[Dict[str, Any]] = []

    for item in items:
        filepath = str(assets_path / item["path"])
        ext = Path(item["path"]).suffix.lower()

        # Read dimensions from MediaInventory output (top-level width/height)
        # or from a nested "dimensions" dict — support both formats
        dims_dict = item.get("dimensions")
        if dims_dict and isinstance(dims_dict, dict):
            width = dims_dict.get("width")
            height = dims_dict.get("height")
        else:
            width = item.get("width")
            height = item.get("height")

        # If still no dimensions, try PIL directly (handles AVIF, JPEG, etc.)
        if not width or not height:
            pil_dims = _get_image_dimensions(filepath)
            if pil_dims:
                width = pil_dims["width"]
                height = pil_dims["height"]

        has_transparency = False
        if ext == ".png":
            has_transparency = _check_transparency(filepath)

        category = classify_asset(
            filename=item["path"],
            ext=ext,
            width=width,
            height=height,
            has_transparency=has_transparency,
        )

        # Extract dominant colors for images
        dominant_colors: List[str] = []
        if ext in IMAGE_EXTS and ext != ".svg":
            dominant_colors = extract_dominant_colors(filepath, n_colors=5)

        # Always store dimensions as a dict for downstream consumers
        dimensions = {"width": width, "height": height} if width and height else None

        enriched = {
            "path": item["path"],
            "filename": Path(item["path"]).name,
            "description": item.get("description", ""),
            "category": category,
            "media_type": item.get("type", "image"),
            "ext": ext,
            "file_size": item.get("size", ""),
            "dimensions": dimensions,
            "has_transparency": has_transparency,
            "dominant_colors": dominant_colors,
        }

        # Include caption if available
        if item.get("caption"):
            enriched["caption"] = item["caption"]

        enriched_items.append(enriched)

    # Group by category
    by_category: Dict[str, List[Dict[str, Any]]] = {}
    for item in enriched_items:
        cat = item["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(item)

    # Category summary
    category_summary = {cat: len(items) for cat, items in sorted(by_category.items())}

    manifest = {
        "source_dir": str(assets_path.resolve()),
        "asset_count": len(enriched_items),
        "category_summary": category_summary,
        "by_category": by_category,
        "assets": enriched_items,
    }

    # Print summary
    print(f"   [Asset Manifest] {len(enriched_items)} assets classified:")
    for cat, count in category_summary.items():
        print(f"      {cat}: {count}")

    return manifest
