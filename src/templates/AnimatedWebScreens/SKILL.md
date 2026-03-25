---
name: animated-web-screens
description: 3x3 device grid with zoom intro and horizontal slide transitions
metadata:
  tags: grid, devices, screens, zoom, slide, mask
---

## Overview

3x3 device grid with zoom intro and horizontal slide transitions.

## Files

- `src/templates/AnimatedWebScreens/AnimatedWebScreens.tsx` — main component
- `src/templates/AnimatedWebScreens/index.ts` — barrel export
- `src/animated-web-screens-spec.json` — screen images + config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1600,
  "height": 1200,
  "durationMs": 7000,
  "bgColorStart": "#F0F9FF",
  "bgColorEnd": "#17082C",
  "screens": [
    // 9 entries — one per device in the 3x3 grid, top-left to bottom-right
    { "id": "device01", "src": "https://..." },
    // ...
  ],
  "centerSlides": [
    // 4 extra screens that cycle in the center device (slides 2-5)
    { "id": "slide02", "src": "https://..." },
    { "id": "slide03", "src": "https://..." },
    { "id": "slide04", "src": "https://..." },
    { "id": "slide05", "src": "https://..." }
  ]
}
```

To swap screen images, edit the `src` URLs. Supports remote URLs or `staticFile()` paths (put images in `public/`).

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 1600 x 1200 |
| Device size | 348 x 224 |
| Corner radius | 12px |
| Border | 8px solid #000 |
| Grid origin | (78, 104) |
| Grid size | 1444 x 992 |

Device positions within grid:
```
(0,0)      (548,0)      (1096,0)       ← top
(0,384)    (548,384)    (1096,384)     ← middle (center = slider)
(0,768)    (548,768)    (1096,768)     ← bottom
```

## Animation Timeline

### Intro Zoom (grid scale)

| Phase | Time | Scale | Easing |
|-------|------|-------|--------|
| Zoom in fast | 0–500ms | 3 → 1.75 | `Easing.out(Easing.quad)` |
| Zoom in settle | 500–1000ms | 1.75 → 1 | `Easing.out(Easing.quad)` |
| Zoom out | 1100–2000ms | 1 → 2.7 | linear |

### Background Color

| Time | From | To | Easing |
|------|------|----|--------|
| 1100–2000ms | #F0F9FF | #17082C | `Easing.out(Easing.quad)` |

### Center Device Slides

| Transition | Time | Direction |
|------------|------|-----------|
| Screen 1 → 2 | 1100–2300ms | slide right |
| Screen 2 → 3 | 2600–3800ms | slide right |
| Screen 3 → 4 | 3800–5300ms | slide right |
| Screen 4 → 5 | 5600–6800ms | slide right |

All slides use `Easing.out(Easing.quad)`.

## Dependencies

Uses `msToFrame` and `lerpColor` from `src/lib/` (project-specific timing and color utilities).

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Screen images | `src/animated-web-screens-spec.json` — `screens[].src` and `centerSlides[].src` |
| Timing | `TIMING` object in component — all values in ms |
| Grid layout | `DEVICE_POSITIONS`, `GRID_ORIGIN`, `GRID_SIZE`, `DEVICE` constants |
| Background colors | Spec JSON — `bgColorStart`, `bgColorEnd` |
| Device frame style | `DeviceFrame` component — `border`, `borderRadius`, `background` |
| Add more slides | Add entries to spec `centerSlides` array AND add timing entries to `TIMING.slides` |
| Easing | `easeOut` constant — change `Easing.out(Easing.quad)` to any Remotion easing |

## CLI Commands

```bash
# bulk load images from folder
npm run screens -- ./my-screens
npm run screens -- --slot 5 ./hero.png
npm run screens -- --center 2 ./slide.png

# background gradient colors
npm run text:web-screens -- --bgStart "#F0F9FF" --bgEnd "#17082C"

npm run aspect -- web-screens 16:9
```
