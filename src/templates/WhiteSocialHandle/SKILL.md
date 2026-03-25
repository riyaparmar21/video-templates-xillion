---
name: white-social-handle
description: Animated social handle pill badge with icon grow-in, width expansion, and per-letter text reveal
metadata:
  tags: social, handle, badge, pill, instagram, icon, text-animation
---

## Overview

A white rounded pill scales in as a small circle, then expands horizontally to reveal an icon (default: Instagram logo SVG) and a text handle with per-letter backward fade-in.

## Files

- `src/templates/WhiteSocialHandle/WhiteSocialHandle.tsx` — main component
- `src/templates/WhiteSocialHandle/index.ts` — barrel export
- `src/white-social-handle-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 456,
  "height": 160,
  "durationMs": 4000,
  "handleText": "jitter.video",   // the text to display
  "iconImage": "",                 // path to icon image (empty = default Instagram SVG)
  "pillColor": "#ffffff",          // pill background color
  "pillOpacity": 80,               // pill opacity (0–100)
  "textColor": "#666666",          // handle text color
  "pillRadius": 40,                // pill corner radius
  "fontSize": 48                   // handle text size
}
```

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 456×160 |
| Duration | 4000ms (120 frames @ 30fps) |
| Pill collapsed width | 120px |
| Pill expanded width | 416px |
| Icon size | 72px |

## Animation Timeline

| Time | Element | Animation | Easing |
|------|---------|-----------|--------|
| 0–300ms | Badge group | Scale 0 → 1 | overshoot |
| 100–400ms | Icon | Scale 0 → 1 | overshoot |
| 310–910ms | Pill width | 120 → 416px | natural |
| 310–910ms | Icon X offset | 148 → 0px | natural |
| 310–910ms | Text X offset | -148 → 0px | natural |
| 410ms+ | Text letters | Fade in backward order, 40ms stagger, slight upward slide | natural |

### Easing

- `natural` — `Easing.bezier(0.4, 0, 0.2, 1)`
- `overshoot` — `Easing.bezier(0.34, 1.56, 0.64, 1)`

## Icon Behavior

- When `iconImage` is empty: renders a built-in Instagram gradient SVG logo (no clipping)
- When `iconImage` is set: renders the image in a circular container with `borderRadius` and `overflow: hidden`
- Place custom icons in `public/` and reference by path (e.g. `"social-handle/icon.png"`)

## CLI

```bash
npm run text:social-handle -- "yourname.co"
npm run text:social-handle -- --handle "yourname.co" --icon "social-handle/icon.png"
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Handle text | Spec JSON `handleText` or CLI |
| Icon image | Spec JSON `iconImage` (empty for default Instagram SVG) |
| Pill color/opacity | Spec JSON `pillColor`, `pillOpacity` |
| Text color | Spec JSON `textColor` |
| Font size | Spec JSON `fontSize` |
| Pill radius | Spec JSON `pillRadius` |
| Timing | Animation constants in `WhiteSocialHandle.tsx` |
