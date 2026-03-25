#!/usr/bin/env python3
"""
Kinetic Caption Generator — LLM-powered (Azure o4-mini)

Takes a raw script and generates kinetic-captions-spec.json
for the KineticCaptions Remotion template.

Usage:
    python pipeline/caption_gen.py "Let's be real. If you're still doing everything from scratch..."
    python pipeline/caption_gen.py -f script.txt
    python pipeline/caption_gen.py -f script.txt -o src/kinetic-captions-spec.json
    python pipeline/caption_gen.py -f script.txt --fps 30 --duration 16
"""

import argparse
import json
import os
import sys
from pathlib import Path

# ── Azure OpenAI setup ──

def get_client():
    """Initialize Azure OpenAI client for o4-mini."""
    try:
        from openai import AzureOpenAI
    except ImportError:
        print("Error: openai package required. Run: pip install openai")
        sys.exit(1)

    # Load .env from project root
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value:
                    os.environ.setdefault(key, value)

    endpoint = os.getenv("AZURE_GPT_IMAGE_ENDPOINT", "https://gpt-image-1-resource-xillion.openai.azure.com/")
    api_key = os.getenv("AZURE_OPENAI_KEY")
    deployment = os.getenv("AZURE_O4_DEPLOYMENT_NAME", "o4-mini")
    api_version = os.getenv("AZURE_O4_API_VERSION", "2024-12-01-preview")

    if not api_key:
        print("Error: AZURE_OPENAI_KEY not set")
        sys.exit(1)

    client = AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )
    return client, deployment


# ── System prompt for the LLM ──

SYSTEM_PROMPT = """You are a kinetic caption designer for short-form video (Reels/TikTok style).

Given a script, you produce a JSON spec for animated captions. The JSON drives a Remotion template that renders overlapping, punchy, kinetic text.

## Style Tokens
Each word gets one of these styles:
- "normal" — white, Montserrat 800, main readable text
- "filler" — gray italic, Raleway 300 italic, small connector words (if, the, in, and, to, a, from, etc.)
- "big" — white, Montserrat 900, extra large standalone impact word
- "emphasis-blue" — blue (#3B9EFF), Montserrat 900, key nouns/verbs/brands
- "emphasis-gold" — gold (#F5A623), Montserrat 900, action words/benefits
- "accent-blue" — blue, Montserrat 800, secondary emphasis
- "big-blue" — blue, Montserrat 900, large impact word in blue

## Layout Rules
1. Each caption group shows 1-2 lines on screen at once
2. Groups contain 1-4 words max (keep it punchy)
3. Line 1 is usually context/filler, Line 2 is the punch/emphasis word
4. Big standalone words (impact moments) get their own single-line group
5. Connector words (if, the, in, from, to, a, and, because, but) → "filler"
6. Brand names, product names → "emphasis-blue"
7. Action words, benefits, outcomes → "emphasis-gold"
8. Big dramatic moments → "big" or "big-blue"

## Timing Rules (at 30fps)
- Average speaking pace: ~3 words/second
- Single word groups: 14-20 frames
- Two word groups: 20-28 frames
- Three+ word groups: 26-34 frames
- Leave NO gaps between groups (next startFrame = prev startFrame + prev durationFrames)
- Total frames = fps × duration_seconds

## Output Format
Return ONLY valid JSON (no markdown, no explanation):
{
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "durationFrames": <total>,
  "videoSrc": null,
  "groups": [
    {
      "id": 1,
      "startFrame": 0,
      "durationFrames": 18,
      "lines": [
        { "words": [{ "text": "word", "style": "normal" }] },
        { "words": [{ "text": "punch", "style": "emphasis-gold" }] }
      ]
    }
  ]
}

## Creative Direction
- Make it feel like a high-energy TikTok/Reel caption style
- Alternate between filler+emphasis combos and big standalone impact words
- Use color strategically — gold for benefits/actions, blue for brands/key nouns
- Every 3-5 groups, drop a big standalone word for rhythm
- The flow should feel like: setup → punch → setup → punch → big moment → repeat"""


def generate_caption_spec(script: str, fps: int = 30, duration: float = None) -> dict:
    """Call o4-mini to generate the caption spec from a script."""
    client, deployment = get_client()

    # Estimate duration from word count if not provided
    word_count = len(script.split())
    if duration is None:
        duration = max(8, word_count / 2.8)  # ~2.8 words/sec with pauses

    total_frames = int(fps * duration)

    user_prompt = f"""Generate a kinetic caption spec for this script:

---
{script}
---

Settings:
- fps: {fps}
- duration: {duration:.1f} seconds
- total frames: {total_frames}
- word count: {word_count}

Return ONLY the JSON spec. No markdown fences, no explanation."""

    print(f"[CaptionGen] Calling {deployment}...")
    print(f"   Script: {word_count} words, {duration:.1f}s, {total_frames} frames @ {fps}fps")

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=1,  # o4-mini requires temperature=1
        max_completion_tokens=16384,  # o4-mini uses reasoning tokens — needs high budget
    )

    raw = response.choices[0].message.content
    if raw is None:
        # o4-mini may use reasoning — check for refusal or empty
        print(f"[CaptionGen] Warning: empty content. Finish reason: {response.choices[0].finish_reason}")
        # Try output_text if available (reasoning models)
        if hasattr(response.choices[0].message, 'refusal') and response.choices[0].message.refusal:
            print(f"[CaptionGen] Refusal: {response.choices[0].message.refusal}")
            sys.exit(1)
        raw = ""

    raw = raw.strip()
    print(f"[CaptionGen] Got {len(raw)} chars from {deployment}")

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    # Find JSON object in response
    json_start = raw.find("{")
    json_end = raw.rfind("}") + 1
    if json_start >= 0 and json_end > json_start:
        raw = raw[json_start:json_end]

    spec = json.loads(raw)

    # Validate and fix
    spec["fps"] = fps
    spec["width"] = 1080
    spec["height"] = 1920
    spec["durationFrames"] = total_frames
    if "videoSrc" not in spec:
        spec["videoSrc"] = None

    # Verify groups don't exceed total frames
    if spec["groups"]:
        last = spec["groups"][-1]
        end_frame = last["startFrame"] + last["durationFrames"]
        if end_frame > total_frames:
            # Scale down proportionally
            scale = total_frames / end_frame
            for g in spec["groups"]:
                g["startFrame"] = int(g["startFrame"] * scale)
                g["durationFrames"] = max(10, int(g["durationFrames"] * scale))

    n_groups = len(spec["groups"])
    n_words = sum(
        len(w["text"].split())
        for g in spec["groups"]
        for l in g["lines"]
        for w in l["words"]
    )
    print(f"[CaptionGen] Generated {n_groups} groups, {n_words} words")

    return spec


def main():
    parser = argparse.ArgumentParser(description="Generate kinetic caption spec from script")
    parser.add_argument("script", nargs="?", help="Script text (inline)")
    parser.add_argument("-f", "--file", help="Read script from file")
    parser.add_argument("-o", "--output", default="src/kinetic-captions-spec.json", help="Output JSON path")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--duration", type=float, default=None, help="Duration in seconds (auto-estimated if omitted)")
    args = parser.parse_args()

    # Get script text
    if args.file:
        script = Path(args.file).read_text().strip()
    elif args.script:
        script = args.script
    else:
        print("Error: provide script text or -f script.txt")
        sys.exit(1)

    # Generate
    spec = generate_caption_spec(script, fps=args.fps, duration=args.duration)

    # Write output
    project_root = Path(__file__).parent.parent
    out_path = project_root / args.output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(spec, indent=2) + "\n")
    print(f"[CaptionGen] Saved → {out_path}")


if __name__ == "__main__":
    main()
