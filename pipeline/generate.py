#!/usr/bin/env python3
"""
Video Generation CLI — JSON-driven pipeline.

Usage:
    # Generate from blueprint
    python generate.py -b data/analysis/blueprint.md

    # Generate from script (auto-creates blueprint first)
    python generate.py -s test_scripts/script_saas_launch.txt -d 25 -o saas

    # Script with style and font overrides
    python generate.py -s script.txt --style tech-product --fonts "Oswald,Lato,Inconsolata"

    # Script with asset folder
    python generate.py -s script.txt --assets test_scripts/assets_saas/ -d 25

    # With transcript and input video (for scene detection)
    python generate.py -b data/analysis/blueprint.md -t data/stt/transcript.txt -v input.mp4

    # Specify output name and duration
    python generate.py -b blueprint.md -o gold_video -d 60

    # Skip test rendering
    python generate.py -b blueprint.md --no-test

    # List cached spec versions
    python generate.py -b blueprint.md --list-cache

    # Use latest cached spec (skip AI generation)
    python generate.py -b blueprint.md --cache

    # Use a specific cached version
    python generate.py -b blueprint.md --cache --cache-version 2

    # Only use specific templates (AI picks from this subset)
    python generate.py -b blueprint.md --templates TitleSlide,ImpactNumber,Timeline,CallToAction

    # List all available templates
    python generate.py --list-templates

    # Include media assets (AI references them in scenes)
    python generate.py -b blueprint.md --media ./assets/

    # Include media + AI-caption each image (best results, costs API credits)
    python generate.py -b blueprint.md --media ./assets/ --caption-images

    # Use a custom creative guide (swap artistic direction)
    python generate.py -b blueprint.md --creative-guide prompts/hype_guide.md

    # Disable creative guide (technical prompt only)
    python generate.py -b blueprint.md --no-creative-guide

After generation, run `npm start` to preview in Remotion Studio.
The latest spec is auto-loaded into Studio (via src/latest-spec.json).
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add project root and pipeline dir to path
PROJECT_ROOT = Path(__file__).parent.parent
PIPELINE_DIR = Path(__file__).parent
sys.path.insert(0, str(PIPELINE_DIR))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass


def rebuild_asset_map() -> None:
    """Rebuild src/asset-map.json so @role tokens resolve to current files."""
    script = PROJECT_ROOT / "scripts" / "build-asset-map.cjs"
    if script.exists():
        try:
            import subprocess
            subprocess.run(["node", str(script)], cwd=str(PROJECT_ROOT),
                           capture_output=True, timeout=10)
            print("   [Assets] Rebuilt src/asset-map.json")
        except Exception as e:
            print(f"   [Warning] Could not rebuild asset map: {e}")


def update_studio_spec(spec_json: str) -> None:
    """
    Write the generated spec to src/latest-spec.json.
    Remotion Studio imports this file, so hot-reload picks up changes.
    Also rebuilds the asset map so @role tokens resolve correctly.
    """
    # Rebuild asset map first so any new/changed assets are picked up
    rebuild_asset_map()

    target = PROJECT_ROOT / "src" / "latest-spec.json"
    try:
        pretty = json.dumps(json.loads(spec_json), indent=2)
        target.write_text(pretty)
        print(f"   [Studio] Updated src/latest-spec.json → Remotion Studio will hot-reload")
    except Exception as e:
        print(f"   [Warning] Could not update Studio spec: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate videos from blueprints using JSON-driven templates"
    )
    # -s and -b are mutually exclusive: provide a script OR a blueprint, not both
    input_group = parser.add_mutually_exclusive_group()
    input_group.add_argument(
        "-s", "--script",
        help="Path to script text file (.txt or .md). Auto-generates blueprint then runs pipeline."
    )
    input_group.add_argument(
        "-b", "--blueprint",
        help="Path to blueprint markdown file"
    )
    parser.add_argument(
        "--style",
        help="Style preset for blueprint generation (e.g. tech-product, fitness, fintech). Only used with -s."
    )
    parser.add_argument(
        "--fonts",
        help="Font override as comma-separated trio (e.g. \"Oswald,Lato,Inconsolata\"). Only used with -s."
    )
    parser.add_argument(
        "--assets",
        help="Path to assets folder for script-to-video mode. Only used with -s."
    )
    parser.add_argument(
        "-t", "--transcript",
        help="Path to transcript text file"
    )
    parser.add_argument(
        "-v", "--video",
        help="Path to input video (enables FFmpeg scene detection)"
    )
    parser.add_argument(
        "-o", "--output", default="video_spec",
        help="Output name (default: video_spec)"
    )
    parser.add_argument(
        "-d", "--duration", type=float, default=60,
        help="Target duration in seconds (default: 60)"
    )
    parser.add_argument(
        "--no-test", action="store_true",
        help="Skip test frame rendering"
    )
    parser.add_argument(
        "--render", action="store_true",
        help="Render full video after generation"
    )
    parser.add_argument(
        "--cache", action="store_true",
        help="Use cached spec if available (default: always generate fresh)"
    )
    parser.add_argument(
        "--cache-version", type=int, default=None,
        help="Specific cache version to load (use with --cache). See --list-cache for available versions."
    )
    parser.add_argument(
        "--list-cache", action="store_true",
        help="List all cached spec versions for the blueprint, then exit"
    )
    parser.add_argument(
        "--templates",
        help="Comma-separated list of template names the AI must use (e.g. TitleSlide,ImpactNumber,Timeline)"
    )
    parser.add_argument(
        "--list-templates", action="store_true",
        help="List all available templates with descriptions, then exit"
    )
    parser.add_argument(
        "--creative-guide",
        help="Path to a custom creative guide markdown file (default: pipeline/prompts/creative_guide.md)"
    )
    parser.add_argument(
        "--no-creative-guide", action="store_true",
        help="Disable creative guide (use only the technical JSON prompt)"
    )
    parser.add_argument(
        "--media",
        help="Path to media assets folder (images, videos, SVGs the AI can reference in scenes)"
    )
    parser.add_argument(
        "--caption-images", action="store_true",
        help="Use AI vision to caption images in the media folder (costs API credits, cached for reuse)"
    )
    parser.add_argument(
        "--recaption", action="store_true",
        help="Force re-caption all images (ignore cached captions). Use with --media --caption-images"
    )

    args = parser.parse_args()

    # ── --list-templates: show catalog and exit ──
    if args.list_templates:
        from generator.pipeline import TEMPLATE_NAMES
        print(f"\nAvailable templates ({len(TEMPLATE_NAMES)} total):\n")
        # Group by phase
        core = TEMPLATE_NAMES[:20]
        extended = TEMPLATE_NAMES[20:24]
        premium = TEMPLATE_NAMES[24:]

        print("  Core (20):")
        for i, t in enumerate(core):
            print(f"    {t}")
        print(f"\n  Extended (4):")
        for t in extended:
            print(f"    {t}")
        print(f"\n  Premium (3):")
        for t in premium:
            print(f"    {t}")
        print(f"\nUsage:")
        print(f"  python generate.py -b blueprint.md --templates TitleSlide,ImpactNumber,Timeline,CallToAction")
        sys.exit(0)

    # ── Require -b or -s for everything except --list-templates ──
    if not args.blueprint and not args.script:
        parser.error("-b/--blueprint or -s/--script is required")

    # ── Script mode: convert script to blueprint first ──
    if args.script:
        print(f"\n[Script Mode] Converting script to blueprint...")
        from script_to_blueprint import generate_blueprint

        # Build asset manifest if --assets provided
        asset_manifest_path = None
        if args.assets:
            assets_dir = Path(args.assets)
            if not assets_dir.exists():
                print(f"   [Error] Assets directory not found: {args.assets}")
                sys.exit(1)
            try:
                from generator.asset_manifest import build_manifest
                manifest = asyncio.run(build_manifest(str(assets_dir)))
                asset_manifest_path = str(PROJECT_ROOT / "data" / "analysis" / f"{args.output}_asset_manifest.json")
                Path(asset_manifest_path).parent.mkdir(parents=True, exist_ok=True)
                Path(asset_manifest_path).write_text(json.dumps(manifest, indent=2))
                print(f"   Asset manifest: {asset_manifest_path}")
            except ImportError:
                print(f"   [Warning] asset_manifest.py not available, skipping asset classification")

        blueprint_path = generate_blueprint(
            script_path=args.script,
            target_duration=args.duration,
            style_preset=args.style,
            font_override=args.fonts,
            asset_manifest_path=asset_manifest_path,
            output_name=args.output,
        )
        print(f"   Blueprint: {blueprint_path}")
        args.blueprint = blueprint_path

    from generator.cache import PipelineCache

    # ── --list-cache: show versions and exit ──
    if args.list_cache:
        cache = PipelineCache()
        cache_key = args.video or args.blueprint
        entries = cache.list_specs(cache_key)
        if not entries:
            print(f"No cached specs found for: {cache_key}")
        else:
            from generator.cache import _safe_name
            base = _safe_name(cache_key)
            print(f"\nCached specs for \"{base}\":\n")
            for e in entries:
                latest = " ← latest" if e == entries[-1] else ""
                print(f"  v{e['version']}  {e['name']:<60s}  ({e['mtime']}, {e['scenes']} scenes){latest}")
            print(f"\nUsage:")
            print(f"  python generate.py -b {args.blueprint} --cache                  # load latest (v{entries[-1]['version']})")
            print(f"  python generate.py -b {args.blueprint} --cache --cache-version 1 # load specific version")
        sys.exit(0)

    # ── --cache-version implies --cache ──
    use_cache = args.cache or args.cache_version is not None

    # ── Parse --templates ──
    template_filter = None
    if args.templates:
        from generator.pipeline import TEMPLATE_NAMES
        template_filter = [t.strip() for t in args.templates.split(",")]
        # Validate
        invalid = [t for t in template_filter if t not in TEMPLATE_NAMES]
        if invalid:
            print(f"\n[Error] Unknown template(s): {', '.join(invalid)}")
            print(f"Run --list-templates to see available names.")
            sys.exit(1)
        print(f"\n[Templates] AI constrained to: {', '.join(template_filter)}")

    from generator.pipeline import JsonVideoGenerator

    # Resolve creative guide path
    creative_guide_path = None
    if args.no_creative_guide:
        creative_guide_path = "__disabled__"  # sentinel: skip loading
        print(f"\n[Creative Guide] Disabled — using technical prompt only")
    elif args.creative_guide:
        creative_guide_path = args.creative_guide

    gen = JsonVideoGenerator(creative_guide=creative_guide_path if creative_guide_path != "__disabled__" else "__disabled__")
    result = asyncio.run(gen.generate(
        blueprint_path=args.blueprint,
        transcript_path=args.transcript,
        video_path=args.video,
        output_name=args.output,
        target_duration=args.duration,
        test_render=not args.no_test,
        use_cached_spec=use_cache,
        cache_version=args.cache_version,
        template_filter=template_filter,
        media_dir=args.media,
        caption_images=args.caption_images,
        recaption=args.recaption,
        assets_dir=getattr(args, 'assets', None),
    ))

    if result["success"]:
        print(f"\nSpec saved to: {result['output_path']}")

        # Auto-update Remotion Studio preview
        update_studio_spec(result["spec_json"])

        if args.render:
            import subprocess
            print("\n[Render] Rendering full video...")
            spec_json = result["spec_json"]
            cmd = [
                "npx", "remotion", "render",
                "src/index.ts", "GeneratedVideo",
                f"output/{args.output}.mp4",
                "--props", f'{{"specJson": {repr(spec_json)}}}',
            ]
            subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    else:
        print("\nGeneration failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
