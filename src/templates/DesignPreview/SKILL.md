---
name: DesignPreview
description: Floating design portfolio cards with logo badge — keyframe-driven showcase with staggered pop-in entries, smooth drifting, and fade-out exits
---

# DesignPreview Template

## Overview

Floating design portfolio cards with logo badge — keyframe-driven showcase with staggered pop-in entries, smooth drifting, and fade-out exits.

**Format:** 1080 × 1920 (portrait 9:16)
**Duration:** 11 000 ms (11 s)
**FPS:** 30

## Critical Motion Rule

**Cards do NOT move.** They pop up (scale 0→1) at a fixed x/y/rotation, hold there, then shrink out (scale 1→0) at the same position. ONLY the logo badge moves continuously across the screen.

## Files

| File | Purpose |
|------|---------|
| `src/templates/DesignPreview/DesignPreview.tsx` | React component |
| `src/templates/DesignPreview/index.ts` | Barrel export |
| `src/design-preview-spec.json` | Spec JSON (data-driven) |
| `public/design-preview/*.png` | Card thumbnail images |

## Two Item Types

1. **"card"** — White rounded rectangle with image thumbnail, small logo SVG icon, dimension text (e.g. "1080 x 1080"), and category pills (Mobile/Desktop/Social). Portrait cards have taller image areas.
2. **"photo"** — Just a rounded image with shadow. No white chrome, no text, no pills.

## Spec JSON

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationMs": 11000,
  "bgColor": "#222423",
  "logoText": "VSMA©",
  "logoBgColor": "#dad1c3",
  "logoTextColor": "#222423",
  "cardWidth": 420,
  "photoSize": 380,
  "cardBorderRadius": 16,
  "scaleDurationMs": 350,          // pop-in / shrink-out duration
  "logoKeyframes": [               // badge's continuous motion path
    { "timeMs": 0, "x": 280, "y": 1100, "rotation": 0, "scale": 1, "opacity": 1 },
    // ... winding path across the screen
  ],
  "items": [
    {
      "type": "card",               // or "photo"
      "image": "design-preview/01.png",
      "dimensions": "1080 x 1080",  // ignored for photos
      "categories": ["Mobile", "Desktop", "Social"],
      "isPortrait": false,
      "x": 260,                     // FIXED position
      "y": 380,
      "rotation": -3,               // FIXED rotation
      "enterMs": 0,                 // when it pops in
      "holdMs": 1400                // how long before shrink-out
    }
  ]
}
```

## Animation Timeline

### Card/Photo Lifecycle

Each item follows a simple 3-phase lifecycle at its FIXED position:

1. **Pop in** (0→1 scale) over `scaleDurationMs` with `Easing.out(Easing.back(1.4))` — slight overshoot
2. **Hold** at scale 1 for the remainder of `holdMs`
3. **Shrink out** (1→0 scale) over `scaleDurationMs` with `Easing.in(Easing.cubic)`

### Logo Badge (ONLY moving element)

The VSMA© logo badge wanders across the screen following 19 keyframes with `Easing.inOut(Easing.cubic)` interpolation. It's always rendered on top (z-index 100) and stays visible throughout the full duration.

## CLI

```bash
# change logo text and background
npm run text:design-preview -- --logo "BRAND©" --bg "#1a1a2e"

# edit a specific item
npm run text:design-preview -- --card 0 --image "design-preview/new.png" --dimensions "1080 x 1080"

# change item timing
npm run text:design-preview -- --card 5 --enter 3000 --hold 2000

# change logo badge colors
npm run text:design-preview -- --logoBg "#ffffff" --logoText "#000000"
```

## Dependencies

- `remotion` (useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile)
- Images in `public/design-preview/` (01.png – 08.png)

## Editing Cheatsheet

| What | Where |
|------|-------|
| Background color | `spec.bgColor` |
| Logo text | `spec.logoText` |
| Logo badge colors | `spec.logoBgColor`, `spec.logoTextColor` |
| Logo motion path | `spec.logoKeyframes[]` (the ONLY moving element) |
| Item images | `spec.items[n].image` |
| Item fixed position | `spec.items[n].x`, `.y`, `.rotation` |
| Item timing | `spec.items[n].enterMs`, `.holdMs` |
| Item type | `spec.items[n].type` ("card" or "photo") |
| Pop in/out speed | `spec.scaleDurationMs` |
| Card width | `spec.cardWidth` |
| Photo size | `spec.photoSize` |
| Pill colors | `spec.pillActiveColor`, `spec.pillInactiveColor` |
