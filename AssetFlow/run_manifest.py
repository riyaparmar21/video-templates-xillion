"""
Run Manifest — execution trace for every pipeline run.

Captures per-scene, per-query details:
  - Which queries ran against Google Search
  - How many assets each query returned
  - Latency per API call
  - Phase 3 scoring results (pass / fail / score)
  - Final disposition of each scene (approved / hitl / failed)

Written to ``output/run_manifest.json`` after every run (not cached).
"""

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


@dataclass
class APICallRecord:
    """A single API call within a query."""
    api: str                    # google_images | google_videos
    results_count: int = 0      # assets returned
    asset_type_counts: dict = field(default_factory=dict)  # {"photo": 2, "video": 1}
    latency_ms: int = 0         # milliseconds
    retries: int = 0
    status: str = "ok"          # ok | error | timeout | 429_retry | skipped
    error_detail: str = ""

    def to_dict(self) -> dict:
        d = {
            "api": self.api,
            "results_count": self.results_count,
            "latency_ms": self.latency_ms,
            "status": self.status,
        }
        if self.asset_type_counts:
            d["asset_type_counts"] = self.asset_type_counts
        if self.retries:
            d["retries"] = self.retries
        if self.error_detail:
            d["error"] = self.error_detail
        return d


@dataclass
class QueryRecord:
    """A single query (V4 slot) and its API results."""
    query_text: str
    role: str = ""              # hero | support | identity | context | proof | backup
    source: str = ""            # Google_Search
    media_type: str = ""        # video | photo | either
    negative_terms: list[str] = field(default_factory=list)
    api_calls: list[APICallRecord] = field(default_factory=list)

    @property
    def total_results(self) -> int:
        return sum(c.results_count for c in self.api_calls)

    def to_dict(self) -> dict:
        d = {
            "query_text": self.query_text,
            "total_results": self.total_results,
            "api_calls": [c.to_dict() for c in self.api_calls],
        }
        if self.role:
            d["role"] = self.role
        if self.source:
            d["source"] = self.source
        if self.media_type:
            d["media_type"] = self.media_type
        if self.negative_terms:
            d["negative_terms"] = self.negative_terms
        return d


@dataclass
class AssetScoreRecord:
    """Scoring result for a single fetched asset."""
    filename: str
    source: str
    asset_type: str
    overall_score: float
    relevance_score: float = 0.0
    quality_score: float = 0.0
    framing_score: float = 0.0
    passed_threshold: bool = False
    vision_feedback: str = ""

    def to_dict(self) -> dict:
        return {
            "filename": self.filename,
            "source": self.source,
            "asset_type": self.asset_type,
            "overall_score": self.overall_score,
            "relevance": self.relevance_score,
            "quality": self.quality_score,
            "framing": self.framing_score,
            "passed": self.passed_threshold,
            "feedback": self.vision_feedback[:200] if self.vision_feedback else "",
        }


@dataclass
class SceneManifest:
    """Full execution trace for a single scene."""
    scene_id: int
    title: str
    description: str = ""
    destination: str = ""           # derived destination
    scene_function: str = ""        # hook | proof | comparison | explanation
    visual_intent: str = ""         # face | brand | ui | broll | proof

    # Phase 2 — fetching
    queries: list[QueryRecord] = field(default_factory=list)
    fallback_queries_used: bool = False
    total_assets_fetched: int = 0
    fetch_duration_ms: int = 0

    # Phase 3 — scoring
    assets_scored: int = 0
    best_score: float = 0.0
    best_source: str = ""
    best_filename: str = ""
    passed_threshold: bool = False
    all_scores: list[AssetScoreRecord] = field(default_factory=list)
    score_duration_ms: int = 0

    # Final status
    status: str = "pending"         # approved | hitl_pending | failed | skipped_cached

    def to_dict(self) -> dict:
        d = {
            "scene_id": self.scene_id,
            "title": self.title,
            "status": self.status,
            "destination": self.destination,
        }
        if self.scene_function:
            d["scene_function"] = self.scene_function
        if self.visual_intent:
            d["visual_intent"] = self.visual_intent

        # Fetch details
        d["fetch"] = {
            "queries": [q.to_dict() for q in self.queries],
            "fallback_queries_used": self.fallback_queries_used,
            "total_assets_fetched": self.total_assets_fetched,
            "duration_ms": self.fetch_duration_ms,
        }

        # Score details
        if self.all_scores:
            d["scoring"] = {
                "assets_scored": self.assets_scored,
                "best_score": self.best_score,
                "best_source": self.best_source,
                "best_filename": self.best_filename,
                "passed_threshold": self.passed_threshold,
                "duration_ms": self.score_duration_ms,
                "all_scores": [s.to_dict() for s in self.all_scores],
            }

        return d


class RunManifest:
    """
    Accumulates execution data across all pipeline phases and writes
    ``run_manifest.json`` at the end.

    Usage in orchestrator::

        manifest = RunManifest(run_id, script_path)
        self.fetcher.manifest = manifest     # phase 2 records into it
        # ... run pipeline ...
        manifest.write(output_dir)
    """

    def __init__(self, run_id: str = "", script_path: str = ""):
        self.run_id = run_id
        self.script_path = script_path
        self.started_at = datetime.now(timezone.utc)
        self._start_mono = time.monotonic()
        self.scenes: dict[int, SceneManifest] = {}
        self.errors: list[str] = []

    # ── Scene registration ──

    def register_scene(
        self,
        scene_id: int,
        title: str,
        description: str = "",
        destination: str = "",
        scene_function: str = "",
        visual_intent: str = "",
    ) -> SceneManifest:
        """Register a scene in the manifest (called during Phase 1)."""
        sm = SceneManifest(
            scene_id=scene_id,
            title=title,
            description=description,
            destination=destination,
            scene_function=scene_function,
            visual_intent=visual_intent,
        )
        self.scenes[scene_id] = sm
        return sm

    def get_scene(self, scene_id: int) -> Optional[SceneManifest]:
        return self.scenes.get(scene_id)

    # ── Phase 2: Fetch recording ──

    def record_query(
        self,
        scene_id: int,
        query_text: str,
        role: str = "",
        source: str = "",
        media_type: str = "",
        negative_terms: list[str] = None,
    ) -> QueryRecord:
        """Start tracking a query for a scene. Returns the QueryRecord to add API calls to."""
        qr = QueryRecord(
            query_text=query_text,
            role=role,
            source=source,
            media_type=media_type,
            negative_terms=negative_terms or [],
        )
        sm = self.scenes.get(scene_id)
        if sm:
            sm.queries.append(qr)
        return qr

    def record_api_call(
        self,
        query_record: QueryRecord,
        api: str,
        results_count: int,
        latency_ms: int = 0,
        retries: int = 0,
        status: str = "ok",
        error_detail: str = "",
        asset_type_counts: dict = None,
    ):
        """Record a single API call result for a query."""
        query_record.api_calls.append(APICallRecord(
            api=api,
            results_count=results_count,
            latency_ms=latency_ms,
            retries=retries,
            status=status,
            error_detail=error_detail,
            asset_type_counts=asset_type_counts or {},
        ))

    def set_scene_fetch_summary(
        self,
        scene_id: int,
        total_assets: int,
        duration_ms: int = 0,
        fallback_used: bool = False,
    ):
        """Finalize fetch stats for a scene."""
        sm = self.scenes.get(scene_id)
        if sm:
            sm.total_assets_fetched = total_assets
            sm.fetch_duration_ms = duration_ms
            sm.fallback_queries_used = fallback_used

    # ── Phase 3: Scoring recording ──

    def record_score(
        self,
        scene_id: int,
        filename: str,
        source: str,
        asset_type: str,
        overall_score: float,
        relevance: float = 0.0,
        quality: float = 0.0,
        framing: float = 0.0,
        passed: bool = False,
        feedback: str = "",
    ):
        """Record a scoring result for an asset."""
        sm = self.scenes.get(scene_id)
        if not sm:
            return
        sm.all_scores.append(AssetScoreRecord(
            filename=filename,
            source=source,
            asset_type=asset_type,
            overall_score=overall_score,
            relevance_score=relevance,
            quality_score=quality,
            framing_score=framing,
            passed_threshold=passed,
            vision_feedback=feedback,
        ))
        sm.assets_scored = len(sm.all_scores)

    def set_scene_scoring_result(
        self,
        scene_id: int,
        best_score: float,
        best_source: str,
        best_filename: str,
        passed: bool,
        duration_ms: int = 0,
    ):
        """Finalize scoring result for a scene."""
        sm = self.scenes.get(scene_id)
        if sm:
            sm.best_score = best_score
            sm.best_source = best_source
            sm.best_filename = best_filename
            sm.passed_threshold = passed
            sm.score_duration_ms = duration_ms

    def set_scene_status(self, scene_id: int, status: str):
        sm = self.scenes.get(scene_id)
        if sm:
            sm.status = status

    # ── Output ──

    def to_dict(self) -> dict:
        elapsed = time.monotonic() - self._start_mono
        total_api_calls = sum(
            len(q.api_calls)
            for sm in self.scenes.values()
            for q in sm.queries
        )
        total_assets = sum(sm.total_assets_fetched for sm in self.scenes.values())
        approved = sum(1 for sm in self.scenes.values() if sm.status == "approved")
        hitl = sum(1 for sm in self.scenes.values() if sm.status == "hitl_pending")
        failed = sum(1 for sm in self.scenes.values() if sm.status == "failed")

        return {
            "run_id": self.run_id,
            "script": self.script_path,
            "timestamp": self.started_at.isoformat(),
            "duration_seconds": round(elapsed, 2),
            "summary": {
                "total_scenes": len(self.scenes),
                "approved": approved,
                "hitl_pending": hitl,
                "failed": failed,
                "total_api_calls": total_api_calls,
                "total_assets_fetched": total_assets,
            },
            "scenes": [
                self.scenes[sid].to_dict()
                for sid in sorted(self.scenes.keys())
            ],
            "errors": self.errors if self.errors else [],
        }

    def write(self, output_dir: Path):
        """Write run_manifest.json to the output directory."""
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / "run_manifest.json"
        path.write_text(
            json.dumps(self.to_dict(), indent=2, default=str),
            encoding="utf-8",
        )
        return path
