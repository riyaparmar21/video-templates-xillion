#!/usr/bin/env python3
"""
SVG Remotion Compatibility Validator
Checks every SVG in assets/svg/ for issues that would break Remotion rendering.

Checks:
1. Valid XML/SVG structure
2. Has viewBox attribute
3. No embedded scripts (<script> tags)
4. No external references (xlink:href to URLs, <image> with http)
5. No raster content (<image> with data:image or external URLs)
6. Uses currentColor (animatable color inheritance)
7. Stroke-based (has stroke attributes, not just fill)
8. No inline styles that would conflict with Remotion CSS
"""

import os
import sys
import xml.etree.ElementTree as ET
import re
from pathlib import Path

BASE_DIR = str(Path(__file__).parent.parent / "assets" / "svg")

# Counters
passed = 0
failed = 0
warnings_total = 0


def validate_svg(filepath: str) -> tuple:
    """Validate a single SVG file. Returns (errors, warnings)."""
    errors = []
    warnings = []
    relpath = os.path.relpath(filepath, BASE_DIR)

    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
    except ET.ParseError as e:
        return [f"Invalid XML: {e}"], []

    # Strip namespace for easier tag checking
    ns = "{http://www.w3.org/2000/svg}"

    # 1. Check root is <svg>
    tag = root.tag.replace(ns, "")
    if tag != "svg":
        errors.append(f"Root element is <{tag}>, expected <svg>")

    # 2. Check viewBox
    if "viewBox" not in root.attrib:
        errors.append("Missing viewBox attribute")

    # 3. Check for scripts
    for elem in root.iter():
        tag_clean = elem.tag.replace(ns, "")
        if tag_clean == "script":
            errors.append("Contains <script> element")
            break

    # 4. Check for external references
    for elem in root.iter():
        for attr in elem.attrib.values():
            if re.search(r'https?://', str(attr)):
                errors.append(f"External reference found: {attr[:80]}")
                break

    # 5. Check for raster images
    for elem in root.iter():
        tag_clean = elem.tag.replace(ns, "")
        if tag_clean == "image":
            errors.append("Contains <image> element (raster content)")
            break

    # 6. Check for currentColor usage
    svg_text = open(filepath).read()
    if "currentColor" not in svg_text:
        warnings.append("Does not use currentColor (color won't inherit from parent)")

    # 7. Check for stroke attributes
    has_stroke = "stroke" in svg_text.lower()
    if not has_stroke:
        warnings.append("No stroke attributes found (may not be animatable via stroke-dasharray)")

    # 8. Check for inline <style> blocks
    for elem in root.iter():
        tag_clean = elem.tag.replace(ns, "")
        if tag_clean == "style":
            warnings.append("Contains <style> block (may conflict with Remotion CSS)")
            break

    # 9. Check for problematic attributes
    for elem in root.iter():
        if "style" in elem.attrib:
            warnings.append("Has inline style attribute (prefer SVG attributes for Remotion)")
            break

    return errors, warnings


def main():
    global passed, failed, warnings_total

    if not os.path.exists(BASE_DIR):
        print(f"ERROR: SVG directory not found: {BASE_DIR}")
        sys.exit(1)

    svg_files = []
    for root_dir, dirs, files in os.walk(BASE_DIR):
        for f in sorted(files):
            if f.endswith(".svg"):
                svg_files.append(os.path.join(root_dir, f))

    if not svg_files:
        print("No SVG files found!")
        sys.exit(1)

    print(f"Validating {len(svg_files)} SVGs for Remotion compatibility...\n")

    for filepath in svg_files:
        relpath = os.path.relpath(filepath, BASE_DIR)
        errors, warns = validate_svg(filepath)

        if errors:
            failed += 1
            print(f"  ✗ {relpath}")
            for e in errors:
                print(f"      ERROR: {e}")
        else:
            passed += 1

        if warns:
            warnings_total += len(warns)
            if not errors:
                # Only show warnings for passing files if verbose
                pass
            for w in warns:
                print(f"      WARN: {w}")

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed, {warnings_total} warnings")
    print(f"Total files: {len(svg_files)}")

    if failed == 0:
        print("\n✓ All SVGs are Remotion-compatible!")
    else:
        print(f"\n✗ {failed} SVGs need fixes before use in Remotion")
        sys.exit(1)


if __name__ == "__main__":
    main()
