# TextRevealWipe

Text revealed behind a moving gradient mask or colored bar wipe. The workhorse section transition that every motion graphics studio uses.

## Files

- `TextRevealWipe.tsx` — Main component + WipeRevealText subcomponent
- `index.ts` — Barrel export

## Spec JSON Format

```jsonc
{
  "template": "TextRevealWipe",
  "duration": 4,
  "params": {
    "fps": 30,
    "width": 1080,
    "height": 1920,
    "durationMs": 4000,
    "durationFrames": 120,
    // Headline text (primary reveal)
    "headline": "Chapter Two",
    // Optional subtitle (revealed after headline)
    "subtitle": "The Journey Begins",
    // Wipe direction
    "wipeDirection": "left", // "left" | "right" | "top" | "bottom" | "center"
    // Accent bar color
    "wipeColor": "#FF6B35",
    "headlineSize": 80,
    "subtitleSize": 36,
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
| Headline wipe | 10–45% | Colored bar sweeps across, headline text revealed behind it |
| Subtitle wipe | 40–70% | Second bar sweep reveals subtitle |
| Hold | 70–85% | Both texts fully visible |
| Exit fade | 85–100% | Scene fades to black |

## Visual Details

- Colored accent bar sweeps across the frame
- Text is clipped and revealed progressively behind the bar
- Bar uses inOut cubic easing for satisfying motion
- 5 wipe directions: left-to-right, right-to-left, top, bottom, center-out
- Headline and subtitle revealed sequentially (not simultaneously)
- Subtle horizontal accent line at vertical center

## When to Use

- Section transitions between content scenes
- Chapter/section titles
- Topic introductions
- Any text that needs a polished reveal (not typewriter)

## Dependencies

- `remotion`: useCurrentFrame, useVideoConfig, interpolate, Easing, spring, AbsoluteFill
