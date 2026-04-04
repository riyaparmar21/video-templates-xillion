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
import subprocess
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
            # IHDR layout: width(4) + height(4) + bit_depth(1) + color_type(1) + ...
            # color_type is at byte offset 8
            color_type = data[8] if len(data) > 8 else 0

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
        logger.info(
            "rembg/Pillow not installed — skipping background removal (assets will be used as-is). "
            "To enable: pip install rembg Pillow"
        )
        return None
    except (OSError, ConnectionError) as e:
        # Model download failures (network issues, disk space, etc.)
        logger.warning(
            f"Background removal model download failed for {input_path}: {e}. "
            "Asset will be used without background removal. "
            "Retry by ensuring network access or pre-downloading the model."
        )
        return None
    except Exception as e:
        logger.error(f"Background removal failed for {input_path}: {e}")
        return None


# ═══════════════════════════════════════════════════════════════
# Video Keyframe Extraction
# ═══════════════════════════════════════════════════════════════

def extract_video_keyframe(video_path: Path) -> Optional[Path]:
    """
    Extract a representative keyframe from a video using ffmpeg.

    Grabs the frame at 50% duration so we get a representative mid-point,
    not a black/logo intro frame.

    Returns:
        Path to the extracted JPEG keyframe, or None on failure.
    """
    keyframe_path = video_path.parent / f"{video_path.stem}_keyframe.jpg"

    # If we already extracted it, reuse
    if keyframe_path.exists() and keyframe_path.stat().st_size > 0:
        return keyframe_path

    try:
        # Step 1: get video duration
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)],
            capture_output=True, text=True, timeout=10,
        )
        duration = float(probe.stdout.strip()) if probe.stdout.strip() else 0.0

        # Seek to 50% of duration (or 1s if very short/unknown)
        seek_time = max(duration * 0.5, 0.5) if duration > 0 else 1.0

        # Step 2: extract single frame
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(seek_time), "-i", str(video_path),
             "-frames:v", "1", "-q:v", "2", str(keyframe_path)],
            capture_output=True, timeout=15,
        )

        if keyframe_path.exists() and keyframe_path.stat().st_size > 0:
            logger.debug(f"Extracted keyframe at {seek_time:.1f}s: {keyframe_path.name}")
            return keyframe_path
        else:
            logger.warning(f"ffmpeg produced empty keyframe for {video_path.name}")
            return None

    except FileNotFoundError:
        logger.info(
            "ffmpeg/ffprobe not found — video assets will auto-pass without vision eval. "
            "Install ffmpeg to enable video quality scoring."
        )
        return None
    except subprocess.TimeoutExpired:
        logger.warning(f"ffmpeg timed out extracting keyframe from {video_path.name}")
        return None
    except Exception as e:
        logger.warning(f"Keyframe extraction failed for {video_path.name}: {e}")
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

        Videos: extracts a mid-point keyframe via ffmpeg and scores that
        frame.  Falls back to auto-pass (7.0) if ffmpeg is unavailable.
        SVGs/Icons: auto-pass (not meaningfully scorable).
        """
        scored = ScoredAsset(asset=asset)
        _video_original_path: Optional[Path] = None  # set if we swap in a keyframe

        # Videos: extract a keyframe and score that image
        if asset.asset_type == AssetType.VIDEO:
            keyframe = extract_video_keyframe(asset.local_path)
            if keyframe is None:
                # ffmpeg not available or extraction failed — auto-pass with note
                logger.info(f"Auto-passing video (no keyframe): {asset.local_path.name}")
                scored.relevance_score = 7.0
                scored.quality_score = 7.0
                scored.framing_score = 7.0
                scored.overall_score = 7.0
                scored.vision_feedback = "Auto-passed: keyframe extraction unavailable."
                scored.passed_threshold = True
                return scored
            # Swap in the keyframe for vision eval; restore after scoring
            _video_original_path = asset.local_path
            asset.local_path = keyframe
            logger.info(f"Evaluating video via keyframe: {_video_original_path.name} → {keyframe.name}")

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
        finally:
            # Restore original video path and clean up keyframe temp file
            if _video_original_path is not None:
                keyframe_to_delete = asset.local_path  # still points to keyframe
                asset.local_path = _video_original_path
                # Delete the temporary keyframe — it's only needed for eval
                try:
                    if keyframe_to_delete.exists() and keyframe_to_delete.name.endswith("_keyframe.jpg"):
                        keyframe_to_delete.unlink()
                        logger.debug(f"Cleaned up keyframe: {keyframe_to_delete.name}")
                except OSError:
                    pass  # non-critical — staging dir gets wiped anyway

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
        1. Vision LLM scoring
        2. Select best above threshold

        Returns:
            (best_asset_or_None, all_scored_assets)
        """
        if not assets:
            logger.warning(f"Scene {scene.scene_id}: no assets to process")
            return None, []

        scored_assets = []

        # ── Step 1: Vision eval all assets (parallel when possible) ──
        # Vision LLM calls are independent per-asset — run them concurrently
        # via a thread pool to avoid blocking on sequential HTTP calls.
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(assets), 4)) as executor:
            futures = [
                executor.submit(self.gate.evaluate_asset, asset, scene, style_anchor)
                for asset in assets
            ]
            for future in concurrent.futures.as_completed(futures):
                try:
                    scored_assets.append(future.result())
                except Exception as e:
                    logger.error(f"Vision eval thread error: {e}")

        # Sort by overall score, descending
        scored_assets.sort(key=lambda s: s.overall_score, reverse=True)

        # ── Step 2: Select best above threshold ──
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
