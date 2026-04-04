"""
AssetFlow Pipeline Orchestrator

Chains all phases together into a single end-to-end pipeline:
  Phase 1: Script → Scenes → Search Queries (Director's Framework)
  Phase 2: Parallel asset fetching (Google Search via Serper.dev)
  Phase 3: Vision LLM quality gate
  HITL:    Dashboard for manual review of failed scenes

Supports --resume (default), --fresh, and --refetch <scene_ids> modes.
"""

import asyncio
import json
import logging
import shutil
import webbrowser
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config
from AssetFlow.types import (
    ApprovedAsset,
    AssetDestination,
    AssetSource,
    AssetType,
    HITLItem,
    PipelineResult,
    Scene,
    ScoredAsset,
)
from AssetFlow.llm_client import LLMClient
from AssetFlow.cache import PipelineCache
from AssetFlow.phase1_script_parser import ScriptParser
from AssetFlow.phase2_asset_fetcher import AssetFetcher
from AssetFlow.phase3_processor import AssetProcessor
from AssetFlow.phase5_hitl_dashboard import HITLDashboard
from AssetFlow.regen_server import start_regen_server, stop_regen_server
from AssetFlow.run_manifest import RunManifest

logger = logging.getLogger("AssetFlow")


class AssetFlowPipeline:
    """
    Main pipeline orchestrator. Runs all phases in sequence:

    Phase 1: Script → Scenes → Search Queries
    Phase 2: Parallel asset fetching (Google Image Search)
    Phase 3: Pre-processing + Vision LLM quality gate
    HITL:    Dashboard for manual review

    Resume modes:
        resume (default): Skip phases/scenes that already have cached results.
        fresh:            Clear cache for this script, start from scratch.
        refetch:          Re-run only specific scene IDs, keep the rest.

    Usage:
        pipeline = AssetFlowPipeline()
        result = await pipeline.run("path/to/script.txt")
        result = await pipeline.run("path/to/script.txt", mode="fresh")
        result = await pipeline.run("path/to/script.txt", mode="refetch", refetch_scenes=[3, 5])
    """

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.config.ensure_dirs()
        self.llm = LLMClient(self.config)
        self.cache = PipelineCache(self.config)

        # Initialize phase modules
        self.parser = ScriptParser(self.config, self.llm)
        self.fetcher = AssetFetcher(self.config)
        self.processor = AssetProcessor(self.config, self.llm)
        self.hitl = HITLDashboard(self.config)

    def validate_config(self) -> bool:
        """Check configuration and print warnings."""
        issues = self.config.validate()
        if issues:
            for issue in issues:
                logger.warning(f"Config issue: {issue}")
            return False
        return True

    async def run(
        self,
        script_path: str | Path,
        style_anchor: str = "",
        target_format: str = "16:9",
        skip_fetch: bool = False,
        skip_vision: bool = False,
        mode: str = "resume",
        refetch_scenes: Optional[list[int]] = None,
        from_phase: int = 1,
    ) -> PipelineResult:
        """
        Execute the full pipeline.

        Args:
            script_path: Path to the video script file.
            style_anchor: Optional style description for visual consistency.
            skip_fetch: If True, skip Phase 2 (for testing Phase 1 only).
            skip_vision: If True, skip Vision LLM evaluation (auto-pass all assets).
            mode: "resume" (default) | "fresh" | "refetch"
            refetch_scenes: Scene IDs to re-fetch (only used with mode="refetch").
            from_phase: Start from this phase (1-3). Earlier phases load from cache.

        Returns:
            PipelineResult with approved assets and any HITL items.
        """
        script_path = Path(script_path)
        result = PipelineResult(script_path=str(script_path), total_scenes=0)

        # ── Validate ──
        issues = self.config.validate()
        if issues and not skip_fetch:
            for issue in issues:
                result.errors.append(f"Config: {issue}")
            logger.error(f"Pipeline aborted: {len(issues)} config issues")
            return result

        # ── Initialize cache ──
        run_id = self.cache.init_run(script_path)
        logger.info(f"Run ID: {run_id} | Mode: {mode}")

        # ── Run manifest (execution trace — written at end, not cached) ──
        manifest = RunManifest(run_id=run_id, script_path=str(script_path))

        if mode == "fresh":
            logger.info("Fresh mode: clearing all cached data for this script")
            self.cache.clear_run()
            self.cache.init_run(script_path)

        if mode == "refetch" and refetch_scenes:
            logger.info(f"Refetch mode: clearing scenes {refetch_scenes}")
            for sid in refetch_scenes:
                self.cache.clear_scene(sid)

        # When starting from a specific phase, clear that phase onward
        if from_phase > 1:
            logger.info(f"Starting from Phase {from_phase} — clearing phases {from_phase}+ cache")
            self.cache.clear_phases_from(from_phase)

        try:
            # ════════════════════════════════════════════
            # Phase 1: Script Parsing & Query Generation
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 1: Script Parsing & Query Generation")
            logger.info("=" * 60)

            if from_phase > 1:
                if not self.cache.has_phase1():
                    result.errors.append("Cannot start from Phase 2+: no Phase 1 cache found. Run the full pipeline first.")
                    return result
                scenes = self.cache.load_phase1()
                logger.info("(loaded from cache — skipped, starting from later phase)")
            elif self.cache.has_phase1() and mode != "fresh":
                scenes = self.cache.load_phase1()
                logger.info("(loaded from cache)")
            else:
                scenes = self.parser.run(script_path, target_format=target_format, style_anchor=style_anchor)
                self.cache.save_phase1(scenes)

            result.total_scenes = len(scenes)

            # Register scenes in run manifest
            for s in scenes:
                manifest.register_scene(
                    scene_id=s.scene_id,
                    title=s.title,
                    description=s.description,
                    destination=s.destination.value,
                    scene_function=s.scene_function,
                    visual_intent=s.visual_intent,
                )

            # Save phase 1 output (always, for debugging)
            self._save_phase_output(1, {
                "scenes": [self._scene_to_dict(s) for s in scenes],
            })

            if skip_fetch:
                logger.info("Skipping Phases 2-3 (skip_fetch=True)")
                return result

            # ════════════════════════════════════════════
            # Phase 2: Parallel Asset Fetching (Google Search)
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 2: Parallel Asset Fetching (Google Search)")
            logger.info("=" * 60)

            scene_assets = {}
            already_approved = self.cache.get_approved_scene_ids() if from_phase <= 2 else set()

            # Attach manifest to fetcher for per-query tracking
            self.fetcher.manifest = manifest

            # Track Remotion-flagged scenes (they get Google assets but we suggest Remotion upgrades later)
            remotion_scenes = [s for s in scenes if s.flag_for_remotion or s.destination == AssetDestination.REMOTION]

            if remotion_scenes:
                logger.info(f"Scenes flagged for Remotion (fetching baseline + will suggest upgrade): {[s.scene_id for s in remotion_scenes]}")

            if from_phase > 2:
                logger.info("(loading all scene assets from cache — skipped)")
                for s in scenes:
                    if self.cache.has_phase2_scene(s.scene_id):
                        cached_assets = self.cache.load_phase2_scene(s.scene_id)
                        if cached_assets:
                            scene_assets[s.scene_id] = cached_assets

                loaded = sum(len(v) for v in scene_assets.values())
                logger.info(f"Loaded {loaded} assets across {len(scene_assets)} scenes from cache")
                if not scene_assets and scenes:
                    result.errors.append("Cannot start from Phase 3+: no Phase 2 cache found. Run the pipeline from Phase 2 first.")
                    return result
            else:
                scenes_to_fetch = []

                for s in scenes:
                    if s.scene_id in already_approved and mode == "resume":
                        logger.info(f"Scene {s.scene_id}: already approved in output/ — skipping")
                        continue

                    if self.cache.has_phase2_scene(s.scene_id) and mode == "resume":
                        cached_assets = self.cache.load_phase2_scene(s.scene_id)
                        if cached_assets:
                            scene_assets[s.scene_id] = cached_assets
                            logger.info(f"Scene {s.scene_id}: loaded {len(cached_assets)} assets from cache")
                            continue

                    scenes_to_fetch.append(s)

                if scenes_to_fetch:
                    logger.info(
                        f"Fetching {len(scenes_to_fetch)} scenes via Google Search "
                        f"(skipped {len(scenes) - len(scenes_to_fetch)} cached)"
                    )
                    fresh_assets = await self.fetcher.fetch_all_routed(scenes_to_fetch)

                    for scene_id, assets in fresh_assets.items():
                        scene_assets[scene_id] = assets
                        self.cache.save_phase2_scene(scene_id, assets)
                else:
                    logger.info("All scenes loaded from cache — no API calls needed")

            # ════════════════════════════════════════════
            # Phase 3: Processing & Quality Gate
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 3: Processing & Vision Quality Gate")
            logger.info("=" * 60)

            scenes_needing_review = []
            scene_map = {s.scene_id: s for s in scenes}

            for scene in scenes:
                # Skip already-approved scenes
                if scene.scene_id in already_approved and mode == "resume" and from_phase < 3:
                    for f in self.config.output_dir.glob(f"scene_{scene.scene_id:03d}_*"):
                        inferred_source = AssetSource.GOOGLE
                        inferred_type = AssetType.PHOTO
                        fname = f.name.lower()
                        if fname.endswith((".mp4", ".mov", ".webm")):
                            inferred_type = AssetType.VIDEO
                        elif fname.endswith(".gif"):
                            inferred_type = AssetType.GIF
                        result.approved_assets.append(ApprovedAsset(
                            scene_id=scene.scene_id,
                            scene_title=scene.title,
                            final_path=f,
                            source=inferred_source,
                            asset_type=inferred_type,
                            score=7.0,
                            attribution="Previously approved",
                        ))
                        break
                    continue

                # Check Phase 3 cache
                if self.cache.has_phase3_scene(scene.scene_id) and mode == "resume" and from_phase < 3:
                    p3_data = self.cache.load_phase3_scene(scene.scene_id)
                    if p3_data.get("passed_threshold"):
                        best_path = p3_data.get("best_asset_path")
                        if best_path and Path(best_path).exists():
                            cached_source = AssetSource(p3_data["source"]) if p3_data.get("source") else AssetSource.GOOGLE
                            cached_type = AssetType(p3_data["asset_type"]) if p3_data.get("asset_type") else AssetType.PHOTO
                            result.approved_assets.append(ApprovedAsset(
                                scene_id=scene.scene_id,
                                scene_title=scene.title,
                                final_path=Path(best_path),
                                source=cached_source,
                                asset_type=cached_type,
                                score=p3_data.get("best_score", 7.0),
                                attribution=p3_data.get("attribution", "Previously scored"),
                            ))
                            logger.info(f"Scene {scene.scene_id}: approved (from cache, score {p3_data.get('best_score', '?')})")
                            continue

                assets = scene_assets.get(scene.scene_id, [])

                if not assets:
                    logger.warning(f"Scene {scene.scene_id}: no assets fetched")
                    scenes_needing_review.append((scene, []))
                    manifest.set_scene_status(scene.scene_id, "failed")
                    continue

                if skip_vision:
                    best = ScoredAsset(
                        asset=assets[0],
                        overall_score=7.0,
                        passed_threshold=True,
                        vision_feedback="Auto-passed (vision skipped)",
                    )
                    all_scored = [best]
                else:
                    best, all_scored = self.processor.process_scene(
                        scene, assets, style_anchor
                    )

                # Record all scores in manifest
                for scored in all_scored:
                    a = scored.asset
                    fname = a.local_path.name if a.local_path else f"{a.source.value}_{a.source_id}"
                    manifest.record_score(
                        scene.scene_id,
                        filename=fname,
                        source=a.source.value,
                        asset_type=a.asset_type.value,
                        overall_score=scored.overall_score,
                        relevance=scored.relevance_score,
                        quality=scored.quality_score,
                        framing=scored.framing_score,
                        passed=scored.passed_threshold,
                        feedback=scored.vision_feedback,
                    )

                if best and best.passed_threshold:
                    final_path = self._copy_to_output(best, scene)
                    result.approved_assets.append(ApprovedAsset(
                        scene_id=scene.scene_id,
                        scene_title=scene.title,
                        final_path=final_path,
                        source=best.asset.source,
                        asset_type=best.asset.asset_type,
                        score=best.overall_score,
                        attribution=best.asset.attribution,
                    ))
                    self.cache.save_phase3_scene(
                        scene.scene_id,
                        str(final_path),
                        best.overall_score,
                        True,
                        source=best.asset.source.value,
                        asset_type=best.asset.asset_type.value,
                        attribution=best.asset.attribution,
                    )
                    b = best.asset
                    manifest.set_scene_scoring_result(
                        scene.scene_id,
                        best_score=best.overall_score,
                        best_source=b.source.value,
                        best_filename=b.local_path.name if b.local_path else "",
                        passed=True,
                    )
                    manifest.set_scene_status(scene.scene_id, "approved")
                else:
                    scenes_needing_review.append((scene, all_scored))
                    self.cache.save_phase3_scene(scene.scene_id, None, 0.0, False)
                    top = max(all_scored, key=lambda s: s.overall_score) if all_scored else None
                    manifest.set_scene_scoring_result(
                        scene.scene_id,
                        best_score=top.overall_score if top else 0.0,
                        best_source=top.asset.source.value if top else "",
                        best_filename=top.asset.local_path.name if top and top.asset.local_path else "",
                        passed=False,
                    )
                    manifest.set_scene_status(scene.scene_id, "hitl_pending")

            # ════════════════════════════════════════════
            # HITL Dashboard (for scenes that failed quality gate)
            # ════════════════════════════════════════════
            if scenes_needing_review:
                logger.info("=" * 60)
                logger.info(f"HITL Dashboard ({len(scenes_needing_review)} scenes need review)")
                logger.info(f"  Scenes: {[s.scene_id for s, _ in scenes_needing_review]}")
                logger.info("=" * 60)

                for scene, failed_scores in scenes_needing_review:
                    self.hitl.add_to_queue(
                        scene_id=scene.scene_id,
                        scene_title=scene.title,
                        scene_description=scene.description,
                        failed_assets=failed_scores,
                    )

                # Start regen server for the dashboard
                regen_server = None
                regen_port = 0
                try:
                    regen_server, regen_port = start_regen_server(
                        config=self.config,
                        scenes=scenes,
                    )
                except Exception as e:
                    logger.warning(f"Could not start regen server: {e}")

                self.hitl.save_queue()
                dashboard_path = self.hitl.generate_dashboard(regen_port=regen_port)

                result.hitl_pending = list(self.hitl.queue)

                logger.info(f"Review dashboard: {dashboard_path}")
                if regen_port:
                    logger.info(f"Regen server running on http://127.0.0.1:{regen_port}")
                logger.info(
                    "Opening dashboard in browser... "
                    "After selecting assets, run: python -m AssetFlow resolve <selections.json>"
                )

                try:
                    webbrowser.open(f"file://{dashboard_path.resolve()}")
                except Exception as e:
                    logger.warning(f"Could not auto-open browser: {e}")

                if regen_server:
                    logger.info(
                        "Regen server is running. Press Ctrl+C when done reviewing, "
                        "then run: python -m AssetFlow resolve <selections.json>"
                    )
                    try:
                        import threading
                        threading.Event().wait()
                    except KeyboardInterrupt:
                        pass
                    finally:
                        stop_regen_server(regen_server)

            # ── Collect Remotion upgrade suggestions ──
            for scene in remotion_scenes:
                desc = (
                    scene.remotion_overlay.get("description")
                    or scene.remotion_description
                    or scene.description
                )
                result.remotion_suggestions.append({
                    "scene_id": scene.scene_id,
                    "title": scene.title,
                    "remotion_description": desc,
                    "has_stock_asset": any(
                        a.scene_id == scene.scene_id for a in result.approved_assets
                    ),
                })

            # ── Save final state ──
            self._save_phase_output("final", {
                "summary": result.summary(),
                "approved": len(result.approved_assets),
                "hitl_pending": len(result.hitl_pending),
                "remotion_suggestions": result.remotion_suggestions,
                "errors": result.errors,
            })

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            result.errors.append(str(e))
            manifest.errors.append(str(e))

        # ── Write run manifest ──
        try:
            manifest_path = manifest.write(self.config.output_dir)
            logger.info(f"Run manifest saved: {manifest_path}")
        except Exception as e:
            logger.warning(f"Could not write run manifest: {e}")

        # ── Report ──
        logger.info("=" * 60)
        logger.info(result.summary())
        logger.info("=" * 60)

        return result

    async def resolve_hitl(self, selections_path: str | Path) -> list[ApprovedAsset]:
        """
        Apply HITL selections and finalize the remaining assets.
        """
        selections_path = Path(selections_path)

        queue_file = self.config.hitl_dir / "queue.json"
        if queue_file.exists():
            queue_data = json.loads(queue_file.read_text())
            for item_data in queue_data:
                self.hitl.add_to_queue(
                    scene_id=item_data["scene_id"],
                    scene_title=item_data["scene_title"],
                    scene_description=item_data["scene_description"],
                    failed_assets=[],
                )

        resolved = self.hitl.apply_selections(selections_path)

        new_approved = []
        for item in resolved:
            approved = self.hitl.get_approved_asset_for_item(item)
            if approved:
                dest = self.config.output_dir / f"scene_{item.scene_id:03d}_{approved.final_path.name}"
                if approved.final_path.exists():
                    shutil.copy2(approved.final_path, dest)
                    approved.final_path = dest
                new_approved.append(approved)

        logger.info(f"Resolved {len(new_approved)} HITL items")
        return new_approved

    # ── Helpers ──

    def _copy_to_output(self, scored: ScoredAsset, scene: Scene) -> Path:
        src = scored.asset.local_path
        ext = src.suffix
        dest = self.config.output_dir / f"scene_{scene.scene_id:03d}_{scene.title.replace(' ', '_')}{ext}"
        shutil.copy2(src, dest)
        return dest

    def _save_phase_output(self, phase: int | str, data: dict):
        path = self.config.output_dir / f"phase_{phase}_output.json"
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    @staticmethod
    def _scene_to_dict(scene: Scene) -> dict:
        d = {
            "scene_id": scene.scene_id,
            "title": scene.title,
            "description": scene.description,
            "duration_hint": scene.duration_hint,
            "visual_style": scene.visual_style,
            "raw_text": scene.raw_text,
            "destination": scene.destination.value,
        }
        if scene.queries:
            d["queries"] = [
                {"role": q.role, "source": q.source, "media_type": q.media_type,
                 "text": q.text, "negative_terms": q.negative_terms}
                for q in scene.queries
            ]
            d["fallback_queries"] = [
                {"role": q.role, "source": q.source, "media_type": q.media_type,
                 "text": q.text}
                for q in scene.fallback_queries
            ]
            d["scene_function"] = scene.scene_function
            d["visual_intent"] = scene.visual_intent
            d["remotion_overlay"] = scene.remotion_overlay
        else:
            d["api_queries"] = scene.api_queries
            d["flag_for_remotion"] = scene.flag_for_remotion
            d["remotion_description"] = scene.remotion_description
        return d
