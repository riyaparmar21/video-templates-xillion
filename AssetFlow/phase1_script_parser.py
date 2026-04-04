"""
Phase 1: Script Parsing via Director's Framework

Takes a raw video script → sends it through the Director's Framework prompt →
returns scenes with routing decisions, search queries, and visual intent
already embedded.

Single unified LLM call that outputs the full asset plan.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config
from AssetFlow.types import Scene, QuerySlot, AssetType, AssetDestination
from AssetFlow.llm_client import LLMClient, load_prompt, load_directors_framework, extract_json

logger = logging.getLogger("AssetFlow.phase1")


class ScriptParser:
    """Parse scripts into scenes with routing decisions via the Director's Framework."""

    def __init__(self, config: Config, llm: Optional[LLMClient] = None):
        self.config = config
        self.llm = llm or LLMClient(config)

    def parse_script(
        self,
        script_path: str | Path,
        target_format: str = "16:9",
        style_anchor: str = "",
    ) -> list[Scene]:
        """
        Phase 1: Analyze script using the Director's Framework.

        Sends the full script through the Director's Framework prompt, which:
        - Breaks script into scenes
        - Generates Google Search queries per scene
        - Sets style consistency and aspect ratio awareness
        - Plans Remotion overlays where useful

        Args:
            script_path: Path to the script text file.
            target_format: "16:9" or "9:16" (aspect ratio).
            style_anchor: Optional overall visual tone hint.

        Returns:
            List of Scene objects with all routing and query fields populated.
        """
        script_path = Path(script_path)
        script_text = script_path.read_text(encoding="utf-8").strip()
        if not script_text:
            raise ValueError(f"Script is empty: {script_path}")

        logger.info(f"Parsing script: {script_path.name} ({len(script_text)} chars)")

        # Load the Director's Framework as system prompt
        system_prompt = load_directors_framework()

        # Build the user prompt with the input the framework expects
        input_payload = {
            "script": script_text,
            "target_format": target_format,
            "video_duration_hint": self._estimate_duration(script_text),
        }
        if style_anchor:
            input_payload["style_anchor"] = style_anchor

        user_prompt = (
            "Analyze the following script and output the structured asset plan "
            "as specified in your instructions.\n\n"
            f"```json\n{json.dumps(input_payload, indent=2)}\n```"
        )

        raw_response = self.llm.text_call(system_prompt, user_prompt, temperature=0.4)
        framework_output = extract_json(raw_response)

        # Parse the framework output into Scene objects
        scenes = self._parse_framework_output(framework_output)

        style = framework_output.get("style_modifier", "not set") if isinstance(framework_output, dict) else "not set"
        fmt = framework_output.get("target_format", target_format) if isinstance(framework_output, dict) else target_format
        logger.info(
            f"Extracted {len(scenes)} scenes | "
            f"Style: {style} | "
            f"Format: {fmt}"
        )

        # Log routing summary
        dest_counts: dict[str, int] = {}
        for s in scenes:
            dest_counts[s.destination.value] = dest_counts.get(s.destination.value, 0) + 1
        logger.info(f"Routing (derived destinations): {dest_counts}")

        # Log query slot counts
        total_slots = sum(len(s.queries) for s in scenes)
        total_fallbacks = sum(len(s.fallback_queries) for s in scenes)
        if total_slots:
            logger.info(f"Query slots: {total_slots} primary, {total_fallbacks} fallback")

        return scenes

    def _parse_framework_output(self, data) -> list[Scene]:
        """Parse the Director's Framework JSON output into Scene objects."""
        scenes = []

        # Handle case where LLM returns a list instead of the expected top-level object
        if isinstance(data, list):
            logger.warning("LLM returned a list instead of object — treating as scenes array")
            scenes_list = data
            style_modifier = ""
        else:
            style_modifier = data.get("style_modifier", "")
            scenes_list = data.get("scenes", [])

        if not scenes_list:
            return scenes

        for item in scenes_list:
            # Parse query slots
            raw_queries = item.get("queries", [])
            raw_fallbacks = item.get("fallback_queries", [])

            queries = [self._parse_query_slot(q) for q in raw_queries if isinstance(q, dict)]
            fallback_queries = [self._parse_query_slot(q) for q in raw_fallbacks if isinstance(q, dict)]

            # Parse remotion_overlay
            remotion_overlay = item.get("remotion_overlay") or {}

            # Derive destination
            destination = self._derive_destination(queries, remotion_overlay)

            # Flatten query texts for backward compat
            api_queries = [q.text for q in queries if q.text]

            # Fallback stock query: first fallback query text
            fallback_q = fallback_queries[0].text if fallback_queries else None

            # Remotion flags
            flag_remotion = bool(remotion_overlay.get("needed"))
            remotion_desc = remotion_overlay.get("description")

            scene = Scene(
                scene_id=item["scene_id"],
                title=item.get("title", f"Scene {item['scene_id']}"),
                description=item.get("text_script", item.get("description", "")),
                raw_text=item.get("text_script", ""),
                duration_hint=item.get("duration_hint"),
                visual_style=item.get("visual_style") or style_modifier or None,
                # V4 fields
                scene_function=item.get("scene_function", ""),
                visual_intent=item.get("visual_intent", ""),
                asset_roles=item.get("asset_roles", []),
                queries=queries,
                fallback_queries=fallback_queries,
                remotion_overlay=remotion_overlay,
                # Derived fields
                destination=destination,
                api_queries=api_queries,
                fallback_stock_query=fallback_q,
                flag_for_remotion=flag_remotion,
                remotion_description=remotion_desc,
            )
            scenes.append(scene)

        return scenes

    @staticmethod
    def _parse_query_slot(raw: dict) -> "QuerySlot":
        """Parse a single query dict into a QuerySlot."""
        return QuerySlot(
            role=raw.get("role", "hero"),
            source=raw.get("source", "Google_Search"),
            media_type=raw.get("media_type", "either"),
            text=raw.get("text", ""),
            negative_terms=raw.get("negative_terms", []),
        )

    @staticmethod
    def _derive_destination(
        queries: list["QuerySlot"],
        remotion_overlay: dict,
    ) -> AssetDestination:
        """Derive a single destination from query sources.

        Priority:
        1. If remotion_overlay.needed → REMOTION
           (Remotion scenes still get fetched via Google, but the destination flag
           tells the orchestrator to collect upgrade suggestions.)
        2. Otherwise → GOOGLE_SEARCH (default for all scenes)
        """
        if not queries:
            return AssetDestination.GOOGLE_SEARCH

        if remotion_overlay.get("needed"):
            return AssetDestination.REMOTION

        return AssetDestination.GOOGLE_SEARCH

    def run(
        self,
        script_path: str | Path,
        target_format: str = "16:9",
        style_anchor: str = "",
    ) -> list[Scene]:
        """Run full Phase 1: parse via Director's Framework."""
        scenes = self.parse_script(script_path, target_format, style_anchor)
        return scenes

    @staticmethod
    def _estimate_duration(script_text: str) -> float:
        """Estimate video duration from script word count (~2.0 words/sec)."""
        word_count = len(script_text.split())
        return round(word_count / 2.0, 1)
