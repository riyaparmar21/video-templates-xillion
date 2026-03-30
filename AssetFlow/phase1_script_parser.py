"""
Phase 1: Script Parsing & Query Generation

Takes a raw video script → breaks into scenes → generates targeted search queries.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config
from AssetFlow.types import Scene, SceneQuery, AssetType
from AssetFlow.llm_client import LLMClient, load_prompt, extract_json

logger = logging.getLogger("AssetFlow.phase1")


class ScriptParser:
    """Parse scripts into scenes and generate search queries."""

    def __init__(self, config: Config, llm: Optional[LLMClient] = None):
        self.config = config
        self.llm = llm or LLMClient(config)

    def parse_script(self, script_path: str | Path) -> list[Scene]:
        """
        Phase 1a: Break a script into distinct scenes using the LLM.

        Args:
            script_path: Path to the script text file.

        Returns:
            List of Scene objects.
        """
        script_path = Path(script_path)
        script_text = script_path.read_text(encoding="utf-8").strip()
        if not script_text:
            raise ValueError(f"Script is empty: {script_path}")

        logger.info(f"Parsing script: {script_path.name} ({len(script_text)} chars)")

        system_prompt = load_prompt("scene_breakdown")
        user_prompt = f"Here is the video script to analyze:\n\n---\n\n{script_text}"

        raw_response = self.llm.text_call(system_prompt, user_prompt, temperature=0.4)
        scenes_data = extract_json(raw_response)

        scenes = []
        for item in scenes_data:
            scenes.append(Scene(
                scene_id=item["scene_id"],
                title=item["title"],
                description=item["description"],
                duration_hint=item.get("duration_hint"),
                visual_style=item.get("visual_style"),
                raw_text=item.get("raw_text", ""),
            ))

        logger.info(f"Extracted {len(scenes)} scenes from script")
        return scenes

    def generate_queries(self, scenes: list[Scene]) -> list[SceneQuery]:
        """
        Phase 1b: Generate targeted search queries for each scene.

        Args:
            scenes: List of scenes from parse_script().

        Returns:
            List of SceneQuery objects.
        """
        logger.info(f"Generating search queries for {len(scenes)} scenes")

        # Build the scene descriptions for the LLM
        scene_descriptions = []
        for s in scenes:
            scene_descriptions.append({
                "scene_id": s.scene_id,
                "title": s.title,
                "description": s.description,
                "visual_style": s.visual_style or "general",
            })

        system_prompt = load_prompt("query_generation")
        user_prompt = (
            "Generate optimized search queries for these scenes:\n\n"
            f"```json\n{json.dumps(scene_descriptions, indent=2)}\n```"
        )

        raw_response = self.llm.text_call(system_prompt, user_prompt, temperature=0.5)
        queries_data = extract_json(raw_response)

        queries = []
        for item in queries_data:
            asset_type_str = item.get("asset_type", "photo").lower()
            try:
                asset_type = AssetType(asset_type_str)
            except ValueError:
                asset_type = AssetType.PHOTO

            queries.append(SceneQuery(
                scene_id=item["scene_id"],
                primary_query=item["primary_query"],
                alternate_queries=item.get("alternate_queries", []),
                asset_type=asset_type,
                style_hints=item.get("style_hints", []),
                requires_transparency=item.get("requires_transparency", False),
            ))

        logger.info(f"Generated {len(queries)} query sets")
        return queries

    def run(self, script_path: str | Path) -> tuple[list[Scene], list[SceneQuery]]:
        """Run full Phase 1: parse → generate queries."""
        scenes = self.parse_script(script_path)
        queries = self.generate_queries(scenes)
        return scenes, queries
