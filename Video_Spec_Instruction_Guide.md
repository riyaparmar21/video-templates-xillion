# Video Spec Generation — LLM Instruction Guide

**Purpose:** You are an LLM agent generating VideoSpec JSON files that Remotion renders into professional short-form videos. This document tells you everything you need to know: how the system works, what templates are available, how to make creative decisions, and what constraints you must respect.

---

## 1. System Overview

### 1.1 What You Produce

A single JSON file (the **VideoSpec**) that fully describes a video: its color palette, typography, camera behavior, and a sequence of scenes. Each scene maps to a template with specific parameters. Remotion reads this JSON and renders the final video — no manual editing, no human intervention.

### 1.2 The VideoSpec Schema

```json
{
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex (MUST be dark: #0A0A0A to #1A1A2E)",
    "text": "#hex (MUST be light: #FFFFFF or near-white)",
    "accent": "#hex"
  },
  "typography": {
    "heading": "Font Family Name",
    "body": "Font Family Name",
    "mono": "Font Family Name"
  },
  "duration": 60,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "audio": { "src": "", "reactive": false },
  "camera": {
    "kenBurns": true,
    "kenBurnsScale": 1.06,
    "punchZoom": true,
    "punchInterval": 4,
    "punchScale": 1.025
  },
  "scenes": [
    {
      "template": "TemplateName",
      "duration": 5,
      "params": { ... },
      "transition": "crossfade",
      "transitionDuration": 0.5
    }
  ]
}
```

**Fixed values:** `fps` is always 30. `width` is always 1080. `height` is always 1920 (portrait 9:16). Background must be dark. Text must be light.

### 1.3 The 3-Agent Pipeline

You operate as one of three agents in sequence:

**Agent 1 — Scene Planner:** Reads the script blueprint and asset manifest. Outputs a scene plan: which templates to use, in what order, for what duration, with what content. Makes all creative decisions about structure, pacing, and template selection.

**Agent 2 — Param Generator:** Takes the scene plan and fills in every template's parameter object with exact values — text content, colors, image references, font sizes. Produces the complete VideoSpec JSON.

**Agent 3 — Quality Checker:** Validates the complete spec against all constraints. Fixes violations. Ensures the video will render correctly and look professional. Rejects and revises if any rule is broken.

### 1.4 The Effective Duration Formula

This is the most commonly violated rule in the entire pipeline:

```
effective_duration = sum(all scene durations) - sum(transition overlaps for scenes 1 through N-1)
```

The last scene has no outgoing transition, so its `transitionDuration` does not subtract from the total. The effective duration must equal the target duration within ±1 second.

---

## 2. Template Catalog

Templates are organized by what they do for the viewer, not alphabetically.

### 2.1 Hook Templates (Grab Attention — First 10-15% of Video)

Use these to open. Viewers decide to stay in the first 2-3 seconds. Keep hook scenes **2-4 seconds max**.

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **KineticCaptions** | No | Flexible | Word-by-word animated captions with spring pop-ins. Each word is a separate `{text, style}` object. |
| **ImpactNumber** | No | Flexible | Slam-entrance dramatic number reveal. |
| **QuestionReveal** | No | Flexible | Animated question that provokes curiosity. |
| **TextFocusZoom** | No | Flexible | Single bold statement with zoom focus. |

### 2.2 Showcase Templates (Show the Product — Rising Action 30-65%)

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **ParallaxImageReveal** | Yes (≥1080px, dark bg) | Flexible, min 4s | Cinematic parallax depth with Ken Burns zoom. 2-6 layers drift at different speeds. |
| **ThreeDCardFlip** | Yes (dark bg preferred) | Flexible, min 4s | Apple keynote-style 3D cards. 4 styles: tilt, flip, carousel, fan. |
| **CubeRotation** | Yes (2-4 images, dark bg) | Flexible, min 8s | 3D rotating cube with images on faces. Continuous rotation, no holds, no pauses. |
| **GenAiFeatures** | Yes (4+ images, ≥1080px) | **Fixed 13s** | 4-phase product showcase. Only use when you have high-quality, dark-background images. |
| **Showcase** | Yes | **Fixed 8s** | Border lines + typewriter + image cycling. Portfolio focus. |
| **SlideshowSocial** | Yes | Fixed 12s | Multi-slide with 5 layout types, crossfades. |
| **AnimatedWebScreens** | Yes | Flexible | 3×3 device grid with zoom intro. Website/dashboard showcases. |
| **ShowreelGrid** | Yes | Flexible | Horizontal phone mockup carousel. Multi-device showcases. |
| **MobileShowreelFrames** | Yes | **Fixed 8s** | Grid → fan out → scroll parade. App screenshot showcases. |
| **DesignPreview** | Yes | Fixed 11s | Floating cards with wandering logo badge. Design portfolios. |
| **SplitScreenMorph** | Yes (2 images) | Flexible, min 5s | Before/after with animated divider. |
| **ProductRevealTrack** | Yes | Flexible | Concentric reveal, product hero shot. |
| **ColorBlendBlocks** | Yes | Flexible | Image showcase with color grading. |

### 2.3 Data & Proof Templates (Build Credibility — Rising Action / Climax)

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **NumberCounterScene** | No | Flexible, min 4s | Massive number counting up with particles. Use actual large numbers (3000000, not 3). |
| **ListReveal** | No | Flexible | Sequential item reveal with stagger animation. Min 1.2s per item. |
| **StackHiring** | Optional (CTA bg) | **Fixed 9s** | Geometric intro → title → scrolling items → CTA. 5-7 items. |
| **VaultAnimatedCards** | Optional | **Fixed 11s** | Tilted card grid reveal. **Only when product involves cards/payment/financial instruments.** |
| **VaultCardFeatures** | No | Fixed 3.75s | Scrolling feature words + rotating cards. **Only when card metaphor fits.** |
| **Tweet** | No | **Fixed 5s** | Twitter/X card with staggered reveals. Social proof and testimonials. |
| **Timeline** | No | Flexible | Chronological events with dot markers. Milestones, processes. |
| **StackedBars** | No | Flexible | Ranked bar chart with animation. Data comparison. |
| **AnimatedChart** | No | Flexible | Animated trend charts and data visualization. |
| **IconGrid** | Optional (icons) | Flexible | Grid of icons with staggered animation. Feature overview. |

### 2.4 Text & Statement Templates (Communicate Ideas)

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **TypewriterReveal** | No | Flexible | Character-by-character text typing. Use `charMode: true` for per-letter impact. Best with short sentences (≤50 chars). |
| **GlassPanel** | No | Flexible | Frosted glass card with headline and body. Premium text-only scene. Best for factual statements and data callouts. |
| **BlurTextScroller** | No | Flexible | Vertical word scroll with blur/opacity. 6-8 curated words, ~600ms per word. Max 8s. |
| **QuoteHighlight** | No | Flexible | Quote with attribution and highlight color. |
| **TitleSlide** | No | Flexible | Opening slide or section break. |
| **InflatingText** | No | Flexible | Dramatic text inflation with overshoot. Shock moment. |
| **AnimatedSearchBar** | No | Fixed 4s | Search bar with letter-by-letter typing. SaaS demos. |
| **IOSNotification** | No | Fixed 3s | iOS notification with bouncy pop-in. Social proof hook. |
| **RouteText** | No | Fixed 6s | Multi-row scrolling text with parallax. Kinetic typography. |

### 2.5 Breathing Templates (Visual Rest — Use After 2-3 Dense Scenes)

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **GradientWash** | No | **Max 3s** | Full-screen gradient morphing 3-4 colors. Styles: radial, linear, mesh, aurora. |
| **Atmosphere** | No | Flexible | Particle effects and ambient background. |
| **ParallaxLayers** | Optional | Flexible | Depth layers drifting at different speeds. |
| **ParticleField** | No | Flexible | Atmospheric particle system. |

### 2.6 Closing Templates (Seal the Deal — Last 10-20%)

| Template | Needs Images | Duration | What It Does |
|----------|-------------|----------|--------------|
| **TextRevealWipe** | No | **Max 6s** | Text revealed behind moving colored bar. Headline ≤25 chars, subtitle ≤30 chars. Punchy CTA. |
| **CallToAction** | No | Flexible | Action-oriented closing with button label. |
| **LogoStinger** | Yes (logo) | **Max 4s**, min 2s | Logo assembles with particles/scale/blur/line. **MUST be the final scene. Always.** |
| **LogoReveal** | Optional (logo) | Flexible | Logo animation for brand close. |
| **WhiteSocialHandle** | Optional (icon) | Flexible | Social handle pill badge. |
| **ProgressBar** | No | Fixed 4s | Animated progress bar. Metrics close. |

### 2.7 Template Self-Sufficiency Tiers

Before selecting templates, audit your available image assets:

**Tier 1 — No Images Needed (text, data, animation):** KineticCaptions, TypewriterReveal, GlassPanel, BlurTextScroller, NumberCounterScene, ListReveal, TextRevealWipe, GradientWash, QuestionReveal, ImpactNumber, Tweet, StackedBars, Timeline, CallToAction, RouteText, AnimatedSearchBar, IOSNotification, InflatingText, ProgressBar, Atmosphere, TitleSlide.

**Tier 2 — Images Optional / Contained Context:** VaultAnimatedCards (small card images), StackHiring (CTA background), ThreeDCardFlip (at reduced card size 35-45%), IconGrid, FloatingObjects, LogoStinger (logo only), WhiteSocialHandle, ParallaxLayers.

**Tier 3 — Images Required (full-bleed, ≥1080px, dark background):** ParallaxImageReveal, GenAiFeatures, CubeRotation, Showcase, SlideshowSocial, AnimatedWebScreens, ShowreelGrid, MobileShowreelFrames, DesignPreview, SplitScreenMorph, ColorBlendBlocks, ProductRevealTrack.

**Decision Rule:** If no image is ≥1080px with a dark/neutral background → avoid ALL Tier 3 templates. Build the scene lineup using Tier 1 as the backbone, Tier 2 strategically. Do not try to "fix" bad images with overlays — use a text-only template instead.

---

## 3. Creative Direction

### 3.1 Narrative Arc

Every video follows this structure regardless of length:

| Phase | Duration % | Purpose | Best Templates |
|-------|-----------|---------|----------------|
| **Hook** | 0-15% | Stop the scroll. Punchy, bold. 2-4s max per scene. | KineticCaptions, ImpactNumber, QuestionReveal |
| **Setup** | 15-30% | Establish context. What is this about? | GlassPanel, Tweet, TypewriterReveal |
| **Rising Action** | 30-65% | Show the product, build evidence. Alternate dense and breathing scenes. | ParallaxImageReveal, ThreeDCardFlip, ListReveal, StackHiring, CubeRotation |
| **Climax** | 65-80% | Peak moment. Most dramatic template here. | NumberCounterScene, GenAiFeatures, CubeRotation |
| **CTA + Close** | 80-100% | Drive action, then brand. | TextRevealWipe → LogoStinger (always last) |

### 3.2 Voiceover-First Timing

Scene durations are calculated from the script BEFORE visual design. Never design visuals first and fit narration later.

```
scene_duration_seconds = ceil(word_count / 2.0) + breathing_room
```

Professional narration averages ~120 words per minute (~2.0 words/sec effective with pauses and emphasis). Count the words assigned to each scene, apply the formula, round up to the nearest integer. Add 0.5-1s breathing room.

### 3.3 Pacing Rules

- **Vary durations deliberately:** 4s → 5s → 3s → 6s → 4s feels dynamic. 5s → 5s → 5s feels robotic.
- **Short scenes (2-3s):** Punchy moments, chapter breaks, quick stat flashes.
- **Medium scenes (4-6s):** Workhorse. Most templates live here.
- **Long scenes (7-10s):** Complex content — timelines, feature lists, multi-phase templates.
- **Breathing rule:** After every 2-3 dense scenes, insert GradientWash (2-3s), Atmosphere, or ParallaxLayers.
- **Opening text scenes must be SHORT:** Max 4s each. Total text before first visual ≤8s. Viewers decide in 3-5 seconds.

### 3.4 Scene Count Guidelines

| Target Duration | Scene Count | Notes |
|----------------|-------------|-------|
| 15s | 5-6 | Tight pacing, every scene earns its place. |
| 25s | 7-9 | Mix dense and breathing scenes. |
| 45s | 10-14 | Must include variety in template types. |
| 60s | 10-14 | Prefer fewer high-impact scenes over many thin ones. |

### 3.5 Visual Contrast Pairs

Never place visually similar templates back-to-back. Alternate:

- **Text-heavy → Visual-heavy:** ListReveal → ParallaxImageReveal
- **Static → Dynamic:** GlassPanel → ParticleField
- **Dense → Sparse:** Timeline → TextFocusZoom
- **Data → Emotion:** StackedBars → QuoteHighlight

### 3.6 Color Strategy

- **Accent economy:** Primary dominates 60% of usage, secondary 25%, accent 15%. When accent appears, it should feel special.
- **Background consistency:** Keep the base dark across all scenes. Don't jump between different background colors.
- **Color-meaning association:** Assign a color to a concept once (gold = money, green = growth), maintain it throughout.
- **Aurora/gradient colors:** Must ALL contrast with the background. Never include the background color in a gradient palette.

### 3.7 Transition Philosophy

Transitions communicate relationships, not decoration:

| Transition | Meaning | Use For |
|-----------|---------|---------|
| `crossfade` | Default. Same topic continuation. | Between connected scenes. |
| `wipe_left` / `wipe_right` | Chronological progression. | Moving to next point. |
| `slide_up` / `slide_down` | Hierarchical (up = important). | Revealing hidden info. |
| `zoom_in` | Diving deeper into topic. | Broad → specific. |
| `zoom_out` | Pulling back to big picture. | Detail → overview. |
| `none` (cut) | Dramatic emphasis. Max 2-3 per video. | After quotes, before impact stats. |

- Vary transitions: never use the same type for more than 2 consecutive scenes.
- Transition durations: 0.4-0.6 seconds.
- Last scene: use `crossfade` or `none` for a smooth ending.

### 3.8 Font Selection

Choose a font trio that matches the video's tone:

| Mood | Heading | Body | Mono | Best For |
|------|---------|------|------|----------|
| Professional | Montserrat | Inter | JetBrains Mono | SaaS, corporate, tech |
| Bold editorial | Oswald | Lato | Inconsolata | News, documentary |
| Modern minimal | Poppins | Open Sans | Space Mono | Startup, modern |
| Elegant luxury | Playfair Display | Source Sans Pro | Cormorant Garamond | Fashion, premium |
| Playful | Fredoka One | Nunito | Comic Neue | Consumer, casual |
| Futuristic | Orbitron | Exo 2 | Fira Code | Gaming, sci-fi |
| Warm human | Merriweather | Cabin | Courier Prime | Testimonial, nonprofit |
| Impact hype | Anton | Roboto | Share Tech Mono | Sports, energy, launches |
| Premium fintech | Plus Jakarta Sans | Inter | Fira Code | Banking, fintech |
| Startup friendly | DM Sans | Inter | JetBrains Mono | Startup, SaaS |
| Creative studio | Instrument Sans | Manrope | JetBrains Mono | Agency, portfolio |
| Data heavy | Barlow Condensed | Barlow | Fira Mono | Analytics, dashboards |

**Font impact rule for hero text:** Bold sans-serif (Montserrat 800 weight, Impact, Anton) for product intros and hooks. Serif fonts (Playfair Display) for slower editorial/narrative scenes. Don't use serif for punchy hooks.

### 3.9 The GlassPanel vs. Image Decision

When the copy is **emotional or aspirational** AND a relevant image asset exists → use **ParallaxImageReveal** with the image as background and text as overlay. This is dramatically more impactful than GlassPanel.

GlassPanel is appropriate for: factual statements, data callouts, technical specs, and scenes where no relevant image exists.

### 3.10 Font Sizes for Portrait Video (1080×1920)

| Text Role | Minimum Size | Recommended |
|-----------|-------------|-------------|
| Hero product name / brand | 80px | 80-96px |
| Heading | 48px | 64-96px |
| Tagline / subtitle | 48px | 48-64px |
| Body text / bullet points | 36px | 36-48px |
| Labels / captions | 24px | 24-32px |
| CTA headline (TextRevealWipe) | 80px | 80-96px |
| Logo (LogoStinger) | 260px | 260-300px |

---

## 4. Template Parameter Reference

### 4.1 KineticCaptions

**One word per entry.** Each object in the words array must contain exactly ONE word. Multi-word values overflow the screen at 96-108px.

```json
{ "text": "the", "style": "filler" },
{ "text": "Flowboard", "style": "emphasis-gold" }
```

**Valid style tokens:** `normal`, `filler`, `big`, `emphasis-blue`, `emphasis-gold`, `accent-blue`, `big-blue`. No other tokens are valid. `"big-gold"` is invalid.

**Style usage:**
- Key product names, stats → `emphasis-gold` or `emphasis-blue` (100px, colored)
- Important nouns/verbs → `normal` or `big` (96-108px, white)
- Articles, prepositions (the, a, to) → `filler` (78px, gray, italic)
- Mix styles for visual rhythm. Never use the same style for every word.

**Duration weighting:** Groups are weighted by word count. 2 words ≈ 1s; 10 words ≈ 3s.

### 4.2 GenAiFeatures

**Only use when you have 4+ high-quality images (≥1080px) with dark backgrounds.** When images are poor quality, ALL 4 sub-scenes look mediocre. Use GlassPanel, TypewriterReveal, or BlurTextScroller instead.

**TextLine format:** `{words: string[], color: string}` — NOT a plain string or `{text, bold}`.

**PromptBoxConfig requires:** `boldWords`, `label`, `typeSpeedMs`, `bgColor`, `textColor`, `boldColor`, `width`, `height`.

**Sub-scene timing must be RELATIVE.** All timing values reference `localMs = 0..phaseMs`, not absolute video time. Using absolute values causes images and exits to never trigger.

**Sub-scene layout must be consistent.** All 4 sub-scenes use the same layout pattern (column or overlay, not mixed).

**Scene4 only supports text.** The adapter does NOT pass `logoImage` to Scene4. For a logo closing, use LogoStinger as a separate scene.

**Font sizes:** PromptBox text ≥28px, label ≥18px, buttons ≥30px.

**Image size for scene2:** 420px (not default 500px) to leave room for text and promptBox. PromptBox: width 950, height 160.

### 4.3 NumberCounterScene

**Prefix/suffix semantics:** `prefix` appears BEFORE the number, `suffix` appears AFTER. `target: 94, suffix: "%"` renders as "94%". Setting `prefix: "94%"` with `target: 94` renders "94%94".

**Use actual large numbers:** `target: 3000000, suffix: "+"` creates dramatic counting from 0 to 3,000,000. `target: 3, suffix: "M+"` counts 0 to 3 — no visual drama.

**Overflow prevention:** For `target > 9999`, reduce `fontSize` for large numbers (e.g., 150px for 7-digit numbers). Suffix should be ≥50% of number fontSize.

**Label must not repeat** what prefix/suffix already convey. If the number shows "94%", don't label it "94 percent satisfaction rate."

**Count timing:** The count-up animation should complete in about 40% of scene duration, leaving 60% for the number to sit and be absorbed.

### 4.4 StackHiring

- **Roles:** 5-7 items. Fewer than 5 = empty scroll. More than 7 = too compressed.
- **Duration:** Fixed 9s. Phase timing: cyan fill (0-0.5s), shapes (0.5-1.4s), title (1.4-2.4s), roles scroll (3.4-7s), CTA (7-9s).
- **ctaBgImage:** If empty/missing, adapter renders gradient fallback. Never pass empty strings to `staticFile()`.
- **textColor:** Must use `palette.text`, not hardcoded hex. Dark blue on dark backgrounds is invisible.
- **bgColor:** Use rich dark colors (#0D1B2A navy). NOT pure black (#0A0A0A or #000000).

### 4.5 BlurTextScroller

- **Words array:** Each entry is 1-2 words max. Never phrases or sentences.
- **Minimum count:** At least 8 words for proper loop fill.
- **Duration formula:** `words.length × 600ms ÷ 1000` = minimum seconds. Max 8s total.
- **Padding strategy:** Use reverse + deduplicate, not cyclic repetition.
- **Word quality:** 6-8 curated, impactful words. No generic filler words.

### 4.6 TextRevealWipe

- **Headline:** ≤25 characters. **Subtitle:** ≤30 characters.
- **Duration:** Max 6s. CTA scenes should be punchy.
- **headlineSize:** ≥80px. **subtitleSize:** ≥48px.
- **wipeDirection:** Avoid `"center"` for text longer than 15 characters.

### 4.7 Tweet

- **Duration:** Fixed 5s.
- **cardColor:** REQUIRED. Always specify a dark/muted hex (default `#1A1A2E`). Never bright colors.
- **Maximum text:** 200 characters.

### 4.8 ThreeDCardFlip

**Parameter names matter:**
- `image` (string) — single image path. Correct for single-card.
- `cards` (array of CardItem) — correct for multi-card.
- `images` (plural) — **NOT RECOGNIZED. Produces blank scene. Reject immediately.**

**Image backgrounds:** On dark themes, images must have dark or transparent backgrounds. White-background screenshots create jarring white rectangles. Use VaultAnimatedCards instead if only white-bg images are available.

### 4.9 CubeRotation

- **Minimum duration:** 8s. Needs time for smooth continuous rotation.
- **Images:** Minimum 2, recommended 3-4. Must have dark/neutral backgrounds.
- **holdSeconds:** MUST be 0 or omitted. No pauses between rotations.
- **tiltX:** Keep at 0 unless explicitly requested.
- **idleRotation / floatY:** Never enable. Normal straight images only.
- **Rotation timing:** Completes in 60% of scene, last face visible for remaining 40%.
- **Headline:** Use accent color, uppercase, ≥52px font size for maximum impact.

### 4.10 TypewriterReveal

**Content-duration validation formula:**
```
min_duration = (char_count × frames_per_char / fps) + 1.5s reading time
```

Speed: "fast" = 1.5 frames/char, "medium" = 2.5, "slow" = 4.

Example: 55 chars at "fast" speed, 30fps → typing_time = 55 × 1.5 / 30 = 2.75s → min_duration = 2.75 + 1.5 = 4.25s → round up to 5s.

**charMode:** Boolean. Set `true` for per-letter typing impact. Best with serif fonts on short sentences (≤50 chars).

**italicWords:** Array of strings. Entries should NOT include punctuation (matching strips punctuation from both sides).

### 4.11 GradientWash

**Max duration:** 3s. Breather only.

**Aurora colors:** Must ALL contrast with the background. Never include the background color in the aurora palette. Using `bgColor` as one of the aurora colors dilutes the gradient to near-invisibility.

### 4.12 ListReveal Stagger Timing

`staggerDelay` is measured in **FRAMES**, not seconds. At 30fps:

| staggerDelay (frames) | Gap | Assessment |
|----------------------|-----|------------|
| 10 | 0.33s | BROKEN. Items pile up instantly. |
| 20 | 0.67s | Too fast for body-copy items. |
| 30 | 1.00s | Minimum for short items (≤5 words). |
| 35 | 1.17s | Recommended for standard items. |
| 45 | 1.50s | Good for long or complex items. |

Minimum scene duration formula: `ceil((40 + item_count × staggerDelay + 20) / 30)` seconds.

### 4.13 VaultAnimatedCards

- **Only use when the product involves cards, banking interfaces, or financial instruments.** The card visual metaphor must match the content.
- **Duration:** Fixed 11s. Minimum 4 cards.
- **Mixed card types:** Credit cards need `brand` + `cardNumber` + `network`. Image cards need `type: "image"` + `bgImage`. Chart cards need `type: "chart"`.
- **Focus-pull blur:** Grid dims/blurs during tagline for visual hierarchy.

### 4.14 GlassPanel

- **icon parameter:** Renders as raw text, not an icon component. Pass a Unicode emoji or omit entirely.
- **Best for:** Factual statements, data callouts, technical specs.
- **Not for:** Emotional or aspirational copy when image assets are available. Use ParallaxImageReveal instead.

### 4.15 LogoStinger

- **logoSize:** Minimum 260px on portrait (1080×1920) video.
- **MUST be the final scene.** If both CTA and LogoStinger are present, order is: CTA → LogoStinger (last).

---

## 5. Hard Constraints

These constraints are non-negotiable. Violating any single one produces a visible defect or rendering crash.

### 5.1 Duration Constraints

1. Every scene duration MUST be a whole integer. Never 5.38, 3.5, or 7.2. Always 5, 4, or 7.
2. Effective total (sum minus overlaps) must match target within ±1 second.
3. Fixed-duration templates are NEVER compressed below their native duration: GenAiFeatures = 13s, VaultAnimatedCards = 11s, StackHiring = 9s, Showcase = 8s, MobileShowreelFrames = 8s, Tweet = 5s. If total needs adjustment, take time ONLY from flexible templates.
4. Maximum durations: TextRevealWipe ≤6s, GradientWash ≤3s, LogoStinger ≤4s, IOSNotification ≤3s, ProgressBar ≤4s.
5. Scene durations must accommodate voiceover pacing at ~120 WPM (2.0 words/sec effective).
6. Opening text-only scenes: ≤4s each. Total text before first visual ≤8s.
7. CubeRotation: minimum 8s.
8. LogoStinger: minimum 2s.

### 5.2 Content Fidelity Constraints

9. Use EXACT words from the script. Never add words, rephrase, or embellish. If the script says "Stop overpaying on international transfers", that is the EXACT text.
10. Only reference files that exist in the asset manifest. Referencing a non-existent file crashes Remotion at render time.
11. All asset references use `@project:role` format, not hardcoded file paths.
12. No single image appears in more than 2 scenes across the entire spec.
13. All asset filenames use hyphenated names (no spaces).

### 5.3 Parameter Constraints

14. KineticCaptions: every `word.text` is exactly one word (no spaces).
15. KineticCaptions: every style token is in the whitelist (normal, filler, big, emphasis-blue, emphasis-gold, accent-blue, big-blue).
16. GenAiFeatures: `textLines` must be `{words: string[], color: string}` objects, not plain strings.
17. GenAiFeatures: `promptBox` must be a full PromptBoxConfig with all required fields.
18. GenAiFeatures: all sub-scene timing values must be RELATIVE (0 to phaseMs).
19. GenAiFeatures: scene2 MUST have a non-empty image. Empty image crashes the renderer.
20. TextRevealWipe: headline ≤25 chars, subtitle ≤30 chars.
21. Tweet: cardColor is specified (dark/muted hex).
22. StackHiring: 5-7 roles, textColor contrasts with bgColor.
23. BlurTextScroller: 8+ words, each entry 1-2 words max.
24. ThreeDCardFlip: uses `image` (string) or `cards` (array). NEVER `images` (plural).
25. CubeRotation: `holdSeconds` must be 0 or omitted. `tiltX` must be 0 unless explicitly requested.
26. NumberCounterScene: prefix/suffix semantics correct (prefix BEFORE, suffix AFTER).
27. Every optional image parameter must have a visual fallback. Never pass empty strings to `staticFile()`.
28. `transitionDuration: 0` must be paired with `transition: "none"`. Zero-frame interpolation crashes Remotion.

### 5.4 Composition Constraints

29. No same template in consecutive scenes.
30. LogoStinger MUST be the last scene.
31. Video starts with a hook template (KineticCaptions, ImpactNumber, QuestionReveal, TextFocusZoom).
32. Transitions are varied (no more than 2 consecutive same-type).
33. No scene's top 2/3 should be visually empty.
34. VaultAnimatedCards/VaultCardFeatures: only when the product involves cards, banking interfaces, or financial instruments. The card visual metaphor must match the content.
35. GenAiFeatures: NOT used when images are <1080px or have white backgrounds.
36. ParallaxImageReveal: NOT used with white-background images.
37. ThreeDCardFlip: NOT used with white-background images on dark themes.
38. Background MUST be dark (#0A0A0A to #1A1A2E). Text MUST be light.
39. All color defaults in adapters reference palette colors, not hardcoded hex.

### 5.5 Image Quality Constraints

40. Images ≥1080px wide → any template including full-bleed.
41. Images 500-1079px → contained templates at 50-65% card width only.
42. Images 300-499px → contained templates at 35-45% card width only.
43. Images <300px → logo/icon use only (LogoStinger). Not for any image template.
44. Real photos are preferred over auto-generated illustrations for cinematic templates.
45. Logo images with white backgrounds must be processed for dark themes (transparent bg, inverted text).

### 5.6 Text Layout Constraints

46. Text at fontSize ≥72px must not wrap mid-word on 1080px canvas. Estimate: `char_count × fontSize × 0.55`. If > 1080, reduce fontSize or use `\n` line breaks.
47. TypewriterReveal with charMode: duration must be ≥ `(char_count × frames_per_char / fps) + 1.5s`. Scene must not end before typing completes.
48. ParallaxImageReveal headline: under 15 characters for cinematic impact.

---

## 6. Quality Checklist

Agent 3 must verify ALL of the following. If any check fails, the spec must be revised.

### 6.1 Duration Checks

- [ ] Every scene duration is a whole integer
- [ ] Effective total matches target within ±1s
- [ ] No fixed-duration template compressed below native duration
- [ ] No scene exceeds its template's maximum duration
- [ ] Content-heavy scenes have sufficient reading time (1.2s per list item, 0.5s per word group)
- [ ] Scene durations accommodate voiceover at ~120 WPM
- [ ] ListReveal staggerDelay ≥30 frames for items with 5+ words
- [ ] LogoStinger ≥2s
- [ ] TypewriterReveal with charMode: duration ≥ typing time + 1.5s reading
- [ ] Opening text-only scenes ≤4s each, total ≤8s before first visual
- [ ] CubeRotation ≥8s

### 6.2 Parameter Checks

- [ ] KineticCaptions: every word.text is exactly one word
- [ ] KineticCaptions: every style token is in whitelist
- [ ] NumberCounterScene: prefix/suffix semantics correct
- [ ] NumberCounterScene: large targets for drama (not single digits)
- [ ] NumberCounterScene: label doesn't repeat prefix/suffix info
- [ ] GenAiFeatures: textLines are `{words[], color}` objects
- [ ] GenAiFeatures: promptBox is full PromptBoxConfig
- [ ] GenAiFeatures: sub-scene timing is RELATIVE
- [ ] GenAiFeatures: scene2 has non-empty image
- [ ] TextRevealWipe: headline ≤25 chars, subtitle ≤30 chars
- [ ] TextRevealWipe: headlineSize ≥80px, subtitleSize ≥48px
- [ ] Tweet: cardColor specified (dark/muted hex)
- [ ] StackHiring: 5-7 roles, textColor contrasts with bgColor
- [ ] StackHiring: bgColor is NOT pure black (use rich dark like #0D1B2A)
- [ ] BlurTextScroller: 8+ words, each 1-2 words max, duration ≤8s
- [ ] ThreeDCardFlip: uses `image` or `cards`, NEVER `images`
- [ ] CubeRotation: holdSeconds = 0, tiltX = 0, min 2 images
- [ ] CubeRotation: headline uses accent color, ≥52px, uppercase
- [ ] TypewriterReveal: charMode is boolean, italicWords without punctuation
- [ ] VaultAnimatedCards: mixed card types properly structured
- [ ] Hero/intro scenes: bold sans-serif font, not serif
- [ ] Text at ≥72px: check line width doesn't exceed canvas
- [ ] All image references use @project:role or resolved paths
- [ ] All referenced assets exist in the manifest

### 6.3 Composition Checks

- [ ] No consecutive template repeats
- [ ] LogoStinger is the LAST scene
- [ ] Video starts with a hook template
- [ ] Transitions varied (no 3+ consecutive same-type)
- [ ] Low-res images (<800px) use contained templates, not full-bleed
- [ ] VaultAnimatedCards/VaultCardFeatures only when product involves cards/financial instruments
- [ ] No scene's top 2/3 is visually empty
- [ ] transitionDuration: 0 only paired with transition: "none"
- [ ] GenAiFeatures not used with low-quality or white-bg images
- [ ] ParallaxImageReveal not used with white-bg images
- [ ] ThreeDCardFlip not used with white-bg images on dark themes
- [ ] Template lineup uses Tier 1 as backbone when image assets are poor
- [ ] No image in more than 2 scenes
- [ ] GlassPanel not used for emotional copy when image assets exist
- [ ] CubeRotation images have dark/neutral backgrounds
- [ ] LogoStinger logoSize ≥260px on portrait video
- [ ] Asset filenames use hyphens (no spaces)

### 6.4 Content Fidelity Checks

- [ ] All text matches script EXACTLY
- [ ] No hallucinated filenames
- [ ] Image dimensions verified against template requirements

---

## 7. Quick Start Example

**Input script (46 words, target 25s):**

> Meet Flowboard — the project management tool your team actually wants to use. Drag, drop, done. Your workflow just got an upgrade. Over 12,000 teams trust Flowboard to ship projects faster. Try Flowboard free for 30 days. No credit card required.

**Asset manifest:** kanban.jpeg (323×156), dashboard.png (1560×896), logo.svg

**Step 1 — Voiceover timing:**

| Segment | Words | VO Time | Scene Duration |
|---------|-------|---------|----------------|
| "Meet Flowboard — the project..." | 12 | 6.0s | 4s (hook) |
| "Drag, drop, done..." | 11 | 5.5s | 3s + 4s (showcase) |
| "Over 12,000 teams..." | 14 | 7.0s | 3s (stat) + 5s (list) |
| "Try Flowboard free..." | 6 | 3.0s | 3s (CTA) |
| Logo sting | — | — | 3s |

**Step 2 — Asset assessment:**
- kanban.jpeg at 323×156 = SMALL tier → Tier 2 only, contained at 45% card width
- dashboard.png at 1560×896 = FULL-BLEED tier → Any template
- logo.svg = Logo use only

**Step 3 — Template selection:**

| # | Template | Duration | Tier | Why |
|---|----------|----------|------|-----|
| 1 | KineticCaptions | 4s | 1 | Hook. Word-by-word "Meet Flowboard" with emphasis-gold. |
| 2 | GlassPanel | 3s | 1 | Value prop. "Drag. Drop. Done." — factual, punchy. |
| 3 | ThreeDCardFlip | 4s | 2 | Kanban image at 45% card width. Contained context. |
| 4 | ParallaxImageReveal | 4s | 3 | Dashboard (1560px, high-res). Full-bleed cinematic. |
| 5 | NumberCounterScene | 3s | 1 | "12,000+" with target: 12000. Dramatic count-up. |
| 6 | ListReveal | 5s | 1 | 4 features at staggerDelay: 35. Reading time covered. |
| 7 | TextRevealWipe | 3s | 1 | CTA: "Try Flowboard Free" / "No credit card required." |
| 8 | LogoStinger | 3s | 2 | Logo with particles. Last scene. Crossfade. |

**Step 4 — Duration check:**
- Sum: 4+3+4+4+3+5+3+3 = 29s
- Transitions: 7 transitions × 0.5s = 3.5s overlap
- Effective: 29 - 3.5 = 25.5s ✓ (within ±1s of 25s target)

**Step 5 — Composition check:**
- ✓ No consecutive template repeats
- ✓ Starts with hook (KineticCaptions)
- ✓ LogoStinger is last
- ✓ Low-res kanban used in contained template only
- ✓ High-res dashboard used in full-bleed template
- ✓ Transitions will be varied (crossfade → wipe_left → slide_up → zoom_in → crossfade → wipe_left → crossfade)

---

## 8. Asset Intelligence

When the pipeline provides an asset manifest, it includes metadata for each image: filename, dimensions, quality tier, category, dominant background color, and white-background warnings.

**How each agent uses this:**

**Agent 1 (Scene Planner):** Select templates compatible with available image quality tiers. Never assign a SMALL tier image to a Tier 3 template.

**Agent 2 (Param Generator):** Use EXACT filenames from the asset table. Respect quality tier when setting imageSize params.

**Agent 3 (Quality Checker):** Validate every image reference against the asset table. Reject specs where image quality is below the template's minimum requirement.

**Quality tier thresholds:**
- FULL-BLEED (≥1080px): Any template
- CONTAINED (500-1079px): Tier 2 templates at 50-65% card width
- SMALL (300-499px): Tier 2 at 35-45% card width
- ICON (<300px): LogoStinger only

---

## 9. Template Visual Metaphor Rules

Most templates are universal — they work for any genre, any product, any industry. A few templates have a built-in visual metaphor that must match the content. When in doubt, ask: "Does this template's visual design make sense for what the product actually is?"

**Templates with visual restrictions:**

| Template | Built-In Visual | Use When... |
|----------|----------------|-------------|
| VaultAnimatedCards | Tilted credit/debit card grid | The product involves cards, banking interfaces, financial instruments, loyalty cards, payment systems. The card metaphor must be literal. |
| VaultCardFeatures | Rotating card stack with scrolling words | Same as above — the card form factor must match the product. |
| Showcase | Border lines + image cycling | Portfolio-style presentation — design work, photography, product collections. |
| DesignPreview | Floating cards with wandering logo badge | Design portfolios, agency work, creative showcases. |

**Templates that are truly universal** (work for any genre): KineticCaptions, GlassPanel, TypewriterReveal, BlurTextScroller, NumberCounterScene, ListReveal, TextRevealWipe, Tweet, StackHiring, ParallaxImageReveal, ThreeDCardFlip, CubeRotation, GradientWash, LogoStinger, CallToAction, ImpactNumber, QuestionReveal, Timeline, and all breathing/atmosphere templates.

**GenAiFeatures** is not genre-restricted — it works for any product. Its only restriction is asset quality: it requires 4+ high-quality images (≥1080px, dark backgrounds). If the images exist, it works whether the product is fitness, fintech, food delivery, or anything else.

---

*This guide consolidates rules from 10 video production sessions (Flowboard SaaS, Fintech Nova, Fitness Volt X9, and their iterative rebuilds). Every rule was discovered by debugging a real rendering failure or user rejection. For the full version history, see the LLM_Pipeline_Quality_Guide document history.*
