---
name: color-blend-blocks
description: Card-stack scene transitions using geometric color blocks and blend intersections
metadata:
  tags: color, blend, cards, transition, layout
---

## Overview

`ColorBlendBlocks` renders a stack of image cards with fixed geometric block overlays. New cards push upward through the stack while clipped blend intersections create the visual punch.

## Files

- `src/templates/ColorBlendBlocks/ColorBlendBlocks.tsx` — main component
- `src/templates/ColorBlendBlocks/index.ts` — barrel export
- `src/color-blend-blocks-spec.json` — standalone preview data

## Spec Notes

- `scenes` defines the card sequence
- `blockA`, `blockB`, and `blockC` control the geometric layout
- `transitionMs` controls the push timing between cards

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Card images | `scenes[].imageSrc` |
| Block colors | `scenes[].topLeftColor`, `scenes[].bottomRightColor` |
| Blend mode | `scenes[].blendMode` |
| Geometry | `blockA`, `blockB`, `blockC` |
| Header copy | `headerLeftText`, `headerRightText` |
