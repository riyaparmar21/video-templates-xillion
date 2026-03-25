# GradientWash

Full-screen animated gradient that morphs between 3-4 colors over time. A premium cinematic breather between content-heavy scenes.

## Files

- `GradientWash.tsx` — Main component + TextOverlay subcomponent
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "GradientWash",
  "duration": 3,
  "params": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationMs": 3000,
    "durationFrames": 90,
    // 3-4 hex colors to morph between
    "colors": ["#FF6B35", "#7C3AED", "#06B6D4", "#EC4899"],
    // Gradient rendering style
    "style": "radial", // "radial" | "linear" | "mesh" | "aurora"
    // Animation speed
    "speed": "medium", // "slow" | "medium" | "fast"
    // Optional section title overlay
    "text": "", // leave empty for pure atmospheric
    "textSize": 48,
    "bgColor": "#0A0A0A",
    "textColor": "#FFFFFF",
    "accentColor": "#FF6B35"
  }
}
```

## Animation Timeline

| Phase | Frames | What happens |
|-------|--------|--------------|
| Fade in | 0–8 | Scene fades in from black |
| Gradient morph | 0–85% | Colors smoothly cycle and blend through orbital motion |
| Text entrance | 15% | Optional text springs in from below |
| Exit fade | 85–100% | Scene + text fade to black |

## Visual Details

- Radial: overlapping elliptical gradients with orbital movement
- Linear: rotating full-screen gradient sweep
- Mesh: 4 circular gradients forming a mesh-like blend
- Aurora: horizontal wave bands with gentle undulation
- Vignette overlay for depth
- Film grain for cinematic texture (4% opacity SVG noise)

## When to Use

- 2-3s breather scene between content-heavy PRIMARY templates
- Section transitions (with optional title text)
- Color palette establishing shot
- Opening/closing atmospheric moment

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, AbsoluteFill
