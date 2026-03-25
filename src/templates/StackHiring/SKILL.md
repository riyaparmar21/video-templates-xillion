---
name: stack-hiring
description: Hiring announcement — geometric intro, We're Hiring title, continuous role scroll with center highlight, CTA scene with landscape background
metadata:
  tags: hiring, roles, scroll, text, cta, brand, geometric, announcement
---

## Overview

Hiring announcement — geometric intro, We're Hiring title, continuous role scroll with center highlight, CTA scene with landscape background.

## Files

- `src/templates/StackHiring/StackHiring.tsx` — main component
- `src/templates/StackHiring/index.ts` — barrel export
- `src/stack-hiring-spec.json` — config

## Spec JSON Format

```jsonc
{
  "fps": 30,
  "width": 1080,
  "height": 1350,
  "durationMs": 9000,
  "bgColor": "#00D0FF",            // bright cyan background
  "textColor": "#232455",           // dark navy text
  "brandName": "Mango",             // top-left brand name
  "brandUrl": "buildmango.co",      // top-right URL
  "footerLine1": "Link in bio",     // footer line 1
  "footerLine2": "contact@auracare.com", // footer line 2
  "titleText": "We're Hiring",      // main title
  "titleFont": "Georgia, serif",    // title font family
  "titleFontWeight": 800,
  "titleFontSize": 90,
  "roles": [                        // job roles to scroll
    "Product Designer",
    "Frontend Engineer",
    "Backend Developer",
    "Data Scientist",
    "Growth Manager",
    "Customer Specialist",
    "DevOps Engineer"
  ],
  "roleFont": "Helvetica Neue, Arial, sans-serif",
  "roleFontWeight": 800,
  "roleFontSize": 86,
  "roleLineHeight": 107,
  "scrollSpeedMs": 600,             // ms per role scroll step
  "ctaLine1": "Build the",          // CTA first line
  "ctaLine2": "Future with us",     // CTA second line (serif)
  "ctaButton": "Apply Now",         // button text
  "ctaLine1Size": 114,
  "ctaLine2Size": 108,
  "ctaButtonSize": 39,
  "ctaBgImage": "stack-hiring/cta-bg.jpg",  // path relative to public/
  "ctaFooterLine2": "contact@buildmango.co", // CTA scene footer
  "buttonColor": "#ffffff",
  "buttonTextColor": "#232455",
  "buttonRadius": 103
}
```

## Animation Timeline

| Phase | Time (approx) | Description |
|-------|---------------|-------------|
| 1 — Cyan fill | 0–500ms | Solid bright cyan background |
| 2 — UI + shapes | 500–1400ms | Header (brand + URL) and footer fade in; concentric geometric shapes scale in from center |
| 3 — Title hold | 1400–2400ms | "We're Hiring" visible centered with geometric shapes behind |
| 4 — Transition | 2400–3400ms | Shapes expand outward and fade; title fades out; role list begins to appear |
| 5 — Role scroll | 3400ms–7000ms | Job titles scroll vertically upward in continuous loop; center role highlighted bold/italic, others fade |
| 6 — CTA reveal | 7000ms–9000ms | Background crossfades to dark landscape image; "Build the / Future with us" text and "Apply Now" button appear with staggered fade-in |

### Phase Details

**Phase 1 — Cyan Fill**: Solid `bgColor` (#00D0FF) background. No other elements visible.

**Phase 2 — UI + Shapes**: Header bar fades in with brand logo (left) and URL (right). Footer with contact info fades in at bottom. Four concentric geometric shapes (alternating rectangles and ellipses) scale in from 0.3× to full size behind the center.

**Phase 3 — Title Hold**: "We're Hiring" in bold serif font appears centered, scaled from 0.8× to 1×. Geometric shapes remain visible at low opacity behind the title.

**Phase 4 — Transition**: Geometric shapes expand to 1.8× and fade to 0. Title text fades out. Role scroll list begins fading in.

**Phase 5 — Role Scroll**: A vertical list of job roles scrolls upward continuously. The center role is highlighted (bold, italic, full opacity, slightly scaled up). Roles above and below fade progressively. Top and bottom edge gradients mask the list edges. The list wraps around and cycles through all roles multiple times.

**Phase 6 — CTA Reveal**: Role list fades out. A dark landscape background image crossfades in. White CTA text appears: "Build the" in sans-serif, "Future with us" in serif font below. A frosted-glass pill button with "Apply Now" fades in. Header and footer text switches to white. Footer URL changes to `ctaFooterLine2`.

## Layout

| Element | Value |
|---------|-------|
| Artboard | 1080×1350 (4:5 portrait) |
| Title font | Georgia serif, 800 weight, 90px |
| Role font | Helvetica Neue, 800 weight, 86px |
| Role line height | 107px |
| Text color | #232455 (dark navy) |
| Background | #00D0FF (bright cyan) |
| Button | White frosted glass pill, radius 103 |

## CLI

```bash
# Update roles
npm run text:stack-hiring -- --roles "Designer,Engineer,PM,Data Scientist"

# Change brand
npm run text:stack-hiring -- --brand "Acme" --url "acme.co"

# Update title
npm run text:stack-hiring -- --title "Join Our Team"

# Change CTA text
npm run text:stack-hiring -- --cta1 "Shape" --cta2 "Tomorrow"

# Change background color
npm run text:stack-hiring -- --bg "#1a1a2e"

# Adjust scroll speed
npm run text:stack-hiring -- --scroll 800

# Font customization
npm run text:stack-hiring -- --titleFont "Inter, sans-serif" --titleFontSize 80
npm run text:stack-hiring -- --roleFont "Helvetica Neue, Arial" --roleFontSize 72

# Aspect ratio
npm run aspect -- stack-hiring 9:16
```

## Dependencies

- `remotion` — useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img, staticFile

## Editing Cheatsheet

| Change | Where |
|--------|-------|
| Job roles | Spec JSON `roles[]` or CLI `--roles "A,B,C"` |
| Title text | Spec JSON `titleText` or CLI `--title "..."` |
| Brand name | Spec JSON `brandName` or CLI `--brand "..."` |
| Brand URL | Spec JSON `brandUrl` or CLI `--url "..."` |
| Background color | Spec JSON `bgColor` or CLI `--bg "#hex"` |
| CTA text | Spec JSON `ctaLine1` / `ctaLine2` or CLI `--cta1` / `--cta2` |
| CTA button | Spec JSON `ctaButton` or CLI `--button "..."` |
| CTA background | Spec JSON `ctaBgImage` (path relative to public/) |
| Scroll speed | Spec JSON `scrollSpeedMs` or CLI `--scroll <ms>` |
| Font sizes | Spec JSON `titleFontSize`, `roleFontSize`, `ctaLine1Size`, etc. |
| Footer text | Spec JSON `footerLine1` / `footerLine2` |
| Phase durations | Constants in `StackHiring.tsx` (P1_END, P2_END, etc.) |
