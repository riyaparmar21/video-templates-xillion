# Showcase — Template Skill

## Overview

Social media portfolio showcase with spreading border lines, typewriter text, zoom+blur image cycling, and title zoom ending.

## Spec Format (`src/showcase-spec.json`)

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1350,
  "durationMs": 8000,
  "title": "Social Template",
  "website": "www.website.com",
  "bgColor": "#ffffff",
  "titleFontSize": 60,
  "showcaseItems": [
    { "color": "#c9a8e8", "x": 0, "y": -40 },
    { "color": "#7c3aed", "x": 80, "y": 0 },
    { "color": "#1a3a2a", "x": -60, "y": -60 },
    { "color": "#d97706", "x": -40, "y": 60 },
    { "color": "#0891b2", "x": -120, "y": -100 },
    { "color": "#9ca3af", "x": 0, "y": 0 },
    { "color": "#1e1b4b", "x": 60, "y": -30 },
    { "color": "#06b6d4", "x": -80, "y": 40 },
    { "color": "#4c1d95", "x": 100, "y": -80 },
    { "color": "#f97316", "x": -20, "y": -20 }
  ]
}
```

## Animation — Three Phases

### Phase 1: Intro (0–1000ms)

- Two vertical lines start close to centre (20px apart), spread outward to page margins (x=80 and x=1000)
- Top/bottom horizontal lines connect them, with centre tick marks
- "Social Template" types in letter-by-letter (200–900ms)
- "www.website.com" types in (300–1000ms)
- Smooth bezier easing on line spread

### Phase 2: Image Showcase (1000–6500ms)

Each of the 10 showcase items follows this lifecycle:

1. **Appears tiny** at a unique position (scale ≈ 0) near centre + offset
2. **Scales up** to normal size (scale 1) over ~35% of cycle duration
3. **Continues scaling** way past viewport (scale → 9) over remaining 65%
4. **Blurs heavily** (0 → 40px) starting at 55% through cycle
5. **Fades out** as blur increases
6. Next item starts its cycle

Items are at DIFFERENT positions each time (controlled by x/y offsets). Each cycle is ~550ms. Card base size: 158×196px with borderRadius 16.

### Phase 3: Ending (6500–8000ms)

- "Social Template" text scales from 1 → 8 with smooth easing
- Blur increases from 0 → 30px
- Title opacity fades to 0
- Border lines and website text fade out
- White overlay fades in for clean ending

## CLI Commands

```bash
npm run text:showcase -- --title "Design System" --website "www.design.co"
npm run text:showcase -- --title "Portfolio" --bg "#f5f5f5"
npm run text:showcase -- --titleFontSize 64
```

## Architecture Notes

- `fitScale = Math.min(width/1080, height/1350)` for responsive sizing
- Content rendered at 1080×1350 base, scaled to fit
- Font: Manrope (Google Fonts) — weights 400, 800
- Easing: `Easing.bezier(0.4, 0, 0.2, 1)` matching Jitter's smooth standard
- Showcase items use CSS `filter: blur()` for the blur-out effect
- Title typewriter uses `interpolate` to control character count
- Each showcase item has independent scale/blur/opacity interpolations
- Border lines use `lineSpread` interpolation (0→1) mapped to x positions

## File Locations

| File | Purpose |
|------|---------|
| `src/templates/Showcase/Showcase.tsx` | Main component |
| `src/templates/Showcase/index.ts` | Barrel export |
| `src/showcase-spec.json` | Spec JSON |
