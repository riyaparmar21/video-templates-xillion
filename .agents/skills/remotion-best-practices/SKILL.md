---
name: remotion-best-practices
description: Best practices for Remotion - Video creation in React
metadata:
  tags: remotion, video, react, animation, composition
---

## When to use

Use this skills whenever you are dealing with Remotion code to obtain the domain-specific knowledge.

## Captions

When dealing with captions or subtitles, load the [./rules/subtitles.md](./rules/subtitles.md) file for more information.

## Using FFmpeg

For some video operations, such as trimming videos or detecting silence, FFmpeg should be used. Load the [./rules/ffmpeg.md](./rules/ffmpeg.md) file for more information.

## Audio visualization

When needing to visualize audio (spectrum bars, waveforms, bass-reactive effects), load the [./rules/audio-visualization.md](./rules/audio-visualization.md) file for more information.

## Sound effects

When needing to use sound effects, load the [./rules/sfx.md](./rules/sfx.md) file for more information.

## Project Templates

Each template has its own SKILL.md with spec format, animation details, and editing guides. When working on a specific template, load its SKILL.md first.

- [KineticCaptions](../../../src/templates/KineticCaptions/SKILL.md) - Animated word-by-word captions with style tokens, spring pop-ins, and tight line overlap
- [AnimatedWebScreens](../../../src/templates/AnimatedWebScreens/SKILL.md) - 3x3 device grid with zoom intro and horizontal slide transitions
- [AnimatedSearchBar](../../../src/templates/AnimatedSearchBar/SKILL.md) - Animated search bar with grow-in, width expansion, letter-by-letter typing, and shrink-out exit
- [IOSNotification](../../../src/templates/IOSNotification/SKILL.md) - iOS-style notification banner with bouncy pop-in, word-by-word text reveal, and shrink-out exit
- [InflatingText](../../../src/templates/InflatingText/SKILL.md) - Bold text with multi-phase inflate animation, overshoot scaling, per-letter shifts, and dramatic final inflate
- [ProgressBar](../../../src/templates/ProgressBar/SKILL.md) - Animated progress bar with gradient fill, grow-in entrance, smooth fill animation, shimmer highlight, and shrink-out exit
- [BlurTextScroller](../../../src/templates/BlurTextScroller/SKILL.md) - Vertical word list scrolling upward with progressive blur/opacity, arrow indicator on active word, diagonal rotation, and continuous loop
- [Tweet](../../../src/templates/Tweet/SKILL.md) - Twitter/X-style tweet card with staggered slide-in-from-right animations for all content elements, word-by-word body reveal, and shrink-out exit
- [VaultAnimatedCards](../../../src/templates/VaultAnimatedCards/SKILL.md) - Tilted credit card grid with 3-phase animation: tight diagonal scroll → zoom-out straighten → center tagline reveal with neighbor fade
- [ProductRevealTrack](../../../src/templates/ProductRevealTrack/SKILL.md) - 3-sequence product reveal with concentric running-track outlines, dark atmospheric hero shot, and brand sign-off
- [WhiteSocialHandle](../../../src/templates/WhiteSocialHandle/SKILL.md) - Animated social handle pill badge with icon grow-in, width expansion, and per-letter text reveal
- [ShowreelGrid](../../../src/templates/ShowreelGrid/SKILL.md) - Horizontal phone-mockup carousel with sliding cards and hero-scale spotlight
- [MobileShowreelFrames](../../../src/templates/MobileShowreelFrames/SKILL.md) - Mobile gallery showreel — grid intro with corner dots, zoom to full-screen, vertical scroll parade with number labels
- [StackHiring](../../../src/templates/StackHiring/SKILL.md) - Hiring announcement — geometric intro, We're Hiring title, continuous role scroll with center highlight, CTA scene with landscape background
- [SlideshowSocial](../../../src/templates/SlideshowSocial/SKILL.md) - Multi-slide social media presentation with 5 layout types, red accent line, decorative dots, bold italic headlines, and smooth crossfade transitions
- [DesignPreview](../../../src/templates/DesignPreview/SKILL.md) - Floating design portfolio cards with logo badge — keyframe-driven showcase with staggered pop-in entries, smooth drifting, and fade-out exits
- [GenAiFeatures](../../../src/templates/GenAiFeatures/SKILL.md) - 4-scene Gen AI product showcase with typewriter text, floating UI elements, aspect-ratio morphing, and logo reveal
- [VaultCardFeatures](../../../src/templates/VaultCardFeatures/SKILL.md) - Fintech card-features showcase with scrolling feature words, rotating credit cards flying in/out, split-text INVOICES reveal, and powered-by badge
- [Showcase](../../../src/templates/Showcase/SKILL.md) - Social media portfolio showcase with spreading border lines, typewriter text, zoom+blur image cycling, and title zoom ending
- [RouteText](../../../src/templates/RouteText/SKILL.md) - Kinetic typography with multi-row scrolling city names, gold arrow separators, and staggered speed per row
- [ColorBlendBlocks](../../../src/templates/ColorBlendBlocks/) - Multi-scene color blend blocks with images, gradient overlays, and configurable blend modes (⚠ no SKILL.md yet)

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/3d.md](rules/3d.md) - 3D content in Remotion using Three.js and React Three Fiber
- [rules/animations.md](rules/animations.md) - Fundamental animation skills for Remotion
- [rules/assets.md](rules/assets.md) - Importing images, videos, audio, and fonts into Remotion
- [rules/audio.md](rules/audio.md) - Using audio and sound in Remotion - importing, trimming, volume, speed, pitch
- [rules/calculate-metadata.md](rules/calculate-metadata.md) - Dynamically set composition duration, dimensions, and props
- [rules/can-decode.md](rules/can-decode.md) - Check if a video can be decoded by the browser using Mediabunny
- [rules/charts.md](rules/charts.md) - Chart and data visualization patterns for Remotion (bar, pie, line, stock charts)
- [rules/compositions.md](rules/compositions.md) - Defining compositions, stills, folders, default props and dynamic metadata
- [rules/extract-frames.md](rules/extract-frames.md) - Extract frames from videos at specific timestamps using Mediabunny
- [rules/fonts.md](rules/fonts.md) - Loading Google Fonts and local fonts in Remotion
- [rules/get-audio-duration.md](rules/get-audio-duration.md) - Getting the duration of an audio file in seconds with Mediabunny
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) - Getting the width and height of a video file with Mediabunny
- [rules/get-video-duration.md](rules/get-video-duration.md) - Getting the duration of a video file in seconds with Mediabunny
- [rules/gifs.md](rules/gifs.md) - Displaying GIFs synchronized with Remotion's timeline
- [rules/images.md](rules/images.md) - Embedding images in Remotion using the Img component
- [rules/light-leaks.md](rules/light-leaks.md) - Light leak overlay effects using @remotion/light-leaks
- [rules/lottie.md](rules/lottie.md) - Embedding Lottie animations in Remotion
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) - Measuring DOM element dimensions in Remotion
- [rules/measuring-text.md](rules/measuring-text.md) - Measuring text dimensions, fitting text to containers, and checking overflow
- [rules/sequencing.md](rules/sequencing.md) - Sequencing patterns for Remotion - delay, trim, limit duration of items
- [rules/tailwind.md](rules/tailwind.md) - Using TailwindCSS in Remotion
- [rules/text-animations.md](rules/text-animations.md) - Typography and text animation patterns for Remotion
- [rules/timing.md](rules/timing.md) - Interpolation curves in Remotion - linear, easing, spring animations
- [rules/transitions.md](rules/transitions.md) - Scene transition patterns for Remotion
- [rules/transparent-videos.md](rules/transparent-videos.md) - Rendering out a video with transparency
- [rules/trimming.md](rules/trimming.md) - Trimming patterns for Remotion - cut the beginning or end of animations
- [rules/videos.md](rules/videos.md) - Embedding videos in Remotion - trimming, volume, speed, looping, pitch
- [rules/parameters.md](rules/parameters.md) - Make a video parametrizable by adding a Zod schema
- [rules/maps.md](rules/maps.md) - Add a map using Mapbox and animate it
- [rules/voiceover.md](rules/voiceover.md) - Adding AI-generated voiceover to Remotion compositions using ElevenLabs TTS
- [rules/display-captions.md](rules/display-captions.md) - Displaying captions/subtitles synced to video timeline
- [rules/import-srt-captions.md](rules/import-srt-captions.md) - Importing SRT caption files into Remotion
- [rules/transcribe-captions.md](rules/transcribe-captions.md) - Transcribing audio to captions using speech-to-text
- [rules/sfx.md](rules/sfx.md) - Sound effects patterns and usage in Remotion
