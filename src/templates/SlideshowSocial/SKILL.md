---
name: slideshow-social
description: Multi-slide social media presentation with 5 layout types, red accent line, decorative dots, bold italic headlines, and smooth crossfade transitions
metadata:
  tags: slideshow, social, presentation, slides, gallery, portfolio, red, accent
---

## Overview

Multi-slide social media presentation with 5 layout types, red accent line, decorative dots, bold italic headlines, and smooth crossfade transitions.

## Files

- `src/templates/SlideshowSocial/SlideshowSocial.tsx` — main component with 5 layout sub-components
- `src/templates/SlideshowSocial/index.ts` — barrel export
- `src/slideshow-social-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationMs": 12000,
  "bgColor": "#ffffff",          // background color
  "accentColor": "#D90004",      // red accent (line, dots)
  "textColor": "#D90004",        // headline text color
  "dotColor": "#D90004",         // decorative dot color
  "headlineFont": "Söhne, Helvetica Neue, Arial, sans-serif",
  "headlineFontWeight": 700,
  "headlineFontSize": 120,       // base size (scaled ×1.5 in component)
  "headlineLetterSpacing": -4,
  "bodyFont": "Helvetica Neue, Arial, sans-serif",
  "bodyFontSize": 16,
  "copyrightText": "©2025 Jitter\nAll rights reserved.",
  "lineHeight": 8,               // red accent line thickness
  "dotSize": 12,                 // decorative dot size
  "slides": [                    // array of slide configs
    {
      "layout": "twoImagesCentered",      // layout type
      "headline": "Headline 01",          // bold italic text (word-by-word reveal)
      "images": ["slideshow-social/01.png", "slideshow-social/02.png"],
      "counter": "(001)",                 // slide number
      "holdMs": 2800                      // total screen time for this slide
    },
    // ... more slides
  ],
  "transitionMs": 600            // entry animation duration (element stagger window)
}
```

## Layout Types

| Layout | Description |
|--------|-------------|
| `twoImagesCentered` | Two images centered with slight rotation, headline overlaid left, thin line at top + thick line crossing middle |
| `imageAboveTextBelow` | Small centered image upper area, headline bottom-left, red dots at top corners. Exit: image ZOOMS UP for seamless transition to fullBleedImage |
| `fullBleedImage` | Image fills entire frame, headline overlaid top-left with text shadow, subtle Ken Burns slow zoom. Exit: text + line slide RIGHT |
| `gridLeftTextRight` | 3 stacked images left column (30% width), headline + line + copyright right side |
| `imageLargeLeftTextRight` | Single large image left (38% width), headline + line + copyright right side |

## Animation Timeline

Each slide follows a sequential timing model. Slides occupy `holdMs` of screen time each (no overlap). Within each slide:

| Phase | Time | Description |
|-------|------|-------------|
| Entry | 0 → transitionMs (600ms) | Staggered element animation: images fade+scale, lines scaleX, dots fade, text word-by-word reveal |
| Hold | transitionMs → holdMs - 300ms | All elements visible, subtle motion (Ken Burns on fullBleed) |
| Exit | last 300ms | Element-level exit: drift down (slide 1), image zoom-up (slide 2), slide right (slide 3), fade (slide 4) |

### Entry Element Stagger Order (per slide)
1. **Lines** — Red accent lines animate scaleX from 0→1 (first ~25% of entry)
2. **Images** — Fade in + scale from smaller (starts early, completes ~35%)
3. **Dots** — Small decorative dots fade in (~25-45%)
4. **Text** — Headline reveals word-by-word with translateY animation (~35-80%)
5. **Meta** — Copyright + counter fade in last (~50-85%)

### Special Transitions
- **Slide 2→3 (imageAboveTextBelow → fullBleedImage)**: The centered temple image scales UP rapidly during exit, creating a zoom effect into the full-bleed layout. Text and other elements fade out during the zoom.
- **Slide 3 exit (fullBleedImage)**: Text and line slide RIGHT off-screen while image continues Ken Burns zoom.
- **Slide 1 exit (twoImagesCentered)**: All elements drift DOWN before the cut.

## Design Elements

| Element | Value |
|---------|-------|
| Artboard | 1920×1080 (16:9 landscape) |
| Background | White (#ffffff) |
| Accent color | Red (#D90004) |
| Headline font | Söhne (with Helvetica Neue fallback), 700 bold italic, ~180px effective |
| Body font | Helvetica Neue, 400, 16px |
| Letter spacing | -4px headlines |
| Thick red line | 8px height, animates scaleX 0→1 |
| Thin red line | 3px height (used in twoImagesCentered top + fullBleedImage top) |
| Dots | 12×12px red squares |
| Copyright | "©2025 Jitter\nAll rights reserved." small red text |
| Counter | "(001)", "(002)" etc. |
| Word reveal | Each word fades in + slides up with staggered timing |

## CLI

```bash
# Edit a specific slide headline
npm run text:slideshow -- --slide 0 --headline "My Title 01"

# Change an image on slide 2
npm run text:slideshow -- --slide 1 --image "slideshow-social/new-photo.jpg"

# Change all images on a slide
npm run text:slideshow -- --slide 3 --images "img1.jpg,img2.jpg,img3.jpg"

# Change slide layout
npm run text:slideshow -- --slide 2 --layout fullBleedImage

# Change accent color
npm run text:slideshow -- --accent "#0066FF"

# Change background
npm run text:slideshow -- --bg "#111111"

# Adjust transition speed
npm run text:slideshow -- --transition 800

# Font customization
npm run text:slideshow -- --headlineFont "Georgia, serif" --headlineFontSize 100
npm run text:slideshow -- --bodyFont "Inter, sans-serif" --bodyFontSize 18

# Aspect ratio
npm run aspect -- slideshow 4:5
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Slide headline | `--slide N --headline "..."` or spec JSON `slides[N].headline` |
| Slide images | `--slide N --image "path"` or `--images "a,b,c"` |
| Slide layout | `--slide N --layout <type>` |
| Slide hold time | Spec JSON `slides[N].holdMs` |
| Add/remove slides | Edit spec JSON `slides[]` array |
| Accent color | `--accent "#hex"` (updates line, text, dots) |
| Background | `--bg "#hex"` |
| Entry animation speed | `--transition <ms>` or spec JSON `transitionMs` |
| Font sizes | Spec JSON `headlineFontSize`, `bodyFontSize` |
| Line thickness | Spec JSON `lineHeight` |
| Dot size | Spec JSON `dotSize` |
| Copyright text | `--copyright "..."` or spec JSON |
