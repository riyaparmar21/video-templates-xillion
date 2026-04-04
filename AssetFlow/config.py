"""
AssetFlow Configuration

Loads API keys from .env and defines pipeline constants.
"""

import logging
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("AssetFlow.config")

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).parent.parent
ASSETFLOW_DIR = Path(__file__).parent
PROMPTS_DIR = ASSETFLOW_DIR / "prompts"
TEMPLATES_DIR = ASSETFLOW_DIR / "templates"


@dataclass
class Config:
    """Pipeline configuration with sensible defaults."""

    # ── Google Search (PRIMARY asset source via Serper.dev) ──
    serper_api_key: str = field(default_factory=lambda: os.getenv("SERPER_API_KEY", ""))

    # ── LLM Config (Azure OpenAI for vision scoring) ──
    azure_openai_key: str = field(default_factory=lambda: os.getenv("AZURE_OPENAI_KEY", ""))
    azure_openai_endpoint: str = field(
        default_factory=lambda: os.getenv(
            "AZURE_OPENAI_ENDPOINT",
            os.getenv("AZURE_GPT_IMAGE_ENDPOINT", ""),
        )
    )
    azure_openai_deployment: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o")
    )
    azure_openai_api_version: str = field(
        default_factory=lambda: os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
    )

    # Gemini as alternative Vision LLM
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))

    # ── Vision LLM provider selection ──
    # Options: "azure" | "gemini"
    vision_llm_provider: str = "azure"

    # ── Pipeline Tunables ──
    candidates_per_source: int = 5          # Assets to fetch per query
    quality_threshold: float = 6.0          # Min score (1-10) from Vision LLM
    max_concurrent_fetches: int = 10        # Parallel download limit
    fetch_timeout: int = 30                 # Seconds per HTTP request

    # ── Video Download Settings ──
    video_max_duration: int = 10            # Max video duration in seconds
    video_quality: int = 720                # Max video height (720p)
    video_min_duration: int = 1             # Min video duration in seconds
    video_min_file_size: int = 50_000       # Min video file size in bytes (50KB)
    video_max_file_size: int = 50_000_000   # Max video file size in bytes (50MB)

    # ── Paths ──
    staging_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "AssetFlow" / ".staging")
    output_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "AssetFlow" / "output")
    hitl_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "AssetFlow" / "hitl_queue")

    def __post_init__(self):
        pass

    def ensure_dirs(self):
        """Create working directories on disk."""
        self.staging_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.hitl_dir.mkdir(parents=True, exist_ok=True)

    def validate(self) -> list[str]:
        """Return list of missing/invalid config items."""
        issues = []
        if not self.serper_api_key:
            issues.append("SERPER_API_KEY not set (primary asset source — get free key at serper.dev)")
        if self.vision_llm_provider == "azure" and not self.azure_openai_key:
            issues.append("AZURE_OPENAI_KEY not set (needed for vision LLM)")
        if self.vision_llm_provider == "gemini" and not self.gemini_api_key:
            issues.append("GEMINI_API_KEY not set (needed for vision LLM)")
        return issues

    @property
    def has_vision_llm(self) -> bool:
        if self.vision_llm_provider == "gemini":
            return bool(self.gemini_api_key)
        return bool(self.azure_openai_key)

    @property
    def has_text_llm(self) -> bool:
        return bool(self.azure_openai_key) or bool(self.gemini_api_key)
