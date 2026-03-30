"""
Phase 4: One-Shot SVG Fallback

When stock assets fail the quality gate, generate custom SVG graphics
using the text LLM. Produces multiple distinct variants for HITL selection.
"""

import json
import logging
import subprocess
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config, PROJECT_ROOT
from AssetFlow.types import Scene, SVGVariant
from AssetFlow.llm_client import LLMClient, load_prompt, extract_json

logger = logging.getLogger("AssetFlow.phase4")


# ═══════════════════════════════════════════════════════════════
# SVG → PNG Rendering
# ═══════════════════════════════════════════════════════════════

def render_svg_to_png(svg_path: Path, png_path: Optional[Path] = None, width: int = 800) -> Optional[Path]:
    """
    Render an SVG file to PNG for preview.

    Tries (in order):
    1. Playwright (headless Chromium — already installed in this project)
    2. cairosvg (Python library)
    3. rsvg-convert (CLI tool, common on macOS via Homebrew)

    Args:
        svg_path: Path to the SVG file.
        png_path: Output PNG path. Defaults to svg_stem + ".png".
        width: Target width in pixels.

    Returns:
        Path to the rendered PNG, or None on failure.
    """
    if png_path is None:
        png_path = svg_path.with_suffix(".png")

    # Method 1: Playwright (primary — matches project's existing dependency)
    result = _render_with_playwright(svg_path, png_path, width)
    if result:
        return result

    # Method 2: cairosvg
    try:
        import cairosvg
        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(png_path),
            output_width=width,
        )
        logger.info(f"Rendered SVG → PNG (cairosvg): {png_path.name}")
        return png_path
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"cairosvg failed: {e}")

    # Method 3: rsvg-convert (CLI)
    try:
        proc = subprocess.run(
            ["rsvg-convert", "-w", str(width), "-o", str(png_path), str(svg_path)],
            capture_output=True,
            timeout=15,
        )
        if proc.returncode == 0 and png_path.exists():
            logger.info(f"Rendered SVG → PNG (rsvg-convert): {png_path.name}")
            return png_path
    except FileNotFoundError:
        pass
    except Exception as e:
        logger.warning(f"rsvg-convert failed: {e}")

    logger.error(f"Could not render SVG to PNG: {svg_path}")
    return None


def _render_with_playwright(svg_path: Path, png_path: Path, width: int = 800) -> Optional[Path]:
    """
    Render SVG → PNG using Playwright's headless Chromium.

    Writes a minimal HTML file that embeds the SVG, screenshots it with
    a transparent background, matching the pattern in render_with_playwright.cjs.
    """
    try:
        # Build the Node.js script using Playwright (matching project conventions)
        svg_abs = str(svg_path.resolve())
        png_abs = str(png_path.resolve())

        # Create a temp HTML file that loads the SVG — avoids shell escaping issues
        html_path = svg_path.with_suffix(".render.html")
        svg_content = svg_path.read_text(encoding="utf-8")
        html_content = f"""<!DOCTYPE html>
<html>
<head><style>
  * {{ margin: 0; padding: 0; }}
  body {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: {width}px;
    height: 600px;
    background: transparent;
    overflow: hidden;
  }}
  svg {{
    max-width: 100%;
    max-height: 100%;
  }}
</style></head>
<body>
{svg_content}
</body>
</html>"""
        html_path.write_text(html_content, encoding="utf-8")

        js_code = f"""
const {{ chromium }} = require('playwright');
(async () => {{
    const browser = await chromium.launch({{
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    }});
    const page = await browser.newPage({{
        viewport: {{ width: {width}, height: 600 }}
    }});
    await page.goto('file://{str(html_path.resolve())}', {{
        waitUntil: 'networkidle',
        timeout: 15000
    }});
    await page.screenshot({{
        path: '{png_abs}',
        type: 'png',
        omitBackground: true
    }});
    await browser.close();
}})();
"""
        proc = subprocess.run(
            ["node", "-e", js_code],
            capture_output=True,
            timeout=30,
            cwd=str(PROJECT_ROOT),  # so node_modules/playwright is found
        )

        # Clean up temp HTML
        html_path.unlink(missing_ok=True)

        if proc.returncode == 0 and png_path.exists():
            logger.info(f"Rendered SVG → PNG (playwright): {png_path.name}")
            return png_path
        else:
            stderr = proc.stderr.decode()[:300] if proc.stderr else ""
            logger.warning(f"Playwright render failed (exit {proc.returncode}): {stderr}")
            return None

    except FileNotFoundError:
        logger.warning("Playwright not found. Install with: npm install playwright")
        return None
    except Exception as e:
        logger.warning(f"Playwright render error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════
# SVG Generation
# ═══════════════════════════════════════════════════════════════

class SVGFallbackGenerator:
    """
    Generates custom SVG graphics when stock assets fail.
    Uses the text LLM to produce multiple variant SVGs in a single call.
    """

    def __init__(self, config: Config, llm: Optional[LLMClient] = None):
        self.config = config
        self.llm = llm or LLMClient(config)
        self.output_dir = config.staging_dir / "svg_fallback"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_variants(self, scene: Scene) -> list[SVGVariant]:
        """
        Generate multiple SVG variants for a scene using the text LLM.

        Args:
            scene: The scene that needs a custom graphic.

        Returns:
            List of SVGVariant objects with svg_code populated.
        """
        logger.info(f"Generating {self.config.svg_variants} SVG variants for scene {scene.scene_id}")

        system_prompt = load_prompt(
            "svg_generation",
            num_variants=self.config.svg_variants,
            scene_title=scene.title,
            scene_description=scene.description,
            visual_style=scene.visual_style or "modern, clean",
        )

        user_prompt = (
            f"Generate {self.config.svg_variants} distinct SVG variants for:\n\n"
            f"**Scene {scene.scene_id}: {scene.title}**\n"
            f"Description: {scene.description}\n"
            f"Style: {scene.visual_style or 'modern, clean'}\n\n"
            f"Return valid JSON with {self.config.svg_variants} variants."
        )

        try:
            raw_response = self.llm.text_call(system_prompt, user_prompt, temperature=0.8)
            variants_data = extract_json(raw_response)
        except Exception as e:
            logger.error(f"SVG generation LLM call failed: {e}")
            return []

        variants = []
        scene_dir = self.output_dir / f"scene_{scene.scene_id:03d}"
        scene_dir.mkdir(parents=True, exist_ok=True)

        for item in variants_data:
            variant_id = item.get("variant_id", chr(65 + len(variants)))  # A, B, C...
            svg_code = item.get("svg_code", "")

            if not svg_code or "<svg" not in svg_code.lower():
                logger.warning(f"Invalid SVG code for variant {variant_id}, skipping")
                continue

            # Save SVG to disk
            svg_path = scene_dir / f"variant_{variant_id}.svg"
            svg_path.write_text(svg_code, encoding="utf-8")

            # Render to PNG for preview
            png_path = scene_dir / f"variant_{variant_id}.png"
            rendered = render_svg_to_png(svg_path, png_path)

            variant = SVGVariant(
                variant_id=variant_id,
                scene_id=scene.scene_id,
                svg_code=svg_code,
                rendered_path=rendered,
                description=item.get("description", ""),
            )
            variants.append(variant)

        logger.info(f"Generated {len(variants)} SVG variants for scene {scene.scene_id}")
        return variants
