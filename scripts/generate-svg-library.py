#!/usr/bin/env python3
"""
SVG Library Generator for Remotion Video Templates
Generates 91 stroke-based, animation-ready SVGs organized by category.

All SVGs:
- 24x24 viewBox (scalable to any size)
- Stroke-based (animatable via stroke-dasharray/stroke-dashoffset)
- Use currentColor (inherits color from parent)
- Clean path data suitable for SVG morphing
- No scripts, no external references, no raster content
"""

import os
import math
from pathlib import Path

BASE_DIR = str(Path(__file__).parent.parent / "assets" / "svg")

def svg_wrap(inner: str, vb: str = "0 0 24 24") -> str:
    """Wrap SVG content in a proper SVG element."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
        f'fill="none" stroke="currentColor" stroke-width="2" '
        f'stroke-linecap="round" stroke-linejoin="round">\n{inner}\n</svg>\n'
    )

def write_svg(category: str, name: str, content: str):
    """Write an SVG file to the appropriate category folder."""
    folder = os.path.join(BASE_DIR, category)
    os.makedirs(folder, exist_ok=True)
    filepath = os.path.join(folder, f"{name}.svg")
    with open(filepath, "w") as f:
        f.write(svg_wrap(content))

# ============================================================
# GEOMETRIC (25 SVGs)
# ============================================================

def generate_geometric():
    cat = "geometric"

    # 1. circle
    write_svg(cat, "circle", '  <circle cx="12" cy="12" r="10"/>')

    # 2. circle-dot (circle with center dot)
    write_svg(cat, "circle-dot",
        '  <circle cx="12" cy="12" r="10"/>\n  <circle cx="12" cy="12" r="1"/>')

    # 3. circle-double (concentric circles)
    write_svg(cat, "circle-double",
        '  <circle cx="12" cy="12" r="10"/>\n  <circle cx="12" cy="12" r="5"/>')

    # 4. square
    write_svg(cat, "square", '  <rect x="3" y="3" width="18" height="18" rx="2"/>')

    # 5. square-rounded
    write_svg(cat, "square-rounded", '  <rect x="3" y="3" width="18" height="18" rx="5"/>')

    # 6. triangle
    write_svg(cat, "triangle", '  <polygon points="12,2 22,20 2,20"/>')

    # 7. triangle-inverted
    write_svg(cat, "triangle-inverted", '  <polygon points="2,4 22,4 12,22"/>')

    # 8. diamond
    write_svg(cat, "diamond", '  <polygon points="12,2 22,12 12,22 2,12"/>')

    # 9. pentagon
    pts = []
    for i in range(5):
        angle = math.radians(-90 + i * 72)
        pts.append(f"{12 + 10*math.cos(angle):.1f},{12 + 10*math.sin(angle):.1f}")
    write_svg(cat, "pentagon", f'  <polygon points="{" ".join(pts)}"/>')

    # 10. hexagon
    pts = []
    for i in range(6):
        angle = math.radians(-90 + i * 60)
        pts.append(f"{12 + 10*math.cos(angle):.1f},{12 + 10*math.sin(angle):.1f}")
    write_svg(cat, "hexagon", f'  <polygon points="{" ".join(pts)}"/>')

    # 11. octagon
    pts = []
    for i in range(8):
        angle = math.radians(-90 + i * 45)
        pts.append(f"{12 + 10*math.cos(angle):.1f},{12 + 10*math.sin(angle):.1f}")
    write_svg(cat, "octagon", f'  <polygon points="{" ".join(pts)}"/>')

    # 12. star-4 (4-pointed star)
    pts = []
    for i in range(8):
        angle = math.radians(-90 + i * 45)
        r = 10 if i % 2 == 0 else 4
        pts.append(f"{12 + r*math.cos(angle):.1f},{12 + r*math.sin(angle):.1f}")
    write_svg(cat, "star-4", f'  <polygon points="{" ".join(pts)}"/>')

    # 13. star-5 (5-pointed star)
    pts = []
    for i in range(10):
        angle = math.radians(-90 + i * 36)
        r = 10 if i % 2 == 0 else 4.5
        pts.append(f"{12 + r*math.cos(angle):.1f},{12 + r*math.sin(angle):.1f}")
    write_svg(cat, "star-5", f'  <polygon points="{" ".join(pts)}"/>')

    # 14. star-6 (6-pointed / Star of David)
    pts = []
    for i in range(12):
        angle = math.radians(-90 + i * 30)
        r = 10 if i % 2 == 0 else 5
        pts.append(f"{12 + r*math.cos(angle):.1f},{12 + r*math.sin(angle):.1f}")
    write_svg(cat, "star-6", f'  <polygon points="{" ".join(pts)}"/>')

    # 15. star-8 (8-pointed star)
    pts = []
    for i in range(16):
        angle = math.radians(-90 + i * 22.5)
        r = 10 if i % 2 == 0 else 5.5
        pts.append(f"{12 + r*math.cos(angle):.1f},{12 + r*math.sin(angle):.1f}")
    write_svg(cat, "star-8", f'  <polygon points="{" ".join(pts)}"/>')

    # 16. heart
    write_svg(cat, "heart",
        '  <path d="M12 21C12 21 3 13.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 12 5C12.09 3.81 13.76 3 15.5 3C18.58 3 21 5.42 21 8.5C21 13.5 12 21 12 21Z"/>')

    # 17. crescent
    write_svg(cat, "crescent",
        '  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C14.76 22 17.26 20.88 19 19C17.26 20.12 15.2 20.78 13 20.78C7.7 20.78 3.42 16.5 3.42 11.2C3.42 5.9 7.7 1.62 13 1.62C15.2 1.62 17.26 2.28 19 3.4C17.26 1.52 14.76 2 12 2Z"/>')

    # 18. cross
    write_svg(cat, "cross",
        '  <line x1="12" y1="2" x2="12" y2="22"/>\n  <line x1="2" y1="12" x2="22" y2="12"/>')

    # 19. cross-diagonal (X)
    write_svg(cat, "cross-diagonal",
        '  <line x1="4" y1="4" x2="20" y2="20"/>\n  <line x1="20" y1="4" x2="4" y2="20"/>')

    # 20. ring (thick ring)
    write_svg(cat, "ring",
        '  <circle cx="12" cy="12" r="10"/>\n  <circle cx="12" cy="12" r="6"/>')

    # 21. semicircle
    write_svg(cat, "semicircle",
        '  <path d="M2 12A10 10 0 0 1 22 12"/>\n  <line x1="2" y1="12" x2="22" y2="12"/>')

    # 22. quarter-circle
    write_svg(cat, "quarter-circle",
        '  <path d="M12 2A10 10 0 0 1 22 12"/>\n  <line x1="12" y1="2" x2="12" y2="12"/>\n  <line x1="12" y1="12" x2="22" y2="12"/>')

    # 23. parallelogram
    write_svg(cat, "parallelogram", '  <polygon points="6,4 22,4 18,20 2,20"/>')

    # 24. trapezoid
    write_svg(cat, "trapezoid", '  <polygon points="6,4 18,4 22,20 2,20"/>')

    # 25. grid (3x3)
    lines = []
    for i in range(4):
        x = 3 + i * 6
        lines.append(f'  <line x1="{x}" y1="3" x2="{x}" y2="21"/>')
        lines.append(f'  <line x1="3" y1="{x}" x2="21" y2="{x}"/>')
    write_svg(cat, "grid", "\n".join(lines))


# ============================================================
# ARROWS (12 SVGs)
# ============================================================

def generate_arrows():
    cat = "arrows"

    # 1. arrow-up
    write_svg(cat, "arrow-up",
        '  <line x1="12" y1="19" x2="12" y2="5"/>\n  <polyline points="5,12 12,5 19,12"/>')

    # 2. arrow-down
    write_svg(cat, "arrow-down",
        '  <line x1="12" y1="5" x2="12" y2="19"/>\n  <polyline points="19,12 12,19 5,12"/>')

    # 3. arrow-left
    write_svg(cat, "arrow-left",
        '  <line x1="19" y1="12" x2="5" y2="12"/>\n  <polyline points="12,19 5,12 12,5"/>')

    # 4. arrow-right
    write_svg(cat, "arrow-right",
        '  <line x1="5" y1="12" x2="19" y2="12"/>\n  <polyline points="12,5 19,12 12,19"/>')

    # 5. arrow-up-right (diagonal)
    write_svg(cat, "arrow-up-right",
        '  <line x1="7" y1="17" x2="17" y2="7"/>\n  <polyline points="7,7 17,7 17,17"/>')

    # 6. chevron-up
    write_svg(cat, "chevron-up", '  <polyline points="6,15 12,9 18,15"/>')

    # 7. chevron-down
    write_svg(cat, "chevron-down", '  <polyline points="6,9 12,15 18,9"/>')

    # 8. chevron-left
    write_svg(cat, "chevron-left", '  <polyline points="15,18 9,12 15,6"/>')

    # 9. chevron-right
    write_svg(cat, "chevron-right", '  <polyline points="9,6 15,12 9,18"/>')

    # 10. trending-up
    write_svg(cat, "trending-up",
        '  <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>\n  <polyline points="16,7 22,7 22,13"/>')

    # 11. refresh (circular arrows)
    write_svg(cat, "refresh",
        '  <path d="M21 2v6h-6"/>\n  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>\n'
        '  <path d="M3 22v-6h6"/>\n  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>')

    # 12. expand (arrows pointing outward)
    write_svg(cat, "expand",
        '  <polyline points="15,3 21,3 21,9"/>\n  <polyline points="9,21 3,21 3,15"/>\n'
        '  <line x1="21" y1="3" x2="14" y2="10"/>\n  <line x1="3" y1="21" x2="10" y2="14"/>')


# ============================================================
# NATURE (12 SVGs)
# ============================================================

def generate_nature():
    cat = "nature"

    # 1. sun
    lines = ['  <circle cx="12" cy="12" r="5"/>']
    for i in range(8):
        angle = math.radians(i * 45)
        x1 = 12 + 7 * math.cos(angle)
        y1 = 12 + 7 * math.sin(angle)
        x2 = 12 + 10 * math.cos(angle)
        y2 = 12 + 10 * math.sin(angle)
        lines.append(f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
    write_svg(cat, "sun", "\n".join(lines))

    # 2. moon
    write_svg(cat, "moon",
        '  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>')

    # 3. cloud
    write_svg(cat, "cloud",
        '  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z"/>')

    # 4. rain
    write_svg(cat, "rain",
        '  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10Z"/>\n'
        '  <line x1="8" y1="22" x2="8" y2="24"/>\n'
        '  <line x1="12" y1="22" x2="12" y2="24"/>\n'
        '  <line x1="16" y1="22" x2="16" y2="24"/>')

    # 5. flame
    write_svg(cat, "flame",
        '  <path d="M12 2C8 6 4 10 4 14a8 8 0 0 0 16 0c0-4-4-8-8-12Z"/>\n'
        '  <path d="M12 12c-1 1.5-2 3-2 4.5a2 2 0 0 0 4 0c0-1.5-1-3-2-4.5Z"/>')

    # 6. leaf
    write_svg(cat, "leaf",
        '  <path d="M11 20A7 7 0 0 0 9.8 6.9C15.5 4.9 20 2 20 2s-2.9 4.5-4.9 10.1A7 7 0 0 0 11 20Z"/>\n'
        '  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 12 13"/>')

    # 7. tree
    write_svg(cat, "tree",
        '  <path d="M12 22V13"/>\n'
        '  <path d="M17 13H7l2-4H5l3.5-5h7L19 9h-4l2 4Z"/>')

    # 8. flower
    petals = ['  <circle cx="12" cy="12" r="2"/>']
    for i in range(6):
        angle = math.radians(i * 60)
        cx = 12 + 5 * math.cos(angle)
        cy = 12 + 5 * math.sin(angle)
        petals.append(f'  <circle cx="{cx:.1f}" cy="{cy:.1f}" r="3"/>')
    write_svg(cat, "flower", "\n".join(petals))

    # 9. waves
    write_svg(cat, "waves",
        '  <path d="M2 6c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>\n'
        '  <path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>\n'
        '  <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>')

    # 10. mountain
    write_svg(cat, "mountain",
        '  <path d="M2 20L8.5 8l4 6 3.5-4L22 20H2Z"/>')

    # 11. snowflake
    lines = []
    for i in range(3):
        angle = math.radians(i * 60)
        x1 = 12 + 9 * math.cos(angle)
        y1 = 12 + 9 * math.sin(angle)
        x2 = 12 - 9 * math.cos(angle)
        y2 = 12 - 9 * math.sin(angle)
        lines.append(f'  <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>')
        # Small branches
        for d in [-1, 1]:
            bangle = math.radians(i * 60 + d * 45)
            for dist in [4, 7]:
                bx = 12 + dist * math.cos(angle)
                by = 12 + dist * math.sin(angle)
                ex = bx + 2 * math.cos(bangle)
                ey = by + 2 * math.sin(bangle)
                lines.append(f'  <line x1="{bx:.1f}" y1="{by:.1f}" x2="{ex:.1f}" y2="{ey:.1f}"/>')
    write_svg(cat, "snowflake", "\n".join(lines))

    # 12. wind
    write_svg(cat, "wind",
        '  <path d="M9.59 4.59A2 2 0 1 1 11 8H2"/>\n'
        '  <path d="M12.59 19.41A2 2 0 1 0 14 16H2"/>\n'
        '  <path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2"/>')


# ============================================================
# MEDIA (11 SVGs)
# ============================================================

def generate_media():
    cat = "media"

    # 1. play
    write_svg(cat, "play", '  <polygon points="5,3 19,12 5,21"/>')

    # 2. pause
    write_svg(cat, "pause",
        '  <rect x="6" y="4" width="4" height="16"/>\n  <rect x="14" y="4" width="4" height="16"/>')

    # 3. stop
    write_svg(cat, "stop", '  <rect x="4" y="4" width="16" height="16" rx="2"/>')

    # 4. skip-forward
    write_svg(cat, "skip-forward",
        '  <polygon points="5,4 15,12 5,20"/>\n  <line x1="19" y1="4" x2="19" y2="20"/>')

    # 5. camera
    write_svg(cat, "camera",
        '  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>\n'
        '  <circle cx="12" cy="13" r="4"/>')

    # 6. film
    write_svg(cat, "film",
        '  <rect x="2" y="2" width="20" height="20" rx="2.18"/>\n'
        '  <line x1="7" y1="2" x2="7" y2="22"/>\n  <line x1="17" y1="2" x2="17" y2="22"/>\n'
        '  <line x1="2" y1="12" x2="22" y2="12"/>\n'
        '  <line x1="2" y1="7" x2="7" y2="7"/>\n  <line x1="2" y1="17" x2="7" y2="17"/>\n'
        '  <line x1="17" y1="7" x2="22" y2="7"/>\n  <line x1="17" y1="17" x2="22" y2="17"/>')

    # 7. music-note
    write_svg(cat, "music-note",
        '  <path d="M9 18V5l12-2v13"/>\n'
        '  <circle cx="6" cy="18" r="3"/>\n  <circle cx="18" cy="16" r="3"/>')

    # 8. volume
    write_svg(cat, "volume",
        '  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>\n'
        '  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>\n'
        '  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>')

    # 9. mic
    write_svg(cat, "mic",
        '  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"/>\n'
        '  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>\n  <line x1="12" y1="19" x2="12" y2="23"/>\n'
        '  <line x1="8" y1="23" x2="16" y2="23"/>')

    # 10. clapperboard
    write_svg(cat, "clapperboard",
        '  <path d="M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/>\n'
        '  <path d="M4 11l2.5-6.5L10 7l3-4 3.5 2.5L20 2l0 9H4Z"/>')

    # 11. headphones
    write_svg(cat, "headphones",
        '  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>\n'
        '  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5Z"/>\n'
        '  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5Z"/>')


# ============================================================
# ABSTRACT (11 SVGs)
# ============================================================

def generate_abstract():
    cat = "abstract"

    # 1. infinity
    write_svg(cat, "infinity",
        '  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8Z"/>')

    # 2. yin-yang
    write_svg(cat, "yin-yang",
        '  <circle cx="12" cy="12" r="10"/>\n'
        '  <path d="M12 2a5 5 0 0 0 0 10 5 5 0 0 1 0 10"/>\n'
        '  <circle cx="12" cy="7" r="1"/>\n  <circle cx="12" cy="17" r="1"/>')

    # 3. spiral
    write_svg(cat, "spiral",
        '  <path d="M12 12m-1 0a1 1 0 1 0 2 0 3 3 0 1 0-6 0 5 5 0 1 0 10 0 7 7 0 1 0-14 0 9 9 0 1 0 18 0"/>')

    # 4. target
    write_svg(cat, "target",
        '  <circle cx="12" cy="12" r="10"/>\n'
        '  <circle cx="12" cy="12" r="6"/>\n  <circle cx="12" cy="12" r="2"/>')

    # 5. crown
    write_svg(cat, "crown",
        '  <path d="M2 17L4 7l5 5 3-6 3 6 5-5 2 10H2Z"/>\n'
        '  <line x1="2" y1="20" x2="22" y2="20"/>')

    # 6. trophy
    write_svg(cat, "trophy",
        '  <path d="M6 9H2V4h4"/>\n  <path d="M18 9h4V4h-4"/>\n'
        '  <path d="M6 4h12v6a6 6 0 0 1-12 0V4Z"/>\n'
        '  <line x1="12" y1="16" x2="12" y2="19"/>\n'
        '  <path d="M8 19h8v2H8z"/>')

    # 7. eye
    write_svg(cat, "eye",
        '  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/>\n'
        '  <circle cx="12" cy="12" r="3"/>')

    # 8. lightning
    write_svg(cat, "lightning",
        '  <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>')

    # 9. shield
    write_svg(cat, "shield",
        '  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>')

    # 10. puzzle
    write_svg(cat, "puzzle",
        '  <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.98.98 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.878-.29c-.471.07-.802.48-.968.925a2.5 2.5 0 1 1-3.214-3.214c.446-.166.855-.497.925-.968a.98.98 0 0 0-.276-.837L2.294 13.91A2.404 2.404 0 0 1 1.588 12.206c0-.617.236-1.234.706-1.704L3.905 8.89a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.98.98 0 0 1 .276-.837l1.61-1.611a2.404 2.404 0 0 1 1.705-.706c.618 0 1.234.235 1.704.706l1.568 1.568c.23.23.556.338.878.29.47-.071.802-.48.968-.926a2.501 2.501 0 1 1 3.214 3.214c-.446.166-.855.498-.925.968Z"/>')

    # 11. diamond-ring (abstract diamond)
    write_svg(cat, "diamond-abstract",
        '  <path d="M2.7 10.3L12 2l9.3 8.3L12 22 2.7 10.3Z"/>\n'
        '  <path d="M2.7 10.3h18.6"/>')


# ============================================================
# TECH (10 SVGs)
# ============================================================

def generate_tech():
    cat = "tech"

    # 1. rocket
    write_svg(cat, "rocket",
        '  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/>\n'
        '  <path d="M12 13l-3-3c.64-2.17 2.06-4.5 4.21-6C15.36 2.43 18.09 1.71 20 2c.29 1.91-.43 4.64-2 6.79-1.5 2.15-3.83 3.57-6 4.21Z"/>\n'
        '  <path d="M15 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>\n'
        '  <path d="M14 17.5c-1.04 2.08-3.47 3.2-5.5 3.5.3-2.03 1.42-4.46 3.5-5.5"/>')

    # 2. cpu
    write_svg(cat, "cpu",
        '  <rect x="4" y="4" width="16" height="16" rx="2"/>\n'
        '  <rect x="9" y="9" width="6" height="6"/>\n'
        '  <line x1="9" y1="1" x2="9" y2="4"/>\n  <line x1="15" y1="1" x2="15" y2="4"/>\n'
        '  <line x1="9" y1="20" x2="9" y2="23"/>\n  <line x1="15" y1="20" x2="15" y2="23"/>\n'
        '  <line x1="20" y1="9" x2="23" y2="9"/>\n  <line x1="20" y1="15" x2="23" y2="15"/>\n'
        '  <line x1="1" y1="9" x2="4" y2="9"/>\n  <line x1="1" y1="15" x2="4" y2="15"/>')

    # 3. atom
    write_svg(cat, "atom",
        '  <circle cx="12" cy="12" r="2"/>\n'
        '  <ellipse cx="12" cy="12" rx="10" ry="4"/>\n'
        '  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/>\n'
        '  <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>')

    # 4. globe
    write_svg(cat, "globe",
        '  <circle cx="12" cy="12" r="10"/>\n'
        '  <line x1="2" y1="12" x2="22" y2="12"/>\n'
        '  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>')

    # 5. code
    write_svg(cat, "code",
        '  <polyline points="16,18 22,12 16,6"/>\n  <polyline points="8,6 2,12 8,18"/>')

    # 6. terminal
    write_svg(cat, "terminal",
        '  <polyline points="4,17 10,11 4,5"/>\n  <line x1="12" y1="19" x2="20" y2="19"/>')

    # 7. database
    write_svg(cat, "database",
        '  <ellipse cx="12" cy="5" rx="9" ry="3"/>\n'
        '  <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/>\n'
        '  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>')

    # 8. wifi
    write_svg(cat, "wifi",
        '  <path d="M5 12.55a11 11 0 0 1 14.08 0"/>\n'
        '  <path d="M1.42 9a16 16 0 0 1 21.16 0"/>\n'
        '  <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>\n'
        '  <circle cx="12" cy="20" r="1"/>')

    # 9. server
    write_svg(cat, "server",
        '  <rect x="2" y="2" width="20" height="8" rx="2"/>\n'
        '  <rect x="2" y="14" width="20" height="8" rx="2"/>\n'
        '  <circle cx="6" cy="6" r="1"/>\n  <circle cx="6" cy="18" r="1"/>')

    # 10. link
    write_svg(cat, "link",
        '  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>\n'
        '  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')


# ============================================================
# UI (10 SVGs)
# ============================================================

def generate_ui():
    cat = "ui"

    # 1. user
    write_svg(cat, "user",
        '  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>\n'
        '  <circle cx="12" cy="7" r="4"/>')

    # 2. chat (message bubble)
    write_svg(cat, "chat",
        '  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>')

    # 3. bell
    write_svg(cat, "bell",
        '  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>\n'
        '  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>')

    # 4. search
    write_svg(cat, "search",
        '  <circle cx="11" cy="11" r="8"/>\n  <line x1="21" y1="21" x2="16.65" y2="16.65"/>')

    # 5. settings (gear)
    write_svg(cat, "settings",
        '  <circle cx="12" cy="12" r="3"/>\n'
        '  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>')

    # 6. share
    write_svg(cat, "share",
        '  <circle cx="18" cy="5" r="3"/>\n  <circle cx="6" cy="12" r="3"/>\n'
        '  <circle cx="18" cy="19" r="3"/>\n'
        '  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>\n'
        '  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>')

    # 7. home
    write_svg(cat, "home",
        '  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-4 0a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1"/>')

    # 8. menu (hamburger)
    write_svg(cat, "menu",
        '  <line x1="3" y1="6" x2="21" y2="6"/>\n'
        '  <line x1="3" y1="12" x2="21" y2="12"/>\n'
        '  <line x1="3" y1="18" x2="21" y2="18"/>')

    # 9. check
    write_svg(cat, "check", '  <polyline points="20,6 9,17 4,12"/>')

    # 10. close (x)
    write_svg(cat, "close",
        '  <line x1="18" y1="6" x2="6" y2="18"/>\n  <line x1="6" y1="6" x2="18" y2="18"/>')


# ============================================================
# MAIN
# ============================================================

def main():
    print("Generating SVG library...")
    generators = [
        ("geometric", generate_geometric, 25),
        ("arrows", generate_arrows, 12),
        ("nature", generate_nature, 12),
        ("media", generate_media, 11),
        ("abstract", generate_abstract, 11),
        ("tech", generate_tech, 10),
        ("ui", generate_ui, 10),
    ]
    total = 0
    for name, fn, expected in generators:
        fn()
        folder = os.path.join(BASE_DIR, name)
        count = len([f for f in os.listdir(folder) if f.endswith('.svg')])
        total += count
        status = "✓" if count == expected else f"✗ (expected {expected})"
        print(f"  {name}: {count} SVGs {status}")

    print(f"\nTotal: {total} SVGs generated in {BASE_DIR}")


if __name__ == "__main__":
    main()
