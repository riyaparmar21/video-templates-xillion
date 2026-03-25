# SplitScreenMorph

Two images side by side that animate in from opposite edges with an animated divider line. Before/after, comparison, old vs new.

## Files

- `SplitScreenMorph.tsx` — Main component + Label, Divider subcomponents
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "SplitScreenMorph",
  "duration": 5,
  "params": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationMs": 5000,
    "durationFrames": 150,
    // Two images (REQUIRED)
    "imageLeft": "color-blend-blocks/scene_portrait.png",
    "imageRight": "color-blend-blocks/scene_sneaker.png",
    // Optional labels
    "labelLeft": "Before",
    "labelRight": "After",
    // Reveal animation style
    "revealStyle": "slide", // "slide" | "wipe" | "push"
    // Divider orientation
    "orientation": "vertical", // "vertical" | "horizontal"
    // Divider customization
    "dividerColor": "#FFFFFF",
    "dividerWidth": 4,
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
| Image reveal | 0–60% | Images animate in from opposite edges, divider moves to center |
| Labels enter | 70–80% of reveal | Labels spring in with tags |
| Hold | 60–85% | Both images fully visible with divider |
| Exit fade | 85–100% | Scene fades to black |

## Visual Details

- Slide: images translate in from edges + clip reveal
- Wipe: clean clip-path reveal without translation
- Push: images push each other into frame
- Divider has shimmer gradient animation and glow shadow
- Labels are pill-shaped badges with accent color

## When to Use

- Before/after comparisons
- Old vs new product shots
- Side-by-side visual comparisons
- Two-option choice scenes

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, AbsoluteFill, Img, staticFile
