"""
AssetFlow Shared Types

All dataclasses used across pipeline phases.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class AssetType(str, Enum):
    PHOTO = "photo"
    VIDEO = "video"
    VECTOR = "vector"
    ICON = "icon"
    SVG = "svg"


class AssetSource(str, Enum):
    PEXELS = "pexels"
    PIXABAY = "pixabay"
    ICONIFY = "iconify"
    SVG_GENERATED = "svg_generated"
    USER_UPLOAD = "user_upload"


class SceneStatus(str, Enum):
    PENDING = "pending"
    FETCHED = "fetched"
    PROCESSED = "processed"
    APPROVED = "approved"
    NEEDS_HITL = "needs_hitl"
    HITL_RESOLVED = "hitl_resolved"
    FAILED = "failed"


# ── Phase 1: Script Parsing ──

@dataclass
class Scene:
    """A single scene extracted from the script."""
    scene_id: int
    title: str
    description: str
    duration_hint: Optional[float] = None  # seconds
    visual_style: Optional[str] = None
    raw_text: str = ""


@dataclass
class SceneQuery:
    """Search queries generated for a scene."""
    scene_id: int
    primary_query: str                          # Main search term
    alternate_queries: list[str] = field(default_factory=list)  # Fallback queries
    asset_type: AssetType = AssetType.PHOTO
    style_hints: list[str] = field(default_factory=list)        # e.g. ["transparent bg", "isolated"]
    requires_transparency: bool = False


# ── Phase 2: Fetching ──

@dataclass
class FetchedAsset:
    """A raw asset downloaded from an API source."""
    scene_id: int
    source: AssetSource
    source_id: str                  # ID from the origin API
    source_url: str                 # Original URL
    local_path: Path                # Path in staging dir
    asset_type: AssetType
    width: int = 0
    height: int = 0
    has_alpha: bool = False         # Pre-detected alpha channel
    license_info: str = ""
    attribution: str = ""
    metadata: dict = field(default_factory=dict)


# ── Phase 3: Scoring ──

@dataclass
class ScoredAsset:
    """A fetched asset after Vision LLM evaluation."""
    asset: FetchedAsset
    relevance_score: float = 0.0        # 1-10
    quality_score: float = 0.0          # 1-10
    framing_score: float = 0.0          # 1-10
    overall_score: float = 0.0          # Weighted average
    vision_feedback: str = ""           # LLM's text reasoning
    bg_removed_path: Optional[Path] = None  # Path after rembg (if applicable)
    passed_threshold: bool = False


# ── Phase 4: SVG Fallback ──

@dataclass
class SVGVariant:
    """One SVG variant generated as fallback."""
    variant_id: str             # "A", "B", "C"
    scene_id: int
    svg_code: str               # Raw SVG XML
    rendered_path: Optional[Path] = None  # PNG preview after rendering
    description: str = ""


# ── Phase 5: HITL ──

@dataclass
class HITLItem:
    """A scene flagged for human review."""
    scene_id: int
    scene_title: str
    scene_description: str
    failed_assets: list[ScoredAsset] = field(default_factory=list)
    svg_variants: list[SVGVariant] = field(default_factory=list)
    selected_variant: Optional[str] = None      # "A"/"B"/"C" or "upload"
    user_upload_path: Optional[Path] = None
    resolved: bool = False


# ── Pipeline Result ──

@dataclass
class ApprovedAsset:
    """Final approved asset for a scene."""
    scene_id: int
    scene_title: str
    final_path: Path
    source: AssetSource
    asset_type: AssetType
    score: float = 0.0
    attribution: str = ""


@dataclass
class PipelineResult:
    """Complete pipeline output."""
    script_path: str
    total_scenes: int
    approved_assets: list[ApprovedAsset] = field(default_factory=list)
    hitl_pending: list[HITLItem] = field(default_factory=list)
    hitl_resolved: list[HITLItem] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def is_complete(self) -> bool:
        """True if all scenes have approved assets."""
        return (
            len(self.approved_assets) == self.total_scenes
            and not self.hitl_pending
        )

    def summary(self) -> str:
        lines = [
            f"AssetFlow Pipeline Result",
            f"  Script: {self.script_path}",
            f"  Scenes: {self.total_scenes}",
            f"  Auto-approved: {len(self.approved_assets)}",
            f"  HITL pending:  {len(self.hitl_pending)}",
            f"  HITL resolved: {len(self.hitl_resolved)}",
            f"  Errors:        {len(self.errors)}",
        ]
        return "\n".join(lines)
