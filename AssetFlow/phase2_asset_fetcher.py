"""
Phase 2: Parallel Asset Fetcher

Fetches candidate assets from Pexels, Pixabay, and Iconify in parallel.
Downloads top candidates to a staging folder.
"""

import asyncio
import hashlib
import json
import logging
import shutil
from pathlib import Path
from typing import Optional
from urllib.parse import quote, quote_plus

from AssetFlow.config import Config
from AssetFlow.types import (
    AssetSource,
    AssetType,
    FetchedAsset,
    SceneQuery,
)

logger = logging.getLogger("AssetFlow.phase2")


# ── HTTP helpers ──

# Standard browser-like User-Agent to avoid 403 blocks from CDNs and APIs
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, image/*, video/*, */*",
}


def _merge_headers(custom: dict = None) -> dict:
    """Merge custom headers with defaults (custom takes priority)."""
    merged = dict(_DEFAULT_HEADERS)
    if custom:
        merged.update(custom)
    return merged


async def _fetch_json(url: str, headers: dict = None, timeout: int = 30) -> dict:
    """Async HTTP GET → JSON. Uses aiohttp if available, falls back to urllib."""
    merged = _merge_headers(headers)
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=merged, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                resp.raise_for_status()
                return await resp.json(content_type=None)
    except ImportError:
        # Fallback to synchronous urllib (wrapped in executor)
        import urllib.request
        loop = asyncio.get_event_loop()

        def _sync():
            req = urllib.request.Request(url, headers=merged)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())

        return await loop.run_in_executor(None, _sync)


async def _download_file(url: str, dest: Path, headers: dict = None, timeout: int = 60) -> bool:
    """Download a file to disk. Returns True on success."""
    merged = _merge_headers(headers)
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=merged, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                resp.raise_for_status()
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, "wb") as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        f.write(chunk)
                return True
    except ImportError:
        import urllib.request
        loop = asyncio.get_event_loop()

        def _sync():
            req = urllib.request.Request(url, headers=merged)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, "wb") as f:
                    shutil.copyfileobj(r, f)
            return True

        return await loop.run_in_executor(None, _sync)
    except Exception as e:
        logger.error(f"Download failed: {url} → {e}")
        return False


def _file_hash(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()[:10]


def _sanitize_query(q: str) -> str:
    """Strip special characters that trip up stock APIs (quotes, colons, etc.)."""
    import re
    # Keep only alphanumeric, spaces, and hyphens
    cleaned = re.sub(r"[^\w\s\-]", " ", q)
    # Collapse multiple spaces
    return re.sub(r"\s+", " ", cleaned).strip()


# ═══════════════════════════════════════════════════════════════
# Source: Pexels
# ═══════════════════════════════════════════════════════════════

class PexelsFetcher:
    """Fetch photos and videos from the Pexels API."""

    BASE = "https://api.pexels.com/v1"
    VIDEO_BASE = "https://api.pexels.com/videos"

    def __init__(self, api_key: str):
        self.headers = {"Authorization": api_key}

    async def search(self, query: SceneQuery, count: int = 3) -> list[FetchedAsset]:
        """Search Pexels for assets matching the query."""
        results = []

        if query.asset_type in (AssetType.PHOTO, AssetType.VECTOR):
            results.extend(await self._search_photos(query, count))
        elif query.asset_type == AssetType.VIDEO:
            results.extend(await self._search_videos(query, count))
        else:
            # Default: try photos
            results.extend(await self._search_photos(query, count))

        return results

    async def _search_photos(self, query: SceneQuery, count: int) -> list[FetchedAsset]:
        q = quote_plus(_sanitize_query(query.primary_query))
        url = f"{self.BASE}/search?query={q}&per_page={count}&orientation=landscape"
        data = await _fetch_json(url, headers=self.headers)

        assets = []
        for photo in data.get("photos", [])[:count]:
            src = photo.get("src", {})
            download_url = src.get("large2x") or src.get("original", "")
            if not download_url:
                continue

            assets.append(FetchedAsset(
                scene_id=query.scene_id,
                source=AssetSource.PEXELS,
                source_id=str(photo["id"]),
                source_url=download_url,
                local_path=Path(""),  # Set during download
                asset_type=AssetType.PHOTO,
                width=photo.get("width", 0),
                height=photo.get("height", 0),
                has_alpha=False,
                license_info="Pexels License (free for commercial use)",
                attribution=f"Photo by {photo.get('photographer', 'Unknown')} on Pexels",
                metadata={"pexels_url": photo.get("url", "")},
            ))

        return assets

    async def _search_videos(self, query: SceneQuery, count: int) -> list[FetchedAsset]:
        q = quote_plus(_sanitize_query(query.primary_query))
        url = f"{self.VIDEO_BASE}/search?query={q}&per_page={count}"
        data = await _fetch_json(url, headers=self.headers)

        assets = []
        for video in data.get("videos", [])[:count]:
            # Pick the best quality video file (HD preferred)
            video_files = video.get("video_files", [])
            best_file = None
            for vf in sorted(video_files, key=lambda x: x.get("height", 0), reverse=True):
                if vf.get("quality") in ("hd", "sd") and vf.get("link"):
                    best_file = vf
                    break
            if not best_file and video_files:
                best_file = video_files[0]
            if not best_file:
                continue

            assets.append(FetchedAsset(
                scene_id=query.scene_id,
                source=AssetSource.PEXELS,
                source_id=str(video["id"]),
                source_url=best_file["link"],
                local_path=Path(""),
                asset_type=AssetType.VIDEO,
                width=best_file.get("width", 0),
                height=best_file.get("height", 0),
                has_alpha=False,
                license_info="Pexels License (free for commercial use)",
                attribution=f"Video by {video.get('user', {}).get('name', 'Unknown')} on Pexels",
                metadata={"pexels_url": video.get("url", "")},
            ))

        return assets


# ═══════════════════════════════════════════════════════════════
# Source: Pixabay
# ═══════════════════════════════════════════════════════════════

class PixabayFetcher:
    """Fetch images, videos, and vectors from the Pixabay API."""

    BASE = "https://pixabay.com/api"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: SceneQuery, count: int = 3) -> list[FetchedAsset]:
        results = []

        if query.asset_type == AssetType.VIDEO:
            results.extend(await self._search_videos(query, count))
        elif query.asset_type in (AssetType.VECTOR, AssetType.SVG):
            results.extend(await self._search_images(query, count, image_type="vector"))
        else:
            results.extend(await self._search_images(query, count, image_type="photo"))

        # Also try vectors if we need transparency
        if query.requires_transparency and query.asset_type != AssetType.VIDEO:
            results.extend(await self._search_images(query, min(2, count), image_type="vector"))

        return results

    async def _search_images(self, query: SceneQuery, count: int, image_type: str = "photo") -> list[FetchedAsset]:
        q = quote_plus(_sanitize_query(query.primary_query))
        # Pixabay per_page minimum is 3
        api_count = max(3, count)
        url = (
            f"{self.BASE}/?key={self.api_key}&q={q}"
            f"&image_type={image_type}&per_page={api_count}&safesearch=true"
        )
        data = await _fetch_json(url)

        assets = []
        for hit in data.get("hits", [])[:count]:
            download_url = hit.get("largeImageURL") or hit.get("webformatURL", "")
            # For vectors, Pixabay provides SVG via vectorURL (only for full API access)
            is_vector = hit.get("type") == "vector/svg"

            assets.append(FetchedAsset(
                scene_id=query.scene_id,
                source=AssetSource.PIXABAY,
                source_id=str(hit["id"]),
                source_url=download_url,
                local_path=Path(""),
                asset_type=AssetType.VECTOR if is_vector else AssetType.PHOTO,
                width=hit.get("imageWidth", 0),
                height=hit.get("imageHeight", 0),
                has_alpha=download_url.lower().endswith(".png") or is_vector,
                license_info="Pixabay Content License (free for commercial use)",
                attribution=f"Image by {hit.get('user', 'Unknown')} on Pixabay",
                metadata={"pixabay_url": hit.get("pageURL", ""), "tags": hit.get("tags", "")},
            ))

        return assets

    async def _search_videos(self, query: SceneQuery, count: int) -> list[FetchedAsset]:
        q = quote_plus(_sanitize_query(query.primary_query))
        # Pixabay per_page minimum is 3
        api_count = max(3, count)
        url = (
            f"{self.BASE}/videos/?key={self.api_key}&q={q}"
            f"&per_page={api_count}&safesearch=true"
        )
        data = await _fetch_json(url)

        assets = []
        for hit in data.get("hits", [])[:count]:
            videos = hit.get("videos", {})
            # Prefer "large" then "medium"
            vid_data = videos.get("large") or videos.get("medium") or videos.get("small", {})
            download_url = vid_data.get("url", "")
            if not download_url:
                continue

            assets.append(FetchedAsset(
                scene_id=query.scene_id,
                source=AssetSource.PIXABAY,
                source_id=str(hit["id"]),
                source_url=download_url,
                local_path=Path(""),
                asset_type=AssetType.VIDEO,
                width=vid_data.get("width", 0),
                height=vid_data.get("height", 0),
                has_alpha=False,
                license_info="Pixabay Content License (free for commercial use)",
                attribution=f"Video by {hit.get('user', 'Unknown')} on Pixabay",
                metadata={"pixabay_url": hit.get("pageURL", "")},
            ))

        return assets


# ═══════════════════════════════════════════════════════════════
# Source: Iconify
# ═══════════════════════════════════════════════════════════════

class IconifyFetcher:
    """Fetch SVG icons from the Iconify API (no key needed)."""

    BASE = "https://api.iconify.design"

    async def search(self, query: SceneQuery, count: int = 3) -> list[FetchedAsset]:
        """Search Iconify for matching icons and download SVGs."""
        q = quote_plus(_sanitize_query(query.primary_query))
        url = f"{self.BASE}/search?query={q}&limit={count}"
        data = await _fetch_json(url)

        assets = []
        icons = data.get("icons", [])

        for icon_str in icons[:count]:
            # icon_str is like "mdi:account" → prefix:name
            parts = icon_str.split(":", 1)
            if len(parts) != 2:
                continue
            prefix, name = parts

            # Fetch the actual SVG
            svg_url = f"{self.BASE}/{prefix}/{name}.svg"
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(svg_url, headers=_merge_headers(), timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        if resp.status == 200:
                            svg_content = await resp.text()
                        else:
                            continue
            except ImportError:
                import urllib.request
                try:
                    req = urllib.request.Request(svg_url, headers=_merge_headers())
                    with urllib.request.urlopen(req, timeout=15) as r:
                        svg_content = r.read().decode()
                except Exception:
                    continue

            assets.append(FetchedAsset(
                scene_id=query.scene_id,
                source=AssetSource.ICONIFY,
                source_id=icon_str,
                source_url=svg_url,
                local_path=Path(""),
                asset_type=AssetType.ICON,
                width=24,  # Icons are scalable
                height=24,
                has_alpha=True,  # SVGs are transparent
                license_info="Various open-source licenses (check per icon set)",
                attribution=f"Icon: {icon_str} via Iconify",
                metadata={"svg_content": svg_content, "prefix": prefix, "name": name},
            ))

        return assets


# ═══════════════════════════════════════════════════════════════
# Main Fetcher Orchestrator
# ═══════════════════════════════════════════════════════════════

class AssetFetcher:
    """
    Orchestrates parallel asset fetching across all configured sources.
    Downloads candidates to the staging directory.
    """

    def __init__(self, config: Config):
        self.config = config
        self.staging_dir = config.staging_dir
        self.sources: list = []

        # Initialize available sources
        if config.pexels_api_key:
            self.sources.append(("pexels", PexelsFetcher(config.pexels_api_key)))
        if config.pixabay_api_key:
            self.sources.append(("pixabay", PixabayFetcher(config.pixabay_api_key)))
        # Iconify is always available (no key)
        self.sources.append(("iconify", IconifyFetcher()))

        if not self.sources:
            logger.warning("No asset sources configured! Set API keys in .env")

    async def fetch_for_scene(self, query: SceneQuery) -> list[FetchedAsset]:
        """
        Fetch candidates from all sources in parallel for a single scene.
        Returns downloaded assets with local_path populated.
        """
        scene_dir = self.staging_dir / f"scene_{query.scene_id:03d}"
        scene_dir.mkdir(parents=True, exist_ok=True)

        # Launch all source searches in parallel
        tasks = []
        for source_name, fetcher in self.sources:
            # Skip Iconify for video/photo-heavy queries (unless it's icon type)
            if source_name == "iconify" and query.asset_type in (AssetType.VIDEO, AssetType.PHOTO):
                continue
            tasks.append(self._fetch_from_source(source_name, fetcher, query))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten and filter errors
        all_assets = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Source fetch error for scene {query.scene_id}: {result}")
                continue
            all_assets.extend(result)

        # Download all assets to staging
        download_tasks = []
        for asset in all_assets:
            download_tasks.append(self._download_asset(asset, scene_dir))

        downloaded = await asyncio.gather(*download_tasks, return_exceptions=True)

        # Return only successfully downloaded assets
        final_assets = []
        for asset, dl_result in zip(all_assets, downloaded):
            if isinstance(dl_result, Exception):
                logger.error(f"Download error: {dl_result}")
            elif dl_result:
                final_assets.append(asset)

        logger.info(
            f"Scene {query.scene_id}: fetched {len(final_assets)} assets "
            f"from {len(self.sources)} sources"
        )
        return final_assets

    async def _fetch_from_source(self, name: str, fetcher, query: SceneQuery) -> list[FetchedAsset]:
        """Run a single source's search."""
        try:
            count = self.config.candidates_per_source
            # Iconify gets fewer results (supplementary source)
            if name == "iconify":
                count = min(2, count)
            return await fetcher.search(query, count)
        except Exception as e:
            logger.error(f"Error fetching from {name}: {e}")
            return []

    async def _download_asset(self, asset: FetchedAsset, scene_dir: Path) -> bool:
        """Download an asset file to the staging directory."""
        # Determine file extension from URL
        url = asset.source_url
        ext = ".jpg"  # default
        for candidate_ext in [".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp4", ".gif"]:
            if candidate_ext in url.lower():
                ext = candidate_ext
                break

        # Handle Iconify SVG (already fetched as content)
        if asset.source == AssetSource.ICONIFY and "svg_content" in asset.metadata:
            filename = f"{asset.source.value}_{asset.source_id.replace(':', '_')}.svg"
            filepath = scene_dir / filename
            filepath.write_text(asset.metadata["svg_content"], encoding="utf-8")
            asset.local_path = filepath
            return True

        # Standard HTTP download
        filename = f"{asset.source.value}_{_file_hash(url)}{ext}"
        filepath = scene_dir / filename

        headers = {}
        if asset.source == AssetSource.PEXELS:
            headers["Authorization"] = self.config.pexels_api_key

        success = await _download_file(
            url, filepath, headers=headers, timeout=self.config.fetch_timeout
        )
        if success:
            asset.local_path = filepath
        return success

    async def fetch_all(self, queries: list[SceneQuery]) -> dict[int, list[FetchedAsset]]:
        """
        Fetch assets for all scenes, respecting concurrency limits.
        Returns: {scene_id: [FetchedAsset, ...]}
        """
        semaphore = asyncio.Semaphore(self.config.max_concurrent_fetches)

        async def _limited_fetch(q: SceneQuery):
            async with semaphore:
                return q.scene_id, await self.fetch_for_scene(q)

        tasks = [_limited_fetch(q) for q in queries]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        scene_assets = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Scene fetch error: {result}")
                continue
            scene_id, assets = result
            scene_assets[scene_id] = assets

        total = sum(len(v) for v in scene_assets.values())
        logger.info(f"Total fetched: {total} assets across {len(scene_assets)} scenes")
        return scene_assets
