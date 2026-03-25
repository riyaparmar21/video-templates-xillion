# LogoStinger

Punchy 2-3 second brand moment with the logo assembling from particles, scaling in, blurring in, or expanding from a line. Works as both opener and closer.

## Files

- `LogoStinger.tsx` — Main component + StingerParticles, FlashOverlay subcomponents
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "LogoStinger",
  "duration": 3,
  "params": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationMs": 3000,
    "durationFrames": 90,
    // Logo image from public/ folder (REQUIRED)
    "logo": "gen-ai-features/portrait.png",
    // Optional tagline below logo
    "tagline": "Built for Scale",
    // Assembly style
    "style": "particles", // "particles" | "scale" | "blur" | "line"
    // Logo display size
    "logoSize": 280,
    "bgColor": "#0A0A0A",
    "textColor": "#FFFFFF",
    "accentColor": "#7C3AED"
  }
}
```

## Animation Timeline

| Phase | Frames | What happens |
|-------|--------|--------------|
| Fade in | 0–4 | Scene fades in |
| Build-up | 0–40% | Style-dependent: particles converge / line expands / anticipation |
| Reveal | 40% | Logo appears with spring. Flash overlay fires. |
| Tagline | 40%+12f | Tagline springs in below logo |
| Hold | 50–85% | Logo + tagline fully visible with accent glow |
| Exit fade | 85–100% | Scene fades to black |

## Visual Details

- **Particles**: 60 dots converge from all angles toward center, then explode outward at reveal
- **Scale**: Logo springs in from tiny (0.1×) with blur-to-sharp
- **Blur**: Logo fades in from heavy 30px blur with slight scale-down
- **Line**: Horizontal accent line expands, then dissolves as logo springs in
- Flash overlay at reveal moment (radial gradient pulse)
- Accent glow halo behind logo
- Tagline in uppercase tracking with delayed spring entrance

## When to Use

- Video opener (brand introduction)
- Video closer (sign-off)
- Section brand moments
- Sponsor/partner reveals

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, AbsoluteFill, Img, staticFile
