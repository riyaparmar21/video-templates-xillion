---
name: kinetic-captions
description: Animated word-by-word captions with style tokens, spring pop-ins, and tight line overlap
metadata:
  tags: captions, subtitles, kinetic, typography, spring
---

## Overview

Kinetic Captions renders word-by-word animated caption groups over video or a dark background. Each word springs in with stagger, styled by one of 7 style tokens. Lines overlap tightly to create a bold, stacked look.

## Files

- `src/templates/KineticCaptions/KineticCaptions.tsx` — main component
- `src/templates/KineticCaptions/index.ts` — barrel export
- `src/kinetic-captions-spec.json` — caption data (groups, words, timing)
- `pipeline/caption_gen.py` — LLM-based caption generator (Azure o4-mini)

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": 471,
  "videoSrc": null,            // optional background video URL
  "showBackground": true,      // dark bg (#0A0A0F) when no video
  "groups": [
    {
      "id": 1,
      "startFrame": 0,
      "durationFrames": 28,
      "lines": [
        { "words": [{ "text": "IMAGINE", "style": "big" }, { "text": "a", "style": "filler" }] },
        { "words": [{ "text": "WORLD", "style": "emphasis-blue" }] }
      ]
    }
  ]
}
```

## Style Tokens

| Token | Font | Weight | Size | Color | Purpose |
|-------|------|--------|------|-------|---------|
| `normal` | Montserrat | 800 | 96px | #FFFFFF | Regular words |
| `filler` | Raleway | 300 italic | 78px | #AAAAAA @ 0.6 | Connectors (if, the, a, is) |
| `big` | Montserrat | 900 | 108px | #FFFFFF | Key impactful words |
| `emphasis-blue` | Montserrat | 900 | 100px | #3B9EFF | Highlighted concepts |
| `emphasis-gold` | Montserrat | 900 | 100px | #F5A623 | Warm highlights |
| `accent-blue` | Montserrat | 800 | 96px | #3B9EFF | Subtle blue emphasis |
| `big-blue` | Montserrat | 900 | 108px | #3B9EFF | Large blue impact |

To add a new token: add to the `StyleToken` type union AND add an entry to the `STYLE_MAP` object.

## Animation Details

- **Word entrance**: `spring()` with `{ damping: 12, stiffness: 200, mass: 0.5 }`, staggered 3 frames per word
- **Group exit**: fade + scale-down over last 4 frames of each group
- **Line overlap**: `marginTop: -22px`, `lineHeight: 0.82` for tight stacking
- **Word spacing**: `marginRight: 14px`, `lineHeight: 0.88` per word
- **Text shadow**: `0 2px 14px rgba(0,0,0,0.9), 0 0px 6px rgba(0,0,0,0.7)` for readability
- **Positioning**: centered both X and Y via `justifyContent: "center"` + `alignItems: "center"` on the AbsoluteFill overlay, with 40px horizontal padding

## LLM Caption Pipeline

```bash
python pipeline/caption_gen.py "Your script text here"   # from string
python pipeline/caption_gen.py -f script.txt              # from file
```

Requires `.env` in project root:
```
AZURE_O4_DEPLOYMENT_NAME=o4-mini
AZURE_OPENAI_KEY=<your-key>
AZURE_O4_API_VERSION=2024-12-01-preview
```

Uses `temperature=1` and `max_completion_tokens=16384` (reasoning models need high token budget). Output writes to `src/kinetic-captions-spec.json`.

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Caption position | `<AbsoluteFill>` wrapper — `justifyContent`, `alignItems` |
| Line overlap tightness | `CaptionGroupView` — `marginTop` and `lineHeight` |
| Word stagger speed | `CaptionGroupView` — the `* 3` multiplier on `delay` |
| Spring bounciness | `SPRING_POP_IN` constant — `damping`, `stiffness`, `mass` |
| Font sizes | `STYLE_MAP` — `fontSize` per token |
| Colors | `STYLE_MAP` — `color` per token |
