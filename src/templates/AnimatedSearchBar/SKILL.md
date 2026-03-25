---
name: animated-search-bar
description: Animated search bar with grow-in, width expansion, letter-by-letter typing, and shrink-out exit
metadata:
  tags: search, bar, typing, grow, shrink, text-animation, UI
---

## Overview

Animated Search Bar renders a search bar UI element that grows in from center, expands from a narrow pill to full width, types out a query letter-by-letter with a blinking cursor, then shrinks out. Based on a Figma motion spec with 5 animation phases over 4 seconds.

## Files

- `src/templates/AnimatedSearchBar/AnimatedSearchBar.tsx` — main component
- `src/templates/AnimatedSearchBar/index.ts` — barrel export
- `src/animated-search-bar-spec.json` — search bar config (text, colors, timing)

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 4000,
  "searchText": "Best motion design tool",
  "iconSrc": null,               // optional icon URL, falls back to built-in magnifying glass
  "bgColor": "transparent",      // artboard background
  "barColor": "#ffffff",          // search bar fill
  "textColor": "#404040",        // typed text color
  "barRadius": 40,               // corner radius of the bar
  "fontSize": 24                  // search text font size
}
```

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 680 x 120 (scaled to fit composition) |
| Bar full width | 640 |
| Bar narrow width | 80 (initial state before resize) |
| Bar height | 80 |
| Corner radius | 40px |
| Icon size | 40 x 40 |
| Font | Inter 500 |

## Animation Timeline

### Phase 1: Bar Grow-In

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 0–400ms | scale | 0.5 | 1 | `Easing.out(Easing.quad)` |
| 0–400ms | opacity | 0 | 1 | `Easing.out(Easing.quad)` |

### Phase 2: Icon Grow-In (staggered)

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 100–500ms | scale | 0.5 | 1 | `Easing.out(Easing.quad)` |
| 100–500ms | opacity | 0 | 1 | `Easing.out(Easing.quad)` |

### Phase 3: Bar Width Expansion

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 400–1100ms | width | 80px | 640px | `Easing.bezier(0.25, 0.1, 0.25, 1)` (natural) |

### Phase 4: Typewriter Text

| Time | Effect | Details |
|------|--------|---------|
| 900ms+ | Typewriter | Each letter appears instantly, 60ms interval between letters |
| — | Blinking cursor | 530ms cycle, visible during typing |

### Phase 5: Bar Shrink-Out

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 3200–3500ms | scale | 1 | 0.8 | `Easing.in(Easing.quad)` |
| 3200–3500ms | opacity | 1 | 0 | `Easing.in(Easing.quad)` |

## Dependencies

- `@remotion/google-fonts/Inter` — Google Font loading
- `remotion` — `useCurrentFrame`, `useVideoConfig`, `interpolate`, `Easing`, `AbsoluteFill`, `Img`

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Search text | Spec JSON — `searchText` |
| Colors | Spec JSON — `bgColor`, `barColor`, `textColor` |
| Icon | Spec JSON — `iconSrc` (URL or staticFile path) |
| Animation timing | `TIMING` object in component — all values in ms |
| Bar dimensions | `ARTBOARD`, `BAR`, `ICON` constants in component |
| Typing speed | `TIMING.textIn.letterIntervalMs` (ms between each letter appearing) |
| Corner radius | Spec JSON — `barRadius` |
| Font size | Spec JSON — `fontSize` |
| Cursor blink rate | `BlinkingCursor` component — `530` ms cycle value |

## CLI Commands

```bash
npm run text:search-bar -- "How to edit videos with AI"
npm run aspect -- search-bar 9:16
```
