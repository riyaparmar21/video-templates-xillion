#!/usr/bin/env python3
"""
AssetFlow CLI

Usage:
    # Full pipeline
    python -m AssetFlow run -s script.txt

    # With options
    python -m AssetFlow run -s script.txt --style "tech minimal" --threshold 7

    # Parse only (Phase 1 — no API calls)
    python -m AssetFlow parse -s script.txt

    # Resolve HITL selections
    python -m AssetFlow resolve selections.json

    # Check configuration
    python -m AssetFlow check
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from AssetFlow.config import Config
from AssetFlow.orchestrator import AssetFlowPipeline


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

    result = asyncio.run(pipeline.run(
        script_path=args.script,
        style_anchor=args.style or "",
        skip_vision=args.skip_vision,
    ))

    print("\n" + result.summary())

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
    """Run Phase 1 only (no API calls)."""
    config = Config()
    pipeline = AssetFlowPipeline(config)

    result = asyncio.run(pipeline.run(
        script_path=args.script,
        skip_fetch=True,
    ))

    output_file = config.output_dir / "phase_1_output.json"
    print(f"\n✅ Parsed {result.total_scenes} scenes")
    print(f"   Output: {output_file}")


def cmd_resolve(args):
    """Apply HITL selections."""
    config = Config()
    pipeline = AssetFlowPipeline(config)

    approved = asyncio.run(pipeline.resolve_hitl(args.selections))

    print(f"\n✅ Resolved {len(approved)} scenes:")
    for a in approved:
        print(f"   Scene {a.scene_id}: {a.final_path.name} ({a.source.value})")


def cmd_check(args):
    """Check configuration status."""
    config = Config()
    issues = config.validate()

    print("AssetFlow Configuration Check")
    print("=" * 40)
    print(f"  Pexels API:     {'✅' if config.pexels_api_key else '❌ Missing'}")
    print(f"  Pixabay API:    {'✅' if config.pixabay_api_key else '❌ Missing'}")
    print(f"  Iconify API:    ✅ (no key needed)")
    print(f"  Azure OpenAI:   {'✅' if config.azure_openai_key else '❌ Missing'}")
    print(f"  Gemini API:     {'✅' if config.gemini_api_key else '❌ Missing'}")
    print(f"  Vision LLM:     {config.vision_llm_provider} ({'✅ ready' if config.has_vision_llm else '❌ not configured'})")
    print(f"  Text LLM:       {'✅ ready' if config.has_text_llm else '❌ not configured'}")
    print(f"  Staging dir:    {config.staging_dir}")
    print(f"  Output dir:     {config.output_dir}")
    print(f"  HITL dir:       {config.hitl_dir}")
    print(f"  Quality thresh: {config.quality_threshold}/10")

    if issues:
        print(f"\n⚠️  {len(issues)} issues:")
        for issue in issues:
            print(f"   • {issue}")
    else:
        print("\n✅ All checks passed!")


def main():
    parser = argparse.ArgumentParser(
        prog="AssetFlow",
        description="AI-Driven Video Asset Pipeline with HITL Fallback",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ── run ──
    run_parser = subparsers.add_parser("run", help="Run the full asset pipeline")
    run_parser.add_argument("-s", "--script", required=True, help="Path to video script file")
    run_parser.add_argument("--style", help="Style anchor for visual consistency")
    run_parser.add_argument("--threshold", type=float, help="Quality threshold (1-10, default: 6)")
    run_parser.add_argument("--candidates", type=int, help="Candidates per source (default: 3)")
    run_parser.add_argument("--skip-vision", action="store_true", help="Skip Vision LLM evaluation")
    run_parser.add_argument("--force", action="store_true", help="Run despite config warnings")

    # ── parse ──
    parse_parser = subparsers.add_parser("parse", help="Parse script only (Phase 1, no API calls)")
    parse_parser.add_argument("-s", "--script", required=True, help="Path to video script file")

    # ── resolve ──
    resolve_parser = subparsers.add_parser("resolve", help="Apply HITL selections")
    resolve_parser.add_argument("selections", help="Path to hitl_selections.json")

    # ── check ──
    subparsers.add_parser("check", help="Check configuration status")

    args = parser.parse_args()
    setup_logging(args.verbose)

    if args.command == "run":
        cmd_run(args)
    elif args.command == "parse":
        cmd_parse(args)
    elif args.command == "resolve":
        cmd_resolve(args)
    elif args.command == "check":
        cmd_check(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
