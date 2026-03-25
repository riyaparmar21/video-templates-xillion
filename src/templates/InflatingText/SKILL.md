---
name: inflating-text
description: Bold text with multi-phase inflate animation, overshoot scaling, per-letter shifts, and dramatic final inflate
metadata:
  tags: text, inflate, morph, SVG, shape-morph, flubber, overshoot, bubble, animation
---

## Overview

Bold text with multi-phase inflate animation, overshoot scaling, per-letter shifts, and dramatic final inflate.

## How It Works

1. **Build-time**: `scripts/generate-letter-paths.mjs` extracts SVG glyph paths from Inter Bold using `opentype.js`, then creates inflated versions by scaling each letter's path coordinates outward from their centroid (1.12×)
2. **Data**: Paths stored in `letter-paths.json` (A-Z, 0-9, punctuation — both normal and inflated states, same font)
3. **Runtime**: `flubber` interpolates between normal and inflated SVG path shapes frame-by-frame. A thick SVG stroke with round joins/caps (same color as fill) grows with morph progress, creating the puffy/balloon visual effect
4. **Sizing**: Text auto-scales to fit within the composition at maximum inflate (~2.5× group scale), preventing overflow

## Files

- `src/templates/InflatingText/InflatingText.tsx` — main component (SVG path morphing)
- `src/templates/InflatingText/index.ts` — barrel export
- `src/templates/InflatingText/letter-paths.json` — generated path data (A-Z, 0-9, punctuation)
- `src/inflating-text-spec.json` — text content + config
- `scripts/generate-letter-paths.mjs` — font path extraction script
- `scripts/fonts/inter-bold.ttf` — Inter Bold font file (normal state)
- `scripts/fonts/dynapuff.ttf` — DynaPuff font file (inflated state)

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 2220,
  "text": "MORPH",
  "bgColor": "#121232",           // dark background
  "textColor": "#00BAFF",         // cyan letter fill
  "strokeColor": "#121232",       // stroke around letters
  "strokeWidth": 2,               // stroke width in px
  "letterGap": 4                  // gap between letters in px
}
```

## Animation Timeline

### Phase 1: Shape Morph (staggered, 100ms+)

Each letter morphs from geometric → bubble, staggered 110ms apart:

| Letter | Start | Duration | Easing |
|--------|-------|----------|--------|
| 1st    | 100ms | 800ms    | overshoot (easeOutBack) |
| 2nd    | 210ms | 800ms    | overshoot |
| 3rd    | 320ms | 800ms    | overshoot |
| nth    | 100 + n×110 ms | 800ms | overshoot |

### Phase 2: Group Scale-Up (310–1540ms)

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 310–1540ms | group scale | 1 | 1.8 | `easeOutBack` (overshoot) |

### Phase 3: Final Inflate (1300–2220ms)

| Time | Property | Effect | Easing |
|------|----------|--------|--------|
| 1300–2220ms | group scale | additional ×1.39 | smooth bezier (0.25, 0.1, 0.25, 1) |

Total max scale ≈ 1.8 × 1.39 ≈ 2.5× (text auto-sizes to stay within bounds, filling ~95% of screen)

## Dependencies

- `flubber` — SVG path interpolation/morphing between normal and inflated letter shapes
- `opentype.js` (devDep) — font glyph path extraction at build time
- `remotion` — `useCurrentFrame`, `useVideoConfig`, `interpolate`, `Easing`, `AbsoluteFill`

## Visual Technique

The puffy/bubble look is achieved through two layered SVG elements per letter:

1. **Background outline stroke** — dark stroke (same as `bgColor`) for letter separation
2. **Puffy fill stroke** — thick stroke in the same color as the letter fill, with `strokeLinejoin="round"` and `strokeLinecap="round"`, which naturally rounds corners and creates the inflated appearance. This stroke width grows from 0 to `maxPuffStroke` (18% of letter height) as `morphProgress` goes 0→1.

Combined with the path morph (centroid-scaled 1.12×), this creates a convincing inflation effect using only Inter Bold — no second font needed.

## Regenerating Paths

If you want to change the fonts used for normal/inflated states:

1. Replace font files in `scripts/fonts/`
2. Run: `node scripts/generate-letter-paths.mjs`
3. The component automatically picks up the new paths

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Display text | Spec JSON — `text` (or `npm run text:inflate -- "YOUR TEXT"`) |
| Colors | Spec JSON — `bgColor`, `textColor`, `strokeColor` |
| Stroke thickness | Spec JSON — `strokeWidth` |
| Letter gap | Spec JSON — `letterGap` |
| Animation timing | `TIMING` object in component — all values in ms |
| Morph stagger delay | `TIMING.morphStagger` (default 110ms between letters) |
| Morph duration | `TIMING.morphDuration` (default 800ms per letter) |
| Overshoot intensity | `overshootEasing` function — adjust multiplier |
| Scale targets | `scaleUp` and `inflateScale` in component |
| Normal font | Replace `scripts/fonts/inter-bold.ttf` + regenerate |
| Inflate scale | `SCALE_FACTOR` in generate-letter-paths.mjs (default 1.12) |
| Puffy stroke size | `maxPuffStroke` prop in parent (default 18% of letterHeight) |

## Supported Characters

A-Z (uppercase), 0-9, and: `! ? . , - ' " ( ) &`

Lowercase text is auto-uppercased. Unsupported characters are silently skipped.
