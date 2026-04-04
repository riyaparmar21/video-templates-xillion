"""Tests for AssetFlow types and data structures."""

import pytest
from pathlib import Path

from AssetFlow.types import (
    AssetDestination,
    AssetSource,
    AssetType,
    FetchedAsset,
    Scene,
    ScoredAsset,
    PipelineResult,
)


class TestAssetEnums:
    def test_asset_destination_values(self):
        assert AssetDestination.GOOGLE_SEARCH.value == "Google_Search"
        assert AssetDestination.REMOTION.value == "Remotion"

    def test_asset_source_values(self):
        assert AssetSource.GOOGLE.value == "google"
        assert AssetSource.USER_UPLOAD.value == "user_upload"

    def test_asset_type_values(self):
        assert AssetType.PHOTO.value == "photo"
        assert AssetType.VIDEO.value == "video"
        assert AssetType.GIF.value == "gif"


class TestScene:
    def test_scene_defaults(self):
        scene = Scene(scene_id=1, title="Test", description="A test scene")
        assert scene.destination == AssetDestination.GOOGLE_SEARCH
        assert scene.api_queries == []
        assert scene.flag_for_remotion is False

    def test_scene_with_queries(self):
        from AssetFlow.types import QuerySlot
        scene = Scene(
            scene_id=2,
            title="Brand scene",
            description="A brand comparison",
            queries=[QuerySlot(role="hero", text="Zomato logo")],
        )
        assert len(scene.queries) == 1
        assert scene.queries[0].text == "Zomato logo"


class TestFetchedAsset:
    def test_fetched_asset_defaults(self):
        asset = FetchedAsset(
            scene_id=1,
            source=AssetSource.GOOGLE,
            source_id="12345",
            source_url="https://example.com/photo.jpg",
            local_path=Path("/tmp/photo.jpg"),
            asset_type=AssetType.PHOTO,
        )
        assert asset.width == 0
        assert asset.has_alpha is False
        assert asset.metadata == {}


class TestPipelineResult:
    def test_is_complete_empty(self):
        result = PipelineResult(script_path="test.txt", total_scenes=0)
        assert result.is_complete is True

    def test_is_complete_with_pending(self):
        result = PipelineResult(script_path="test.txt", total_scenes=5)
        assert result.is_complete is False

    def test_summary_output(self):
        result = PipelineResult(script_path="test.txt", total_scenes=3)
        summary = result.summary()
        assert "test.txt" in summary
        assert "3" in summary
