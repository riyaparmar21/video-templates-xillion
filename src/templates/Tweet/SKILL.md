---
name: tweet
description: Twitter/X-style tweet card with staggered slide-in-from-right animations for all content elements, word-by-word body reveal, and shrink-out exit
metadata:
  tags: tweet, twitter, social, card, slide-in, text-animation
---

## Overview

Twitter/X-style tweet card with staggered slide-in-from-right animations for all content elements, word-by-word body reveal, and shrink-out exit.

## Files

- `src/templates/Tweet/Tweet.tsx` — main component
- `src/templates/Tweet/index.ts` — barrel export
- `src/tweet-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1080,
  "durationMs": 5000,
  "displayName": "John Kappa",       // bold name
  "handle": "@johnkappa",            // grey handle
  "tweetText": "Your tweet text",    // body (word-by-word animation)
  "timestamp": "12:30 PM · Jun 21, 2021",
  "source": "Twitter Web App",       // blue source label
  "avatarSrc": null,                 // URL or null for default
  "verified": true,                  // show blue checkmark
  "cardColor": "#ffffff",            // card background
  "bgColor": "#ffffff",              // artboard background
  "textColor": "#000000",            // name + body color
  "secondaryColor": "#8e8e8e",       // handle + timestamp color
  "accentColor": "#2aa3ef"           // source link color
}
```

## Layout Constants

| Constant | Value |
|----------|-------|
| Artboard | 1080×1080 |
| Card | 890×411, offset (95, 334.5), radius 24 |
| Avatar | 120×120, circular |
| Name font | Inter Bold 32px |
| Body font | Inter Regular 42px |
| Timestamp font | Inter Medium 26px |

## Animation Timeline

All elements slide in from the right with natural (cubic-bezier) easing.

| Time | Element | Travel | Easing |
|------|---------|--------|--------|
| 0–500ms | Card | 200px from right | natural |
| 100–500ms | Avatar | 150px from right | natural |
| 200–600ms | Display name | 120px from right | natural |
| 300–650ms | Verified badge | 100px from right | natural |
| 250–650ms | Handle | 120px from right | natural |
| 400ms+ | Body text (word-by-word, 60ms stagger, 400ms per word) | 80px from right | natural |
| 700–1100ms | Timestamp row | 100px from right | natural |
| 4600–4800ms | Card shrink-out | scale 1→0.9, fade to 0 | ease-in quad |

## CLI

```bash
npm run text:tweet -- "Display Name" "Tweet body text"
npm run text:tweet -- --name "John" --handle "@john" --text "Hello!" --timestamp "1:00 PM"
```

## Dependencies

- `@remotion/google-fonts/Inter`
- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Text content | `src/tweet-spec.json` or CLI |
| Timing | `TIMING` object in `Tweet.tsx` |
| Colors | Spec JSON (`cardColor`, `bgColor`, `textColor`, `secondaryColor`, `accentColor`) |
| Avatar | Spec JSON `avatarSrc` (URL or null for default) |
| Verified badge | Spec JSON `verified` (true/false) |
| Layout | `CARD`, `AVATAR`, `NAME`, etc. constants in `Tweet.tsx` |
| Slide travel distance | `travelX` values in `TIMING` |
