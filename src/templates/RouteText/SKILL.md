# RouteText — Template Skill

## Overview

Kinetic typography with multi-row scrolling city names, gold arrow separators, and staggered speed per row.

## Spec Format (`src/route-text-spec.json`)

```json
{
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationMs": 6000,
  "bgColor": "#000000",
  "textColor": "#ffffff",
  "arrowColor": "#ffbf26",
  "fontSize": 220,
  "rowHeight": 270,
  "rows": [
    {
      "cities": ["Bruxelles", "København", "Warszawa", "Bruxelles", "København"],
      "scrollX": 4050,
      "durationMs": 4500
    },
    {
      "cities": ["Barcelona", "Zaragoza", "Madrid", "Barcelona", "Zaragoza"],
      "scrollX": 3550,
      "durationMs": 4750
    },
    {
      "cities": ["Fiorence", "Genève", "Milano", "Fiorence", "Genève"],
      "scrollX": 3190,
      "durationMs": 5000
    },
    {
      "cities": ["Wien", "Praha", "München", "Wien", "Praha"],
      "scrollX": 2920,
      "durationMs": 5250
    }
  ]
}
```

### Row Parameters

- `cities` — Array of city names (duplicated to fill scroll width)
- `scrollX` — Total pixels to scroll left
- `durationMs` — Time to complete the scroll (different per row)

Row 1 is fastest (4050px in 4500ms = 900px/s) → Row 4 is slowest (2920px in 5250ms ≈ 556px/s).

## Animation

All rows start scrolling simultaneously from `t=0`, but each has different scrollX distances and durations. Combined with the smooth ease-out easing, this creates the visual impression of staggered motion:

1. **Lines 1–2** move first, fast
2. After a short pause feeling, **Lines 3–4** catch up while Lines 1–2 decelerate
3. All lines settle to a stop, with Row 4 finishing last

Easing: `Easing.bezier(0.0, 0.0, 0.2, 1)` — smooth ease-out matching Jitter's "smooth:standard".

## CLI Commands

```bash
npm run text:route-text
npm run text:route-text -- --bgColor "#1a1a2e" --arrowColor "#e94560"
npm run text:route-text -- --fontSize 180 --rowHeight 230 --textColor "#00FF88"
```

## Architecture Notes

- `fitScale = Math.min(width/1920, height/1080)` for responsive sizing
- Content rendered at 1920×1080 base canvas, scaled to fit composition dimensions
- Font: Instrument Sans 700 (Google Fonts via `@remotion/google-fonts/InstrumentSans`)
- Arrow character: `➜` (U+279C) — heavy round-tipped rightwards arrow
- Each row is a `position: absolute` div with `transform: translateX()` for GPU-accelerated scrolling
- Overflow hidden on the canvas container clips text at edges
- Cities are rendered as `<span>` elements with arrow `<span>` separators between them

## File Locations

| File | Purpose |
|------|---------|
| `src/templates/RouteText/RouteText.tsx` | Main component |
| `src/templates/RouteText/index.ts` | Barrel export |
| `src/route-text-spec.json` | Spec JSON |
