#!/usr/bin/env python3
"""
Build a deterministic spatial plan for 3dCaptions.

The LLM may refine semantic choices when credentials are available, but
placement remains rule-based and subject-aware.
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


PROJECT_ROOT = Path(__file__).resolve().parents[4]

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
    "if", "in", "into", "is", "it", "its", "of", "on", "or", "so", "that",
    "the", "their", "there", "this", "to", "up", "we", "with", "you", "your",
    "i", "me", "my", "our", "ours", "they", "them", "he", "she", "his", "her",
}

EMPHASIS_WORDS = {
    "no", "now", "just", "more", "new", "why", "how", "stop", "real", "best",
    "make", "made", "build", "built", "look", "see", "need", "create",
}

RectDict = Dict[str, float]
RectTuple = Tuple[float, float, float, float]


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
            os.environ.setdefault(key, value)


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def sanitize_text(text: str) -> str:
    return " ".join(text.strip().split())


def clean_display_word(word: str) -> str:
    return sanitize_text(word).strip(".,!?;:'\"()[]{}").replace("’", "'")


def normalize_words_from_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    words: List[Dict[str, Any]] = []
    for segment in segments:
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        text = sanitize_text(segment.get("text", ""))
        parts = [part for part in text.split(" ") if part]
        if not parts:
            continue
        duration = max(end - start, 0.001)
        step = duration / len(parts)
        for index, part in enumerate(parts):
            word_start = start + index * step
            words.append(
                {
                    "text": part,
                    "start": word_start,
                    "end": word_start + step,
                }
            )
    return words


def load_transcript(path: Path) -> Dict[str, Any]:
    payload = json.loads(path.read_text())
    if payload.get("words"):
        return payload

    payload["words"] = normalize_words_from_segments(payload.get("segments", []))
    return payload


def average_rects(rects: Iterable[Optional[RectDict]]) -> Optional[RectDict]:
    usable = [rect for rect in rects if rect is not None]
    if not usable:
        return None

    keys = ("x", "y", "width", "height")
    return {key: sum(rect[key] for rect in usable) / len(usable) for key in keys}


def manifest_window_geometry(
    manifest: Dict[str, Any],
    start_frame: int,
    end_frame: int,
) -> Dict[str, Any]:
    frames = manifest.get("frames") or []
    selected = [
        frame
        for frame in frames
        if start_frame <= int(frame.get("frame", 0)) <= end_frame
    ]

    if selected:
        bbox = average_rects(frame.get("bbox") for frame in selected)
        face_safe = average_rects(frame.get("faceSafe") for frame in selected)
        has_subject = any(bool(frame.get("hasSubject")) for frame in selected)
        return {
            "bbox": bbox,
            "faceSafe": face_safe,
            "hasSubject": has_subject,
        }

    subject_track = manifest.get("subjectTrack") or {}
    return {
        "bbox": subject_track.get("bbox"),
        "faceSafe": subject_track.get("faceSafe"),
        "hasSubject": bool(subject_track.get("hasSubject")),
    }


def chunk_words(
    words: List[Dict[str, Any]],
    words_per_chunk: int = 5,
    shot_boundary_times: Optional[List[float]] = None,
) -> List[List[Dict[str, Any]]]:
    """Chunk words into display blocks.

    Forces a break at shot boundaries so text layout resets when the
    camera angle changes.
    """
    shot_times = set(shot_boundary_times or [])
    chunks: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = []

    for index, word in enumerate(words):
        word_start = float(word.get("start", 0.0))

        # Force break at shot boundary (if the word starts at or after a cut)
        if current and shot_times:
            for st in shot_times:
                if abs(word_start - st) < 0.15 or (current and word_start > st > float(current[-1].get("start", 0.0))):
                    chunks.append(current)
                    current = []
                    break

        current.append(word)
        display = str(word.get("text", ""))
        current_duration = float(current[-1].get("end", 0.0)) - float(current[0].get("start", 0.0))
        gap = 0.0
        if index < len(words) - 1:
            gap = float(words[index + 1].get("start", 0.0)) - float(word.get("end", 0.0))

        if (
            len(current) >= words_per_chunk
            or display.endswith((".", "!", "?"))
            or gap > 0.35
            or current_duration >= 1.8
        ):
            chunks.append(current)
            current = []

    if current:
        chunks.append(current)

    return chunks


def blocks_from_transcript(
    transcript: Dict[str, Any],
    fps: int,
    frame_count: int,
    shot_boundary_frames: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    words = transcript.get("words") or normalize_words_from_segments(transcript.get("segments", []))

    # Convert shot boundary frames to seconds for word-level matching
    shot_boundary_times: Optional[List[float]] = None
    if shot_boundary_frames:
        shot_boundary_times = [f / fps for f in shot_boundary_frames]

    raw_blocks: List[Dict[str, Any]] = []
    for chunk in chunk_words(words, shot_boundary_times=shot_boundary_times):
        raw_blocks.append(
            {
                "text": " ".join(word["text"] for word in chunk),
                "start": float(chunk[0]["start"]),
                "end": float(chunk[-1]["end"]),
                "words": chunk,
            }
        )

    blocks: List[Dict[str, Any]] = []
    for index, chunk in enumerate(raw_blocks):
        start_frame = max(0, min(frame_count - 1, int(round(chunk["start"] * fps))))
        end_frame = max(start_frame, min(frame_count - 1, int(round(chunk["end"] * fps)) - 1))
        blocks.append(
            {
                "id": f"b{index + 1}",
                "startFrame": start_frame,
                "endFrame": end_frame,
                "text": sanitize_text(chunk["text"]),
                "words": chunk["words"],
            }
        )
    return blocks


def score_word(word: str, index: int, total: int) -> float:
    display = clean_display_word(word)
    if not display:
        return -999.0

    lowered = display.lower()
    score = len(display) * 1.4
    if lowered in EMPHASIS_WORDS:
        score += 4.6
    if lowered not in STOPWORDS:
        score += 3.2
    if index == 0:
        score += 1.4
    if total > 1:
        score += (1 - (index / max(total - 1, 1))) * 1.6
    if display.isupper():
        score += 1.5
    if len(display) <= 3:
        score -= 0.8
    return score


def select_semantic_bundle(words: List[Dict[str, Any]]) -> Dict[str, Any]:
    ranked: List[Tuple[float, int, str]] = []
    for index, word in enumerate(words):
        display = clean_display_word(str(word.get("text", "")))
        ranked.append((score_word(display, index, len(words)), index, display))

    ranked.sort(key=lambda item: item[0], reverse=True)
    unique: List[str] = []
    content_unique: List[str] = []
    for _, _, display in ranked:
        lowered = display.lower()
        if not display or lowered in {item.lower() for item in unique}:
            continue
        unique.append(display)
        if lowered not in STOPWORDS or lowered in EMPHASIS_WORDS:
            content_unique.append(display)
        if len(unique) >= 5:
            break

    hero_base = content_unique[0] if content_unique else (unique[0] if unique else clean_display_word(str(words[0].get("text", ""))))
    hero = hero_base.upper()
    hero_alt = ""
    if len(content_unique) > 1:
        second = content_unique[1]
        if len(second) <= 9 and len(hero) <= 11:
            hero_alt = second.upper()

    accent_source = content_unique if content_unique else unique
    accent_words = [
        word.upper()
        for word in accent_source
        if word.upper() not in {hero, hero_alt}
    ][:3]

    # tagText: the small contextual word that appears above the hero word
    # e.g. "THIS" above "TECH", or "NO" above "STUDIO"
    # Pick the first word in the original sequence if it's short and different from hero
    tag_text = ""
    if len(words) >= 3:
        first_display = clean_display_word(str(words[0].get("text", "")))
        if first_display and first_display.upper() != hero and len(first_display) <= 5:
            tag_text = first_display.upper()

    return {
        "heroText": hero,
        "heroTextAlt": hero_alt,
        "tagText": tag_text,
        "accentWords": accent_words,
    }


def build_support_text(words: List[Dict[str, Any]], hero_words: List[str]) -> str:
    hero_set = {item.lower() for item in hero_words if item}
    support_words: List[str] = []
    skipped: set[str] = set()

    for word in words:
        raw = str(word.get("text", ""))
        display = clean_display_word(raw).lower()
        if display in hero_set and display not in skipped:
            skipped.add(display)
            continue
        support_words.append(raw)

    support = sanitize_text(" ".join(support_words))
    parts = support.split(" ")
    if len(parts) > 8:
        support = " ".join(parts[:8])
        parts = support.split(" ")

    cleaned_parts = [clean_display_word(part).lower() for part in parts if clean_display_word(part)]
    if cleaned_parts and all(part in STOPWORDS for part in cleaned_parts):
        return ""

    while parts and clean_display_word(parts[0]).lower() in STOPWORDS and len(parts) > 2:
        parts = parts[1:]
    while parts and clean_display_word(parts[-1]).lower() in STOPWORDS and len(parts) > 2:
        parts = parts[:-1]

    support = sanitize_text(" ".join(parts))
    return support


def maybe_llm_semantics(blocks: List[Dict[str, Any]]) -> Optional[List[Dict[str, str]]]:
    load_env()
    api_key = os.getenv("AZURE_OPENAI_KEY")
    endpoint = os.getenv("AZURE_GPT_IMAGE_ENDPOINT")
    deployment = os.getenv("AZURE_O4_DEPLOYMENT_NAME", "o4-mini")
    api_version = os.getenv("AZURE_O4_API_VERSION", "2024-12-01-preview")
    if not api_key or not endpoint:
        return None

    try:
        from openai import AzureOpenAI
    except ImportError:
        return None

    prompt_blocks = [{"id": block["id"], "text": block["text"]} for block in blocks]
    system = (
        "You are planning high-end spatial captions for a Remotion template. "
        "For each block return JSON with id, heroText, supportText, and layoutMode. "
        "Allowed layoutMode values: rear-word, rear-word-front-line, front-only, orbit, object-anchored. "
        "Use one short heroText word or phrase and concise supportText."
    )
    client = AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )

    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(prompt_blocks)},
            ],
            temperature=1,
            max_completion_tokens=4096,
        )
        content = (response.choices[0].message.content or "").strip()
        json_start = content.find("[")
        json_end = content.rfind("]") + 1
        if json_start < 0 or json_end <= json_start:
            return None
        payload = json.loads(content[json_start:json_end])
        if isinstance(payload, list):
            return payload
    except Exception:
        return None

    return None


def rect_tuple(rect: Optional[RectDict]) -> Optional[RectTuple]:
    if rect is None:
        return None
    return (
        rect["x"],
        rect["y"],
        rect["x"] + rect["width"],
        rect["y"] + rect["height"],
    )


def rect_area(rect: Optional[RectTuple]) -> float:
    if rect is None:
        return 0.0
    x1, y1, x2, y2 = rect
    return max(0.0, x2 - x1) * max(0.0, y2 - y1)


def intersection_area(a: Optional[RectTuple], b: Optional[RectTuple]) -> float:
    if a is None or b is None:
        return 0.0
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    return max(0.0, min(ax2, bx2) - max(ax1, bx1)) * max(0.0, min(ay2, by2) - max(ay1, by1))


def make_rect(anchor: Dict[str, float], align: str, width: float, height: float) -> RectTuple:
    x = clamp01(anchor["x"])
    y = clamp01(anchor["y"])
    left = x - (0.0 if align == "left" else width if align == "right" else width / 2)
    top = y - height / 2
    return (left, top, left + width, top + height)


def fit_anchor(anchor: Dict[str, float], align: str, size: Tuple[float, float], margin: float = 0.04) -> Dict[str, float]:
    width, height = size
    x = anchor["x"]
    y = anchor["y"]

    if align == "left":
        x = max(margin, min(1.0 - margin - width, x))
    elif align == "right":
        x = max(margin + width, min(1.0 - margin, x))
    else:
        x = max(margin + width / 2, min(1.0 - margin - width / 2, x))

    y = max(margin + height / 2, min(1.0 - margin - height / 2, y))
    return {"x": clamp01(x), "y": clamp01(y)}


def overflow_penalty(rect: RectTuple) -> float:
    x1, y1, x2, y2 = rect
    overflow = 0.0
    overflow += max(0.0, -x1)
    overflow += max(0.0, -y1)
    overflow += max(0.0, x2 - 1.0)
    overflow += max(0.0, y2 - 1.0)
    return overflow


def choose_layout_mode(
    index: int,
    has_subject: bool,
    support_text: str,
    hero_text: str,
    accent_words: List[str],
) -> str:
    if not has_subject:
        return "object-anchored" if support_text and index % 2 == 0 else "front-only"
    if support_text and len(hero_text) <= 7 and len(accent_words) >= 2 and index % 4 == 2:
        return "orbit"
    if support_text:
        return "rear-word-front-line"
    return "rear-word"


def choose_rear_variant(layout_mode: str, hero_alt: str, bbox: Optional[RectDict]) -> str:
    if layout_mode == "orbit":
        return "orbit"
    if hero_alt:
        return "split"
    if bbox is not None and bbox["width"] < 0.46:
        return "stack"
    return "solid"


def choose_front_variant(layout_mode: str, support_text: str, align: str) -> str:
    words = support_text.split(" ")
    if layout_mode == "front-only":
        return "capsule"
    if len(words) >= 6:
        return "stacked"
    if align == "center":
        return "capsule"
    return "italic-line"


def compute_rear_rect_size(hero_text: str, hero_alt: str, variant: str) -> Tuple[float, float]:
    char_count = max(1, len(hero_text) + len(hero_alt))
    width = min(0.84, max(0.3, 0.16 + char_count * 0.026))
    line_count = 2 if variant in {"split", "stack"} and hero_alt else 1
    height = 0.14 + (line_count - 1) * 0.09
    return width, height


def compute_front_rect_size(support_text: str, variant: str) -> Tuple[float, float]:
    word_count = max(1, len(support_text.split(" ")))
    width = min(0.68, max(0.28, 0.24 + word_count * 0.05))
    height = 0.09 if variant == "italic-line" else 0.16 if variant == "capsule" else 0.14
    return width, height


def score_rear_candidate(
    anchor: Dict[str, float],
    align: str,
    size: Tuple[float, float],
    bbox: Optional[RectDict],
    face_safe: Optional[RectDict],
) -> float:
    fitted = fit_anchor(anchor, align, size)
    rect = make_rect(fitted, align, size[0], size[1])
    bbox_rect = rect_tuple(bbox)
    face_rect = rect_tuple(face_safe)
    body_overlap = intersection_area(rect, bbox_rect) / max(rect_area(rect), 1e-6)
    face_overlap = intersection_area(rect, face_rect) / max(rect_area(rect), 1e-6)
    subject_center = 0.5 if bbox is None else bbox["x"] + bbox["width"] / 2
    center_penalty = abs(fitted["x"] - subject_center)
    height_penalty = abs(fitted["y"] - (0.28 if bbox is None else bbox["y"] + bbox["height"] * 0.28))
    return (
        body_overlap * 4.2
        - face_overlap * 18.0
        - overflow_penalty(rect) * 8.0
        - center_penalty * 0.8
        - height_penalty * 0.9
    )


def score_front_candidate(
    anchor: Dict[str, float],
    align: str,
    size: Tuple[float, float],
    bbox: Optional[RectDict],
    face_safe: Optional[RectDict],
) -> float:
    fitted = fit_anchor(anchor, align, size)
    rect = make_rect(fitted, align, size[0], size[1])
    bbox_rect = rect_tuple(bbox)
    face_rect = rect_tuple(face_safe)
    body_overlap = intersection_area(rect, bbox_rect) / max(rect_area(rect), 1e-6)
    face_overlap = intersection_area(rect, face_rect) / max(rect_area(rect), 1e-6)
    subject_center = 0.5 if bbox is None else bbox["x"] + bbox["width"] / 2
    side_bias = 0.0
    if subject_center < 0.45 and fitted["x"] > subject_center:
        side_bias = 1.2
    elif subject_center > 0.55 and fitted["x"] < subject_center:
        side_bias = 1.2
    elif 0.45 <= subject_center <= 0.55 and align == "center":
        side_bias = 0.8
    return (
        (1.0 - body_overlap) * 3.5
        - face_overlap * 16.0
        - overflow_penalty(rect) * 8.0
        + side_bias
        - abs(fitted["y"] - 0.76) * 0.9
    )


def compute_anchors(
    bbox: Optional[RectDict],
    face_safe: Optional[RectDict],
    hero_text: str,
    hero_alt: str,
    support_text: str,
    rear_variant: str,
) -> Dict[str, Any]:
    if bbox is None:
        return {
            "rearAnchor": {"x": 0.5, "y": 0.28},
            "frontAnchor": {"x": 0.5, "y": 0.76},
            "align": "center",
        }

    center_x = bbox["x"] + bbox["width"] / 2
    top_y = bbox["y"] + bbox["height"] * 0.26
    lower_y = clamp01(max(0.7, bbox["y"] + bbox["height"] * 0.78))
    face_bottom = face_safe["y"] + face_safe["height"] if face_safe is not None else bbox["y"] + bbox["height"] * 0.22

    rear_size = compute_rear_rect_size(hero_text, hero_alt, rear_variant)
    rear_candidates = [
        ({"x": center_x, "y": clamp01(max(0.2, top_y))}, "center"),
        ({"x": bbox["x"] + bbox["width"] * 0.26, "y": clamp01(max(0.2, top_y))}, "center"),
        ({"x": bbox["x"] + bbox["width"] * 0.74, "y": clamp01(max(0.2, top_y))}, "center"),
        ({"x": clamp01(bbox["x"] - 0.02), "y": clamp01(top_y + 0.02)}, "right"),
        ({"x": clamp01(bbox["x"] + bbox["width"] + 0.02), "y": clamp01(top_y + 0.02)}, "left"),
    ]
    best_rear_raw = max(
        rear_candidates,
        key=lambda item: score_rear_candidate(item[0], item[1], rear_size, bbox, face_safe),
    )
    best_rear = (
        fit_anchor(best_rear_raw[0], best_rear_raw[1], rear_size),
        best_rear_raw[1],
    )

    tentative_align = best_rear[1]
    front_variant = choose_front_variant("rear-word-front-line", support_text, tentative_align)
    front_size = compute_front_rect_size(support_text, front_variant)
    front_candidates = [
        ({"x": 0.5, "y": lower_y}, "center"),
        ({"x": clamp01(bbox["x"] - 0.01), "y": lower_y}, "right"),
        ({"x": clamp01(bbox["x"] + bbox["width"] + 0.01), "y": lower_y}, "left"),
        ({"x": center_x, "y": clamp01(max(lower_y, face_bottom + 0.14))}, "center"),
    ]
    best_front_raw = max(
        front_candidates,
        key=lambda item: score_front_candidate(item[0], item[1], front_size, bbox, face_safe),
    )
    best_front = (
        fit_anchor(best_front_raw[0], best_front_raw[1], front_size),
        best_front_raw[1],
    )

    return {
        "rearAnchor": {"x": clamp01(best_rear[0]["x"]), "y": clamp01(best_rear[0]["y"])},
        "frontAnchor": {"x": clamp01(best_front[0]["x"]), "y": clamp01(best_front[0]["y"])},
        "align": best_front[1] if best_front[1] != "center" else best_rear[1],
    }


def stylize_block(
    index: int,
    block: Dict[str, Any],
    geometry: Dict[str, Any],
    llm_choice: Dict[str, Any],
) -> Dict[str, Any]:
    semantic_bundle = select_semantic_bundle(block["words"])
    hero_text = sanitize_text(llm_choice.get("heroText", semantic_bundle["heroText"])).upper()
    hero_alt = semantic_bundle["heroTextAlt"]
    tag_text = semantic_bundle.get("tagText", "")
    accent_words = semantic_bundle["accentWords"]

    support_text = sanitize_text(
        llm_choice.get(
            "supportText",
            build_support_text(block["words"], [hero_text, hero_alt, tag_text]),
        )
    )

    layout_mode = llm_choice.get(
        "layoutMode",
        choose_layout_mode(
            index,
            geometry["hasSubject"],
            support_text,
            hero_text,
            accent_words,
        ),
    )

    rear_variant = choose_rear_variant(layout_mode, hero_alt, geometry["bbox"])
    anchors = compute_anchors(
        geometry["bbox"],
        geometry["faceSafe"],
        hero_text,
        hero_alt,
        support_text,
        rear_variant,
    )
    front_variant = choose_front_variant(layout_mode, support_text, anchors["align"])

    rear_anchor_x = anchors["rearAnchor"]["x"]
    rear_rotation = -8 if rear_anchor_x < 0.44 else 8 if rear_anchor_x > 0.56 else (-4 if index % 2 == 0 else 4)
    rear_skew = rear_rotation * 0.55
    rear_scale = 1.18 if anchors["align"] == "center" else 1.08
    front_width = 0.64 if front_variant == "capsule" else 0.58 if anchors["align"] == "center" else 0.48

    return {
        "id": block["id"],
        "startFrame": block["startFrame"],
        "endFrame": block["endFrame"],
        "layoutMode": layout_mode,
        "heroText": hero_text,
        "heroTextAlt": hero_alt or None,
        "tagText": tag_text or None,
        "supportText": support_text,
        "rearAnchor": anchors["rearAnchor"],
        "frontAnchor": anchors["frontAnchor"],
        "align": anchors["align"],
        "allowRearOcclusion": bool(geometry["hasSubject"]),
        "subjectTrackFrameRange": {
            "startFrame": block["startFrame"],
            "endFrame": block["endFrame"],
        }
        if geometry["hasSubject"]
        else None,
        "rearVariant": rear_variant,
        "frontVariant": front_variant,
        "rearScale": round(rear_scale, 3),
        "rearRotation": rear_rotation,
        "rearSkew": round(rear_skew, 2),
        "rearOpacity": 0.95 if geometry["hasSubject"] else 0.58,
        "frontWidth": round(front_width, 3),
        "accentWords": accent_words,
        "emphasisWords": accent_words[:2],
        "orbitRadius": 220 if layout_mode == "orbit" else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a spatial plan for the 3dCaptions template")
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--mask-manifest", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--frame-count", type=int, default=None)
    parser.add_argument("--shot-boundaries", default=None, help="Path to JSON array of shot boundary frame numbers")
    args = parser.parse_args()

    transcript = load_transcript(Path(args.transcript))
    manifest = json.loads(Path(args.mask_manifest).read_text())
    frame_count = args.frame_count or int(manifest.get("frameCount", 0) or transcript.get("durationFrames", 0))
    if frame_count <= 0:
        duration_seconds = float(transcript.get("durationSeconds", 5.0))
        frame_count = max(1, round(duration_seconds * args.fps))

    shot_boundary_frames: Optional[List[int]] = None
    if args.shot_boundaries:
        sb_path = Path(args.shot_boundaries)
        if sb_path.exists():
            shot_boundary_frames = json.loads(sb_path.read_text())

    raw_blocks = blocks_from_transcript(transcript, args.fps, frame_count, shot_boundary_frames)
    llm_semantics = maybe_llm_semantics(raw_blocks)
    llm_by_id = {item["id"]: item for item in llm_semantics} if llm_semantics else {}

    blocks = []
    for index, block in enumerate(raw_blocks):
        geometry = manifest_window_geometry(manifest, block["startFrame"], block["endFrame"])
        llm_choice = llm_by_id.get(block["id"], {})
        blocks.append(stylize_block(index, block, geometry, llm_choice))

    payload = {
        "jobId": args.job_id,
        "fps": args.fps,
        "frameCount": frame_count,
        "blocks": blocks,
    }
    Path(args.out).write_text(json.dumps(payload, indent=2))
    print(f"[3dCaptions] Wrote spatial plan → {args.out}")


if __name__ == "__main__":
    main()
