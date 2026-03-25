# VaultAnimatedCards — Template Skill

## Overview

Tilted credit card grid with 3-phase animation: tight diagonal scroll → zoom-out straighten → center tagline reveal with neighbor fade.

## Spec Format (`src/vault-animated-cards-spec.json`)

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 11000,
  "bgColor": "#ebebeb",
  "cards": [
    {
      "bgColor": "#0000c7",
      "textColor": "#ffffff",
      "brand": "Acme",
      "cardNumber": "3346",
      "network": "VISA",
      "type": "credit"
    },
    {
      "bgColor": "#1a1a1a",
      "textColor": "#555555",
      "type": "chart"
    },
    {
      "bgColor": "#000",
      "textColor": "#fff",
      "type": "image",
      "bgImage": "card-photo.jpg"
    },
    {
      "bgColor": "#0000c7",
      "textColor": "#ffffff",
      "brand": "Acme",
      "bgImage": "https://example.com/card-bg.png",
      "bgImageFit": "cover"
    }
  ],
  "gridCols": 5,
  "gridRows": 5,
  "cardWidth": 340,
  "cardHeight": 212,
  "cardRadius": 20,
  "startAngle": -35,
  "tagline": "Finances\nmade simple",
  "taglineBrand": "Acme",
  "taglineColor": "#1a1a1a"
}
```

## Card Types

- **credit** (default): Shows brand name (large, bottom-left), card number dots (mid-left), network badge (top-right). Optionally supports `bgImage` behind text.
- **chart**: Analytics card with bar chart, "Total Spending" header, dollar amount, and day-of-week labels
- **image**: Image-only card — renders `bgImage` with no text overlays

## Card Image Support

Any card type (except `chart`) can include a background image:

| Field | Type | Description |
|-------|------|-------------|
| `bgImage` | string | URL, data URI, or `staticFile` path (e.g. `"card-photo.jpg"` → `public/card-photo.jpg`) |
| `bgImageFit` | `"cover"` \| `"contain"` | How the image fills the card. Default: `"cover"` |

- For **credit** cards with `bgImage`: the image renders behind the brand/number/network text
- For **image** cards: the image fills the entire card with no text overlay
- Local images go in `public/` and are referenced by filename (uses Remotion's `staticFile`)
- Remote images use full URLs (`https://...`)

## Animation Phases

| Phase | Progress | What happens |
|-------|----------|--------------|
| 1 (Scroll) | 0–45% | Tight grid at -35°, scale 2.8, gap 8px, per-row alternating horizontal scroll |
| 2 (Spread) | 45–75% | Zoom out to scale 0.95, straighten to 0°, widen gap to 80px, scroll returns to center |
| 3 (Reveal) | 75–90% | Center card fades out, tagline scales in at viewport center |
| 4 (Loop) | 90–100% | Zoom back in, re-tilt, return to starting state for seamless loop |

## Key Animation Values

```
angle:          [-35, -29.75, 0, 0, -35]     steep tilt → straight → back
gridScale:      [2.8, 2.4, 0.95, 0.95, 2.8]  massive zoom → fit → zoom back
gap:            [8, 12, 80, 80, 8]             tight → spread → tight
rowScrollAmt:   [0, 120, 0, 0, 0]             per-row alternating drift
scrollY:        [0, -40, 0, 0, 0]             vertical drift up → re-center
```

### Per-Row Alternating Scroll

Even rows (0, 2, 4) scroll RIGHT (+), odd rows (1, 3) scroll LEFT (-). This creates the conveyor-belt parallax effect visible in the reference animation.

## CLI Commands

```bash
# Update tagline and brand
npm run text:vault-cards -- --tagline "Banking\nreimagined" --brand "MyBank"

# Change aspect ratio
npm run aspect -- vault-cards 9:16
```

## Architecture Notes

- Uses `fitScale = Math.min(width/1080, height/1080)` for responsive sizing
- Cards cycle through the `cards` array to fill the grid (modulo indexing)
- Tagline is rendered in a separate overlay layer (not inside the grid transform) so it stays at viewport center regardless of grid scroll/rotation
- Center card at `[floor(rows/2), floor(cols/2)]` fades between progress 0.65–0.78
- Tagline counter-scales with `Easing.out(Easing.back(1.3))` for a bouncy entrance
- Images resolved via `resolveImageSrc()`: URLs pass through, local filenames use `staticFile()`
- Uses Remotion's `<Img>` component for image rendering (handles loading/caching)

## File Locations

| File | Purpose |
|------|---------|
| `src/templates/VaultAnimatedCards/VaultAnimatedCards.tsx` | Main component |
| `src/templates/VaultAnimatedCards/index.ts` | Barrel export |
| `src/vault-animated-cards-spec.json` | Spec JSON |
