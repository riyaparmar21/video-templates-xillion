# ThreeDCardFlip

Apple keynote-style 3D card showcase. Images on cards that rotate, tilt, and float in 3D space with perspective transforms, realistic shadows, reflections, and glass highlights. Supports four animation styles for different storytelling needs.

## Files

- `ThreeDCardFlip.tsx` — Main component + TiltShowcase, FlipShowcase, CarouselShowcase, FanShowcase, CardRenderer, HeadlineOverlay, Particles subcomponents
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "ThreeDCardFlip",
  "duration": 6,
  "params": {
    // Array of cards (image path + optional label)
    "cards": [
      { "image": "showcase/01.png", "label": "Dashboard" },
      { "image": "showcase/02.png", "label": "Analytics" }
    ],

    // Or single image shorthand
    "image": "hero-shot.jpg",

    // Animation style:
    // "tilt"     — single card floats and tilts like Apple keynote (default)
    // "flip"     — cards flip 180° to reveal next
    // "carousel" — cards arranged on a rotating 3D ring
    // "fan"      — cards fan out from a stacked position
    "style": "tilt",

    // Card appearance
    "borderRadius": 24,       // Corner radius (default 20)
    "cardWidthPercent": 65,   // Card width as % of canvas (default 65)
    "reflection": true,       // Mirror reflection below card
    "shadow": true,           // Drop shadow + accent glow

    // Optional headline above cards
    "headline": "Built for Scale",

    // Colors (falls back to palette)
    "bgColor": "#0A0A0A",
    "textColor": "#FFFFFF",
    "accentColor": "#7C3AED",

    // Enable ambient floating particles
    "particles": true
  }
}
```

## Animation Styles

| Style      | Best for                          | Cards needed |
|-----------|-----------------------------------|-------------|
| `tilt`     | Hero product shot, feature reveal | 1+          |
| `flip`     | Before/after, feature comparison  | 2+          |
| `carousel` | Portfolio, multi-feature showcase | 3+          |
| `fan`      | Card deck, options display        | 3-7         |

## Animation Timeline

| Phase          | Frames     | What happens                                    |
|---------------|------------|--------------------------------------------------|
| Entrance       | 0–15%      | Spring scale-in from 0                           |
| Tilt float     | 0–100%     | Continuous sine oscillation on X/Y rotation      |
| Card cycle     | Even split | Cards transition (tilt: crossfade, flip: 180° turn) |
| Shadow breathe | 0–100%     | Glow intensity pulses with sine wave             |
| Exit fade      | 85%–100%   | Scene opacity fades to 0                         |

## Visual Details

- **Perspective**: 1200px perspective with 45% origin for natural depth
- **Glass highlight**: 135° gradient overlay for realistic light reflection on card surface
- **Reflection**: Inverted card below with gradient mask + 3px blur at 15% opacity
- **Shadow**: Dual-layer — 60px blur dark shadow + accent color glow
- **Particles**: 15 dots with sine-based vertical drift and opacity pulse
- **Card aspect**: 5:7 ratio (portrait-optimized for mobile video)

## When to Use

- "Show me this feature" product moments
- App screenshot reveals
- Portfolio / project showcases
- Feature comparison (flip style)
- Multiple product variants (fan style)

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, Img, staticFile, AbsoluteFill
