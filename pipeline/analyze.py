#!/usr/bin/env python3
"""
AI Video Analyzer — Generates blueprints from video + transcript.

Samples frames from the video, sends them (with transcript) to GPT-4o,
and produces a structured blueprint markdown file that the generation
pipeline can use. Caches everything in cache/analyses/ alongside other
pipeline caches. Copies the working blueprint to data/analysis/ for
easy access.

Usage:
    # Analyze video with transcript (recommended)
    python analyze.py input.mp4 -t data/stt/transcript.txt

    # Without transcript (visual-only analysis)
    python analyze.py input.mp4

    # Custom number of frames to sample
    python analyze.py input.mp4 -t transcript.txt --frames 12

    # Force re-analyze (ignore cache)
    python analyze.py input.mp4 -t transcript.txt --force

    # Use a specific output name
    python analyze.py input.mp4 -t transcript.txt -o my_blueprint

    # List cached analyses
    python analyze.py --list
"""

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

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

PROJECT_ROOT = Path(__file__).parent.parent
PIPELINE_DIR = Path(__file__).parent
DEFAULT_ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"

sys.path.insert(0, str(PIPELINE_DIR))
from generator.cache import PipelineCache


# ── Analysis Prompt ──

ANALYSIS_SYSTEM_PROMPT = """You are a professional video analyst and creative director.
You analyze videos to produce detailed blueprints that guide AI-powered motion graphics generation.

Your blueprint must be a structured markdown document that covers:

1. **Video Overview** — What is this video about? Who is the speaker? What's the tone?
2. **Key Sections** — Break the video into logical segments with timestamps and descriptions.
3. **Visual Themes** — What colors, moods, and visual styles would complement this content?
4. **Template Suggestions** — For each section, suggest which motion graphics templates would work.
5. **Media Asset Notes** — If there are products, logos, or specific visuals mentioned, note them.
6. **Pacing & Rhythm** — How should the visual energy flow? Where are the high/low energy moments?
7. **Text Overlays** — Key quotes, statistics, or callouts that should appear on screen.

Available templates for reference:
ImpactNumber, TypewriterReveal, QuoteHighlight, TextFocusZoom, ListReveal, FloatingObjects,
GlassPanel, IconGrid, StackedBars, ParallaxLayers, TitleSlide, SplitCompare, Timeline,
CallToAction, QuestionReveal, TransitionWipe, Atmosphere, LogoReveal, CountUp, GlobeScene,
AnimatedChart, SvgMorph, LottieScene, ParticleField, ThreeScene, VideoOverlay, AudioWaveform.

Output a complete markdown blueprint. Be specific about timestamps, colors (hex codes where possible),
and template selections. The more detail you provide, the better the generated video will be."""


def build_analysis_prompt(transcript: Optional[str], frame_count: int, duration: float) -> str:
    """Build the user prompt for video analysis."""
    parts = [
        f"Analyze this video and create a detailed blueprint for motion graphics generation.",
        f"",
        f"Video duration: {duration:.1f} seconds",
        f"Frames sampled: {frame_count} (evenly distributed across the video)",
    ]

    if transcript:
        # Truncate very long transcripts
        t = transcript[:5000] if len(transcript) > 5000 else transcript
        parts.append(f"")
        parts.append(f"## Transcript")
        parts.append(t)

    parts.append("")
    parts.append("Based on the video frames and transcript above, create a comprehensive blueprint.")
    parts.append("Structure it as a well-organized markdown document with the sections described in your instructions.")

    return "\n".join(parts)


# ── Frame Extraction ──

def extract_frames(
    video_path: str,
    output_dir: str,
    num_frames: int = 8,
    duration: float = 0,
) -> list[str]:
    """
    Extract evenly-spaced frames from a video using FFmpeg.
    Returns list of frame file paths.
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Clean previous frames
    for f in out.glob("frame_*.jpg"):
        f.unlink()

    if duration <= 0:
        # Get duration via ffprobe
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            duration = float(result.stdout.strip()) if result.returncode == 0 else 60.0
        except Exception:
            duration = 60.0

    # Calculate timestamps for evenly spaced frames
    interval = duration / (num_frames + 1)
    frame_paths = []

    for i in range(num_frames):
        timestamp = interval * (i + 1)
        frame_name = f"frame_{i+1:03d}.jpg"
        frame_path = out / frame_name

        cmd = [
            "ffmpeg", "-y",
            "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "3",       # good quality JPEG
            "-vf", "scale=960:-1",  # max 960px wide (save bandwidth)
            str(frame_path),
        ]

        try:
            subprocess.run(cmd, capture_output=True, timeout=30)
            if frame_path.exists() and frame_path.stat().st_size > 0:
                frame_paths.append(str(frame_path))
        except Exception:
            continue

    return frame_paths


# ── AI Analysis ──

def analyze_with_ai(
    frame_paths: list[str],
    transcript: Optional[str],
    duration: float,
    model: str = "gpt-4o",
) -> str:
    """Send frames + transcript to GPT-4o and get a blueprint back."""

    if not OPENAI_AVAILABLE:
        print("   [Error] openai not installed. pip install openai")
        sys.exit(1)

    endpoint = os.getenv("AZURE_GPT_IMAGE_ENDPOINT")
    key = os.getenv("AZURE_OPENAI_KEY")
    deployment = os.getenv("AZURE_GPT4O_DEPLOYMENT_NAME", model)
    api_version = os.getenv("AZURE_GPT4O_API_VERSION", "2024-12-01-preview")

    if not endpoint or not key:
        print("   [Error] AZURE_GPT_IMAGE_ENDPOINT and AZURE_OPENAI_KEY required in .env")
        sys.exit(1)

    client = AzureOpenAI(
        api_version=api_version,
        azure_endpoint=endpoint,
        api_key=key,
    )

    # Build message with images
    content = []

    # Text prompt first
    prompt_text = build_analysis_prompt(transcript, len(frame_paths), duration)
    content.append({"type": "text", "text": prompt_text})

    # Add frames as images
    for i, fp in enumerate(frame_paths):
        try:
            with open(fp, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{img_data}",
                    "detail": "low",  # save tokens
                },
            })
        except Exception as e:
            print(f"   [Warning] Could not load frame {i+1}: {e}")

    print(f"   Sending {len(frame_paths)} frames to {deployment}...")

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        max_tokens=4000,
    )

    blueprint = response.choices[0].message.content.strip()

    # Usage info
    usage = response.usage
    if usage:
        print(f"   Tokens: {usage.prompt_tokens} in, {usage.completion_tokens} out")

    return blueprint


# ── File Naming ──

def make_clean_name(video_path: str) -> str:
    """Clean video filename for use as blueprint name."""
    stem = Path(video_path).stem
    clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", stem)
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean.lower()[:60]


# ── Copy to data/analysis/ ──

def _copy_to_analysis(blueprint_content: str, video_path: Path, output_name: str) -> Path:
    """Copy blueprint to data/analysis/ for easy access."""
    DEFAULT_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    blueprint_path = DEFAULT_ANALYSIS_DIR / f"{output_name}.md"
    blueprint_path.write_text(blueprint_content)
    print(f"   [Copy] Copied blueprint to {blueprint_path}")
    return blueprint_path


# ── Main ──

def main():
    parser = argparse.ArgumentParser(
        description="Analyze a video and generate a blueprint for motion graphics"
    )
    parser.add_argument(
        "video", nargs="?",
        help="Path to input video file"
    )
    parser.add_argument(
        "-t", "--transcript",
        help="Path to transcript text file (from transcribe.py)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output blueprint name (default: derived from video filename)"
    )
    parser.add_argument(
        "--frames", type=int, default=8,
        help="Number of frames to sample from video (default: 8)"
    )
    parser.add_argument(
        "--model", default="gpt-4o",
        help="Azure OpenAI model for analysis (default: gpt-4o)"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Force re-analyze, ignoring cache"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List all cached analyses"
    )

    args = parser.parse_args()
    cache = PipelineCache(project_dir=str(PROJECT_ROOT))

    # --list
    if args.list:
        entries = cache.list_analyses()
        if not entries:
            print("No cached analyses found.")
        else:
            print(f"\nCached analyses ({len(entries)}):\n")
            for e in entries:
                print(f"  {e['video_name']}")
                print(f"    Blueprint: {e.get('blueprint_path', '?')}")
                print(f"    Frames: {e.get('frames_sampled', '?')} | Model: {e['model']}")
                print(f"    Cache: {e['dir']}")
                print()
        sys.exit(0)

    if not args.video:
        parser.error("video path is required (unless using --list)")

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"[Error] Video not found: {args.video}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  Video Analysis Pipeline")
    print(f"{'='*60}")
    print(f"   Video:  {video_path.name}")
    print(f"   Frames: {args.frames}")

    # Load transcript if provided
    transcript = None
    if args.transcript:
        tp = Path(args.transcript)
        if tp.exists():
            transcript = tp.read_text()
            print(f"   Transcript: {tp.name} ({len(transcript)} chars)")
        else:
            print(f"   [Warning] Transcript not found: {args.transcript}")

    # Check cache
    if not args.force and cache.has_analysis(str(video_path)):
        meta = cache.get_analysis_meta(str(video_path))
        analysis_dir = cache.get_analysis_dir(str(video_path))

        print(f"\n[Cache] Already analyzed!")
        print(f"   Cache dir: {analysis_dir}")
        if meta:
            bp_path = meta.get("blueprint_path", "?")
            print(f"   Blueprint: {bp_path}")
            print(f"   Model: {meta.get('model', '?')} | Frames: {meta.get('frames_sampled', '?')}")

        print(f"\n   Use --force to re-analyze.")
        print(f"\n   Next step:")
        t_flag = f" -t {args.transcript}" if args.transcript else ""
        bp = meta.get("blueprint_path", "data/analysis/blueprint.md") if meta else "data/analysis/blueprint.md"
        print(f"   python generate.py -b {bp}{t_flag} -v \"{args.video}\" --media assets/ --preview")
        sys.exit(0)

    # Get video duration
    duration = 0.0
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        duration = float(result.stdout.strip()) if result.returncode == 0 else 0.0
    except Exception:
        pass
    print(f"   Duration: {duration:.1f}s")

    # Step 1: Extract frames into cache/{video}/frames/
    print(f"\n[Step 1] Extracting {args.frames} frames...")
    frames_dir = cache.get_frames_dir(str(video_path))

    frame_paths = extract_frames(
        str(video_path),
        str(frames_dir),
        num_frames=args.frames,
        duration=duration,
    )
    print(f"   Extracted {len(frame_paths)} frames → {frames_dir}")

    if not frame_paths:
        print("[Error] No frames extracted. Check video file.")
        sys.exit(1)

    # Step 2: AI Analysis
    print(f"\n[Step 2] Analyzing with AI ({args.model})...")
    blueprint = analyze_with_ai(
        frame_paths,
        transcript,
        duration,
        model=args.model,
    )

    if not blueprint:
        print("[Error] AI returned empty analysis.")
        sys.exit(1)

    # Step 3: Save blueprint to cache/analyses/
    clean_name = make_clean_name(str(video_path))
    output_name = args.output or f"{clean_name}_blueprint"

    # Add metadata header
    header = f"""<!-- Generated by analyze.py -->
<!-- Video: {video_path.name} -->
<!-- Duration: {duration:.1f}s -->
<!-- Model: {args.model} -->
<!-- Frames: {len(frame_paths)} -->

"""
    full_blueprint = header + blueprint

    # Save to cache/analyses/ directory
    analysis_cache_dir = cache.get_analysis_dir(str(video_path))
    cached_bp_path = analysis_cache_dir / f"{output_name}.md"
    cached_bp_path.write_text(full_blueprint)
    print(f"\n[Step 3] Blueprint cached: {cached_bp_path}")

    # Save metadata
    cache.set_analysis_meta(str(video_path), {
        "video_name": video_path.name,
        "video_path": str(video_path.resolve()),
        "duration": duration,
        "model": args.model,
        "frames_sampled": len(frame_paths),
        "has_transcript": transcript is not None,
        "blueprint_path": str(DEFAULT_ANALYSIS_DIR / f"{output_name}.md"),
    })

    # Copy to data/analysis/ for easy access
    final_bp_path = _copy_to_analysis(full_blueprint, video_path, output_name)

    # Summary
    print(f"\n{'='*60}")
    print(f"  Analysis Complete!")
    print(f"{'='*60}")
    print(f"   Video:     {video_path.name}")
    print(f"   Duration:  {duration:.1f}s")
    print(f"   Blueprint: {final_bp_path}")
    print(f"   Cached in: {analysis_cache_dir}")
    print(f"   Length:    {len(blueprint)} chars")

    print(f"\n   Next step:")
    t_flag = f" -t {args.transcript}" if args.transcript else ""
    print(f"   python generate.py -b {final_bp_path}{t_flag} -v \"{args.video}\" --media assets/ --preview")
    print()


if __name__ == "__main__":
    main()
