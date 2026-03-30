"""
AssetFlow — AI-Driven Video Asset Pipeline with HITL Fallback

Automated asset-fetching and processing pipeline for video creation.
Takes a video script → generates search queries → fetches from free APIs →
processes (background removal) → Vision LLM quality gate → SVG fallback → HITL dashboard.

Usage:
    from AssetFlow import AssetFlowPipeline

    pipeline = AssetFlowPipeline()
    result = await pipeline.run("path/to/script.txt")
"""

from AssetFlow.config import Config
from AssetFlow.types import (
    Scene,
    SceneQuery,
    FetchedAsset,
    ScoredAsset,
    SVGVariant,
    HITLItem,
    PipelineResult,
)

__version__ = "0.1.0"
__all__ = [
    "Config",
    "Scene",
    "SceneQuery",
    "FetchedAsset",
    "ScoredAsset",
    "SVGVariant",
    "HITLItem",
    "PipelineResult",
]
