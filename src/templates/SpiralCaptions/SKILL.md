---
name: spiral-captions
description: Character-by-character text placed along an Archimedean spiral path with shrinking font and fading opacity toward center
metadata:
  tags: captions, spiral, typography, text-animation, kinetic
---

## Overview

Spiral Captions renders text character-by-character along an Archimedean spiral path. Each letter is individually positioned on the curve and rotated tangent to the spiral, creating a smooth typographic spiral effect. Font size decreases and opacity fades as text moves inward, giving an elegant sense of depth.

## Files

- `src/templates/SpiralCaptions/SpiralCaptions.tsx` — main component
- `src/templates/SpiralCaptions/index.ts` — barrel export
- `src/spiral-captions-spec.json` — word data (text, timing, spiral config)

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": 300,
  "durationMs": 10000,
  "videoSrc": null,                    // optional background video URL
  "showBackground": true,              // show bg color when no video
  "backgroundColor": "#4a5568",        // muted gray-blue (reference style)
  "textColor": "#FFFFFF",              // white text
  "spiral": {
    "startRadius": 460,                // outer radius in px
    "radiusDecayPerRevolution": 124,   // how much radius shrinks per 360°
    "startAngle": -1.5708,             // -π/2 = start at top (12 o'clock)
    "maxFontSize": 56,                 // font size at outermost ring
    "minFontSize": 20,                 // font size at innermost ring
    "totalRevolutions": 2.8,           // spiral depth
    "wordGap": 16,                     // px gap between words along the arc
    "charWidthFactor": 1.12            // character spacing multiplier
  },
  "words": [
    { "text": "Travel", "startFrame": 0 },
    { "text": "offers", "startFrame": 3 },
    { "text": "are",    "startFrame": 6 },
    { "text": "spiraling", "startFrame": 9 }
    // ... repeat phrase to fill the spiral
  ]
}
```

## Spiral Configuration

| Param | Default | Purpose |
|-------|---------|---------|
| `startRadius` | 460 | Outer edge of spiral in px |
| `radiusDecayPerRevolution` | 124 | Radius shrink per full revolution |
| `startAngle` | -1.5708 (top) | Where the first character starts |
| `maxFontSize` | 56 | Largest font at outer edge |
| `minFontSize` | 20 | Smallest font at center |
| `totalRevolutions` | 2.8 | How many times the spiral wraps |
| `wordGap` | 16 | Pixels of space between words on the arc |
| `charWidthFactor` | 1.12 | Multiplier for character spacing (>1 = looser) |

## Animation Details

- **Character placement**: Each character individually positioned on Archimedean spiral `r = startRadius - (decay/2π) × θ`
- **Rotation**: Each character rotated tangent to spiral: `angle_deg + 90°`
- **Font scaling**: Linearly interpolated between maxFontSize (outer) and minFontSize (inner) based on radius
- **Opacity fade**: `0.35 + 0.65 × radiusFraction` — full opacity at edge, 35% at center
- **Pop-in spring**: `{ damping: 12, stiffness: 200, mass: 0.5 }`, words appear at their `startFrame`
- **Arc-length spacing**: Character angular footprint = `charPixelWidth / currentRadius`, ensuring even spacing at all radii
- **Per-character width**: Lookup table for Montserrat proportional widths (narrow: i,l,r ~ 0.28–0.37; wide: m,w ~ 0.76–0.78)

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Spiral tightness | `spiral.radiusDecayPerRevolution` in spec |
| Character spacing | `spiral.charWidthFactor` in spec (increase = looser) |
| Word gap | `spiral.wordGap` in spec |
| Starting position | `spiral.startAngle` in spec |
| Font size range | `spiral.maxFontSize` / `spiral.minFontSize` in spec |
| Background color | `backgroundColor` in spec |
| Text color | `textColor` in spec |
| Fade amount | `baseOpacity` formula in `computeCharPositions()` |
| Spring animation | `SPRING_CONFIG` in SpiralCaptions.tsx |
| Number of rings | `spiral.totalRevolutions` in spec |
