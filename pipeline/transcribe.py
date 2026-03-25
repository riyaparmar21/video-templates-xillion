#!/usr/bin/env python3
"""
Automated Transcription Pipeline

Takes a video file, extracts audio, transcribes via Azure Whisper API
(or local Whisper as fallback), and caches everything in cache/transcripts/.
Copies the working transcript to data/stt/ for easy access.

Usage:
    python transcribe.py input.mp4
    python transcribe.py input.mp4 --force
    python transcribe.py input.mp4 --audio-only
    python transcribe.py input.mp4 --local          # Force local Whisper
    python transcribe.py input.mp4 --local --model large
    python transcribe.py --list
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
PIPELINE_DIR = Path(__file__).parent
DEFAULT_STT_DIR = PROJECT_ROOT / "data" / "stt"

sys.path.insert(0, str(PIPELINE_DIR))
from generator.cache import PipelineCache

# Load .env if dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass


# ── Audio Extraction ──

def extract_audio(video_path: str, output_path: str) -> bool:
    """Extract audio from video using FFmpeg."""
    print(f"\n[Step 1] Extracting audio...")
    print(f"   Input:  {video_path}")
    print(f"   Output: {output_path}")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"   [Error] FFmpeg failed: {result.stderr[-500:]}")
            return False

        size_mb = Path(output_path).stat().st_size / (1024 * 1024)
        print(f"   Audio extracted: {size_mb:.1f}MB")
        return True

    except FileNotFoundError:
        print("   [Error] FFmpeg not found. Install: brew install ffmpeg")
        return False
    except subprocess.TimeoutExpired:
        print("   [Error] Audio extraction timed out (>5 min)")
        return False


# ── Video Duration ──

def get_duration(video_path: str) -> float:
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return float(result.stdout.strip()) if result.returncode == 0 else 0.0
    except Exception:
        return 0.0


# ── Azure Whisper API Transcription ──

def run_azure_whisper(audio_path: str, output_dir: str, language: str = None) -> dict:
    """Transcribe using Azure OpenAI Whisper API (cloud-based, no local torch needed)."""
    print(f"\n[Step 2] Transcribing via Azure Whisper API...")

    endpoint = os.getenv("AZURE_ASR_ENDPOINT", "").strip()
    api_key = os.getenv("AZURE_ASR_API_KEY", "").strip()
    deployment = os.getenv("AZURE_ASR_DEPLOYMENT", "whisper").strip()

    if not endpoint or not api_key:
        return {"success": False, "error": "AZURE_ASR_ENDPOINT/AZURE_ASR_API_KEY not set"}

    try:
        from openai import AzureOpenAI
    except ImportError:
        return {"success": False, "error": "openai package not installed: pip install openai"}

    api_version = os.getenv("AZURE_ASR_API_VERSION", "2024-06-01")

    client = AzureOpenAI(
        api_version=api_version,
        azure_endpoint=endpoint,
        api_key=api_key,
    )

    audio_stem = Path(audio_path).stem
    output_dir_path = Path(output_dir)

    try:
        print(f"   Endpoint:   {endpoint}")
        print(f"   Deployment: {deployment}")
        print(f"   Audio:      {Path(audio_path).name}")

        with open(audio_path, "rb") as audio_file:
            result = client.audio.transcriptions.create(
                model=deployment,
                file=audio_file,
                response_format="verbose_json",
                language=language or "en",
                timestamp_granularities=["segment"],
            )

        # Parse the response
        if hasattr(result, "text"):
            full_text = result.text
        elif isinstance(result, dict):
            full_text = result.get("text", "")
        else:
            full_text = str(result)

        print(f"   Transcribed: {len(full_text)} chars")
        print(f"   Preview: {full_text[:200]}...")

        # Save .txt
        txt_path = output_dir_path / f"{audio_stem}.txt"
        txt_path.write_text(full_text)
        output_files = {"txt": str(txt_path)}

        # Save .json with full response
        json_path = output_dir_path / f"{audio_stem}.json"
        if hasattr(result, "model_dump"):
            json_data = result.model_dump()
        elif isinstance(result, dict):
            json_data = result
        else:
            json_data = {"text": full_text}
        json_path.write_text(json.dumps(json_data, indent=2, ensure_ascii=False))
        output_files["json"] = str(json_path)

        # Generate .srt and .vtt from segments if available
        segments = None
        if hasattr(result, "segments"):
            segments = result.segments
        elif isinstance(result, dict) and "segments" in result:
            segments = result["segments"]

        if segments:
            srt_path = output_dir_path / f"{audio_stem}.srt"
            srt_path.write_text(_segments_to_srt(segments))
            output_files["srt"] = str(srt_path)

            vtt_path = output_dir_path / f"{audio_stem}.vtt"
            vtt_path.write_text(_segments_to_vtt(segments))
            output_files["vtt"] = str(vtt_path)

        print(f"   Complete! Files: {', '.join(output_files.keys())}")
        return {"success": True, "files": output_files}

    except Exception as e:
        error_msg = str(e)
        print(f"   [Error] Azure Whisper failed: {error_msg[:500]}")
        return {"success": False, "error": error_msg}


def _format_srt_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_vtt_ts(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _get_seg_val(seg, key, default=0):
    return seg.get(key, default) if isinstance(seg, dict) else getattr(seg, key, default)


def _segments_to_srt(segments) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        lines.append(f"{i}")
        lines.append(f"{_format_srt_ts(_get_seg_val(seg, 'start'))} --> {_format_srt_ts(_get_seg_val(seg, 'end'))}")
        lines.append(_get_seg_val(seg, "text", "").strip())
        lines.append("")
    return "\n".join(lines)


def _segments_to_vtt(segments) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{_format_vtt_ts(_get_seg_val(seg, 'start'))} --> {_format_vtt_ts(_get_seg_val(seg, 'end'))}")
        lines.append(_get_seg_val(seg, "text", "").strip())
        lines.append("")
    return "\n".join(lines)


# ── Local Whisper Transcription (Fallback) ──

def run_local_whisper(audio_path: str, output_dir: str, model: str = "medium", language: str = None) -> dict:
    """Run local Whisper (requires openai-whisper + torch)."""
    print(f"\n[Step 2] Running local Whisper (model: {model})...")
    print(f"   NOTE: Requires compatible torch. Use Azure (default) if this fails.")

    cmd = [
        sys.executable, "-m", "whisper", audio_path,
        "--model", model,
        "--output_format", "all",
        "--output_dir", output_dir,
    ]
    if language:
        cmd.extend(["--language", language])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"   [Error] Whisper failed: {result.stderr[-500:]}")
            return {"success": False, "error": result.stderr[-500:]}

        audio_stem = Path(audio_path).stem
        output_files = {}
        for ext in ["txt", "srt", "vtt", "tsv", "json"]:
            f = Path(output_dir) / f"{audio_stem}.{ext}"
            if f.exists():
                output_files[ext] = str(f)

        print(f"   Complete! Files: {', '.join(output_files.keys())}")

        txt_path = output_files.get("txt")
        if txt_path:
            preview = Path(txt_path).read_text()[:200]
            print(f"   Preview: {preview}...")

        return {"success": True, "files": output_files}

    except FileNotFoundError:
        print("   [Error] Whisper not found. Install: pip install openai-whisper")
        return {"success": False, "error": "whisper not installed"}
    except subprocess.TimeoutExpired:
        print("   [Error] Whisper timed out (>10 min)")
        return {"success": False, "error": "timeout"}


# ── File Naming ──

def make_clean_name(video_path: str) -> str:
    import re
    stem = Path(video_path).stem
    clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", stem)
    clean = re.sub(r"_+", "_", clean).strip("_")
    return clean.lower()[:60]


# ── Main ──

def main():
    parser = argparse.ArgumentParser(
        description="Transcribe video → Azure Whisper API (default) or local Whisper (--local)"
    )
    parser.add_argument("video", nargs="?", help="Path to input video file")
    parser.add_argument("--model", default="medium", help="Whisper model (for --local only)")
    parser.add_argument("--language", help="Force language (e.g., en, hi, es)")
    parser.add_argument("--force", action="store_true", help="Force re-transcribe")
    parser.add_argument("--audio-only", action="store_true", help="Only extract audio")
    parser.add_argument("--local", action="store_true", help="Force local Whisper instead of Azure")
    parser.add_argument("--list", action="store_true", help="List all cached transcriptions")

    args = parser.parse_args()
    cache = PipelineCache(project_dir=str(PROJECT_ROOT))

    # --list
    if args.list:
        entries = cache.list_transcripts()
        if not entries:
            print("No cached transcriptions found.")
        else:
            print(f"\nCached transcriptions ({len(entries)}):\n")
            for e in entries:
                print(f"  {e['video_name']}")
                print(f"    Model: {e['model']} | Duration: {e['duration']:.1f}s")
                print(f"    Files: {', '.join(e['files'])}")
                print(f"    Cache: {e['dir']}")
                print()
        sys.exit(0)

    if not args.video:
        parser.error("video path is required (unless using --list)")

    video_path = Path(args.video)
    if not video_path.exists():
        print(f"[Error] Video not found: {args.video}")
        sys.exit(1)

    # Decide method
    azure_available = bool(
        os.getenv("AZURE_ASR_ENDPOINT", "").strip()
        and os.getenv("AZURE_ASR_API_KEY", "").strip()
    )
    use_azure = azure_available and not args.local

    print(f"\n{'='*60}")
    print(f"  Transcription Pipeline")
    print(f"{'='*60}")
    print(f"   Video:  {video_path.name}")
    print(f"   Method: {'Azure Whisper API' if use_azure else 'Local Whisper'}")
    if not use_azure:
        print(f"   Model:  {args.model}")

    # Check cache
    if not args.force and cache.has_transcript(str(video_path)):
        meta = cache.get_transcript_meta(str(video_path))
        files = cache.get_transcript_files(str(video_path))
        transcript_dir = cache.get_transcript_dir(str(video_path))

        print(f"\n[Cache] Already transcribed!")
        print(f"   Cache dir: {transcript_dir}")
        if meta:
            print(f"   Model: {meta.get('model', '?')} | Duration: {meta.get('duration', 0):.1f}s")
        print(f"   Files: {', '.join(files.keys())}")

        _copy_to_stt(files, video_path)

        print(f"\n   Use --force to re-transcribe.")
        sys.exit(0)

    # Get duration
    duration = get_duration(str(video_path))
    print(f"   Duration: {duration:.1f}s")

    # Cache directory
    transcript_dir = cache.get_transcript_dir(str(video_path))
    clean_name = make_clean_name(str(video_path))
    audio_path_str = str(transcript_dir / f"{clean_name}.wav")

    # Step 1: Extract audio
    if not extract_audio(str(video_path), audio_path_str):
        sys.exit(1)

    if args.audio_only:
        print(f"\n[Done] Audio extracted: {audio_path_str}")
        sys.exit(0)

    # Step 2: Transcribe
    if use_azure:
        whisper_result = run_azure_whisper(audio_path_str, str(transcript_dir), language=args.language)
        method_name = "azure-whisper"
    else:
        whisper_result = run_local_whisper(audio_path_str, str(transcript_dir), model=args.model, language=args.language)
        method_name = f"local-whisper-{args.model}"

    if not whisper_result["success"]:
        if use_azure:
            print(f"\n[Error] Azure Whisper failed: {whisper_result.get('error')}")
            print(f"   Try: python transcribe.py \"{args.video}\" --local")
        else:
            print(f"\n[Error] Local Whisper failed: {whisper_result.get('error')}")
            if azure_available:
                print(f"   Try without --local to use Azure Whisper API instead")
        sys.exit(1)

    # Save metadata
    cache.set_transcript_meta(str(video_path), {
        "video_name": video_path.name,
        "video_path": str(video_path.resolve()),
        "file_size": video_path.stat().st_size,
        "duration": duration,
        "model": method_name,
        "language": args.language,
    })

    # Get all output files
    cached_files = cache.get_transcript_files(str(video_path))

    # Copy to data/stt/
    stt_paths = _copy_to_stt(cached_files, video_path)

    # Summary
    print(f"\n{'='*60}")
    print(f"  Transcription Complete!")
    print(f"{'='*60}")
    print(f"   Video:      {video_path.name}")
    print(f"   Duration:   {duration:.1f}s")
    print(f"   Method:     {method_name}")
    print(f"   Cached in:  {transcript_dir}")
    print(f"   Copied to:  data/stt/")
    print(f"   Files:      {', '.join(cached_files.keys())}")

    txt_path = stt_paths.get("txt", "")
    if txt_path:
        print(f"\n   Next step:")
        print(f"   python analyze.py \"{args.video}\" -t {txt_path}")
    print()


def _copy_to_stt(cached_files: dict, video_path: Path) -> dict:
    """Copy cached transcript files to data/stt/ with clean naming."""
    DEFAULT_STT_DIR.mkdir(parents=True, exist_ok=True)
    clean_name = make_clean_name(str(video_path))
    stt_paths = {}

    for ext, src_path in cached_files.items():
        dst = DEFAULT_STT_DIR / f"{clean_name}.{ext}"
        try:
            shutil.copy2(str(src_path), str(dst))
            stt_paths[ext] = str(dst)
        except Exception:
            pass

    if stt_paths:
        print(f"   [Copy] Copied {len(stt_paths)} files to data/stt/{clean_name}.*")

    return stt_paths


if __name__ == "__main__":
    main()
