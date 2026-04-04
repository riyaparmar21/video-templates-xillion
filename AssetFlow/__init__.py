"""
AssetFlow — AI-Driven Video Asset Pipeline with HITL Fallback

Automated asset-fetching and processing pipeline for video creation.
Takes a video script → generates search queries via Director's Framework →
fetches from Google Image Search (Serper.dev) → Vision LLM quality gate → HITL dashboard.

Usage:
    from AssetFlow import AssetFlowPipeline

    pipeline = AssetFlowPipeline()
    result = await pipeline.run("path/to/script.txt")
"""

from AssetFlow.config import Config
from AssetFlow.types import (
    Scene,
    QuerySlot,
    FetchedAsset,
    ScoredAsset,
    HITLItem,
    PipelineResult,
)

__version__ = "0.2.0"
__all__ = [
    "Config",
    "Scene",
    "QuerySlot",
    "FetchedAsset",
    "ScoredAsset",
    "HITLItem",
    "PipelineResult",
]
