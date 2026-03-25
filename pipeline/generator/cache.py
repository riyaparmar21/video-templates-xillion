"""
Pipeline Cache Manager — Video-Centric Storage

Everything cached is organized by video name:

  cache/
    bitcoin_s_safety_net_just_broke/
      metadata.json           — ffprobe video info
      scenes.json             — FFmpeg scene detection
      blueprint_parsed.json   — parsed blueprint data
      scene_plan.json         — multi-agent scene plan (Agent 1)
      frame_check.json        — test render results
      transcript/             — transcription files (wav, txt, srt)
      analysis/               — AI analysis blueprint (markdown)
      frames/                 — extracted video frames (jpg)
      specs/                  — versioned generated specs
        v1.json
        v2.json

Usage:
    from generator.cache import PipelineCache

    cache = PipelineCache(project_dir=".")

    # All methods take a video_path as primary key
    cache.set_metadata("video.mp4", {...})
    data = cache.get_metadata("video.mp4")

    # Subdirectories for file-based caches
    t_dir = cache.get_transcript_dir("video.mp4")
    a_dir = cache.get_analysis_dir("video.mp4")

    # Versioned specs
    cache.set_spec("video.mp4", json_string)
    spec = cache.get_spec("video.mp4", version=2)

    # Multi-agent scene plan (cached separately from specs)
    cache.set_scene_plan("video.mp4", plan_dict)
    plan = cache.get_scene_plan("video.mp4")

    # Maintenance
    cache.clear()
    cache.clear("bitcoin_s_safety_net_just_broke")
    print(cache.stats())
"""

import datetime
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional


def _safe_name(file_path: str) -> str:
    """
    Extract a human-readable folder name from a file path.
    Cleans up the stem: lowercases, replaces spaces/special chars with
    underscores, collapses runs, truncates to 50 chars.

    Examples:
        "Bitcoin's safety net just broke.mp4" → "bitcoin_s_safety_net_just_broke"
        "input-graphic-clipped.mp4"           → "input-graphic-clipped"
        "My Cool Video (Final).mov"           → "my_cool_video_final"
    """
    stem = Path(file_path).stem
    clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", stem)
    clean = re.sub(r"_+", "_", clean).strip("_")
    clean = clean.lower()
    return clean[:50] if len(clean) > 50 else clean


class PipelineCache:
    """File-based cache organized by video name."""

    def __init__(self, cache_dir: Optional[str] = None, project_dir: Optional[str] = None):
        if cache_dir:
            self.root = Path(cache_dir)
        elif project_dir:
            self.root = Path(project_dir) / "cache"
        else:
            self.root = Path(__file__).parent.parent.parent / "cache"
        self.root.mkdir(parents=True, exist_ok=True)

    # ────────────────────────────────────────
    # Video directory
    # ────────────────────────────────────────

    def video_dir(self, video_path: str) -> Path:
        """
        Get or create the cache folder for a video.
        Returns: cache/{clean_video_name}/
        """
        name = _safe_name(video_path)
        d = self.root / name
        d.mkdir(parents=True, exist_ok=True)
        return d

    def video_name(self, video_path: str) -> str:
        """Get the clean folder name for a video."""
        return _safe_name(video_path)

    # ────────────────────────────────────────
    # Fingerprinting (for invalidation)
    # ────────────────────────────────────────

    @staticmethod
    def _short_hash(raw: str) -> str:
        """8-char hex hash."""
        return hashlib.sha256(raw.encode()).hexdigest()[:8]

    @staticmethod
    def file_fingerprint(file_path: str) -> str:
        """Fast fingerprint: path + mtime + size → 8-char hex."""
        p = Path(file_path).resolve()
        if not p.exists():
            raise FileNotFoundError(f"Not found: {file_path}")
        stat = p.stat()
        raw = f"{p}|{stat.st_mtime_ns}|{stat.st_size}"
        return hashlib.sha256(raw.encode()).hexdigest()[:8]

    @staticmethod
    def content_fingerprint(content: str) -> str:
        """Fingerprint from string content → 8-char hex."""
        return hashlib.sha256(content.encode()).hexdigest()[:8]

    # ────────────────────────────────────────
    # Generic JSON get / set (within video folder)
    # ────────────────────────────────────────

    def _get_json(self, video_path: str, filename: str) -> Optional[Any]:
        """Read a JSON file from the video's cache folder."""
        f = self.video_dir(video_path) / f"{filename}.json"
        if f.exists():
            try:
                return json.loads(f.read_text())
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def _set_json(self, video_path: str, filename: str, data: Any) -> None:
        """Write a JSON file to the video's cache folder."""
        f = self.video_dir(video_path) / f"{filename}.json"
        try:
            f.write_text(json.dumps(data, indent=2, default=str))
        except OSError as e:
            print(f"   [Cache] Write failed ({filename}): {e}")

    # ────────────────────────────────────────
    # metadata  —  ffprobe video info
    # ────────────────────────────────────────

    def get_metadata(self, video_path: str) -> Optional[Dict]:
        result = self._get_json(video_path, "metadata")
        if result:
            print(f"   [Cache] metadata hit → {Path(video_path).name}")
        return result

    def set_metadata(self, video_path: str, metadata: Dict) -> None:
        self._set_json(video_path, "metadata", metadata)

    # ────────────────────────────────────────
    # scenes  —  FFmpeg scene detection
    # ────────────────────────────────────────

    def get_scenes(self, video_path: str) -> Optional[List[Dict]]:
        result = self._get_json(video_path, "scenes")
        if result:
            print(f"   [Cache] scenes hit → {Path(video_path).name}")
        return result

    def set_scenes(self, video_path: str, scenes: List[Dict]) -> None:
        self._set_json(video_path, "scenes", scenes)

    # ────────────────────────────────────────
    # blueprint_parsed  —  parsed blueprint data
    # ────────────────────────────────────────

    def get_blueprint(self, video_path: str) -> Optional[Dict]:
        result = self._get_json(video_path, "blueprint_parsed")
        if result:
            print(f"   [Cache] blueprint hit → {Path(video_path).name}")
        return result

    def set_blueprint(self, video_path: str, parsed: Dict) -> None:
        self._set_json(video_path, "blueprint_parsed", parsed)

    # ────────────────────────────────────────
    # scene_plan  —  multi-agent scene plan (Agent 1 output)
    # ────────────────────────────────────────

    def get_scene_plan(self, video_path: str) -> Optional[Dict]:
        result = self._get_json(video_path, "scene_plan")
        if result:
            print(f"   [Cache] scene_plan hit → {Path(video_path).name}")
        return result

    def set_scene_plan(self, video_path: str, plan: Dict) -> None:
        self._set_json(video_path, "scene_plan", plan)

    # ────────────────────────────────────────
    # frame_check  —  test render results
    # ────────────────────────────────────────

    def get_frame_check(self, video_path: str) -> Optional[Dict]:
        return self._get_json(video_path, "frame_check")

    def set_frame_check(self, video_path: str, result: Dict) -> None:
        self._set_json(video_path, "frame_check", result)

    # ────────────────────────────────────────
    # specs/  —  versioned generated video specs
    # ────────────────────────────────────────

    def _specs_dir(self, video_path: str) -> Path:
        d = self.video_dir(video_path) / "specs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def list_specs(self, video_path: str) -> List[Dict[str, Any]]:
        """List all cached spec versions for a video, sorted by version."""
        specs_dir = self._specs_dir(video_path)
        results = []

        for f in sorted(specs_dir.glob("v*.json")):
            m = re.match(r"v(\d+)\.json", f.name)
            if not m:
                continue
            version = int(m.group(1))

            scenes = 0
            created_at = None
            created_date = None
            created_time = None
            timestamp_unix = None
            try:
                data = json.loads(f.read_text())
                if "spec_json" in data:
                    spec = json.loads(data["spec_json"])
                    scenes = len(spec.get("scenes", []))
                created_at = data.get("created_at")
                created_date = data.get("created_date")
                created_time = data.get("created_time")
                timestamp_unix = data.get("timestamp_unix")
            except (json.JSONDecodeError, OSError):
                pass

            mtime = datetime.datetime.fromtimestamp(f.stat().st_mtime)
            # Use embedded created_at if available, otherwise fall back to file mtime
            display_time = created_at or mtime.strftime("%Y-%m-%d %H:%M:%S")

            results.append({
                "version": version,
                "file": f,
                "name": f.name,
                "created_at": created_at,
                "created_date": created_date or mtime.strftime("%b %d, %Y"),
                "created_time": created_time or mtime.strftime("%I:%M %p"),
                "timestamp_unix": timestamp_unix or int(mtime.timestamp()),
                "mtime": mtime.strftime("%b %d, %H:%M"),
                "display_time": display_time,
                "scenes": scenes,
            })

        results.sort(key=lambda x: x["version"])
        return results

    def get_spec(
        self,
        video_path: str,
        version: Optional[int] = None,
    ) -> Optional[str]:
        """Get a cached spec JSON string. version=None returns latest."""
        entries = self.list_specs(video_path)
        if not entries:
            return None

        target = None
        if version is not None:
            for e in entries:
                if e["version"] == version:
                    target = e
                    break
            if target is None:
                versions = [e["version"] for e in entries]
                print(f"   [Cache] Version {version} not found. Available: {versions}")
                return None
        else:
            target = entries[-1]

        try:
            data = json.loads(target["file"].read_text())
            if "spec_json" in data:
                ts = data.get("created_at") or target.get("mtime", "unknown")
                print(f"   [Cache] specs hit → v{target['version']} (created: {ts})")
                return data["spec_json"]
        except (json.JSONDecodeError, OSError):
            pass
        return None

    def set_spec(
        self,
        video_path: str,
        spec_json: str,
        extra: Optional[Dict] = None,
    ) -> int:
        """
        Save a spec with auto-incrementing version number.
        Returns the version number.
        """
        entries = self.list_specs(video_path)
        version = (entries[-1]["version"] + 1) if entries else 1
        specs_dir = self._specs_dir(video_path)
        f = specs_dir / f"v{version}.json"

        now = datetime.datetime.now()
        data = {
            "spec_json": spec_json,
            "version": version,
            "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "created_date": now.strftime("%b %d, %Y"),
            "created_time": now.strftime("%I:%M %p"),
            "timestamp_unix": int(now.timestamp()),
            **(extra or {}),
        }
        f.write_text(json.dumps(data, indent=2, default=str))
        print(f"   [Cache] Saved spec v{version} ({now.strftime('%b %d, %Y %I:%M %p')})")
        return version

    # ────────────────────────────────────────
    # transcript/  —  transcription files
    # ────────────────────────────────────────

    def get_transcript_dir(self, video_path: str) -> Path:
        """cache/{video}/transcript/"""
        d = self.video_dir(video_path) / "transcript"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def has_transcript(self, video_path: str) -> bool:
        d = self.video_dir(video_path) / "transcript"
        if not d.exists():
            return False
        return any(d.glob("*.txt"))

    def get_transcript_meta(self, video_path: str) -> Optional[Dict]:
        return self._get_json(video_path, "transcript_meta")

    def set_transcript_meta(self, video_path: str, meta: Dict) -> None:
        self._set_json(video_path, "transcript_meta", meta)

    def get_transcript_files(self, video_path: str) -> Dict[str, Path]:
        """Returns dict: {"txt": Path, "srt": Path, "wav": Path, ...}"""
        d = self.video_dir(video_path) / "transcript"
        if not d.exists():
            return {}
        result = {}
        for f in d.iterdir():
            if f.is_file():
                result[f.suffix.lstrip(".")] = f
        return result

    def list_transcripts(self) -> List[Dict[str, Any]]:
        """List all videos that have cached transcripts."""
        results = []
        if not self.root.exists():
            return results
        for video_dir in sorted(self.root.iterdir()):
            if not video_dir.is_dir():
                continue
            t_dir = video_dir / "transcript"
            if not t_dir.exists() or not any(t_dir.glob("*.txt")):
                continue
            meta = {}
            meta_file = video_dir / "transcript_meta.json"
            if meta_file.exists():
                try:
                    meta = json.loads(meta_file.read_text())
                except (json.JSONDecodeError, OSError):
                    pass
            files = [f.name for f in t_dir.iterdir() if f.is_file()]
            results.append({
                "key": video_dir.name,
                "video_name": meta.get("video_name", video_dir.name),
                "model": meta.get("model", "?"),
                "duration": meta.get("duration", 0),
                "files": files,
                "dir": t_dir,
            })
        return results

    # ────────────────────────────────────────
    # analysis/  —  AI analysis blueprints
    # ────────────────────────────────────────

    def get_analysis_dir(self, video_path: str) -> Path:
        """cache/{video}/analysis/"""
        d = self.video_dir(video_path) / "analysis"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def has_analysis(self, video_path: str) -> bool:
        d = self.video_dir(video_path) / "analysis"
        if not d.exists():
            return False
        return any(d.glob("*.md"))

    def get_analysis_meta(self, video_path: str) -> Optional[Dict]:
        return self._get_json(video_path, "analysis_meta")

    def set_analysis_meta(self, video_path: str, meta: Dict) -> None:
        self._set_json(video_path, "analysis_meta", meta)

    def get_analysis_blueprint(self, video_path: str) -> Optional[str]:
        d = self.video_dir(video_path) / "analysis"
        if not d.exists():
            return None
        for f in d.glob("*.md"):
            return f.read_text()
        return None

    def list_analyses(self) -> List[Dict[str, Any]]:
        """List all videos that have cached analyses."""
        results = []
        if not self.root.exists():
            return results
        for video_dir in sorted(self.root.iterdir()):
            if not video_dir.is_dir():
                continue
            a_dir = video_dir / "analysis"
            if not a_dir.exists() or not any(a_dir.glob("*.md")):
                continue
            meta = {}
            meta_file = video_dir / "analysis_meta.json"
            if meta_file.exists():
                try:
                    meta = json.loads(meta_file.read_text())
                except (json.JSONDecodeError, OSError):
                    pass
            files = [f.name for f in a_dir.iterdir() if f.is_file()]
            results.append({
                "key": video_dir.name,
                "video_name": meta.get("video_name", video_dir.name),
                "model": meta.get("model", "?"),
                "duration": meta.get("duration", 0),
                "frames_sampled": meta.get("frames_sampled", 0),
                "has_transcript": meta.get("has_transcript", False),
                "blueprint_path": meta.get("blueprint_path", ""),
                "files": files,
                "dir": a_dir,
            })
        return results

    # ────────────────────────────────────────
    # frames/  —  extracted video frames
    # ────────────────────────────────────────

    def get_frames_dir(self, video_path: str) -> Path:
        """cache/{video}/frames/"""
        d = self.video_dir(video_path) / "frames"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def has_frames(self, video_path: str) -> bool:
        d = self.video_dir(video_path) / "frames"
        if not d.exists():
            return False
        return any(d.glob("*.jpg")) or any(d.glob("*.png"))

    # ────────────────────────────────────────
    # Maintenance
    # ────────────────────────────────────────

    def list_videos(self) -> List[str]:
        """List all cached video folder names."""
        if not self.root.exists():
            return []
        return sorted([
            d.name for d in self.root.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ])

    def clear(self, video_name: Optional[str] = None) -> int:
        """
        Clear cache.
        - No args: clear everything
        - video_name: clear only that video's folder
        Returns count of files removed.
        """
        count = 0

        if video_name:
            target = self.root / video_name
            if target.exists() and target.is_dir():
                for item in target.rglob("*"):
                    if item.is_file():
                        item.unlink()
                        count += 1
                shutil.rmtree(target, ignore_errors=True)
            else:
                print(f"   [Cache] Not found: {video_name}")
                print(f"   Available: {', '.join(self.list_videos())}")
        else:
            for d in self.root.iterdir():
                if d.is_dir() and not d.name.startswith("."):
                    for item in d.rglob("*"):
                        if item.is_file():
                            item.unlink()
                            count += 1
                    shutil.rmtree(d, ignore_errors=True)

        label = f" ({video_name})" if video_name else " (all)"
        print(f"   [Cache] Cleared {count} files{label}")
        return count

    def stats(self) -> Dict[str, Any]:
        """Size breakdown by video folder."""
        total_files = 0
        total_size = 0
        by_video: Dict[str, Dict[str, Any]] = {}

        for d in sorted(self.root.iterdir()):
            if not d.is_dir() or d.name.startswith("."):
                continue
            v_files = 0
            v_size = 0
            for item in d.rglob("*"):
                if item.is_file():
                    v_files += 1
                    v_size += item.stat().st_size
            by_video[d.name] = {
                "files": v_files,
                "size_mb": round(v_size / (1024 * 1024), 2),
            }
            total_files += v_files
            total_size += v_size

        return {
            "cache_dir": str(self.root),
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "videos": by_video,
        }

    def __repr__(self) -> str:
        s = self.stats()
        return f"PipelineCache({s['total_files']} files, {s['total_size_mb']}MB, {len(s['videos'])} videos)"
