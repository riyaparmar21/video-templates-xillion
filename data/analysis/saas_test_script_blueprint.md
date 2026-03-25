## Video Overview
- **Genre/Style:** tech-product explainer
- **Target Audience:** Teams and professionals looking for efficient project management solutions
- **Tone:** Professional, clean, authoritative
- **Target Duration:** 25 seconds
- **Word Count:** 46 words

## Key Sections

### Segment 1: Introduction (0s - 5s)
- **Type:** hook
- **Template:** KineticCaptions [PRIMARY]
- **Text:** "Meet Flowboard — the project management tool your team actually wants to use."
- **Template Config:** 
  - Word groups: 
    - Group 1: ["Meet", "Flowboard"] → style: big-blue
    - Group 2: ["the", "project", "management", "tool"] → style: normal
    - Group 3: ["your", "team", "actually", "wants", "to", "use"] → style: emphasis-gold

### Segment 2: Workflow Transformation (5s - 13s)
- **Type:** rising_action
- **Template:** GenAiFeatures [PRIMARY]
- **Text:** "Drag, drop, done. Flowboard turns chaotic workflows into visual pipelines in seconds."
- **Template Config:** 
  - Scene 1: Typewriter text "Drag, drop, done." + zooming image (kanban.jpeg)
  - Scene 2: Centered image (dashboard.png) + floating UI prompt box with "Flowboard turns chaotic workflows into visual pipelines."
  - Scene 3: Aspect-ratio morphing animation (dashboard.png)
  - Scene 4: Logo reveal (logo.jpeg) + superscript "Flowboard"

### Segment 3: Social Proof (13s - 18s)
- **Type:** validation
- **Template:** Tweet [PRIMARY]
- **Text:** "Over 12,000 teams already made the switch. 94% report faster delivery within the first month."
- **Template Config:** 
  - displayName: "Flowboard Team"
  - handle: "@FlowboardOfficial"
  - tweetText: "Over 12,000 teams already made the switch. 94% report faster delivery within the first month."
  - timestamp: "1h ago"
  - source: "Twitter Web App"
  - verified: true

### Segment 4: Call to Action (18s - 23s)
- **Type:** conclusion
- **Template:** TextRevealWipe [PRIMARY]
- **Text:** "Try Flowboard free for 30 days."
- **Template Config:** 
  - headline: "Try Flowboard free"
  - subtitle: "for 30 days"
  - wipeDirection: "left"
  - wipeColor: "#FFD700"
  - headlineSize: 72
  - subtitleSize: 48

### Segment 5: Branding Outro (23s - 25s)
- **Type:** outro
- **Template:** LogoStinger [PRIMARY]
- **Text:** "Flowboard"
- **Template Config:** 
  - logo: "logo.jpeg"
  - tagline: "Project management reimagined"
  - style: scale
  - logoSize: 300

## Visual Themes
- **Visual Approach:** Clean and professional, leveraging dark backgrounds with sharp, bright overlays for a polished tech aesthetic. Cinematic transitions emphasize Flowboard’s transformative capabilities.
- **Color Direction:** Dark tones (#0A0A0A, #202122) for the background contrast with vibrant accents (#FFD700 gold, #1E90FF blue) to highlight key moments.

## Template Suggestions

| Segment | Template         | Type            | Reasoning                           |
|---------|------------------|-----------------|-------------------------------------|
| 1       | KineticCaptions  | PRIMARY         | Bold word-by-word hook             |
| 2       | GenAiFeatures    | PRIMARY         | Multi-scene product showcase       |
| 3       | Tweet            | PRIMARY         | Social proof for credibility        |
| 4       | TextRevealWipe   | PRIMARY         | Polished CTA with cinematic wipe    |
| 5       | LogoStinger      | PRIMARY         | Strong branding outro               |

## Media Notes
- **Segment 2:** Kanban image (kanban.jpeg) and dashboard screenshot (dashboard.png) used in GenAiFeatures template.
- **Segment 5:** Logo image (logo.jpeg) used in LogoStinger template.

## Pacing
- **Segment Durations:** 
  - Segment 1: 5 seconds
  - Segment 2: 8 seconds
  - Segment 3: 5 seconds
  - Segment 4: 5 seconds
  - Segment 5: 2 seconds
- **Total Duration:** 25 seconds

## Text Overlays
- **Segment 1:** "Meet Flowboard — the project management tool your team actually wants to use."
- **Segment 2:** "Drag, drop, done. Flowboard turns chaotic workflows into visual pipelines in seconds."
- **Segment 3:** "Over 12,000 teams already made the switch. 94% report faster delivery within the first month."
- **Segment 4:** "Try Flowboard free for 30 days."
- **Segment 5:** "Flowboard"

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