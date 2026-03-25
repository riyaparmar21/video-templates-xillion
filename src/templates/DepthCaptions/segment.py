#!/usr/bin/env python3
"""
Depth Captions — Segmentation Pipeline

Extracts person masks from a video so captions can render *behind* the subject.

Usage:
    python segment.py <video_path> [--out-dir masks/] [--fps 30] [--max-seconds 10]

Outputs a folder of PNG alpha masks (white = person, black = background).
Also outputs a subject_bbox.json with the semi-static bounding box of the subject
across sampled keyframes — used for intelligent text placement.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove, new_session


def extract_frames(video_path: str, out_dir: str, fps: int, max_seconds: float | None = None):
    """Extract frames from video at given fps using ffmpeg."""
    os.makedirs(out_dir, exist_ok=True)
    cmd = f'ffmpeg -y -i "{video_path}" -vf "fps={fps}"'
    if max_seconds:
        cmd += f" -t {max_seconds}"
    cmd += f' "{out_dir}/frame_%05d.png" 2>&1'

    print(f"Extracting frames at {fps} fps...")
    result = os.popen(cmd).read()

    frames = sorted(Path(out_dir).glob("frame_*.png"))
    print(f"Extracted {len(frames)} frames")
    return frames


def generate_masks(frame_paths: list[Path], mask_dir: str, model_name: str = "u2net"):
    """Run rembg on each frame to produce alpha masks."""
    os.makedirs(mask_dir, exist_ok=True)
    session = new_session(model_name)

    total = len(frame_paths)
    for i, fp in enumerate(frame_paths):
        img = Image.open(fp).convert("RGB")

        # rembg returns RGBA — we just need the alpha channel as the mask
        result = remove(img, session=session, only_mask=True)

        # Save as grayscale PNG (white = person, black = background)
        if isinstance(result, Image.Image):
            mask = result.convert("L")
        else:
            mask = Image.fromarray(result).convert("L")

        mask_name = fp.stem.replace("frame_", "mask_") + ".png"
        mask.save(os.path.join(mask_dir, mask_name))

        if (i + 1) % 10 == 0 or i == 0 or i == total - 1:
            print(f"  Mask {i+1}/{total}: {mask_name}")

    print(f"Generated {total} masks in {mask_dir}")


def compute_subject_bbox(mask_dir: str, sample_count: int = 5) -> dict:
    """
    Sample a few masks to compute a semi-static bounding box of the subject.
    Returns {x, y, width, height} normalized to 0-1 range.
    """
    masks = sorted(Path(mask_dir).glob("mask_*.png"))
    if not masks:
        return {"x": 0.3, "y": 0.1, "width": 0.4, "height": 0.8}

    # Sample evenly
    indices = np.linspace(0, len(masks) - 1, min(sample_count, len(masks)), dtype=int)

    all_top, all_bottom, all_left, all_right = [], [], [], []
    img_w, img_h = 0, 0

    for idx in indices:
        mask = np.array(Image.open(masks[idx]).convert("L"))
        img_h, img_w = mask.shape

        # Find bounding box of non-zero (person) pixels
        rows = np.any(mask > 128, axis=1)
        cols = np.any(mask > 128, axis=0)

        if not rows.any():
            continue

        top, bottom = np.where(rows)[0][[0, -1]]
        left, right = np.where(cols)[0][[0, -1]]

        all_top.append(top)
        all_bottom.append(bottom)
        all_left.append(left)
        all_right.append(right)

    if not all_top:
        return {"x": 0.3, "y": 0.1, "width": 0.4, "height": 0.8}

    # Use the union of all sampled bounding boxes (with small padding)
    pad = 20
    top = max(0, min(all_top) - pad)
    bottom = min(img_h, max(all_bottom) + pad)
    left = max(0, min(all_left) - pad)
    right = min(img_w, max(all_right) + pad)

    bbox = {
        "x": round(left / img_w, 4),
        "y": round(top / img_h, 4),
        "width": round((right - left) / img_w, 4),
        "height": round((bottom - top) / img_h, 4),
        "centerX": round((left + right) / 2 / img_w, 4),
        "centerY": round((top + bottom) / 2 / img_h, 4),
    }

    print(f"Subject bbox (normalized): {bbox}")
    return bbox


def main():
    parser = argparse.ArgumentParser(description="Segment person from video for depth captions")
    parser.add_argument("video", help="Path to input video")
    parser.add_argument("--out-dir", default=None, help="Output directory (default: next to video)")
    parser.add_argument("--fps", type=int, default=30, help="Frame rate for extraction")
    parser.add_argument("--max-seconds", type=float, default=None, help="Max seconds to process")
    parser.add_argument("--model", default="u2net", help="rembg model name")
    args = parser.parse_args()

    video_path = os.path.abspath(args.video)
    base_dir = args.out_dir or os.path.join(os.path.dirname(video_path), "depth_captions_data")

    frames_dir = os.path.join(base_dir, "frames")
    masks_dir = os.path.join(base_dir, "masks")

    # Step 1: Extract frames
    frame_paths = extract_frames(video_path, frames_dir, args.fps, args.max_seconds)

    if not frame_paths:
        print("ERROR: No frames extracted")
        sys.exit(1)

    # Step 2: Generate masks
    generate_masks(frame_paths, masks_dir, args.model)

    # Step 3: Compute semi-static subject bounding box
    bbox = compute_subject_bbox(masks_dir)

    # Save metadata
    meta = {
        "videoPath": video_path,
        "fps": args.fps,
        "totalFrames": len(frame_paths),
        "masksDir": masks_dir,
        "framesDir": frames_dir,
        "subjectBbox": bbox,
    }

    meta_path = os.path.join(base_dir, "segment_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nDone! Metadata saved to {meta_path}")
    print(f"  Frames: {frames_dir}")
    print(f"  Masks:  {masks_dir}")
    print(f"  Subject bbox: {bbox}")


if __name__ == "__main__":
    main()
