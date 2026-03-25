**VIDEO SPEC GENERATION**

**LLM Pipeline Quality Guide**

*v7.0 --- Lessons from 9 Video Build Sessions*

Every rule was discovered by debugging a real video. Follow these rules
to produce production-quality specs in a single pass.

Xillion · Video Templates Pipeline · March 2026

Videos tested: Flowboard SaaS (25s) · Flowboard SaaS Rebuild (32s) ·
Fintech Nova (60s) · Fitness Volt X9 (60s) · Fintech Nova v2 Debug (60s) · Fitness Volt v4 Debug (60s) · Fintech Nova v5 Redesign (60s) · Fitness Volt v5 Asset Refresh (60s) · Fitness Volt v7 Pacing Recut (48s)

**1. Purpose of This Document**

This document is a comprehensive quality guide for the 3-agent LLM video
generation pipeline (Scene Planner → Param Generator → Quality Checker).
Every rule was discovered by building and debugging real promotional
videos across multiple review rounds. Version 3.0 adds voiceover-first
timing methodology, stagger timing rules, template parameter name
corrections, and pipeline caching best practices discovered during the
Flowboard SaaS rebuild session. Version 4.0 adds asset quality enforcement,
GenAiFeatures hardcoded font size fixes, template-to-genre compatibility
rules, and image processing requirements discovered during the Fintech Nova
and Fitness Volt X9 v2 debug sessions. Version 5.0 adds template visual
self-sufficiency strategy, complete redesign methodology when image assets
are poor, TypewriterReveal advanced params (charMode, italicWords, fontFamily),
VaultAnimatedCards focus-pull blur technique, GlassPanel as premium text-only
alternative, and updated scene count guidance discovered during the Fintech
Nova v5 full redesign session. Version 6.0 adds the Asset Intelligence System
(pipeline now passes image metadata to all 3 agents), scene plan cache
invalidation rules, image repetition detection, asset filename normalization
(spaces → hyphens), AVIF format support, and editorial quality rules for
word economy, label redundancy, CTA sizing, and logo sizing discovered during
the Fitness Volt v5 asset refresh session. Version 7.0 adds the CubeRotation
template (3D perpendicular-face cube with continuous rotation), TypewriterReveal
content-duration validation, GlassPanel replacement strategy with image-backed
alternatives, text-heavy scene pacing rules (max 4s for opening text scenes),
font impact guidelines for hero text, and CubeRotation headline styling params
discovered during the Fitness Volt v7 pacing recut session. 

+----------------------------------------------------------------------+
| **CORE PRINCIPLE**                                                   |
|                                                                      |
| Each rule below is a constraint the LLM must enforce during spec     |
| generation. Violating any single rule produces a visible defect in   |
| the rendered video. Rules marked \[RECURRING\] were violated across  |
| multiple videos despite being documented --- these require           |
| code-level enforcement, not just prompt instructions.                |
+----------------------------------------------------------------------+

**2. Duration and Timing Rules**

Duration errors remain the single most frequent category of defects
across all three video builds.

**2.1 Integer Durations Only**

+----------------------------------------------------------------------+
| **RULE: WHOLE INTEGERS**                                             |
|                                                                      |
| Every scene duration MUST be a whole integer in seconds. Never 5.38, |
| 3.5, or 7.2. Always 5, 4, or 7. Remotion multiplies duration × fps   |
| for frame counts. Fractional durations create compounding rounding   |
| errors.                                                              |
+----------------------------------------------------------------------+

**2.2 Effective Duration Formula**

+----------------------------------------------------------------------+
| **CRITICAL RULE \[RECURRING\]**                                      |
|                                                                      |
| effective\_duration = sum(scene\_durations) -                        |
| sum(transition\_overlaps\[0..n-2\]). The last scene has no outgoing  |
| transition. The Duration Fix algorithm must use this formula, not    |
| just sum(durations) = target. This was violated in both the Fintech  |
| Nova and Volt X9 builds (56.2s and 56.8s effective vs 60s target).   |
+----------------------------------------------------------------------+

**2.3 Fixed-Duration Templates Cannot Be Compressed**

+----------------------------------------------------------------------+
| **CRITICAL RULE \[RECURRING --- violated 3 times across 2 videos\]** |
|                                                                      |
| The Duration Fix algorithm must NEVER reduce a fixed-duration        |
| template below its native duration. GenAiFeatures = 13s,             |
| VaultAnimatedCards = 11s, StackHiring = 9s, Tweet = 5s. If total     |
| duration needs adjustment, take time ONLY from flexible-duration     |
| templates (KineticCaptions, BlurTextScroller, ParallaxImageReveal,   |
| TextRevealWipe). This requires a hard-coded exclusion list in the    |
| Duration Fix code.                                                   |
+----------------------------------------------------------------------+

**2.4 Maximum Duration Limits**

Short templates create dead time when given too much duration:

  ----------------- -----------------------------------
  **Template**      **Maximum Duration**
  TextRevealWipe    ≤6s. CTA scenes should be punchy. Up to 6s with enlarged fonts (≥80px headline). [UPDATED v6]
  GradientWash      ≤3s. Breather only.
  LogoStinger       ≤4s. Brand moment, not a scene.
  IOSNotification   ≤3s. Fixed at 3s.
  ProgressBar       ≤4s. Fixed at 4s.
  ----------------- -----------------------------------

**2.5 Content-Duration Balance**

  ---------------------------- ---------------------------------------------------------------------------------------------
  **Scenario**                 **Rule**
  Scene with 5 words           3--4s. Don't pad beyond natural pacing.
  ListReveal with 4 items      Minimum 1.2s per item with staggerDelay ≥30 frames. 4 items at stagger=35 needs 8s minimum.
  KineticCaptions groups       Weight by word count. 2 words ≈ 1s; 10 words ≈ 3s.
  GenAiFeatures (13s native)   NEVER compress below 60% (7.8s). Use at 13s or choose a simpler template.
  BlurTextScroller             ≈600ms per word. 6-8 curated words = 4-5s core. Max 8s total with buffer. [UPDATED v6]
  12 single words at 600ms     7.2s max. Don't pad beyond the natural pacing. Prefer 6-8 strong words over 10+ generic ones. [UPDATED v6]
  ---------------------------- ---------------------------------------------------------------------------------------------

**2.6 Minimum Duration by Template**

  ------------------------------------------------------ --------------------------------------------------
  **Category**                                           **Minimum Duration**
  Text-only (KineticCaptions, TextRevealWipe)            3s minimum. Add 0.5s per 10 words.
  Image showcase (ParallaxImageReveal, ThreeDCardFlip)   4s minimum. Reveal animation takes 25% of scene.
  3D image rotation (CubeRotation)                       8s minimum. Needs time for smooth continuous rotation across faces. [NEW v7]
  Complex multi-phase (GenAiFeatures, SlideshowSocial)   Use native duration only. GenAiFeatures = 13s.
  Stat counters (NumberCounterScene)                     4s minimum. Count-up needs drama time.
  Logo endings (LogoStinger)                             2s minimum. 3s recommended.
  List scenes (StackHiring)                              9s fixed. 5--7 roles for proper scroll fill.
  Card showcases (VaultAnimatedCards)                    11s fixed. Minimum 4 cards.
  ------------------------------------------------------ --------------------------------------------------

**2.7 Voiceover-First Timing Methodology \[NEW from Flowboard
Rebuild\]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| Scene durations MUST be calculated from voiceover pacing BEFORE      |
| visual design. Professional narration averages \~120 words per       |
| minute with emphasis and pauses (\~2.0 words/sec effective). Count   |
| the words assigned to each scene, divide by 2.0, round up to the     |
| nearest integer, then add 0.5-1s breathing room. NEVER design        |
| visuals first and fit narration later --- this consistently produces |
| scenes that feel rushed.                                             |
+----------------------------------------------------------------------+

Calculation formula:

scene\_duration\_seconds = ceil(word\_count / 2.0) + breathing\_room

Example from Flowboard SaaS (46-word script):

  ------------------------------------- ----------- ------------- -----------------------
  **Scene**                             **Words**   **VO Time**   **Scene Duration**
  "Meet Flowboard --- the project..."   12          6.0s          6s
  "Drag, drop, done..."                 11          5.5s          5s (+ image scenes)
  "Over 12,000 teams..."                14          7.0s          4s (stat) + 8s (list)
  "Try Flowboard free for 30 days."     6           3.0s          4s
  Logo sting (no VO)                    1           0.5s          3s
  ------------------------------------- ----------- ------------- -----------------------

**2.8 ListReveal Stagger Timing \[NEW from Flowboard Rebuild\]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| ListReveal staggerDelay is measured in FRAMES, not seconds. At       |
| 30fps: staggerDelay: 10 = 0.33s between items (TOO FAST --- items    |
| dump on screen in \~1 second). staggerDelay: 35 = 1.17s between      |
| items (CORRECT --- gives viewers time to read each point). Minimum   |
| staggerDelay MUST be ≥30 frames (1.0s) for any list with items       |
| longer than 5 words. For 4 items with staggerDelay: 35, minimum      |
| scene duration = ceil((40 + 4 × 35 + 20) / 30) = 8s.                 |
+----------------------------------------------------------------------+

  ------------------------------------ --------- -------------------------------------------
  **staggerDelay (frames at 30fps)**   **Gap**   **Assessment**
  10                                   0.33s     BROKEN. Items pile up instantly.
  20                                   0.67s     Too fast for body-copy-length items.
  30                                   1.00s     Minimum for short items (≤5 words).
  35                                   1.17s     Recommended for standard body-copy items.
  45                                   1.50s     Good for long items or complex text.
  ------------------------------------ --------- -------------------------------------------

**3. Template Parameter Rules**

Most rendering crashes trace back to incorrectly structured parameters.

**3.1 KineticCaptions**

+----------------------------------------------------------------------+
| **CRITICAL: One Word Per Entry**                                     |
|                                                                      |
| Each word object's \"text\" field must contain EXACTLY ONE WORD.     |
| Never a phrase or sentence. The template renders each word as a      |
| separate animated \<span\> with whiteSpace: \"nowrap\" at 96--108px  |
| font size. Multi-word values overflow the screen.                    |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **Style Token Validation \[NEW from Video 3\]**                      |
|                                                                      |
| Valid style tokens: normal, filler, big, emphasis-blue,              |
| emphasis-gold, accent-blue, big-blue. Invalid tokens like            |
| \"big-gold\" must be rejected. The Quality Checker must validate     |
| against this whitelist.                                              |
+----------------------------------------------------------------------+

  ------------------------------------- --------------------------------------------------------
  **Content Type**                      **Style Token**
  Key product names, stats              emphasis-gold or emphasis-blue (large, colored, 100px)
  Important nouns/verbs                 normal or big (white, 96--108px)
  Articles, prepositions (the, a, to)   filler (gray, italic, smaller, 78px)
  Mix styles for visual rhythm          Never use the same style for every word
  ------------------------------------- --------------------------------------------------------

**3.2 GenAiFeatures**

+----------------------------------------------------------------------+
| **WARNING: NOT suitable for products without high-quality images      |
| [NEW from Fintech Nova v5]**                                         |
|                                                                      |
| GenAiFeatures creates 4 sequential sub-scenes, each requiring a      |
| product image to fill visual space. When only low-quality, small,    |
| or white-background images are available, ALL 4 sub-scenes look      |
| mediocre. The 4-phase structure amplifies bad assets — you get 4     |
| bad scenes instead of 1. If image assets are poor quality, use       |
| GlassPanel, TypewriterReveal, or BlurTextScroller instead. Reserve   |
| GenAiFeatures for products with 4+ high-res (≥1080px) dark-bg       |
| screenshots.                                                         |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **CRITICAL: Complex Interface \[RECURRING --- violated in both Video |
| 2 and 3\]**                                                          |
|                                                                      |
| TextLine requires {words: string\[\], color: string} --- NOT a plain |
| string or {text, bold}. PromptBoxConfig requires: boldWords, label,  |
| typeSpeedMs, bgColor, textColor, boldColor, width, height. The       |
| TypeScript interfaces MUST be injected into the Agent 2 prompt.      |
| Plain strings crash or produce empty scenes.                         |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **CRITICAL: Sub-Scene Timing Must Be RELATIVE \[NEW from Video 2     |
| Round 3\]**                                                          |
|                                                                      |
| All timing values in multi-phase templates (GenAiFeatures,           |
| StackHiring) must be RELATIVE to each phase's own start time         |
| (localMs = 0..phaseMs). Never use absolute video-time offsets. The   |
| component receives localMs = timeMs - scene.startMs, not raw timeMs. |
| Using absolute values causes images and exits to never trigger       |
| because localMs never reaches the threshold.                         |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **Sub-Scene Layout Consistency \[NEW from Video 2\]**                |
|                                                                      |
| All sub-scenes within GenAiFeatures must use the same layout         |
| pattern. If Scene1 uses column layout (text above, image below),     |
| Scenes 2 and 3 must follow the same pattern. Mixing column and       |
| overlay layouts creates visual inconsistency.                        |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **Scene4 Limitation \[NEW from Video 3\]**                           |
|                                                                      |
| Scene4 only supports text (logoText + logoSuperscript). The adapter  |
| does NOT pass logoImage to the component. If a logo image is needed  |
| in the outro, use LogoStinger as a separate closing scene.           |
+----------------------------------------------------------------------+

**3.2.1 ThreeDCardFlip Parameter Names \[NEW from Flowboard Rebuild\]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| ThreeDCardFlip accepts image (a single string path) or cards (an     |
| array of CardItem objects). It does NOT accept images (plural).      |
| Using images: \[\...\] produces an empty/broken scene because the    |
| component's normalizeCards() function checks data.cards first, then  |
| data.image --- it never reads data.images. The Quality Checker must  |
| reject any ThreeDCardFlip scene using the key images.                |
+----------------------------------------------------------------------+

  -------------- ---------------------------------------------------------------
  **Key Name**   **Behavior**
  image          Single image path (string). Correct for single-card showcase.
  cards          Array of CardItem objects. Correct for multi-card showcase.
  images         NOT RECOGNIZED. Produces blank scene. MUST be rejected.
  -------------- ---------------------------------------------------------------

+----------------------------------------------------------------------+
| **ThreeDCardFlip Image Background Requirement [NEW from Fintech      |
| Nova v5]**                                                           |
|                                                                      |
| ThreeDCardFlip on dark themes requires images with dark or           |
| transparent backgrounds. White-background product screenshots create |
| a jarring white rectangle that clashes with the dark video theme.    |
| Dark gradient overlays do NOT adequately fix this — the white edges  |
| bleed through. If only white-bg images are available, use            |
| VaultAnimatedCards with image-type cards instead (smaller contained  |
| context where white edges are less visible).                         |
+----------------------------------------------------------------------+

**3.3 NumberCounterScene**

+----------------------------------------------------------------------+
| **Prefix/Suffix Semantics**                                          |
|                                                                      |
| prefix appears BEFORE the animated number, suffix appears AFTER.     |
| target: 94, suffix: \"%\" renders as \"94%\". Setting prefix:        |
| \"94%\" with target: 94 renders as \"94%94\" --- a visible bug.      |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **Large Numbers for Drama \[NEW from Video 2\]**                     |
|                                                                      |
| Use actual large numbers, not abbreviated forms. target: 3000000,    |
| suffix: \"+\" creates a dramatic count from 0 to 3,000,000. Using    |
| target: 3, suffix: \"M+\" counts from 0 to 3 --- no visual drama.    |
| The animation's impact comes from watching digits fly.               |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| **Overflow Prevention**                                              |
|                                                                      |
| For target \> 9999, ensure fontSize × digit\_count doesn't exceed    |
| canvas width. Reduce fontSize for large numbers (e.g., 150px for     |
| 7-digit numbers). Suffix should be ≥50% of number fontSize for       |
| readability.                                                         |
+----------------------------------------------------------------------+

**3.4 StackHiring**

  --------------- --------------------------------------------------------------------------------------------------------------------------
  **Parameter**   **Rule**
  roles           5--7 items. Fewer than 5 = empty scroll. More than 7 = too compressed.
  duration        Fixed 9s. Phase timing: cyan fill (0--0.5s), shapes (0.5--1.4s), title (1.4--2.4s), roles scroll (3.4--7s), CTA (7--9s).
  ctaBgImage      If empty/missing, adapter MUST render gradient fallback. Never pass empty strings to staticFile().
  textColor       Must use palette.text, not hardcoded \#232455. Dark blue on dark backgrounds is invisible.
  --------------- --------------------------------------------------------------------------------------------------------------------------

**3.5 BlurTextScroller**

  ------------------ ----------------------------------------------------------------
  **Parameter**      **Rule**
  words array        Each entry must be 1--2 words max. Never phrases or sentences.
  Minimum count      At least 8 words for proper loop fill.
  Duration formula   words.length × 600ms ÷ 1000 = minimum seconds.
  Padding strategy   Use reverse + deduplicate, not cyclic repetition.
  ------------------ ----------------------------------------------------------------

**3.6 TextRevealWipe**

+----------------------------------------------------------------------+
| **Character Limits \[NEW from Video 2\]**                            |
|                                                                      |
| Headline ≤25 characters. Subtitle ≤30 characters. If CTA text is     |
| longer, split across headline + subtitle or use a different          |
| template. wipeDirection: \"center\" should be avoided for text       |
| longer than 15 characters.                                           |
+----------------------------------------------------------------------+

**3.7 Tweet**

Duration: FIXED 5s. cardColor is REQUIRED --- always specify a
dark/muted hex (default to \#1A1A2E). Card height must be dynamic for
variable-length text. Maximum tweet text: 200 characters.

**3.8 GradientWash**

+----------------------------------------------------------------------+
| **Aurora Color Contrast \[NEW from Video 2\]**                       |
|                                                                      |
| Aurora gradient colors must ALL contrast with the background. Never  |
| include the background color in the aurora palette. Using bgColor    |
| (\#0A0A0A) as one of the aurora colors dilutes the gradient to       |
| near-invisibility.                                                   |
+----------------------------------------------------------------------+

**3.9 Template Genre Restrictions \[NEW from Video 3\]**

  ---------------------------------------- ------------------------------------------------------------------------------------------------------------
  **Template**                             **Appropriate Use**
  VaultAnimatedCards / VaultCardFeatures   Fintech/banking card showcases ONLY. Do not use for non-financial products. Can embed product images as "image" type cards within the grid.
  StackHiring                              Any feature/item list with CTA. Not limited to hiring --- repurpose for product features, tech specs, etc. Use rich dark bgColor (#0D1B2A), not pure black.
  GenAiFeatures                            Product demos with 4+ HIGH-QUALITY images (≥1080px, dark bg). NOT suitable when only small/white-bg images available. See Section 3.2 warning.
  Tweet                                    Social proof, testimonials, user reactions. Not for product descriptions.
  GlassPanel                               Premium text-only scenes: stats, value props, feature highlights. Best alternative when images are unavailable. [NEW v5]
  TypewriterReveal                         Statement/quote scenes. Use charMode for per-letter impact. Best with serif fonts on short sentences (≤50 chars). [NEW v5]
  ParallaxImageReveal                      ONLY with high-res images (≥1080px) that have dark/neutral backgrounds. White-bg images are NOT fixable with overlays. [NEW v5]
  ---------------------------------------- ------------------------------------------------------------------------------------------------------------

**3.10 Template Visual Self-Sufficiency Strategy [NEW from Fintech Nova v5 Redesign]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| When available image assets are low-quality, small, or have          |
| backgrounds that clash with the video's dark theme, PREFER templates |
| that are visually self-sufficient through color, typography, and     |
| animation alone. Do NOT force bad images into image-dependent        |
| templates. A GlassPanel with strong copy beats a ParallaxImageReveal |
| with a 275×183px phone mockup every time.                            |
+----------------------------------------------------------------------+

Template tiers by image dependency:

  ------------------------------- -----------------------------------------------------------------------
  **Tier 1: No images needed**    KineticCaptions, GlassPanel, TypewriterReveal, BlurTextScroller,
  (visually self-sufficient)      NumberCounterScene, TextRevealWipe, GradientWash, LogoStinger (logo only)
  **Tier 2: Images enhance**      VaultAnimatedCards (can mix card types + image cards), StackHiring
  (work without, better with)     (ctaBgImage optional), Tweet (avatar optional)
  **Tier 3: Images required**     ParallaxImageReveal, GenAiFeatures, ThreeDCardFlip,
  (unusable without good images)  SplitScreenMorph, SlideshowSocial, CubeRotation [UPDATED v7]
  ------------------------------- -----------------------------------------------------------------------

Decision flowchart for image-poor projects:

1. Audit all available images: dimensions, background color, subject quality.
2. If no image is ≥1080px with a dark/neutral background → avoid ALL Tier 3 templates.
3. Build the scene lineup using Tier 1 templates as the backbone.
4. Use Tier 2 templates strategically: embed small images as VaultAnimatedCards "image" type cards (contained context, not full-bleed).
5. If a complete redesign is needed mid-session, drop all Tier 3 templates and rebuild from Tier 1+2. Do not try to "fix" bad image scenes with overlays — this consistently produces worse results than using a text/animation-only template.

**3.11 GlassPanel as Premium Text-Only Alternative [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| GlassPanel is the best template for text-heavy messages that need    |
| visual premium feel without images. Its frosted glass aesthetic,     |
| corner brackets, and accent color glow make it far superior to       |
| plain white-on-black text. Use it for stats, value propositions,     |
| and any scene where the copy IS the visual. Set size: "large" and    |
| cornerBrackets: true for maximum impact on portrait video.           |
+----------------------------------------------------------------------+

**3.12 TypewriterReveal Advanced Params [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| TypewriterReveal supports three advanced params beyond basic text:   |
| charMode: true enables per-character typing (letter by letter)       |
| instead of per-word reveal. Use for short, impactful sentences.      |
| italicWords: ["word1", "word2"] renders matching words in italic.    |
| Matching strips punctuation (e.g., "minutes," matches "minutes").    |
| fontFamily: "Playfair Display, Didot, serif" overrides the default   |
| heading font. Use serif fonts for elegance on statement scenes.      |
| charMode speed: "fast" = 1.5 frames/char, "medium" = 2.5,           |
| "slow" = 4. For a 40-char sentence at "fast", typing completes in   |
| ~2 seconds — pair with 5s scene duration for hold time after.        |
+----------------------------------------------------------------------+

**3.13 VaultAnimatedCards Mixed Card Types and Focus Pull [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| VaultAnimatedCards supports three card types within a single grid:   |
| credit cards (brand, cardNumber, network), image cards              |
| (type: "image", bgImage path, bgImageFit: "cover"), and chart       |
| cards (type: "chart"). Mix 6 credit cards + 2 image cards + 1       |
| chart card for visual variety in fintech hero scenes.                |
|                                                                      |
| The grid blurs and dims during tagline reveal (progress 68-82%),     |
| pulling viewer focus to the center "Send Money Smarter" text. This   |
| blur effect is built into the template — no spec param needed.       |
| When designing tagline text, keep it ≤3 words for punchy impact      |
| against the blurred card wall.                                       |
+----------------------------------------------------------------------+

**3.14 StackHiring Background Color [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| StackHiring bgColor should use a rich dark color like #0D1B2A        |
| (deep navy) rather than pure black (#0A0A0A). Pure black creates a   |
| flat, lifeless backdrop. Navy or dark charcoal adds depth and        |
| visual richness while maintaining dark theme contrast. This applies  |
| to any template with a user-specified bgColor on dark themes.        |
+----------------------------------------------------------------------+

**3.15 NumberCounterScene Count Timing [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| NumberCounterScene count-up should complete at 40% of scene          |
| duration, not 70%. Fast count-up creates a punchy stat pop; the      |
| remaining 60% lets the number land with a spring bounce and glow     |
| effect. For a 5s scene at 30fps (150 frames), counting finishes at   |
| frame 60 — viewers get 3 full seconds to absorb the stat.            |
+----------------------------------------------------------------------+

**3.16 Image Upscaling for Contained Templates [NEW from Fintech Nova v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Small images (e.g., 275×183px app mockups) can be upscaled 4x via   |
| PIL LANCZOS to 1100×732px for use in contained template contexts     |
| like VaultAnimatedCards image cards or ThreeDCardFlip cards.          |
| LANCZOS preserves detail at moderate upscale ratios. Do NOT          |
| upscale for full-bleed templates — artifacts become visible at       |
| 1080px+ display widths. Create upscaled variants as                  |
| {original}-large.png alongside the original.                         |
+----------------------------------------------------------------------+

**3.17 Image Repetition Limit [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| No single image should appear in more than 2 scenes across the       |
| entire video. In the Fitness Volt v4 spec, only 3 unique images      |
| carried 8 scenes — runner.jpg appeared in scenes 2, 3, and 6,       |
| product-hero.png in scenes 2 and 6, app-dashboard.png in scenes 2    |
| and 6. By the ThreeDCardFlip carousel (scene 6), the viewer had      |
| seen every image at least twice. Zero visual surprise remained.      |
| The Quality Checker must count image occurrences across scenes and    |
| reject any spec where an image appears in 3+ scenes. If the asset    |
| pool is limited (≤3 unique images), use more Tier 1 (text-only)      |
| templates to reduce image dependency.                                |
+----------------------------------------------------------------------+

**3.18 BlurTextScroller Word Economy [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| BlurTextScroller words must be carefully curated, not padded with    |
| generic filler. In the Fitness Volt v4 spec, 10 words including      |
| "Lighter" (redundant with the 37% stat), "Return" (vague), and      |
| "Comfort" (generic) scrolled for 9 seconds — 15% of the video as    |
| a word carousel with no imagery. Trim to 6 strong, brand-specific   |
| words at 7s max. Each word should be an evocative product attribute  |
| that couldn't apply to any competitor. Formula: 6 curated words ×    |
| 600ms = 3.6s core + 3.4s buffer = 7s. Never exceed 8s for           |
| BlurTextScroller regardless of word count.                           |
+----------------------------------------------------------------------+

**3.19 NumberCounterScene Label Redundancy [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| When using suffix (e.g., "%"), the label must NOT repeat the same    |
| information. "37%" with label "Percent Lighter" double-labels the    |
| percent sign. Use label "Lighter" instead. The suffix already tells  |
| the viewer the unit — the label should add context, not echo it.    |
+----------------------------------------------------------------------+

**3.20 CTA and Logo Minimum Sizing [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| TextRevealWipe CTA headline must be ≥80px on 1080×1920 portrait.    |
| 72px looks small for the most important conversion moment. Use 88px  |
| for short CTAs (≤15 chars like "Available Now"), 80px for longer.    |
| Subtitle (URL, tagline) should be ≥48px.                            |
|                                                                      |
| LogoStinger logoSize must be ≥260px on 1080×1920 portrait. The v4   |
| spec used 200px — the logo was lost on the 1080px-wide canvas with  |
| the particle effect spreading attention. Use 280px for standard      |
| logos, 320px for simple/minimal logos that need more visual weight.   |
+----------------------------------------------------------------------+

**3.21 Asset Filename Normalization [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| When copying assets from test_scripts/ to public/assets/, filenames  |
| with spaces must be normalized to hyphens. "app screenshot 2.avif"   |
| becomes "app-screenshot-2.avif". The pipeline's copy_assets_to_      |
| public() uses Python pathlib which handles spaces, but downstream    |
| Remotion staticFile() and spec JSON references work more reliably    |
| with hyphenated names. The manifest and spec must reference the      |
| normalized name, not the original.                                   |
+----------------------------------------------------------------------+

**3.22 AVIF Format Support [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| AVIF images are supported in the pipeline (PIL reads them via        |
| pillow-avif-plugin) and in Remotion (staticFile() serves any         |
| format). AVIF files often have the best quality-to-size ratio in     |
| the asset pool. The asset intelligence system correctly classifies   |
| AVIF dimensions and quality tiers. No special handling needed — use  |
| them like any other image format.                                    |
+----------------------------------------------------------------------+

**3.23 CubeRotation Template [NEW from Fitness Volt v7]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| CubeRotation is a 3D cube with images on perpendicular faces         |
| (rotateY + translateZ positioning). It uses CONTINUOUS rotation —     |
| NO hold time, NO pauses between face transitions. The rotation       |
| completes in 60% of the scene duration, with the last face visible   |
| for the remaining 40%. No idle wobble or float animations — images   |
| must appear straight and steady.                                     |
|                                                                      |
| Key params: images (array of {image, label}), cubeSizePercent        |
| (default 65), tiltX (default 0 — KEEP AT 0 unless asked),           |
| headline, headlineColor, headlineFontSize, headlineFontFamily.       |
|                                                                      |
| Minimum 2 images, recommended 3-4. With 3 images = 2 rotations      |
| over 60% of scene. At 11s scene, rotation phase = 6.6s, hold on     |
| final face = 4.4s. Minimum scene duration 8s.                        |
|                                                                      |
| NEVER set holdSeconds > 0 — this was explicitly rejected by review.  |
| NEVER enable idleRotation or floatY — "normal straight images" only. |
| Headline should use accent color and uppercase for visual impact.    |
+----------------------------------------------------------------------+

CubeRotation belongs in Tier 3 (images required) of the self-sufficiency
strategy. It needs minimum 2 high-quality images with dark or neutral
backgrounds. White-background product screenshots look poor on the cube
faces against a dark scene background.

**3.24 TypewriterReveal Content-Duration Validation [NEW from Fitness Volt v7]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| TypewriterReveal with charMode: true MUST have sufficient duration   |
| for the text to finish typing AND be readable. Formula:              |
|                                                                      |
| min_duration = (char_count × frames_per_char / fps) + 1.5s reading  |
|                                                                      |
| Speed frames/char: "fast" = 1.5, "medium" = 2.5, "slow" = 4.       |
| Example: 55 chars at "fast" speed, 30fps:                            |
|   typing_time = 55 × 1.5 / 30 = 2.75s                               |
|   min_duration = 2.75 + 1.5 = 4.25s → round up to 5s               |
|                                                                      |
| If text cannot fit in the allotted duration, EITHER shorten the      |
| text (use bullet points, split across scenes) OR increase duration.  |
| A TypewriterReveal that gets cut off mid-typing is a critical        |
| defect visible in every render.                                      |
+----------------------------------------------------------------------+

**3.25 GlassPanel Replacement Strategy [NEW from Fitness Volt v7]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| GlassPanel is visually boring when used for motivational or          |
| emotional copy (e.g., "Built for runners who don't believe in        |
| limits"). It produces a dark box with text and nothing else.         |
|                                                                      |
| REPLACEMENT STRATEGY: When the copy is emotional or aspirational     |
| AND a relevant image asset exists, replace GlassPanel with           |
| ParallaxImageReveal using the image as background with the text      |
| as headline/subtitle overlay. This is dramatically more impactful.   |
|                                                                      |
| GlassPanel remains appropriate for: factual statements, data         |
| callouts, technical specs, and scenes where no relevant image        |
| exists. It should NOT be the default for emotional copy when         |
| image assets are available.                                          |
+----------------------------------------------------------------------+

**3.26 Text-Heavy Opening Scene Pacing [NEW from Fitness Volt v7]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| Opening text scenes (KineticCaptions, TypewriterReveal) at the       |
| start of a video should be SHORT — 2-4s maximum. The hook must be    |
| punchy. Viewers decide to keep watching in the first 3-5 seconds.    |
|                                                                      |
| BAD: 9s KineticCaptions → 9s TypewriterReveal = 18s of text before  |
| any visual. This was rejected in review as "too long."               |
| GOOD: 3s KineticCaptions → 4s TypewriterReveal = 7s of text, then   |
| immediately into visual scenes.                                      |
|                                                                      |
| If text content is too long for 2-4s, split it: put the hook in      |
| the opening scene, move supporting details to later scenes or        |
| use bullet points to reduce character count.                         |
+----------------------------------------------------------------------+

**3.27 Font Impact for Hero Text [NEW from Fitness Volt v7]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Hero text scenes (brand introductions, product names, taglines)      |
| must use bold, impactful fonts. Serif fonts like Playfair Display    |
| look elegant but lack punch for short-form video hooks.              |
|                                                                      |
| PREFERRED for hero/impact text: Montserrat (800 weight), Impact,     |
| Arial Black — bold sans-serif fonts that read instantly.             |
| PREFERRED for elegant/editorial text: Playfair Display, Didot —      |
| serif fonts for longer, slower-paced narrative scenes.               |
|                                                                      |
| Font size for hero text in portrait video (1080px wide):             |
| - Product name / brand: 80-96px minimum                              |
| - Tagline / subtitle: 48-64px                                        |
| - Body text / bullet points: 36-48px                                 |
| Text that wraps awkwardly mid-word is a critical layout defect.      |
| If text wraps badly at a given font size, reduce fontSize or         |
| restructure text into shorter lines using \n line breaks.            |
+----------------------------------------------------------------------+

**4. Content Fidelity Rules**

**4.1 Never Hallucinate Script Content**

+----------------------------------------------------------------------+
| **CRITICAL RULE \[RECURRING --- violated in both Video 2 and 3\]**   |
|                                                                      |
| The agent must use EXACT words from the script. Never add words,     |
| rephrase, or embellish. If the script says \"Stop overpaying on      |
| international transfers\", that is the EXACT text. In Video 2, the   |
| agent added \"easily and securely\" (not in script). In Video 3,     |
| \"Built for runners who don't believe in limits\" became \"Built for |
| runners who excel beyond expectations.\" The EXACT script text must  |
| be injected into Agent 2's prompt with \"COPY THESE EXACT WORDS\"    |
| instruction.                                                         |
+----------------------------------------------------------------------+

**4.2 Never Hallucinate Filenames**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| The agent must only reference files that exist in the asset          |
| manifest. During pipeline execution, available filenames are         |
| injected into the Agent 2 prompt. Referencing a non-existent file    |
| crashes Remotion at render time.                                     |
+----------------------------------------------------------------------+

**4.3 Image Dimensions Must Be Checked**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Inject actual pixel dimensions into the agent prompt alongside       |
| filenames. Agent must not use images below resolution thresholds for |
| the chosen template.                                                 |
+----------------------------------------------------------------------+

  ---------------- ---------------------------------------------------------------------------
  **Image Size**   **Allowed Templates**
  ≥1080px wide     Any template including full-bleed (ParallaxImageReveal, SplitScreenMorph, CubeRotation) [UPDATED v7]
  500--1079px      Contained templates at 50--65% card width (ThreeDCardFlip, Showcase, CubeRotation at reduced cubeSizePercent) [UPDATED v7]
  300--499px       Contained templates at 35--45% card width
  \<300px          Logo/icon use ONLY (LogoStinger). Not for any image template.
  ---------------- ---------------------------------------------------------------------------

**5. Asset Handling Rules**

**5.1 Use \@role References**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Always use \@role references (\@project:role) instead of hardcoded   |
| paths (\"assets/saas\_v3/kanban.jpeg\"). The asset resolver maps     |
| role names to files at render time.                                  |
+----------------------------------------------------------------------+

**5.2 Optional Image Fallbacks \[NEW from Video 2\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Every template that accepts optional image parameters must have a    |
| visual fallback (gradient, solid color, or pattern). Never pass      |
| empty strings to staticFile() or resolveImg(). The adapter must      |
| check for empty/undefined and provide a gradient or solid color      |
| default. StackHiring ctaBgImage is the primary example --- empty     |
| string crashes Remotion.                                             |
+----------------------------------------------------------------------+

**5.3 Asset Intelligence System [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| The pipeline's build_asset_intelligence() function converts the      |
| asset manifest into a structured table injected into ALL THREE       |
| agent prompts. This table includes: filename, dimensions, quality    |
| tier (FULL-BLEED ≥1080px / CONTAINED 500-1079px / SMALL 300-499px / |
| ICON <300px), category (product/screenshot/logo/icon), dominant      |
| background color, white-bg warnings, and a dynamic strategy          |
| recommendation per image. Agents MUST use this intelligence to:      |
|                                                                      |
| - Agent 1 (Scene Planner): Select templates compatible with          |
|   available image quality tiers. Never assign a SMALL tier image to  |
|   a Tier 3 (image-required) template.                                |
| - Agent 2 (Param Generator): Use EXACT filenames from the asset      |
|   table. Never hallucinate filenames. Respect quality tier when      |
|   setting imageSize params.                                          |
| - Agent 3 (Quality Checker): Validate every image reference against  |
|   the asset table. Reject specs where image quality tier is below    |
|   the template's minimum requirement.                                |
+----------------------------------------------------------------------+

**5.4 Scene Plan Cache Invalidation [NEW from Fitness Volt v5]**

+----------------------------------------------------------------------+
| **CRITICAL RULE [RECURRING — caused stale assets in Fitness Volt]**  |
|                                                                      |
| The cached scene plan at cache/{video_name}/scene_plan.json locks    |
| in asset references decided by Agent 1. When new assets are added    |
| to test_scripts/assets_{name}/, the scene plan MUST be invalidated.  |
| Without invalidation, Agent 1 is skipped, Agent 2 sees the cached    |
| content_brief referencing old filenames, and new assets never enter  |
| the spec. Three-layer caching without invalidation:                  |
|                                                                      |
| L1: Scene plan cache — invalidated ONLY by deleting scene_plan.json |
| L2: Spec version cache — controlled by --cache/--fresh flags         |
| L3: Asset manifest — never auto-invalidated when source files change |
|                                                                      |
| FIX: Before running the pipeline with new assets, ALWAYS delete the  |
| scene plan cache: rm cache/{video_name}/scene_plan.json. Or use      |
| --fresh with explicit intent to regenerate from scratch. The         |
| pipeline should eventually implement manifest hash comparison to     |
| auto-invalidate the scene plan when the asset fingerprint changes.   |
|                                                                      |
| UPDATE v8: The pipeline now supports use_cached_plan as a separate   |
| flag from use_cached_spec. This allows re-running Agent 1 (Scene     |
| Planner) with fresh asset intelligence while still caching the spec. |
| Pass use_cached_plan=False to force Agent 1 to re-evaluate template  |
| choices with updated asset metadata, without regenerating from       |
| scratch. This is the recommended approach when assets change but     |
| the script/blueprint remain the same.                                |
+----------------------------------------------------------------------+

**6. Visual Quality Rules**

**6.1 Portrait Video Font Sizes \[NEW from Video 2\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| For 1080×1920 portrait video, minimum font sizes are: heading ≥48px, |
| body text ≥36px, label/caption ≥24px. Default font sizes designed    |
| for desktop preview are too small for mobile-first portrait video.   |
+----------------------------------------------------------------------+

**6.2 Text-Over-Image Layout \[NEW from Video 2\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Use column layout (text above/below image) by default. Only overlay  |
| text on image if the image has a built-in 70%+ dark scrim. Templates |
| that combine text + image must use flexDirection: \"column\", not    |
| absolute overlay positioning.                                        |
+----------------------------------------------------------------------+

**6.3 Dynamic Card Sizing \[NEW from Video 2\]**

Any template with variable-length text content must calculate layout
height dynamically. Fixed heights produce overflow. Tweet card height
must scale with text length: cardH = max(411, bodyTop + bodyHeight +
padding).

**6.4 Visual Density Rule \[NEW from Video 2\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| If a scene's top 2/3 appears empty or near-blank, it should be       |
| removed or redesigned. Viewers scroll past dead space. GradientWash  |
| with aurora colors matching the background is the primary example    |
| --- produces a near-invisible scene.                                 |
+----------------------------------------------------------------------+

**6.5 No White Flash at Frame 0**

The DynamicVideo engine applies a master opacity fade-in over the first
0.4s. Background and opacity must be on separate DOM elements. The LLM
should never set per-scene backgrounds to white or light colors.

**6.6 Adapter Color Defaults \[NEW from Video 3\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| All color defaults in template adapters (textColor, buttonTextColor, |
| bgColor) must reference palette colors (palette.text,                |
| palette.background, palette.primary). NEVER use hardcoded hex values |
| that assume a specific background. StackHiring defaulted textColor   |
| to \#232455 (dark blue) which was invisible on \#0A0A0A backgrounds. |
+----------------------------------------------------------------------+

**7. Scene Composition and Pacing**

**7.1 Scene Count Per Duration**

  -------------- ----------------------------------------------
  **Duration**   **Scene Count**
  15s            5--6 scenes. Tight pacing.
  25s            7--9 scenes. Mix dense and breathing scenes.
  45s            10--14 scenes. Must include variety.
  60s            10--14 scenes. Needs clear narrative arc.
  -------------- ----------------------------------------------

Note on 60s scene count: Previous guidance (12--18) assumed many short
text-only scenes. In practice, 10 visually rich scenes with self-sufficient
templates (VaultAnimatedCards 11s, StackHiring 9s, BlurTextScroller 8s)
produce better pacing than 16+ rushed scenes. Prefer fewer, higher-impact
scenes over many thin ones.

**7.2 Mandatory Narrative Arc**

Hook (first 10--15%): KineticCaptions, ImpactNumber, or QuestionReveal.
Keep hook scenes SHORT (2-4s). [UPDATED v7]
Setup (15--30%): TypewriterReveal, Tweet, or value proposition. Use
ParallaxImageReveal with image background instead of GlassPanel for
emotional copy. [UPDATED v7] Rising Action (30--65%): Image templates,
feature lists, data scenes. CubeRotation works well here for product
showcases. [UPDATED v7] Climax (65--80%): Peak stat or testimonial.
CTA + Close (80--100%): TextRevealWipe or CallToAction, then LogoStinger.

**7.3 LogoStinger Must Be Last**

+----------------------------------------------------------------------+
| **CRITICAL RULE \[RECURRING --- violated in both Video 2 and 3\]**   |
|                                                                      |
| LogoStinger MUST always be the final scene. If both CTA and          |
| LogoStinger are present, order must be: CTA → LogoStinger (last).    |
| The Quality Checker must hard-reject any spec where LogoStinger is   |
| not the last scene.                                                  |
+----------------------------------------------------------------------+

**7.4 Template Repetition**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| Never use the same template in consecutive scenes. Alternate between |
| text-heavy, image-heavy, and data/stat templates.                    |
+----------------------------------------------------------------------+

**7.5 Transition Variety**

Vary transitions. Do not use the same transition for more than 2
consecutive scenes. Transition durations: 0.4--0.6 seconds. Last scene
should use crossfade or transition: \"none\".

**7.6 Zero-Duration Transition Guard \[NEW from Video 2\]**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| transitionDuration: 0 must be treated identically to transition:     |
| \"none\". The renderer must guard against zero-frame interpolation   |
| ranges. Passing \[0, 0\] to Remotion's interpolate() crashes with    |
| \"inputRange must be strictly monotonically increasing\". Quality    |
| Checker should flag transitionDuration: 0 paired with any transition |
| type other than \"none\".                                            |
+----------------------------------------------------------------------+

**8. Quality Checker Enforcement Checklist**

Agent 3 must verify ALL of these before approving a spec. If any check
fails, the spec must be revised.

**8.1 Duration Checks**

-   Every scene duration is a whole integer (no decimals)

-   Effective total (sum minus overlaps) matches target within ±1 second

-   No fixed-duration template has been compressed below its native
    duration

-   No scene exceeds its template's maximum duration (TextRevealWipe
    ≤5s, GradientWash ≤3s)

-   Content-heavy scenes have sufficient reading time (1.2s per list
    item, 0.5s per word group)

-   Scene durations accommodate voiceover pacing at \~120 WPM (2.0
    words/sec effective) \[NEW v3\]

-   ListReveal staggerDelay is ≥30 frames (1.0s) for items with 5+ words
    \[NEW v3\]

-   LogoStinger is at least 2s

-   TypewriterReveal with charMode: duration ≥ (char_count × frames_per_char / fps) + 1.5s reading time. Scene must not end before typing completes \[NEW v7\]

-   Opening text-only scenes (first 2 scenes) should be ≤4s each. Total text before first visual scene should be ≤8s \[NEW v7\]

-   CubeRotation minimum 8s. Needs time for smooth continuous rotation across all faces \[NEW v7\]

**8.2 Parameter Checks**

-   KineticCaptions: every word.text is exactly one word (no spaces)

-   KineticCaptions: every style token is in whitelist (normal, filler,
    big, emphasis-blue, emphasis-gold, accent-blue, big-blue)

-   NumberCounterScene: prefix/suffix semantics are correct (prefix
    BEFORE, suffix AFTER)

-   NumberCounterScene: large targets used for drama (never count to
    single digits)

-   GenAiFeatures: textLines are {words: string\[\], color: string}
    objects, not plain strings

-   GenAiFeatures: promptBox is a full PromptBoxConfig object with all
    required fields

-   GenAiFeatures: all sub-scene timing values are RELATIVE (0 to
    phaseMs)

-   TextRevealWipe: headline ≤25 chars, subtitle ≤30 chars

-   Tweet: cardColor is specified (dark/muted hex)

-   StackHiring: 5--7 roles, textColor contrasts with bgColor

-   BlurTextScroller: 8+ words, each entry 1--2 words max

-   ThreeDCardFlip uses image (string) or cards (array), NEVER images
    (plural) \[NEW v3\]

-   TypewriterReveal: charMode is boolean (true/false), italicWords is
    array of strings, fontFamily is a valid CSS font stack \[NEW v5\]

-   TypewriterReveal: italicWords entries should NOT include punctuation
    (matching strips punctuation from both sides) \[NEW v5\]

-   VaultAnimatedCards: mixed card types validated — credit cards have
    brand+cardNumber+network, image cards have type:"image"+bgImage,
    chart cards have type:"chart" \[NEW v5\]

-   StackHiring: bgColor is NOT pure black (#0A0A0A or #000000) — use
    rich dark colors like #0D1B2A \[NEW v5\]

-   CubeRotation: holdSeconds must be 0 or omitted — no pauses between
    rotations. tiltX must be 0 unless explicitly requested. Minimum 2
    images in images array \[NEW v7\]

-   CubeRotation: headline should use headlineColor (accent color),
    headlineFontSize (≥52px), uppercase text for maximum impact \[NEW v7\]

-   TypewriterReveal: text at fontSize ≥72px must not wrap mid-word on
    1080px canvas. Estimate line width: char_count × fontSize × 0.55.
    If > 1080, reduce fontSize or use \n line breaks \[NEW v7\]

-   Hero/intro scenes: font should be bold sans-serif (Montserrat, Impact)
    not serif (Playfair Display) for punchy short-form video hooks \[NEW v7\]

-   All image references use \@project:role format or resolved paths

-   All referenced assets exist in the manifest

**8.3 Composition Checks**

-   No same template in consecutive scenes

-   LogoStinger is the LAST scene (hard-reject otherwise)

-   Video starts with a hook template (KineticCaptions, ImpactNumber,
    QuestionReveal)

-   Transitions are varied (no more than 2 consecutive same-type)

-   Low-res images (\<800px) use contained templates, not full-bleed

-   VaultAnimatedCards/VaultCardFeatures used only for fintech/banking
    content

-   No scene's top 2/3 is visually empty

-   transitionDuration: 0 is only paired with transition: \"none\"

-   GenAiFeatures NOT used when available images are \<1080px or have
    white backgrounds \[NEW v5\]

-   ParallaxImageReveal NOT used with white-background images \[NEW v5\]

-   ThreeDCardFlip NOT used with white-background images on dark themes
    \[NEW v5\]

-   Template lineup uses Tier 1 (self-sufficient) templates as backbone
    when image assets are poor quality \[NEW v5\]

-   No single image appears in more than 2 scenes across the entire spec
    \[NEW v6\]

-   BlurTextScroller duration ≤8s and words ≤8 curated entries (no generic
    filler) \[NEW v6\]

-   NumberCounterScene label does not repeat information already conveyed
    by prefix/suffix \[NEW v6\]

-   TextRevealWipe headlineSize ≥80px and subtitleSize ≥48px on portrait
    (1080×1920) video \[NEW v6\]

-   LogoStinger logoSize ≥260px on portrait (1080×1920) video \[NEW v6\]

-   All asset filenames in spec use hyphenated names (no spaces) \[NEW v6\]

-   Asset intelligence table was injected into agent prompts (verify when
    running --fresh) \[NEW v6\]

-   Asset auto-detection picked test_scripts/ source (not stale public/ copy)
    when --assets not explicitly provided \[NEW v8\]

-   Asset manifest dimensions are not null — if all dimensions show "unknown",
    the triple-fallback in asset_manifest.py is broken \[NEW v8\]

-   GlassPanel NOT used for emotional/aspirational copy when relevant image
    assets are available — use ParallaxImageReveal with image background
    instead \[NEW v7\]

-   CubeRotation images have dark/neutral backgrounds — white-background
    product screenshots look poor on cube faces against dark scene bg \[NEW v7\]

**8.4 Content Fidelity Checks**

-   All text content matches the script EXACTLY (no added, removed, or
    rephrased words)

-   No hallucinated filenames (all assets exist in manifest)

-   Image dimensions verified against template resolution requirements

**8.5 Asset Quality Checks [NEW from v4.0 Debug Sessions]**

-   All images must be >= 600px on shortest side for full-bleed templates (ParallaxImageReveal, GenAiFeatures). Images < 300px (e.g., app-cards.png at 275x183) must only be used in contained contexts (ThreeDCardFlip cards, VaultAnimatedCards bgImage).

-   Pipeline-generated placeholder images (dark illustrations, technical diagrams) must be replaced with real product photos when available in test_scripts/assets_{name}/.

-   Logo images with white/light backgrounds must be processed for dark themes: convert background to transparent, invert dark text to white. Use PIL/Pillow or equivalent to create a logo-dark.png variant.

-   GenAiFeatures scene2 MUST have a non-empty image field. An empty image triggers staticFile("") which crashes the renderer. If no suitable image exists, use the scene1 image.

-   Real photos (runner.jpg, product shots) should be preferred over auto-generated illustrations for cinematic templates (ParallaxImageReveal, ThreeDCardFlip).

**8.6 Font Size and Layout Checks [NEW from v4.0 Debug Sessions]**

-   GenAiFeatures template has hardcoded small font sizes in the component code: promptBox text at 18px (should be 28px+), promptBox label at 12px (should be 18px+), buttons at 22px (should be 30px+). These were fixed in the template code. If rendering looks too small, check the template source for hardcoded sizes that don't scale.

-   For 1080x1920 portrait video, minimum font sizes: heading >= 48px, body/scene text >= 36px, promptBox text >= 24px, button text >= 28px, labels/captions >= 18px.

-   GenAiFeatures scene2 imageSize should be 420px (not default 500px) to leave room for text above and promptBox below. Set promptBox width to 950, height to 160 for readable text.

-   ParallaxImageReveal headline should be short (under 15 chars) for cinematic impact. Long sentences compete with the parallax visual effect.

**9. Recurring Violations Requiring Code-Level Enforcement**

The following issues were documented as rules but agents violated them
again in subsequent videos. Prompt-level rules alone are insufficient.
These require enforcement in the pipeline code.

  -------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------
  **Violation**                                                        **Required Code Fix**
  Duration Fix compresses fixed-duration templates (3 occurrences)     Hard-coded exclusion list in Duration Fix algorithm. Fixed templates are never adjusted.
  Agent 2 outputs wrong GenAiFeatures format (3 occurrences)           Inject TypeScript interfaces directly into Agent 2 prompt. Add post-generation JSON schema validation.
  Content hallucination (3 occurrences)                                Inject EXACT script text with \"COPY THESE EXACT WORDS\" instruction. Add post-generation text diff check.
  LogoStinger not placed last (3 occurrences)                          Quality Checker code must hard-reject and auto-fix scene order.
  TextRevealWipe exceeds limits (3 occurrences)                        Quality Checker code must count characters and enforce max durations.
  GenAiFeatures scene2 missing image (2 occurrences)                   Adapter must validate non-empty image field. Default to scene1.image if empty. Never pass \"\" to staticFile().
  StackHiring textColor invisible on dark backgrounds (1 occurrence)   Adapter must use palette.text as default, not hardcoded \#232455. **FIXED in registry.ts.**
  KineticCaptions invalid style tokens (2 occurrences)                 Quality Checker must validate against token whitelist. \"big-gold\" and other compound tokens are invalid.
  ThreeDCardFlip images instead of image (1 occurrence)                Quality Checker must reject images key. Use image (string) or cards (array).
  ListReveal staggerDelay too low (1 occurrence)                       Quality Checker must enforce staggerDelay ≥30 frames. Default 20 is too fast for body-copy items.
  Scene durations too short for voiceover (1 occurrence)               Pipeline must calculate VO time FIRST (120 WPM), then set scene durations to accommodate.
  Pipeline uses placeholder images instead of real assets (2 occ.)     Asset manifest must prefer files from test\_scripts/assets\_{name}/ over auto-generated PNGs. Real photos always win.
  GenAiFeatures hardcoded small fonts (2 occurrences)                  Template code promptBox fontSize was 18px, buttons 22px — too small for 1080x1920. **FIXED in GenAiFeatures.tsx.**
  VaultAnimatedCards used for non-fintech products (1 occurrence)      Quality Checker must validate template-genre compatibility. Credit card grid template only for financial products.
  GenAiFeatures used with low-quality images (1 occurrence)            Quality Checker must verify ALL GenAiFeatures images are ≥1080px with dark/neutral backgrounds. If not, reject and suggest Tier 1 templates.
  Image-dependent templates with white-bg images (2 occurrences)       ParallaxImageReveal + ThreeDCardFlip with white-bg product screenshots on dark themes. Overlays don't fix this. Use contained templates or text-only alternatives.
  StackHiring pure black background (1 occurrence)                     bgColor #0A0A0A produces flat lifeless backdrop. Use rich dark colors (#0D1B2A navy). Applies to all templates with user-specified bgColor.
  Content text changed during template swap (1 occurrence)             When replacing a template, the EXACT original script text must be preserved. TypewriterReveal text was shortened from full sentence — caught by user review.
  Cached scene plan uses stale asset references (1 occurrence)         Scene plan cache never auto-invalidates when new assets are added. Agent 1 is skipped, Agent 2 inherits old filenames from content_brief. FIX: delete scene_plan.json before re-running with new assets. Long-term: implement manifest hash invalidation.
  Same image in 3+ scenes (1 occurrence)                               Fitness Volt v4 used runner.jpg in scenes 2, 3, and 6. Quality Checker must count image occurrences and reject at ≥3.
  BlurTextScroller filler words (1 occurrence)                         10 generic words for 9 seconds = 15% of video as word carousel. Quality Checker should flag >8 words or >8s duration.
  Undersized logo and CTA text (1 occurrence)                          LogoStinger at 200px and TextRevealWipe at 72px were too small for 1080px-wide portrait video. Quality Checker must enforce minimums (260px logo, 80px CTA headline).
  TypewriterReveal cut off mid-typing (1 occurrence)                   55-char text at "medium" speed in 2s scene — typing physically cannot finish. Quality Checker must calculate min_duration = (char_count × frames_per_char / fps) + 1.5s and reject if scene duration is below this. [NEW v7]
  Opening text scenes too long (1 occurrence)                          KineticCaptions 9s + TypewriterReveal 9s = 18s of text before any visual. Viewer loses interest. Quality Checker should flag opening text-only scenes > 4s each. [NEW v7]
  GlassPanel for emotional copy with available images (1 occurrence)   "Built for runners who don't believe in limits" in a plain dark box when runner.jpg was available. ParallaxImageReveal with the image as background is dramatically better. Quality Checker should flag GlassPanel when image assets exist and copy is emotional/aspirational. [NEW v7]
  CubeRotation with holdSeconds > 0 (2 occurrences)                   Hold time creates dead pauses between face rotations. Explicitly rejected twice (2.5s → 1.2s → still rejected → 0). Template now uses continuous rotation with no holds. Quality Checker must reject holdSeconds > 0 in CubeRotation params. [NEW v7]
  Hero text using weak font (1 occurrence)                             "Introducing the Volt X9" in serif Playfair Display lacked punch for a product intro. Changed to bold Montserrat/Impact. Quality Checker should flag serif fonts on hero/intro scenes. [NEW v7]
  Text wrapping mid-word at large font size (1 occurrence)             80px text on 1080px canvas wrapping "Volt X\n9" and "ene\nrgy return" — critical layout defect. Quality Checker must estimate line width (char_count × fontSize × 0.55) and flag if > canvas width. If text wraps, use bullet points or reduce font size. [NEW v7]
  -------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------

**10. Pipeline Caching and Reproducibility \[NEW from Flowboard
Rebuild\]**

LLMs are non-deterministic. A spec that renders perfectly can degrade
when regenerated. The pipeline MUST cache good specs and reuse them by
default.

**10.1 Default Caching Behavior**

+----------------------------------------------------------------------+
| **CRITICAL RULE**                                                    |
|                                                                      |
| The pipeline defaults to \--cache (True). A cached spec is returned  |
| immediately without calling any LLM agents. Use \--fresh only when   |
| you intentionally want a new generation. Use \--cache-version N to   |
| pin a specific version. The blueprint LLM call is also skipped when  |
| a cached spec exists, saving API credits on both the blueprint and   |
| 3-agent pipeline stages.                                             |
+----------------------------------------------------------------------+

**10.2 Cache Structure**

cache/{video\_name}/ scene\_plan.json --- Agent 1 output (scene plan)
specs/v1.json --- First generated spec specs/v2.json --- Second
(improved) spec specs/v3.json --- etc.

The cache key is derived from the blueprint filename:
data/analysis/saas\_test\_script\_blueprint.md → cache key
saas\_test\_script\_blueprint.

**10.3 When to Regenerate**

Only force \--fresh when: (a) the script text has materially changed,
(b) new assets have been added, or (c) you need to experiment with a
different style/duration. After regeneration, review the output in
Remotion Studio before considering it production-ready.

**10.4 Quality Guide Injection**

+----------------------------------------------------------------------+
| **RULE**                                                             |
|                                                                      |
| This Quality Guide document MUST be injected into ALL THREE agent    |
| system prompts (Scene Planner, Param Generator, Quality Checker).    |
| The pipeline loads LLM\_Pipeline\_Quality\_Guide.md from the project |
| root and appends it to each agent's system message. Without          |
| injection, agents repeatedly violate documented rules because they   |
| have no memory of past mistakes.                                     |
+----------------------------------------------------------------------+

**11. Document History**

  --------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Version**                                                     **Changes**
  v1.0 --- Video 1 (Flowboard SaaS, 25s)                          14 rules from initial build. Duration, parameter, asset, visual quality, and composition rules.
  v2.0 --- Videos 2 & 3 (Fintech Nova 60s, Fitness Volt X9 60s)   30 new rules added. Key additions: fixed-duration protection, relative sub-scene timing, content fidelity enforcement, portrait font sizes, character limits, adapter color defaults, template genre restrictions. 5 recurring violations identified for code-level enforcement.
  v3.0 --- Flowboard SaaS Rebuild (32s)                           8 new rules added. Key additions: voiceover-first timing methodology (Section 2.7), ListReveal staggerDelay minimum 30 frames (Section 2.8), ThreeDCardFlip image vs images param name fix (Section 3.2.1), pipeline caching and reproducibility (Section 10), Quality Guide injection into agent prompts (Section 10.4). 2 new recurring violations added. Blueprint generation skip on cache hits saves API credits.
  v4.0 --- Fintech Nova + Fitness Volt Debug Sessions (60s each)   12 new rules/fixes added. Key additions: asset quality enforcement (Section 8.5) — pipeline must prefer real photos over placeholder illustrations, logo images must be processed for dark themes, minimum image dimensions enforced per template type. Font size and layout fixes (Section 8.6) — GenAiFeatures template hardcoded fonts fixed (promptBox 18→28px, buttons 22→30px), portrait video minimum font size table updated. Template-genre compatibility added to recurring violations. 4 existing recurring violations updated with increased occurrence counts (GenAiFeatures format, hallucination, LogoStinger ordering, TextRevealWipe limits all hit again). 2 code fixes applied: GenAiFeatures.tsx font sizes, StackHiring registry.ts color defaults confirmed fixed.
  v5.0 --- Fintech Nova v5 Full Redesign (60s)                    Major new strategy section: Template Visual Self-Sufficiency (3.10) — 3-tier classification of templates by image dependency, decision flowchart for image-poor projects. 7 new template-specific rules: GlassPanel as premium text-only alternative (3.11), TypewriterReveal charMode/italicWords/fontFamily (3.12), VaultAnimatedCards mixed card types + grid blur focus-pull (3.13), StackHiring rich dark backgrounds (3.14), NumberCounterScene 40% count timing (3.15), image upscaling via LANCZOS for contained templates (3.16), ThreeDCardFlip white-bg image prohibition. GenAiFeatures gets suitability warning — not for low-quality image projects. Scene count for 60s revised from 12-18 to 10-14. Genre restrictions table expanded with GlassPanel, TypewriterReveal, ParallaxImageReveal entries. 10 new Quality Checker items across parameter, composition, and asset checks. 4 new recurring violations added (GenAiFeatures with bad images, white-bg images on dark themes, pure black backgrounds, content text changed during template swap). 3 template code fixes applied: TypewriterReveal.tsx (charMode, italicWords, inline cursor), VaultAnimatedCards.tsx (grid blur/dim during tagline), NumberCounterScene.tsx (40% count timing).
  v6.0 --- Fitness Volt v5 Asset Refresh (60s)                    Asset Intelligence System: pipeline now builds structured image metadata table (dimensions, quality tier, category, dominant color, white-bg warnings) and injects it into all 3 agent prompts (Section 5.3). Scene plan cache invalidation rules: cached scene_plan.json locks in stale asset references when new images are added — must be deleted before re-running with new assets (Section 5.4). 6 new editorial quality rules: image repetition limit of 2 scenes per image (3.17), BlurTextScroller word economy — max 8 words, max 8s (3.18), NumberCounterScene label redundancy prevention (3.19), CTA headline minimum 80px and logo minimum 260px for portrait video (3.20), asset filename space-to-hyphen normalization (3.21), AVIF format support confirmed (3.22). 8 new Quality Checker items. 4 new recurring violations (stale cache, image repetition, filler words, undersized logo/CTA). Pipeline code changes: asset_manifest.py dimension extraction fixed (nested dict → top-level fallback → PIL direct), pipeline.py build_asset_intelligence() added, all 3 agent system prompts updated with asset intelligence injection.
  v7.0 --- Fitness Volt v7 Pacing Recut (48s)                    New CubeRotation template: 3D perpendicular-face cube with continuous rotation, no holds, no idle wobble (Section 3.23). Built from scratch after ThreeDCardFlip "flat flip" was rejected. Key design: ease-in-out interpolation over 60% of scene, last face visible for remaining 40%. Headline styling via headlineColor/headlineFontSize/headlineFontFamily params. 5 new template/pacing rules: TypewriterReveal content-duration validation formula (3.24), GlassPanel replacement strategy — use ParallaxImageReveal with image bg for emotional copy (3.25), text-heavy opening scene pacing max 4s each (3.26), font impact guidelines for hero text — bold sans-serif over serif (3.27), text line-wrap estimation to prevent mid-word breaks. 7 new recurring violations: TypewriterReveal cut-off, opening scenes too long, GlassPanel misuse, CubeRotation holdSeconds > 0 (rejected twice), weak hero fonts, text wrapping mid-word. 9 new Quality Checker items across duration, parameter, and composition checks. Self-sufficiency tiers updated: CubeRotation added to Tier 3. Narrative arc updated with CubeRotation placement and shorter hook guidance. Total video reduced from 60s to 48s by cutting bloated text scenes — shorter is punchier.
    --------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
