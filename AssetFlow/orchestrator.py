"""
AssetFlow Pipeline Orchestrator

Chains all 5 phases together into a single end-to-end pipeline.
Supports full auto-run and phase-by-phase execution.
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
    AssetSource,
    AssetType,
    HITLItem,
    PipelineResult,
    Scene,
    SceneQuery,
    ScoredAsset,
)
from AssetFlow.llm_client import LLMClient
from AssetFlow.phase1_script_parser import ScriptParser
from AssetFlow.phase2_asset_fetcher import AssetFetcher
from AssetFlow.phase3_processor import AssetProcessor
from AssetFlow.phase4_svg_fallback import SVGFallbackGenerator
from AssetFlow.phase5_hitl_dashboard import HITLDashboard

logger = logging.getLogger("AssetFlow")


class AssetFlowPipeline:
    """
    Main pipeline orchestrator. Runs all phases in sequence:

    Phase 1: Script → Scenes → Search Queries
    Phase 2: Parallel asset fetching from APIs
    Phase 3: Pre-processing (rembg) + Vision LLM quality gate
    Phase 4: SVG fallback for failed scenes
    Phase 5: HITL dashboard for manual review

    Usage:
        pipeline = AssetFlowPipeline()
        result = await pipeline.run("path/to/script.txt")
    """

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.llm = LLMClient(self.config)

        # Initialize phase modules
        self.parser = ScriptParser(self.config, self.llm)
        self.fetcher = AssetFetcher(self.config)
        self.processor = AssetProcessor(self.config, self.llm)
        self.svg_gen = SVGFallbackGenerator(self.config, self.llm)
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
        skip_fetch: bool = False,
        skip_vision: bool = False,
    ) -> PipelineResult:
        """
        Execute the full pipeline.

        Args:
            script_path: Path to the video script file.
            style_anchor: Optional style description for visual consistency.
            skip_fetch: If True, skip Phase 2 (for testing phases 1 only).
            skip_vision: If True, skip Vision LLM evaluation (auto-pass all assets).

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

        try:
            # ════════════════════════════════════════════
            # Phase 1: Script Parsing & Query Generation
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 1: Script Parsing & Query Generation")
            logger.info("=" * 60)

            scenes, queries = self.parser.run(script_path)
            result.total_scenes = len(scenes)

            # Save phase 1 output
            self._save_phase_output(1, {
                "scenes": [self._scene_to_dict(s) for s in scenes],
                "queries": [self._query_to_dict(q) for q in queries],
            })

            if skip_fetch:
                logger.info("Skipping Phases 2-5 (skip_fetch=True)")
                return result

            # ════════════════════════════════════════════
            # Phase 2: Parallel Asset Fetching
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 2: Parallel Asset Fetching")
            logger.info("=" * 60)

            scene_assets = await self.fetcher.fetch_all(queries)

            # ════════════════════════════════════════════
            # Phase 3: Processing & Quality Gate
            # ════════════════════════════════════════════
            logger.info("=" * 60)
            logger.info("PHASE 3: Processing & Vision Quality Gate")
            logger.info("=" * 60)

            scenes_needing_fallback = []
            scene_map = {s.scene_id: s for s in scenes}

            for scene in scenes:
                assets = scene_assets.get(scene.scene_id, [])

                if not assets:
                    logger.warning(f"Scene {scene.scene_id}: no assets fetched")
                    scenes_needing_fallback.append((scene, []))
                    continue

                if skip_vision:
                    # Auto-approve the first asset
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

                if best and best.passed_threshold:
                    # Copy approved asset to output
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
                else:
                    scenes_needing_fallback.append((scene, all_scored))

            # ════════════════════════════════════════════
            # Phase 4: SVG Fallback (for failed scenes)
            # ════════════════════════════════════════════
            if scenes_needing_fallback:
                logger.info("=" * 60)
                logger.info(f"PHASE 4: SVG Fallback ({len(scenes_needing_fallback)} scenes)")
                logger.info("=" * 60)

                for scene, failed_scores in scenes_needing_fallback:
                    variants = self.svg_gen.generate_variants(scene)

                    self.hitl.add_to_queue(
                        scene_id=scene.scene_id,
                        scene_title=scene.title,
                        scene_description=scene.description,
                        failed_assets=failed_scores,
                        svg_variants=variants,
                    )

                # ════════════════════════════════════════════
                # Phase 5: HITL Dashboard
                # ════════════════════════════════════════════
                logger.info("=" * 60)
                logger.info(f"PHASE 5: HITL Dashboard ({len(self.hitl.queue)} items)")
                logger.info("=" * 60)

                self.hitl.save_queue()
                dashboard_path = self.hitl.generate_dashboard()

                result.hitl_pending = list(self.hitl.queue)

                logger.info(f"Review dashboard: {dashboard_path}")
                logger.info(
                    "Opening dashboard in browser... "
                    "After selecting assets, run: python -m AssetFlow resolve <selections.json>"
                )

                # Auto-open in the default browser
                try:
                    webbrowser.open(f"file://{dashboard_path.resolve()}")
                except Exception as e:
                    logger.warning(f"Could not auto-open browser: {e}")

            # ── Save final state ──
            self._save_phase_output("final", {
                "summary": result.summary(),
                "approved": len(result.approved_assets),
                "hitl_pending": len(result.hitl_pending),
                "errors": result.errors,
            })

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            result.errors.append(str(e))

        # ── Report ──
        logger.info("=" * 60)
        logger.info(result.summary())
        logger.info("=" * 60)

        return result

    async def resolve_hitl(self, selections_path: str | Path) -> list[ApprovedAsset]:
        """
        Apply HITL selections and finalize the remaining assets.

        Args:
            selections_path: Path to the hitl_selections.json from the dashboard.

        Returns:
            List of newly approved assets.
        """
        selections_path = Path(selections_path)

        # Reload queue from disk
        queue_file = self.config.hitl_dir / "queue.json"
        if queue_file.exists():
            queue_data = json.loads(queue_file.read_text())
            # Reconstruct queue items (simplified — full implementation would
            # reload SVGVariant objects from disk)
            for item_data in queue_data:
                from AssetFlow.types import SVGVariant
                variants = []
                for vd in item_data.get("svg_variants", []):
                    variants.append(SVGVariant(
                        variant_id=vd["variant_id"],
                        scene_id=item_data["scene_id"],
                        svg_code="",  # Not needed for resolution
                        rendered_path=Path(vd["svg_path"]) if vd.get("svg_path") else None,
                        description=vd.get("description", ""),
                    ))
                self.hitl.add_to_queue(
                    scene_id=item_data["scene_id"],
                    scene_title=item_data["scene_title"],
                    scene_description=item_data["scene_description"],
                    failed_assets=[],
                    svg_variants=variants,
                )

        resolved = self.hitl.apply_selections(selections_path)

        new_approved = []
        for item in resolved:
            approved = self.hitl.get_approved_asset_for_item(item)
            if approved:
                # Copy to output directory
                dest = self.config.output_dir / f"scene_{item.scene_id:03d}_{approved.final_path.name}"
                if approved.final_path.exists():
                    shutil.copy2(approved.final_path, dest)
                    approved.final_path = dest
                new_approved.append(approved)

        logger.info(f"Resolved {len(new_approved)} HITL items")
        return new_approved

    # ── Helpers ──

    def _copy_to_output(self, scored: ScoredAsset, scene: Scene) -> Path:
        """Copy an approved asset to the output directory."""
        src = scored.bg_removed_path or scored.asset.local_path
        ext = src.suffix
        dest = self.config.output_dir / f"scene_{scene.scene_id:03d}_{scene.title.replace(' ', '_')}{ext}"
        shutil.copy2(src, dest)
        return dest

    def _save_phase_output(self, phase: int | str, data: dict):
        """Save phase intermediate output for debugging."""
        path = self.config.output_dir / f"phase_{phase}_output.json"
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")

    @staticmethod
    def _scene_to_dict(scene: Scene) -> dict:
        return {
            "scene_id": scene.scene_id,
            "title": scene.title,
            "description": scene.description,
            "duration_hint": scene.duration_hint,
            "visual_style": scene.visual_style,
            "raw_text": scene.raw_text,
        }

    @staticmethod
    def _query_to_dict(query: SceneQuery) -> dict:
        return {
            "scene_id": query.scene_id,
            "primary_query": query.primary_query,
            "alternate_queries": query.alternate_queries,
            "asset_type": query.asset_type.value,
            "style_hints": query.style_hints,
            "requires_transparency": query.requires_transparency,
        }
