---
name: mobile-showreel-frames
description: Mobile gallery showreel — grid intro with corner dots, zoom to full-screen, vertical scroll parade with number labels
metadata:
  tags: showreel, gallery, mobile, grid, zoom, scroll, vertical, cards, number-labels
---

## Overview

A mobile-style image gallery showreel. A single thumbnail card appears on a dark background, then fans out into a vertical 4-card grid with corner-dot frame markers. The grid collapses back, the last card zooms to fill the viewport, and a vertical scroll parade cycles through each image full-screen with rotated `/01`, `/02` number labels.

## Files

- `src/templates/MobileShowreelFrames/MobileShowreelFrames.tsx` — main component
- `src/templates/MobileShowreelFrames/index.ts` — barrel export
- `src/mobile-showreel-frames-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationMs": 8000,
  "bgColor": "#111111",           // dark background
  "images": [                     // paths relative to public/
    "mobile-showreel-frames/01.jpg",
    "mobile-showreel-frames/02.jpg",
    "mobile-showreel-frames/03.jpg",
    "mobile-showreel-frames/04.jpg"
  ],
  "cardRadius": 22,               // thumbnail border radius (px)
  "cardGap": 14,                  // gap between grid thumbnails (px)
  "thumbWidth": 200,              // thumbnail width (px)
  "thumbHeight": 200,             // thumbnail height (px)
  "dotSize": 6,                   // corner dot diameter (px)
  "labelFont": "Neue Haas Unica W1G Bold, Helvetica Neue, Arial, sans-serif",
  "labelFontSize": 48,            // full-screen number label size
  "cardHoldMs": 900,              // how long each card shows full-screen
  "scrollTransitionMs": 500       // vertical scroll transition duration
}
```

## Animation Timeline

| Phase | Time (approx) | Description |
|-------|---------------|-------------|
| 1 — Card intro | 0–400ms | Last card appears at centre, scales from 0.2→0.5 with fade-in |
| 2 — Fan out | 400–1200ms | Cards emerge from behind, spread into vertical column; corner dots expand |
| 3 — Grid hold | 1200–1900ms | All 4 thumbnails visible in column, corner dots at full spread |
| 4 — Collapse | 1900–2400ms | Cards collapse back to centre, non-last cards fade out; dots disappear |
| 5 — Zoom | 2400–3000ms | Last card zooms from thumbnail to full viewport; `/01` label fades in |
| 6 — Scroll parade | 3000ms+ | Full-screen cards with `/0N` labels; vertical scroll between each |

### Phase Details

**Phase 1 — Card Intro**: Only the last image in the array is visible. It scale-animates from tiny (0.2×) to thumbnail size (0.5×) at the viewport centre, with a quick fade-in.

**Phase 2 — Fan Out**: All cards emerge from behind the last card and spread to their grid positions. Cards appear with staggered timing (bottom card first). Corner dots expand from tight to frame the grid.

**Phase 3 — Grid Hold**: Static grid view — 4 rounded-corner thumbnails in a centred vertical column with small gaps. Four white corner dots mark the outer frame.

**Phase 4 — Collapse**: All cards animate back to centre. Non-last cards fade out. Corner dots shrink and disappear.

**Phase 5 — Zoom**: The remaining card (last in array) scales up from thumbnail size to fill the entire viewport. Border radius animates from 22px to 0. A rotated number label `/01` fades in at the bottom-left.

**Phase 6 — Scroll Parade**: Cards display full-screen in reverse array order (last→first = `/01`→`/0N`). Each card holds for `cardHoldMs`, then scrolls upward while the next card enters from below over `scrollTransitionMs`. Number labels are white, rotated -90°, positioned bottom-left.

## Grid Layout

| Element | Value |
|---------|-------|
| Artboard | 1080×1920 (9:16 portrait) |
| Thumbnail | 200×200 (customisable) |
| Card radius | 22px |
| Card gap | 14px |
| Corner dot | 6px white circle |
| Dot padding | 30px from grid edge |

## Number Labels

- Format: `/01`, `/02`, `/03`, etc. (1-based, zero-padded)
- Rotation: -90° (reads bottom to top)
- Position: bottom-left corner (left: 24px, bottom: 32px)
- Font: Neue Haas Unica W1G Bold (falls back to Helvetica Neue)
- Colour: white with subtle text shadow

## CLI

```bash
# Replace image at slot index
npm run text:showreel-frames -- --slot 0 --image "mobile-showreel-frames/hero.jpg"

# Append a new image
npm run text:showreel-frames -- --image "mobile-showreel-frames/new.jpg"

# Change background
npm run text:showreel-frames -- --bg "#1a1a2e"

# Adjust timing
npm run text:showreel-frames -- --hold 1200 --scroll 600

# Font customization
npm run text:showreel-frames -- --labelFont "Inter, sans-serif" --labelFontSize 40

# Aspect ratio
npm run aspect -- showreel-frames 9:16
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Images | Spec JSON `images[]` or CLI `--slot N --image "path"` |
| Number of cards | Add/remove entries in `images` array |
| Background | Spec JSON `bgColor` |
| Thumbnail size | Spec JSON `thumbWidth` / `thumbHeight` |
| Card corners | Spec JSON `cardRadius` |
| Grid spacing | Spec JSON `cardGap` |
| Full-screen hold time | Spec JSON `cardHoldMs` |
| Scroll speed | Spec JSON `scrollTransitionMs` |
| Label font/size | Spec JSON `labelFont` / `labelFontSize` |
| Dot size | Spec JSON `dotSize` |
| Phase durations | Constants in `MobileShowreelFrames.tsx` (p1Dur, p2Dur, etc.) |
