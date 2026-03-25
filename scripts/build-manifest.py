#!/usr/bin/env python3
"""
SVG Manifest Builder
Scans assets/svg/ and creates a manifest.json index for programmatic lookup.

The manifest enables:
- Quick lookup of SVGs by category or name
- Metadata extraction (viewBox, element count, path data)
- Integration with Remotion component props
"""

import os
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

BASE_DIR = str(Path(__file__).parent.parent / "assets" / "svg")
MANIFEST_PATH = os.path.join(BASE_DIR, "manifest.json")


def extract_metadata(filepath: str) -> dict:
    """Extract useful metadata from an SVG file."""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except ET.ParseError:
        return {"error": "Invalid XML"}

    ns = "{http://www.w3.org/2000/svg}"
    viewbox = root.attrib.get("viewBox", "")

    # Count elements
    element_count = sum(1 for _ in root.iter()) - 1  # exclude root

    # Identify element types used
    element_types = set()
    for elem in root.iter():
        tag = elem.tag.replace(ns, "")
        if tag != "svg":
            element_types.add(tag)

    # Check if it has animatable paths
    has_paths = any(
        elem.tag.replace(ns, "") in ("path", "line", "polyline", "polygon")
        for elem in root.iter()
    )

    # File size
    file_size = os.path.getsize(filepath)

    return {
        "viewBox": viewbox,
        "elements": element_count,
        "elementTypes": sorted(element_types),
        "hasAnimatablePaths": has_paths,
        "fileSize": file_size,
    }


def main():
    if not os.path.exists(BASE_DIR):
        print(f"ERROR: SVG directory not found: {BASE_DIR}")
        sys.exit(1)

    manifest = {
        "version": "1.0.0",
        "generated": datetime.now().isoformat(),
        "basePath": "assets/svg",
        "categories": {},
        "totalCount": 0,
    }

    total = 0
    categories = sorted([
        d for d in os.listdir(BASE_DIR)
        if os.path.isdir(os.path.join(BASE_DIR, d))
    ])

    for category in categories:
        cat_dir = os.path.join(BASE_DIR, category)
        svg_files = sorted([f for f in os.listdir(cat_dir) if f.endswith(".svg")])

        icons = []
        for svg_file in svg_files:
            filepath = os.path.join(cat_dir, svg_file)
            name = svg_file.replace(".svg", "")
            meta = extract_metadata(filepath)
            icons.append({
                "name": name,
                "file": f"{category}/{svg_file}",
                "path": f"assets/svg/{category}/{svg_file}",
                **meta,
            })
            total += 1

        manifest["categories"][category] = {
            "count": len(icons),
            "icons": icons,
        }

    manifest["totalCount"] = total

    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest written to {MANIFEST_PATH}")
    print(f"  Categories: {len(categories)}")
    print(f"  Total icons: {total}")

    # Print summary
    for cat in categories:
        count = manifest["categories"][cat]["count"]
        print(f"    {cat}: {count}")


if __name__ == "__main__":
    main()
