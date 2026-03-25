## Video Overview
- **Genre/Style:** tech-product
- **Target Audience:** Business professionals, marketers, and decision-makers seeking AI-driven personalization solutions.
- **Tone:** Authoritative, professional, transformative
- **Target Duration:** 20 seconds
- **Word Count:** 40 words

## Key Sections

### Segment 1: Hook (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "73% of consumers prefer brands that personalize their experience."
- **Template Config:** 
  - Word groups with style tokens: 
    - "73%" as emphasis-gold big
    - "consumers" as normal
    - "prefer" as filler
    - "brands" as normal
    - "personalize" as emphasis-blue
    - "experience" as big-blue

### Segment 2: Transformative Insight (5s - 9s)
- **Type:** rising_action
- **Template:** NumberCounterScene [PRIMARY]
- **Text:** "40% increase in revenue."
- **Template Config:** 
  - `target`: 40
  - `label`: "Revenue Increase"
  - `prefix`: ""
  - `suffix`: "%"
  - `glowColor`: "#FFD700"
  - `particleCount`: 25

### Segment 3: Core Pillars (9s - 16s)
- **Type:** explanation
- **Template:** BlurTextScroller [PRIMARY]
- **Text:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."
- **Template Config:** 
  - `words`: ["real-time data collection", "machine learning models that adapt", "seamless integration"]
  - `speed`: medium
  - `direction`: up

### Segment 4: CTA (16s - 20s)
- **Type:** call_to_action
- **Template:** TextRevealWipe [PRIMARY]
- **Text:** "Visit personalize.ai to start today."
- **Template Config:** 
  - `headline`: "Visit personalize.ai"
  - `subtitle`: "Start today."
  - `wipeDirection`: left
  - `wipeColor`: "#FFD700"
  - `headlineSize`: 72
  - `subtitleSize`: 48

## Visual Themes
- **Visual Approach:** Bold, dynamic, and professional visuals that emphasize transformation and innovation. Use clean layouts and animations to convey clarity and precision.
- **Color Direction:** Gold accents (#FFD700) provide a premium feel, contrasted with deep blue tones (#1E90FF) for trust and innovation. Backgrounds remain dark (#0A0A0A). Text is light (#FFFFFF) for readability.

## Template Suggestions

| Segment | Template          | Type           | Reasoning                               |
|---------|-------------------|----------------|-----------------------------------------|
| 1       | KineticCaptions   | PRIMARY        | Dramatic word-by-word reveal for the hook. |
| 2       | NumberCounterScene| PRIMARY        | Cinematic stat reveal emphasizing transformation. |
| 3       | BlurTextScroller  | PRIMARY        | Sequential emphasis on core features.   |
| 4       | TextRevealWipe    | PRIMARY        | Polished CTA with text wipe animation.  |

## Media Notes
No external assets provided. Use template-native visuals only.

## Pacing
- **Segment Durations:** 
  - Segment 1: 5 seconds
  - Segment 2: 4 seconds
  - Segment 3: 7 seconds
  - Segment 4: 4 seconds
- **Total Duration:** 20 seconds

## Text Overlays
- **Segment 1:** "73% of consumers prefer brands that personalize their experience."
- **Segment 2:** "40% increase in revenue."
- **Segment 3:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."
- **Segment 4:** "Visit personalize.ai to start today."

## Color Palette
```json
{
  "color_palette": {
    "primary": "#FFD700",
    "secondary": "#1E90FF",
    "background": "#0A0A0A",
    "text": "#FFFFFF",
    "accent": "#FF6B35"
  }
}
```

## Typography
```json
{
  "typography": {
    "heading": "Montserrat",
    "body": "Inter",
    "mono": "JetBrains Mono"
  }
}