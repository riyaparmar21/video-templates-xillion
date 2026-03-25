# Commands

## Quick Reference

```bash
npm start                    # open Remotion Studio (live preview)
npm run render               # render MP4
npm run render:cli           # render via Remotion CLI
npm run build                # bundle for deployment
npm test                     # run smoke tests
```

---

## Standalone Templates

21 standalone templates, each with its own spec JSON and CLI tools.

### AnimatedSearchBar

> Animated search bar with grow-in, width expansion, letter-by-letter typing, and shrink-out exit.

| Action | Command |
|--------|---------|
| Set text | `npm run text:search-bar -- "How to edit videos with AI"` |
| Aspect ratio | `npm run aspect -- search-bar 9:16` |

Spec: `src/animated-search-bar-spec.json`

### IOSNotification

> iOS-style notification banner with bouncy pop-in, word-by-word text reveal, and shrink-out exit.

| Action | Command |
|--------|---------|
| Set text (positional) | `npm run text:notification -- "Mom" "Dinner is ready!"` |
| Set text (flags) | `npm run text:notification -- --title "Slack" --body "New message" --timestamp "2m ago"` |
| Aspect ratio | `npm run aspect -- notification 16:9` |

Spec: `src/ios-notification-spec.json`

### InflatingText

> Bold text with multi-phase inflate animation, overshoot scaling, per-letter shifts, and dramatic final inflate.

| Action | Command |
|--------|---------|
| Set text | `npm run text:inflate -- "BOOM"` |
| Aspect ratio | `npm run aspect -- inflate 9:16` |

Spec: `src/inflating-text-spec.json`

### ProgressBar

> Animated progress bar with gradient fill, grow-in entrance, smooth fill animation, shimmer highlight, and shrink-out exit.

| Action | Command |
|--------|---------|
| Set percentage | `npm run text:progress-bar -- 80` |
| Set percentage + colors | `npm run text:progress-bar -- --percentage 80 --fillStart "#00C853" --fillEnd "#69F0AE"` |
| Aspect ratio | `npm run aspect -- progress-bar 4:5` |

Spec: `src/progress-bar-spec.json`

### BlurTextScroller

> Vertical word list scrolling upward with progressive blur/opacity, arrow indicator on active word, diagonal rotation, and continuous loop.

| Action | Command |
|--------|---------|
| Set words | `npm run text:blur-scroller -- "Motion,Emotion,Direction,Jitter"` |
| Font size & weight | `npm run text:blur-scroller -- --fontSize 80 --fontWeight 700` |
| Letter spacing & colors | `npm run text:blur-scroller -- --letterSpacing -2 --bg "#111111" --textColor "#00FF88"` |
| Aspect ratio | `npm run aspect -- blur-scroller 9:16` |

Spec: `src/blur-text-scroller-spec.json`

### AnimatedWebScreens

> 3x3 device grid with zoom intro and horizontal slide transitions.

| Action | Command |
|--------|---------|
| Bulk load images | `npm run screens -- ./my-screens` |
| Bulk load (clear first) | `npm run screens -- ./my-screens --clear` |
| Bulk load (preview) | `npm run screens -- ./my-screens --dry-run` |
| Set single grid slot | `npm run screens -- --slot 5 ./hero.png` |
| Set center slide | `npm run screens -- --center 2 ./slide.png` |
| Background gradient | `npm run text:web-screens -- --bgStart "#F0F9FF" --bgEnd "#17082C"` |
| Aspect ratio | `npm run aspect -- web-screens 16:9` |

Spec: `src/animated-web-screens-spec.json` · Best image size: 348×224 (3:2)

### KineticCaptions

> Animated word-by-word captions with style tokens, spring pop-ins, and tight line overlap.

| Action | Command |
|--------|---------|
| Aspect ratio | `npm run aspect -- captions 9:16` |

Spec: `src/kinetic-captions-spec.json` · ⚠ No text CLI — captions are generated via the pipeline. Font sizes fixed for 9:16.

### SpiralCaptions

> Character-by-character text placed along an Archimedean spiral path with shrinking font and fading opacity toward center.

| Action | Command |
|--------|---------|
| Render | `npx remotion render src/index.ts SpiralCaptions --output out/spiral-captions.mp4` |
| Still | `npx remotion still src/index.ts SpiralCaptions --frame=200 --output out/spiral-captions.png` |

Spec: `src/spiral-captions-spec.json` · ⚠ No text CLI — words are defined in the spec JSON. Spiral config (radius, decay, font sizes, revolutions) fully customizable via `spiral` object.

### DepthCaptions

> 3D depth-layered captions that render behind a person using per-frame segmentation masks.

| Action | Command |
|--------|---------|
| Segment video | `python src/templates/DepthCaptions/segment.py <video> --fps 30 --max-seconds 10` |
| Render | `npx remotion render src/index.ts DepthCaptions --output out/depth-captions.mp4` |
| Still | `npx remotion still src/index.ts DepthCaptions --frame=60 --output out/depth-captions.png` |

Spec: `src/depth-captions-spec.json` · Requires pre-generated masks in `public/`. Run `segment.py` first, then copy masks to `public/depth_captions_data/masks/`. Word positions are normalized (0-1) for dynamic placement around the subject.

### Tweet

> Twitter/X-style tweet card with staggered slide-in-from-right animations for all content elements, word-by-word body reveal, and shrink-out exit.

| Action | Command |
|--------|---------|
| Set text (positional) | `npm run text:tweet -- "John Kappa" "Hello world!"` |
| Set text (flags) | `npm run text:tweet -- --name "John" --handle "@john" --text "Hello!" --timestamp "1:00 PM · Mar 15, 2026" --source "Twitter Web App"` |
| Aspect ratio | `npm run aspect -- tweet 9:16` |

Spec: `src/tweet-spec.json`

### VaultAnimatedCards

> Tilted credit card grid with 3-phase animation: tight diagonal scroll → zoom-out straighten → center tagline reveal with neighbor fade.

| Action | Command |
|--------|---------|
| Set tagline + brand | `npm run text:vault-cards -- --tagline "Finances\nmade simple" --brand "Acme"` |
| Set tagline only | `npm run text:vault-cards -- --tagline "Banking\nreimagined"` |
| Set brand only | `npm run text:vault-cards -- --brand "MyBank"` |
| Aspect ratio | `npm run aspect -- vault-cards 9:16` |

Spec: `src/vault-animated-cards-spec.json` · Card types: `credit`, `chart`, `image`. Supports `bgImage` + `bgImageFit`.

### ProductRevealTrack

> 3-sequence product reveal with concentric running-track outlines, dark atmospheric hero shot, and brand sign-off.

| Action | Command |
|--------|---------|
| Set label + brand | `npm run text:product-reveal -- --label "CO2" --brand "acme"` |
| Set images | `npm run text:product-reveal -- --image "product-reveal-track/shoe.jpg" --bg "product-reveal-track/bg.jpg"` |
| Set tagline + crafted | `npm run text:product-reveal -- --tagline "Crafted for performance" --crafted "Hand-built\nin Portland"` |
| Aspect ratio | `npm run aspect -- product-reveal 9:16` |

Spec: `src/product-reveal-track-spec.json`

### WhiteSocialHandle

> Animated social handle pill badge with icon grow-in, width expansion, and per-letter text reveal.

| Action | Command |
|--------|---------|
| Set handle (positional) | `npm run text:social-handle -- "yourname.co"` |
| Set handle + icon | `npm run text:social-handle -- --handle "yourname.co" --icon "social-handle/icon.png"` |
| Aspect ratio | `npm run aspect -- social-handle 1:1` |

Spec: `src/white-social-handle-spec.json`

### ShowreelGrid

> Horizontal phone-mockup carousel with sliding cards and hero-scale spotlight.

| Action | Command |
|--------|---------|
| Set folder + bg | `npm run text:showreel-grid -- --folder "showreel-grid" --bg "#ecf2eb"` |
| Aspect ratio | `npm run aspect -- showreel-grid 9:16` |

Spec: `src/showreel-grid-spec.json` · Images auto-discovered from `public/<folder>/`

### MobileShowreelFrames

> Mobile gallery showreel — grid intro with corner dots, zoom to full-screen, vertical scroll parade with number labels.

| Action | Command |
|--------|---------|
| Replace image slot | `npm run text:showreel-frames -- --slot 0 --image "mobile-showreel-frames/hero.jpg"` |
| Append image | `npm run text:showreel-frames -- --image "mobile-showreel-frames/new.jpg"` |
| Background | `npm run text:showreel-frames -- --bg "#1a1a2e"` |
| Hold + scroll timing | `npm run text:showreel-frames -- --hold 1200 --scroll 600` |
| Font | `npm run text:showreel-frames -- --labelFont "Inter, sans-serif" --labelFontSize 40` |
| Aspect ratio | `npm run aspect -- showreel-frames 9:16` |

Spec: `src/mobile-showreel-frames-spec.json`

### StackHiring

> Hiring announcement — geometric intro, We're Hiring title, continuous role scroll with center highlight, CTA scene with landscape background.

| Action | Command |
|--------|---------|
| Roles | `npm run text:stack-hiring -- --roles "Designer,Engineer,PM,Data Scientist"` |
| Brand | `npm run text:stack-hiring -- --brand "Acme" --url "acme.co"` |
| Title + CTA | `npm run text:stack-hiring -- --title "Join Us" --cta1 "Shape" --cta2 "Tomorrow"` |
| Background + scroll | `npm run text:stack-hiring -- --bg "#1a1a2e" --scroll 800` |
| Button | `npm run text:stack-hiring -- --button "Apply Now"` |
| CTA background image | `npm run text:stack-hiring -- --cta-bg "stack-hiring/cta-bg.jpg"` |
| Footer | `npm run text:stack-hiring -- --footer1 "Link in bio" --footer2 "contact@acme.co"` |
| Title font | `npm run text:stack-hiring -- --titleFont "Inter, sans-serif" --titleFontSize 80` |
| Role font | `npm run text:stack-hiring -- --roleFont "Helvetica Neue, Arial" --roleFontSize 72` |
| Aspect ratio | `npm run aspect -- stack-hiring 4:5` |

Spec: `src/stack-hiring-spec.json`

### SlideshowSocial

> Multi-slide social media presentation with 5 layout types, red accent line, decorative dots, bold italic headlines, and smooth crossfade transitions.

| Action | Command |
|--------|---------|
| Edit slide headline | `npm run text:slideshow -- --slide 0 --headline "My Title 01"` |
| Edit slide image | `npm run text:slideshow -- --slide 1 --image "slideshow-social/new.jpg"` |
| Multiple images | `npm run text:slideshow -- --slide 3 --images "img1.jpg,img2.jpg,img3.jpg"` |
| Layout | `npm run text:slideshow -- --slide 2 --layout fullBleedImage` |
| Slide hold duration | `npm run text:slideshow -- --slide 0 --hold 3000` |
| Colors | `npm run text:slideshow -- --accent "#0066FF" --bg "#111111"` |
| Copyright | `npm run text:slideshow -- --copyright "©2026 Brand\nAll rights reserved."` |
| Transition timing | `npm run text:slideshow -- --transition 400` |
| Headline font | `npm run text:slideshow -- --headlineFont "Georgia, serif" --headlineFontSize 100` |
| Body font | `npm run text:slideshow -- --bodyFont "Inter, sans-serif" --bodyFontSize 18` |
| Aspect ratio | `npm run aspect -- slideshow 4:5` |

Spec: `src/slideshow-social-spec.json` · Layouts: `twoImagesCentered`, `imageAboveTextBelow`, `fullBleedImage`, `gridLeftTextRight`, `imageLargeLeftTextRight`

### DesignPreview

> Floating design portfolio cards with logo badge — keyframe-driven showcase with staggered pop-in entries, smooth drifting, and fade-out exits.

| Action | Command |
|--------|---------|
| Logo + background | `npm run text:design-preview -- --logo "BRAND©" --bg "#1a1a2e"` |
| Logo badge colors | `npm run text:design-preview -- --logoBg "#ffffff" --logoText "#000000"` |
| Edit card image | `npm run text:design-preview -- --card 0 --image "design-preview/new.png" --dimensions "1080 x 1080"` |
| Card orientation | `npm run text:design-preview -- --card 0 --portrait` / `--landscape` |
| Card categories | `npm run text:design-preview -- --card 0 --categories "UI,Web,Mobile"` |
| Card timing | `npm run text:design-preview -- --card 0 --enter 500 --hold 3000` |
| Pill colors | `npm run text:design-preview -- --pillActive "#ff0000" --pillInactive "#333333"` |
| Card width | `npm run text:design-preview -- --cardWidth 320` |
| Aspect ratio | `npm run aspect -- design-preview 9:16` |

Spec: `src/design-preview-spec.json`

### GenAiFeatures

> 4-scene Gen AI product showcase with typewriter text, floating UI elements, aspect-ratio morphing, and logo reveal.

| Action | Command |
|--------|---------|
| Background | `npm run text:gen-ai-features -- --bg "#111111"` |
| Scene image (1-3) | `npm run text:gen-ai-features -- --scene 1 --image "gen-ai-features/portrait.png"` |
| Scene font size | `npm run text:gen-ai-features -- --scene 1 --fontSize 48` |
| Prompt box (scene 2) | `npm run text:gen-ai-features -- --scene 2 --promptText "A sunset" --promptLabel "Prompt" --boldWords "sunset"` |
| Logo (scene 4) | `npm run text:gen-ai-features -- --scene 4 --logo "brand" --logoSuper "AI"` |
| Aspect ratio | `npm run aspect -- gen-ai-features 9:16` |

Spec: `src/gen-ai-features-spec.json`

### VaultCardFeatures

> Fintech card-features showcase with scrolling feature words, rotating credit cards flying in/out, split-text INVOICES reveal, and powered-by badge.

| Action | Command |
|--------|---------|
| Subtitle + brand | `npm run text:vault-card-features -- --subtitle "Instant Digital Cards" --brand "Acme"` |
| Feature words | `npm run text:vault-card-features -- --words "Cards,Investing,Transfers,Rewards,Credit"` |
| Brand only | `npm run text:vault-card-features -- --brand "MyBank"` |
| Aspect ratio | `npm run aspect -- vault-card-features 9:16` |

Spec: `src/vault-card-features-spec.json`

### Showcase

> Social media portfolio showcase with spreading border lines, typewriter text, zoom+blur image cycling, and title zoom ending.

| Action | Command |
|--------|---------|
| Title + website | `npm run text:showcase -- --title "Design System" --website "www.design.co"` |
| Background | `npm run text:showcase -- --bg "#f5f5f5"` |
| Title font size | `npm run text:showcase -- --titleFontSize 64` |
| Aspect ratio | `npm run aspect -- showcase 4:5` |

Spec: `src/showcase-spec.json`

### RouteText

> Kinetic typography with multi-row scrolling city names, gold arrow separators, and staggered speed per row.

| Action | Command |
|--------|---------|
| Edit row cities | `npm run text:route-text -- --row 0 --cities "Paris,Lyon,Marseille"` |
| Colors | `npm run text:route-text -- --bg "#1a1a2e" --textColor "#ffffff" --arrowColor "#e94560"` |
| Font size + row height | `npm run text:route-text -- --fontSize 180 --rowHeight 230` |
| Aspect ratio | `npm run aspect -- route-text 16:9` |

Spec: `src/route-text-spec.json`

### ColorBlendBlocks

> Multi-scene color blend blocks with images, gradient overlays, and configurable blend modes.

| Action | Command |
|--------|---------|
| Aspect ratio | `npm run aspect -- color-blend 9:16` |

Spec: `src/color-blend-blocks-spec.json` · ⚠ No text CLI yet — edit spec JSON directly.

### ParallaxImageReveal

> Cinematic parallax depth effect on a single image — Ken Burns on steroids. Depth layers, light leaks, vignette, text overlay.

| Action | Command |
|--------|---------|
| Change image | Edit `"image"` in spec JSON |
| Reveal style | Edit `"revealStyle"` → `"fade"` / `"iris"` / `"wipe"` / `"split"` |
| Zoom direction | Edit `"zoom"` → `"in"` / `"out"` / `"none"` |
| Drift direction | Edit `"direction"` → `"up"` / `"down"` / `"left"` / `"right"` / `"diagonal"` |
| Drift speed | Edit `"speed"` → `"slow"` / `"medium"` / `"fast"` |
| Headline/subtitle | Edit `"headline"` and `"subtitle"` in spec JSON |
| Toggle effects | Edit `"vignette"` / `"lightLeak"` → `true` / `false` |

Spec: `src/parallax-image-reveal-spec.json`

### ThreeDCardFlip

> Apple keynote-style 3D card showcase. Cards tilt, flip, and float with perspective, reflections, and shadows.

| Action | Command |
|--------|---------|
| Change cards | Edit `"cards"` array: `[{"image": "path.png", "label": "Name"}]` |
| Animation style | Edit `"style"` → `"tilt"` / `"flip"` / `"carousel"` / `"fan"` |
| Headline | Edit `"headline"` in spec JSON |
| Toggle effects | Edit `"reflection"` / `"shadow"` / `"particles"` → `true` / `false` |
| Card size | Edit `"cardWidthPercent"` (default 65) and `"borderRadius"` (default 24) |

Spec: `src/three-d-card-flip-spec.json`

### GradientWash

> Full-screen animated gradient morphing between 3-4 colors. Cinematic breather between content scenes.

| Action | Command |
|--------|---------|
| Colors | Edit `"colors"` array in spec JSON (3-4 hex values) |
| Gradient style | Edit `"style"` → `"radial"` / `"linear"` / `"mesh"` / `"aurora"` |
| Speed | Edit `"speed"` → `"slow"` / `"medium"` / `"fast"` |
| Section title | Edit `"text"` in spec JSON (leave empty for pure atmospheric) |

Spec: `src/gradient-wash-spec.json`

### SplitScreenMorph

> Two images side by side with animated divider. Before/after, comparison, old vs new.

| Action | Command |
|--------|---------|
| Change images | Edit `"imageLeft"` and `"imageRight"` in spec JSON |
| Labels | Edit `"labelLeft"` and `"labelRight"` in spec JSON |
| Reveal style | Edit `"revealStyle"` → `"slide"` / `"wipe"` / `"push"` |
| Orientation | Edit `"orientation"` → `"vertical"` / `"horizontal"` |
| Divider | Edit `"dividerColor"` and `"dividerWidth"` in spec JSON |

Spec: `src/split-screen-morph-spec.json`

### NumberCounterScene

> Massive-scale animated counter with eased count-up, particles, and light burst on completion.

| Action | Command |
|--------|---------|
| Target number | Edit `"target"` in spec JSON |
| Prefix/suffix | Edit `"prefix"` (e.g. "$") and `"suffix"` (e.g. "%", "M+") |
| Label | Edit `"label"` in spec JSON |
| Font size | Edit `"fontSize"` (default 320) |
| Particles | Edit `"particleCount"` (0 to disable) |
| Glow color | Edit `"glowColor"` in spec JSON |

Spec: `src/number-counter-scene-spec.json`

### TextRevealWipe

> Text revealed behind a moving colored bar wipe. Section transition workhorse.

| Action | Command |
|--------|---------|
| Headline/subtitle | Edit `"headline"` and `"subtitle"` in spec JSON |
| Wipe direction | Edit `"wipeDirection"` → `"left"` / `"right"` / `"top"` / `"bottom"` / `"center"` |
| Bar color | Edit `"wipeColor"` in spec JSON |
| Text sizes | Edit `"headlineSize"` and `"subtitleSize"` |

Spec: `src/text-reveal-wipe-spec.json`

### LogoStinger

> Punchy 2-3s brand moment. Logo assembles from particles, scales in, blurs in, or expands from line.

| Action | Command |
|--------|---------|
| Logo image | Edit `"logo"` in spec JSON (path in public/ folder) |
| Tagline | Edit `"tagline"` in spec JSON |
| Assembly style | Edit `"style"` → `"particles"` / `"scale"` / `"blur"` / `"line"` |
| Logo size | Edit `"logoSize"` (default 280) |

Spec: `src/logo-stinger-spec.json`

---






## Batch Render All Templates

Render all 28 standalone template compositions as MP4 files (excludes GeneratedVideo). Output goes to `output/templates/`.

```bash
# Render all templates
npm run render:all

# Render specific templates only
npm run render:all -- --only KineticCaptions,Tweet,LogoStinger

# List all available template composition IDs
npm run render:all -- --list
```

Script: `scripts/render-all-templates.mjs`

---

## Aspect Ratio Presets

```bash
npm run aspect -- <template> <ratio>
npm run aspect -- all 9:16          # apply to every template
npm run aspect -- inflate 1280x720  # custom resolution
```

| Ratio | Resolution | Use |
|-------|-----------|-----|
| `1:1` | 1080×1080 | Instagram post (default) |
| `9:16` | 1080×1920 | Stories, Reels, TikTok |
| `16:9` | 1920×1080 | YouTube, presentations |
| `4:5` | 1080×1350 | Instagram feed |
| `4:3` | 1200×900 | Presentations |

---





## Pipeline Templates (27)

Used by the AI pipeline inside `src/latest-spec.json`. Not standalone — they render as scenes in a multi-scene video.

**Core (20):** ImpactNumber, TypewriterReveal, QuoteHighlight, TextFocusZoom, ListReveal, FloatingObjects, GlassPanel, IconGrid, StackedBars, ParallaxLayers, TitleSlide, SplitCompare, Timeline, CallToAction, QuestionReveal, TransitionWipe, Atmosphere, LogoReveal, CountUp, GlobeScene

**Extended (4):** AnimatedChart, SvgMorph, LottieScene, ParticleField

**Premium (3):** ThreeScene, VideoOverlay, AudioWaveform

---




## Pipeline CLI

### Quick start (from script)

```bash
# Generate fresh video from script (default — calls LLM, costs API credits)
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test -d 25

# Use a previously cached spec (zero API cost — skips LLM entirely)
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test --cache

# Use a specific cached version
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test --cache-version 2

# Preview in Remotion Studio
npm start
```

### Quick start (from video)

```bash
python pipeline/transcribe.py input.mp4
python pipeline/analyze.py input.mp4 -t data/stt/input.txt
python pipeline/generate.py -b data/analysis/input_blueprint.md -t data/stt/input.txt -v input.mp4 --media assets/
npm start
npm run render
```

### generate_from_script.py

End-to-end: script → blueprint → three-agent pipeline → VideoSpec JSON. Default is fresh generation. Pass `--cache` to reuse a previously cached spec (zero API cost).

Assets are auto-detected from `public/assets/{output_name}/` or `test_scripts/assets_{name}/`. You can override with `--assets`.

#### Generate fresh video from a script

```bash
# SaaS launch video (assets auto-detected from public/assets/saas_test/)
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  -d 25

# Fintech app video (assets auto-detected from public/assets/fintech/)
python pipeline/generate_from_script.py \
  -s test_scripts/script_fintech_app.txt \
  -o fintech \
  -d 60

# Fitness brand video
python pipeline/generate_from_script.py \
  -s test_scripts/script_fitness_brand.txt \
  -o fitness_volt \
  -d 60

# With explicit assets folder + style
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  -d 25 \
  --style tech-product \
  --assets public/assets/saas_test
```

Calls the LLM for blueprint + 3-agent pipeline, generates the spec, caches it, and writes `src/latest-spec.json`. Run `npm start` to preview.

#### Use a previously cached spec (zero API cost)

```bash
# Reuse the latest cached spec — skips ALL LLM calls
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  --cache

# Pin a specific cached version (e.g., v2 is your gold standard)
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  --cache-version 2
```

Skips the blueprint LLM call AND all 3 pipeline agents. Writes the cached spec straight to `src/latest-spec.json`.

#### With custom fonts

```bash
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  -d 25 \
  --fonts "Montserrat,Inter,JetBrains Mono"
```

#### Generate and render MP4 in one shot

```bash
python pipeline/generate_from_script.py \
  -s test_scripts/script_saas_launch.txt \
  -o saas_test \
  -d 25 \
  --render
```

#### All flags

| Flag | Default | What |
|------|---------|------|
| `-s` / `--script` | (required) | Path to script file (.txt or .md) |
| `-o` / `--output` | `video_spec` | Output name (also used as cache key) |
| `-d` / `--duration` | 60 | Target video duration in seconds |
| `--style` | auto | Genre preset: tech-product, testimonial, explainer, hype-launch, educational, luxury, corporate |
| `--fonts` | auto | Font override as comma-separated trio: "Display,Body,Accent" |
| `--assets` | auto-detect | Path to assets folder. Auto-checks `public/assets/{output}/` and `test_scripts/assets_{name}/` |
| `--caption-images` | off | AI-caption assets (costs API credits) |
| `--cache` | **off** | Use cached spec. Must be explicitly passed. |
| `--cache-version` | latest | Use a specific cached version number (implies --cache) |
| `--fresh` | on (default) | Fresh generation — calls LLM agents |
| `--templates` | all | Comma-separated template filter |
| `--no-creative-guide` | off | Disable creative guide |
| `--no-test` | off | Skip test frame rendering |
| `--render` | off | Render full MP4 after generation |

### transcribe.py

| Flag | Default | What |
|------|---------|------|
| `--model` | medium | Whisper model size |
| `--language` | auto | Force language |
| `--force` | off | Ignore cache |
| `--audio-only` | off | Extract audio only |
| `--list` | off | Show cached transcriptions |

### analyze.py

| Flag | Default | What |
|------|---------|------|
| `-t` | none | Transcript file |
| `-o` | auto | Output name |
| `--frames` | 8 | Frames to sample |
| `--model` | gpt-4o | AI model |
| `--force` | off | Ignore cache |

### generate.py

| Flag | What |
|------|------|
| `-b` | Blueprint file (required) |
| `-t` | Transcript file |
| `-v` | Input video (enables scene detection) |
| `-o` | Output name |
| `-d` | Target duration in seconds (default: 60) |
| `--media` | Assets folder |
| `--caption-images` | AI-caption images (cached) |
| `--recaption` | Re-caption all images |
| `--templates` | Restrict AI to these templates |
| `--list-templates` | Show all 33 templates |
| `--creative-guide` | Custom creative guide |
| `--no-creative-guide` | Disable creative guide |
| `--no-test` | Skip test frame rendering |
| `--render` | Render MP4 after generation |
| `--cache` | Use latest cached spec |
| `--cache-version` | Use specific version |
| `--list-cache` | Show cached versions |

### Cache management

Cached specs live in `cache/{video_name}/specs/v*.json`. The cache key is derived from the blueprint filename.

```bash
# List all cached specs for a video
python pipeline/generate.py --list-cache -b data/analysis/saas_test_script_blueprint.md

# Use cached spec (must pass --cache explicitly)
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test --cache

# Use specific cached version
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test --cache-version 2

# Fresh generation (this is the default, --fresh is optional)
python pipeline/generate_from_script.py -s test_scripts/script_saas_launch.txt -o saas_test -d 25
```

| Cache location | Contents |
|----------------|----------|
| `cache/{name}/specs/v1.json` | First generated spec |
| `cache/{name}/specs/v2.json` | Second (improved) spec — typically the gold standard |
| `cache/{name}/scene_plan.json` | Agent 1 scene plan |
| `src/latest-spec.json` | Active spec loaded by Remotion Studio (auto-updated on every run) |

### Valid transitions

crossfade, wipe_left, wipe_right, slide_up, slide_down, zoom_in, zoom_out, none

---

## File Structure

```
src/
  *-spec.json                         # one per standalone template
  latest-spec.json                    # current pipeline spec
  engine/                             # schema + registry
  templates/                          # all template folders

scripts/
  set-text.mjs                        # text CLI
  set-screens.mjs                     # screen images CLI (AnimatedWebScreens)
  set-aspect.mjs                      # aspect ratio CLI
  render-video.mjs                    # render script

tests/                                # smoke tests (npm test)
pipeline/                             # transcribe → analyze → generate
assets/                               # media (images, videos, SVGs, audio)
data/                                 # transcripts, blueprints, specs
cache/                                # cached specs, scenes, frames
```

---

## Environment Variables

```bash
AZURE_GPT_IMAGE_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_KEY=your-key-here
AZURE_O4_DEPLOYMENT_NAME=o4-mini         # optional
AZURE_O4_API_VERSION=2024-12-01-preview  # optional
```
