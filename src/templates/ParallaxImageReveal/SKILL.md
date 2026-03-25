# ParallaxImageReveal

Cinematic parallax depth effect for images — Ken Burns on steroids. Splits a single image into depth layers that drift at different speeds with depth-of-field blur, light leaks, and spring-animated text overlays. The "hero moment" template that makes a product shot or landscape feel epic.

## Files

- `ParallaxImageReveal.tsx` — Main component + GradientLayer fallback + TextOverlay subcomponent
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "ParallaxImageReveal",
  "duration": 5,
  "params": {
    // Image source (URL, data URI, or public/ path)
    "image": "hero-shot.jpg",

    // Number of depth layers (2-6, default 4)
    "layerCount": 4,

    // Direction of parallax drift
    // "up" | "down" | "left" | "right" | "diagonal"
    "direction": "up",

    // Drift speed: "slow" | "medium" | "fast"
    "speed": "medium",

    // Ken Burns zoom: "in" | "out" | "none"
    "zoom": "in",

    // Reveal animation style
    // "fade" — simple opacity fade-in (default)
    // "iris" — circle expanding from center
    // "wipe" — left-to-right reveal
    // "split" — vertical curtain opening from center
    "revealStyle": "iris",

    // Optional text overlay
    "headline": "The Future Is Here",
    "subtitle": "Redefining what's possible",

    // Colors (falls back to palette)
    "bgColor": "#0A0A0A",
    "textColor": "#FFFFFF",
    "accentColor": "#FF6B35",

    // Atmosphere toggles
    "vignette": true,
    "lightLeak": true
  }
}
```

## Animation Timeline

| Phase        | Frames      | What happens                                          |
|-------------|-------------|-------------------------------------------------------|
| Reveal       | 0–25%       | Image reveals via chosen style (fade/iris/wipe/split) |
| Layers enter | 0–20%       | Spring-staggered entrance, back→front                 |
| Parallax     | 0–100%      | Continuous depth-based drift per layer                |
| Ken Burns    | 0–100%      | Slow global scale (in or out)                         |
| Text enter   | ~20%–35%    | Headline + subtitle spring up with shadow             |
| Light leak   | 0–100%      | Subtle drifting radial glow overlay                   |
| Exit fade    | 85%–100%    | Scene opacity fades to 0                              |

## Visual Details

- **Depth-of-field**: Back layers get up to 8px gaussian blur, front layers are crisp
- **Brightness depth**: Back layers are dimmer (0.7), front layers full brightness
- **Per-layer scale**: Foreground pops slightly forward (1.06x) vs background (1.0x)
- **Light leak**: Animated radial gradient with screen blend mode, drifts organically
- **Vignette**: Radial gradient from transparent center to semi-opaque edges
- **Text shadows**: Multi-layer shadow with accent color glow for cinematic feel
- **Fallback**: When no image is provided, renders abstract animated gradient layers

## When to Use

- Hero product shots that need to feel cinematic
- Landscape/atmosphere establishing shots
- "Money shot" moments in a video
- Photo reveals with dramatic entrance
- Section transitions with a featured image

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, Img, staticFile, AbsoluteFill
