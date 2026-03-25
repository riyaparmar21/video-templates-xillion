#!/usr/bin/env python3
"""
Script-to-Blueprint Converter

Takes a raw script (text/markdown) and produces a blueprint markdown file
that is structurally identical to what analyze.py produces from video analysis.
The existing three-agent pipeline (Scene Planner → Param Generator → Quality Checker)
consumes this blueprint without modification.

Usage:
    # Basic usage
    python script_to_blueprint.py -s script.txt

    # With options
    python script_to_blueprint.py -s script.txt -d 45 --style tech-product

    # With font override
    python script_to_blueprint.py -s script.txt --fonts "Oswald,Lato,Inconsolata"

    # With asset manifest
    python script_to_blueprint.py -s script.txt --manifest assets_manifest.json
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from openai import AzureOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Resolve directories
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PROMPTS_DIR = SCRIPT_DIR / "prompts"
OUTPUT_DIR = PROJECT_ROOT / "data" / "analysis"


def load_script(script_path: str) -> str:
    """Load script text from file."""
    p = Path(script_path)
    if not p.exists():
        raise FileNotFoundError(f"Script file not found: {script_path}")
    text = p.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"Script file is empty: {script_path}")
    return text


def load_system_prompt() -> str:
    """Load the script analysis system prompt + Video Spec Instruction Guide.

    The instruction guide is the single source of truth for template catalog,
    constraints, and creative direction — replacing the old separate files.
    """
    prompt_path = PROMPTS_DIR / "script_analysis.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"System prompt not found: {prompt_path}")
    prompt = prompt_path.read_text(encoding="utf-8")

    # Append the consolidated instruction guide (replaces template_constraints.md)
    guide_path = PROJECT_ROOT / "Video_Spec_Instruction_Guide.md"
    if guide_path.exists():
        prompt += "\n\n# === VIDEO SPEC INSTRUCTION GUIDE ===\n\n" + guide_path.read_text(encoding="utf-8")
        print(f"   Instruction guide appended: {guide_path.name}")
    else:
        # Fallback to old template_constraints.md if guide doesn't exist
        constraints_path = PROMPTS_DIR / "template_constraints.md"
        if constraints_path.exists():
            prompt += "\n\n" + constraints_path.read_text(encoding="utf-8")
            print(f"   [Warning] Video_Spec_Instruction_Guide.md not found, falling back to template_constraints.md")

    return prompt


def load_font_pairings() -> list:
    """Load the font pairings table."""
    pairings_path = PROMPTS_DIR / "font_pairings.json"
    if not pairings_path.exists():
        raise FileNotFoundError(f"Font pairings not found: {pairings_path}")
    return json.loads(pairings_path.read_text(encoding="utf-8"))


def calculate_word_stats(script_text: str) -> dict:
    """Calculate word count and estimated duration stats."""
    words = script_text.split()
    word_count = len(words)

    # Average narration pace: 150 wpm normal, 120 wpm for emphasis
    narration_pace = 150  # words per minute
    estimated_duration = (word_count / narration_pace) * 60  # in seconds

    return {
        "word_count": word_count,
        "narration_pace_wpm": narration_pace,
        "estimated_narration_seconds": round(estimated_duration, 1),
    }


def filter_font_pairings(pairings: list, style_preset: str = None) -> list:
    """Filter font pairings by style/genre if provided."""
    if not style_preset:
        return pairings

    filtered = [
        p for p in pairings
        if style_preset in p.get("genres", [])
    ]

    # Fall back to full list if no matches
    if not filtered:
        print(f"   [Fonts] No pairings match genre '{style_preset}', using full list")
        return pairings

    print(f"   [Fonts] Filtered to {len(filtered)} pairings matching genre '{style_preset}'")
    return filtered


def build_user_prompt(
    script_text: str,
    word_stats: dict,
    target_duration: float,
    style_preset: str = None,
    font_override: str = None,
    font_pairings: list = None,
    asset_manifest: dict = None,
) -> str:
    """Build the user prompt for the LLM."""
    sections = []

    # Script text
    sections.append("## Script Text\n")
    sections.append(script_text)
    sections.append("")

    # Word stats
    sections.append("## Script Statistics")
    sections.append(f"- Word count: {word_stats['word_count']}")
    sections.append(f"- Estimated narration time: {word_stats['estimated_narration_seconds']}s at {word_stats['narration_pace_wpm']} wpm")
    sections.append(f"- Target video duration: {target_duration}s")
    sections.append("")

    # Style preset
    if style_preset:
        sections.append(f"## Style Preset: {style_preset}")
        sections.append(f"Use this genre to guide your template choices, color palette, and overall tone.")
        sections.append("")

    # Font selection
    if font_override:
        parts = [f.strip() for f in font_override.split(",")]
        if len(parts) == 3:
            sections.append("## Font Override (use these exact fonts)")
            sections.append(f"- Display/Heading: {parts[0]}")
            sections.append(f"- Body: {parts[1]}")
            sections.append(f"- Accent/Mono: {parts[2]}")
            sections.append("")
            sections.append("Map these to the typography JSON as: heading → display, body → body, mono → accent.")
            sections.append("")
        else:
            sections.append(f"## Font Override: {font_override}")
            sections.append("(Could not parse as trio — use your best judgment)")
            sections.append("")
    elif font_pairings:
        sections.append("## Available Font Pairings")
        sections.append("Select the best trio from this table based on the script's tone and content:\n")
        sections.append("```json")
        sections.append(json.dumps(font_pairings, indent=2))
        sections.append("```")
        sections.append("")
        sections.append("Pick one pairing and map: display → heading, body → body, accent → mono in the Typography JSON block.")
        sections.append("")

    # Asset manifest
    if asset_manifest:
        sections.append("## Available Assets")
        sections.append("The following assets are available for use in video scenes:\n")
        sections.append("```json")
        sections.append(json.dumps(asset_manifest, indent=2))
        sections.append("```")
        sections.append("")
        sections.append("Map these assets to appropriate segments in the Media Notes section.")
        sections.append("")
    else:
        sections.append("## Assets")
        sections.append("No external assets provided. The Media Notes section should state: 'No external assets provided. Use template-native visuals only.'")
        sections.append("")

    # Final instruction
    sections.append("## Instructions")
    sections.append(f"Analyze the script above and produce a complete blueprint markdown document with all 9 required sections.")
    sections.append(f"Target duration: {target_duration} seconds. Ensure segment durations sum to exactly {target_duration}s.")
    sections.append("Follow all quality checklist items from the system prompt.")

    return "\n".join(sections)


def generate_blueprint(
    script_path: str,
    target_duration: float = 60.0,
    style_preset: str = None,
    font_override: str = None,
    asset_manifest_path: str = None,
    output_name: str = None,
) -> str:
    """
    Main function: convert a script to a blueprint markdown file.

    Returns the path to the generated blueprint file.
    """
    if not OPENAI_AVAILABLE:
        raise ImportError("openai package required. pip install openai")

    # Azure OpenAI config
    azure_endpoint = os.getenv("AZURE_GPT_IMAGE_ENDPOINT")
    azure_key = os.getenv("AZURE_OPENAI_KEY")
    deployment = os.getenv("AZURE_BLUEPRINT_DEPLOYMENT",
                           os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o"))
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

    if not azure_endpoint or not azure_key:
        raise ValueError(
            "Azure OpenAI credentials required. Set AZURE_GPT_IMAGE_ENDPOINT and AZURE_OPENAI_KEY."
        )

    print(f"\n{'='*60}")
    print(f"  Script-to-Blueprint Converter")
    print(f"{'='*60}")

    # 1. Load the script
    print(f"\n[1/7] Loading script: {script_path}")
    script_text = load_script(script_path)

    # 2. Calculate word stats
    print(f"[2/7] Analyzing script...")
    word_stats = calculate_word_stats(script_text)
    print(f"   Words: {word_stats['word_count']}")
    print(f"   Estimated narration: {word_stats['estimated_narration_seconds']}s")
    print(f"   Target duration: {target_duration}s")

    # 3. Load font pairings
    print(f"[3/7] Loading font pairings...")
    font_pairings = load_font_pairings()
    if style_preset and not font_override:
        font_pairings = filter_font_pairings(font_pairings, style_preset)
    print(f"   {len(font_pairings)} pairings available")

    # 4. Load asset manifest if provided
    asset_manifest = None
    if asset_manifest_path:
        print(f"[4/7] Loading asset manifest: {asset_manifest_path}")
        manifest_path = Path(asset_manifest_path)
        if manifest_path.exists():
            asset_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            print(f"   {asset_manifest.get('asset_count', '?')} assets loaded")
        else:
            print(f"   [Warning] Manifest not found: {asset_manifest_path}")
    else:
        print(f"[4/7] No asset manifest provided")

    # 5. Load system prompt
    print(f"[5/7] Loading system prompt...")
    system_prompt = load_system_prompt()
    print(f"   Prompt length: {len(system_prompt)} chars")

    # 6. Build user prompt
    print(f"[6/7] Building LLM prompt...")
    user_prompt = build_user_prompt(
        script_text=script_text,
        word_stats=word_stats,
        target_duration=target_duration,
        style_preset=style_preset,
        font_override=font_override,
        font_pairings=font_pairings if not font_override else None,
        asset_manifest=asset_manifest,
    )
    print(f"   User prompt length: {len(user_prompt)} chars")

    # 7. Call LLM
    print(f"[7/7] Calling {deployment} for blueprint generation...")
    client = AzureOpenAI(
        api_version=api_version,
        azure_endpoint=azure_endpoint,
        api_key=azure_key,
    )

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=8000,
        temperature=0.7,
    )

    blueprint_text = response.choices[0].message.content.strip()

    # Strip outer markdown code fences if the LLM wrapped its output
    if blueprint_text.startswith("```markdown"):
        blueprint_text = blueprint_text[len("```markdown"):].strip()
    elif blueprint_text.startswith("```md"):
        blueprint_text = blueprint_text[len("```md"):].strip()
    if blueprint_text.endswith("```"):
        blueprint_text = blueprint_text[:-3].strip()

    print(f"   Blueprint generated: {len(blueprint_text)} chars")

    # Token usage
    usage = response.usage
    if usage:
        print(f"   Tokens — prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens}, total: {usage.total_tokens}")

    # Save blueprint
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if output_name:
        safe_name = output_name
    else:
        # Derive from script filename
        safe_name = Path(script_path).stem

    blueprint_filename = f"{safe_name}_script_blueprint.md"
    blueprint_path = OUTPUT_DIR / blueprint_filename
    blueprint_path.write_text(blueprint_text, encoding="utf-8")
    print(f"\n   Blueprint saved: {blueprint_path}")

    # Quick validation
    _validate_blueprint(blueprint_text)

    return str(blueprint_path)


def _validate_blueprint(text: str) -> None:
    """Quick validation that the blueprint has the required sections and JSON blocks."""
    required_sections = [
        "Video Overview",
        "Key Sections",
        "Visual Themes",
        "Template Suggestions",
        "Media Notes",
        "Pacing",
        "Text Overlays",
        "Color Palette",
        "Typography",
    ]

    missing = []
    for section in required_sections:
        if section.lower() not in text.lower():
            missing.append(section)

    if missing:
        print(f"   [Warning] Missing sections: {', '.join(missing)}")
    else:
        print(f"   [Validate] All 9 required sections present ✓")

    # Check for JSON blocks
    import re
    json_blocks = re.findall(r'```json\s*(.*?)```', text, re.DOTALL)
    if len(json_blocks) >= 2:
        print(f"   [Validate] {len(json_blocks)} JSON blocks found ✓")
    else:
        print(f"   [Warning] Expected at least 2 JSON blocks (color_palette + typography), found {len(json_blocks)}")

    # Check for color_palette in JSON
    has_colors = False
    for block in json_blocks:
        try:
            data = json.loads(block)
            if "color_palette" in data or "colors" in data:
                has_colors = True
                break
        except json.JSONDecodeError:
            continue

    if has_colors:
        print(f"   [Validate] Color palette JSON parseable ✓")
    else:
        print(f"   [Warning] No parseable color_palette found in JSON blocks")


def main():
    parser = argparse.ArgumentParser(
        description="Convert a script to a pipeline-compatible blueprint"
    )
    parser.add_argument(
        "-s", "--script", required=True,
        help="Path to the script file (.txt or .md)"
    )
    parser.add_argument(
        "-d", "--duration", type=float, default=60,
        help="Target video duration in seconds (default: 60)"
    )
    parser.add_argument(
        "--style",
        help="Genre preset: tech-product, testimonial, explainer, hype-launch, educational, luxury, corporate"
    )
    parser.add_argument(
        "--fonts",
        help='Font override as comma-separated trio: "Display,Body,Accent"'
    )
    parser.add_argument(
        "--manifest",
        help="Path to asset manifest JSON file"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output name (default: derived from script filename)"
    )

    args = parser.parse_args()

    # Load .env if dotenv is available
    try:
        from dotenv import load_dotenv
        load_dotenv(PROJECT_ROOT / ".env")
    except ImportError:
        pass

    blueprint_path = generate_blueprint(
        script_path=args.script,
        target_duration=args.duration,
        style_preset=args.style,
        font_override=args.fonts,
        asset_manifest_path=args.manifest,
        output_name=args.output,
    )

    print(f"\n{'='*60}")
    print(f"  Blueprint ready: {blueprint_path}")
    print(f"  Next step: python generate.py -b {blueprint_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
