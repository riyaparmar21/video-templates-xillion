# Video 3 — Fitness Brand (Volt X9): Review Notes

## Pipeline Output Summary
- Script: 30 words, 4 lines
- Target: 60s video
- Pipeline produced 8 scenes with templates: KineticCaptions, GenAiFeatures, ParallaxImageReveal, VaultAnimatedCards, TextRevealWipe, LogoStinger, GradientWash, ThreeDCardFlip
- All 3 pipeline agents (Planner, Params, Quality) ran successfully
- Pipeline Duration Fix adjusted scene durations to sum to 60s
- BUT: Effective duration = 56.8s (not 60s) — transition overlaps not accounted for (same bug as Video 2)

## What the Existing Guide PREVENTED (rules that held)
1. Integer durations — all scene durations were integers
2. No template repetition in consecutive scenes — all 8 scenes used different templates
3. Dark color palette — background #0A0A0A with neon green (#00FF40) accents
4. Font trio selected — Montserrat/Inter/JetBrains Mono
5. ThreeDCardFlip uses `cards` array correctly — not the `images` plural anti-pattern
6. Asset paths resolved — all image paths point to existing files in `public/assets/fitness_volt/`

## What BROKE (issues found in v1 spec)

### CRITICAL — Rendering failures or major visual defects

| # | Issue | Template | Guide Rule Existed? | Recurring from Video 2? |
|---|-------|----------|-------------------|------------------------|
| 1 | GenAiFeatures at 12s instead of FIXED 13s minimum | GenAiFeatures | YES (Rule #7) | YES — 3rd occurrence |
| 2 | VaultAnimatedCards at 9s instead of FIXED 11s minimum | VaultAnimatedCards | YES (Rule #7) | YES — 2nd occurrence |
| 3 | LogoStinger is scene 6, NOT last — GradientWash and ThreeDCardFlip follow | LogoStinger | YES (Video 2 rule) | YES — 2nd occurrence |
| 4 | Effective duration 56.8s vs 60s — overlap math bug | All | YES (Video 2 rule) | YES — 2nd occurrence |
| 5 | GenAiFeatures scene2 missing `image` field — staticFile("") crash risk | GenAiFeatures | YES (Video 2 Round 3) | YES — 2nd occurrence |
| 6 | GenAiFeatures scene3 uses non-standard `morphDims` field (ignored by adapter) | GenAiFeatures | NO | NEW |
| 7 | KineticCaptions "big-gold" style token doesn't exist — sanitizer converts to "emphasis-gold" losing "big" intent | KineticCaptions | PARTIAL | NEW |

### HIGH — Won't crash but poor results

| # | Issue | Template | Recurring? |
|---|-------|----------|-----------|
| 8 | GradientWash placed AFTER LogoStinger — breaks narrative | GradientWash | YES |
| 9 | ThreeDCardFlip at 11s as final scene — wrong position, too long | ThreeDCardFlip | NEW |
| 10 | ParallaxImageReveal headline "Built for runners who excel beyond expectations" — HALLUCINATED, script says "who don't believe in limits" | ParallaxImageReveal | YES (pattern) |
| 11 | ParallaxImageReveal subtitle "Challenging every milestone with Volt X9" — HALLUCINATED | ParallaxImageReveal | YES (pattern) |
| 12 | GenAiFeatures scene1 text "the future of performance", "unmatched speed and precision" — HALLUCINATED, not in script | GenAiFeatures | YES (pattern) |
| 13 | VaultAnimatedCards generic labels "Feature 1", "Feature 2" — meaningless placeholder | VaultAnimatedCards | NEW |
| 14 | TextRevealWipe headline 31 chars ("Get the Volt X9 now at volt.run.") exceeds 25-char max | TextRevealWipe | YES |
| 15 | TextRevealWipe at 6s exceeds max 5s | TextRevealWipe | YES |
| 16 | LogoStinger logoSize 120 — too small for portrait video | LogoStinger | NEW |

### CREATIVE — From video editor/content creator perspective

| # | Issue | Impact |
|---|-------|--------|
| 17 | VaultAnimatedCards (credit card grid) used for a RUNNING SHOE brand — visual metaphor completely wrong | Major genre mismatch. Template designed for fintech, not fitness. |
| 18 | No NumberCounterScene despite "37% lighter, 2x energy return" — perfect stat content wasted | Missing high-impact stat dramatization |
| 19 | No BlurTextScroller or momentum-building scene — energy plateau in middle third | Missing pacing variety. GenAiFeatures (13s) → ParallaxImageReveal (10s) = 23s of slow-medium pace with no rhythmic break |
| 20 | GradientWash text "Volt X9" redundant with LogoStinger tagline | Duplicated brand moment |
| 21 | GenAiFeatures scene2 promptBox text "Explore the Volt X9 dashboard features" — what dashboard? It's a shoe, not a SaaS app. | Content doesn't match product category. |
| 22 | 3 product images (product-hero, shoe-tech, runner-action) used in ThreeDCardFlip AND GenAiFeatures — double-exposure of same assets without creative differentiation | Asset fatigue — viewer sees same images twice |

## Fixes Applied: v1 → v3

### Round 1 (v2): Structural fixes
- GenAiFeatures 12→13s (fixed minimum duration)
- VaultAnimatedCards 9→11s (fixed minimum duration)
- LogoStinger moved to last scene
- Removed GradientWash (dead scene after logo)
- Added NumberCounterScene (37% stat)
- Fixed all hallucinated text to use exact script words
- Shortened TextRevealWipe headline within 25-char limit
- Fixed effective duration math

### Round 2 (v3): Creative overhaul
- **Replaced VaultAnimatedCards with BlurTextScroller** — credit card grid makes no sense for shoes; rhythmic word cycling ("Speed", "Lighter", "Power", etc.) fits fitness energy and builds momentum
- **Shortened ParallaxImageReveal headline** from 47 chars ("Built for runners who excel beyond expectations.") to 10 chars ("No limits.") — more cinematic, more impact, less reading
- **Enabled lightLeak on ParallaxImageReveal** — adds warm energy to the cinematic runner shot
- **Fixed GenAiFeatures scene1 text** to exact script: "Introducing the Volt X9." + "37% lighter. 2x the energy return."
- **Fixed GenAiFeatures scene2 promptBox** — changed "Explore the Volt X9 dashboard features" (too SaaS-y) to "Track your performance metrics" (fitness-appropriate)
- **BlurTextScroller: 10 feature words at 86px** — creates visual momentum between stat callout and product gallery
- **Increased ThreeDCardFlip to 10s** — carousel of 3 cards needs time to rotate
- **Trimmed NumberCounterScene label** — "Percent Lighter Than Previous Gen" → "Percent Lighter" (less clutter)

### v3 Final Scene Order (8 scenes, 63s sum, ~59.5s effective)

| # | Template | Duration | Content | Energy Level |
|---|----------|----------|---------|-------------|
| 1 | KineticCaptions | 6s | "Your next personal best starts with what's on your feet." | HIGH (hook) |
| 2 | GenAiFeatures | 13s | Product showcase: shoe hero, dashboard, tech details, logo | MEDIUM (informational) |
| 3 | ParallaxImageReveal | 10s | Runner action shot with "No limits." overlay | MEDIUM-HIGH (cinematic) |
| 4 | NumberCounterScene | 6s | 37% counter with green glow | HIGH (stat pop) |
| 5 | BlurTextScroller | 9s | 10 feature words cycling | HIGH (momentum) |
| 6 | ThreeDCardFlip | 10s | 3-card carousel (product, tech, action) | MEDIUM-HIGH (showcase) |
| 7 | TextRevealWipe | 5s | "Available Now" / "volt.run" | HIGH (CTA) |
| 8 | LogoStinger | 4s | Logo with particles + "Run Beyond Limits" | MEDIUM (close) |

### Energy Arc Assessment
- Seconds 0-6: HIGH (text hook grabs attention)
- Seconds 6-19: MEDIUM (GenAiFeatures product deep-dive)
- Seconds 19-29: MEDIUM-HIGH (cinematic runner parallax)
- Seconds 29-35: HIGH (stat counter pop)
- Seconds 35-44: HIGH (momentum word scroll)
- Seconds 44-54: MEDIUM-HIGH (product gallery carousel)
- Seconds 54-59: HIGH (CTA punch)
- Seconds 59-63: MEDIUM (logo close)

The arc follows: Hook → Inform → Emote → Stat → Build → Showcase → CTA → Close. This is a strong commercial video structure.

## NEW RULES Discovered in Video 3

### Recurring Rules (confirmed from Video 2, agents violated again)
1. **Duration Fix violates fixed-duration constraints** — 3rd occurrence total (GenAiFeatures 13→12, VaultAnimatedCards 11→9)
2. **Content hallucination** — agents rephrase and embellish script in GenAiFeatures and ParallaxImageReveal
3. **LogoStinger not placed last** — 2nd occurrence
4. **TextRevealWipe exceeds character/duration limits** — 2nd occurrence
5. **GenAiFeatures scene2 missing image** — 2nd occurrence

### New Rules (first discovered in Video 3)
1. **Template genre fitness**: VaultAnimatedCards/VaultCardFeatures are fintech-specific. Do NOT use for non-financial products. Use BlurTextScroller for atmospheric feature cycling, StackHiring for feature lists.
2. **Compound style tokens invalid**: KineticCaptions style "big-gold" doesn't exist. Agents must pick ONE valid token from: `normal, filler, big, emphasis-blue, emphasis-gold, accent-blue, big-blue`.
3. **GenAiFeatures morphDims is not a recognized field**: The adapter uses `portraitWidth/portraitHeight/landscapeWidth/landscapeHeight` internally. Non-standard fields are silently ignored.
4. **ParallaxImageReveal headline should be short**: Cinematic parallax works best with short, punchy text (under 15 chars). Long sentences compete with the visual impact of the parallax effect.
5. **Stat scenes should match stat templates**: When scripts contain numeric claims (percentages, counts, multipliers), Scene Planner MUST include NumberCounterScene.
6. **Avoid double-exposing same assets**: If an image appears in GenAiFeatures, use DIFFERENT images in ThreeDCardFlip or other gallery scenes, or differentiate the context (e.g., different labels, zoom levels, treatments).
7. **GenAiFeatures scene2 promptBox must be contextually appropriate**: Don't use "dashboard" language for non-software products. Match the prompt text to the product category.

## Summary

| Metric | Video 2 (Fintech) | Video 3 (Fitness) |
|--------|-------------------|-------------------|
| Total issues found | 18 + 8 + 7 = 33 | 22 (spec + creative) |
| Recurring from prev video | N/A | 5 |
| New rules discovered | 26 | 7 |
| Creative/genre issues | 0 | 6 |
| Versions produced | v1 → fixed | v1 → v2 → v3 |

Key insight: **Template selection must consider product genre.** The LLM agents select templates based on visual patterns without understanding the product domain. VaultAnimatedCards "looks cool" but its credit card metaphor is semantically wrong for shoes. The Quality Guide needs a template-to-genre compatibility matrix.
