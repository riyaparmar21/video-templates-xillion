# Video Blueprint

## Video Overview
- **Genre/Style:** tech-product
- **Target Audience:** Individuals and businesses seeking affordable, fast international money transfers.
- **Tone:** Professional, authoritative, and approachable.
- **Target Duration:** 60 seconds
- **Word Count:** 38 words

---

## Key Sections

### Segment 1: Hook (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "Stop overpaying on international transfers."
- **Template Config:** 
  - Word groups with style tokens:
    - Group 1: "Stop" (big), "overpaying" (emphasis-gold), "on" (normal), "international" (emphasis-blue), "transfers" (big-blue).

---

### Segment 2: Overview (5s - 18s)
- **Type:** product_feature
- **Template:** GenAiFeatures [PRIMARY]
- **Text:** 
  - Scene 1: "Nova sends money to 140 countries." 
  - Scene 2: "Real exchange rates. Zero hidden fees."
  - Scene 3: "Your money arrives in minutes, not days."
  - Scene 4: "Join 3 million users who save $400 per year."
- **Template Config:** 
  - Scene 1: Typewriter text with zooming image ("app-dashboard.png").
  - Scene 2: Floating UI elements (prompt box: "Send $100", buttons: "Send Now", "View Rates").
  - Scene 3: Aspect-ratio morphing with "app-cards.png".
  - Scene 4: Logo reveal with "logo.webp" and superscript "Nova".

---

### Segment 3: Social Proof (18s - 23s)
- **Type:** testimonial
- **Template:** Tweet [PRIMARY]
- **Text:** "I saved $400 last year with Nova. It's the easiest way to send money abroad!"
- **Template Config:** 
  - displayName: "Jane Doe"
  - handle: "@janedoe"
  - tweetText: "I saved $400 last year with Nova. It's the easiest way to send money abroad!"
  - timestamp: "2h ago"
  - source: "Twitter for iPhone"
  - verified: true

---

### Segment 4: Highlight Statistic (23s - 27s)
- **Type:** key_stat
- **Template:** NumberCounterScene [PRIMARY]
- **Text:** "3 million users"
- **Template Config:** 
  - target: 3000000
  - label: "Users Worldwide"
  - prefix: ""
  - suffix: ""
  - decimals: 0
  - fontSize: 300px
  - particleCount: 50
  - glowColor: "#3873FF"

---

### Segment 5: Feature List (27s - 37s)
- **Type:** feature_scroll
- **Template:** BlurTextScroller [PRIMARY]
- **Text:** ["140 countries", "Real exchange rates", "Zero hidden fees", "Money in minutes", "Save $400 per year"]
- **Template Config:** 
  - words: ["140 countries", "Real exchange rates", "Zero hidden fees", "Money in minutes", "Save $400 per year"]

---

### Segment 6: Call to Action (37s - 42s)
- **Type:** cta
- **Template:** StackHiring [PRIMARY]
- **Text:** "Download Nova today."
- **Template Config:** 
  - brandName: "Nova"
  - titleText: "Download Nova Today"
  - roles: ["Fast Transfers", "Zero Fees", "Real Exchange Rates"]
  - ctaLine1: "Join for Free"
  - ctaLine2: "Start Saving Today"
  - ctaButton: "Download Now"
  - bgColor: "#0A0A0A"

---

### Segment 7: Breather Scene (42s - 45s)
- **Type:** transition
- **Template:** GradientWash [PRIMARY]
- **Text:** "Save money effortlessly."
- **Template Config:** 
  - colors: ["#3873FF", "#FFD700", "#1E90FF"]
  - style: aurora
  - speed: medium
  - text: "Save money effortlessly."
  - textSize: 96px

---

### Segment 8: Brand Moment (45s - 50s)
- **Type:** brand_reveal
- **Template:** LogoStinger [PRIMARY]
- **Text:** "Nova"
- **Template Config:** 
  - logo: "logo.webp"
  - tagline: "Saving You More"
  - style: particles
  - logoSize: 400px

---

### Segment 9: Closing CTA (50s - 60s)
- **Type:** cta
- **Template:** TextRevealWipe [PRIMARY]
- **Text:** "Download Nova today."
- **Template Config:** 
  - headline: "Download Nova Today"
  - subtitle: "Available on iOS & Android"
  - wipeDirection: center
  - wipeColor: "#3873FF"
  - headlineSize: 96px
  - subtitleSize: 48px

---

## Visual Themes
- **Visual Approach:** Clean and professional with a focus on cinematic animations and smooth transitions. Subtle particles and modern UI elements to highlight tech-product aesthetics.
- **Color Direction:** Dark background (#0A0A0A) with bold accents in gold (#FFD700) and blue (#3873FF) for emphasis.

---

## Template Suggestions

| Segment | Template             | Type           | Reasoning                                  |
|---------|----------------------|----------------|--------------------------------------------|
| 1       | KineticCaptions      | PRIMARY        | Bold word-by-word hook                     |
| 2       | GenAiFeatures        | PRIMARY        | Multi-scene product showcase               |
| 3       | Tweet                | PRIMARY        | Social proof testimonial                   |
| 4       | NumberCounterScene   | PRIMARY        | Highlight key user statistic               |
| 5       | BlurTextScroller     | PRIMARY        | Feature word list                          |
| 6       | StackHiring          | PRIMARY        | CTA with scrolling features list           |
| 7       | GradientWash         | PRIMARY        | Breather transition scene                  |
| 8       | LogoStinger          | PRIMARY        | Brand logo reveal                          |
| 9       | TextRevealWipe       | PRIMARY        | Closing CTA                                |

---

## Media Notes
- Segment 2: Use "app-cards.png" and "app-dashboard.png" for GenAiFeatures scenes.
- Segment 8: Use "logo.webp" for LogoStinger.

---

## Pacing
- **Segment Durations:** 
  - Segment 1: 5s
  - Segment 2: 13s
  - Segment 3: 5s
  - Segment 4: 4s
  - Segment 5: 10s
  - Segment 6: 5s
  - Segment 7: 3s
  - Segment 8: 5s
  - Segment 9: 10s
- **Total Duration:** 60 seconds

---

## Text Overlays
- Segment 1: "Stop overpaying on international transfers."
- Segment 2: "Nova sends money to 140 countries. Real exchange rates. Zero hidden fees."
- Segment 3: "I saved $400 last year with Nova. It's the easiest way to send money abroad!"
- Segment 4: "3 million users"
- Segment 5: "140 countries, Real exchange rates, Zero hidden fees, Money in minutes, Save $400 per year"
- Segment 6: "Download Nova today."
- Segment 7: "Save money effortlessly."
- Segment 8: "Nova - Saving You More"
- Segment 9: "Download Nova today. Available on iOS & Android."

---

## Color Palette (JSON block)
```json
{
  "color_palette": {
    "primary": "#FFD700",
    "secondary": "#3873FF",
    "background": "#0A0A0A",
    "text": "#FFFFFF",
    "accent": "#1E90FF"
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