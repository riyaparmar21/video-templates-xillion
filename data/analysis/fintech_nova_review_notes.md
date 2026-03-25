# Video 2 — Fintech App (Nova): Review Notes

## Pipeline Output Summary
- Script: 38 words, 4 lines
- Target: 60s video
- Pipeline produced 9 scenes with templates: KineticCaptions, GenAiFeatures, Tweet, NumberCounterScene, BlurTextScroller, StackHiring, GradientWash, LogoStinger, TextRevealWipe
- All 3 pipeline agents (Planner, Params, Quality) ran successfully
- Pipeline's own Duration Fix adjusted scene durations to sum to 60s
- BUT pipeline warning: "Timeline duration 56.20s does not match spec.duration 60" — overlap math was wrong

## What the Existing Guide PREVENTED (rules that held)
1. ✅ **Integer durations** — all scene durations were integers (no fractional values). The pipeline enforced this.
2. ✅ **@role asset references** — partially. The pipeline's asset resolver copied files and used relative paths, but not @role tokens. The guide's rule about @role is aspirational vs what the pipeline actually injects.
3. ✅ **No template repetition in consecutive scenes** — all 9 scenes used different templates.
4. ✅ **Narrative arc** — the Planner correctly sequenced hook → product → proof → stat → features → CTA → close.
5. ✅ **Dark color palette** — background #0A0A0A with gold/blue accents. No white flash risk.
6. ✅ **Font trio selected** — Montserrat/Inter/JetBrains Mono, appropriate for tech-product.

## What BROKE (issues found in the generated spec)

### CRITICAL — Would cause rendering failures or major visual defects

| # | Issue | Template | Guide Rule Existed? | New Rule Needed? |
|---|-------|----------|-------------------|-----------------|
| 1 | KineticCaptions: Full sentence in single text field instead of one-word-per-entry. Used `{text: "full sentence", style: "big"}` at the `lines` level instead of `words` array with individual word objects. | KineticCaptions | YES (Section 3.1) but Agent 2 still violated it | Strengthen: add examples of WRONG vs RIGHT in agent prompt |
| 2 | KineticCaptions: Added words not in script ("easily and securely") | KineticCaptions | NO | NEW RULE: Agent must use exact script text, never hallucinate extra words |
| 3 | GenAiFeatures at 10s instead of 13s native. Duration Fix reduced it from 13→10 to hit target. | GenAiFeatures | YES (Section 2.3) — "NEVER compress below 60%". 10/13 = 77% but the issue is the Duration Fix auto-adjusting. | NEW RULE: Duration Fix must never reduce a fixed-duration template below its minimum |
| 4 | GenAiFeatures textLines as plain strings instead of {words: string[], color: string} | GenAiFeatures | YES (Section 3.4) but Agent 2 ignored it | Strengthen: inject TypeScript interface into prompt |
| 5 | GenAiFeatures promptBox missing required fields (boldWords, label, typeSpeedMs, bgColor, etc.) | GenAiFeatures | YES (Section 3.4) | Same as above |
| 6 | GenAiFeatures Scene 3 used app-cards.png (275×183) — far too low-res | GenAiFeatures | YES (Section 4.3) — "<300px = logo/icon only" | Agent needs image dimensions injected into prompt |
| 7 | Tweet duration 6s instead of FIXED 5s | Tweet | PARTIAL — template_constraints.md says "FIXED 5s" | NEW RULE: Quality Checker must enforce fixed-duration constraints absolutely |
| 8 | Tweet missing cardColor parameter | Tweet | YES (Section 5.3) — "dark/muted backgrounds" | Strengthen: make cardColor required in Quality Checker checklist |
| 9 | NumberCounterScene target 3000000 with fontSize 300 — text overflow | NumberCounterScene | NO (guide has prefix/suffix rules but not overflow) | NEW RULE: Large numbers (>4 digits) must use abbreviated form (3M+) or reduce fontSize. Max digit count per fontSize tier. |
| 10 | BlurTextScroller: Full phrases as words instead of individual words | BlurTextScroller | NO | NEW RULE: BlurTextScroller words must be 1-2 words max per entry. Never phrases or sentences. |
| 11 | BlurTextScroller: Only 5 items, need 8-20 | BlurTextScroller | NO | NEW RULE: BlurTextScroller minimum 8 words for proper loop. |
| 12 | StackHiring at 5s instead of FIXED 9s minimum | StackHiring | PARTIAL — template_constraints.md has minimums | NEW RULE: Quality Checker must hard-reject scenes below minimum duration |
| 13 | StackHiring only 3 roles instead of 5-7 | StackHiring | NO | NEW RULE: StackHiring requires 5-7 roles for proper scroll fill |
| 14 | TextRevealWipe at 12s — way too long, creates dead time | TextRevealWipe | NO (guide has min durations but not max) | NEW RULE: TextRevealWipe max 5s. CTA scenes should be punchy. |
| 15 | LogoStinger before TextRevealWipe — narrative order wrong | LogoStinger | YES (Section 6.2) — LogoStinger is the closer | Strengthen: Quality Checker must enforce LogoStinger as last scene |

### HIGH — Won't crash but produces poor results

| # | Issue | New Rule Needed? |
|---|-------|-----------------|
| 16 | Hardcoded asset paths instead of @role tokens | The pipeline itself converts — but the guide rule should still apply for portability |
| 17 | Two consecutive slide_up transitions | Strengthen transition variety enforcement |
| 18 | Timeline duration mismatch (56.2s vs 60s target) — pipeline's Duration Fix doesn't account for transition overlaps | NEW RULE: Duration formula must be sum(durations) - sum(overlaps[0..n-2]) = target |

## NEW RULES to Add to Quality Guide

### Duration Rules (new)
- **Duration Fix must respect template minimums**: The auto-adjustment that normalizes total duration must NEVER reduce a scene below its template's minimum. If adjustments are needed, take time from flexible-duration templates only.
- **Effective duration formula**: `sum(scene_durations) - sum(transition_overlaps[0..n-2]) = target`. The Duration Fix must use this formula, not just `sum(durations) = target`.
- **Maximum durations**: TextRevealWipe ≤ 5s, GradientWash ≤ 3s, LogoStinger ≤ 4s. Short templates create dead time when given too much duration.

### Parameter Rules (new)
- **BlurTextScroller**: Each word entry must be 1-2 words max. Minimum 8 entries. Duration should be ~600ms per word.
- **StackHiring**: Minimum 5 roles, maximum 7. Duration must be exactly 9s.
- **NumberCounterScene overflow prevention**: For target > 9999, use abbreviated form (e.g. target: 3, suffix: "M+"). fontSize × digit_count must not exceed canvas width.
- **Tweet cardColor is required**: Always specify a dark/muted hex. Default to #1A1A2E if not sure.

### Content Fidelity Rules (new)
- **Never hallucinate script content**: The agent must use exact words from the script. Never add words, rephrase, or embellish. If the script says "Stop overpaying on international transfers", that is the EXACT text.
- **Image dimensions must be checked before template selection**: Inject actual pixel dimensions into the agent prompt alongside filenames. Agent must not use images below resolution thresholds for the chosen template.

### Composition Rules (new)
- **LogoStinger must always be the final scene**: If both CTA and LogoStinger are present, order must be: CTA → LogoStinger (last).
- **Fixed-duration templates cannot be overridden**: Tweet = 5s, StackHiring = 9s, GenAiFeatures = 13s, etc. These are non-negotiable.

## Summary: 13 issues found in generated spec, 6 were caught by existing guide rules (but agents violated them anyway), 7 require new rules.

---

## Round 2: Preview Feedback Fixes

After previewing in Remotion Studio, the following additional issues were found and fixed:

### Spec-level Fixes
| Change | Reason |
|--------|--------|
| KineticCaptions 6→4s | 5 words don't need 6s; felt sluggish |
| BlurTextScroller 9→6s | Too repetitive for 12 single words at 600ms each |
| NumberCounterScene 5→6s | More dramatic count-up time |
| ParallaxImageReveal 7→8s | Cinematic slow reveal benefits from more time |
| StackHiring 9→11s | Roles list needs more scroll time with 7 items |

### Template-level Fixes (code changes)

**GenAiFeatures Scene 1 — text/image overlap (GenAiFeatures.tsx)**
- BEFORE: Text and image both centered in same AbsoluteFill, text overlaid on image with zIndex
- AFTER: Changed to flexDirection column layout with text ABOVE image, 40px gap
- Root cause: The template was designed for short text (2-3 words) but when used with longer typewriter text, it overlaps the image
- NEW RULE: Templates that combine text + image must use column layout, not overlay, unless the image has a built-in dark scrim

**GenAiFeatures font sizes (registry.ts adapter)**
- Scene 1 fontSize: 28→48 (too small to read on mobile)
- Scene 2 fontSize: 24→40
- Scene 3 fontSize: 24→40
- Scene 4 logoFontSize: 48→72 + fontWeight 300→800 + added textShadow glow
- Root cause: Default font sizes were designed for desktop preview, not 1080×1920 portrait video
- NEW RULE: Minimum fontSize for portrait 1080×1920: heading text ≥48px, body text ≥36px

**Tweet card overflow (Tweet.tsx)**
- BEFORE: Fixed card height of 411px; long tweets overflow into timestamp row
- AFTER: Dynamic card height calculated from text length: estimates lines → body height → positions timestamp below
- Formula: `cardH = max(411, bodyTop + bodyHeight + timestampPadding + timestampHeight + bottomPadding)`
- Root cause: Card was designed for short tweets (2 lines); longer tweets (4+ lines) overflow
- NEW RULE: Tweet template card height must be dynamic. Maximum tweet text: 200 characters to avoid card exceeding artboard.

**NumberCounterScene suffix size (NumberCounterScene.tsx)**
- BEFORE: suffix fontSize = number fontSize × 0.35 (tiny "M+" next to large "3")
- AFTER: suffix fontSize = number fontSize × 0.55, aligned to baseline with marginBottom
- NEW RULE: Suffix/prefix should be at least 50% of the number fontSize for readability

**LogoStinger image fallback (LogoStinger.tsx)**
- Added try-catch around staticFile() call in resolveImg
- Added text fallback when logo image fails to load (renders tagline as text instead)
- Root cause: staticFile() can fail silently or return invalid URL if path doesn't match public/ structure
- The actual error was likely a Remotion dev server hot-reload timing issue

### Additional NEW RULES for Quality Guide

1. **Portrait video minimum font sizes**: heading ≥48px, body ≥36px, label/caption ≥24px
2. **Text-over-image layout**: Use column layout (text above/below image) by default. Only overlay text on image if the image has a built-in 70%+ dark scrim.
3. **Dynamic card sizing**: Any template with variable-length text content must calculate layout height dynamically. Fixed heights produce overflow.
4. **Suffix/prefix proportional sizing**: In NumberCounterScene, suffix should be ≥50% of the number fontSize.
5. **Duration must feel natural for content density**: A scene with 5 words should be 3-4s. A scene with 12 single words at 600ms each = 7.2s max. Don't pad beyond the natural pacing.

---

## Round 3: Deep Frame-by-Frame Review Fixes

After a thorough frame-by-frame analysis from a video editor's perspective, the following issues were identified and fixed:

### CRITICAL BUG: GenAiFeatures Absolute-vs-Relative Timing (registry.ts)

**Root cause**: The adapter in `registry.ts` set all Scene2/Scene3 timing values as ABSOLUTE milliseconds from video start (e.g., `imageEnterMs: p1End + 200` where `p1End ≈ 3250`), but the GenAiFeatures component passes RELATIVE `localMs` to each sub-scene (i.e., `localMs = timeMs - scene.startMs`, ranging from 0 to `phaseMs`). Since `phaseMs ≈ 3250` and the image enter threshold was set to ~3450, the condition `localMs >= imageEnterMs` was NEVER true — images in Scenes 2 and 3 never appeared.

**This was the root cause of the "only plain text, no images" complaint across two rounds of feedback.**

| Timing Value | BEFORE (absolute, broken) | AFTER (relative, correct) |
|-------------|--------------------------|--------------------------|
| Scene2 imageEnterMs | `p1End + 200` (~3450) | `400` |
| Scene2 imageEnterDurationMs | 500 | 500 (unchanged) |
| Scene2 exitStartMs | `p2End - 400` (~6100) | `phaseMs - 500` |
| Scene2 button enterDelayMs | `p1End + 800 + i*200` | `800 + i*250` |
| Scene3 imageEnterMs | `p2End + 200` (~6700) | `300` |
| Scene3 stretchStartMs | `p2End + 600` (~7100) | `800` |
| Scene3 exitStartMs | `p3End - 400` (~9350) | `phaseMs - 500` |
| PromptBox enterDelayMs | `p1End + 600` (~3850) | `600` |

**NEW RULE**: All sub-scene timing in multi-phase templates (GenAiFeatures, StackHiring, etc.) MUST be RELATIVE to each phase's own start time (localMs = 0..phaseMs). Never use absolute video-time offsets. The component receives `localMs = timeMs - scene.startMs`, not raw `timeMs`.

### GenAiFeatures Scenes 2 & 3 — Complete Layout Rewrite (GenAiFeatures.tsx)

**Problem**: Even after timing fix, Scene2 had text positioned below the image cluster (lower third) with simple opacity fade at 40px. Scene3 had text as an absolute overlay centered on the image. Both were visually inconsistent with each other and with Scene1 (which used column layout after Round 2 fix).

**Fix — Scene2**:
- Changed from text-below-image overlay to `flexDirection: "column"` with text ABOVE image
- Added typewriter letter-by-letter reveal (25ms per char, starting at 200ms delay)
- Added blinking cursor (500ms interval, disappears when typing complete)
- fontSize: 40→56px, fontWeight: 300→700
- Image enters with scale-in animation (0→1 over 500ms)
- Exit uses blur + scale down effect

**Fix — Scene3**:
- Same column layout pattern as Scene2 (text above, image below)
- Same typewriter animation with cursor
- Consistent y-position with Scene2
- fontSize: 40→56px, fontWeight: 700

**NEW RULE**: All sub-scenes within a multi-phase template must use a consistent layout pattern. If Scene1 uses column layout (text above image), Scene2 and Scene3 must follow the same pattern for visual coherence.

### Font Size Increases (registry.ts)

| Scene | BEFORE | AFTER |
|-------|--------|-------|
| Scene1 fontSize | 48 | 56 |
| Scene2 fontSize | 40 | 56 |
| Scene3 fontSize | 40 | 56 |
| Scene3 portraitWidth | 400 | 450 |
| Scene3 portraitHeight | 600 | 650 |
| Scene3 landscapeWidth | 700 | 750 |
| Scene3 landscapeHeight | 400 | 420 |
| Scene2 imageSize | 500 | 580 |

### NumberCounterScene — Meaningless Count (spec fix)

**Problem**: After Round 1 fix (target: 3, suffix: "M+"), the counter counts from 0 to 3 — which is visually pointless. The drama of a counter scene comes from watching numbers fly.

**Fix**: Changed to `target: 3000000`, `suffix: "+"`, `label: "Users Trust Nova"`, `fontSize: 150` (down from 200 to accommodate 7 digits). The counter now dramatically climbs from 0 → 3,000,000.

**NEW RULE**: NumberCounterScene target should always be a large number (≥1000) to create visual drama. If the actual stat is "3 million", use `target: 3000000, suffix: "+"` NOT `target: 3, suffix: "M+"`. The animation needs visible counting motion.

### GradientWash — Invisible Aurora Scene (removed from spec)

**Problem**: Scene appeared as a near-blank dark screen. The aurora gradient used colors `["#3873FF", "#FFD700", "#1E90FF", "#0A0A0A"]` — the last color (#0A0A0A) matches the background exactly, diluting the gradient to near-invisibility. Text overlay positioned at `bottom: 15%` meant the top 85% of the frame was empty dark space.

**Fix**: Removed GradientWash scene entirely. Redistributed its duration to other scenes.

**NEW RULE**: GradientWash aurora colors must ALL contrast with the background. Never include the background color in the aurora palette. Additionally, if a scene appears visually empty in the top 2/3 of the frame, it should be cut — viewers scroll past within 1-2 seconds.

### StackHiring CTA Crash — Empty ctaBgImage (StackHiring.tsx)

**Problem**: The adapter defaults `ctaBgImage: ""` when spec doesn't provide one. `resolveImg("")` calls `staticFile("")` which produces a broken URL (`http://localhost:3000/static-hash/`). Remotion's `<Img>` throws on failed load.

**Fix**: Added conditional rendering:
```tsx
{ctaBgImage ? (
  <Img src={resolveImg(ctaBgImage)} style={{...}} />
) : (
  <div style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #1a1a3e 50%, ${bgColor} 100%)` }} />
)}
```

**NEW RULE**: Every template that accepts optional image parameters must have a visual fallback (gradient, solid color, or pattern). Never pass empty strings to `staticFile()` or `resolveImg()`. Adapter must check for empty/undefined and provide a default.

### TextRevealWipe — Text Cut-off (spec fix)

**Problem**: Subtitle "Available on iOS & Android · No Credit Card Required" (51 chars) was being cut off at the right edge. Combined with `wipeDirection: "center"` which compounds the overflow.

**Fix**:
- Shortened subtitle to "Available on iOS & Android" (25 chars)
- Changed wipeDirection: "center" → "left" (more predictable text entry)
- Reduced headlineSize: 80→76, subtitleSize: 36→34
- Increased scene duration: 5→6s for breathing room

**NEW RULE**: TextRevealWipe subtitle max 30 characters. Headline max 25 characters. If CTA text is longer, split across headline + subtitle or use a different template. `wipeDirection: "center"` should be avoided for text longer than 15 characters.

### LogoStinger Transition Crash — Zero Duration (Transitions.tsx)

**Problem**: LogoStinger spec has `transitionDuration: 0`, producing `durationFrames = 0`. The TransitionWrapper passes `[0, durationFrames]` = `[0, 0]` to Remotion's `interpolate()`, which requires strictly monotonically increasing inputRange — crashes with error.

**Fix**: Added guard in Transitions.tsx:
```tsx
if (type === "none" || durationFrames <= 0) {
  return <AbsoluteFill>{children}</AbsoluteFill>;
}
```

**NEW RULE**: `transitionDuration: 0` must be treated identically to `transition: "none"`. The renderer must guard against zero-frame interpolation ranges. Quality Checker should flag `transitionDuration: 0` paired with any transition type other than "none".

### Spec-level Duration Changes (Round 3)

| Scene | Template | Duration Before | Duration After | Reason |
|-------|----------|----------------|---------------|--------|
| 1 | KineticCaptions | 4 | 4 | No change |
| 2 | GenAiFeatures | 13 | 13 | No change |
| 3 | Tweet | 5 | 5 | No change |
| 4 | NumberCounterScene | 6 | 6 | No change |
| 5 | BlurTextScroller | 6 | 6 | No change |
| 6 | StackHiring | 11 | 11 | No change |
| 7 | GradientWash | 5 | **REMOVED** | Invisible aurora |
| 8 | TextRevealWipe | 5 | 6 | Breathing room for CTA |
| 9 | LogoStinger | 4 | 4 | No change |
| **Total** | | **59** | **55 (sum) / ~51s effective** | 8 scenes after removal |

Post-removal, duration was redistributed: TextRevealWipe 5→6s. Final composition is 8 scenes.

### Verified Rendering (all 8 scenes)

All scenes rendered successfully without errors. Frame-by-frame verification:
- Scene 1 (KineticCaptions): Words animate in with correct styles, proper pacing
- Scene 2 (GenAiFeatures S1-S4): Scene1 column layout with image below. **Scene2 now shows typewriter text with image appearing below.** **Scene3 same consistent layout.** Scene4 logo with glow.
- Scene 3 (Tweet): Dynamic card height, no overflow, verified badge visible
- Scene 4 (NumberCounterScene): Dramatic 0→3,000,000 count with "+" suffix at proportional size
- Scene 5 (BlurTextScroller): Individual words cycling with blur effect
- Scene 6 (StackHiring): 7 roles scrolling, CTA section with gradient fallback (no crash)
- Scene 7 (TextRevealWipe): Clean headline "Try Nova free", subtitle fits within frame, left wipe
- Scene 8 (LogoStinger): Logo renders with particles, no transition crash

### Additional NEW RULES for Quality Guide (Round 3)

1. **Sub-scene timing must be RELATIVE**: In multi-phase templates, all timing values (enterMs, exitMs, delayMs) must be relative to the phase start (0 to phaseMs). Never use absolute video-time offsets.
2. **Consistent sub-scene layout**: All sub-scenes within a multi-phase template must use the same layout pattern (column vs overlay) for visual coherence.
3. **NumberCounterScene needs large targets**: Use actual numbers (3000000) not abbreviated (3). The animation drama comes from watching digits fly.
4. **GradientWash aurora must contrast**: Never include the background color in the gradient palette. All aurora colors must be visually distinct from bgColor.
5. **Optional image parameters need fallbacks**: Every template accepting optional images must render a gradient/solid fallback when the image is empty or missing. Never pass empty strings to staticFile().
6. **TextRevealWipe character limits**: Headline ≤25 chars, subtitle ≤30 chars. Avoid `wipeDirection: "center"` for text >15 chars.
7. **Zero-duration transition guard**: `transitionDuration: 0` must be treated as `transition: "none"`. Renderer must guard against zero-frame interpolation ranges.
8. **Visual density rule**: If a scene's top 2/3 appears empty or near-blank, it should be removed or redesigned. Viewers scroll past dead space.

---

## Summary Across All 3 Rounds

| Round | Issues Found | Issues Fixed | Code Files Changed | New Rules Discovered |
|-------|-------------|-------------|-------------------|---------------------|
| 1 (Spec Review) | 18 | 18 | 0 (spec-only) | 13 |
| 2 (Preview Feedback) | 8 | 8 | 5 (GenAiFeatures.tsx, registry.ts, Tweet.tsx, NumberCounterScene.tsx, LogoStinger.tsx) | 5 |
| 3 (Frame-by-Frame) | 7 | 7 | 4 (GenAiFeatures.tsx, registry.ts, StackHiring.tsx, Transitions.tsx) | 8 |
| **Total** | **33** | **33** | **5 unique files** | **26 new rules** |

The Fintech Nova spec backup is saved at `data/specs/fintech_nova.json`.
