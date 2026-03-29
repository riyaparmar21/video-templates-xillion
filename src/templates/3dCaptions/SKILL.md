---
name: 3dcaptions
description: Spatial caption template with rear hero text, subject occlusion masks, and front support lines
metadata:
  tags: captions, depth, segmentation, remotion, text-behind-person
---

## Overview

`3dCaptions` renders layered spatial captions using a 2.5D stack:

1. background video
2. rear hero text
3. subject cutout mask on top of the rear text
4. front support text/effects

The visual intent is reference-style spatial captions:

- oversized rear hero text
- subject occlusion through masks
- face-safe placement
- floating accent words and orbit variants
- front support text that lives near the torso / lower third instead of the face

The template is portrait-first and uses a preprocessing job to prepare:

- a normalized transcript
- subject masks
- a spatial plan JSON

## Files

- `src/templates/3dCaptions/3dCaptions.tsx` — main Remotion component
- `src/templates/3dCaptions/layers.tsx` — render layers for background, rear text, subject cutout, and front text
- `src/templates/3dCaptions/layout.ts` — runtime layout helpers
- `src/templates/3dCaptions/types.ts` — plan, mask, and template data contracts
- `src/templates/3dCaptions/preprocessing/build_job.py` — end-to-end job builder
- `src/templates/3dCaptions/preprocessing/segment_subject.py` — local mask generation and subject geometry
- `src/templates/3dCaptions/preprocessing/build_spatial_plan.py` — block planning and anchor generation
- `src/3dCaptions-spec.json` — standalone preview spec

## Runtime Asset Layout

```text
public/3dCaptions/<jobId>/
  source.mp4
  transcript.json
  mask-manifest.json
  plan.json
  masks/
    mask_00001.png
    ...
```

## Standalone Spec Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": 150,
  "durationMs": 5000,
  "videoSrc": "3dCaptions/demo/source.mp4",
  "planSrc": "3dCaptions/demo/plan.json",
  "maskManifestSrc": "3dCaptions/demo/mask-manifest.json",
  "backgroundMode": "video",
  "bgColor": "#090A0F",
  "textColor": "#FFFFFF",
  "accentColor": "#F5B74E",
  "safeArea": { "top": 0.06, "right": 0.08, "bottom": 0.08, "left": 0.08 }
}
```

## Spatial Plan Format

```jsonc
{
  "jobId": "demo",
  "fps": 30,
  "frameCount": 150,
  "blocks": [
    {
      "id": "b1",
      "startFrame": 0,
      "endFrame": 29,
      "layoutMode": "rear-word-front-line",
      "heroText": "DEPTH",
      "heroTextAlt": "CAPTIONS",
      "supportText": "rear word behind, support text in front",
      "rearAnchor": { "x": 0.5, "y": 0.24 },
      "frontAnchor": { "x": 0.5, "y": 0.72 },
      "align": "center",
      "allowRearOcclusion": true,
      "subjectTrackFrameRange": { "startFrame": 0, "endFrame": 29 },
      "rearVariant": "split",
      "frontVariant": "italic-line",
      "rearScale": 1.04,
      "rearRotation": -6,
      "rearSkew": -3.2,
      "frontWidth": 0.52,
      "accentWords": ["FACE", "CLEAN"]
    }
  ]
}
```

## Building A Job

```bash
python src/templates/3dCaptions/preprocessing/build_job.py \
  --video input.mp4 \
  --job-id demo \
  --script "Depth captions keep the face clean."
```

This will:

1. normalize/transcode the source video into a browser-safe MP4
2. reuse the repo transcription flow when needed
3. build subject masks
4. write `mask-manifest.json`
5. write `plan.json`

## Notes

- The renderer expects deterministic anchors from `plan.json`; the LLM is optional and only used for semantic planning.
- If masks fail, the runtime falls back to `front-only` captions automatically.
- The first release is tuned for portrait 9:16 input.
