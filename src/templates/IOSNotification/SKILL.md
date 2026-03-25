---
name: ios-notification
description: iOS-style notification banner with bouncy pop-in, word-by-word text reveal, and shrink-out exit
metadata:
  tags: notification, iOS, banner, pop-in, text-animation, UI, mobile
---

## Overview

iOS-style notification banner with bouncy pop-in, word-by-word text reveal, and shrink-out exit.

## Files

- `src/templates/IOSNotification/IOSNotification.tsx` — main component
- `src/templates/IOSNotification/index.ts` — barrel export
- `src/ios-notification-spec.json` — notification content + config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 3000,
  "title": "Jitter Team",
  "body": "Remix and make it shine! ☀️",
  "timestamp": "now",
  "iconSrc": null,               // optional icon URL, falls back to built-in chat bubble
  "bgColor": "transparent",      // artboard background
  "notifColor": "#e6e6e6",       // notification pill fill
  "notifOpacity": 90,            // notification background opacity (0-100)
  "textColor": "#000000",        // title + body text color
  "timestampColor": "#000000",   // timestamp text color (rendered at 40% opacity)
  "cornerRadius": 56             // corner radius of notification pill
}
```

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 1080 x 312 (scaled to fit composition) |
| Notification pill | 960 x 192 at offset (60, 60) |
| Corner radius | 56px |
| App icon | 120 x 120 at (36, 36) within pill, border-radius 12px |
| Title text | Lato 700, 42px at (192, 40) |
| Body text | Lato 400, 42px at (192, 96) |
| Timestamp | Lato 400, 36px at (844, 40), right-aligned, 40% opacity |

## Animation Timeline

### Phase 1: Card Grow-In

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 0–400ms | scale | 0.6 | 1 | `easeOutBack` (overshoot) |
| 0–150ms | opacity | 0 | 1 | linear |

### Phase 2: Icon Grow-In (staggered)

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 100–400ms | scale | 0.5 | 1 | `easeOutBack` (overshoot) |
| 100–400ms | opacity | 0 | 1 | linear (first 30%) |

### Phase 3: Title Text-In (word-by-word)

| Time | Effect | Details |
|------|--------|---------|
| 200ms+ | Word-by-word slide+fade | 50ms offset per word, 200ms duration per word |
| — | Slide direction | Up (translateY 50→0) |
| — | Easing | `Easing.bezier(0.25, 0.1, 0.25, 1)` (natural) |

### Phase 4: Body Text-In (word-by-word)

| Time | Effect | Details |
|------|--------|---------|
| 500ms+ | Word-by-word slide+fade | 50ms offset per word, 200ms duration per word |
| — | Slide direction | Up (translateY 50→0) |
| — | Easing | `Easing.bezier(0.25, 0.1, 0.25, 1)` (natural) |

### Phase 5: Card Shrink-Out

| Time | Property | From | To | Easing |
|------|----------|------|----|--------|
| 2800–3000ms | scale | 1 | 0.8 | `Easing.in(Easing.quad)` |
| 2800–3000ms | opacity | 1 | 0 | `Easing.in(Easing.quad)` |

## Dependencies

- `@remotion/google-fonts/Lato` — Google Font loading
- `remotion` — `useCurrentFrame`, `useVideoConfig`, `interpolate`, `Easing`, `AbsoluteFill`, `Img`

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Notification text | Spec JSON — `title`, `body` |
| App icon | Spec JSON — `iconSrc` (URL or staticFile path) |
| Timestamp label | Spec JSON — `timestamp` |
| Colors | Spec JSON — `bgColor`, `notifColor`, `textColor`, `timestampColor` |
| Notification opacity | Spec JSON — `notifOpacity` (0-100) |
| Animation timing | `TIMING` object in component — all values in ms |
| Layout dimensions | `ARTBOARD`, `NOTIF`, `ICON`, `TITLE`, `BODY`, `TIMESTAMP` constants |
| Word reveal speed | `TIMING.titleTextIn.wordOffsetMs` / `TIMING.bodyTextIn.wordOffsetMs` |
| Bounce intensity | `easeOutBack` function — adjust `c1` constant (default 1.70158) |
| Corner radius | Spec JSON — `cornerRadius` |

## CLI Commands

```bash
npm run text:notification -- "Mom" "Dinner is ready!"
npm run text:notification -- --title "Slack" --body "New message" --timestamp "2m ago"
npm run aspect -- notification 16:9
```
