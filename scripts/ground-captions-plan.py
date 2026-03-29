#!/usr/bin/env python3
"""
ground-captions-plan.py — LLM-powered ground caption placement.

Usage:
  python3 scripts/ground-captions-plan.py <image_path> [options]

  Options:
    --text "LINE1|LINE2|LINE3"   Caption text (pipe-separated lines)
    --font "FontName"            Google Font family name
    --color "#FFFFFF"            Text color (hex)

Examples:
  python3 scripts/ground-captions-plan.py photo.jpg
  python3 scripts/ground-captions-plan.py photo.jpg --text "HELLO|WORLD"
  python3 scripts/ground-captions-plan.py photo.jpg --text "STOP" --font "Bebas Neue" --color "#FF0000"

Flow:
  1. Copy image → public/groundCaptions/background.png
  2. Send image to LLM vision → get rotateX, rotateZ, scaleY, position, fontSize
  3. Write src/ground-captions-spec.json

Supports: Azure OpenAI (GPT-4o), Gemini. Reads keys from .env
"""

import argparse
import base64
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public" / "groundCaptions"
SPEC_PATH = ROOT / "src" / "ground-captions-spec.json"


def load_env():
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if val and key not in os.environ:
                    os.environ[key] = val


load_env()


# ── The prompt that teaches the LLM about CSS 3D ground text ──
ANALYSIS_PROMPT = """You are an expert at CSS 3D transforms for placing text on the ground in images.

Given this image, I need to place large bold text so it looks PAINTED ON THE GROUND surface — like stadium text or street art seen from the camera's perspective.

The CSS 3D transform uses these properties on the text element:
  transform: rotateX(Xdeg) rotateZ(Zdeg) scaleY(S);
  perspective: Ppx;  (on the parent container)

Here's what each does:
- **rotateX**: Tilts text forward into the ground plane. 0° = flat facing camera, 90° = completely flat on floor.
  - Overhead/drone shots (looking straight down): 40-55°
  - Angled overhead (45° down): 50-65°
  - Low angle (near eye level): 65-80°

- **rotateZ**: Rotates text to match the ground's direction/slope.
  - If the ground lines go slightly uphill to the right: negative rotateZ
  - If ground lines go slightly uphill to the left: positive rotateZ
  - Range: typically -20° to +20°

- **scaleY**: Vertical stretch to compensate for rotateX compression.
  - Typical range: 1.5 to 3.5x depending on rotateX
  - Higher rotateX needs higher scaleY

- **perspective**: Distance from viewer. Controls how dramatic the foreshortening is.
  - IMPORTANT: perspective must be large enough that text doesn't clip behind the camera
  - Safe range: 800-2000px for font sizes 150-300px
  - Lower = more dramatic size difference between top and bottom lines
  - Higher = more uniform/subtle

- **position (x%, y%)**: Where to place the text center on the image.
  - x: 0% = left edge, 50% = center, 100% = right edge
  - y: 0% = top, 50% = middle, 100% = bottom
  - Place text on EMPTY ground area, avoid the subject/person
  - Text should be on the ground surface, typically in the lower 50-80% of the image

- **fontSize**: In pixels, for a 1080x1920 canvas.
  - Should be large enough to be impactful (150-300px)
  - Consider how many characters per line

CALIBRATION EXAMPLES (real values that looked good on similar images):

Example 1 — Overhead tiled floor, person standing, camera ~45° down:
  {"rotateX": 60, "rotateZ": -5, "scaleY": 2.5, "perspective": 1500, "positionX": 50, "positionY": 80, "fontSize": 200}

Example 2 — Angled shot, tiled floor sloping right, person center:
  {"rotateX": 48, "rotateZ": -6, "scaleY": 2.4, "perspective": 1448, "positionX": 40, "positionY": 76, "fontSize": 253}

Key patterns from calibration:
- rotateX is typically 45-65° for overhead/angled shots (NOT 70-80° — that's too extreme)
- scaleY is typically 2.0-3.5 (NOT 5-7 — that over-stretches)
- perspective is typically 1000-2000px (NOT 300-500 — that causes clipping)
- fontSize 180-280px fills the frame nicely at 1080p

Analyze this image and determine:
1. What kind of shot is this? (overhead, angled, eye-level)
2. What direction does the ground slope/recede?
3. Where is the empty ground space for text?

Then return ONLY a JSON object (no markdown, no explanation, no code fences) with these exact keys:
{"rotateX": <number>, "rotateZ": <number>, "scaleY": <number>, "perspective": <number>, "positionX": <number>, "positionY": <number>, "fontSize": <number>}"""


def copy_to_public(src: Path):
    from PIL import Image as PILImage

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    dst = PUBLIC_DIR / "background.png"
    img = PILImage.open(src)
    img.save(dst, "PNG")
    return "groundCaptions/background.png"


def image_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def mime_type(path: Path) -> str:
    ext = path.suffix.lower().lstrip(".")
    return f"image/{'jpeg' if ext == 'jpg' else ext}"


def analyze_with_azure(image_path: Path) -> dict:
    """Send image to Azure OpenAI GPT-4o vision."""
    from openai import AzureOpenAI

    endpoint = os.environ.get("AZURE_GPT_IMAGE_ENDPOINT", "").rstrip("/")
    key = os.environ.get("AZURE_OPENAI_KEY", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")
    api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")

    client = AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=key,
        api_version=api_version,
    )

    b64 = image_to_base64(image_path)
    mt = mime_type(image_path)

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": ANALYSIS_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mt};base64,{b64}"},
                    },
                ],
            }
        ],
        max_tokens=300,
        temperature=0.3,
    )

    text = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
        text = text.strip()

    return json.loads(text)


def analyze_with_gemini(image_path: Path) -> dict:
    """Fallback: send image to Gemini vision."""
    import google.generativeai as genai

    genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(
        [
            ANALYSIS_PROMPT,
            {
                "mime_type": mime_type(image_path),
                "data": image_path.read_bytes(),
            },
        ]
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if "```" in text:
            text = text[: text.rfind("```")]
        text = text.strip()

    return json.loads(text)


def analyze_image(image_path: Path) -> dict:
    """Try Azure OpenAI first, fall back to Gemini."""
    if os.environ.get("AZURE_OPENAI_KEY"):
        try:
            return analyze_with_azure(image_path)
        except Exception as e:
            print(f"  Azure failed: {e}")
            print(f"  Trying Gemini fallback...")

    if os.environ.get("GEMINI_API_KEY"):
        return analyze_with_gemini(image_path)

    print("  ERROR: No API keys found (AZURE_OPENAI_KEY or GEMINI_API_KEY)")
    sys.exit(1)


def update_spec(bg_path_rel, perspective, position, font_size, lines, font_family, text_color):
    if SPEC_PATH.exists():
        with open(SPEC_PATH) as f:
            spec = json.load(f)
    else:
        spec = {
            "fps": 30,
            "width": 1080,
            "height": 1920,
            "durationFrames": 150,
            "durationMs": 5000,
            "showBackground": True,
            "backgroundColor": "#222",
            "enableShadow": True,
            "lineHeight": 0.85,
            "animation": "slideForward",
            "blendMode": "normal",
            "textOpacity": 0.95,
        }

    spec["backgroundImage"] = bg_path_rel
    spec["videoSrc"] = None
    spec["fontSize"] = font_size
    spec["perspective"] = perspective
    spec["position"] = position
    spec["textColor"] = text_color
    spec["fontFamily"] = font_family

    # Build lines with staggered start frames (8 frames apart)
    spec["lines"] = [
        {"text": line.strip(), "startFrame": i * 8}
        for i, line in enumerate(lines)
    ]

    with open(SPEC_PATH, "w") as f:
        json.dump(spec, f, indent=2)
        f.write("\n")


def main():
    parser = argparse.ArgumentParser(
        description="GroundCaptions — LLM-powered ground text placement",
    )
    parser.add_argument("image", help="Path to the background image")
    parser.add_argument("--text", "-t", help='Caption lines separated by | (e.g. "HELLO|WORLD")')
    parser.add_argument("--font", "-f", default="Archivo Black", help="Google Font family name (default: Archivo Black)")
    parser.add_argument("--color", "-c", default="#FFFFFF", help="Text color hex (default: #FFFFFF)")

    args = parser.parse_args()

    print("\n── GroundCaptions Plan (LLM-powered) ──\n")

    src = Path(args.image)
    if not src.is_absolute():
        src = ROOT / src
    if not src.exists():
        print(f"  ERROR: File not found: {args.image}")
        sys.exit(1)

    # Parse text lines
    if args.text:
        lines = [l.strip() for l in args.text.split("|") if l.strip()]
    else:
        # Keep existing lines from spec, or use default
        if SPEC_PATH.exists():
            with open(SPEC_PATH) as f:
                existing = json.load(f)
            lines = [l["text"] for l in existing.get("lines", [])]
        else:
            lines = ["KISI KO", "BATANA", "MAT"]

    print(f"  Image: {src.name}")
    print(f"  Text:  {' / '.join(lines)}")
    print(f"  Font:  {args.font}")
    print(f"  Color: {args.color}")

    # Step 1: Copy image
    bg_rel = copy_to_public(src)
    print(f"  Copied → public/groundCaptions/background.png")

    # Step 2: Ask LLM to analyze the image
    print(f"  Analyzing image with LLM...")
    result = analyze_image(src)
    print(f"  ✓ Analysis complete\n")

    rx = result["rotateX"]
    rz = result["rotateZ"]
    sy = result["scaleY"]
    pd = result["perspective"]
    px = result["positionX"]
    py = result["positionY"]
    fs = result["fontSize"]

    print(f"  rotateX:     {rx}°  (tilt into ground)")
    print(f"  rotateZ:     {rz}°  (ground direction)")
    print(f"  scaleY:      {sy}x")
    print(f"  perspective: {pd}px")
    print(f"  position:    ({px}%, {py}%)")
    print(f"  fontSize:    {fs}px")

    # Step 3: Write spec
    perspective = {
        "distance": pd,
        "rotateX": rx,
        "rotateY": 0,
        "rotateZ": rz,
        "scaleY": sy,
    }

    update_spec(bg_rel, perspective, {"x": px, "y": py}, fs, lines, args.font, args.color)
    print(f"\n  Spec → src/ground-captions-spec.json")
    print("  Run: npm start\n")


if __name__ == "__main__":
    main()
