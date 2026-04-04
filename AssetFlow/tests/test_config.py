"""Tests for AssetFlow Config."""

import os
import tempfile
from pathlib import Path

from AssetFlow.config import Config


class TestConfig:
    def test_default_config_no_side_effects(self):
        """Config() should NOT create directories in __post_init__."""
        with tempfile.TemporaryDirectory() as tmpdir:
            staging = Path(tmpdir) / "nonexistent_staging"
            config = Config(staging_dir=staging)
            assert not staging.exists()
            config.ensure_dirs()
            assert staging.exists()

    def test_validate_missing_serper_key(self):
        """Validate should report missing Serper API key."""
        config = Config(serper_api_key="")
        issues = config.validate()
        assert len(issues) >= 1
        assert any("SERPER" in i for i in issues)

    def test_validate_all_keys_set(self):
        """No issues when all required keys are set."""
        config = Config(
            serper_api_key="test",
            azure_openai_key="test",
        )
        issues = config.validate()
        assert issues == []

    def test_has_vision_llm_azure(self):
        config = Config(azure_openai_key="test", vision_llm_provider="azure")
        assert config.has_vision_llm is True

    def test_has_vision_llm_gemini(self):
        config = Config(gemini_api_key="test", vision_llm_provider="gemini")
        assert config.has_vision_llm is True

    def test_has_text_llm(self):
        config = Config(azure_openai_key="test")
        assert config.has_text_llm is True
