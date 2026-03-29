# Video Templates

A Remotion-based video generation system with 60+ motion graphics templates, an AI-powered script-to-video pipeline, and CLI tools for rapid customization. Built for producing social media videos (9:16 Reels/TikToks, 1:1 posts, 16:9 YouTube) from scripts, images, or manual configuration.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Project Architecture](#project-architecture)
4. [Standalone Templates](#standalone-templates)
5. [Pipeline Templates](#pipeline-templates)
6. [AI Pipeline (Script to Video)](#ai-pipeline-script-to-video)
7. [CLI Tools](#cli-tools)
8. [Spec System](#spec-system)
9. [Asset Management](#asset-management)
10. [Template Engine](#template-engine)
11. [Testing](#testing)
12. [Environment Variables](#environment-variables)
13. [Adding a New Template](#adding-a-new-template)

---

## Overview

The project has two main modes of operation:

**Standalone templates** — 30+ individual compositions, each with its own spec JSON and optional CLI tools. You edit a spec (or use CLI commands), preview in Remotion Studio, and render to MP4. Templates include animated search bars, iOS notifications, tweet cards, product reveals, showreel grids, 3D card flips, ground-painted text, depth captions, and more.

**AI pipeline** — An end-to-end system that takes a script (or video), analyzes it, and generates a multi-scene VideoSpec JSON. The pipeline uses a three-agent architecture powered by Azure OpenAI: a scene planner, a detail generator, and a validator. The generated spec drives the DynamicVideo composition engine, which stitches scenes from 27 pipeline templates with transitions, camera moves, and synchronized timing.

Both modes share the same Remotion rendering infrastructure, asset pipeline, and spec-driven architecture.

---

## Getting Started

### Prerequisites

Node.js 18+ and npm are required. Python 3.10+ is needed for the AI pipeline, asset fetching, and certain template tools (GroundCaptions, 3dCaptions).

### Installation

```bash
npm install
pip install -r requirements.txt
```

### Quick commands

```bash
# Preview all compositions in Remotion Studio
npm start

# Render a specific template to MP4
npx remotion render src/index.ts AnimatedSearchBar --output out/search-bar.mp4

# Render using the render script
npm run render

# Generate a video from a script (AI pipeline)
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test -d 25

# Run tests
npm test
```

---

## Project Architecture

```
video-templates/
│
├── src/
│   ├── Root.tsx                    # Remotion composition registry (all 30+ compositions)
│   ├── engine/                     # Video spec engine
│   │   ├── schema.ts              #   Zod schema for VideoSpec JSON
│   │   ├── registry.ts            #   Template name → React component lookup
│   │   ├── DynamicVideo.tsx        #   Multi-scene composition renderer
│   │   ├── Transitions.tsx         #   Scene transition effects
│   │   └── Camera.tsx              #   Virtual camera moves (zoom, pan, drift)
│   ├── templates/                  # All template components
│   │   ├── AnimatedSearchBar/      #   Folder-based: component + spec + index
│   │   ├── GroundCaptions/         #   Folder-based with LLM + tuner tools
│   │   ├── 3dCaptions/             #   Folder-based with preprocessing pipeline
│   │   ├── ImpactNumber.tsx        #   Single-file pipeline templates
│   │   └── ...                     #   (60+ total)
│   ├── *-spec.json                 # One spec per standalone template
│   └── latest-spec.json            # Active pipeline spec (auto-updated)
│
├── pipeline/                       # AI video generation pipeline
│   ├── generate_from_script.py     #   End-to-end: script → blueprint → spec
│   ├── script_to_blueprint.py      #   Script analysis → creative blueprint
│   ├── transcribe.py               #   Whisper transcription
│   ├── analyze.py                  #   Video frame analysis
│   ├── generate.py                 #   Three-agent spec generation
│   ├── generator/                  #   Agent internals
│   │   ├── pipeline.py             #     Scene planner + detail generator + validator
│   │   ├── cache.py                #     Spec versioning/caching
│   │   ├── media.py                #     Asset resolution
│   │   ├── validate.py             #     Spec validation against schema
│   │   └── scene_detect.py         #     Video shot boundary detection
│   └── prompts/                    #   LLM prompt templates
│
├── scripts/                        # CLI utilities
│   ├── set-text.mjs                #   Set text for any template
│   ├── set-aspect.mjs              #   Change aspect ratio for any template
│   ├── set-screens.mjs             #   Load images into AnimatedWebScreens
│   ├── render-video.mjs            #   Render script
│   ├── render-all-templates.mjs    #   Batch render all compositions
│   ├── ground-captions-plan.py     #   LLM-powered ground text placement
│   ├── ground-tuner-server.py      #   Interactive ground text tuner
│   ├── build-asset-map.cjs         #   Scan public/ → asset-map.json
│   ├── fetch-assets.py             #   Download stock images from APIs
│   └── generate-svg-library.py     #   AI-generated SVG icon library
│
├── public/                         # Static assets (served by Remotion)
│   ├── assets/                     #   Per-video image/video assets
│   ├── groundCaptions/             #   Ground text background images
│   ├── 3dCaptions/                 #   Depth caption masks and plans
│   └── ground-tuner.html           #   Interactive tuner UI
│
├── assets/                         # Shared media library
│   └── svg/                        #   SVG icon library
│
├── tests/                          # Smoke tests
├── cache/                          # Cached specs and scene plans
├── data/                           # Transcripts, blueprints, analysis
├── test_scripts/                   # Sample scripts for pipeline
├── COMMANDS.md                     # Full CLI reference
├── remotion.config.ts              # Remotion config
└── package.json                    # npm scripts and dependencies
```

---

## Standalone Templates

30 compositions that render independently, each driven by its own spec JSON file. They fall into several categories:

### Text & Typography

**AnimatedSearchBar** — Search bar with grow-in, width expansion, and letter-by-letter typing. CLI: `npm run text:search-bar`

**InflatingText** — Bold text with multi-phase inflate animation, overshoot scaling, and dramatic final inflate. CLI: `npm run text:inflate`

**BlurTextScroller** — Vertical word list scrolling upward with progressive blur/opacity and arrow indicator. CLI: `npm run text:blur-scroller`

**KineticCaptions** — Animated word-by-word captions with style tokens and spring pop-ins. Spec: `kinetic-captions-spec.json`

**SpiralCaptions** — Text placed along an Archimedean spiral path with shrinking font toward center. Spec: `spiral-captions-spec.json`

**RouteText** — Multi-row scrolling city names with gold arrow separators and staggered speed. CLI: `npm run text:route-text`

**TextRevealWipe** — Text revealed behind a moving colored bar wipe. Spec: `text-reveal-wipe-spec.json`

### Cards & UI Elements

**IOSNotification** — iOS-style notification banner with bouncy pop-in and word-by-word reveal. CLI: `npm run text:notification`

**Tweet** — Twitter/X-style tweet card with staggered slide-in animations. CLI: `npm run text:tweet`

**ProgressBar** — Animated progress bar with gradient fill and shimmer highlight. CLI: `npm run text:progress-bar`

**VaultAnimatedCards** — Tilted credit card grid with diagonal scroll, zoom-out, and tagline reveal. CLI: `npm run text:vault-cards`

**VaultCardFeatures** — Fintech card-features showcase with scrolling words and rotating cards. CLI: `npm run text:vault-card-features`

**ThreeDCardFlip** — Apple keynote-style 3D card showcase with tilt, flip, and carousel styles. Spec: `three-d-card-flip-spec.json`

### Showcase & Portfolio

**AnimatedWebScreens** — 3x3 device grid with zoom intro and horizontal slide transitions. CLI: `npm run screens`

**ShowreelGrid** — Horizontal phone-mockup carousel with hero-scale spotlight. CLI: `npm run text:showreel-grid`

**MobileShowreelFrames** — Mobile gallery with grid intro, zoom to full-screen, and vertical scroll parade. CLI: `npm run text:showreel-frames`

**SlideshowSocial** — Multi-slide presentation with 5 layout types and crossfade transitions. CLI: `npm run text:slideshow`

**DesignPreview** — Floating design portfolio cards with logo badge and staggered pop-in. CLI: `npm run text:design-preview`

**Showcase** — Portfolio showcase with spreading borders, typewriter text, and zoom+blur cycling. CLI: `npm run text:showcase`

**ProductRevealTrack** — 3-sequence product reveal with concentric running-track outlines. CLI: `npm run text:product-reveal`

### Branding & Effects

**WhiteSocialHandle** — Animated social handle pill badge with icon grow-in. CLI: `npm run text:social-handle`

**StackHiring** — Hiring announcement with geometric intro, role scroll, and CTA scene. CLI: `npm run text:stack-hiring`

**GenAiFeatures** — 4-scene AI product showcase with typewriter text and aspect-ratio morphing. CLI: `npm run text:gen-ai-features`

**LogoStinger** — Punchy 2-3s brand moment with particle/scale/blur assembly styles. Spec: `logo-stinger-spec.json`

**GradientWash** — Full-screen animated gradient morphing between colors. Spec: `gradient-wash-spec.json`

**ColorBlendBlocks** — Multi-scene color blend blocks with images and gradient overlays. Spec: `color-blend-blocks-spec.json`

**NumberCounterScene** — Animated counter with eased count-up, particles, and light burst. Spec: `number-counter-scene-spec.json`

### Image & Video

**ParallaxImageReveal** — Cinematic Ken Burns depth effect with light leaks and vignette. Spec: `parallax-image-reveal-spec.json`

**SplitScreenMorph** — Two images with animated divider for before/after comparisons. Spec: `split-screen-morph-spec.json`

### Advanced / Preprocessing Required

**GroundCaptions** — 3D perspective text painted on the ground surface of any image. Uses CSS 3D transforms + optional LLM vision analysis. Has its own plan script, interactive tuner server, and live render progress. See `src/templates/GroundCaptions/README.md`.

**3dCaptions** — Cinematic spatial captions that float behind and in front of a person using segmentation masks. Requires preprocessing (SAM2/rembg for masks, LLM for spatial planning). See `src/templates/3dCaptions/`.

Every standalone template's full CLI reference is in `COMMANDS.md`.

---

## Pipeline Templates

27 templates designed for the AI pipeline's multi-scene composition engine. They don't have their own spec files or CLI tools — instead, the AI generates scene parameters for them inside a VideoSpec JSON.

**Core (20):** ImpactNumber, TypewriterReveal, QuoteHighlight, TextFocusZoom, ListReveal, FloatingObjects, GlassPanel, IconGrid, StackedBars, ParallaxLayers, TitleSlide, SplitCompare, Timeline, CallToAction, QuestionReveal, TransitionWipe, Atmosphere, LogoReveal, CountUp, GlobeScene

**Extended (4):** AnimatedChart, SvgMorph, LottieScene, ParticleField

**Premium (3):** ThreeScene, VideoOverlay, AudioWaveform

The engine renders them in sequence with transitions (crossfade, wipe, slide, zoom) between scenes. Each template receives standardized props: `params` (scene-specific data), `palette` (colors), `typography` (fonts), and `sceneDurationFrames`. The registry in `src/engine/registry.ts` maps template names to components, with adapter wrappers for standalone templates that can also be used in the pipeline.

---

## AI Pipeline (Script to Video)

The pipeline turns a written script into a rendered video. It runs through several stages:

### End-to-end flow

```bash
python pipeline/generate_from_script.py -s script.txt -o my_video -d 30
```

This single command chains four stages:

1. **Script analysis** (`script_to_blueprint.py`) — Sends the script to GPT-4o which produces a creative blueprint: suggested scenes, visual style, color palette, typography, transitions, and pacing.

2. **Scene planning** (Agent 1) — The scene planner reads the blueprint and creates a sequence of scenes, choosing which template to use for each, allocating durations, and planning transitions.

3. **Detail generation** (Agent 2) — The detail generator fills in every field for every scene: text content, colors, font sizes, animation timings, image references, and template-specific parameters.

4. **Validation** (Agent 3) — The validator checks the complete spec against the Zod schema, fixes any issues, and writes the final JSON to `src/latest-spec.json`.

### From existing video

```bash
python pipeline/transcribe.py input.mp4          # Whisper transcription
python pipeline/analyze.py input.mp4 -t data/stt/input.txt   # Frame analysis
python pipeline/generate.py -b data/analysis/input_blueprint.md -t data/stt/input.txt -v input.mp4
```

### Caching

Every generated spec is versioned in `cache/{name}/specs/v1.json`, `v2.json`, etc. Reuse a cached spec with `--cache` to skip all LLM calls:

```bash
python pipeline/generate_from_script.py -s script.txt -o my_video --cache
python pipeline/generate_from_script.py -s script.txt -o my_video --cache-version 2
```

### Style presets

The `--style` flag guides the AI's creative direction: `tech-product`, `testimonial`, `explainer`, `hype-launch`, `educational`, `luxury`, `corporate`.

### Font override

```bash
python pipeline/generate_from_script.py -s script.txt -o video --fonts "Montserrat,Inter,JetBrains Mono"
```

The three fonts map to heading, body, and monospace respectively.

---

## CLI Tools

### Text editing

The universal text CLI covers most standalone templates:

```bash
npm run text:<template> -- "content"
npm run text:help                        # list all template text commands
```

Each template accepts different arguments — positional text, named flags, or both. See `COMMANDS.md` for every template's specific syntax.

### Aspect ratio

```bash
npm run aspect -- <template> <ratio>
npm run aspect -- all 9:16               # apply to every template
npm run aspect -- inflate 1280x720       # custom resolution
```

Presets: `1:1` (1080x1080), `9:16` (1080x1920), `16:9` (1920x1080), `4:5` (1080x1350), `4:3` (1200x900).

### Screen loading (AnimatedWebScreens)

```bash
npm run screens -- ./my-screens          # bulk load from folder
npm run screens -- --slot 5 ./hero.png   # set specific grid slot
```

### Rendering

```bash
npm run render                           # render via script
npm run render:cli                       # render via Remotion CLI
npm run render:all                       # batch render all templates
npm run render:all -- --only KineticCaptions,Tweet
npm run render:all -- --list             # list composition IDs
```

### GroundCaptions

```bash
npm run ground:plan -- <image> --text "LINE1|LINE2" --font "Bebas Neue" --color "#FF0000"
npm run ground:tuner                     # interactive visual editor at localhost:4455
```

### Asset fetching

```bash
npm run assets:fetch                     # interactive asset download
npm run assets:fetch:backgrounds         # download background images
npm run assets:fetch:all                 # download all presets
```

### SVG pipeline

```bash
npm run svg:generate                     # AI-generate SVG icons
npm run svg:optimize                     # optimize with SVGO
npm run svg:validate                     # validate for Remotion compatibility
npm run svg:pipeline                     # full pipeline
```

---

## Spec System

Every template is driven by a JSON spec file. The spec contains all the information needed to render: dimensions, duration, fps, text content, colors, fonts, images, animation parameters, and any template-specific fields.

### Standalone template specs

Located at `src/<template-name>-spec.json`. Each spec has a consistent base shape:

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationMs": 5000,
  "durationFrames": 150,
  ...template-specific fields
}
```

These are read by `Root.tsx` to configure each Remotion `<Composition>`. CLI tools modify these files in place.

### Pipeline VideoSpec

The AI pipeline generates a more complex spec at `src/latest-spec.json`:

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "palette": { "primary": "#FFD700", "secondary": "#1E90FF", ... },
  "typography": { "heading": "Inter", "body": "Inter", "mono": "JetBrains Mono" },
  "scenes": [
    {
      "template": "TitleSlide",
      "durationMs": 3000,
      "transition": "crossfade",
      "params": { ... }
    },
    ...
  ]
}
```

The `DynamicVideo` composition engine in `src/engine/` parses this spec, resolves templates from the registry, calculates total frame counts, renders each scene in sequence, and applies transitions between them.

### Schema validation

The pipeline spec is validated with Zod (`src/engine/schema.ts`). The schema defines valid template names, transition types, palette structure, typography, and per-template parameter shapes.

---

## Asset Management

### Static assets

All images, videos, and fonts used by templates live in `public/`. Remotion's `staticFile()` function resolves paths relative to this folder.

### Asset map

`scripts/build-asset-map.cjs` scans `public/` and generates `src/asset-map.json`, mapping role-based tokens (like `@hero`, `@background`) to actual file paths. The pipeline uses these tokens so the AI can reference assets without knowing exact filenames. The asset map is rebuilt automatically before `npm start`, `npm run build`, and `npm run render`.

### Stock image fetching

`scripts/fetch-assets.py` downloads stock images from Pixabay and Pexels APIs using preset configurations. Requires `PIXABAY_API_KEY` and `PEXELS_API_KEY` in `.env`.

### SVG library

The project includes a generated SVG icon library in `assets/svg/`. The pipeline generates icons with `generate-svg-library.py`, optimizes them with SVGO, and validates them for Remotion compatibility.

---

## Template Engine

The composition engine (`src/engine/`) is the core of the pipeline rendering system.

**DynamicVideo.tsx** — The main composition. Receives the full VideoSpec as a JSON string prop, parses it, calculates frame offsets for each scene, and renders them in sequence. Handles transitions between scenes by overlapping adjacent scene renders during transition windows.

**registry.ts** — Maps every template name string to its React component. Standalone templates that also work in the pipeline go through adapter wrappers that convert `{ params, palette, typography, sceneDurationFrames }` to each template's native `{ data: {...} }` prop shape.

**schema.ts** — Zod schemas for the complete VideoSpec structure: palette, typography, transitions, scene parameters, and per-template param schemas. The AI pipeline validates its output against these schemas before writing the spec.

**Transitions.tsx** — Implements transition effects between scenes: crossfade, wipe (left/right), slide (up/down), zoom (in/out), and none.

**Camera.tsx** — Virtual camera moves applied to individual scenes: slow zoom, pan, drift. Adds cinematic motion to static content.

---

## Testing

```bash
npm test
```

Tests are in `tests/` and run with Node's built-in test runner:

- `specs.test.mjs` — Validates all spec JSON files parse correctly
- `templates.test.mjs` — Verifies template imports and registry
- `cli.test.mjs` — Tests CLI tool argument parsing
- `3dCaptions.test.mjs` — Tests the 3D captions preprocessing pipeline
- `test_pipeline.py` — Python tests for the AI pipeline

---

## Environment Variables

Create a `.env` file at the project root. The AI pipeline requires Azure OpenAI credentials. Other keys are optional depending on which features you use.

### Required for AI pipeline

```bash
AZURE_OPENAI_KEY=your-key
AZURE_GPT_IMAGE_ENDPOINT=https://your-endpoint.openai.azure.com/
```

### Optional

```bash
# Azure OpenAI configuration
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Azure Speech (for transcription)
AZURE_ASR_ENDPOINT=https://your-asr-endpoint
AZURE_ASR_API_KEY=your-asr-key
AZURE_ASR_DEPLOYMENT=whisper

# Google Gemini (fallback for GroundCaptions)
GEMINI_API_KEY=your-gemini-key

# Stock image APIs
PIXABAY_API_KEY=your-pixabay-key
PEXELS_API_KEY=your-pexels-key
```

---

## Adding a New Template

### Standalone template

1. Create the component in `src/templates/` — either a single `.tsx` file or a folder with `index.ts` barrel export.
2. Create a spec JSON at `src/<name>-spec.json` with at minimum: `fps`, `width`, `height`, `durationMs`, `durationFrames`.
3. Register a `<Composition>` in `src/Root.tsx` that imports the component and spec.
4. Optionally add text CLI support in `scripts/set-text.mjs`.
5. Document in `COMMANDS.md`.

### Pipeline template

1. Create the component accepting `TemplateProps` (`params`, `palette`, `typography`, `sceneDurationFrames`).
2. Add the template name to the `TemplateName` union in `src/engine/schema.ts`.
3. Add a param schema for the template in `schema.ts`.
4. Register the component in `src/engine/registry.ts`.
5. The AI pipeline will now be able to use it in generated specs.
