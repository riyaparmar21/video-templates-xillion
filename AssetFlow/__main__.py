#!/usr/bin/env python3
"""
AssetFlow CLI

Usage:
    # Run pipeline (auto-resumes from where it left off)
    python -m AssetFlow run -s script.txt

    # Fresh run (ignore all cached data, start over)
    python -m AssetFlow run -s script.txt --fresh

    # Re-fetch specific scenes only
    python -m AssetFlow run -s script.txt --refetch 3 5

    # With options
    python -m AssetFlow run -s script.txt --style "tech minimal" --threshold 7

    # Start from a specific phase (loads earlier phases from cache)
    python -m AssetFlow run -s script.txt --phase 3

    # Parse only (Phase 1 — no API calls)
    python -m AssetFlow parse -s script.txt

    # Resolve HITL selections
    python -m AssetFlow resolve selections.json

    # Show cache status
    python -m AssetFlow status -s script.txt

    # Clear all cached data
    python -m AssetFlow clear
    python -m AssetFlow clear --scene 3      # clear one scene only

    # Check configuration
    python -m AssetFlow check

    # Background removal (manual HITL)
    python -m AssetFlow rembg-review                     # list images recommended for bg removal
    python -m AssetFlow rembg-apply scene_001/google_abc.jpg scene_003/google_def.png  # remove bg on selected
    python -m AssetFlow rembg-apply --all                # remove bg on ALL recommended images
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Ensure project root is on path only if running as a script (not as installed package)
PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from AssetFlow.config import Config
from AssetFlow.orchestrator import AssetFlowPipeline
from AssetFlow.cache import PipelineCache
from AssetFlow.phase1_script_parser import ScriptParser
from AssetFlow.llm_client import LLMClient


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def cmd_run(args):
    """Run the full pipeline."""
    config = Config()
    if args.threshold:
        config.quality_threshold = args.threshold
    if args.candidates:
        config.candidates_per_source = args.candidates

    pipeline = AssetFlowPipeline(config)

    if not pipeline.validate_config():
        print("\n⚠️  Config warnings detected. Pipeline may not function fully.")
        if not args.force:
            print("Use --force to run anyway.")
            sys.exit(1)

    # Determine mode
    mode = "resume"  # default
    refetch_scenes = None
    if args.fresh:
        mode = "fresh"
    elif args.refetch:
        mode = "refetch"
        refetch_scenes = args.refetch

    result = asyncio.run(pipeline.run(
        script_path=args.script,
        style_anchor=args.style or "",
        target_format=args.format,
        skip_vision=args.skip_vision,
        mode=mode,
        refetch_scenes=refetch_scenes,
        from_phase=args.phase or 1,
    ))

    print("\n" + result.summary())

    # ── Remotion upgrade suggestions ──
    if result.remotion_suggestions:
        print(f"\n🎬 REMOTION UPGRADE SUGGESTIONS ({len(result.remotion_suggestions)} scenes)")
        print("   These scenes have Google Search assets but could be enhanced")
        print("   with custom Remotion animations (data viz, dynamic text, UI elements):\n")
        for suggestion in result.remotion_suggestions:
            sid = suggestion["scene_id"]
            title = suggestion["title"]
            desc = suggestion["remotion_description"]
            has_asset = "asset approved" if suggestion["has_stock_asset"] else "no asset (needs Remotion)"
            print(f"   Scene {sid}: {title}")
            print(f"     Remotion idea: {desc}")
            print(f"     Status: {has_asset}")
            print()

    if result.hitl_pending:
        dashboard = config.hitl_dir / "dashboard.html"
        print(f"\n📋 HITL Review needed: open {dashboard}")
        print(f"   Then run: python -m AssetFlow resolve <selections.json>")

    if result.errors:
        print(f"\n❌ {len(result.errors)} errors occurred:")
        for err in result.errors:
            print(f"   • {err}")
        sys.exit(1)


def cmd_parse(args):
    """Run Phase 1 only (no API calls) via the ScriptParser directly."""
    config = Config()
    parser = ScriptParser(config, LLMClient(config))

    scenes = parser.run(script_path=args.script)

    # Save output
    output_file = config.output_dir / "phase_1_output.json"
    config.ensure_dirs()
    output_file.write_text(json.dumps({
        "scenes": [{"scene_id": s.scene_id, "title": s.title, "description": s.description} for s in scenes],
    }, indent=2, default=str), encoding="utf-8")

    print(f"\n✅ Parsed {len(scenes)} scenes")
    print(f"   Output: {output_file}")


def cmd_resolve(args):
    """Apply HITL selections."""
    config = Config()
    pipeline = AssetFlowPipeline(config)

    selections_path = Path(args.selections)

    # ── Auto-detect selections file if the given path doesn't exist ──
    if not selections_path.exists():
        candidates = [
            config.hitl_dir / "selections.json",
            config.hitl_dir / "hitl_selections.json",
            Path.home() / "Downloads" / "selections.json",
            Path.home() / "Downloads" / "hitl_selections.json",
        ]
        found = None
        for c in candidates:
            if c.exists():
                found = c
                break

        if found:
            print(f"⚠️  '{selections_path}' not found, but found: {found}")
            selections_path = found
        else:
            print(f"\n❌ Selections file not found: {selections_path}")
            print(f"\n   The HITL dashboard saves selections when you click 'Finalize'.")
            print(f"   Expected locations:")
            print(f"     • {config.hitl_dir / 'selections.json'}")
            print(f"     • ~/Downloads/selections.json")
            print(f"\n   If you haven't made selections yet, open the dashboard first:")
            print(f"     open {config.hitl_dir / 'dashboard.html'}")
            return

    approved = asyncio.run(pipeline.resolve_hitl(str(selections_path)))

    print(f"\n✅ Resolved {len(approved)} scenes:")
    for a in approved:
        print(f"   Scene {a.scene_id}: {a.final_path.name} ({a.source.value})")


def cmd_status(args):
    """Show cache status for a script."""
    config = Config()
    cache = PipelineCache(config)
    cache.init_run(Path(args.script))
    print(cache.summary())


def cmd_clear(args):
    """Clear cached data."""
    config = Config()
    cache = PipelineCache(config)

    if args.script:
        cache.init_run(Path(args.script))
        if args.scene:
            for sid in args.scene:
                cache.clear_scene(sid)
            print(f"Cleared scenes: {args.scene}")
        else:
            cache.clear_run()
            print(f"Cleared all cache for script: {args.script}")
    elif args.all:
        cache.clear_all()
        print("Cleared ALL AssetFlow cache and data")
    else:
        parser_ref = argparse.ArgumentParser()
        parser_ref.error("clear requires --script <path> or --all. See: python -m AssetFlow clear --help")


def _find_rembg_candidates(config: Config) -> tuple[list[Path], list[tuple[str, str]], list[Path]]:
    """Scan output/ for images that are candidates for background removal.

    Returns:
        (candidates, skipped, other_images)
        - candidates: Paths recommended for bg removal (opaque photos without existing _nobg)
        - skipped: (name, reason) tuples for terminal summary
        - other_images: ALL other viewable image files in output/ (for the dashboard's collapsible section)
    """
    from AssetFlow.phase3_processor import has_alpha_channel

    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
    output_dir = config.output_dir
    candidates = []
    skipped = []
    other_images = []

    for f in sorted(output_dir.glob("*")):
        if not f.is_file():
            continue
        # Skip _nobg files — they're bg-removal outputs
        if f.stem.endswith("_nobg"):
            continue

        ext = f.suffix.lower()

        # Not a viewable image at all — skip entirely (videos, json, etc.)
        if ext not in IMAGE_EXTS:
            continue

        # Skip empty / broken files (0 bytes)
        if f.stat().st_size == 0:
            continue

        # GIFs / non-standard formats — show in Other, not as candidates
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            skipped.append((f.name, "not a standard photo"))
            other_images.append(f)
            continue

        # Already has transparency
        if has_alpha_channel(f):
            skipped.append((f.name, "already has alpha"))
            other_images.append(f)
            continue

        # Already has a _nobg version
        nobg_path = f.parent / f"{f.stem}_nobg.png"
        if nobg_path.exists():
            skipped.append((f.name, "bg already removed"))
            other_images.append(f)
            continue

        candidates.append(f)

    return candidates, skipped, other_images


def cmd_rembg_review(args):
    """Generate a visual HTML dashboard for reviewing background removal candidates."""
    config = Config()
    output_dir = config.output_dir

    if not output_dir.exists():
        print("\n❌ No output directory found. Run the pipeline first.")
        return

    candidates, skipped, other_images = _find_rembg_candidates(config)

    if not candidates and not other_images:
        print("\n✅ No images need background removal.")
        if skipped:
            print(f"   ({len(skipped)} files skipped — not photos)")
        return

    config.ensure_dirs()

    # Start local server so the dashboard can save selections
    from AssetFlow.regen_server import start_regen_server, stop_regen_server
    from AssetFlow.phase5_hitl_dashboard import HITLDashboard

    server, port = start_regen_server(config, scenes=[], port=0)

    dashboard = HITLDashboard(config)
    dashboard_path = dashboard.generate_rembg_dashboard(
        candidates, other_images=other_images, regen_port=port,
    )

    print(f"\nAssetFlow — Background Removal Review")
    print(f"=" * 50)
    print(f"\n📋 {len(candidates)} candidate image(s) found.")
    if skipped:
        print(f"⏭️  {len(skipped)} file(s) skipped (already processed or not photos)")
    dashboard_url = f"http://127.0.0.1:{port}/hitl/rembg_dashboard.html"
    print(f"\n🌐 Dashboard: {dashboard_url}")
    print(f"   Server running on http://127.0.0.1:{port}")
    if other_images:
        print(f"   ({len(other_images)} other images in collapsible section)")
    print(f"\n   Open the dashboard, select images,")
    print(f"   then click 'Remove Backgrounds' to save your selections.")
    print(f"\n   After that, run:")
    print(f"     python -m AssetFlow rembg-apply")
    print(f"\n   Press Ctrl+C to stop the server when done.")

    # Open the dashboard via HTTP so images load properly
    import webbrowser
    webbrowser.open(dashboard_url)

    # Keep the server alive until Ctrl+C
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\nStopping server...")
        stop_regen_server(server)
        print("Done.")


def cmd_rembg_apply(args):
    """Apply background removal to selected images."""
    config = Config()
    output_dir = config.output_dir

    if not output_dir.exists():
        print("\n❌ No output directory found. Run the pipeline first.")
        return

    from AssetFlow.phase3_processor import remove_background, has_alpha_channel

    if args.all:
        # Find all candidates (same logic as review)
        candidates, _, _ = _find_rembg_candidates(config)
        targets = candidates
    elif args.images:
        # User-specified files on command line
        targets = []
        for name in args.images:
            # Try exact path first, then look in output dir
            p = Path(name)
            if not p.exists():
                p = output_dir / name
            if not p.exists():
                # Try matching by scene prefix
                matches = list(output_dir.glob(f"*{name}*"))
                if matches:
                    p = matches[0]
                else:
                    print(f"  ⚠️  Not found: {name}")
                    continue
            targets.append(p)
    else:
        # No args — try reading from the dashboard's saved selections
        selections_path = config.hitl_dir / "rembg_selections.json"
        if not selections_path.exists():
            # Also check Downloads
            dl_path = Path.home() / "Downloads" / "rembg_selections.json"
            if dl_path.exists():
                selections_path = dl_path

        if selections_path.exists():
            import json as _json
            data = _json.loads(selections_path.read_text(encoding="utf-8"))
            filenames = data.get("images", [])
            if not filenames:
                print("\n❌ rembg_selections.json found but contains no images.")
                return

            targets = []
            for name in filenames:
                p = output_dir / name
                if not p.exists():
                    matches = list(output_dir.glob(f"*{name}*"))
                    if matches:
                        p = matches[0]
                    else:
                        print(f"  ⚠️  Not found: {name}")
                        continue
                targets.append(p)

            print(f"   (Read {len(filenames)} selection(s) from {selections_path.name})")
        else:
            print("\n❌ No images specified.")
            print("   Options:")
            print("     python -m AssetFlow rembg-review          # open visual dashboard to pick images")
            print("     python -m AssetFlow rembg-apply --all     # process ALL candidates")
            print("     python -m AssetFlow rembg-apply img1 img2 # process specific files")
            return

    if not targets:
        print("\n✅ No images to process.")
        return

    print(f"\nAssetFlow — Background Removal")
    print(f"=" * 50)
    print(f"Processing {len(targets)} image(s)...\n")

    success = 0
    for f in targets:
        nobg_path = f.parent / f"{f.stem}_nobg.png"
        result = remove_background(f, nobg_path)
        if result:
            size_kb = result.stat().st_size / 1024
            print(f"  ✅ {f.name} → {result.name} ({size_kb:.0f} KB)")
            success += 1
        else:
            print(f"  ❌ {f.name} — failed")

    print(f"\nDone: {success}/{len(targets)} images processed.")
    if success:
        print(f"Background-removed files saved alongside originals in: {output_dir}")


def cmd_check(args):
    """Check configuration status."""
    config = Config()
    issues = config.validate()

    print("AssetFlow Configuration Check")
    print("=" * 50)
    print("\n  -- Google Search (Primary Asset Source) --")
    print(f"  Serper API:     {'✅' if config.serper_api_key else '❌ Missing (get free key at serper.dev)'}")
    print("\n  -- Vision LLM --")
    print(f"  Provider:       {config.vision_llm_provider}")
    print(f"  Azure OpenAI:   {'✅' if config.azure_openai_key else '⚪ Not set'}")
    print(f"  Gemini API:     {'✅' if config.gemini_api_key else '⚪ Not set'}")
    print(f"  Vision LLM:     {'✅ ready' if config.has_vision_llm else '❌ not configured'}")
    print(f"  Text LLM:       {'✅ ready' if config.has_text_llm else '❌ not configured'}")
    print("\n  -- Pipeline --")
    print(f"  Staging dir:    {config.staging_dir}")
    print(f"  Output dir:     {config.output_dir}")
    print(f"  HITL dir:       {config.hitl_dir}")
    print(f"  Quality thresh: {config.quality_threshold}/10")
    print(f"  Candidates:     {config.candidates_per_source} per query")

    if issues:
        print(f"\n⚠️  {len(issues)} issues:")
        for issue in issues:
            print(f"   • {issue}")
    else:
        print("\n✅ All checks passed!")


def main():
    parser = argparse.ArgumentParser(
        prog="AssetFlow",
        description="AI-Driven Video Asset Pipeline — Google Search + Vision LLM + HITL",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ── run ──
    run_parser = subparsers.add_parser("run", help="Run the full asset pipeline")
    run_parser.add_argument("-s", "--script", required=True, help="Path to video script file")
    run_parser.add_argument("--style", help="Style anchor for visual consistency")
    run_parser.add_argument("--threshold", type=float, help="Quality threshold (1-10, default: 6)")
    run_parser.add_argument("--candidates", type=int, help="Candidates per query (default: 5)")
    run_parser.add_argument("--skip-vision", action="store_true", help="Skip Vision LLM evaluation")
    run_parser.add_argument("--force", action="store_true", help="Run despite config warnings")
    run_parser.add_argument("--fresh", action="store_true", help="Ignore cache, start from scratch")
    run_parser.add_argument("--refetch", type=int, nargs="+", metavar="SCENE_ID",
                            help="Re-fetch only these scene IDs (e.g. --refetch 3 5)")
    run_parser.add_argument("--phase", type=int, choices=[1, 2, 3], metavar="N",
                            help="Start from phase N (1-3). Earlier phases load from cache.")
    run_parser.add_argument("--format", choices=["16:9", "9:16"], default="16:9",
                            help="Target video format (default: 16:9)")

    # ── parse ──
    parse_parser = subparsers.add_parser("parse", help="Parse script only (Phase 1, no API calls)")
    parse_parser.add_argument("-s", "--script", required=True, help="Path to video script file")

    # ── resolve ──
    resolve_parser = subparsers.add_parser("resolve", help="Apply HITL selections")
    resolve_parser.add_argument("selections", nargs="?", default="selections.json",
                                help="Path to selections JSON (default: auto-detect from hitl_queue/)")

    # ── status ──
    status_parser = subparsers.add_parser("status", help="Show cache status for a script")
    status_parser.add_argument("-s", "--script", required=True, help="Path to video script file")

    # ── clear ──
    clear_parser = subparsers.add_parser("clear", help="Clear cached data")
    clear_parser.add_argument("-s", "--script", help="Script to clear cache for")
    clear_parser.add_argument("--scene", type=int, nargs="+", help="Specific scene IDs to clear")
    clear_parser.add_argument("--all", action="store_true", help="Clear ALL AssetFlow data")

    # ── check ──
    subparsers.add_parser("check", help="Check configuration status")

    # ── rembg-review ──
    subparsers.add_parser("rembg-review", help="List images recommended for background removal")

    # ── rembg-apply ──
    rembg_parser = subparsers.add_parser("rembg-apply", help="Remove background from selected images")
    rembg_parser.add_argument("images", nargs="*", help="Image filenames to process (from output/)")
    rembg_parser.add_argument("--all", action="store_true", help="Process ALL recommended images")

    args = parser.parse_args()
    setup_logging(args.verbose)

    if args.command == "run":
        cmd_run(args)
    elif args.command == "parse":
        cmd_parse(args)
    elif args.command == "resolve":
        cmd_resolve(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "clear":
        cmd_clear(args)
    elif args.command == "check":
        cmd_check(args)
    elif args.command == "rembg-review":
        cmd_rembg_review(args)
    elif args.command == "rembg-apply":
        cmd_rembg_apply(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
