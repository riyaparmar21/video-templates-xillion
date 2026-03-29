#!/usr/bin/env python3
"""
End-to-end job builder for the 3dCaptions template.

Flow:
1. copy/normalize source video into public/3dCaptions/<jobId>/source.mp4
2. build a normalized transcript
3. build subject masks
4. build a spatial plan
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[4]
PREPROCESS_DIR = Path(__file__).resolve().parent


def run(cmd: List[str]) -> None:
    subprocess.run(cmd, check=True)


def normalize_video(input_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-vf",
            "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    )


def detect_shot_boundaries(video_path: Path, fps: int, threshold: float = 0.3) -> List[int]:
    """Detect shot boundaries using ffmpeg's scene change filter.

    Returns a list of frame numbers where scene changes occur.
    These become forced block-break points in the spatial plan.
    """
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(video_path),
            "-vf",
            f"select='gt(scene,{threshold})',showinfo",
            "-vsync",
            "vfr",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )

    shot_frames: List[int] = []
    for line in result.stderr.splitlines():
        if "showinfo" in line and "pts_time:" in line:
            try:
                pts_part = line.split("pts_time:")[1].split()[0]
                time_sec = float(pts_part)
                shot_frames.append(int(round(time_sec * fps)))
            except (IndexError, ValueError):
                continue

    print(f"[3dCaptions] Detected {len(shot_frames)} shot boundaries: {shot_frames}")
    return shot_frames


def get_duration_seconds(video_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(video_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def normalize_words(text: str, duration_seconds: float) -> Dict[str, Any]:
    """Distribute words evenly across duration when no real timestamps exist.

    WARNING: This is a fallback. Results will have uniform timing which
    produces worse caption placement. Use --timed-transcript for best results.
    """
    cleaned = " ".join(text.split())
    parts = [part for part in cleaned.split(" ") if part]
    if not parts:
        return {
            "durationSeconds": duration_seconds,
            "text": "",
            "segments": [],
            "words": [],
        }

    print(
        "[3dCaptions] WARNING: Using uniform word timing (no real timestamps). "
        "For best results, provide --timed-transcript with word-level timing from Whisper or similar."
    )

    step = duration_seconds / len(parts)
    words = []
    for index, part in enumerate(parts):
        start = round(index * step, 3)
        end = round(min(duration_seconds, start + step), 3)
        words.append({"text": part, "start": start, "end": end})

    segments = []
    segment_size = 6
    for idx in range(0, len(words), segment_size):
        chunk = words[idx : idx + segment_size]
        segments.append(
            {
                "start": chunk[0]["start"],
                "end": chunk[-1]["end"],
                "text": " ".join(item["text"] for item in chunk),
            }
        )

    return {
        "durationSeconds": duration_seconds,
        "text": cleaned,
        "segments": segments,
        "words": words,
    }


def parse_transcript_payload(payload: Dict[str, Any], duration_seconds: float) -> Dict[str, Any]:
    if payload.get("words") or payload.get("segments"):
        payload.setdefault("durationSeconds", duration_seconds)
        payload.setdefault("text", " ".join(segment.get("text", "") for segment in payload.get("segments", [])))
        return payload

    text = payload.get("text", "")
    return normalize_words(text, duration_seconds)


def read_text_or_path(raw: str) -> str:
    candidate = Path(raw)
    if candidate.exists():
        return candidate.read_text().strip()
    return raw.strip()


def normalize_timed_transcript(path: Path, duration_seconds: float) -> Dict[str, Any]:
    if path.suffix.lower() == ".json":
        return parse_transcript_payload(json.loads(path.read_text()), duration_seconds)
    return normalize_words(path.read_text(), duration_seconds)


def run_transcribe(video_path: Path) -> Dict[str, Any]:
    run([sys.executable, str(PROJECT_ROOT / "pipeline" / "transcribe.py"), str(video_path)])
    json_path = PROJECT_ROOT / "data" / "stt" / f"{video_path.stem}.json"
    txt_path = PROJECT_ROOT / "data" / "stt" / f"{video_path.stem}.txt"
    duration_seconds = get_duration_seconds(video_path)

    if json_path.exists():
        return parse_transcript_payload(json.loads(json_path.read_text()), duration_seconds)
    if txt_path.exists():
        return normalize_words(txt_path.read_text(), duration_seconds)

    raise RuntimeError("Transcription completed but no transcript output was found")


def build_transcript(
    source_video: Path,
    transcript_path: Path,
    script: Optional[str],
    timed_transcript: Optional[str],
) -> None:
    duration_seconds = get_duration_seconds(source_video)

    if timed_transcript:
        payload = normalize_timed_transcript(Path(timed_transcript), duration_seconds)
    elif script:
        payload = normalize_words(read_text_or_path(script), duration_seconds)
    else:
        payload = run_transcribe(source_video)

    transcript_path.write_text(json.dumps(payload, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a full 3dCaptions job")
    parser.add_argument("--video", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--script", default=None)
    parser.add_argument("--timed-transcript", default=None)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--max-seconds", type=float, default=None)
    args = parser.parse_args()

    video_input = Path(args.video).resolve()
    job_dir = PROJECT_ROOT / "public" / "3dCaptions" / args.job_id
    source_video = job_dir / "source.mp4"
    transcript_path = job_dir / "transcript.json"
    manifest_path = job_dir / "mask-manifest.json"
    plan_path = job_dir / "plan.json"
    job_dir.mkdir(parents=True, exist_ok=True)

    normalize_video(video_input, source_video)
    build_transcript(source_video, transcript_path, args.script, args.timed_transcript)

    # Detect shot boundaries for forced block breaks
    shot_boundaries = detect_shot_boundaries(source_video, args.fps)
    shot_boundaries_path = job_dir / "shot-boundaries.json"
    shot_boundaries_path.write_text(json.dumps(shot_boundaries))

    run(
        [
            sys.executable,
            str(PREPROCESS_DIR / "segment_subject.py"),
            "--video",
            str(source_video),
            "--out-dir",
            str(job_dir),
            "--fps",
            str(args.fps),
            *(
                ["--max-seconds", str(args.max_seconds)]
                if args.max_seconds is not None
                else []
            ),
        ]
    )

    manifest = json.loads(manifest_path.read_text())
    run(
        [
            sys.executable,
            str(PREPROCESS_DIR / "build_spatial_plan.py"),
            "--transcript",
            str(transcript_path),
            "--mask-manifest",
            str(manifest_path),
            "--job-id",
            args.job_id,
            "--out",
            str(plan_path),
            "--fps",
            str(args.fps),
            "--frame-count",
            str(manifest.get("frameCount", 0)),
            "--shot-boundaries",
            str(shot_boundaries_path),
        ]
    )

    print(f"[3dCaptions] Job ready → {job_dir}")
    print(f"[3dCaptions] Source video: {source_video}")
    print(f"[3dCaptions] Transcript:   {transcript_path}")
    print(f"[3dCaptions] Masks:        {job_dir / 'masks'}")
    print(f"[3dCaptions] Plan:         {plan_path}")


if __name__ == "__main__":
    main()
