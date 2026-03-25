# Video Blueprint Document

## Section 1: Video Overview
- **Genre/Style:** tech-product  
- **Target Audience:** Companies and professionals interested in AI-driven personalization and data analytics  
- **Tone:** Authoritative, transformative, modern  
- **Target Duration:** 20 seconds  
- **Word Count:** 40 words  

---

## Section 2: Key Sections

### Segment 1: Bold Hook (0s - 5s)  
- **Type:** hook  
- **Template:** KineticCaptions [PRIMARY]  
- **Text:** "73% of consumers prefer brands that personalize their experience."  
- **Template Config:**  
  - Style tokens:  
    - "73%" as emphasis-gold big  
    - "consumers" as normal  
    - "prefer" as filler  
    - "personalize" as accent-blue  

---

### Segment 2: Revenue Impact (5s - 9s)  
- **Type:** rising_action  
- **Template:** ImpactNumber [FILLER]  
- **Text:** "40% increase in revenue."  
- **Template Config:**  
  - number="40%"  
  - label="Revenue Increase"  
  - entrance="slam"  
  - color="#FFD700"  

---

### Segment 3: Three Pillars (9s - 15s)  
- **Type:** informative  
- **Template:** BlurTextScroller [PRIMARY]  
- **Text:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."  
- **Template Config:**  
  - Style: vertical blur text scroll  
  - Highlight: "real-time data collection" as emphasis-blue, "machine learning models" as normal, "seamless integration" as accent-blue  

---

### Segment 4: Call to Action (15s - 20s)  
- **Type:** cta  
- **Template:** StackHiring [PRIMARY]  
- **Text:** "Visit personalize.ai to start today."  
- **Template Config:**  
  - Header: "Start Personalizing Today"  
  - CTA button: "Visit personalize.ai" in #FFD700  
  - Background: tech gradient from #0A0A0A to #1E90FF  

---

## Section 3: Visual Themes
- **Visual Approach:** Sleek, data-driven visuals with animated text and smooth transitions to emphasize AI-powered personalization.  
- **Color Direction:** Gold and blue accents on a dark background to convey authority and innovation.  

---

## Section 4: Template Suggestions

| Segment | Template          | Type          | Reasoning                                   |
|---------|-------------------|---------------|--------------------------------------------|
| 1       | KineticCaptions   | PRIMARY       | Word-by-word emphasis for bold hook text   |
| 2       | ImpactNumber      | FILLER        | Quick stat callout with dramatic animation |
| 3       | BlurTextScroller  | PRIMARY       | Highlights key pillars with scrolling text |
| 4       | StackHiring       | PRIMARY       | Strong CTA with modern design elements     |

---

## Section 5: Media Notes
No external assets provided. Use template-native visuals only.  

---

## Section 6: Pacing
- **Segment Durations:**  
  - Segment 1: 5 seconds  
  - Segment 2: 4 seconds  
  - Segment 3: 6 seconds  
  - Segment 4: 5 seconds  
- **Total Duration:** 20 seconds  

---

## Section 7: Text Overlays
- **Segment 1:** "73% of consumers prefer brands that personalize their experience."  
- **Segment 2:** "40% increase in revenue."  
- **Segment 3:** "Three core pillars: real-time data collection, machine learning models that adapt, and seamless integration."  
- **Segment 4:** "Visit personalize.ai to start today."  

---

## Section 8: Color Palette (JSON block)
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

## Section 9: Typography (JSON block)
```json
{
  "typography": {
    "heading": "Montserrat",
    "body": "Inter",
    "mono": "JetBrains Mono"
  }
}