"""
Perceptual Image Deduplication

Uses difference hashing (dHash) to detect visually similar images within
a scene. Two images with a Hamming distance ≤ threshold are considered
duplicates — only the first (highest-resolution) is kept.

Works without imagehash; uses Pillow only.
"""

import logging
from pathlib import Path
from typing import Optional

from AssetFlow.types import FetchedAsset

logger = logging.getLogger("AssetFlow.dedup")

# ── dHash parameters ──
HASH_SIZE = 16           # 16x16 = 256-bit hash (good balance of speed & accuracy)
HAMMING_THRESHOLD = 12   # ≤12 bits different → treat as duplicate (out of 256)


def compute_dhash(image_path: Path, hash_size: int = HASH_SIZE) -> Optional[int]:
    """
    Compute a difference hash (dHash) for an image.

    dHash captures relative gradients between adjacent pixels,
    making it robust against resizing, compression, and minor
    color shifts — exactly the duplicates we see from Google
    returning the same image at different resolutions/crops.

    Returns:
        Integer hash, or None if the image cannot be opened.
    """
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            # Convert to grayscale and resize to (hash_size+1) x hash_size
            img = img.convert("L").resize((hash_size + 1, hash_size), Image.LANCZOS)
            pixels = list(img.getdata())

        # Build the hash: for each row, compare adjacent pixels
        width = hash_size + 1
        hash_val = 0
        for y in range(hash_size):
            for x in range(hash_size):
                idx = y * width + x
                # Bit is 1 if current pixel > next pixel
                if pixels[idx] > pixels[idx + 1]:
                    hash_val |= 1 << (y * hash_size + x)

        return hash_val

    except ImportError:
        logger.debug("Pillow not available — skipping perceptual dedup")
        return None
    except Exception as e:
        logger.debug(f"Could not hash {image_path.name}: {e}")
        return None


def hamming_distance(h1: int, h2: int) -> int:
    """Count differing bits between two integer hashes."""
    return bin(h1 ^ h2).count("1")


def deduplicate_assets(
    assets: list[FetchedAsset],
    threshold: int = HAMMING_THRESHOLD,
) -> tuple[list[FetchedAsset], int]:
    """
    Remove visually duplicate images within a list of fetched assets.

    Strategy:
    - Compute dHash for each photo asset that has a local file
    - Compare each new hash against all previously accepted hashes
    - If Hamming distance ≤ threshold → drop as duplicate (keep the first)
    - Non-photo assets (video, gif) pass through unmodified
    - Assets without a valid hash pass through unmodified

    Args:
        assets: List of FetchedAsset (must have local_path set).
        threshold: Maximum Hamming distance to consider as duplicate.

    Returns:
        (kept_assets, num_removed) — the deduplicated list and count removed.
    """
    if not assets:
        return assets, 0

    kept: list[FetchedAsset] = []
    kept_hashes: list[tuple[int, str]] = []  # (hash, filename) for comparison
    removed = 0

    for asset in assets:
        # Non-photo assets always pass through
        if asset.asset_type.value not in ("photo",):
            kept.append(asset)
            continue

        # No local file yet → pass through
        if not asset.local_path or not asset.local_path.exists():
            kept.append(asset)
            continue

        h = compute_dhash(asset.local_path)

        # Could not compute hash → keep it (benefit of the doubt)
        if h is None:
            kept.append(asset)
            continue

        # Check against all kept hashes
        is_dup = False
        for existing_hash, existing_name in kept_hashes:
            dist = hamming_distance(h, existing_hash)
            if dist <= threshold:
                logger.info(
                    f"Perceptual dedup: dropping {asset.local_path.name} "
                    f"(distance {dist} from {existing_name})"
                )
                # Delete the duplicate file from staging
                try:
                    asset.local_path.unlink(missing_ok=True)
                except OSError:
                    pass
                is_dup = True
                removed += 1
                break

        if not is_dup:
            kept.append(asset)
            kept_hashes.append((h, asset.local_path.name))

    if removed:
        logger.info(f"Perceptual dedup: removed {removed} visually duplicate image(s)")

    return kept, removed
