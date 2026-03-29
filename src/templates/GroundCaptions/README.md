# GroundCaptions

3D perspective text that looks painted on the ground surface of any image — like stadium text, street art, or parking lot lettering viewed from above.

Uses CSS 3D transforms (`rotateX`, `rotateZ`, `scaleY`, `perspective`) to tilt, rotate, and stretch text so it matches the ground plane in the photo. Supports static images and video backgrounds, custom Google Fonts, per-line staggered animations, and full color/opacity control.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Two Workflows](#two-workflows)
3. [CLI Reference](#cli-reference)
4. [Interactive Tuner](#interactive-tuner)
5. [How CSS 3D Ground Text Works](#how-css-3d-ground-text-works)
6. [The Spec JSON](#the-spec-json)
7. [LLM Image Analysis](#llm-image-analysis)
8. [Architecture & Files](#architecture--files)
9. [Troubleshooting](#troubleshooting)
10. [Environment Setup](#environment-setup)

---

## Quick Start

The fastest way to get a ground-text video from any image:

```bash
# Automatic — LLM analyzes the image and writes the spec
npm run ground:plan -- photo.jpg --text "STOP|RIGHT|THERE" --color "#FF0000"
npm start
```

That's it. The plan script sends the image to GPT-4o vision, which determines the camera angle, ground direction, and empty space, then writes all CSS 3D transform values to the spec. Open Remotion Studio to preview, or render directly.

---

## Two Workflows

### Workflow 1: Fully Automatic (LLM decides everything)

```bash
npm run ground:plan -- <image> --text "LINE1|LINE2|LINE3"
npm start                # preview in Remotion Studio
npm run render:cli -- src/index.ts GroundCaptions --output out/ground-captions.mp4
```

The LLM vision model looks at your image and picks the optimal `rotateX`, `rotateZ`, `scaleY`, `perspective`, position, and font size. One command writes the entire spec. Best for quick results with well-lit, clearly angled photos.

### Workflow 2: Manual Tuning (you adjust it visually)

```bash
npm run ground:plan -- <image>       # copy image + optional LLM analysis
npm run ground:tuner                 # opens http://localhost:4455/tuner
```

The tuner loads your image in a 9:16 phone-shaped preview. Drag the text to reposition it, use sliders to adjust every 3D transform parameter in real time, edit the text content, font, and colors. When it looks right, hit **Save & Render** — the tuner triggers Remotion directly and shows a live progress bar with frame count and percentage.

This workflow is ideal when the LLM's initial placement isn't perfect, or when you want precise creative control.

---

## CLI Reference

### `ground:plan` — LLM-powered placement

```bash
npm run ground:plan -- <image_path> [options]
```

The plan script does three things: copies the image to `public/groundCaptions/background.png`, sends it to the LLM vision API for analysis, and writes the results to `src/ground-captions-spec.json`.

#### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--text` | `-t` | keeps existing | Caption lines, separated by `\|` pipes |
| `--font` | `-f` | `Archivo Black` | Any Google Font family name |
| `--color` | `-c` | `#FFFFFF` | Text color as hex |

#### Examples

```bash
# Basic — LLM picks everything, default white text
npm run ground:plan -- photo.jpg

# Custom text and color
npm run ground:plan -- photo.jpg --text "HELLO|WORLD" --color "#FF0000"

# Single line, different font
npm run ground:plan -- stadium.png --text "GAME DAY" --font "Bebas Neue"

# Three lines, red, Oswald font
npm run ground:plan -- sidewalk.jpg -t "KISI KO|BATANA|MAT" -f "Oswald" -c "#E53935"
```

If `--text` is omitted, existing lines in the spec are preserved. If no spec exists, it falls back to a default.

### `ground:tuner` — Interactive visual editor

```bash
npm run ground:tuner
# → opens http://localhost:4455/tuner
```

No flags — just starts the Flask server and opens your browser.

---

## Interactive Tuner

The tuner is a browser-based UI served by a local Flask server at `http://localhost:4455/tuner`.

### Controls

**Left panel:**
- Text content: edit each line, add or remove lines
- Font family: any Google Font name (loads dynamically)
- Color picker: text color with hex input
- Font size slider: 50–400px
- 3D transform sliders: rotateX, rotateY, rotateZ, scaleY, perspective distance
- Position sliders: X% and Y% (0–100)

**Right panel:**
- Live 9:16 phone-shaped preview at the correct 1080×1920 aspect ratio
- Drag anywhere on the preview to reposition the text
- Crosshair cursor on hover for precision placement

### Buttons

- **Load Spec** — reads the current `ground-captions-spec.json` from disk
- **Save Spec** — writes all tuner values back to the spec JSON
- **Save & Render** — saves the spec and triggers a Remotion render, showing a live progress bar with frame count (e.g., "Frame 45/150"), percentage, and status messages ("Rendering...", "Stitching...", "Complete!")

### How the progress bar works

When you click Save & Render, the tuner:
1. POSTs the spec to `/api/spec`
2. POSTs to `/api/render` to start the Remotion CLI in a background process
3. Polls `/api/render/progress` every 500ms
4. The Flask server reads Remotion's stdout in a background thread, parsing lines like `Rendered frame 45/150` and percentage patterns
5. The progress bar updates in real time until the render completes or fails

---

## How CSS 3D Ground Text Works

The entire effect is pure CSS 3D transforms on two nested `div` elements. No WebGL, no canvas, no 3D engine.

```
Parent container:
  perspective: 1500px;

Child (text block):
  transform: rotateX(55deg) rotateZ(-5deg) scaleY(2.5);
  transform-origin: bottom center;
```

### What each property does

**`rotateX`** — Tilts text forward into the ground plane. This is the primary control. 0° means text faces the camera flat; 90° would be completely flat on the floor (invisible). Practical range: 40–65° for most overhead/angled shots. Higher angles (65–80°) for near-eye-level shots looking along the ground.

**`rotateZ`** — Rotates text to match the ground's directional slope. If the ground recedes slightly to the right, use a negative rotateZ. If it slopes left, use positive. Typical range: -20° to +20°. Most images are close to 0°.

**`scaleY`** — Vertical stretch to counteract the foreshortening from rotateX. When text is tilted forward, it gets compressed vertically — scaleY stretches it back so it looks proportional from the camera's perspective. Typical range: 1.5–3.5x. Higher rotateX needs higher scaleY.

**`perspective`** — Set on the parent container. Controls how dramatic the foreshortening (size difference between top and bottom of text) appears. Lower values = more dramatic depth; higher values = more uniform. Safe range: 800–2000px.

**`transform-origin: bottom center`** — Anchors the rotation at the bottom of the text block, so the text tilts "into" the ground from its base.

### The critical math constraint

The perspective distance must be large enough that the text doesn't clip behind the camera plane. The rule:

```
perspective > textHeight × scaleY × sin(rotateX)
```

If this constraint is violated, the text either disappears or renders with bizarre inversions. This is why perspective values below 500px combined with large scaleY and high rotateX cause problems.

### Calibrated value ranges

These ranges produce good results across a variety of images at 1080×1920:

| Property | Safe Range | Typical Sweet Spot |
|----------|-----------|-------------------|
| rotateX | 40–80° | 45–65° |
| rotateZ | -20° to +20° | -10° to +10° |
| scaleY | 1.5–3.5x | 2.0–3.0x |
| perspective | 800–2000px | 1200–1600px |
| fontSize | 150–400px | 180–280px |
| position Y | 50–90% | 65–80% |

---

## The Spec JSON

All configuration lives in `src/ground-captions-spec.json`. Both the plan script and the tuner read/write this file.

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": 150,
  "durationMs": 5000,
  "backgroundImage": "groundCaptions/background.png",
  "videoSrc": null,
  "showBackground": true,
  "backgroundColor": "#222",
  "textColor": "#FF0000",
  "fontFamily": "Archivo Black",
  "fontSize": 200,
  "enableShadow": true,
  "lineHeight": 0.85,
  "animation": "slideForward",
  "blendMode": "normal",
  "textOpacity": 0.95,
  "perspective": {
    "distance": 1431,
    "rotateX": 50,
    "rotateY": 0,
    "rotateZ": 45,
    "scaleY": 2.6
  },
  "position": {
    "x": 25,
    "y": 71
  },
  "lines": [
    { "text": "STOP", "startFrame": 0 },
    { "text": "RIGHT", "startFrame": 8 },
    { "text": "THERE", "startFrame": 16 }
  ]
}
```

### Field reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fps` | number | 30 | Frames per second |
| `width` / `height` | number | 1080 / 1920 | Canvas dimensions (9:16 vertical) |
| `durationFrames` | number | 150 | Total video length in frames |
| `durationMs` | number | 5000 | Total video length in milliseconds |
| `backgroundImage` | string \| null | — | Path relative to `public/` folder |
| `videoSrc` | string \| null | — | Video background (alternative to image) |
| `showBackground` | boolean | true | Whether to render the background |
| `backgroundColor` | string | `#222` | Fallback color when no image is set |
| `textColor` | string | `#FFFFFF` | Global text color (hex) |
| `fontFamily` | string | `Archivo Black` | Google Font family name |
| `fontSize` | number | 280 | Font size in pixels |
| `enableShadow` | boolean | true | Drop shadow beneath text |
| `lineHeight` | number | 0.85 | CSS line-height (tight = more compact) |
| `animation` | string | `slideForward` | Entry animation: `slideForward`, `scaleUp`, `fadeIn` |
| `blendMode` | string | `normal` | CSS mix-blend-mode (use `normal` — `overlay` is invisible on light surfaces) |
| `textOpacity` | number | 0.95 | Overall text opacity (0–1) |
| `perspective.distance` | number | 300 | CSS perspective in px (safe: 800–2000) |
| `perspective.rotateX` | number | 70 | Tilt into ground in degrees |
| `perspective.rotateY` | number | 0 | Rarely used — horizontal tilt |
| `perspective.rotateZ` | number | 0 | Rotation to match ground direction |
| `perspective.scaleY` | number | 6.5 | Vertical stretch factor |
| `position.x` | number | 50 | Horizontal position (0=left, 100=right) |
| `position.y` | number | 60 | Vertical position (0=top, 100=bottom) |
| `lines[].text` | string | — | The text content for this line |
| `lines[].startFrame` | number | — | Frame when this line appears (staggered by 8 frames) |
| `lines[].fontSize` | number | — | Per-line font size override |
| `lines[].color` | string | — | Per-line color override |

### Animations

Lines appear sequentially, staggered by 8 frames (about 0.27s at 30fps). Each line has its own spring-physics entrance animation:

- **slideForward** — slides up from below with fade-in (default, looks like text rising from the ground)
- **scaleUp** — scales from 20% to 100% with fade-in
- **fadeIn** — simple opacity fade

---

## LLM Image Analysis

The plan script (`scripts/ground-captions-plan.py`) sends the image to a vision LLM with a detailed prompt that teaches the model about CSS 3D transforms. The prompt includes calibration examples — real values that looked good on similar images — so the LLM has concrete reference points rather than guessing from theory.

### What the LLM determines

Given an image, the LLM returns a JSON object with seven values: `rotateX`, `rotateZ`, `scaleY`, `perspective`, `positionX`, `positionY`, and `fontSize`. It makes these decisions by analyzing the camera angle (overhead vs. angled vs. eye-level), the direction the ground surface recedes, and where empty ground space exists to place text without occluding the subject.

### API priority

1. **Azure OpenAI GPT-4o** (primary) — requires `AZURE_OPENAI_KEY` + `AZURE_GPT_IMAGE_ENDPOINT` in `.env`
2. **Google Gemini** (fallback) — requires `GEMINI_API_KEY` in `.env`

The script tries Azure first. If it fails or the key isn't set, it falls back to Gemini. If neither key exists, the script exits with an error.

### Prompt engineering notes

The LLM prompt includes explicit calibration ranges to prevent common mistakes:

- rotateX is guided to 45–65° for overhead/angled shots (not 70–80°, which over-tilts)
- scaleY is guided to 2.0–3.5 (not 5–7, which over-stretches)
- perspective is guided to 1000–2000px (not 300–500, which causes clipping)
- fontSize is guided to 180–280px at 1080p (not 100–120, which is too small to read)

These calibration values were derived from iterative testing with real images and manual tuner adjustments.

---

## Architecture & Files

```
src/templates/GroundCaptions/
  GroundCaptions.tsx       Remotion component — renders the 3D text
  index.ts                 Barrel export
  README.md                This file

src/
  ground-captions-spec.json   Spec file (written by plan or tuner)

scripts/
  ground-captions-plan.py     LLM-powered analysis + spec writer
  ground-tuner-server.py      Flask server for interactive tuner

public/
  ground-tuner.html           Interactive tuner UI (HTML/JS)
  groundCaptions/
    background.png            Current background image
```

### Component (GroundCaptions.tsx)

The Remotion component reads every value from the spec JSON. It dynamically loads Google Fonts via a `useGoogleFont()` hook that injects `<link>` elements into the document head. The 3D transform is built as a concatenated string of `rotateX`, `rotateZ`, and `scaleY` (with optional `rotateY`), applied to a child div inside a perspective-enabled parent container. Each line of text is rendered by a `FloorLine` sub-component that handles its own spring-physics entrance animation.

### Plan Script (ground-captions-plan.py)

Python script using `argparse` for CLI flags. Copies the source image to the public folder using PIL, sends it as base64 to the vision LLM, parses the JSON response, and writes the spec. The prompt includes detailed explanations of what each CSS 3D property does, calibration examples with real values, and instructions to return only raw JSON.

### Tuner Server (ground-tuner-server.py)

Flask server with CORS enabled. Routes:

| Route | Method | Purpose |
|-------|--------|---------|
| `/tuner` | GET | Serves the tuner HTML page |
| `/api/spec` | GET | Returns the current spec JSON |
| `/api/spec` | POST | Saves spec JSON to disk |
| `/api/render` | POST | Starts Remotion render in background thread |
| `/api/render/progress` | GET | Returns render progress (frame, percentage, status) |
| `/<path>` | GET | Serves static files from `public/` |

The render endpoint spawns `npx remotion render` as a subprocess and reads its stdout in a background thread, parsing frame progress from lines like `Rendered frame 45/150`. The progress state is shared via a dict that the progress endpoint returns as JSON.

---

## Troubleshooting

**Text is invisible or barely visible**
Check `blendMode` in the spec. If it's set to `overlay`, change it to `normal`. Overlay blend mode makes text invisible on light-colored surfaces like pavement or tiles.

**Text looks bizarrely stretched or inverted**
The perspective distance is too small relative to `scaleY × fontSize × sin(rotateX)`. Increase `perspective.distance` to 1200–1600px. Reduce `scaleY` to 2.0–3.0.

**Text is too small to read**
At 1080×1920 canvas size, anything below 150px font size is hard to read. Increase `fontSize` to 200–280px.

**Text is in the corner instead of on the ground**
The position values may be off. For most images, Y should be 65–80% (lower half of the frame where the ground is). X should be near 50% (centered) unless the subject is centered and you need to offset.

**LLM gives bad rotateZ values**
The LLM sometimes misjudges the ground slope direction. Use the tuner to fine-tune rotateZ — small adjustments of 2–5° make a big difference.

**Render fails with "Bus error" in Remotion Studio**
Chromium can hit memory limits in constrained environments (VMs, containers). Use the tuner's Save & Render button instead, or render via CLI: `npx remotion render src/index.ts GroundCaptions --output out/ground-captions.mp4`.

**Google Font not loading**
Ensure the font name matches exactly what's on Google Fonts (case-sensitive, with spaces). The component loads fonts via a `<link>` tag to `fonts.googleapis.com`. If running offline, only Archivo Black (bundled via `@remotion/google-fonts`) will work.

---

## Environment Setup

### Required API keys (in `.env` at project root)

At least one of these pairs must be set for the plan script to work:

```bash
# Primary — Azure OpenAI GPT-4o vision
AZURE_OPENAI_KEY=your-key-here
AZURE_GPT_IMAGE_ENDPOINT=https://your-endpoint.openai.azure.com/

# Fallback — Google Gemini
GEMINI_API_KEY=your-gemini-key
```

### Python dependencies (for plan script and tuner)

```bash
pip install flask flask-cors Pillow openai google-generativeai
```

Or with the project's requirements:

```bash
pip install -r requirements.txt
```

### Node dependencies

The Remotion stack is managed by the project's `package.json`:

```bash
npm install
```

### npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `ground:plan` | `npm run ground:plan -- <image> [flags]` | LLM analysis + spec writer |
| `ground:plan:help` | `npm run ground:plan:help` | Show plan script help |
| `ground:tuner` | `npm run ground:tuner` | Start interactive tuner server |
