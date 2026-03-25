---
name: showreel-grid
description: Horizontal phone-mockup carousel with sliding cards and hero-scale spotlight
metadata:
  tags: showreel, grid, carousel, phone, mockup, mobile, cards, sliding
---

## Overview

Horizontal phone-mockup carousel with sliding cards and hero-scale spotlight.

## Files

- `src/templates/ShowreelGrid/ShowreelGrid.tsx` — main component
- `src/templates/ShowreelGrid/index.ts` — barrel export
- `src/showreel-grid-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1600,
  "height": 1200,
  "durationMs": 3000,
  "bgColor": "#ecf2eb",           // background color
  "screenFolder": "showreel-grid", // folder in public/ to auto-scan for images
  "cardRadius": 40,                // phone frame corner radius
  "cardWidth": 375,                // card width
  "cardHeight": 812,               // card height
  "cardGap": 700,                  // horizontal gap between card centres
  "heroScale": 1.3,                // scale of centre "hero" card
  "sideScale": 1.1                 // scale of flanking cards
}
```

## Image Auto-Discovery

The component uses Remotion's `getStaticFiles()` to scan `public/{screenFolder}/` at runtime. Any image file (png, jpg, webp, avif, gif, svg) found is sorted alphabetically by filename and used as card content.

- Just drop images into `public/showreel-grid/` — no spec edits needed
- Supports any image format
- Cards are duplicated to fill 8 slots for seamless visual wrap
- Falls back to explicit `screens` array if `screenFolder` is empty or `getStaticFiles` is unavailable (Player/SSR)

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 1600×1200 |
| Duration | 3000ms (90 frames @ 30fps) |
| Card size | 375×812 (iPhone-sized) |
| Card gap | 700px between centres |
| Hero scale | 1.3× |
| Side scale | 1.1× |

## Animation Timeline

Three step-moves, each shifting one `cardGap` (700px) to the left, with brief pauses between:

| Time | Action | Easing |
|------|--------|--------|
| 0–800ms | Step 1: slide left 700px, card A→B hero swap | natural |
| 1000–1800ms | Step 2: slide left 700px, card B→C hero swap | natural |
| 2030–2830ms | Step 3: slide left 700px, card C→D hero swap | natural |

### Easing

- `natural` — `Easing.bezier(0.4, 0, 0.2, 1)`

### Scale Interpolation

Each card's scale is computed from its distance to the viewport centre. Cards within `cardGap * 0.6` of centre interpolate from `sideScale` to `heroScale`, creating a smooth spotlight transition.

## CLI

```bash
npm run text:showreel-grid -- --folder "showreel-grid" --bg "#ecf2eb"
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile, getStaticFiles

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Card images | Drop files into `public/{screenFolder}/` |
| Image folder | Spec JSON `screenFolder` or CLI `--folder` |
| Background color | Spec JSON `bgColor` or CLI `--bg` |
| Card dimensions | Spec JSON `cardWidth`, `cardHeight` |
| Card spacing | Spec JSON `cardGap` |
| Hero/side scale | Spec JSON `heroScale`, `sideScale` |
| Corner radius | Spec JSON `cardRadius` |
| Step timing | `msToFrame` calls in `ShowreelGrid.tsx` |
