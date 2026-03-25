# NumberCounterScene

Cinematic animated counter with massive-scale number, eased count-up, particle effects, and light burst on completion.

## Files

- `NumberCounterScene.tsx` — Main component + Particles, LightBurst subcomponents
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "NumberCounterScene",
  "duration": 5,
  "params": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationMs": 5000,
    "durationFrames": 150,
    // Target number to count to
    "target": 10000,
    // Optional prefix/suffix
    "prefix": "$",  // e.g., "$", "#", ""
    "suffix": "+",  // e.g., "%", "M+", "K", ""
    // Label below the number
    "label": "Revenue Generated",
    // Decimal places (0 for integers)
    "decimals": 0,
    // Font size for the number (300-400 recommended)
    "fontSize": 320,
    // Background particles (0 to disable)
    "particleCount": 40,
    // Glow/accent color
    "glowColor": "#FF6B35",
    "bgColor": "#0A0A0A",
    "textColor": "#FFFFFF",
    "accentColor": "#FF6B35"
  }
}
```

## Animation Timeline

| Phase | Frames | What happens |
|-------|--------|--------------|
| Fade in | 0–6 | Scene fades in |
| Number entrance | 0–15 | Number springs in from small scale |
| Count up | 8–70% | Number counts from 0 to target with cubic ease-out |
| Bounce | 70% | Spring bounce when count completes |
| Light burst | 70% | Radial light burst flash on completion |
| Glow ramp | 0–100% | Radial glow behind number intensifies with count |
| Exit fade | 85–100% | Scene fades to black |

## Visual Details

- Number at 320px+ font size (configurable)
- Cubic ease-out count (fast start, decelerating end)
- Spring bounce at final number (damping: 8, overshoot feel)
- Ambient floating particles with flicker
- Radial glow intensifies as count progresses
- Light burst flash at moment of completion
- Prefix/suffix in accent color, smaller scale
- Label in muted text, uppercase tracking

## When to Use

- Key statistic reveal (revenue, users, growth)
- Milestone celebration
- Data point emphasis
- Any time a number needs to feel IMPORTANT

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, AbsoluteFill
