## Video Overview
- **Genre/Style:** tech-product, hype-launch
- **Target Audience:** Runners, fitness enthusiasts, and individuals looking for high-performance footwear
- **Tone:** Energetic, authoritative, inspirational
- **Target Duration:** 60 seconds
- **Word Count:** 33 words

## Key Sections

### Segment 1: Hook (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "Your next personal best starts with what's on your feet."
- **Template Config:** Word groups with style tokens:
  - Group 1: "Your" as accent-blue, "next" as big-blue
  - Group 2: "personal" as normal, "best" as emphasis-gold
  - Group 3: "starts" as filler, "with" as normal
  - Group 4: "what's" as normal, "on" as filler, "your feet" as big

### Segment 2: Product Introduction (5s - 18s)
- **Type:** product_intro
- **Template:** GenAiFeatures [PRIMARY]
- **Text:** "Introducing the Volt X9 — 37% lighter, 2x the energy return."
- **Template Config:** 
  - **Scene 1:** Typewriter text: "Introducing the Volt X9" with product image "shoe-hero.png" zooming in.
  - **Scene 2:** Centered product image "shoe-tech.png" with floating UI elements, buttons labeled "Learn More" and "Buy Now."
  - **Scene 3:** Morphing animation showcasing energy return stats with image "product-hero.png."
  - **Scene 4:** Logo reveal using "logo-yellow.jpg" with superscript text "Volt Run."

### Segment 3: Runner Aspirations (18s - 26s)
- **Type:** emotional_connection
- **Template:** ParallaxImageReveal [PRIMARY]
- **Text:** "Built for runners who don't believe in limits."
- **Template Config:** 
  - Image: "runner-action.png"
  - Layer count: 4
  - Reveal style: fade
  - Direction: diagonal
  - Speed: medium
  - Zoom: in
  - Headline: "Built for runners"
  - Subtitle: "Who don't believe in limits"

### Segment 4: Social Proof (26s - 31s)
- **Type:** testimonial
- **Template:** Tweet [PRIMARY]
- **Text:** "Volt X9 changed my running game. Best shoes ever!" - @RunnerPro
- **Template Config:** 
  - **displayName:** "RunnerPro"
  - **handle:** "@RunnerPro"
  - **tweetText:** "Volt X9 changed my running game. Best shoes ever!"
  - **timestamp:** "2h ago"
  - **source:** "Twitter"
  - **verified:** true

### Segment 5: Stats Highlight (31s - 36s)
- **Type:** feature_stat
- **Template:** NumberCounterScene [PRIMARY]
- **Text:** "37%"
- **Template Config:** 
  - Target: 37
  - Suffix: "% lighter"
  - Label: "Lightweight Innovation"
  - Particle Count: 50
  - Glow Color: "#FFD700"

### Segment 6: Product Showcase (36s - 50s)
- **Type:** product_showcase
- **Template:** ThreeDCardFlip [PRIMARY]
- **Text:** "2x the energy return."
- **Template Config:** 
  - Cards: 
    - Card 1: "shoe-hero.png"
    - Card 2: "shoe-tech.png"
    - Card 3: "runner-action.png"
  - Style: carousel
  - BorderRadius: 12
  - Reflection: true
  - Shadow: true
  - Headline: "Energy Return Technology"
  - Particles: true

### Segment 7: Call to Action (50s - 60s)
- **Type:** cta
- **Template:** TextRevealWipe [PRIMARY]
- **Text:** "Available now at volt.run"
- **Template Config:** 
  - Headline: "Available now"
  - Subtitle: "at volt.run"
  - WipeDirection: center
  - WipeColor: "#FFD700"
  - HeadlineSize: 96
  - SubtitleSize: 48

## Visual Themes
- **Visual Approach:** Dynamic and energetic visuals emphasizing the cutting-edge technology and aspirational tone of the Volt X9.
- **Color Direction:** Bold contrast with dark backgrounds (#0A0A0A, #101115) and vibrant accents (#FFD700, #00FF40).

## Template Suggestions

| Segment | Template           | Type            | Reasoning                        |
|---------|--------------------|-----------------|----------------------------------|
| 1       | KineticCaptions    | PRIMARY         | Energetic hook with bold text reveal |
| 2       | GenAiFeatures      | PRIMARY         | Multi-scene product introduction |
| 3       | ParallaxImageReveal| PRIMARY         | Aspirational cinematic image reveal |
| 4       | Tweet              | PRIMARY         | Social proof moment in Twitter style |
| 5       | NumberCounterScene | PRIMARY         | Highlight key stat with impactful animation |
| 6       | ThreeDCardFlip     | PRIMARY         | Showcase product features dynamically |
| 7       | TextRevealWipe     | PRIMARY         | Strong CTA to close the video |

## Media Notes
- **KineticCaptions:** No assets required (text-only).
- **GenAiFeatures:** Uses product images:
  - Scene 1: "shoe-hero.png"
  - Scene 2: "shoe-tech.png"
  - Scene 3: "product-hero.png"
  - Scene 4: "logo-yellow.jpg"
- **ParallaxImageReveal:** "runner-action.png"
- **Tweet:** No assets required (text-only template).
- **NumberCounterScene:** No additional assets required.
- **ThreeDCardFlip:** Uses:
  - Card 1: "shoe-hero.png"
  - Card 2: "shoe-tech.png"
  - Card 3: "runner-action.png"
- **TextRevealWipe:** No assets required.

## Pacing
- **Segment Durations:** 
  - Segment 1: 5s
  - Segment 2: 13s
  - Segment 3: 8s
  - Segment 4: 5s
  - Segment 5: 5s
  - Segment 6: 14s
  - Segment 7: 10s
- **Total Duration:** 60 seconds

## Text Overlays
- **Segment 1:** "Your next personal best starts with what's on your feet."
- **Segment 2:** "Introducing the Volt X9 — 37% lighter, 2x the energy return."
- **Segment 3:** "Built for runners who don't believe in limits."
- **Segment 4:** "Volt X9 changed my running game. Best shoes ever!" - @RunnerPro
- **Segment 5:** "37% lighter"
- **Segment 6:** "2x the energy return."
- **Segment 7:** "Available now at volt.run"

## Color Palette (JSON block)
```json
{
  "color_palette": {
    "primary": "#FFD700",
    "secondary": "#00FF40",
    "background": "#0A0A0A",
    "text": "#FFFFFF",
    "accent": "#00FF85"
  }
}
```

## Typography (JSON block)
```json
{
  "typography": {
    "heading": "Montserrat",
    "body": "Inter",
    "mono": "JetBrains Mono"
  }
}