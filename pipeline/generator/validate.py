"""
Validation utilities for the video generation pipeline.
Includes TypeScript compilation check, JSON schema validation,
and test-frame rendering verification.
"""

import json
import subprocess
import re
import os
from pathlib import Path
from typing import Dict, List, Optional, Any


# Allowed transition types (must match schema.ts TransitionType enum)
ALLOWED_TRANSITIONS = [
    "crossfade", "wipe_left", "wipe_right",
    "slide_up", "slide_down",
    "zoom_in", "zoom_out",
    "none",
]

# Map common AI mistakes to valid transition names
TRANSITION_NORMALIZE = {
    # camelCase → snake_case
    "zoomIn": "zoom_in",
    "zoomOut": "zoom_out",
    "slideUp": "slide_up",
    "slideDown": "slide_down",
    "slideLeft": "wipe_left",
    "slideRight": "wipe_right",
    "wipeLeft": "wipe_left",
    "wipeRight": "wipe_right",
    # Invalid names → closest match
    "fadeToBlack": "crossfade",
    "fadeIn": "crossfade",
    "fadeOut": "crossfade",
    "fade": "crossfade",
    "cut": "none",
    "dissolve": "crossfade",
    "push_left": "wipe_left",
    "push_right": "wipe_right",
}


def _normalize_params_for_scene(scene: Dict[str, Any]) -> bool:
    """Normalize common param aliases per-template to match runtime expectations."""
    changed = False
    template = scene.get("template")
    params = scene.get("params")
    if not isinstance(params, dict):
        return False

    def set_if_missing(key: str, value: Any) -> None:
        nonlocal changed
        if key not in params and value is not None:
            params[key] = value
            changed = True

    # Template-specific aliases
    if template == "TitleSlide":
        set_if_missing("title", params.get("heading"))
        set_if_missing("subtitle", params.get("subheading"))
    elif template == "AnimatedChart":
        set_if_missing("items", params.get("data"))
    elif template == "QuoteHighlight":
        if "attribution" not in params and ("author" in params or "role" in params):
            author = params.get("author")
            role = params.get("role")
            if author:
                params["attribution"] = f"{author}, {role}" if role else author
                changed = True
    elif template == "CallToAction":
        set_if_missing("subheading", params.get("subtitle"))
        set_if_missing("buttonColor", params.get("accentColor"))
    elif template == "TextFocusZoom":
        set_if_missing("color", params.get("accentColor"))
    elif template == "ListReveal":
        set_if_missing("itemColor", params.get("accentColor"))
        if "style" in params:
            style = params["style"]
            mapped = (
                "bullets" if style in ("bullet", "bullets", "cards")
                else "numbers" if style in ("numbered", "numbers")
                else style
            )
            if mapped != style:
                params["style"] = mapped
                changed = True
    elif template == "QuestionReveal":
        set_if_missing("color", params.get("accentColor"))
    elif template == "CountUp":
        set_if_missing("target", params.get("number"))
        set_if_missing("label", params.get("sublabel"))
    elif template == "LogoReveal":
        set_if_missing("tagline", params.get("subtitle"))
        set_if_missing("color", params.get("accentColor"))
    elif template == "StackedBars":
        set_if_missing("style", params.get("animationStyle"))
        set_if_missing("showValues", params.get("showPercentage"))

    return changed


def _enforce_timeline_duration(spec: Dict[str, Any]) -> bool:
    """Scale scene durations so timeline length (with overlaps) matches spec.duration."""
    scenes = spec.get("scenes", [])
    target = spec.get("duration")
    if not scenes or not isinstance(target, (int, float)):
        return False

    def overlap_for_scene(scene: Dict[str, Any]) -> float:
        if scene.get("transition") == "none":
            return 0.0
        return float(scene.get("transitionDuration", 0) or 0)

    sum_dur = sum(float(s.get("duration", 0) or 0) for s in scenes)
    if sum_dur <= 0:
        return False

    overlap = sum(overlap_for_scene(s) for s in scenes[:-1])
    timeline = sum_dur - overlap
    diff = float(target) - timeline
    if abs(diff) < 0.01:
        return False

    desired_sum = float(target) + overlap
    scale = desired_sum / sum_dur
    for s in scenes:
        s["duration"] = round(float(s.get("duration", 0) or 0) * scale, 2)

    # Adjust last scene for rounding residue
    new_sum = sum(float(s.get("duration", 0) or 0) for s in scenes)
    residual = desired_sum - new_sum
    if scenes:
        last = scenes[-1]
        last["duration"] = round(max(1.0, float(last.get("duration", 0) or 0) + residual), 2)

    return True


def normalize_spec(spec_json: str) -> str:
    """
    Normalize AI-generated spec JSON to fix common issues:
    - Convert camelCase/invalid transition names to valid snake_case
    - Normalize param aliases across templates
    - Clamp transitionDuration and align timeline duration to spec.duration

    Always run this BEFORE validate_json_spec().
    """
    try:
        spec = json.loads(spec_json)
    except json.JSONDecodeError:
        return spec_json  # Let validation catch JSON errors

    changed = False
    for scene in spec.get("scenes", []):
        t = scene.get("transition", "crossfade")

        # Normalize transition type
        if t not in ALLOWED_TRANSITIONS:
            if t in TRANSITION_NORMALIZE:
                scene["transition"] = TRANSITION_NORMALIZE[t]
                changed = True
            else:
                scene["transition"] = "crossfade"
                changed = True

        # Normalize transitionDuration
        try:
            td = float(scene.get("transitionDuration", 0.5))
        except (TypeError, ValueError):
            td = 0.5
        if scene.get("transition") == "none":
            if td != 0:
                scene["transitionDuration"] = 0
                changed = True
        else:
            max_td = max(0.0, float(scene.get("duration", 0) or 0) * 0.5)
            td = max(0.0, min(td, max_td))
            if td != scene.get("transitionDuration"):
                scene["transitionDuration"] = td
                changed = True

        # Normalize params
        if _normalize_params_for_scene(scene):
            changed = True

    if _enforce_timeline_duration(spec):
        changed = True

    if changed:
        print("   [Normalize] Normalized spec fields")
        return json.dumps(spec)

    return spec_json


# Allowed template names for video specs
ALLOWED_TEMPLATES = [
    # Core 20 (Filler templates)
    "ImpactNumber",
    "TypewriterReveal",
    "QuoteHighlight",
    "TextFocusZoom",
    "ListReveal",
    "FloatingObjects",
    "GlassPanel",
    "IconGrid",
    "StackedBars",
    "ParallaxLayers",
    "TitleSlide",
    "SplitCompare",
    "Timeline",
    "CallToAction",
    "QuestionReveal",
    "TransitionWipe",
    "Atmosphere",
    "LogoReveal",
    "CountUp",
    "GlobeScene",
    # Phase 3 — Extended
    "AnimatedChart",
    "SvgMorph",
    "LottieScene",
    "ParticleField",
    # Phase 4 — Premium
    "ThreeScene",
    "VideoOverlay",
    "AudioWaveform",
    # PRIMARY folder-based templates (rich, cinematic, multi-phase)
    "KineticCaptions",
    "GenAiFeatures",
    "SlideshowSocial",
    "VaultAnimatedCards",
    "VaultCardFeatures",
    "Tweet",
    "Showcase",
    "DesignPreview",
    "StackHiring",
    "MobileShowreelFrames",
    "ShowreelGrid",
    "BlurTextScroller",
    "RouteText",
    "IOSNotification",
    "ProgressBar",
    "WhiteSocialHandle",
    "AnimatedSearchBar",
    "AnimatedWebScreens",
    "ParallaxImageReveal",
    "ThreeDCardFlip",
    "GradientWash",
    "SplitScreenMorph",
    "NumberCounterScene",
    "TextRevealWipe",
    "LogoStinger",
    "SpiralCaptions",
    "DepthCaptions",
]


def validate_typescript(file_path: str, project_dir: str = None) -> Dict[str, Any]:
    """
    Runs TypeScript compiler on a specific file to validate syntax.

    Args:
        file_path: Path to the TypeScript file to validate
        project_dir: Project directory (optional, defaults to current directory)

    Returns:
        Dictionary with keys:
            - valid (bool): Whether the file is valid
            - errors (list[str]): List of error messages
            - error_count (int): Number of errors found
    """
    if project_dir is None:
        project_dir = os.getcwd()

    try:
        # Run TypeScript compiler
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--skipLibCheck", file_path],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=30
        )

        errors = []
        if result.returncode != 0:
            # Parse error output
            error_output = result.stderr + result.stdout
            # Split by lines and filter error messages
            for line in error_output.split('\n'):
                if line.strip() and ('error' in line.lower() or 'ts(' in line):
                    errors.append(line.strip())

        return {
            "valid": result.returncode == 0,
            "errors": errors,
            "error_count": len(errors)
        }

    except FileNotFoundError:
        return {
            "valid": False,
            "errors": ["npx/tsc not found - ensure Node.js and TypeScript are installed"],
            "error_count": 1
        }
    except subprocess.TimeoutExpired:
        return {
            "valid": False,
            "errors": ["TypeScript compilation timed out"],
            "error_count": 1
        }
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"Error running TypeScript compiler: {str(e)}"],
            "error_count": 1
        }


def validate_json_spec(spec_json: str) -> Dict[str, Any]:
    """
    Validates a JSON string against the VideoSpec schema.

    Args:
        spec_json: JSON string containing video specification

    Returns:
        Dictionary with keys:
            - valid (bool): Whether the spec is valid
            - errors (list[str]): List of validation errors
            - warnings (list[str]): List of validation warnings
    """
    errors = []
    warnings = []

    # Step 1: Check if it's valid JSON
    try:
        spec = json.loads(spec_json)
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {str(e)}")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings
        }

    # Step 2: Check required root fields
    if not isinstance(spec, dict):
        errors.append("Spec must be a JSON object")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings
        }

    required_fields = ["palette", "duration", "scenes"]
    for field in required_fields:
        if field not in spec:
            errors.append(f"Missing required field: '{field}'")

    # Step 3: Validate palette (basic check)
    if "palette" in spec:
        if not isinstance(spec["palette"], dict):
            errors.append("'palette' must be an object")
        elif not spec["palette"]:
            warnings.append("'palette' is empty")

    # Step 4: Validate duration
    if "duration" in spec:
        if not isinstance(spec["duration"], (int, float)):
            errors.append("'duration' must be a number")
        elif spec["duration"] <= 0:
            errors.append("'duration' must be positive")

    # Step 5: Validate scenes
    if "scenes" in spec:
        if not isinstance(spec["scenes"], list):
            errors.append("'scenes' must be an array")
        elif len(spec["scenes"]) == 0:
            errors.append("'scenes' array cannot be empty")
        else:
            # Validate each scene
            for idx, scene in enumerate(spec["scenes"]):
                if not isinstance(scene, dict):
                    errors.append(f"Scene {idx} is not an object")
                    continue

                # Check required scene fields
                if "template" not in scene:
                    errors.append(f"Scene {idx}: missing required field 'template'")
                else:
                    template = scene["template"]
                    if template not in ALLOWED_TEMPLATES:
                        errors.append(
                            f"Scene {idx}: template '{template}' is not allowed. "
                            f"Allowed values: {', '.join(ALLOWED_TEMPLATES)}"
                        )

                if "duration" not in scene:
                    errors.append(f"Scene {idx}: missing required field 'duration'")
                else:
                    if not isinstance(scene["duration"], (int, float)):
                        errors.append(f"Scene {idx}: 'duration' must be a number")
                    elif scene["duration"] <= 0:
                        errors.append(f"Scene {idx}: 'duration' must be positive")

                if "params" not in scene:
                    warnings.append(f"Scene {idx}: missing 'params' field (will use defaults)")
                elif not isinstance(scene["params"], dict):
                    errors.append(f"Scene {idx}: 'params' must be an object")

                # Check transition type
                    if "transition" in scene:
                        t = scene["transition"]
                        if t not in ALLOWED_TRANSITIONS:
                            errors.append(
                                f"Scene {idx}: transition '{t}' is not valid. "
                                f"Run normalize_spec() first, or use one of: {', '.join(ALLOWED_TRANSITIONS)}"
                            )

            # Timeline duration check (accounts for overlaps)
            if "duration" in spec and isinstance(spec["duration"], (int, float)):
                sum_dur = sum(float(s.get("duration", 0) or 0) for s in spec["scenes"])
                overlap = sum(
                    float(s.get("transitionDuration", 0) or 0)
                    for s in spec["scenes"][:-1]
                    if s.get("transition") != "none"
                )
                timeline = sum_dur - overlap
                if abs(timeline - float(spec["duration"])) > 0.1:
                    warnings.append(
                        f"Timeline duration {timeline:.2f}s does not match spec.duration {spec['duration']}"
                    )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def render_test_frames(
    composition_id: str,
    project_dir: str,
    spec_json: str = None,
    frames: List[int] = None
) -> Dict[str, Any]:
    """
    Renders specific frames of a composition for visual verification.

    Args:
        composition_id: ID of the composition to render
        project_dir: Project directory containing the Remotion project
        spec_json: Optional JSON spec (for metadata)
        frames: Optional list of frame numbers to render (0-100 scale)
                Defaults to [0, 25, 50, 75, 100]

    Returns:
        Dictionary with keys:
            - success (bool): Whether rendering succeeded
            - frames_rendered (int): Number of frames successfully rendered
            - blank_frames (list[int]): Frame indices that rendered as black/blank
            - frame_paths (list[str]): Paths to rendered frame files
    """
    if frames is None:
        frames = [0, 25, 50, 75, 100]

    # Ensure output directory exists
    output_dir = Path(project_dir) / "temp" / "test_frames"
    output_dir.mkdir(parents=True, exist_ok=True)

    frame_paths = []
    blank_frames = []
    rendered_count = 0

    try:
        # Get video duration first
        cmd_duration = [
            "npx", "remotion", "info", composition_id,
            "--json"
        ]
        if spec_json:
            props = json.dumps({"specJson": spec_json})
            cmd_duration += ["--props", props]

        result = subprocess.run(
            cmd_duration,
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            return {
                "success": False,
                "frames_rendered": 0,
                "blank_frames": [],
                "frame_paths": []
            }

        # Parse duration from output
        try:
            info = json.loads(result.stdout)
            duration_ms = info.get("durationInMilliseconds", 0)
            fps = info.get("fps", 30)
            total_frames = int((duration_ms / 1000) * fps)
        except (json.JSONDecodeError, KeyError):
            total_frames = 300  # Default estimate
            fps = 30

        # Render each frame
        for frame_percent in frames:
            # Convert percentage to frame number
            frame_number = int((frame_percent / 100.0) * total_frames)

            # Output filename
            output_filename = f"frame_{frame_percent}percent.png"
            output_path = output_dir / output_filename

            # Run remotion still command
            cmd_render = [
                "npx", "remotion", "still",
                composition_id,
                str(output_path),
                "--frame", str(frame_number)
            ]
            if spec_json:
                props = json.dumps({"specJson": spec_json})
                cmd_render += ["--props", props]

            print(f"  Rendering frame at {frame_percent}% (frame {frame_number})...")

            result = subprocess.run(
                cmd_render,
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0 and output_path.exists():
                # Check if frame is blank (file size > 5KB heuristic)
                file_size = output_path.stat().st_size

                frame_paths.append(str(output_path))
                rendered_count += 1

                if file_size < 5000:  # Less than 5KB suggests mostly black
                    blank_frames.append(frame_percent)
                    print(f"    Warning: Frame may be blank (size: {file_size} bytes)")
                else:
                    print(f"    Successfully rendered (size: {file_size} bytes)")
            else:
                print(f"    Failed to render frame")

        return {
            "success": rendered_count > 0,
            "frames_rendered": rendered_count,
            "blank_frames": blank_frames,
            "frame_paths": frame_paths
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "frames_rendered": rendered_count,
            "blank_frames": blank_frames,
            "frame_paths": frame_paths
        }
    except Exception as e:
        print(f"  Error during frame rendering: {str(e)}")
        return {
            "success": False,
            "frames_rendered": rendered_count,
            "blank_frames": blank_frames,
            "frame_paths": frame_paths
        }


def validate_pipeline(spec_json: str, project_dir: str) -> Dict[str, Any]:
    """
    Runs all validations in sequence: JSON validation, then test frame rendering.

    Args:
        spec_json: JSON string containing video specification
        project_dir: Project directory containing the Remotion project

    Returns:
        Combined validation results
    """
    print("\n=== VIDEO PIPELINE VALIDATION ===\n")

    # Step 1: Validate JSON spec
    print("Step 1: Validating JSON specification...")
    json_validation = validate_json_spec(spec_json)

    if json_validation["errors"]:
        print("  Errors found:")
        for error in json_validation["errors"]:
            print(f"    - {error}")

    if json_validation["warnings"]:
        print("  Warnings:")
        for warning in json_validation["warnings"]:
            print(f"    - {warning}")

    if json_validation["valid"]:
        print("  JSON spec is valid!")
    else:
        print("  JSON spec validation failed!")
        return {
            "success": False,
            "json_validation": json_validation,
            "frame_rendering": None,
            "summary": "JSON validation failed - skipping frame rendering"
        }

    # Step 2: Render test frames
    print("\nStep 2: Rendering test frames...")

    # Extract composition_id from spec
    spec = json.loads(spec_json)
    composition_id = spec.get("compositionId", "GeneratedVideo")

    frame_rendering = render_test_frames(composition_id, project_dir, spec_json)

    if frame_rendering["success"]:
        print(f"  Successfully rendered {frame_rendering['frames_rendered']} frames")
        if frame_rendering["blank_frames"]:
            print(f"  Warning: {len(frame_rendering['blank_frames'])} frames appear to be blank")
    else:
        print("  Frame rendering failed")

    # Summary
    print("\n=== VALIDATION SUMMARY ===")
    success = json_validation["valid"] and frame_rendering["success"]
    print(f"Overall status: {'PASS' if success else 'FAIL'}")
    print(f"JSON validation: {'PASS' if json_validation['valid'] else 'FAIL'}")
    print(f"Frame rendering: {'PASS' if frame_rendering['success'] else 'FAIL'}")
    print()

    return {
        "success": success,
        "json_validation": json_validation,
        "frame_rendering": frame_rendering,
        "summary": f"Pipeline validation {'passed' if success else 'failed'}"
    }
