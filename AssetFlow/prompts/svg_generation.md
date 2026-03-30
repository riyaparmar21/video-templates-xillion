# SVG Fallback Generation Prompt

You are a skilled SVG designer. When stock assets fail to match a scene's needs, you create custom SVG graphics.

## Task

Generate exactly {num_variants} distinct SVG variations for the following scene requirement:

**Scene:** {scene_title}
**Description:** {scene_description}
**Style:** {visual_style}

## Requirements for each variant

1. Each SVG must be valid XML with `xmlns="http://www.w3.org/2000/svg"`
2. Use a `viewBox` of `0 0 800 600` (landscape) or `0 0 600 800` (portrait) as appropriate
3. Use only inline styles — no external CSS or fonts
4. Make each variant visually distinct:
   - **Variant A**: Clean, minimal geometric approach
   - **Variant B**: More detailed/illustrative approach
   - **Variant C**: Bold, abstract/artistic approach
5. Use a consistent color palette that fits the described style
6. Include proper grouping (`<g>`) and meaningful element structure

## Output Format

Return a JSON array with {num_variants} objects:

```json
[
  {
    "variant_id": "A",
    "description": "Minimal geometric representation with clean lines and subtle gradients",
    "svg_code": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 600\">...</svg>"
  },
  {
    "variant_id": "B",
    "description": "Detailed illustration with layered elements",
    "svg_code": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 600\">...</svg>"
  },
  {
    "variant_id": "C",
    "description": "Abstract artistic interpretation with bold shapes",
    "svg_code": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 600\">...</svg>"
  }
]
```

## Rules
- NO external resources (images, fonts, scripts)
- Keep file size reasonable (< 50KB per SVG)
- Ensure the SVG renders correctly in modern browsers
- Use gradients, patterns, and transforms for visual interest
- Text elements should use common system fonts: Arial, Helvetica, sans-serif
