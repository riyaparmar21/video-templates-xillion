"""
AssetFlow Pipeline Cache

Provides run-based caching with resumption support.
Detects existing state on disk (including from previous runs) so interrupted
or repeated runs skip completed work.

Cache structure:
    .cache/
      <run_id>/                     # Hash of script content
        run_meta.json               # Script hash, timestamp, phase progress
        phase1_scenes.json          # Parsed scenes
        phase2_scene_001.json       # Fetch metadata per scene
        phase2_scene_002.json
        phase3_scene_001.json       # Scores per scene
        phase3_scene_003.json

    .staging/                       # Actual downloaded files (shared across runs)
      scene_001/
        google_abc123.jpeg
        google_def456.png
"""

import hashlib
import json
import logging
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional

from AssetFlow.config import Config
from AssetFlow.types import (
    AssetDestination,
    AssetSource,
    AssetType,
    FetchedAsset,
    QuerySlot,
    Scene,
)

logger = logging.getLogger("AssetFlow.cache")


class PhaseStatus(str, Enum):
    NOT_STARTED = "not_started"
    COMPLETE = "complete"
    PARTIAL = "partial"       # Some scenes done, others not


class PipelineCache:
    """
    Manages per-run caching for the AssetFlow pipeline.

    Generates a run_id from script content hash, stores phase outputs as JSON,
    and detects existing downloaded assets on disk.
    """

    def __init__(self, config: Config):
        self.config = config
        self.cache_root = config.staging_dir.parent / ".cache"
        self.cache_root.mkdir(parents=True, exist_ok=True)
        self._run_id: Optional[str] = None
        self._run_dir: Optional[Path] = None

    # ── Run identity ──

    def init_run(self, script_path: Path) -> str:
        """
        Initialize a cache run from a script file.
        Returns the run_id (content hash).
        """
        content = script_path.read_text(encoding="utf-8").strip()
        self._run_id = hashlib.sha256(content.encode()).hexdigest()[:16]
        self._run_dir = self.cache_root / self._run_id
        self._run_dir.mkdir(parents=True, exist_ok=True)

        # Write/update run metadata
        meta_path = self._run_dir / "run_meta.json"
        meta = {}
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())

        meta.update({
            "run_id": self._run_id,
            "script_path": str(script_path),
            "script_hash": self._run_id,
            "last_accessed": datetime.now().isoformat(),
        })
        if "created" not in meta:
            meta["created"] = datetime.now().isoformat()

        meta_path.write_text(json.dumps(meta, indent=2))
        logger.info(f"Cache run: {self._run_id} ({self._run_dir})")
        return self._run_id

    @property
    def run_dir(self) -> Path:
        if self._run_dir is None:
            raise RuntimeError("Call init_run() first")
        return self._run_dir

    # ════════════════════════════════════════════════
    # Phase 1 Cache: Scenes
    # ════════════════════════════════════════════════

    def has_phase1(self) -> bool:
        """Check if Phase 1 output exists in cache."""
        return (self.run_dir / "phase1_scenes.json").exists()

    def save_phase1(self, scenes: list[Scene]):
        """Save Phase 1 results to cache."""
        scenes_data = []
        for s in scenes:
            d = {
                "scene_id": s.scene_id,
                "title": s.title,
                "description": s.description,
                "duration_hint": s.duration_hint,
                "visual_style": s.visual_style,
                "raw_text": s.raw_text,
                "destination": s.destination.value if s.destination else None,
                "api_queries": s.api_queries,
                "fallback_stock_query": s.fallback_stock_query,
                "flag_for_remotion": s.flag_for_remotion,
                "remotion_description": s.remotion_description,
            }
            # V4 fields (only saved when present)
            if s.queries:
                d["v4_queries"] = [
                    {"role": q.role, "source": q.source, "media_type": q.media_type,
                     "text": q.text, "negative_terms": q.negative_terms}
                    for q in s.queries
                ]
                d["v4_fallback_queries"] = [
                    {"role": q.role, "source": q.source, "media_type": q.media_type,
                     "text": q.text, "negative_terms": q.negative_terms}
                    for q in s.fallback_queries
                ]
                d["scene_function"] = s.scene_function
                d["visual_intent"] = s.visual_intent
                d["asset_roles"] = s.asset_roles
                d["remotion_overlay"] = s.remotion_overlay
            scenes_data.append(d)
        (self.run_dir / "phase1_scenes.json").write_text(json.dumps(scenes_data, indent=2))
        logger.info(f"Cached Phase 1: {len(scenes)} scenes")

    def load_phase1(self) -> list[Scene]:
        """Load Phase 1 results from cache (restores V4 fields when present)."""
        scenes_data = json.loads((self.run_dir / "phase1_scenes.json").read_text())

        scenes = []
        for s in scenes_data:
            # Parse destination
            dest = AssetDestination.GOOGLE_SEARCH
            if s.get("destination"):
                try:
                    dest = AssetDestination(s["destination"])
                except ValueError:
                    pass

            # Restore V4 QuerySlot objects if saved
            v4_queries = []
            v4_fallbacks = []
            if s.get("v4_queries"):
                v4_queries = [
                    QuerySlot(
                        role=q.get("role", "hero"),
                        source=q.get("source", "Google_Search"),
                        media_type=q.get("media_type", "either"),
                        text=q.get("text", ""),
                        negative_terms=q.get("negative_terms", []),
                    )
                    for q in s["v4_queries"]
                ]
            if s.get("v4_fallback_queries"):
                v4_fallbacks = [
                    QuerySlot(
                        role=q.get("role", "backup"),
                        source=q.get("source", "Google_Search"),
                        media_type=q.get("media_type", "either"),
                        text=q.get("text", ""),
                        negative_terms=q.get("negative_terms", []),
                    )
                    for q in s["v4_fallback_queries"]
                ]

            scenes.append(Scene(
                scene_id=s["scene_id"],
                title=s["title"],
                description=s["description"],
                duration_hint=s.get("duration_hint"),
                visual_style=s.get("visual_style"),
                raw_text=s.get("raw_text", ""),
                # V4 fields
                scene_function=s.get("scene_function", ""),
                visual_intent=s.get("visual_intent", ""),
                asset_roles=s.get("asset_roles", []),
                queries=v4_queries,
                fallback_queries=v4_fallbacks,
                remotion_overlay=s.get("remotion_overlay", {}),
                # Derived fields
                destination=dest,
                api_queries=s.get("api_queries") or [],
                fallback_stock_query=s.get("fallback_stock_query"),
                flag_for_remotion=s.get("flag_for_remotion", False),
                remotion_description=s.get("remotion_description"),
            ))

        v4_count = sum(1 for s in scenes if s.queries)
        if v4_count:
            logger.info(f"Loaded Phase 1 from cache: {len(scenes)} scenes ({v4_count} with V4 slots)")
        else:
            logger.info(f"Loaded Phase 1 from cache: {len(scenes)} scenes")
        return scenes

    # ════════════════════════════════════════════════
    # Phase 2 Cache: Fetched Assets (per scene)
    # ════════════════════════════════════════════════

    def has_phase2_scene(self, scene_id: int) -> bool:
        """Check if a scene has cached fetch metadata."""
        cache_file = self.run_dir / f"phase2_scene_{scene_id:03d}.json"
        if cache_file.exists():
            return True

        # Also detect assets on disk even without metadata (backfill)
        scene_dir = self.config.staging_dir / f"scene_{scene_id:03d}"
        if scene_dir.exists():
            asset_files = [f for f in scene_dir.iterdir() if f.is_file() and not f.name.startswith(".")]
            if asset_files:
                return True

        return False

    def get_cached_phase2_scenes(self) -> set[int]:
        """Return set of scene IDs that have cached fetch data."""
        cached = set()

        # From explicit cache files
        for f in self.run_dir.glob("phase2_scene_*.json"):
            try:
                sid = int(f.stem.split("_")[-1])
                cached.add(sid)
            except ValueError:
                pass

        # From existing staging directories (backfill detection)
        if self.config.staging_dir.exists():
            for d in self.config.staging_dir.iterdir():
                if d.is_dir() and d.name.startswith("scene_"):
                    try:
                        sid = int(d.name.split("_")[1])
                        asset_files = [f for f in d.iterdir() if f.is_file() and not f.name.startswith(".")]
                        if asset_files:
                            cached.add(sid)
                    except (ValueError, IndexError):
                        pass

        return cached

    def save_phase2_scene(self, scene_id: int, assets: list[FetchedAsset]):
        """Save fetched asset metadata for a scene."""
        data = [
            {
                "scene_id": a.scene_id,
                "source": a.source.value,
                "source_id": a.source_id,
                "source_url": a.source_url,
                "local_path": str(a.local_path),
                "asset_type": a.asset_type.value,
                "width": a.width,
                "height": a.height,
                "has_alpha": a.has_alpha,
                "license_info": a.license_info,
                "attribution": a.attribution,
            }
            for a in assets
        ]
        cache_file = self.run_dir / f"phase2_scene_{scene_id:03d}.json"
        cache_file.write_text(json.dumps(data, indent=2))

    def load_phase2_scene(self, scene_id: int) -> list[FetchedAsset]:
        """
        Load fetched assets for a scene.
        Tries cache JSON first, then scans staging directory for files.
        """
        cache_file = self.run_dir / f"phase2_scene_{scene_id:03d}.json"

        if cache_file.exists():
            data = json.loads(cache_file.read_text())
            assets = []
            for a in data:
                local_path = Path(a["local_path"])
                if local_path.exists():
                    try:
                        source = AssetSource(a["source"])
                    except ValueError:
                        source = AssetSource.GOOGLE
                    try:
                        asset_type = AssetType(a["asset_type"])
                    except ValueError:
                        asset_type = AssetType.PHOTO
                    assets.append(FetchedAsset(
                        scene_id=a["scene_id"],
                        source=source,
                        source_id=a["source_id"],
                        source_url=a["source_url"],
                        local_path=local_path,
                        asset_type=asset_type,
                        width=a.get("width", 0),
                        height=a.get("height", 0),
                        has_alpha=a.get("has_alpha", False),
                        license_info=a.get("license_info", ""),
                        attribution=a.get("attribution", ""),
                    ))
            if assets:
                logger.info(f"Loaded Phase 2 scene {scene_id} from cache: {len(assets)} assets")
                return assets

        # Backfill: scan staging directory for existing files
        scene_dir = self.config.staging_dir / f"scene_{scene_id:03d}"
        if scene_dir.exists():
            assets = self._backfill_scene_assets(scene_id, scene_dir)
            if assets:
                self.save_phase2_scene(scene_id, assets)
                logger.info(f"Backfilled Phase 2 scene {scene_id} from disk: {len(assets)} assets")
                return assets

        return []

    def _backfill_scene_assets(self, scene_id: int, scene_dir: Path) -> list[FetchedAsset]:
        """Reconstruct FetchedAsset objects from files on disk."""
        assets = []
        for fpath in sorted(scene_dir.iterdir()):
            if not fpath.is_file() or fpath.name.startswith("."):
                continue

            source = AssetSource.GOOGLE  # All assets are from Google now

            # Infer type from extension
            ext = fpath.suffix.lower()
            if ext in (".mp4", ".webm", ".mov"):
                asset_type = AssetType.VIDEO
            elif ext == ".gif":
                asset_type = AssetType.GIF
            else:
                asset_type = AssetType.PHOTO

            assets.append(FetchedAsset(
                scene_id=scene_id,
                source=source,
                source_id=fpath.stem,
                source_url="",  # Unknown for backfilled assets
                local_path=fpath,
                asset_type=asset_type,
                width=0,
                height=0,
                has_alpha=ext == ".png",
                license_info="google (backfilled from disk)",
                attribution=f"Backfilled from {fpath.name}",
            ))

        return assets

    # ════════════════════════════════════════════════
    # Phase 3 Cache: Scores (per scene)
    # ════════════════════════════════════════════════

    def has_phase3_scene(self, scene_id: int) -> bool:
        return (self.run_dir / f"phase3_scene_{scene_id:03d}.json").exists()

    def save_phase3_scene(
        self, scene_id: int, best_path: Optional[str], score: float, passed: bool,
        source: str = "", asset_type: str = "", attribution: str = "",
    ):
        """Save the scoring result for a scene."""
        data = {
            "scene_id": scene_id,
            "best_asset_path": best_path,
            "best_score": score,
            "passed_threshold": passed,
            "source": source,
            "asset_type": asset_type,
            "attribution": attribution,
        }
        (self.run_dir / f"phase3_scene_{scene_id:03d}.json").write_text(json.dumps(data, indent=2))

    def load_phase3_scene(self, scene_id: int) -> dict:
        cache_file = self.run_dir / f"phase3_scene_{scene_id:03d}.json"
        if cache_file.exists():
            return json.loads(cache_file.read_text())
        return {}

    # ════════════════════════════════════════════════
    # HITL Cache
    # ════════════════════════════════════════════════

    def has_hitl(self) -> bool:
        return (self.config.hitl_dir / "queue.json").exists()

    # ════════════════════════════════════════════════
    # Approved assets cache
    # ════════════════════════════════════════════════

    def get_approved_scene_ids(self) -> set[int]:
        """Check which scenes already have approved assets in output/."""
        approved = set()
        if not self.config.output_dir.exists():
            return approved
        for f in self.config.output_dir.iterdir():
            if f.is_file() and f.name.startswith("scene_"):
                try:
                    sid = int(f.name.split("_")[1])
                    approved.add(sid)
                except (ValueError, IndexError):
                    pass
        return approved

    # ════════════════════════════════════════════════
    # Cache management
    # ════════════════════════════════════════════════

    def clear_run(self):
        """Delete all cache data for the current run."""
        if self._run_dir and self._run_dir.exists():
            import shutil
            shutil.rmtree(self._run_dir)
            logger.info(f"Cleared cache for run {self._run_id}")

    def clear_scene(self, scene_id: int):
        """Clear all cached data for a specific scene."""
        # Remove cache files
        for pattern in [f"phase2_scene_{scene_id:03d}.json",
                        f"phase3_scene_{scene_id:03d}.json"]:
            f = self.run_dir / pattern
            if f.exists():
                f.unlink()

        # Remove staging files
        scene_dir = self.config.staging_dir / f"scene_{scene_id:03d}"
        if scene_dir.exists():
            import shutil
            shutil.rmtree(scene_dir)

        # Remove approved output
        for f in self.config.output_dir.glob(f"scene_{scene_id:03d}_*"):
            f.unlink()

        logger.info(f"Cleared cache for scene {scene_id}")

    def clear_phases_from(self, from_phase: int):
        """Clear cache for phase N and all subsequent phases across all scenes."""
        if not self._run_dir or not self._run_dir.exists():
            return

        for phase_num in range(from_phase, 4):  # phases 1-3
            for f in self._run_dir.glob(f"phase{phase_num}_*.json"):
                f.unlink()
                logger.debug(f"Cleared {f.name}")

        # If re-running from Phase 3+, also clear approved output
        if from_phase <= 3:
            for f in self.config.output_dir.glob("scene_*"):
                f.unlink()
            logger.debug("Cleared approved output files")

        # Clear HITL queue
        for f in self.config.hitl_dir.glob("*"):
            f.unlink()
        logger.debug("Cleared HITL queue")

        logger.info(f"Cleared cache for phases {from_phase}+")

    def clear_all(self):
        """Nuclear option: clear everything."""
        import shutil
        for d in [self.cache_root, self.config.staging_dir, self.config.output_dir, self.config.hitl_dir]:
            if d.exists():
                shutil.rmtree(d)
                d.mkdir(parents=True, exist_ok=True)
        logger.info("Cleared all AssetFlow cache and data")

    def summary(self) -> str:
        """Print a summary of cached state."""
        lines = [f"Cache run: {self._run_id}"]

        if self.has_phase1():
            scenes = self.load_phase1()
            lines.append(f"  Phase 1: {len(scenes)} scenes (cached)")
        else:
            lines.append("  Phase 1: not cached")

        cached_scenes = self.get_cached_phase2_scenes()
        if cached_scenes:
            lines.append(f"  Phase 2: {len(cached_scenes)} scenes with assets ({sorted(cached_scenes)})")
        else:
            lines.append("  Phase 2: no cached assets")

        approved = self.get_approved_scene_ids()
        if approved:
            lines.append(f"  Approved: {len(approved)} scenes ({sorted(approved)})")

        if self.has_hitl():
            lines.append("  HITL: queue exists")

        return "\n".join(lines)
