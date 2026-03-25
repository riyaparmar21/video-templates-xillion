---
name: product-reveal-track
description: 3-sequence product reveal with concentric running-track outlines, dark atmospheric hero shot, and brand sign-off
metadata:
  tags: product, reveal, track, running, shoes, brand, atmospheric, stadium
---

## Overview

A cinematic product reveal in three sequences: concentric running-track/stadium SVG outlines morphing on white, a dark atmospheric scene with product hero shot and bold label, and a final white brand sign-off with expanding track outlines.

## Files

- `src/templates/ProductRevealTrack/ProductRevealTrack.tsx` — main component
- `src/templates/ProductRevealTrack/index.ts` — barrel export
- `src/product-reveal-track-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1350,
  "durationMs": 6620,
  "productImage": "product-reveal-track/product.jpg",  // product hero image
  "bgImage": "product-reveal-track/bg-terrain.jpg",    // dark bg for sequence 2
  "brandName": "acme",                                  // brand name text
  "heroLabel": "CO2",                                   // large geometric label
  "dateText": "20\n25",                                 // date text (use \n for line break)
  "craftedText": "designed & crafted\nin ITALY",        // small tagline
  "bottomTagline": "RACING SHOES DESIGNED\n& ENGINEERED IN ITALY",  // final scene tagline
  "darkBg": "#1a0000",                                  // dark scene background color
  "laneCount": 6                                        // number of concentric track lanes
}
```

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 1080×1350 |
| Duration | 6620ms (199 frames @ 30fps) |
| Track lane count | 6 (configurable) |

## Animation Timeline

| Time | Sequence | What happens |
|------|----------|--------------|
| 0–2200ms | Seq 1 (White) | Concentric stadium SVG outlines morph from oval to full elongated shape, JL-style logo mark in centre |
| 2200–4400ms | Seq 2 (Dark) | Dark atmospheric bg, product shoe floating centre, track ovals behind, large "CO2" text, brand name, corner grid-dot markers |
| 4400–6620ms | Seq 3 (White) | Track outlines expand outward, bottom-centre: logo mark + tagline + brand name, grid dots at corners |

### Easing

- `natural` — `Easing.bezier(0.4, 0, 0.2, 1)`
- `slowDown` — `Easing.bezier(0, 0, 0.2, 1)`

## CLI

```bash
npm run text:product-reveal -- --label "CO2" --brand "acme"
npm run text:product-reveal -- --label "VO2" --brand "NIKE" --image "product-reveal-track/shoe.jpg"
npm run text:product-reveal -- --tagline "RACING SHOES DESIGNED\n& ENGINEERED IN ITALY"
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Hero label text | Spec JSON `heroLabel` or CLI `--label` |
| Brand name | Spec JSON `brandName` or CLI `--brand` |
| Product image | Place in `public/product-reveal-track/` and set `productImage` in spec |
| Background image | Place in `public/product-reveal-track/` and set `bgImage` in spec |
| Dark scene color | Spec JSON `darkBg` |
| Track lane count | Spec JSON `laneCount` |
| Bottom tagline | Spec JSON `bottomTagline` or CLI `--tagline` |
| Timing | Sequence boundaries in `ProductRevealTrack.tsx` |
