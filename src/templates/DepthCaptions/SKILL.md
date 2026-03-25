---
name: depth-captions
description: 3D depth-layered captions that render behind a person using per-frame segmentation masks, with dynamic multi-position word placement
metadata:
  tags: captions, 3d, depth, segmentation, text-behind-person, kinetic
---

## Overview

Depth Captions creates the "text behind person" 3D effect seen in high-end social media videos. Words appear at varied positions around the frame and are composited *between* the background and the person — so the subject's body naturally occludes parts of the text, creating a sense of depth.

The template uses a three-layer composite: (1) original video as background, (2) caption text in the middle, (3) person cutout mask on top.

## Files

- `src/templates/DepthCaptions/DepthCaptions.tsx` — main Remotion component (3-layer composite)
- `src/templates/DepthCaptions/index.ts` — barrel export
- `src/templates/DepthCaptions/segment.py` — Python segmentation pipeline (generates person masks using rembg)
- `src/depth-captions-spec.json` — word data (text, timing, position, animation)

## Prerequisites

The segmentation pipeline requires:
```bash
pip install rembg[cpu] Pillow
```

## Pipeline: Generating Masks

Before rendering in Remotion, run the segmentation script to extract person masks:

```bash
# Full video at 30fps
python src/templates/DepthCaptions/segment.py input_video.mov --fps 30

# First 10 seconds only
python src/templates/DepthCaptions/segment.py input_video.mov --fps 30 --max-seconds 10

# Custom output directory
python src/templates/DepthCaptions/segment.py input_video.mov --out-dir public/my_masks
```

This produces:
- `depth_captions_data/frames/` — extracted video frames
- `depth_captions_data/masks/` — per-frame person alpha masks (white=person, black=bg)
- `depth_captions_data/segment_meta.json` — subject bounding box and metadata

Copy masks to `public/` so Remotion can access them via `staticFile()`.

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": 150,
  "durationMs": 5000,
  "videoSrc": "test_vid.mov",           // video file in public/
  "maskPattern": "depth_captions_data/masks/mask_%05d.png",  // mask path pattern
  "maskFrameCount": 150,                // total mask frames
  "maskStartIndex": 1,                  // 1-indexed mask filenames
  "defaultFontSize": 80,
  "defaultColor": "#FFFFFF",
  "textShadow": "0 2px 20px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5)",
  "words": [
    {
      "text": "Welcome",
      "startFrame": 0,
      "durationFrames": 0,              // 0 = stays visible forever
      "x": 0.06,                        // normalized position (0-1)
      "y": 0.12,
      "fontSize": 90,
      "color": "#FFFFFF",               // optional per-word color
      "entrance": "left",               // animation direction
      "align": "left"                   // text alignment at anchor
    }
  ]
}
```

## Word Placement

Positions are normalized (0-1) fractions of the canvas:
- `x: 0` = left edge, `x: 1` = right edge
- `y: 0` = top edge, `y: 1` = bottom edge

For dynamic, non-predictable feel, vary positions across words:
- Above subject's head: `y: 0.08-0.15`
- Left of shoulders: `x: 0.05-0.15, y: 0.3-0.5`
- Right of shoulders: `x: 0.6-0.95, y: 0.3-0.5`
- Below hands: `y: 0.7-0.9`

## Entrance Animations

| Value | Effect |
|-------|--------|
| `"scale"` | Pop in from small (default) |
| `"top"` | Slide down from above |
| `"bottom"` | Slide up from below |
| `"left"` | Slide in from left |
| `"right"` | Slide in from right |
| `"none"` | Instant appear |

## 3-Layer Compositing

1. **Layer 1 (bottom)**: Original video via `OffthreadVideo`
2. **Layer 2 (middle)**: Caption text — word divs with spring animations
3. **Layer 3 (top)**: Person mask — uses CSS `mask-image` with the grayscale mask PNG to cut out the person from a second `OffthreadVideo`, so the person's body covers the text

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Word positions | `words[].x` and `words[].y` in spec |
| Word timing | `words[].startFrame` in spec |
| Font sizes | `words[].fontSize` or `defaultFontSize` |
| Text color | `words[].color` or `defaultColor` |
| Animation style | `words[].entrance` in spec |
| Text shadow | `textShadow` in spec |
| Mask source | `maskPattern` and `maskFrameCount` |
| Spring animation | `SPRING_POP` / `SPRING_SLIDE` in DepthCaptions.tsx |
