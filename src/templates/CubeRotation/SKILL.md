---
name: cube-rotation
description: Rotating 3D image cube with perspective depth and continuous face turns
metadata:
  tags: 3d, cube, image, rotation, perspective
---

## Overview

`CubeRotation` displays a set of images on a 3D cube and rotates through the faces over the scene duration. It is best for premium showcase moments where a small number of images should feel dimensional without needing a full Three.js scene.

## Files

- `src/templates/CubeRotation/CubeRotation.tsx` — main component
- `src/templates/CubeRotation/index.ts` — barrel export
- `src/cube-rotation-spec.json` — standalone preview data

## Spec Notes

- `images` expects at least 2 entries
- `cubeSizePercent` controls the cube footprint
- `tiltX` adds perspective tilt
- `headline` renders a caption above the cube

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Image list | `images` in the spec |
| Cube size | `cubeSizePercent` |
| Rotation timing | `durationFrames` / `durationMs` |
| Perspective tilt | `tiltX` |
| Background and text colors | `bgColor`, `textColor`, `accentColor` |
