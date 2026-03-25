# Video Blueprint

## Video Overview
- **Genre/Style:** tech-product
- **Target Audience:** Tech-savvy professionals, corporate decision-makers, and businesses looking to leverage AI-driven personalization.
- **Tone:** Authoritative, professional, and transformative.
- **Target Duration:** 20 seconds
- **Word Count:** 40 words

---

## Key Sections

### Segment 1: Opening Hook (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "73% of consumers prefer brands that personalize their experience."
- **Template Config:** 
  - Word groups with style tokens:
    - "73%" as emphasis-gold big
    - "consumers" as normal
    - "prefer" as filler
    - "personalize" as accent-blue
    - "experience" as big-blue

---

### Segment 2: Data-Driven Impact (5s - 10s)
- **Type:** rising_action
- **Template:** BlurTextScroller [PRIMARY]
- **Text:** "Companies using AI-driven personalization see a 40% increase in revenue. That's transformative."
- **Template Config:** 
  - Words for the vertical scroll: 
    - ["AI-driven", "personalization", "40% increase", "in revenue", "transformative"]
  - Progressive blur and opacity during scroll.

---

### Segment 3: Feature Highlights (10s - 16s)
- **Type:** feature_list
- **Template:** StackHiring [PRIMARY]
- **Text:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."
- **Template Config:** 
  - Title: "Core Pillars"
  - Roles list in scrolling carousel:
    - ["Real-Time Data Collection", "Machine Learning Models That Adapt", "Seamless Integration"]
  - CTA:
    - Line 1: "Unlock the potential of AI personalization."
    - Line 2: "Start transforming your business today."
    - Button text: "Learn More"
    - Background: Gradient dark blue.

---

### Segment 4: Call to Action (16s - 20s)
- **Type:** CTA
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "Visit personalize.ai to start today."
- **Template Config:** 
  - Word groups with style tokens:
    - "Visit" as normal
    - "personalize.ai" as emphasis-blue big
    - "today" as accent-blue

---

## Visual Themes
- **Visual Approach:** Clean, modern, and data-driven with a focus on bold typography and dynamic animations. Dark, immersive backgrounds with light and vivid text accents for contrast.
- **Color Direction:** Gold (#FFD700) for emphasis, blue (#1E90FF) for accents, and white (#FFFFFF) text on dark backgrounds (#0A0A0A).

---

## Template Suggestions

| Segment | Template           | Type          | Reasoning                            |
|---------|--------------------|---------------|--------------------------------------|
| 1       | KineticCaptions    | PRIMARY       | Bold word-by-word hook to grab attention. |
| 2       | BlurTextScroller   | PRIMARY       | Vertical scroll emphasizes key data points. |
| 3       | StackHiring        | PRIMARY       | Dynamic scrolling carousel highlights features. |
| 4       | KineticCaptions    | PRIMARY       | Clear and concise CTA for strong close. |

---

## Media Notes
No external assets provided. Use template-native visuals only.

---

## Pacing
- **Segment Durations:** 
  - Segment 1: 5s
  - Segment 2: 5s
  - Segment 3: 6s
  - Segment 4: 4s
- **Total Duration:** 20 seconds

---

## Text Overlays
- **Segment 1:** "73% of consumers prefer brands that personalize their experience."
- **Segment 2:** "Companies using AI-driven personalization see a 40% increase in revenue. That's transformative."
- **Segment 3:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."
- **Segment 4:** "Visit personalize.ai to start today."

---

## Color Palette (JSON block)
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

---

## Typography (JSON block)
```json
{
  "typography": {
    "heading": "Montserrat",
    "body": "Inter",
    "mono": "JetBrains Mono"
  }
}
```