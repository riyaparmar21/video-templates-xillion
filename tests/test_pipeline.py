#!/usr/bin/env python3
"""
Pipeline Test Suite

Tests for the script-to-video pipeline components:
  1. asset_manifest.py — classification, color extraction, manifest building
  2. pipeline.py — integer duration enforcement, template names
  3. generate.py — CLI argument parsing
  4. script_to_blueprint.py — import and function signature
  5. registry.ts bug fixes (verified indirectly)

Run:
    cd pipeline && python -m pytest ../tests/test_pipeline.py -v
    # or
    cd pipeline && python ../tests/test_pipeline.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add pipeline dir to path
PIPELINE_DIR = Path(__file__).parent.parent / "pipeline"
sys.path.insert(0, str(PIPELINE_DIR))

# ════════════════════════════════════════════
# Test 1: Asset classification
# ════════════════════════════════════════════

def test_classify_asset():
    from generator.asset_manifest import classify_asset

    # Logo patterns
    assert classify_asset("logo.png", ".png") == "logo"
    assert classify_asset("brand-mark.svg", ".svg") == "logo"
    assert classify_asset("company_logo_v2.jpeg", ".jpeg") == "logo"

    # Product patterns
    assert classify_asset("shoe-hero.avif", ".avif") == "product"
    assert classify_asset("product-shot.png", ".png") == "product"
    assert classify_asset("app-screenshot.png", ".png") == "product"

    # Screenshot patterns
    assert classify_asset("dashboard.png", ".png", width=1920, height=1080) == "screenshot"
    assert classify_asset("ui-mockup.png", ".png") == "product"  # "mockup" matches product before "ui" matches screenshot
    assert classify_asset("web-interface.png", ".png") == "screenshot"

    # Icon patterns
    assert classify_asset("icon-check.svg", ".svg") == "icon"
    assert classify_asset("random.svg", ".svg") == "icon"  # SVGs default to icon

    # Texture patterns
    assert classify_asset("bg-gradient.png", ".png") == "texture"
    assert classify_asset("background-pattern.jpg", ".jpg") == "texture"

    # Data visual patterns
    assert classify_asset("revenue-chart.png", ".png") == "data-visual"
    assert classify_asset("growth-graph.jpg", ".jpg") == "data-visual"

    # Lifestyle patterns
    assert classify_asset("team-photo.jpg", ".jpg") == "lifestyle"
    assert classify_asset("people-office.png", ".png") == "lifestyle"

    # Uncategorized (no pattern match, no dimension heuristics)
    assert classify_asset("runner.jpg", ".jpg") == "uncategorized"
    assert classify_asset("kanban.jpeg", ".jpeg") == "uncategorized"

    print("  ✓ test_classify_asset passed")


def test_classify_by_dimensions():
    from generator.asset_manifest import classify_asset

    # Small transparent PNG → logo
    assert classify_asset("unknown.png", ".png", width=128, height=128, has_transparency=True) == "logo"

    # Very small → icon
    assert classify_asset("unknown.png", ".png", width=64, height=64) == "icon"

    # Large square → texture
    assert classify_asset("unknown.jpg", ".jpg", width=2000, height=1800) == "texture"

    print("  ✓ test_classify_by_dimensions passed")


# ════════════════════════════════════════════
# Test 2: Dominant color extraction
# ════════════════════════════════════════════

def test_dominant_colors():
    from generator.asset_manifest import extract_dominant_colors

    test_dir = Path(__file__).parent.parent / "test_scripts" / "assets_saas"
    logo_path = test_dir / "logo.jpeg"

    if logo_path.exists():
        colors = extract_dominant_colors(str(logo_path), n_colors=3)
        assert len(colors) > 0, "Should extract at least 1 color"
        assert all(c.startswith("#") for c in colors), "Colors should be hex strings"
        assert all(len(c) == 7 for c in colors), "Colors should be #RRGGBB format"
        print(f"  ✓ test_dominant_colors passed (extracted {len(colors)} colors: {colors})")
    else:
        print(f"  ⚠ test_dominant_colors skipped (logo.jpeg not found)")


# ════════════════════════════════════════════
# Test 3: Build manifest with real assets
# ════════════════════════════════════════════

def test_build_manifest_saas():
    from generator.asset_manifest import build_manifest

    test_dir = Path(__file__).parent.parent / "test_scripts" / "assets_saas"
    if not test_dir.exists():
        print("  ⚠ test_build_manifest_saas skipped (assets_saas not found)")
        return

    manifest = asyncio.run(build_manifest(str(test_dir)))

    assert manifest["asset_count"] == 3, f"Expected 3 assets, got {manifest['asset_count']}"
    assert "by_category" in manifest
    assert "category_summary" in manifest
    assert "logo" in manifest["category_summary"], "Should find logo.jpeg as 'logo'"

    # Check all assets have required fields
    for asset in manifest["assets"]:
        assert "path" in asset
        assert "category" in asset
        assert "dominant_colors" in asset

    print(f"  ✓ test_build_manifest_saas passed ({manifest['category_summary']})")


def test_build_manifest_fintech():
    from generator.asset_manifest import build_manifest

    test_dir = Path(__file__).parent.parent / "test_scripts" / "assets_fintech"
    if not test_dir.exists():
        print("  ⚠ test_build_manifest_fintech skipped (assets_fintech not found)")
        return

    manifest = asyncio.run(build_manifest(str(test_dir)))

    assert manifest["asset_count"] == 3
    assert "logo" in manifest["category_summary"]
    assert "product" in manifest["category_summary"]

    print(f"  ✓ test_build_manifest_fintech passed ({manifest['category_summary']})")


# ════════════════════════════════════════════
# Test 4: Integer duration enforcement
# ════════════════════════════════════════════

def test_enforce_integer_durations():
    from generator.pipeline import JsonVideoGenerator

    # Create a minimal spec with fractional durations
    spec = {
        "duration": 20,
        "scenes": [
            {"template": "ImpactNumber", "duration": 3.5},
            {"template": "ListReveal", "duration": 5.38},
            {"template": "GlassPanel", "duration": 4.12},
            {"template": "CallToAction", "duration": 7.0},
        ]
    }
    spec_json = json.dumps(spec)

    # Test the enforcement method
    gen = JsonVideoGenerator.__new__(JsonVideoGenerator)  # skip __init__
    result_json = gen._enforce_integer_durations(spec_json, 20.0)
    result = json.loads(result_json)

    # All durations should be integers
    for scene in result["scenes"]:
        assert isinstance(scene["duration"], int), f"Duration {scene['duration']} is not int"
        assert scene["duration"] >= 2, f"Duration {scene['duration']} < 2s minimum"

    # Total should match target
    total = sum(s["duration"] for s in result["scenes"])
    assert total == 20, f"Total {total}s != target 20s"
    assert result["duration"] == 20

    print(f"  ✓ test_enforce_integer_durations passed (durations: {[s['duration'] for s in result['scenes']]})")


def test_enforce_durations_overshoot():
    """Test that overshooting durations get corrected."""
    from generator.pipeline import JsonVideoGenerator

    spec = {
        "duration": 25,
        "scenes": [
            {"template": "A", "duration": 6},
            {"template": "B", "duration": 7},
            {"template": "C", "duration": 8},
            {"template": "D", "duration": 6},
        ]
    }  # total = 27, overshoot by 2

    gen = JsonVideoGenerator.__new__(JsonVideoGenerator)
    result = json.loads(gen._enforce_integer_durations(json.dumps(spec), 25.0))

    total = sum(s["duration"] for s in result["scenes"])
    assert total == 25, f"Total {total}s != target 25s"
    assert all(s["duration"] >= 2 for s in result["scenes"])

    print(f"  ✓ test_enforce_durations_overshoot passed (total: {total}s)")


# ════════════════════════════════════════════
# Test 5: Template names consistency
# ════════════════════════════════════════════

def test_template_names():
    from generator.pipeline import TEMPLATE_NAMES, PRIMARY_TEMPLATES

    # No duplicates
    assert len(TEMPLATE_NAMES) == len(set(TEMPLATE_NAMES)), "Duplicate template names found"

    # PRIMARY_TEMPLATES is a subset of TEMPLATE_NAMES
    for t in PRIMARY_TEMPLATES:
        assert t in TEMPLATE_NAMES, f"PRIMARY template '{t}' not in TEMPLATE_NAMES"

    # No "Parallex" typo
    for t in TEMPLATE_NAMES:
        assert "Parallex" not in t, f"Typo found: {t}"

    # ParallaxLayers exists (Bug #1 fix)
    assert "ParallaxLayers" in TEMPLATE_NAMES

    print(f"  ✓ test_template_names passed ({len(TEMPLATE_NAMES)} templates, {len(PRIMARY_TEMPLATES)} PRIMARY)")


# ════════════════════════════════════════════
# Test 6: Quality Checker prompt has integer rule
# ════════════════════════════════════════════

def test_quality_checker_prompt():
    from generator.pipeline import QUALITY_CHECKER_SYSTEM

    assert "WHOLE INTEGERS" in QUALITY_CHECKER_SYSTEM, "Quality Checker should enforce integer durations"
    assert "NEVER 3.5" in QUALITY_CHECKER_SYSTEM or "NEVER" in QUALITY_CHECKER_SYSTEM

    print("  ✓ test_quality_checker_prompt passed")


def test_scene_planner_prompt():
    from generator.pipeline import SCENE_PLANNER_SYSTEM

    assert "WHOLE INTEGERS" in SCENE_PLANNER_SYSTEM, "Scene Planner should enforce integer durations"

    print("  ✓ test_scene_planner_prompt passed")


# ════════════════════════════════════════════
# Test 7: generate.py CLI parsing
# ════════════════════════════════════════════

def test_generate_cli_help():
    """Verify generate.py has -s flag and it's mutually exclusive with -b."""
    import subprocess
    result = subprocess.run(
        [sys.executable, str(PIPELINE_DIR / "generate.py"), "--help"],
        capture_output=True, text=True
    )
    assert result.returncode == 0
    assert "-s SCRIPT" in result.stdout
    assert "--script SCRIPT" in result.stdout
    assert "--style STYLE" in result.stdout
    assert "--fonts FONTS" in result.stdout
    assert "--assets ASSETS" in result.stdout
    assert "-s SCRIPT | -b BLUEPRINT" in result.stdout  # mutual exclusivity

    print("  ✓ test_generate_cli_help passed")


def test_generate_mutual_exclusion():
    """Verify -s and -b can't be used together."""
    import subprocess
    result = subprocess.run(
        [sys.executable, str(PIPELINE_DIR / "generate.py"), "-s", "test.txt", "-b", "test.md"],
        capture_output=True, text=True
    )
    assert result.returncode != 0
    assert "not allowed" in result.stderr or "mutually exclusive" in result.stderr.lower() or result.returncode == 2

    print("  ✓ test_generate_mutual_exclusion passed")


# ════════════════════════════════════════════
# Test 8: script_to_blueprint imports
# ════════════════════════════════════════════

def test_script_to_blueprint_import():
    from script_to_blueprint import generate_blueprint
    import inspect

    sig = inspect.signature(generate_blueprint)
    params = list(sig.parameters.keys())
    assert "script_path" in params
    assert "target_duration" in params
    assert "style_preset" in params
    assert "font_override" in params
    assert "asset_manifest_path" in params

    print(f"  ✓ test_script_to_blueprint_import passed (params: {params})")


# ════════════════════════════════════════════
# Test 9: TextRevealWipe char-per-line fix
# ════════════════════════════════════════════

def test_text_reveal_wipe_fix():
    """Verify 0.48 factor is used instead of 0.55."""
    wipe_path = Path(__file__).parent.parent / "src" / "templates" / "TextRevealWipe" / "TextRevealWipe.tsx"
    if not wipe_path.exists():
        print("  ⚠ test_text_reveal_wipe_fix skipped (file not found)")
        return

    content = wipe_path.read_text()
    assert "* 0.48)" in content, "TextRevealWipe should use 0.48 factor"
    assert "* 0.55)" not in content, "TextRevealWipe should NOT have old 0.55 factor"

    print("  ✓ test_text_reveal_wipe_fix passed")


# ════════════════════════════════════════════
# Runner
# ════════════════════════════════════════════

def run_all():
    print("\n" + "=" * 60)
    print("  Pipeline Test Suite")
    print("=" * 60 + "\n")

    tests = [
        ("Asset Classification", test_classify_asset),
        ("Classification by Dimensions", test_classify_by_dimensions),
        ("Dominant Color Extraction", test_dominant_colors),
        ("Build Manifest (SaaS)", test_build_manifest_saas),
        ("Build Manifest (Fintech)", test_build_manifest_fintech),
        ("Integer Duration Enforcement", test_enforce_integer_durations),
        ("Duration Overshoot Fix", test_enforce_durations_overshoot),
        ("Template Names Consistency", test_template_names),
        ("Quality Checker Prompt", test_quality_checker_prompt),
        ("Scene Planner Prompt", test_scene_planner_prompt),
        ("CLI Help Flags", test_generate_cli_help),
        ("CLI Mutual Exclusion", test_generate_mutual_exclusion),
        ("script_to_blueprint Import", test_script_to_blueprint_import),
        ("TextRevealWipe 0.48 Fix", test_text_reveal_wipe_fix),
    ]

    passed = 0
    failed = 0
    skipped = 0

    for name, test_fn in tests:
        try:
            print(f"\n[{name}]")
            test_fn()
            passed += 1
        except AssertionError as e:
            print(f"  ✗ {name} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ✗ {name} ERROR: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"  Results: {passed} passed, {failed} failed")
    print(f"{'=' * 60}\n")

    return failed == 0


if __name__ == "__main__":
    os.chdir(str(PIPELINE_DIR))  # so relative imports work
    success = run_all()
    sys.exit(0 if success else 1)
