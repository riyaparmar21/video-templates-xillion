"""
Multi-Agent Video Generation Pipeline

Three specialized AI agents collaborate to produce high-quality video specs:

  Agent 1 — Scene Planner
    Reads blueprint + transcript + media inventory.
    Outputs a scene plan: template choices, durations, content briefs.
    Cached in cache/{video}/scene_plan.json

  Agent 2 — Param Generator
    Takes the scene plan + full template catalog.
    Fills in rich, detailed params for every scene.
    Outputs a complete JSON video spec.

  Agent 3 — Quality Checker
    Reviews the full spec against quality standards.
    Fixes anti-patterns, enriches weak scenes, validates structure.
    Outputs the final polished spec.

Usage:
    from generator.pipeline import JsonVideoGenerator

    gen = JsonVideoGenerator()
    result = await gen.generate(
        blueprint_path="data/analysis/blueprint.md",
        transcript_path="data/stt/transcript.txt",
        video_path="input.mp4",
    )
"""

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from openai import AzureOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("[Warning] openai not installed. pip install openai")

# Local imports
from generator.validate import validate_json_spec, validate_typescript, render_test_frames, normalize_spec
from generator.scene_detect import analyze_video, build_scene_boundaries
from generator.cache import PipelineCache

# ── Asset path resolution ──

import shutil

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".avif"}


# ── Asset Intelligence for LLM Agents ──

def build_asset_intelligence(manifest: Dict[str, Any]) -> str:
    """
    Convert a full asset manifest into a compact, structured prompt section
    that gives LLM agents everything they need to make smart template + placement
    decisions: dimensions, quality tier, category, dominant colors, and background type.

    This replaces the old flat filename list that left agents blind to image quality.
    """
    assets = manifest.get("assets", [])
    if not assets:
        return ""

    lines = []
    lines.append("## Asset Intelligence (use this to choose templates and place images)")
    lines.append("")
    lines.append("Each asset below includes dimensions, quality tier, and visual properties.")
    lines.append("RULES:")
    lines.append("- **FULL-BLEED OK** (≥1080px shortest side): ParallaxImageReveal, GenAiFeatures, SplitScreenMorph")
    lines.append("- **CONTAINED OK** (500-1079px): ThreeDCardFlip cards, VaultAnimatedCards image cards, Showcase items")
    lines.append("- **SMALL/ICON** (<500px): Logo only, or as VaultAnimatedCards small card. NOT for full-bleed.")
    lines.append("- **WHITE-BG WARNING**: Images with white/light dominant backgrounds clash on dark video themes.")
    lines.append("  Do NOT use them in ParallaxImageReveal or ThreeDCardFlip. Use in contained VaultAnimatedCards cards instead.")
    lines.append("- If NO image is FULL-BLEED quality, prefer Tier 1 self-sufficient templates (KineticCaptions, SpiralCaptions, GlassPanel, TypewriterReveal, BlurTextScroller, NumberCounterScene).")
    lines.append("")

    # Summary
    category_summary = manifest.get("category_summary", {})
    if category_summary:
        lines.append(f"**Summary**: {manifest.get('asset_count', len(assets))} assets — " +
                      ", ".join(f"{cat}: {count}" for cat, count in category_summary.items()))
        lines.append("")

    # Per-asset detail table
    lines.append("| # | Filename | Dimensions | Quality Tier | Category | Dominant BG | Notes |")
    lines.append("|---|----------|-----------|-------------|----------|-------------|-------|")

    for i, asset in enumerate(assets, 1):
        filename = asset.get("filename", asset.get("path", "?"))
        dims = asset.get("dimensions")
        if dims and isinstance(dims, dict):
            w, h = dims.get("width", 0), dims.get("height", 0)
            dim_str = f"{w}×{h}"
            min_dim = min(w, h) if w and h else 0
        elif dims and isinstance(dims, str):
            dim_str = dims
            min_dim = 0
        else:
            dim_str = "unknown"
            min_dim = 0

        # Quality tier
        if min_dim >= 1080:
            tier = "FULL-BLEED"
        elif min_dim >= 500:
            tier = "CONTAINED"
        elif min_dim >= 200:
            tier = "SMALL"
        elif min_dim > 0:
            tier = "ICON"
        else:
            tier = "unknown"

        category = asset.get("category", "uncategorized")
        colors = asset.get("dominant_colors", [])

        # Detect white/light background
        notes = []
        if colors:
            top_color = colors[0]
            try:
                r, g, b = int(top_color[1:3], 16), int(top_color[3:5], 16), int(top_color[5:7], 16)
                brightness = (r * 299 + g * 587 + b * 114) / 1000
                if brightness > 200:
                    notes.append("⚠️ WHITE/LIGHT BG")
                elif brightness > 150:
                    notes.append("⚠️ LIGHT BG")
            except (ValueError, IndexError):
                pass

        if asset.get("has_transparency"):
            notes.append("transparent")

        bg_color = colors[0] if colors else "—"
        notes_str = ", ".join(notes) if notes else "—"

        lines.append(f"| {i} | `{filename}` | {dim_str} | {tier} | {category} | {bg_color} | {notes_str} |")

    lines.append("")

    # Count tiers for strategic summary
    full_bleed_count = sum(1 for a in assets
                           if a.get("dimensions") and isinstance(a.get("dimensions"), dict)
                           and min(a["dimensions"].get("width", 0), a["dimensions"].get("height", 0)) >= 1080)
    contained_count = sum(1 for a in assets
                          if a.get("dimensions") and isinstance(a.get("dimensions"), dict)
                          and 500 <= min(a["dimensions"].get("width", 0), a["dimensions"].get("height", 0)) < 1080)

    lines.append(f"**Strategy**: {full_bleed_count} full-bleed images, {contained_count} contained images.")
    if full_bleed_count == 0:
        lines.append("⚠️ **NO full-bleed quality images available.** Build scene lineup primarily from self-sufficient templates (KineticCaptions, SpiralCaptions, GlassPanel, TypewriterReveal, BlurTextScroller, NumberCounterScene, TextRevealWipe). Use contained images in VaultAnimatedCards or ThreeDCardFlip cards only.")
    elif full_bleed_count <= 2:
        lines.append(f"Use the {full_bleed_count} full-bleed image(s) strategically for 1-2 hero scenes (ParallaxImageReveal or GenAiFeatures). Fill remaining scenes with self-sufficient templates.")
    else:
        lines.append("Good image coverage. Use full-bleed images for hero scenes and contained images for card/grid templates.")
    lines.append("")

    return "\n".join(lines)


def copy_assets_to_public(assets_dir: str, output_name: str, project_dir: Path) -> str:
    """
    Copy user-provided assets into public/assets/{output_name}/ so Remotion's
    staticFile() can resolve them. Returns the staticFile prefix path.
    """
    src = Path(assets_dir)
    dest = project_dir / "public" / "assets" / output_name
    dest.mkdir(parents=True, exist_ok=True)

    copied = 0
    for f in src.iterdir():
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            shutil.copy2(str(f), str(dest / f.name))
            copied += 1

    prefix = f"assets/{output_name}"
    print(f"   [Assets] Copied {copied} files to public/{prefix}/")
    return prefix


def resolve_asset_paths_in_spec(spec_json: str, assets_dir: str, prefix: str) -> str:
    """
    Scan spec JSON for any string values that match filenames in the assets folder
    and prefix them with the staticFile-compatible path.
    """
    try:
        spec = json.loads(spec_json)
    except json.JSONDecodeError:
        return spec_json

    # Build a set of known asset filenames
    src = Path(assets_dir)
    known_files = set()
    for f in src.iterdir():
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            known_files.add(f.name)

    if not known_files:
        return spec_json

    # Build a map from stem (no extension) to full filename for @project: resolution
    stem_to_file = {}
    for f_name in known_files:
        stem = Path(f_name).stem  # "app-dashboard.png" → "app-dashboard"
        stem_to_file[stem] = f_name
        # Also map with underscores/hyphens normalized
        stem_to_file[stem.replace("-", "_")] = f_name
        stem_to_file[stem.replace("_", "-")] = f_name

    def _resolve(obj):
        if isinstance(obj, str):
            # If the string is exactly a known filename, prefix it
            if obj in known_files:
                return f"{prefix}/{obj}"
            # Handle @project:role tokens (e.g., "@project:app-dashboard")
            if obj.startswith("@project:"):
                role = obj[len("@project:"):]
                # Try exact match, then normalized
                if role in stem_to_file:
                    return f"{prefix}/{stem_to_file[role]}"
                # Try stripping extra suffixes (e.g., "logo-webp" → "logo")
                for stem, fname in stem_to_file.items():
                    if role.startswith(stem) or stem.startswith(role):
                        return f"{prefix}/{fname}"
                # Unresolved — leave as-is but warn
                print(f"   [Assets] WARNING: Could not resolve {obj}")
            return obj
        elif isinstance(obj, dict):
            return {k: _resolve(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [_resolve(item) for item in obj]
        return obj

    resolved = _resolve(spec)
    result = json.dumps(resolved, indent=2)
    # Count how many were resolved
    count = sum(1 for f in known_files if f"{prefix}/{f}" in result)
    if count:
        print(f"   [Assets] Resolved {count} asset path(s) in spec → public/{prefix}/")
    return result


# ── Template catalog (must match engine/schema.ts TemplateName enum) ──
TEMPLATE_NAMES = [
    # Core 20 (Filler templates)
    "ImpactNumber", "TypewriterReveal", "QuoteHighlight", "TextFocusZoom",
    "ListReveal", "FloatingObjects", "GlassPanel", "IconGrid",
    "StackedBars", "ParallaxLayers", "TitleSlide", "SplitCompare",
    "Timeline", "CallToAction", "QuestionReveal", "TransitionWipe",
    "Atmosphere", "LogoReveal", "CountUp", "GlobeScene",
    # Phase 3 — Extended
    "AnimatedChart", "SvgMorph", "LottieScene", "ParticleField",
    # Phase 4 — Premium
    "ThreeScene", "VideoOverlay", "AudioWaveform",
    # PRIMARY folder-based templates (rich, cinematic, multi-phase)
    "KineticCaptions", "GenAiFeatures",
    "SlideshowSocial", "VaultAnimatedCards", "VaultCardFeatures",
    "Tweet", "Showcase", "DesignPreview", "StackHiring",
    "MobileShowreelFrames", "ShowreelGrid", "BlurTextScroller",
    "RouteText", "IOSNotification", "ProgressBar",
    "WhiteSocialHandle", "AnimatedSearchBar", "AnimatedWebScreens",
    "ParallaxImageReveal", "ThreeDCardFlip",
    "GradientWash", "SplitScreenMorph", "NumberCounterScene",
    "TextRevealWipe", "LogoStinger", "SpiralCaptions", "DepthCaptions",
]

# PRIMARY templates — rich cinematic templates with their own SKILL.md and spec JSON
PRIMARY_TEMPLATES = {
    "KineticCaptions", "GenAiFeatures", "SpiralCaptions", "DepthCaptions",
    "SlideshowSocial", "VaultAnimatedCards", "VaultCardFeatures",
    "Tweet", "Showcase", "DesignPreview", "StackHiring",
    "MobileShowreelFrames", "ShowreelGrid", "BlurTextScroller",
    "RouteText", "IOSNotification", "ProgressBar",
    "WhiteSocialHandle", "AnimatedSearchBar", "AnimatedWebScreens",
    "ParallaxImageReveal", "ThreeDCardFlip",
    "GradientWash", "SplitScreenMorph", "NumberCounterScene",
    "TextRevealWipe", "LogoStinger",
}


# ═══════════════════════════════════════════════════
# Agent Prompts
# ═══════════════════════════════════════════════════

SCENE_PLANNER_SYSTEM = """You are Agent 1: the Scene Planner — a senior motion graphics director.

You receive a blueprint analysis and transcript. You output a JSON scene plan that maps content to templates with a cinematic narrative arc.

Refer to the Video Spec Instruction Guide provided below for the full template catalog, creative direction rules, hard constraints, and asset intelligence guidelines. You must follow ALL rules in that guide.

## Your Output Format
```json
{
  "palette": {
    "primary": "#hex", "secondary": "#hex", "background": "#0A0A0A to #1A1A2E",
    "text": "#FFFFFF or #E0E0E0", "accent": "#hex"
  },
  "typography": {
    "heading": "font-name", "body": "font-name", "mono": "font-name"
  },
  "camera": {
    "kenBurns": true, "kenBurnsScale": 1.06,
    "punchZoom": true, "punchInterval": 4, "punchScale": 1.025
  },
  "scenes": [
    {
      "template": "TemplateName",
      "duration": 5,
      "transition": "crossfade",
      "transitionDuration": 0.5,
      "content_brief": "SPECIFIC: exact text, numbers, data points from transcript. Not vague descriptions.",
      "transcript_segment": "The exact words from the transcript this scene covers",
      "visual_intent": "Mood, energy, animation style, color emphasis"
    }
  ]
}
```

## Key Reminders (details are in the Instruction Guide)
1. ALL scene durations MUST be WHOLE INTEGERS. Durations MUST sum to EXACTLY the target video length.
2. FIXED-DURATION templates must use their exact native duration (see Section 5.1 of the guide).
3. content_brief must include EXACT words from the transcript — NEVER rephrase or embellish.
4. If Asset Intelligence is provided, respect image quality tiers for template selection.
5. Output ONLY valid JSON — no markdown, no explanation, no code fences."""


PARAM_GENERATOR_SYSTEM = """You are Agent 2: the Param Generator — a detail-obsessed motion graphics technician.

You receive a scene plan with template choices and content briefs. Your job is to fill in RICH, DETAILED params for every single scene. You transform vague briefs into production-ready specifications.

Refer to the Video Spec Instruction Guide provided below for the complete template parameter reference (Section 4), hard constraints (Section 5), and all template-specific rules. You must follow ALL rules in that guide.

## Your Output
A complete JSON video spec with full `params` objects replacing content briefs.
Required top-level fields: palette, typography, duration, fps (30), width (1080), height (1920), camera, audio, scenes.
Each scene must have: template, duration, params (3-8 properties), transition, transitionDuration.

## Key Reminders (details are in the Instruction Guide)
1. Every scene params must have 3-8 properties — NEVER 1-2 empty ones.
2. ALL text content must use EXACT WORDS from the script/transcript. NEVER rephrase or embellish.
3. ALL scene durations MUST be WHOLE INTEGERS.
4. For any image/logo/src fields, use ONLY the exact filenames from the Available Image Assets section. NEVER make up filenames.
5. Background MUST be dark (#0A0A0A to #1A1A2E). Text MUST be light.
6. Output ONLY valid JSON — no markdown, no explanation, no code fences."""


QUALITY_CHECKER_SYSTEM = """You are Agent 3: the Quality Checker — a perfectionist creative director doing final QA.

You receive a complete video spec and verify it meets cinematic production standards. Fix ANY issues you find. Your output IS the final deliverable — it must be flawless.

Refer to the Video Spec Instruction Guide provided below for the complete quality checklist (Section 6), hard constraints (Section 5), and all template-specific validation rules. You must check EVERY item in Section 6.

## Your Process
1. Validate structure (palette, typography, duration, fps=30, width=1080, height=1920, camera, audio, scenes)
2. Check duration math: ALL durations must be WHOLE INTEGERS. Effective duration must match target ±1s.
3. Validate every template name exists, no consecutive repeats, starts with hook, ends with LogoStinger.
4. Check param richness: every scene has 3-8 params. No fragments, no placeholders.
5. Run template-specific validation per Section 6 of the guide.
6. Check content fidelity: ALL visible text must match the original script EXACTLY.
7. If Asset Intelligence is provided, verify asset-template compatibility.
8. Check colors (dark bg, light text), transitions (3+ types, varied).

## How to Fix
- Fractional durations → ROUND to nearest integer (min 2s), re-check total
- Weak params → ENRICH with fontSize, fontWeight, colors, style, entrance
- Duration sum off → adjust the longest flexible scene by the difference
- Fragment text → expand to full sentences using exact words from script

## Output
The corrected/improved JSON spec. If spec is already high quality, return unchanged.
Output ONLY valid JSON — no explanation, no markdown, no code fences."""


class JsonVideoGenerator:
    """
    Multi-agent video spec generator.
    Three agents collaborate: Scene Planner → Param Generator → Quality Checker.
    Each agent's output is cached for cost efficiency.
    """

    def __init__(self, project_dir: Optional[str] = None, creative_guide: Optional[str] = None, **kwargs):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai required. pip install openai")

        self.project_dir = Path(project_dir) if project_dir else Path(__file__).parent.parent.parent
        self.prompts_dir = Path(__file__).parent.parent / "prompts"
        self.output_dir = self.project_dir / "data" / "specs"
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Azure OpenAI config — per-agent model support
        # Primary endpoint (gpt-4o) for creative agents
        self.azure_endpoint = os.getenv("AZURE_GPT_IMAGE_ENDPOINT")
        self.azure_key = os.getenv("AZURE_OPENAI_KEY")

        # Per-agent deployments:
        #   Agent 1 (Scene Planner)  — needs creative reasoning → gpt-4o
        #   Agent 2 (Param Generator) — needs structured output + creativity → gpt-4o
        #   Agent 3 (Quality Checker) — needs judgment → gpt-4o
        # Override with AZURE_AGENT{1,2,3}_DEPLOYMENT env vars if needed
        default_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")
        self.deployment_planner = os.getenv("AZURE_AGENT1_DEPLOYMENT", default_deployment)
        self.deployment_params  = os.getenv("AZURE_AGENT2_DEPLOYMENT", default_deployment)
        self.deployment_quality = os.getenv("AZURE_AGENT3_DEPLOYMENT", default_deployment)

        # API version — gpt-4o uses the stable version
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

        if not self.azure_endpoint or not self.azure_key:
            raise ValueError("AZURE_GPT_IMAGE_ENDPOINT and AZURE_OPENAI_KEY required")

        self.client = AzureOpenAI(
            api_version=self.api_version,
            azure_endpoint=self.azure_endpoint,
            api_key=self.azure_key,
        )

        # Load the single consolidated instruction guide
        self.instruction_guide = self._load_instruction_guide()
        self.cache = PipelineCache(project_dir=str(self.project_dir))

        print(f"[JsonVideoGenerator] Initialized (multi-agent)")
        print(f"   Agent 1 (Planner):  {self.deployment_planner}")
        print(f"   Agent 2 (Params):   {self.deployment_params}")
        print(f"   Agent 3 (Quality):  {self.deployment_quality}")
        print(f"   API version: {self.api_version}")
        print(f"   Output: {self.output_dir}")
        print(f"   Cache: {self.cache}")

    # ── Prompt Loading ──

    def _load_instruction_guide(self) -> str:
        """Load the Video Spec Instruction Guide — the single source of truth
        for all three agents. Contains template catalog, creative direction,
        parameter reference, hard constraints, and quality checklist.

        This replaces the previous approach of loading 5+ separate files
        (creative_guide.md, json_generator.md, motion_graphics_video_generator.md,
        template_constraints.md, LLM_Pipeline_Quality_Guide).
        """
        guide_path = self.project_dir / "Video_Spec_Instruction_Guide.md"
        if guide_path.exists():
            content = guide_path.read_text(encoding="utf-8")
            print(f"   Instruction guide: {len(content)} chars from {guide_path.name}")
            return content

        # Fallback: check in pipeline/prompts/ directory
        alt_path = self.prompts_dir / "Video_Spec_Instruction_Guide.md"
        if alt_path.exists():
            content = alt_path.read_text(encoding="utf-8")
            print(f"   Instruction guide: {len(content)} chars from {alt_path.name}")
            return content

        print(f"   [ERROR] Video_Spec_Instruction_Guide.md not found at {guide_path}")
        print(f"   The pipeline requires this file to function. Please ensure it exists.")
        return ""

    # ── Blueprint & Transcript Loading ──

    def load_blueprint(self, path: str) -> str:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Blueprint not found: {path}")
        content = p.read_text()
        marker = "<!-- BEGIN_ANALYSIS_DATA -->"
        if marker in content:
            content = content.split(marker, 1)[1]
        return content

    def load_transcript(self, path: str) -> Optional[str]:
        p = Path(path)
        if not p.exists():
            print(f"   [Warning] Transcript not found: {path}")
            return None
        return p.read_text()

    # ── Blueprint Parsing ──

    def parse_blueprint(self, content: str) -> Dict[str, Any]:
        """Extract structured data from blueprint markdown."""
        json_blocks = re.findall(r'```json\s*(.*?)```', content, re.DOTALL)

        colors: Dict[str, str] = {}
        animations: set = set()
        duration = 0.0

        def extract_colors(obj: Any) -> None:
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, str) and v.startswith("#") and len(v) <= 9:
                        colors[k] = v
                    elif isinstance(v, (dict, list)):
                        extract_colors(v)
            elif isinstance(obj, list):
                for item in obj:
                    if isinstance(item, (dict, list)):
                        extract_colors(item)

        for block in json_blocks:
            try:
                data = json.loads(block)
            except json.JSONDecodeError:
                continue
            for key in ("color_palette", "colors", "text_styling_summary"):
                if key in data:
                    extract_colors(data[key])
            frame_data = data.get("frame_analysis", data.get("frames", []))
            if isinstance(frame_data, dict):
                frame_data = list(frame_data.values())
            if isinstance(frame_data, list):
                for fd in frame_data:
                    if not isinstance(fd, dict):
                        continue
                    if "colors" in fd:
                        extract_colors(fd["colors"])
                    ts = fd.get("timestamp", "0s")
                    try:
                        duration = max(duration, float(str(ts).replace("s", "")))
                    except (ValueError, TypeError):
                        pass
            for anim_key in ("animation_techniques", "motion_animation_analysis"):
                techs = data.get(anim_key, data.get("segment_analysis", {}).get(anim_key, []))
                if isinstance(techs, list):
                    animations.update(t for t in techs if isinstance(t, str))
                elif isinstance(techs, dict):
                    for v in techs.values():
                        if isinstance(v, list):
                            animations.update(t for t in v if isinstance(t, str))

        if duration == 0:
            duration = 60.0

        print(f"   [Parse] {len(colors)} colors, {len(animations)} animations, {duration:.1f}s")
        return {
            "colors": colors,
            "animations": list(animations),
            "duration": duration,
            "raw": content[:20000],
        }

    # ═══════════════════════════════════════════════════
    # Agent 1: Scene Planner
    # ═══════════════════════════════════════════════════

    async def plan_scenes(
        self,
        parsed: Dict[str, Any],
        transcript: Optional[str],
        scene_boundaries: Optional[List[Dict]],
        target_duration: float,
        template_filter: Optional[List[str]],
        media_prompt: Optional[str],
        asset_intelligence: Optional[str] = None,
    ) -> Dict:
        """Agent 1: Plan the scene structure and narrative arc."""
        print(f"\n   [Agent 1] Scene Planner...")

        # Build the planner's system prompt: role definition + full instruction guide
        system = SCENE_PLANNER_SYSTEM
        if self.instruction_guide:
            system += "\n\n# === VIDEO SPEC INSTRUCTION GUIDE ===\n\n" + self.instruction_guide

        # Build user prompt
        colors_json = json.dumps(parsed["colors"], indent=2) if parsed["colors"] else '{}'

        scene_info = ""
        if scene_boundaries:
            scene_info = "\n## Detected Scene Boundaries\n"
            for s in scene_boundaries:
                scene_info += f"- Scene {s['scene_id']}: {s['start']:.1f}s → {s['end']:.1f}s ({s['duration']:.1f}s)\n"

        transcript_section = ""
        if transcript:
            t = transcript[:4000] if len(transcript) > 4000 else transcript
            transcript_section = f"\n## Transcript\n{t}\n"

        template_constraint = ""
        if template_filter:
            template_constraint = f"\nYou MUST ONLY use these templates: {', '.join(template_filter)}\n"

        media_section = ""
        if media_prompt:
            media_section = f"\n{media_prompt}\n"

        asset_section = ""
        if asset_intelligence:
            asset_section = f"\n{asset_intelligence}\n"
            print(f"   [Agent 1] Injecting asset intelligence ({len(asset_intelligence)} chars)")

        user_prompt = f"""Plan a {target_duration:.0f}-second vertical (1080×1920) motion graphics video.

## Color Palette from Blueprint
```json
{colors_json}
```

## Animation Patterns Detected
{chr(10).join(f'- {a}' for a in parsed['animations'][:15])}
{scene_info}
{transcript_section}
{template_constraint}
{media_section}
{asset_section}
## Blueprint Content
{parsed['raw'][:12000]}

## Requirements
- Durations MUST sum to exactly {target_duration:.0f} seconds
- Plan 8-15 scenes (depending on duration)
- content_brief must include SPECIFIC data, quotes, and numbers from the transcript
- Output ONLY valid JSON"""

        response = self.client.chat.completions.create(
            model=self.deployment_planner,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=16000,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)

        usage = response.usage
        if usage:
            print(f"   [Agent 1 / {self.deployment_planner}] Tokens: {usage.prompt_tokens} in, {usage.completion_tokens} out")

        try:
            plan = json.loads(raw)
            scene_count = len(plan.get("scenes", []))
            print(f"   [Agent 1] Planned {scene_count} scenes")
            return plan
        except json.JSONDecodeError as e:
            print(f"   [Agent 1] Invalid JSON: {e}")
            raise RuntimeError(f"Scene Planner returned invalid JSON: {e}")

    # ═══════════════════════════════════════════════════
    # Agent 2: Param Generator
    # ═══════════════════════════════════════════════════

    async def generate_params(self, scene_plan: Dict, target_duration: float,
                              assets_dir: Optional[str] = None,
                              asset_intelligence: Optional[str] = None) -> str:
        """Agent 2: Fill in rich params for every scene."""
        print(f"\n   [Agent 2] Param Generator...")

        # Build the param generator's system prompt: role definition + full instruction guide
        system = PARAM_GENERATOR_SYSTEM
        if self.instruction_guide:
            system += "\n\n# === VIDEO SPEC INSTRUCTION GUIDE ===\n\n" + self.instruction_guide

        # Build asset section — prefer rich intelligence, fall back to flat filenames
        asset_section = ""
        if asset_intelligence:
            # Also add the EXACT filename list so Agent 2 can't hallucinate paths
            asset_files = []
            if assets_dir:
                asset_files = sorted([
                    f.name for f in Path(assets_dir).iterdir()
                    if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
                ])
            asset_section = f"""
{asset_intelligence}
## EXACT Asset Filenames (use ONLY these — do NOT invent filenames)
{chr(10).join(f'- {f}' for f in asset_files) if asset_files else '(no image files found)'}
"""
            print(f"   [Agent 2] Injecting asset intelligence + {len(asset_files)} filenames")
        elif assets_dir:
            asset_files = sorted([
                f.name for f in Path(assets_dir).iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
            ])
            if asset_files:
                asset_section = f"""
## Available Image Assets
Use ONLY these EXACT filenames for any image/logo/src params. Do NOT invent filenames.
{chr(10).join(f'- {f}' for f in asset_files)}
"""
                print(f"   [Agent 2] Injecting {len(asset_files)} asset filenames into prompt (no manifest available)")

        user_prompt = f"""Take this scene plan and generate a COMPLETE video spec with rich, detailed params for every scene.

## Scene Plan
```json
{json.dumps(scene_plan, indent=2)}
```
{asset_section}
## Requirements
- Keep the same palette, typography, camera, and scene order from the plan
- Replace each scene's content_brief/transcript_segment/visual_intent with RICH params
- Duration must be {target_duration:.0f} seconds total, fps 30, width 1080, height 1920
- Every scene params must have at least 3-5 properties
- Include audio: {{"src": "", "reactive": false}}
- For any image/logo/src fields, use ONLY the exact filenames from the Available Image Assets section above. NEVER make up filenames.
- Output ONLY the complete JSON spec — no markdown, no explanation"""

        response = self.client.chat.completions.create(
            model=self.deployment_params,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=16384,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)

        usage = response.usage
        if usage:
            print(f"   [Agent 2 / {self.deployment_params}] Tokens: {usage.prompt_tokens} in, {usage.completion_tokens} out")

        # Validate it's valid JSON
        try:
            spec = json.loads(raw)
            scene_count = len(spec.get("scenes", []))
            print(f"   [Agent 2] Generated {scene_count} scenes with full params")
        except json.JSONDecodeError as e:
            print(f"   [Agent 2] Invalid JSON: {e}")
            raise RuntimeError(f"Param Generator returned invalid JSON: {e}")

        return raw

    # ═══════════════════════════════════════════════════
    # Duration Enforcement (post-processing)
    # ═══════════════════════════════════════════════════

    def _enforce_integer_durations(self, spec_json: str, target_duration: float) -> str:
        """Round all scene durations to integers and correct total to match target."""
        try:
            spec = json.loads(spec_json)
        except json.JSONDecodeError:
            return spec_json  # Can't fix what we can't parse

        scenes = spec.get("scenes", [])
        if not scenes:
            return spec_json

        target = int(round(target_duration))

        # Round each duration to nearest integer (min 2s)
        for scene in scenes:
            d = scene.get("duration", 5)
            scene["duration"] = max(2, round(d))

        # Fix total: adjust longest scene to absorb the difference
        total = sum(s["duration"] for s in scenes)
        diff = total - target

        if diff != 0:
            # Find the longest scene to adjust
            longest_idx = max(range(len(scenes)), key=lambda i: scenes[i]["duration"])
            adjusted = scenes[longest_idx]["duration"] - diff
            if adjusted >= 2:
                scenes[longest_idx]["duration"] = adjusted
                print(f"   [Duration Fix] Adjusted scene {longest_idx} by {-diff}s to hit target {target}s")
            else:
                # Spread the difference across multiple scenes
                print(f"   [Duration Fix] Spreading {-diff}s adjustment across scenes")
                remaining = diff
                sorted_indices = sorted(range(len(scenes)), key=lambda i: scenes[i]["duration"], reverse=True)
                for idx in sorted_indices:
                    if remaining == 0:
                        break
                    step = 1 if remaining > 0 else -1
                    if scenes[idx]["duration"] - step >= 2:
                        scenes[idx]["duration"] -= step
                        remaining -= step

        spec["duration"] = target
        new_total = sum(s["duration"] for s in scenes)
        print(f"   [Duration Fix] Final: {len(scenes)} scenes, {new_total}s total (target: {target}s)")

        return json.dumps(spec, indent=2)

    # ═══════════════════════════════════════════════════
    # Agent 3: Quality Checker
    # ═══════════════════════════════════════════════════

    async def check_quality(self, spec_json: str, target_duration: float,
                            asset_intelligence: Optional[str] = None) -> str:
        """Agent 3: Review and polish the spec."""
        print(f"\n   [Agent 3] Quality Checker...")

        # Build quality checker system prompt: role definition + full instruction guide
        quality_system = QUALITY_CHECKER_SYSTEM
        if self.instruction_guide:
            quality_system += "\n\n# === VIDEO SPEC INSTRUCTION GUIDE ===\n\n" + self.instruction_guide

        asset_check_section = ""
        if asset_intelligence:
            asset_check_section = f"""

## Asset-Template Compatibility Check (MANDATORY)
{asset_intelligence}

Cross-reference EVERY scene that uses an image against the asset table above:
- If a scene uses ParallaxImageReveal, GenAiFeatures, or SplitScreenMorph, the image MUST be FULL-BLEED tier (≥1080px).
- If a scene uses ThreeDCardFlip, the images must NOT have white/light backgrounds on dark themes.
- If an image is SMALL tier (<500px), it can ONLY appear in VaultAnimatedCards cards or as a logo.
- If no FULL-BLEED images exist, REPLACE image-dependent templates with self-sufficient ones (GlassPanel, TypewriterReveal, BlurTextScroller).
"""
            print(f"   [Agent 3] Injecting asset intelligence for compatibility validation")

        user_prompt = f"""Review this video spec and fix any quality issues. The target duration is {target_duration:.0f}s.

```json
{spec_json}
```
{asset_check_section}
If the spec is already high quality, return it unchanged.
If you find issues, fix them and return the improved spec.
Output ONLY valid JSON — no explanation."""

        response = self.client.chat.completions.create(
            model=self.deployment_quality,
            messages=[
                {"role": "system", "content": quality_system},
                {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=16384,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)

        usage = response.usage
        if usage:
            print(f"   [Agent 3 / {self.deployment_quality}] Tokens: {usage.prompt_tokens} in, {usage.completion_tokens} out")

        # Normalize transitions etc.
        raw = normalize_spec(raw)

        # Enforce integer durations and correct total
        raw = self._enforce_integer_durations(raw, target_duration)

        # Validate
        result = validate_json_spec(raw)
        if result["valid"]:
            print(f"   [Agent 3] Spec passed validation!")
            if result.get("warnings"):
                for w in result["warnings"]:
                    print(f"   [Warning] {w}")
            return raw
        else:
            print(f"   [Agent 3] Validation issues: {len(result['errors'])} errors")
            for e in result["errors"][:5]:
                print(f"      - {e}")
            # Return it anyway — the errors might be minor
            return raw

    # ═══════════════════════════════════════════════════
    # Main Entry Point
    # ═══════════════════════════════════════════════════

    async def generate(
        self,
        blueprint_path: str,
        transcript_path: Optional[str] = None,
        video_path: Optional[str] = None,
        output_name: str = "video_spec",
        target_duration: float = 60,
        test_render: bool = True,
        use_cached_spec: bool = False,
        use_cached_plan: bool = False,
        cache_version: Optional[int] = None,
        template_filter: Optional[List[str]] = None,
        media_dir: Optional[str] = None,
        caption_images: bool = False,
        recaption: bool = False,
        assets_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full multi-agent pipeline:
          1. Load inputs
          2. Parse blueprint (cached)
          3. Scene detection (cached)
          4. Media inventory
          5. Agent 1: Scene Planner (cached)
          6. Agent 2: Param Generator
          7. Agent 3: Quality Checker
          8. Save + test render
        """
        print(f"\n{'='*60}")
        print(f"  Multi-Agent Video Generation Pipeline")
        print(f"{'='*60}")

        # Resolve the cache key — prefer video_path, fall back to blueprint_path
        cache_key = video_path or blueprint_path

        # 0. Check spec cache
        if use_cached_spec:
            cached_spec = self.cache.get_spec(cache_key, version=cache_version)
            if cached_spec:
                print("\n[Cache] Using cached JSON spec — skipping generation")
                output_path = self.output_dir / f"{output_name}.json"
                output_path.write_text(cached_spec)
                spec = json.loads(cached_spec)
                return {
                    "success": True,
                    "spec_json": cached_spec,
                    "output_path": str(output_path),
                    "scene_count": len(spec.get("scenes", [])),
                    "templates_used": list(set(s["template"] for s in spec.get("scenes", []))),
                    "duration": spec.get("duration"),
                    "from_cache": True,
                }
            else:
                print("\n[Cache] No cached spec found — generating fresh")

        # 1. Load inputs
        print("\n[Step 1] Loading inputs...")
        blueprint = self.load_blueprint(blueprint_path)
        transcript = self.load_transcript(transcript_path) if transcript_path else None

        # 2. Parse blueprint (cached)
        print("\n[Step 2] Parsing blueprint...")
        parsed = self.cache.get_blueprint(cache_key)
        if not parsed:
            parsed = self.parse_blueprint(blueprint)
            self.cache.set_blueprint(cache_key, parsed)
        else:
            print(f"   Using cached parse ({len(parsed.get('colors', {}))} colors)")

        # Auto-detect duration from blueprint if available
        if parsed.get("duration", 0) > 0 and target_duration == 60:
            target_duration = parsed["duration"]
            print(f"   Auto-detected duration: {target_duration:.0f}s")

        # 3. (Optional) FFmpeg scene detection (cached)
        scene_boundaries = None
        if video_path and Path(video_path).exists():
            print("\n[Step 3] Running FFmpeg scene detection...")
            scene_boundaries = self.cache.get_scenes(cache_key)
            if not scene_boundaries:
                try:
                    scene_boundaries = build_scene_boundaries(video_path)
                    self.cache.set_scenes(cache_key, scene_boundaries)
                    print(f"   Found {len(scene_boundaries)} scene boundaries")
                except Exception as e:
                    print(f"   [Warning] Scene detection failed: {e}")
            else:
                print(f"   Using cached scene boundaries ({len(scene_boundaries)} scenes)")
        else:
            print("\n[Step 3] Skipping scene detection (no video path)")

        # 3b. (Optional) Media inventory
        media_prompt = None
        if media_dir:
            print("\n[Step 3b] Scanning media assets...")
            from generator.media import MediaInventory
            inventory = MediaInventory(media_dir)
            if caption_images:
                await inventory.scan_with_captions(force_recaption=recaption)
            else:
                inventory.scan()
            media_prompt = inventory.to_prompt()
            if media_prompt:
                print(f"   Media prompt: {len(media_prompt)} chars")
        else:
            print("\n[Step 3b] Skipping media scan (no --media path)")

        # ═══ ASSET INTELLIGENCE ═══
        # Load the asset manifest (if it exists) and build a rich prompt section
        # that gives Agent 1 and Agent 2 full visibility into image quality.
        asset_intel = None
        if assets_dir:
            # Try to load the manifest from data/analysis/ (created by generate_from_script.py step 1)
            manifest_path = self.project_dir / "data" / "analysis" / f"{output_name}_asset_manifest.json"
            if manifest_path.exists():
                try:
                    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    asset_intel = build_asset_intelligence(manifest)
                    print(f"\n[Step 3c] Loaded asset intelligence from {manifest_path.name}")
                    print(f"   {manifest.get('asset_count', '?')} assets analyzed, {len(asset_intel)} chars")
                except Exception as e:
                    print(f"\n[Step 3c] Could not load asset manifest: {e}")
            else:
                # Build manifest on the fly if not pre-generated
                try:
                    from generator.asset_manifest import build_manifest
                    import asyncio
                    manifest = await build_manifest(assets_dir=assets_dir, caption_images=False)
                    asset_intel = build_asset_intelligence(manifest)
                    print(f"\n[Step 3c] Built asset intelligence on-the-fly")
                    print(f"   {manifest.get('asset_count', '?')} assets analyzed, {len(asset_intel)} chars")
                except Exception as e:
                    print(f"\n[Step 3c] Could not build asset manifest: {e}")
        else:
            print("\n[Step 3c] No assets dir — skipping asset intelligence")

        # ═══ MULTI-AGENT GENERATION ═══

        # 4. Agent 1: Scene Planner (only cached when explicitly requested)
        print("\n[Step 4] Agent 1: Scene Planner")
        scene_plan = None
        if use_cached_plan or use_cached_spec:
            scene_plan = self.cache.get_scene_plan(cache_key)
            if scene_plan:
                print(f"   Using cached scene plan ({len(scene_plan.get('scenes', []))} scenes)")
            else:
                print(f"   No cached scene plan found — generating fresh")
        if not scene_plan:
            scene_plan = await self.plan_scenes(
                parsed, transcript, scene_boundaries,
                target_duration, template_filter, media_prompt,
                asset_intelligence=asset_intel,
            )
            self.cache.set_scene_plan(cache_key, scene_plan)

        # 5. Agent 2: Param Generator
        print("\n[Step 5] Agent 2: Param Generator")
        spec_json = await self.generate_params(scene_plan, target_duration,
                                                assets_dir=assets_dir,
                                                asset_intelligence=asset_intel)

        # 6. Agent 3: Quality Checker
        print("\n[Step 6] Agent 3: Quality Checker")
        spec_json = await self.check_quality(spec_json, target_duration,
                                              asset_intelligence=asset_intel)

        # 6b. Resolve asset paths (copy to public/ and rewrite filenames in spec)
        if assets_dir:
            print("\n[Step 6b] Resolving asset paths...")
            asset_prefix = copy_assets_to_public(assets_dir, output_name, self.project_dir)
            spec_json = resolve_asset_paths_in_spec(spec_json, assets_dir, asset_prefix)

        # 7. Save output + cache
        print("\n[Step 7] Saving spec...")
        output_path = self.output_dir / f"{output_name}.json"
        output_path.write_text(spec_json)
        print(f"   Saved: {output_path}")

        # Cache the spec (versioned)
        self.cache.set_spec(cache_key, spec_json, {
            "output_name": output_name,
            "target_duration": target_duration,
            "agents": ["scene_planner", "param_generator", "quality_checker"],
        })

        # Also save pretty-printed
        try:
            pretty = json.dumps(json.loads(spec_json), indent=2)
            pretty_path = self.output_dir / f"{output_name}_pretty.json"
            pretty_path.write_text(pretty)
        except json.JSONDecodeError:
            pass

        # Copy to src/latest-spec.json for Remotion preview
        latest_spec_path = self.project_dir / "src" / "latest-spec.json"
        try:
            latest_spec_path.write_text(spec_json)
            print(f"   Updated: {latest_spec_path}")
        except OSError as e:
            print(f"   [Warning] Could not update latest-spec.json: {e}")

        # 8. (Optional) Test render
        if test_render:
            print("\n[Step 8] Rendering test frames...")
            try:
                render_result = render_test_frames(
                    "GeneratedVideo",
                    str(self.project_dir),
                    spec_json=spec_json,
                )
                if render_result["blank_frames"]:
                    print(f"   [Warning] {len(render_result['blank_frames'])} blank frames detected!")
                else:
                    print(f"   All {render_result['frames_rendered']} test frames look good")
            except Exception as e:
                print(f"   [Warning] Test render failed: {e}")
        else:
            print("\n[Step 8] Skipping test render")

        # Summary
        spec = json.loads(spec_json)
        scene_count = len(spec.get("scenes", []))
        templates_used = list(set(s["template"] for s in spec.get("scenes", [])))

        print(f"\n{'='*60}")
        print(f"  Generation Complete!")
        print(f"  Agents: Scene Planner → Param Generator → Quality Checker")
        print(f"  Scenes: {scene_count}")
        print(f"  Templates: {', '.join(templates_used)}")
        print(f"  Duration: {spec.get('duration', '?')}s")
        print(f"  Output: {output_path}")
        print(f"{'='*60}\n")

        return {
            "success": True,
            "spec_json": spec_json,
            "output_path": str(output_path),
            "scene_count": scene_count,
            "templates_used": templates_used,
            "duration": spec.get("duration"),
        }
