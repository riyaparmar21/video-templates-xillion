---
name: GenAiFeatures
description: 4-scene Gen AI product showcase with typewriter text, floating UI elements, aspect-ratio morphing, and logo reveal
---

# GenAiFeatures Template

## Overview

A cinematic Gen AI product showcase split into 4 sequential scenes. Scene 1 hooks with letter-by-letter typewriter text and a zooming image. Scene 2 shows a centered profile image with overlapping UI elements (prompt box, action buttons). Scene 3 demonstrates aspect-ratio morphing (portrait ↔ landscape). Scene 4 closes with a logo + superscript reveal.

**Format:** 1080 × 1920 (portrait 9:16)
**Duration:** 13 000 ms (13 s)
**FPS:** 30

## Files

| File | Purpose |
|------|---------|
| `src/templates/GenAiFeatures/GenAiFeatures.tsx` | React component (4 scene sub-components) |
| `src/templates/GenAiFeatures/index.ts` | Barrel export |
| `src/gen-ai-features-spec.json` | Spec JSON (data-driven) |
| `public/gen-ai-features/*.png` | Scene images (portrait, profiles, poodle) |

## 4 Scenes

### Scene 1 — Hook (0–4500 ms)

Letter-by-letter typewriter with blinking cursor. Text lines appear character by character with configurable speed (`wordIntervalMs / 4` per character). Trailing words render in a different color and italic style. An image scales in from 0→1 after `imageEnterMs`, then slowly zooms (1→1.08) over the hold period. Exit uses blur + scale animation.

### Scene 2 — Interface (4500–8500 ms)

Centered profile image with overlapping UI elements anchored relative to the image:
- **Buttons** ("Generate versions", "Edit color") — overlap the image's top-right and mid-right edges, slide in from right with staggered delays
- **Prompt box** — overlaps bottom-left of image, contains character-by-character typewriter text with bold keyword highlighting (words from `boldWords` array render bold)
- **Label badge** — appears on prompt box after typing completes

Exit: all elements blur + scale out together.

### Scene 3 — Transformation (8500–11500 ms)

Image enters at portrait dimensions, then smoothly morphs to landscape (width/height interpolated) and back to portrait. Timing controlled by `stretchStartMs`, `stretchToLandscapeMs`, `stretchHoldMs`, `stretchBackMs`. Exit: blur + scale out.

### Scene 4 — Outro (11500–13000 ms)

Logo text with superscript badge slides in from the right (translateX 80→0), holds, then fades out (opacity 1→0).

## Spec JSON

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationMs": 13000,
  "bgColor": "#000000",

  "scene1": {
    "startMs": 0,
    "endMs": 4500,
    "cursorBlinkMs": 500,          // cursor blink interval
    "textLines": [
      { "words": ["Create", "realistic"], "color": "#ffffff" },
      { "words": ["videos", "and"], "color": "#ffffff",
        "trailingWord": "photos", "trailingColor": "#888888", "trailingItalic": true }
    ],
    "wordIntervalMs": 200,         // base interval (chars use /4)
    "textStartMs": 400,
    "image": "gen-ai-features/portrait.png",
    "imageEnterMs": 1800,
    "imageScaleDurationMs": 800,
    "exitStartMs": 3600,
    "exitDurationMs": 600,
    "fontSize": 64,
    "imageSize": 380,
    "imageBorderRadius": 24
  },

  "scene2": {
    "startMs": 4500,
    "endMs": 8500,
    "textLines": [...],            // same format as scene 1
    "image": "gen-ai-features/profiles.png",
    "imageSize": 360,
    "promptBox": {
      "text": "A cinematic shot in a wide open golden field...",
      "boldWords": ["golden", "human", "frame"],
      "label": "Imagen 1",
      "enterDelayMs": 600,
      "typeSpeedMs": 20,           // ms per character
      "bgColor": "rgba(255,255,255,0.12)",
      "width": 320,
      "height": 220
    },
    "buttons": [
      { "text": "Generate versions", "enterDelayMs": 500, "icon": "arrow" },
      { "text": "Edit color", "enterDelayMs": 700, "icon": "color" }
    ],
    "exitStartMs": 3200,
    "exitDurationMs": 600
  },

  "scene3": {
    "startMs": 8500,
    "endMs": 11500,
    "textLines": [...],
    "image": "gen-ai-features/poodle.png",
    "portraitWidth": 320,
    "portraitHeight": 440,
    "landscapeWidth": 560,
    "landscapeHeight": 320,
    "stretchStartMs": 1200,        // when morph begins (relative to scene)
    "stretchToLandscapeMs": 600,   // duration of portrait→landscape
    "stretchHoldMs": 400,          // hold at landscape
    "stretchBackMs": 600,          // duration of landscape→portrait
    "exitStartMs": 2400,
    "exitDurationMs": 500
  },

  "scene4": {
    "startMs": 11500,
    "endMs": 13000,
    "logoText": "acme",
    "logoSuperscript": "AI",
    "enterDurationMs": 500,
    "holdMs": 600,
    "exitDurationMs": 400
  }
}
```

## Animation Details

### Typewriter (Scenes 1 & 2)

Letter-by-letter reveal using a `charBudget` system. Total characters across all lines are counted, and `charsRevealed` is computed from elapsed time. Each line consumes characters from the budget until it runs out. Cursor blinks at `cursorBlinkMs` interval and is positioned after the last revealed character.

### Scene 2 Layout

UI elements are positioned **relative to the centered image**, not to the screen edges. The image sits in a centered container, and buttons/prompt box use absolute positioning with negative offsets to overlap the image edges:
- "Generate versions" button: `top: 20, right: -120` (overlaps top-right corner)
- "Edit color" button: `top: 58%, right: -110` (overlaps mid-right edge)
- Prompt box: `bottom: -80, left: -60` (overlaps bottom-left)

### Exit Transitions

All scenes (1-3) use a shared blur + scale exit: `filter: blur(0→12px)` and `scale(1→0.92)` over `exitDurationMs`. Scene 4 uses opacity fade (1→0).

## CLI

```bash
# change background color
npm run text:gen-ai-features -- --bg "#111111"

# edit scene image
npm run text:gen-ai-features -- --scene 1 --image "gen-ai-features/new-portrait.png"

# change prompt box text and bold words (scene 2)
npm run text:gen-ai-features -- --scene 2 --promptText "A sunset over mountains" --boldWords "sunset,mountains"

# change logo (scene 4)
npm run text:gen-ai-features -- --scene 4 --logo "brand" --logoSuper "AI"
```

## Dependencies

- `remotion` (useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile)
- Images in `public/gen-ai-features/` (portrait.png, profiles.png, poodle.png)

## Editing Cheatsheet

| What | Where |
|------|-------|
| Background color | `spec.bgColor` |
| Scene timing | `spec.scene{n}.startMs`, `.endMs` |
| Scene images | `spec.scene{1,2,3}.image` |
| Typewriter speed | `spec.scene1.wordIntervalMs` (chars use /4) |
| Prompt text | `spec.scene2.promptBox.text` |
| Bold keywords | `spec.scene2.promptBox.boldWords[]` |
| Button labels | `spec.scene2.buttons[].text` |
| Morph dimensions | `spec.scene3.portraitWidth/Height`, `landscapeWidth/Height` |
| Morph timing | `spec.scene3.stretchStartMs`, `stretchToLandscapeMs`, etc. |
| Logo text | `spec.scene4.logoText`, `.logoSuperscript` |
| Font size per scene | `spec.scene{n}.fontSize` |
| Exit animation | `spec.scene{n}.exitStartMs`, `.exitDurationMs` |
