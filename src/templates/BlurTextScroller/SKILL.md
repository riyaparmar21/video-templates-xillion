# BlurTextScroller Template

Vertical word list scrolling upward with progressive blur/opacity, arrow indicator on active word, diagonal rotation, and continuous loop.

## Spec JSON — `src/blur-text-scroller-spec.json`

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 9000,
  "words": ["Motion", "Emotion", "Direction", ...],
  "bgColor": "#000000",
  "textColor": "#FFFFFF",
  "fontSize": 68,
  "fontWeight": 800,
  "letterSpacing": -3,
  "angle": -18,            // rotation of the word list (degrees)
  "lineHeight": 1.35,
  "arrow": "→",            // indicator next to active word
  "visibleAbove": 3,       // blurred words visible above
  "visibleBelow": 3,       // blurred words visible below
  "maxBlur": 10,           // max blur in px for furthest words
  "loop": true,            // continuously loop through words
  "msPerWord": 600         // time each word stays in focus
}
```

## Animation

The scroll is continuous — no discrete snapping. Each word smoothly scrolls upward, spending `msPerWord` ms in the focus position. As words move away from center, blur and opacity increase progressively.

| Distance from center | Blur | Opacity |
|---------------------|------|---------|
| 0 (active) | 0px | 100% |
| 1 word away | ~4px | ~50% |
| 2+ words away | 8–10px | 15–35% |

## Visual Details

- **Background**: Solid black (configurable)
- **Font**: Inter 800 (bold), tight letter spacing
- **Arrow**: "→" character, fades in/out as word approaches/leaves center
- **Rotation**: Entire list rotated -18° for diagonal effect
- **Design space**: 624×716 (auto-scaled via fitScale)

## CLI Quick-Edit

```bash
npm run text:blur-scroller -- "Word1,Word2,Word3,Word4"
node scripts/set-text.mjs blur-scroller "Motion,Emotion,Direction,Jitter"

# Font & style customization
npm run text:blur-scroller -- --fontSize 80 --fontWeight 700
npm run text:blur-scroller -- --letterSpacing -2 --bg "#111111" --textColor "#00FF88"
```

## Dependencies

- `remotion` (useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill)
- `@remotion/google-fonts` (Inter)
