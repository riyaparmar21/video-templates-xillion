"""
FFmpeg scene detection and audio analysis.
Extracts real scene boundaries and audio beats from input video.
"""

import subprocess
import re
import os
from pathlib import Path
from typing import Dict, List, Optional, Any


def detect_scenes(video_path: str, threshold: float = 10.0) -> List[Dict[str, float]]:
    """
    Detects scene changes in a video using FFmpeg scene detection filter.

    Args:
        video_path: Path to the video file
        threshold: Scene detection threshold (0-100, default 10.0)
                   Lower values detect more subtle changes

    Returns:
        List of dictionaries with keys:
            - timestamp (float): Time in seconds where scene change occurs
            - score (float): Detection score (0-1)
    """
    scenes = []

    try:
        # Add implicit scene at t=0
        scenes.append({"timestamp": 0.0, "score": 1.0})

        # Run FFmpeg with scene detection filter
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-filter:v", f"scdet=threshold={threshold}",
            "-f", "null",
            "-"
        ]

        print(f"Detecting scenes in {Path(video_path).name}...")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        # Parse output for scene detection timestamps
        output = result.stderr + result.stdout

        # Pattern: [Parsed_scdet_0 @ 0x...] lavfi.scd.time: 123.456 lavfi.scd.score: 0.789
        pattern = r"lavfi\.scd\.time:\s+([\d.]+)\s+lavfi\.scd\.score:\s+([\d.]+)"

        for match in re.finditer(pattern, output):
            timestamp = float(match.group(1))
            score = float(match.group(2))
            scenes.append({
                "timestamp": timestamp,
                "score": score
            })

        print(f"  Found {len(scenes) - 1} scene changes")
        return scenes

    except FileNotFoundError:
        print("  Error: ffmpeg not found - ensure FFmpeg is installed")
        return [{"timestamp": 0.0, "score": 1.0}]
    except subprocess.TimeoutExpired:
        print("  Error: Scene detection timed out")
        return [{"timestamp": 0.0, "score": 1.0}]
    except Exception as e:
        print(f"  Error during scene detection: {str(e)}")
        return [{"timestamp": 0.0, "score": 1.0}]


def detect_silence(
    video_path: str,
    noise_db: float = -30,
    min_duration: float = 0.3
) -> List[Dict[str, float]]:
    """
    Detects silent regions in a video's audio using FFmpeg.

    Args:
        video_path: Path to the video file
        noise_db: Noise threshold in dB (default -30)
                  Values closer to 0 are less sensitive
        min_duration: Minimum silence duration in seconds (default 0.3)

    Returns:
        List of dictionaries with keys:
            - start (float): Start time in seconds
            - end (float): End time in seconds
            - duration (float): Duration in seconds
    """
    silences = []

    try:
        # Run FFmpeg with silence detection filter
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-af", f"silencedetect=n={noise_db}dB:d={min_duration}",
            "-f", "null",
            "-"
        ]

        print(f"Detecting silence in {Path(video_path).name}...")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        output = result.stderr + result.stdout

        # Parse silence_start and silence_end lines
        # Pattern: [silencedetect @ 0x...] silence_start: 0.123456
        # Pattern: [silencedetect @ 0x...] silence_end: 1.234567 | silence_duration: 1.111111

        silence_starts = {}
        silence_id = 0

        # Find all silence_start entries
        for match in re.finditer(r"silence_start:\s+([\d.]+)", output):
            timestamp = float(match.group(1))
            silence_starts[silence_id] = timestamp
            silence_id += 1

        # Find all silence_end entries with durations
        silence_id = 0
        for match in re.finditer(r"silence_end:\s+([\d.]+)\s+\|\s+silence_duration:\s+([\d.]+)", output):
            end_time = float(match.group(1))
            duration = float(match.group(2))

            if silence_id in silence_starts:
                start_time = silence_starts[silence_id]
                silences.append({
                    "start": start_time,
                    "end": end_time,
                    "duration": duration
                })

            silence_id += 1

        print(f"  Found {len(silences)} silent regions")
        return silences

    except FileNotFoundError:
        print("  Error: ffmpeg not found - ensure FFmpeg is installed")
        return []
    except subprocess.TimeoutExpired:
        print("  Error: Silence detection timed out")
        return []
    except Exception as e:
        print(f"  Error during silence detection: {str(e)}")
        return []


def get_video_duration(video_path: str) -> float:
    """
    Gets the duration of a video file using ffprobe.

    Args:
        video_path: Path to the video file

    Returns:
        Duration in seconds (float)
    """
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1:noprint_wrappers=1",
            video_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            duration_str = result.stdout.strip()
            duration = float(duration_str)
            print(f"Video duration: {duration:.2f} seconds")
            return duration
        else:
            print(f"  Error: Could not determine video duration")
            return 0.0

    except FileNotFoundError:
        print("  Error: ffprobe not found - ensure FFmpeg is installed")
        return 0.0
    except (ValueError, subprocess.TimeoutExpired) as e:
        print(f"  Error getting video duration: {str(e)}")
        return 0.0
    except Exception as e:
        print(f"  Unexpected error: {str(e)}")
        return 0.0


def build_scene_boundaries(
    video_path: str,
    threshold: float = 10.0
) -> List[Dict[str, Any]]:
    """
    Combines scene detection and silence detection to build scene boundaries.

    Args:
        video_path: Path to the video file
        threshold: Scene detection threshold (passed to detect_scenes)

    Returns:
        List of scene dictionaries with keys:
            - scene_id (int): Scene identifier (0-indexed)
            - start (float): Start time in seconds
            - end (float): End time in seconds
            - duration (float): Duration in seconds
    """
    # Get scene change points
    scenes = detect_scenes(video_path, threshold)
    scene_times = [s["timestamp"] for s in scenes]

    # Get silence regions
    silences = detect_silence(video_path)

    # Get video duration
    duration = get_video_duration(video_path)

    if duration <= 0:
        print("  Error: Could not determine video duration")
        return []

    # Build scene boundaries from scene change times
    boundaries = []

    for i in range(len(scene_times)):
        scene_id = i
        start = scene_times[i]

        # End is the next scene time or video duration
        if i + 1 < len(scene_times):
            end = scene_times[i + 1]
        else:
            end = duration

        scene_duration = end - start

        # Only keep scenes longer than 0.5s; merge very short ones
        if scene_duration >= 0.5:
            boundaries.append({
                "scene_id": scene_id,
                "start": start,
                "end": end,
                "duration": scene_duration
            })
        elif boundaries:
            # Merge with previous scene
            boundaries[-1]["end"] = end
            boundaries[-1]["duration"] = boundaries[-1]["end"] - boundaries[-1]["start"]

    print(f"  Built {len(boundaries)} scene boundaries")
    return boundaries


def analyze_video(video_path: str) -> Dict[str, Any]:
    """
    Performs full video analysis: scene boundaries, silence regions, metadata.

    Args:
        video_path: Path to the video file

    Returns:
        Dictionary with keys:
            - duration (float): Video duration in seconds
            - scenes (list): List of scene boundary dictionaries
            - silences (list): List of silence region dictionaries
            - scene_count (int): Number of detected scenes
    """
    print(f"\n=== ANALYZING VIDEO: {Path(video_path).name} ===\n")

    # Get duration
    duration = get_video_duration(video_path)

    if duration <= 0:
        print("Error: Could not analyze video")
        return {
            "duration": 0.0,
            "scenes": [],
            "silences": [],
            "scene_count": 0
        }

    # Get scene boundaries
    print()
    scenes = build_scene_boundaries(video_path)

    # Get silence regions
    print()
    silences = detect_silence(video_path)

    # Summary
    print(f"\n=== ANALYSIS SUMMARY ===")
    print(f"Duration: {duration:.2f}s")
    print(f"Scenes detected: {len(scenes)}")
    print(f"Silent regions: {len(silences)}")

    if scenes:
        total_silent = sum(s["duration"] for s in silences)
        print(f"Total silence: {total_silent:.2f}s ({(total_silent/duration*100):.1f}%)")

    print()

    return {
        "duration": duration,
        "scenes": scenes,
        "silences": silences,
        "scene_count": len(scenes)
    }
