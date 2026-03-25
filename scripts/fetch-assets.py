#!/usr/bin/env python3
"""
Unified Asset Fetcher — wraps Pexels + Pixabay APIs

Provides a single CLI for fetching stock videos and photos, plus
a preset system for common video template needs.

Usage:
  # Fetch from both APIs at once
  python3 fetch-assets.py --query "abstract dark background" --type video --count 5

  # Use a preset (curated queries for video templates)
  python3 fetch-assets.py --preset backgrounds
  python3 fetch-assets.py --preset overlays
  python3 fetch-assets.py --preset all

  # Fetch from specific source only
  python3 fetch-assets.py --query "particles" --type video --source pexels

  # Dry run to preview results
  python3 fetch-assets.py --preset backgrounds --dry-run

  # List available presets
  python3 fetch-assets.py --list-presets

Requires: PEXELS_API_KEY and/or PIXABAY_API_KEY in .env
"""

import os
import sys
import json
import argparse
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_DIR / "assets"

# ============================================================
# PRESETS — Curated search queries for video template assets
# ============================================================

PRESETS = {
    "backgrounds": {
        "description": "Dark/abstract background videos for template base layers",
        "searches": [
            {"type": "video", "query": "abstract dark background", "count": 2, "source": "pixabay"},
            {"type": "video", "query": "particles floating black", "count": 1, "source": "pixabay"},
            {"type": "photo", "query": "dark texture abstract", "count": 2, "source": "pixabay"},
        ],
    },
    "overlays": {
        "description": "Light leaks, film grain, particle effects for compositing",
        "searches": [
            {"type": "video", "query": "light leak overlay", "count": 1, "source": "pixabay"},
            {"type": "video", "query": "film grain texture", "count": 1, "source": "pixabay"},
        ],
    },
    "transitions": {
        "description": "Transition-style videos and patterns",
        "searches": [
            {"type": "video", "query": "ink drop water", "count": 1, "source": "pixabay"},
        ],
    },
    "nature": {
        "description": "Nature footage for background/B-roll",
        "searches": [
            {"type": "video", "query": "ocean waves aerial", "count": 1, "source": "pixabay"},
            {"type": "photo", "query": "mountain landscape dramatic", "count": 2, "source": "pixabay"},
        ],
    },
    "tech": {
        "description": "Tech/digital footage for tech-themed templates",
        "searches": [
            {"type": "video", "query": "circuit board technology", "count": 1, "source": "pixabay"},
            {"type": "photo", "query": "technology abstract neon", "count": 2, "source": "pixabay"},
        ],
    },
}


def has_api_key(source: str) -> bool:
    """Check if an API key exists for the given source."""
    env_var = f"{source.upper()}_API_KEY"
    if os.environ.get(env_var):
        return True
    env_file = PROJECT_DIR / ".env"
    if env_file.exists():
        content = env_file.read_text()
        for line in content.splitlines():
            if line.strip().startswith(f"{env_var}="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val and val != "your_key_here":
                    return True
    return False


def run_fetch(source: str, asset_type: str, query: str, count: int,
              dry_run: bool = False, extra_args: list = None):
    """Run a fetch script for the given source."""
    script = SCRIPT_DIR / f"fetch-{source}.py"
    if not script.exists():
        print(f"  ⚠ Script not found: {script}")
        return

    cmd = [
        sys.executable, str(script),
        "--type", asset_type,
        "--query", query,
        "--count", str(count),
    ]
    if dry_run:
        cmd.append("--dry-run")
    if extra_args:
        cmd.extend(extra_args)

    result = subprocess.run(cmd, cwd=str(PROJECT_DIR))
    return result.returncode == 0


def run_preset(preset_name: str, dry_run: bool = False):
    """Run all searches for a preset."""
    preset = PRESETS.get(preset_name)
    if not preset:
        print(f"Unknown preset: {preset_name}")
        print(f"Available: {', '.join(PRESETS.keys())}")
        return

    print(f"═══ Preset: {preset_name} ═══")
    print(f"    {preset['description']}")
    print()

    available_sources = []
    if has_api_key("pexels"):
        available_sources.append("pexels")
    if has_api_key("pixabay"):
        available_sources.append("pixabay")

    if not available_sources:
        print("ERROR: No API keys found. Add to .env:")
        print("  PEXELS_API_KEY=your_key_here")
        print("  PIXABAY_API_KEY=your_key_here")
        return

    print(f"Available APIs: {', '.join(available_sources)}")
    print()

    total_searches = 0
    for search in preset["searches"]:
        source = search.get("source", "both")

        sources_to_use = []
        if source == "both":
            sources_to_use = available_sources
        elif source in available_sources:
            sources_to_use = [source]
        else:
            print(f"  ⚠ Skipping \"{search['query']}\" — {source} API key not available")
            continue

        for src in sources_to_use:
            print(f"── {src}: {search['type']} → \"{search['query']}\" (×{search['count']})")
            run_fetch(src, search["type"], search["query"], search["count"], dry_run=dry_run)
            total_searches += 1
            print()

    print(f"═══ Preset '{preset_name}' complete: {total_searches} searches run ═══")


def list_presets():
    """Print available presets."""
    print("Available presets:\n")
    for name, preset in PRESETS.items():
        search_count = len(preset["searches"])
        total_items = sum(s["count"] for s in preset["searches"])
        print(f"  {name}")
        print(f"    {preset['description']}")
        print(f"    {search_count} searches, ~{total_items} items")
        print()

    print("Usage: python3 fetch-assets.py --preset <name>")
    print("       python3 fetch-assets.py --preset all")


def main():
    parser = argparse.ArgumentParser(description="Unified asset fetcher (Pexels + Pixabay)")

    # Mode 1: Direct search
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--type", choices=["video", "photo"], help="Asset type")
    parser.add_argument("--count", type=int, default=5, help="Number of results")
    parser.add_argument("--source", choices=["pexels", "pixabay", "both"],
                        default="both", help="Which API to use")

    # Mode 2: Presets
    parser.add_argument("--preset", help="Run a curated preset (or 'all')")
    parser.add_argument("--list-presets", action="store_true", help="List available presets")

    # Common flags
    parser.add_argument("--dry-run", action="store_true", help="Preview without downloading")

    args = parser.parse_args()

    if args.list_presets:
        list_presets()
        return

    if args.preset:
        if args.preset == "all":
            for name in PRESETS:
                run_preset(name, dry_run=args.dry_run)
                print("\n")
        else:
            run_preset(args.preset, dry_run=args.dry_run)
        return

    if args.query and args.type:
        sources = []
        if args.source == "both":
            if has_api_key("pexels"):
                sources.append("pexels")
            if has_api_key("pixabay"):
                sources.append("pixabay")
        else:
            sources = [args.source]

        if not sources:
            print("ERROR: No API keys available for the requested source(s).")
            print("Add to .env: PEXELS_API_KEY=... and/or PIXABAY_API_KEY=...")
            sys.exit(1)

        for src in sources:
            print(f"── {src}: {args.type} → \"{args.query}\"")
            run_fetch(src, args.type, args.query, args.count, dry_run=args.dry_run)
            print()
        return

    parser.print_help()


if __name__ == "__main__":
    main()
