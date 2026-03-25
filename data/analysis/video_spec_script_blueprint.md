## Video Overview
- **Genre/Style:** fintech-product, explainer, promotional
- **Target Audience:** Individuals seeking affordable international money transfer solutions, globally conscious users, value-driven consumers
- **Tone:** Trustworthy, professional, and empowering
- **Target Duration:** 60 seconds
- **Word Count:** 38 words

## Key Sections

### Segment 1: Stop Overpaying (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "Stop overpaying on international transfers."
- **Template Config:** Word groups with style tokens — "Stop" as big-blue, "overpaying" as emphasis-gold, "on international transfers" as normal.

### Segment 2: Nova's Reach (5s - 18s)
- **Type:** value proposition
- **Template:** GenAiFeatures [PRIMARY]
- **Text:** "Nova sends money to 140 countries at real exchange rates. Zero hidden fees."
- **Template Config:** 
  - **Scene 1:** Typewriter text: "Nova sends money to 140 countries." Image: `app-cards.png`.
  - **Scene 2:** Floating UI elements: Prompt box text: "Real exchange rates" with buttons: "Send Money" and "Learn More". Image: `app-dashboard.png`.
  - **Scene 3:** Aspect ratio morph with tagline: "Zero hidden fees."
  - **Scene 4:** Logo reveal: `logo.webp` with superscript: "Nova."

### Segment 3: Instant Transfers (18s - 23s)
- **Type:** key feature
- **Template:** VaultCardFeatures [PRIMARY]
- **Text:** "Your money arrives in minutes, not days."
- **Template Config:** 
  - Feature words scroll: ["minutes", "not days", "instant transfers", "speed", "secure"], cards: `app-cards.png`, subtitle: "Fast & Reliable Transfers", poweredByBrand: "Nova."

### Segment 4: User Savings (23s - 28s)
- **Type:** testimonial/stat
- **Template:** NumberCounterScene [PRIMARY]
- **Text:** "Join 3 million users who already save $400 per year."
- **Template Config:** 
  - Target: 3,000,000, suffix: "users", label: "Already saving $400 per year", particleCount: 30, glowColor: "#FFD700".

### Segment 5: Call to Action (28s - 33s)
- **Type:** action prompt
- **Template:** TextRevealWipe [PRIMARY]
- **Text:** "Download Nova today."
- **Template Config:** Headline: "Download Nova today", wipeDirection: center, wipeColor: "#FFD700".

### Segment 6: Breathing Space (33s - 36s)
- **Type:** transition
- **Template:** GradientWash [PRIMARY]
- **Text:** None (visual breather)
- **Template Config:** Colors: ["#3873FF", "#FFD700", "#1E90FF"], style: aurora, speed: medium.

### Segment 7: Why Choose Nova? (36s - 49s)
- **Type:** feature list
- **Template:** BlurTextScroller [PRIMARY]
- **Text:** "Real exchange rates, Zero hidden fees, Instant transfers, 140 countries, $400 saved per year."
- **Template Config:** Words: ["Real exchange rates", "Zero hidden fees", "Instant transfers", "140 countries", "$400 saved per year"], scrollSpeed: medium.

### Segment 8: Final Appeal (49s - 54s)
- **Type:** brand moment
- **Template:** LogoStinger [PRIMARY]
- **Text:** None (logo and tagline visual)
- **Template Config:** Logo: `logo.webp`, tagline: "Nova: Save More, Send Faster", style: particles.

### Segment 9: Closing CTA (54s - 60s)
- **Type:** call to action
- **Template:** StackHiring [PRIMARY]
- **Text:** "Download Nova today."
- **Template Config:** 
  - BrandName: "Nova", TitleText: "Download Nova today", Roles: ["Available on iOS", "Available on Android"], CTA Line1: "Start saving now!", CTA Line2: "Get the app today", CTA Button: "Download".

## Visual Themes
- **Visual Approach:** Clean, modern, and professional design. Cinematic transitions with bold typography and dynamic animations. Smooth gradient washes add breathing room between dense sections.
- **Color Direction:** Bright accents (gold and blue) on a dark background (#0A0A0A). Trustworthy and premium fintech aesthetic.

## Template Suggestions

| Segment | Template           | Type      | Reasoning                          |
|---------|--------------------|-----------|-------------------------------------|
| 1       | KineticCaptions    | PRIMARY   | Bold hook with dramatic typography |
| 2       | GenAiFeatures      | PRIMARY   | Multi-scene showcase for features  |
| 3       | VaultCardFeatures  | PRIMARY   | Visual energy with rotating cards  |
| 4       | NumberCounterScene | PRIMARY   | Cinematic user stat reveal         |
| 5       | TextRevealWipe     | PRIMARY   | Polished CTA with clean animation  |
| 6       | GradientWash       | PRIMARY   | Breathing room transition          |
| 7       | BlurTextScroller   | PRIMARY   | Feature list with dynamic scrolling|
| 8       | LogoStinger        | PRIMARY   | Brand moment with logo animation   |
| 9       | StackHiring        | PRIMARY   | CTA-heavy ending with scrolling text|

## Media Notes
- **Segment 2:** Uses `app-cards.png` and `app-dashboard.png` for product showcase.
- **Segment 4:** Logo image (`logo.webp`) used for superscript reveal animation.
- **Segment 8:** Logo used for stinger animation.
- **Segment 9:** No additional images required for CTA.

## Pacing
- **Segment Durations:** [5s, 13s, 5s, 5s, 5s, 3s, 13s, 5s, 6s]
- **Total Duration:** 60 seconds

## Text Overlays
- **Segment 1:** "Stop overpaying on international transfers."
- **Segment 2:** "Nova sends money to 140 countries at real exchange rates. Zero hidden fees."
- **Segment 3:** "Your money arrives in minutes, not days."
- **Segment 4:** "Join 3 million users who already save $400 per year."
- **Segment 5:** "Download Nova today."
- **Segment 7:** ["Real exchange rates", "Zero hidden fees", "Instant transfers", "140 countries", "$400 saved per year"]
- **Segment 9:** "Download Nova today."

## Color Palette
```json
{
  "color_palette": {
    "primary": "#FFD700",
    "secondary": "#1E90FF",
    "background": "#0A0A0A",
    "text": "#FFFFFF",
    "accent": "#3873FF"
  }
}
```

## Typography
```json
{
  "typography": {
    "heading": "Plus Jakarta Sans",
    "body": "Inter",
    "mono": "Fira Code"
  }
}
```