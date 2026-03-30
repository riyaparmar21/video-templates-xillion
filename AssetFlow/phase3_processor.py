"""
Phase 3: Asset Processing & Vision AI Quality Gate

1. Smart pre-processing with rembg (skipping if alpha channel already exists)
2. Vision LLM evaluation and scoring
3. Threshold-based filtering
"""

import asyncio
import json
import logging
import struct
import zlib
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config
from AssetFlow.types import (
    AssetType,
    FetchedAsset,
    Scene,
    ScoredAsset,
)
from AssetFlow.llm_client import LLMClient, load_prompt, extract_json

logger = logging.getLogger("AssetFlow.phase3")


# ═══════════════════════════════════════════════════════════════
# Alpha Channel Detection
# ═══════════════════════════════════════════════════════════════

def has_alpha_channel(image_path: Path) -> bool:
    """
    Check if a PNG image already has an alpha channel.
    Uses lightweight header inspection — no PIL/Pillow needed.
    Falls back to Pillow if available for non-PNG formats.
    """
    suffix = image_path.suffix.lower()

    if suffix == ".svg":
        return True  # SVGs are inherently transparent

    if suffix == ".png":
        return _png_has_alpha(image_path)

    # For other formats, try Pillow
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            return img.mode in ("RGBA", "LA", "PA")
    except ImportError:
        return False
    except Exception:
        return False


def _png_has_alpha(path: Path) -> bool:
    """
    Inspect PNG IHDR chunk to check color type.
    Color types with alpha: 4 (greyscale+alpha), 6 (RGBA).
    Also checks for tRNS chunk (palette transparency).
    """
    try:
        with open(path, "rb") as f:
            # PNG signature (8 bytes)
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return False

            # IHDR chunk
            length = struct.unpack(">I", f.read(4))[0]
            chunk_type = f.read(4)
            if chunk_type != b"IHDR":
                return False

            data = f.read(length)
            # Byte 9 of IHDR is color type
            color_type = data[9] if len(data) > 9 else 0

            if color_type in (4, 6):  # Has alpha
                return True

            # Check for tRNS chunk (transparency for palette images)
            f.read(4)  # skip CRC
            while True:
                raw_len = f.read(4)
                if len(raw_len) < 4:
                    break
                clen = struct.unpack(">I", raw_len)[0]
                ctype = f.read(4)
                if ctype == b"tRNS":
                    return True
                if ctype == b"IDAT":
                    break  # tRNS must come before IDAT
                f.read(clen + 4)  # skip data + CRC

            return False
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════
# Background Removal (rembg)
# ═══════════════════════════════════════════════════════════════

def remove_background(
    input_path: Path,
    output_path: Optional[Path] = None,
    model: str = "birefnet-general",
) -> Optional[Path]:
    """
    Remove background using rembg.

    Args:
        input_path: Source image path.
        output_path: Destination path. Defaults to input_stem + "_nobg.png".
        model: rembg model name. "birefnet-general" is the most accurate.

    Returns:
        Path to the processed image, or None on failure.
    """
    if output_path is None:
        output_path = input_path.parent / f"{input_path.stem}_nobg.png"

    try:
        from rembg import remove
        from PIL import Image

        with Image.open(input_path) as img:
            result = remove(img, session_name=model)
            result.save(output_path, "PNG")

        logger.info(f"Background removed: {input_path.name} → {output_path.name}")
        return output_path

    except ImportError:
        logger.warning(
            "rembg or Pillow not installed. "
            "Install with: pip install rembg[gpu] Pillow --break-system-packages"
        )
        return None
    except Exception as e:
        logger.error(f"Background removal failed for {input_path}: {e}")
        return None


# ═══════════════════════════════════════════════════════════════
# Vision LLM Quality Gate
# ═══════════════════════════════════════════════════════════════

class VisionQualityGate:
    """
    Evaluates fetched assets using a Vision LLM.
    Scores each asset on relevance, quality, and framing.
    """

    def __init__(self, config: Config, llm: Optional[LLMClient] = None):
        self.config = config
        self.llm = llm or LLMClient(config)

    def evaluate_asset(
        self,
        asset: FetchedAsset,
        scene: Scene,
        style_anchor: str = "",
    ) -> ScoredAsset:
        """
        Score a single asset against its scene requirements.
        Skips vision evaluation for non-image assets (videos, SVGs).
        """
        scored = ScoredAsset(asset=asset)

        # Skip vision evaluation for videos and SVGs
        if asset.asset_type in (AssetType.VIDEO, AssetType.SVG, AssetType.ICON):
            logger.info(f"Skipping vision eval for {asset.asset_type.value}: {asset.local_path.name}")
            # Give a baseline pass score for videos (they need different evaluation)
            scored.relevance_score = 7.0
            scored.quality_score = 7.0
            scored.framing_score = 7.0
            scored.overall_score = 7.0
            scored.vision_feedback = f"Auto-passed: {asset.asset_type.value} assets bypass vision gate."
            scored.passed_threshold = True
            return scored

        if not asset.local_path.exists():
            logger.error(f"Asset file not found: {asset.local_path}")
            scored.vision_feedback = "File not found"
            return scored

        if not self.config.has_vision_llm:
            logger.warning("No Vision LLM configured — auto-passing asset")
            scored.relevance_score = 7.0
            scored.quality_score = 7.0
            scored.framing_score = 7.0
            scored.overall_score = 7.0
            scored.vision_feedback = "Auto-passed: no Vision LLM configured."
            scored.passed_threshold = True
            return scored

        try:
            system_prompt = load_prompt("vision_evaluation")
            user_text = (
                f"Scene: {scene.title}\n"
                f"Description: {scene.description}\n"
                f"Visual style: {scene.visual_style or 'general'}\n"
            )
            if style_anchor:
                user_text += f"Style anchor: {style_anchor}\n"

            raw_response = self.llm.vision_call(
                system_prompt, user_text, asset.local_path
            )
            result = extract_json(raw_response)

            scored.relevance_score = float(result.get("relevance_score", 0))
            scored.quality_score = float(result.get("quality_score", 0))
            scored.framing_score = float(result.get("framing_score", 0))
            scored.overall_score = float(result.get("overall_score", 0))
            scored.vision_feedback = result.get("feedback", "")
            scored.passed_threshold = scored.overall_score >= self.config.quality_threshold

            logger.info(
                f"Vision eval: {asset.local_path.name} → "
                f"{scored.overall_score:.1f}/10 ({'PASS' if scored.passed_threshold else 'FAIL'})"
            )

        except Exception as e:
            logger.error(f"Vision evaluation failed for {asset.local_path}: {e}")
            scored.vision_feedback = f"Evaluation error: {e}"

        return scored


# ═══════════════════════════════════════════════════════════════
# Phase 3 Orchestrator
# ═══════════════════════════════════════════════════════════════

class AssetProcessor:
    """
    Full Phase 3: pre-process → evaluate → select best.
    """

    def __init__(self, config: Config, llm: Optional[LLMClient] = None):
        self.config = config
        self.gate = VisionQualityGate(config, llm)

    def process_scene(
        self,
        scene: Scene,
        assets: list[FetchedAsset],
        style_anchor: str = "",
    ) -> tuple[Optional[ScoredAsset], list[ScoredAsset]]:
        """
        Process all fetched assets for a scene:
        1. Smart background removal (if needed and no alpha)
        2. Vision LLM scoring
        3. Select best above threshold

        Returns:
            (best_asset_or_None, all_scored_assets)
        """
        if not assets:
            logger.warning(f"Scene {scene.scene_id}: no assets to process")
            return None, []

        scored_assets = []

        for asset in assets:
            # ── Smart Pre-Processing ──
            # Only run rembg if:
            # 1. The asset is an image (not video/svg)
            # 2. It doesn't already have an alpha channel
            if (
                asset.asset_type == AssetType.PHOTO
                and asset.local_path.exists()
                and not has_alpha_channel(asset.local_path)
            ):
                nobg_path = remove_background(asset.local_path)
                if nobg_path:
                    # Create a scored asset that references the bg-removed version
                    scored = self.gate.evaluate_asset(asset, scene, style_anchor)
                    scored.bg_removed_path = nobg_path
                    scored_assets.append(scored)
                    continue
            elif (
                asset.asset_type == AssetType.PHOTO
                and asset.local_path.exists()
                and has_alpha_channel(asset.local_path)
            ):
                logger.info(
                    f"Skipping rembg for {asset.local_path.name} — already has alpha channel"
                )

            # ── Vision Evaluation ──
            scored = self.gate.evaluate_asset(asset, scene, style_anchor)
            scored_assets.append(scored)

        # Sort by overall score, descending
        scored_assets.sort(key=lambda s: s.overall_score, reverse=True)

        # Select best above threshold
        best = None
        for s in scored_assets:
            if s.passed_threshold:
                best = s
                break

        if best:
            logger.info(
                f"Scene {scene.scene_id}: best asset = {best.asset.local_path.name} "
                f"({best.overall_score:.1f}/10)"
            )
        else:
            logger.warning(
                f"Scene {scene.scene_id}: NO assets passed threshold "
                f"({self.config.quality_threshold}/10). Triggering fallback."
            )

        return best, scored_assets
