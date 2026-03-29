#!/usr/bin/env python3
"""
Local subject segmentation for the 3dCaptions template.

Builds:
- masks/mask_00001.png ...
- mask-manifest.json

Segmentation priority chain (best to worst):
1. SAM2 (Segment Anything 2) — best edge quality, face-guided prompts
2. rembg — neural background removal, fast
3. OpenCV GrabCut — classical, uses face detection for body rectangle
4. Heuristic ellipse — deterministic fallback if nothing else works
"""

from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter

try:
    import cv2  # type: ignore
    import numpy as np  # type: ignore
except ImportError:
    cv2 = None
    np = None

try:
    from rembg import remove  # type: ignore
except ImportError:
    remove = None

# SAM2 (Segment Anything Model 2) — best quality, temporally consistent masks
_sam2_predictor = None

def _get_sam2_predictor():
    """Lazy-load SAM2 predictor. Returns None if unavailable."""
    global _sam2_predictor
    if _sam2_predictor is not None:
        return _sam2_predictor
    try:
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        # Use the smallest SAM2 checkpoint for speed
        checkpoint = os.environ.get("SAM2_CHECKPOINT", "sam2_hiera_tiny.pt")
        config = os.environ.get("SAM2_CONFIG", "sam2_hiera_t.yaml")
        if Path(checkpoint).exists():
            sam2_model = build_sam2(config, checkpoint, device=device)
            _sam2_predictor = SAM2ImagePredictor(sam2_model)
            print("[3dCaptions] Using SAM2 for segmentation (best quality)")
            return _sam2_predictor
    except (ImportError, Exception) as e:
        print(f"[3dCaptions] SAM2 not available ({e}), trying other methods")
    return None


def mask_with_sam2(image: Image.Image, face_box: Rect) -> Optional[Image.Image]:
    """Generate mask using SAM2 with face-guided prompt point."""
    predictor = _get_sam2_predictor()
    if predictor is None or np is None:
        return None

    try:
        img_array = np.array(image)
        predictor.set_image(img_array)

        w, h = image.size
        # Use center of face (or center of image) as the foreground prompt point
        if face_box is not None:
            fx1, fy1, fx2, fy2 = face_box
            prompt_x = (fx1 + fx2) / 2
            prompt_y = (fy1 + fy2) / 2
        else:
            prompt_x = w / 2
            prompt_y = h * 0.35

        input_point = np.array([[prompt_x, prompt_y]])
        input_label = np.array([1])  # 1 = foreground

        masks, scores, _ = predictor.predict(
            point_coords=input_point,
            point_labels=input_label,
            multimask_output=True,
        )
        # Pick the mask with highest confidence score
        best_idx = int(np.argmax(scores))
        binary = (masks[best_idx] * 255).astype(np.uint8)
        return threshold_mask(Image.fromarray(binary, mode="L"))
    except Exception as e:
        print(f"[3dCaptions] SAM2 mask failed: {e}")
        return None


PROJECT_ROOT = Path(__file__).resolve().parents[4]


Rect = Optional[Tuple[float, float, float, float]]


def load_env() -> None:
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value:
            import os
            os.environ.setdefault(key, value)


def run_ffmpeg_extract(video_path: Path, frames_dir: Path, fps: int, max_seconds: Optional[float]) -> None:
    frames_dir.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y"]
    if max_seconds is not None:
        cmd.extend(["-t", str(max_seconds)])
    cmd.extend(
        [
            "-i",
            str(video_path),
            "-vf",
            f"fps={fps}",
            str(frames_dir / "frame_%05d.png"),
        ]
    )
    subprocess.run(cmd, check=True, capture_output=True, text=True)


def threshold_mask(mask: Image.Image) -> Image.Image:
    return (
        mask.convert("L")
        .filter(ImageFilter.GaussianBlur(2))
        .point(lambda value: 255 if value >= 20 else 0)
        .convert("L")
    )


def detect_face_box(image: Image.Image) -> Rect:
    if cv2 is None or np is None:
        return None

    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    classifier = cv2.CascadeClassifier(str(cascade_path))
    if classifier.empty():
        return None

    frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = classifier.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
    return float(x), float(y), float(x + w), float(y + h)


def mask_with_rembg(image: Image.Image) -> Optional[Image.Image]:
    if remove is None:
        return None

    try:
        result = remove(image, only_mask=True)
        if isinstance(result, Image.Image):
            return threshold_mask(result)
        return threshold_mask(Image.open(io.BytesIO(result)))
    except Exception:
        return None


def mask_with_grabcut(image: Image.Image, face_box: Rect) -> Optional[Image.Image]:
    if cv2 is None or np is None:
        return None

    try:
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        h, w = frame.shape[:2]
        gc_mask = np.zeros((h, w), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)

        if face_box is not None:
            fx1, fy1, fx2, fy2 = face_box
            cx = (fx1 + fx2) / 2
            rect_w = min(w * 0.72, max((fx2 - fx1) * 3.2, w * 0.38))
            rect_h = min(h * 0.88, max((fy2 - fy1) * 5.2, h * 0.55))
            rect_x = max(0, int(cx - rect_w / 2))
            rect_y = max(0, int(max(0, fy1 - (fy2 - fy1) * 0.7)))
            rect = (
                rect_x,
                rect_y,
                min(w - rect_x, int(rect_w)),
                min(h - rect_y, int(rect_h)),
            )
        else:
            rect = (
                int(w * 0.18),
                int(h * 0.1),
                int(w * 0.64),
                int(h * 0.82),
            )

        cv2.grabCut(frame, gc_mask, rect, bgd_model, fgd_model, 4, cv2.GC_INIT_WITH_RECT)
        binary = np.where((gc_mask == 2) | (gc_mask == 0), 0, 255).astype("uint8")
        return threshold_mask(Image.fromarray(binary, mode="L"))
    except Exception:
        return None


def mask_with_heuristic(image: Image.Image, face_box: Rect) -> Image.Image:
    w, h = image.size
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)

    if face_box is not None:
        fx1, fy1, fx2, fy2 = face_box
        cx = (fx1 + fx2) / 2
        face_h = fy2 - fy1
        top = max(0, fy1 - face_h * 0.45)
        bottom = min(h, fy2 + face_h * 4.8)
        body_w = min(w * 0.76, max((fx2 - fx1) * 3.6, w * 0.42))
        draw.ellipse([cx - body_w / 2, top, cx + body_w / 2, bottom], fill=255)
    else:
        draw.ellipse([w * 0.15, h * 0.08, w * 0.85, h * 0.98], fill=255)

    return threshold_mask(mask)


def rect_from_mask(mask: Image.Image) -> Rect:
    bbox = threshold_mask(mask).getbbox()
    if not bbox:
        return None
    x1, y1, x2, y2 = bbox
    return float(x1), float(y1), float(x2), float(y2)


def normalize_rect(rect: Rect, width: int, height: int) -> Optional[Dict[str, float]]:
    if rect is None:
        return None

    x1, y1, x2, y2 = rect
    return {
        "x": max(0.0, min(1.0, x1 / width)),
        "y": max(0.0, min(1.0, y1 / height)),
        "width": max(0.0, min(1.0, (x2 - x1) / width)),
        "height": max(0.0, min(1.0, (y2 - y1) / height)),
    }


def derive_face_safe(face_box: Rect, subject_box: Rect, width: int, height: int) -> Optional[Dict[str, float]]:
    if face_box is not None:
        fx1, fy1, fx2, fy2 = face_box
        face_w = fx2 - fx1
        face_h = fy2 - fy1
        safe = (
            max(0.0, fx1 - face_w * 0.16),
            max(0.0, fy1 - face_h * 0.32),
            min(width, fx2 + face_w * 0.16),
            min(height, fy2 + face_h * 0.42),
        )
        return normalize_rect(safe, width, height)

    if subject_box is None:
        return None

    sx1, sy1, sx2, sy2 = subject_box
    subject_w = sx2 - sx1
    subject_h = sy2 - sy1
    safe = (
        sx1 + subject_w * 0.3,
        sy1,
        sx2 - subject_w * 0.3,
        sy1 + subject_h * 0.24,
    )
    return normalize_rect(safe, width, height)


def average_rects(rects: Iterable[Optional[Dict[str, float]]]) -> Optional[Dict[str, float]]:
    usable = [rect for rect in rects if rect is not None]
    if not usable:
        return None

    keys = ("x", "y", "width", "height")
    return {key: sum(rect[key] for rect in usable) / len(usable) for key in keys}


def smooth_rect_series(rects: List[Optional[Dict[str, float]]], window: int = 5) -> List[Optional[Dict[str, float]]]:
    smoothed: List[Optional[Dict[str, float]]] = []
    for idx in range(len(rects)):
        start = max(0, idx - window // 2)
        end = min(len(rects), idx + window // 2 + 1)
        smoothed.append(average_rects(rects[start:end]))
    return smoothed


def public_relative(path: Path) -> str:
    public_root = PROJECT_ROOT / "public"
    return path.relative_to(public_root).as_posix()


def main() -> None:
    load_env()

    parser = argparse.ArgumentParser(description="Generate 3dCaptions subject masks and mask manifest")
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--out-dir", required=True, help="Job output directory inside public/3dCaptions/<jobId>")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--max-seconds", type=float, default=None)
    args = parser.parse_args()

    video_path = Path(args.video).resolve()
    out_dir = Path(args.out_dir).resolve()
    masks_dir = out_dir / "masks"
    manifest_path = out_dir / "mask-manifest.json"
    masks_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="3dcaptions_frames_") as temp_dir_str:
        temp_dir = Path(temp_dir_str)
        run_ffmpeg_extract(video_path, temp_dir, args.fps, args.max_seconds)
        frame_paths = sorted(temp_dir.glob("frame_*.png"))
        if not frame_paths:
            raise RuntimeError("No frames extracted for segmentation")

        subject_rects: List[Optional[Dict[str, float]]] = []
        face_rects: List[Optional[Dict[str, float]]] = []
        frame_entries: List[Dict[str, Any]] = []

        width = 0
        height = 0

        for index, frame_path in enumerate(frame_paths, start=1):
            image = Image.open(frame_path).convert("RGB")
            width, height = image.size
            face_box = detect_face_box(image)
            mask = (
                mask_with_sam2(image, face_box)
                or mask_with_rembg(image)
                or mask_with_grabcut(image, face_box)
                or mask_with_heuristic(image, face_box)
            )
            mask = threshold_mask(mask)

            subject_box = rect_from_mask(mask)
            subject_rect = normalize_rect(subject_box, width, height)
            face_safe = derive_face_safe(face_box, subject_box, width, height)

            mask_name = f"mask_{index:05d}.png"
            mask.save(masks_dir / mask_name)

            subject_rects.append(subject_rect)
            face_rects.append(face_safe)
            frame_entries.append(
                {
                    "frame": index - 1,
                    "hasSubject": subject_rect is not None,
                    "bbox": subject_rect,
                    "faceSafe": face_safe,
                }
            )

        smoothed_subjects = smooth_rect_series(subject_rects)
        smoothed_faces = smooth_rect_series(face_rects)
        for entry, bbox, face_safe in zip(frame_entries, smoothed_subjects, smoothed_faces):
            entry["bbox"] = bbox
            entry["faceSafe"] = face_safe

        subject_track = {
            "startFrame": 0,
            "endFrame": max(0, len(frame_entries) - 1),
            "hasSubject": any(entry["hasSubject"] for entry in frame_entries),
            "bbox": average_rects(entry["bbox"] for entry in frame_entries),
            "faceSafe": average_rects(entry["faceSafe"] for entry in frame_entries),
        }

        manifest = {
            "jobId": out_dir.name,
            "fps": args.fps,
            "width": width,
            "height": height,
            "frameCount": len(frame_entries),
            "maskPattern": f"{public_relative(out_dir)}/masks/mask_%05d.png",
            "maskStartIndex": 1,
            "frames": frame_entries,
            "subjectTrack": subject_track,
        }

        manifest_path.write_text(json.dumps(manifest, indent=2))
        print(f"[3dCaptions] Wrote {len(frame_entries)} masks → {masks_dir}")
        print(f"[3dCaptions] Wrote manifest → {manifest_path}")


if __name__ == "__main__":
    main()
