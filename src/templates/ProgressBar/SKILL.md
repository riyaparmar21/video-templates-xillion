# ProgressBar Template

Animated progress bar with gradient fill, grow-in entrance, smooth fill animation, shimmer highlight, and shrink-out exit.

## Spec JSON — `src/progress-bar-spec.json`

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 4000,
  "percentage": 65,          // 0–100 target fill
  "bgColor": "#EFEFEF",
  "trackColor": "#F5B8C4",   // unfilled track tint
  "trackOpacity": 40,        // 0–100
  "fillColorStart": "#FF1150", // left gradient stop
  "fillColorEnd": "#FF6B8A",   // right gradient stop
  "barHeight": 18,
  "barRadius": 50,
  "barWidth": 540
}
```

## Animation Timeline (4 000 ms @ 30 fps = 120 frames)

| Phase | Time (ms) | Frames | What happens |
|-------|-----------|--------|--------------|
| 1 — Grow-in | 0–400 | 0–12 | Track scales from 0.5→1 + fades in (easeOut) |
| 2 — Fill | 400–2200 | 12–66 | Gradient bar fills 0%→target% (natural ease) |
| 3 — Hold | 2200–3200 | 66–96 | Shimmer highlight cycles across filled area |
| 4 — Shrink-out | 3200–3500 | 96–105 | Scales to 0.8 + fades out (easeIn) |

## Visual Details

- **Track**: Rounded pill with low-opacity tint behind the fill
- **Fill**: Linear gradient left-to-right with soft glow (`box-shadow`)
- **Shimmer**: Subtle white highlight sweeps across filled bar every 2s
- **Leading edge**: Small radial glow dot at fill tip

## Layout Constants

- Design artboard: 680×120 px (auto-scaled to fit composition)
- Min fill width clamped to `barHeight` so the pill shape is always intact

## CLI Quick-Edit

```bash
npm run text:progress-bar -- 80
node scripts/set-text.mjs progress-bar --percentage 90 --fillStart "#00C853" --fillEnd "#69F0AE"
```

## Dependencies

- `remotion` (useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill)
- No external fonts or images required
