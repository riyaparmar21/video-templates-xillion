"""
AssetFlow Shared Types

All dataclasses used across pipeline phases.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class AssetType(str, Enum):
    PHOTO = "photo"
    VIDEO = "video"
    GIF = "gif"


class AssetSource(str, Enum):
    GOOGLE = "google"           # Google Image/Video Search via Serper.dev
    USER_UPLOAD = "user_upload"


class AssetDestination(str, Enum):
    """Routing destination for a scene."""
    GOOGLE_SEARCH = "Google_Search"
    REMOTION = "Remotion"


class SceneStatus(str, Enum):
    PENDING = "pending"
    FETCHED = "fetched"
    PROCESSED = "processed"
    APPROVED = "approved"
    NEEDS_HITL = "needs_hitl"
    HITL_RESOLVED = "hitl_resolved"
    FAILED = "failed"


# ── Phase 1: Script Parsing (Director's Framework output) ──

@dataclass
class QuerySlot:
    """A single query from the Director's Framework.

    Each query carries its own role, source, media_type, and search text.
    """
    role: str                                     # hero | support | identity | context | proof | backup
    source: str = "Google_Search"                 # Google_Search (primary)
    media_type: str = "photo"                     # video | photo | either
    text: str = ""                                # search phrase
    negative_terms: list[str] = field(default_factory=list)


@dataclass
class Scene:
    """A single scene from the Director's Framework analysis."""
    scene_id: int
    title: str
    description: str
    raw_text: str = ""                                              # text_script from framework
    duration_hint: Optional[float] = None                           # seconds
    visual_style: Optional[str] = None                              # style_modifier from framework

    # ── Director's Framework fields ──
    scene_function: str = ""                                        # hook | proof | comparison | explanation | ...
    visual_intent: str = ""                                         # face | brand | ui | broll | proof | ...
    asset_roles: list[str] = field(default_factory=list)            # ["hook", "identity", "context", ...]
    queries: list[QuerySlot] = field(default_factory=list)          # primary queries
    fallback_queries: list[QuerySlot] = field(default_factory=list) # broader backup queries
    remotion_overlay: dict = field(default_factory=dict)            # {"needed": bool, "description": str}

    # ── Derived fields ──
    destination: AssetDestination = AssetDestination.GOOGLE_SEARCH
    api_queries: list[str] = field(default_factory=list)            # flattened query texts
    fallback_stock_query: Optional[str] = None                      # first fallback_queries text
    flag_for_remotion: bool = False                                 # remotion_overlay.needed
    remotion_description: Optional[str] = None                      # remotion_overlay.description


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
    passed_threshold: bool = False


# ── HITL ──

@dataclass
class HITLItem:
    """A scene flagged for human review."""
    scene_id: int
    scene_title: str
    scene_description: str
    failed_assets: list[ScoredAsset] = field(default_factory=list)
    selected_variant: Optional[str] = None
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
    remotion_suggestions: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def is_complete(self) -> bool:
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
            f"  Remotion upgrades: {len(self.remotion_suggestions)}",
            f"  Errors:        {len(self.errors)}",
        ]
        return "\n".join(lines)
