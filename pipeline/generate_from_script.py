#!/usr/bin/env python3
"""
Script-to-Video Pipeline — Single Command Wrapper

Chains: script → blueprint → three-agent pipeline → VideoSpec JSON

Usage:
    # Basic
    python generate_from_script.py -s script.txt

    # With all options
    python generate_from_script.py \\
        -s script.txt \\
        --assets ./assets/ \\
        --duration 60 \\
        --style tech-product \\
        --fonts "Montserrat,Inter,JetBrains Mono" \\
        -o my_video

    # With AI-captioned assets
    python generate_from_script.py -s script.txt --assets ./assets/ --caption-images

After generation, run `npm start` to preview in Remotion Studio.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add pipeline dir to path
PIPELINE_DIR = Path(__file__).parent
PROJECT_ROOT = PIPELINE_DIR.parent
sys.path.insert(0, str(PIPELINE_DIR))


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
    """Write the generated spec to src/latest-spec.json for Remotion Studio hot-reload.
    Also rebuilds the asset map so @role tokens resolve correctly."""
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
        description="Generate a video spec from a script (end-to-end pipeline)"
    )
    parser.add_argument(
        "-s", "--script", required=True,
        help="Path to the script file (.txt or .md)"
    )
    parser.add_argument(
        "--assets",
        help="Path to assets folder"
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
        "-o", "--output", default="video_spec",
        help="Output name for the spec file (default: video_spec)"
    )
    parser.add_argument(
        "--caption-images", action="store_true",
        help="Use AI vision to caption assets (costs API credits)"
    )
    parser.add_argument(
        "--no-test", action="store_true",
        help="Skip test frame rendering"
    )
    parser.add_argument(
        "--templates",
        help="Comma-separated template filter (passed through to generate.py)"
    )
    parser.add_argument(
        "--no-creative-guide", action="store_true",
        help="Disable creative guide (passed through to generate.py)"
    )
    parser.add_argument(
        "--cache", action="store_true", default=False,
        help="Use cached spec if available. Must be explicitly passed."
    )
    parser.add_argument(
        "--fresh", action="store_true",
        help="Force fresh generation, ignoring cached specs (this is the default behavior)"
    )
    parser.add_argument(
        "--cache-version", type=int, default=None,
        help="Specific cache version to load (implies --cache)"
    )
    parser.add_argument(
        "--render", action="store_true",
        help="Render full video after generation"
    )

    args = parser.parse_args()

    # Load .env
    try:
        from dotenv import load_dotenv
        load_dotenv(PROJECT_ROOT / ".env")
    except ImportError:
        pass

    print(f"\n{'='*60}")
    print(f"  Script-to-Video Pipeline")
    print(f"{'='*60}")
    print(f"  Script:   {args.script}")
    print(f"  Duration: {args.duration}s")
    print(f"  Style:    {args.style or 'auto'}")
    print(f"  Fonts:    {args.fonts or 'auto'}")
    print(f"  Assets:   {args.assets or 'none'}")
    print(f"  Output:   {args.output}")
    print(f"{'='*60}\n")

    # ── Step 1: Asset manifest (optional) ──
    # Auto-detect assets if not explicitly provided
    if not args.assets:
        # Auto-detect: prefer test_scripts/ sources over public/ destinations.
        # test_scripts/ is the user's source of truth; public/ is the copy target.
        script_stem = Path(args.script).stem  # e.g. "script_fitness_brand"
        clean_name = script_stem.replace("script_", "")  # "fitness_brand"
        parts = clean_name.split("_")  # ["fitness", "brand"]

        # Build candidates: ALL test_scripts/ first, then public/ as fallback
        candidates = [
            # Exact output name match
            PROJECT_ROOT / "test_scripts" / f"assets_{args.output}",
            # Script stem parts (e.g., assets_fitness, assets_brand)
            *[PROJECT_ROOT / "test_scripts" / f"assets_{part}" for part in parts],
            # Full cleaned name (e.g., assets_fitness_brand)
            PROJECT_ROOT / "test_scripts" / f"assets_{clean_name}",
            # --- public/ fallbacks (copy destination, least preferred) ---
            PROJECT_ROOT / "public" / "assets" / args.output,
            *[PROJECT_ROOT / "public" / "assets" / part for part in parts],
            PROJECT_ROOT / "public" / "assets" / clean_name,
        ]

        for candidate in candidates:
            if candidate.exists() and any(candidate.iterdir()):
                args.assets = str(candidate)
                print(f"[Auto-detect] Found assets at: {candidate}")
                break

    asset_manifest_path = None
    if args.assets:
        print("[Step 1/3] Building asset manifest...")
        assets_dir = Path(args.assets)
        if not assets_dir.exists():
            print(f"   [Error] Assets directory not found: {args.assets}")
            sys.exit(1)

        # Try to use asset_manifest.py if available, otherwise use basic media scan
        try:
            from generator.asset_manifest import build_manifest
            manifest = asyncio.run(build_manifest(
                assets_dir=str(assets_dir),
                caption_images=args.caption_images,
            ))
            asset_manifest_path = str(PROJECT_ROOT / "data" / "analysis" / f"{args.output}_asset_manifest.json")
            Path(asset_manifest_path).parent.mkdir(parents=True, exist_ok=True)
            Path(asset_manifest_path).write_text(json.dumps(manifest, indent=2))
            print(f"   Manifest saved: {asset_manifest_path}")
        except ImportError:
            # Fallback: use MediaInventory directly
            from generator.media import MediaInventory
            inv = MediaInventory(str(assets_dir))
            if args.caption_images:
                items = asyncio.run(inv.scan_with_captions())
            else:
                items = inv.scan()
            # Save a simple manifest
            manifest = {
                "asset_count": len(items),
                "assets": items,
            }
            asset_manifest_path = str(PROJECT_ROOT / "data" / "analysis" / f"{args.output}_asset_manifest.json")
            Path(asset_manifest_path).parent.mkdir(parents=True, exist_ok=True)
            Path(asset_manifest_path).write_text(json.dumps(manifest, indent=2, default=str))
            print(f"   Manifest saved (basic): {asset_manifest_path}")
    else:
        print("[Step 1/3] No assets provided, skipping manifest")

    # ── Determine caching behavior (needed before Step 2) ──
    # --cache or --cache-version → use cache. Default is FRESH (no cache).
    use_cached = args.cache
    if args.cache_version is not None:
        use_cached = True
    if args.fresh:
        use_cached = False

    if use_cached:
        print(f"[Cache] Will use cached spec if available")
    else:
        print(f"[Cache] Fresh generation (pass --cache or --cache-version N to use cache)")

    # ── Step 2: Script → Blueprint ──
    # When using cached specs, skip the expensive LLM blueprint generation
    # if the blueprint file already exists from a previous run.
    from script_to_blueprint import generate_blueprint

    # Determine the expected blueprint path (deterministic from output_name)
    expected_blueprint = PROJECT_ROOT / "data" / "analysis" / f"{args.output}_script_blueprint.md"

    skip_blueprint_generation = False
    if use_cached and expected_blueprint.exists():
        # Check if a cached spec actually exists for this blueprint
        from generator.cache import PipelineCache
        _cache = PipelineCache(project_dir=str(PROJECT_ROOT))
        _cached_spec = _cache.get_spec(str(expected_blueprint), version=args.cache_version)
        if _cached_spec:
            skip_blueprint_generation = True
            blueprint_path = str(expected_blueprint)
            print(f"\n[Step 2/3] Blueprint + cached spec found — skipping LLM call (saving API credits)")
            print(f"   Blueprint: {blueprint_path}")
            print(f"   [Cache] Spec already cached, will reuse in Step 3")

    if not skip_blueprint_generation:
        print("\n[Step 2/3] Converting script to blueprint...")
        blueprint_path = generate_blueprint(
            script_path=args.script,
            target_duration=args.duration,
            style_preset=args.style,
            font_override=args.fonts,
            asset_manifest_path=asset_manifest_path,
            output_name=args.output,
        )
        print(f"   Blueprint: {blueprint_path}")

    # ── Step 3: Blueprint → VideoSpec (existing pipeline) ──
    print("\n[Step 3/3] Running three-agent pipeline...")
    from generator.pipeline import JsonVideoGenerator

    # Resolve creative guide
    creative_guide = "__disabled__" if args.no_creative_guide else None

    gen = JsonVideoGenerator(creative_guide=creative_guide)

    # Parse template filter
    template_filter = None
    if args.templates:
        from generator.pipeline import TEMPLATE_NAMES
        template_filter = [t.strip() for t in args.templates.split(",")]
        invalid = [t for t in template_filter if t not in TEMPLATE_NAMES]
        if invalid:
            print(f"   [Error] Unknown template(s): {', '.join(invalid)}")
            sys.exit(1)

    # The script text serves as BOTH blueprint (via generated .md) AND transcript
    # Blueprint: structured analysis for the pipeline
    # Transcript: raw text for Agent 1 to pull exact quotes from
    result = asyncio.run(gen.generate(
        blueprint_path=blueprint_path,
        transcript_path=args.script,  # script doubles as transcript
        video_path=None,
        output_name=args.output,
        target_duration=args.duration,
        test_render=not args.no_test,
        use_cached_spec=use_cached,
        use_cached_plan=use_cached,
        cache_version=args.cache_version,
        template_filter=template_filter,
        media_dir=args.assets,
        caption_images=False,  # Already captioned in step 1 if requested
        assets_dir=args.assets,
    ))

    if result["success"]:
        print(f"\n{'='*60}")
        print(f"  ✓ Video spec generated successfully!")
        print(f"{'='*60}")
        print(f"  Spec: {result['output_path']}")

        # Parse some stats
        try:
            spec = json.loads(result["spec_json"])
            scenes = spec.get("scenes", [])
            templates = [s.get("template", "?") for s in scenes]
            total_dur = sum(s.get("duration", 0) for s in scenes)
            print(f"  Scenes: {len(scenes)}")
            print(f"  Duration: {total_dur}s")
            print(f"  Templates: {', '.join(templates)}")
        except (json.JSONDecodeError, KeyError):
            pass

        # Update Remotion Studio
        update_studio_spec(result["spec_json"])

        if args.render:
            import subprocess
            print(f"\n[Render] Rendering full video...")
            out_file = f"output/{args.output}.mp4"
            cmd = ["npm", "run", "render", "--", out_file]
            subprocess.run(cmd, cwd=str(PROJECT_ROOT))

        print(f"\n  Next: Run `npm start` to preview in Remotion Studio")
        print(f"{'='*60}\n")
    else:
        print(f"\n  ✗ Generation failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
