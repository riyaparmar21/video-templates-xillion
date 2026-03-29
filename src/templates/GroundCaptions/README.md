# GroundCaptions

3D perspective text painted on the ground surface of any image — like stadium text, street art, or parking lot lettering.

Uses CSS 3D transforms (`rotateX`, `rotateZ`, `scaleY`, `perspective`) to tilt and stretch text so it matches the ground plane in a photo.

---

## Two Workflows

### 1. Automatic (LLM decides placement)

```bash
npm run ground:plan -- <image> --text "STOP|RIGHT|THERE" --color "#FF0000"
npm start
```

GPT-4o vision analyzes the image, picks the angles/position/size, and writes the spec. Open Remotion Studio to preview.

### 2. Manual (interactive tuner)

```bash
npm run ground:plan -- <image>
npm run ground:tuner
```

Opens a browser UI at `localhost:4455` with a live 9:16 preview. Drag text to reposition, adjust sliders for all 3D transforms, edit text/font/color. Click **Save & Render** to export the video with a live progress bar.

---

## CLI Flags (`ground:plan`)

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--text` | `-t` | keeps existing | Caption lines, pipe-separated |
| `--font` | `-f` | `Archivo Black` | Any Google Font family name |
| `--color` | `-c` | `#FFFFFF` | Text color (hex) |

---

## Features

- Static image or video backgrounds
- Any Google Font (loaded dynamically)
- Per-line staggered animations: `slideForward`, `scaleUp`, `fadeIn`
- Per-line font size and color overrides
- Drop shadow, opacity, blend mode controls
- Spring-physics entrance animations

---

## Files

| File | Purpose |
|------|---------|
| `src/templates/GroundCaptions/GroundCaptions.tsx` | Remotion component |
| `src/ground-captions-spec.json` | Spec (written by plan script or tuner) |
| `scripts/ground-captions-plan.py` | LLM image analysis + spec writer |
| `scripts/ground-tuner-server.py` | Flask server for interactive tuner |
| `public/ground-tuner.html` | Tuner UI |
| `public/groundCaptions/background.png` | Current background image |

---

## Environment

Requires at least one API key pair in `.env`:

```bash
# Primary
AZURE_OPENAI_KEY=...
AZURE_GPT_IMAGE_ENDPOINT=...

# Fallback
GEMINI_API_KEY=...
```
