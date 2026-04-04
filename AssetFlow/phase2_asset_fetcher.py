"""
Phase 2: Asset Fetcher — Google Image/Video Search via Serper.dev

Simple pipeline:
  1. Each scene's queries go through Google Search (Serper.dev)
  2. Results are downloaded to staging
  3. Post-download quality gates reject corrupted/tiny files
  4. Cross-scene deduplication removes repeated images
"""

import asyncio
import hashlib
import json
import logging
import shutil
import time
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config
from AssetFlow.types import (
    AssetDestination,
    AssetSource,
    AssetType,
    FetchedAsset,
    QuerySlot,
    Scene,
)
from AssetFlow.dedup import deduplicate_assets

logger = logging.getLogger("AssetFlow.phase2")


# ── HTTP helpers ──

_DEFAULT_HEADERS = {
    "User-Agent": (
        "AssetFlow/1.0 (video asset pipeline; "
        "https://github.com/xillion/assetflow; contact: internal@xillion.in)"
    ),
    "Accept": "application/json, image/*, video/*, */*",
}

_MAX_RETRIES = 2
_RETRY_BACKOFF = [1.5, 4.0]

_shared_session: Optional["aiohttp.ClientSession"] = None


async def _get_shared_session() -> "aiohttp.ClientSession":
    global _shared_session
    try:
        import aiohttp
        if _shared_session is None or _shared_session.closed:
            connector = aiohttp.TCPConnector(
                limit=100,               # max total simultaneous connections
                limit_per_host=30,        # prevent hammering any single host
                keepalive_timeout=60,     # reuse connections longer
                ttl_dns_cache=600,        # cache DNS lookups for 10 min
                enable_cleanup_closed=True,
            )
            _shared_session = aiohttp.ClientSession(connector=connector)
        return _shared_session
    except ImportError:
        return None


async def close_shared_session():
    global _shared_session
    if _shared_session and not _shared_session.closed:
        await _shared_session.close()
        _shared_session = None


def _merge_headers(custom: dict = None) -> dict:
    merged = dict(_DEFAULT_HEADERS)
    if custom:
        merged.update(custom)
    return merged


def _is_retryable_error(exc: Exception) -> bool:
    """Check if an exception is retryable (rate-limit or server error)."""
    try:
        import aiohttp
        if isinstance(exc, aiohttp.ClientResponseError):
            return exc.status == 429 or exc.status >= 500
    except ImportError:
        pass
    # urllib raises HTTPError with a .code attribute
    if hasattr(exc, 'code'):
        code = getattr(exc, 'code', 0)
        return code == 429 or code >= 500
    return False


async def _post_json(url: str, payload: dict, headers: dict = None, timeout: int = 30) -> dict:
    """Async HTTP POST with JSON body → JSON response, with retry on 429 / 5xx."""
    merged = _merge_headers(headers)
    merged["Content-Type"] = "application/json"
    body = json.dumps(payload).encode()
    last_exc = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            import aiohttp
            session = await _get_shared_session()
            async with session.post(url, data=body, headers=merged, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status == 429 or resp.status >= 500:
                    if attempt < _MAX_RETRIES:
                        wait = _RETRY_BACKOFF[attempt]
                        logger.warning(f"HTTP {resp.status} on POST {url[:120]}… — retrying in {wait}s")
                        await asyncio.sleep(wait)
                        continue
                resp.raise_for_status()
                return await resp.json(content_type=None)
        except ImportError:
            import urllib.request
            loop = asyncio.get_event_loop()

            def _sync():
                req = urllib.request.Request(url, data=body, headers=merged, method="POST")
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    return json.loads(r.read().decode())

            return await loop.run_in_executor(None, _sync)
        except Exception as e:
            last_exc = e
            if attempt < _MAX_RETRIES and _is_retryable_error(e):
                await asyncio.sleep(_RETRY_BACKOFF[attempt])
                continue
            raise
    if last_exc:
        raise last_exc
    return {}


async def _download_file(url: str, dest: Path, headers: dict = None, timeout: int = 60) -> bool:
    """Download a file to disk. Returns True on success."""
    merged = _merge_headers(headers)
    for attempt in range(_MAX_RETRIES + 1):
        try:
            import aiohttp
            session = await _get_shared_session()
            async with session.get(url, headers=merged, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status == 429:
                    if attempt < _MAX_RETRIES:
                        wait = _RETRY_BACKOFF[attempt]
                        logger.warning(f"429 downloading {url[:100]}… — retrying in {wait}s")
                        await asyncio.sleep(wait)
                        continue
                    logger.error(f"Download failed (429 after retries): {url[:100]}…")
                    return False
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
            if attempt < _MAX_RETRIES and _is_retryable_error(e):
                await asyncio.sleep(_RETRY_BACKOFF[attempt])
                continue
            logger.error(f"Download failed: {url} → {e}")
            return False
    return False


def _file_hash(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()[:10]


def _parse_duration_str(duration_str: str) -> Optional[float]:
    """
    Parse Serper video duration strings like '3:45', '1:02:30', '0:08' into seconds.
    Returns None if unparseable.
    """
    if not duration_str:
        return None
    try:
        parts = duration_str.strip().split(":")
        parts = [int(p) for p in parts]
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif len(parts) == 1:
            return float(parts[0])
    except (ValueError, TypeError):
        pass
    return None


# ═══════════════════════════════════════════════════════════════
# Video Downloader (yt-dlp)
# ═══════════════════════════════════════════════════════════════

class VideoDownloader:
    """
    Downloads videos from URLs discovered by Serper video search using yt-dlp.

    Features:
    - Max duration filtering (skips videos exceeding limit before download)
    - Quality capping (720p default)
    - Download archive to prevent re-downloading the same video
    - Async-compatible via ThreadPoolExecutor
    - Graceful fallback when yt-dlp is not installed
    """

    def __init__(self, config: "Config"):
        self.config = config
        self._archive_path = config.staging_dir / ".video_download_archive.txt"
        self._archive_path.parent.mkdir(parents=True, exist_ok=True)
        self._downloaded_urls: set[str] = set()
        self._load_archive()

    def _load_archive(self):
        """Load previously downloaded video URLs from archive file."""
        if self._archive_path.exists():
            for line in self._archive_path.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    self._downloaded_urls.add(line)
            if self._downloaded_urls:
                logger.info(f"Video archive: {len(self._downloaded_urls)} previously downloaded videos")

    def _save_to_archive(self, video_id: str):
        """Append a video ID to the archive file."""
        with open(self._archive_path, "a") as f:
            f.write(f"{video_id}\n")
        self._downloaded_urls.add(video_id)

    def is_already_downloaded(self, url: str) -> bool:
        """Check if a video URL (or its ID) is in the download archive."""
        url_hash = hashlib.md5(url.encode()).hexdigest()[:16]
        return url_hash in self._downloaded_urls or url in self._downloaded_urls

    def _get_ydl_opts(self, output_path: Path) -> dict:
        """Build yt-dlp options dict."""
        max_h = self.config.video_quality
        max_dur = self.config.video_max_duration
        min_dur = self.config.video_min_duration

        return {
            # Format: best video ≤720p merged with best audio → mp4
            "format": (
                f"bestvideo[height<={max_h}][ext=mp4]+bestaudio[ext=m4a]"
                f"/bestvideo[height<={max_h}]+bestaudio"
                f"/best[height<={max_h}]"
                f"/best"
            ),
            "merge_output_format": "mp4",
            "outtmpl": str(output_path),

            # Duration filter — reject before downloading
            "match_filter": (
                lambda info, *, incomplete: (
                    None if incomplete  # allow incomplete extractions to proceed
                    else (
                        f"Duration {info.get('duration', 0)}s < {min_dur}s minimum"
                        if info.get("duration") and info["duration"] < min_dur
                        else (
                            f"Duration {info.get('duration', 0)}s exceeds {max_dur}s limit"
                            if info.get("duration") and info["duration"] > max_dur
                            else None
                        )
                    )
                )
            ),

            # Behaviour
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "no_color": True,

            # Safety
            "socket_timeout": 30,
            "retries": 2,
            "fragment_retries": 2,

            # Don't write extra files
            "writeinfojson": False,
            "writethumbnail": False,
            "writesubtitles": False,
        }

    def probe_video(self, url: str) -> Optional[dict]:
        """
        Extract video metadata without downloading.
        Returns dict with 'duration', 'title', 'id', 'height', 'width', etc.
        Returns None if URL is not supported or extraction fails.
        """
        try:
            import yt_dlp
        except ImportError:
            logger.warning("yt-dlp not installed — cannot probe video. Install with: pip install yt-dlp")
            return None

        opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "socket_timeout": 15,
        }
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    return {
                        "id": info.get("id", ""),
                        "title": info.get("title", ""),
                        "duration": info.get("duration"),
                        "width": info.get("width", 0),
                        "height": info.get("height", 0),
                        "uploader": info.get("uploader", ""),
                        "extractor": info.get("extractor", ""),
                        "url": url,
                    }
        except Exception as e:
            logger.debug(f"Video probe failed for {url[:80]}: {e}")
        return None

    def download_video(self, url: str, scene_dir: Path) -> Optional[Path]:
        """
        Download a video to scene_dir. Returns the local path, or None on failure.

        Checks the archive first to skip re-downloads.
        Duration and quality filtering happen inside yt-dlp via match_filter and format.
        """
        try:
            import yt_dlp
        except ImportError:
            logger.warning("yt-dlp not installed — skipping video download. Install with: pip install yt-dlp")
            return None

        # Check archive
        url_hash = hashlib.md5(url.encode()).hexdigest()[:16]
        if self.is_already_downloaded(url):
            # Check if the file still exists on disk
            existing = list(scene_dir.glob(f"video_{url_hash}*"))
            if existing and existing[0].exists() and existing[0].stat().st_size > 0:
                logger.info(f"Video already downloaded (cached): {existing[0].name}")
                return existing[0]
            # Archive says downloaded but file is gone — re-download

        scene_dir.mkdir(parents=True, exist_ok=True)
        output_path = scene_dir / f"video_{url_hash}.%(ext)s"
        opts = self._get_ydl_opts(output_path)

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                result = ydl.extract_info(url, download=True)

                if result is None:
                    logger.warning(f"yt-dlp returned no result for {url[:80]}")
                    return None

                # Find the downloaded file — yt-dlp replaces %(ext)s with actual extension
                downloaded = list(scene_dir.glob(f"video_{url_hash}.*"))
                downloaded = [f for f in downloaded if f.is_file() and f.stat().st_size > 0]

                if downloaded:
                    final_path = downloaded[0]
                    self._save_to_archive(url_hash)
                    duration = result.get("duration", "?")
                    logger.info(
                        f"Video downloaded: {final_path.name} "
                        f"({duration}s, {final_path.stat().st_size / 1024:.0f}KB)"
                    )
                    return final_path
                else:
                    logger.warning(f"yt-dlp completed but no file found for {url[:80]}")
                    return None

        except Exception as e:
            err_str = str(e)
            if "matched filter" in err_str.lower() or "duration" in err_str.lower():
                logger.info(f"Video skipped by filter: {url[:60]} — {err_str[:100]}")
            else:
                logger.warning(f"Video download failed: {url[:60]} — {err_str[:120]}")
            return None

    async def async_download(self, url: str, scene_dir: Path) -> Optional[Path]:
        """Async wrapper — runs yt-dlp in a thread pool to avoid blocking the event loop."""
        import concurrent.futures
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return await loop.run_in_executor(pool, self.download_video, url, scene_dir)


# ═══════════════════════════════════════════════════════════════
# Google Image & Video Search via Serper.dev
# ═══════════════════════════════════════════════════════════════

class SerperFetcher:
    """
    Google Image & Video Search via Serper.dev API.

    Returns the same results a human would get by Googling —
    real logos, founder photos, brand images, comparison infographics, etc.
    """

    IMAGES_URL = "https://google.serper.dev/images"
    VIDEOS_URL = "https://google.serper.dev/videos"

    # Minimum dimensions to filter out thumbnails / blurry junk
    MIN_WIDTH = 200
    MIN_HEIGHT = 200

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        }

    async def search_images(
        self, query: str, scene_id: int, count: int = 5
    ) -> list[FetchedAsset]:
        """Google Image Search."""
        payload = {
            "q": query,
            "num": min(count * 2, 20),  # request extra to compensate for filtering
        }
        try:
            data = await _post_json(self.IMAGES_URL, payload, headers=self.headers)
        except Exception as e:
            logger.error(f"Serper image search failed for '{query}': {e}")
            return []

        assets = []
        for item in data.get("images", []):
            if len(assets) >= count:
                break

            image_url = item.get("imageUrl", "")
            if not image_url:
                continue

            # Skip data URIs and known thumbnail hosts
            if image_url.startswith("data:") or "gstatic.com/images" in image_url:
                continue

            # Quality filter: skip tiny images
            w = item.get("imageWidth", 0)
            h = item.get("imageHeight", 0)
            if w and h and (w < self.MIN_WIDTH or h < self.MIN_HEIGHT):
                logger.debug(f"Serper: skipping tiny image {w}x{h}: {image_url[:80]}")
                continue

            title = item.get("title", "")
            source_domain = item.get("source", "")

            assets.append(FetchedAsset(
                scene_id=scene_id,
                source=AssetSource.GOOGLE,
                source_id=hashlib.md5(image_url.encode()).hexdigest()[:12],
                source_url=image_url,
                local_path=Path(""),
                asset_type=AssetType.PHOTO,
                width=w,
                height=h,
                has_alpha=False,  # detected accurately post-download in _download_asset()
                license_info=f"Google Image Search result from {source_domain}",
                attribution=f"{title} — {source_domain}",
                metadata={
                    "title": title,
                    "source_domain": source_domain,
                    "link": item.get("link", ""),
                    "google_search": True,
                },
            ))

        logger.info(f"Serper images '{query}': {len(assets)} results (≥{self.MIN_WIDTH}x{self.MIN_HEIGHT})")
        return assets

    async def search_videos(
        self, query: str, scene_id: int, count: int = 3,
        max_duration: Optional[int] = None,
    ) -> list[FetchedAsset]:
        """
        Google Video Search — returns actual video assets for yt-dlp download.

        Serper returns video metadata (title, link, duration, thumbnail).
        We store the actual video page URL (YouTube, etc.) as source_url so
        _download_asset() can hand it to yt-dlp for real video download.

        Pre-filters by duration when Serper provides it, to avoid wasting
        yt-dlp calls on 30-minute videos when we only want ≤10s clips.
        """
        payload = {
            "q": query,
            "num": min(count * 3, 20),  # request extra — many will be filtered by duration
        }
        try:
            data = await _post_json(self.VIDEOS_URL, payload, headers=self.headers)
        except Exception as e:
            logger.error(f"Serper video search failed for '{query}': {e}")
            return []

        assets = []
        for item in data.get("videos", []):
            if len(assets) >= count:
                break

            link = item.get("link", "")
            if not link:
                continue

            title = item.get("title", "")
            source = item.get("source", "")
            duration_str = item.get("duration", "")
            thumbnail = item.get("imageUrl", item.get("thumbnailUrl", ""))

            # Pre-filter by duration when available from Serper metadata
            duration_secs = _parse_duration_str(duration_str)
            if max_duration and duration_secs and duration_secs > max_duration:
                logger.debug(
                    f"Serper video: skipping '{title[:40]}' ({duration_str}) — "
                    f"exceeds {max_duration}s limit"
                )
                continue

            assets.append(FetchedAsset(
                scene_id=scene_id,
                source=AssetSource.GOOGLE,
                source_id=hashlib.md5(link.encode()).hexdigest()[:12],
                source_url=link,              # actual video page URL (YouTube, etc.)
                local_path=Path(""),
                asset_type=AssetType.VIDEO,    # real video, not a thumbnail
                width=0,
                height=0,
                has_alpha=False,
                license_info=f"Video from {source}",
                attribution=f"{title} — {source}",
                metadata={
                    "title": title,
                    "video_url": link,
                    "thumbnail_url": thumbnail,
                    "duration_str": duration_str,
                    "duration_secs": duration_secs,
                    "source_domain": source,
                    "google_search": True,
                },
            ))

        logger.info(f"Serper videos '{query}': {len(assets)} results (duration ≤{max_duration or '?'}s)")
        return assets

    async def search(
        self, query: str, scene_id: int, count: int = 5,
        media_type: str = "photo",
        video_max_duration: Optional[int] = None,
    ) -> list[FetchedAsset]:
        """Unified search — routes to images or videos based on media_type."""
        if media_type == "video":
            imgs = await self.search_images(query, scene_id, max(2, count - 1))
            vids = await self.search_videos(query, scene_id, min(3, count), max_duration=video_max_duration)
            return imgs + vids
        elif media_type == "either":
            imgs = await self.search_images(query, scene_id, count)
            vids = await self.search_videos(query, scene_id, min(3, count), max_duration=video_max_duration)
            return imgs + vids
        else:
            return await self.search_images(query, scene_id, count)


# ═══════════════════════════════════════════════════════════════
# Main Fetcher Orchestrator
# ═══════════════════════════════════════════════════════════════

class AssetFetcher:
    """
    Orchestrates asset fetching via Google Search (Serper.dev).

    For each scene, dispatches all queries to Google, downloads results,
    validates image integrity, and deduplicates across scenes.
    """

    def __init__(self, config: Config):
        self.config = config
        self.staging_dir = config.staging_dir

        # ── Google Search via Serper.dev ──
        self.serper = SerperFetcher(config.serper_api_key) if config.serper_api_key else None
        if not self.serper:
            logger.error("SERPER_API_KEY not set — no asset fetching possible!")

        # ── Video downloader (yt-dlp) ──
        self.video_downloader = VideoDownloader(config)

        # Per-source rate limiting
        self._sem = asyncio.Semaphore(5)  # max 5 concurrent Serper requests
        self._min_delay = 0.15  # 150ms between requests
        self._last_call: float = 0
        self._rate_lock = asyncio.Lock()  # protects _last_call from concurrent access

        # Cross-scene dedup: shared URL set checked BEFORE download to avoid
        # wasting bandwidth on the same URL appearing in multiple scenes.
        # Protected by a lock since scenes fetch in parallel.
        self._global_seen_urls: set[str] = set()
        self._global_url_lock = asyncio.Lock()

        # Run manifest — set by orchestrator before fetch_all_routed()
        self.manifest = None

    async def _rate_limited(self, coro):
        """Wrap a coroutine with rate limiting."""
        async with self._sem:
            async with self._rate_lock:
                elapsed = time.monotonic() - self._last_call
                if elapsed < self._min_delay:
                    await asyncio.sleep(self._min_delay - elapsed)
                self._last_call = time.monotonic()
            return await coro

    async def fetch_for_scene(self, scene: Scene) -> list[FetchedAsset]:
        """Fetch assets for a scene via Google Search."""
        if not self.serper:
            logger.error(f"Scene {scene.scene_id}: no fetcher available (SERPER_API_KEY missing)")
            return []

        scene_dir = self.staging_dir / f"scene_{scene.scene_id:03d}"
        scene_dir.mkdir(parents=True, exist_ok=True)

        count = self.config.candidates_per_source
        t0 = time.monotonic()
        fallback_used = False

        # ── Fetch using scene queries ──
        if scene.queries:
            all_assets = await self._fetch_queries(scene.scene_id, scene.queries, count)

            # If primary returned too few, try fallback queries
            if len(all_assets) < 2 and scene.fallback_queries:
                logger.info(f"Scene {scene.scene_id}: primary returned {len(all_assets)}, trying fallback queries")
                fallback_assets = await self._fetch_queries(scene.scene_id, scene.fallback_queries, count)
                all_assets.extend(fallback_assets)
                fallback_used = True
        else:
            # Legacy: use api_queries or title/description
            queries_text = scene.api_queries or [scene.description or scene.title]
            all_assets = []
            for q_text in queries_text:
                results = await self._rate_limited(
                    self.serper.search(q_text, scene.scene_id, count=count, media_type="photo")
                )
                all_assets.extend(results)

        # Deduplicate within scene AND across scenes (pre-download)
        # This prevents downloading the same URL that another scene already claimed.
        seen_local: set[str] = set()
        deduped = []
        async with self._global_url_lock:
            for asset in all_assets:
                url = asset.source_url
                if url in seen_local:
                    continue  # duplicate within this scene's results
                if url in self._global_seen_urls:
                    logger.debug(f"Scene {scene.scene_id}: skipping URL already claimed by another scene: {url[:80]}")
                    continue  # duplicate from another scene
                seen_local.add(url)
                self._global_seen_urls.add(url)
                deduped.append(asset)

        # Download all to staging
        download_tasks = [self._download_asset(asset, scene_dir) for asset in deduped]
        results = await asyncio.gather(*download_tasks, return_exceptions=True)

        downloaded = []
        for asset, dl_result in zip(deduped, results):
            if isinstance(dl_result, Exception):
                logger.error(f"Download error: {dl_result}")
            elif dl_result:
                downloaded.append(asset)

        # ── Within-scene perceptual deduplication ──
        # Removes visually identical images (e.g. same logo at different sizes)
        final, dedup_count = deduplicate_assets(downloaded)
        if dedup_count:
            logger.info(f"Scene {scene.scene_id}: removed {dedup_count} visual duplicate(s)")

        logger.info(f"Scene {scene.scene_id}: fetched {len(final)} unique assets")

        # Record in manifest
        if self.manifest:
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            self.manifest.set_scene_fetch_summary(
                scene.scene_id, len(final), elapsed_ms, fallback_used
            )

        return final

    async def _fetch_queries(
        self, scene_id: int, query_slots: list[QuerySlot], count: int
    ) -> list[FetchedAsset]:
        """Dispatch query slots to Google Search."""
        tasks = []
        for slot in query_slots:
            # Record in manifest
            qr = None
            if self.manifest:
                qr = self.manifest.record_query(
                    scene_id, slot.text,
                    role=slot.role, source="Google_Search",
                    media_type=slot.media_type, negative_terms=slot.negative_terms,
                )
            tasks.append(self._fetch_single_query(scene_id, slot, count, manifest_qr=qr))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        assets = []
        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Fetch error: {r}")
            else:
                assets.extend(r)
        return assets

    async def _fetch_single_query(
        self, scene_id: int, slot: QuerySlot, count: int, manifest_qr=None
    ) -> list[FetchedAsset]:
        """Fetch a single query via Google Search."""
        t0 = time.monotonic()
        try:
            assets = await self._rate_limited(
                self.serper.search(
                    slot.text, scene_id, count=count,
                    media_type=slot.media_type,
                    video_max_duration=self.config.video_max_duration,
                )
            )
            if self.manifest and manifest_qr:
                elapsed = int((time.monotonic() - t0) * 1000)
                self.manifest.record_api_call(manifest_qr, "serper", len(assets), elapsed)
            return assets
        except Exception as e:
            if self.manifest and manifest_qr:
                elapsed = int((time.monotonic() - t0) * 1000)
                self.manifest.record_api_call(
                    manifest_qr, "serper", 0, elapsed,
                    status="error", error_detail=str(e)[:200],
                )
            logger.error(f"Google Search error for scene {scene_id}: {e}")
            return []

    async def _download_asset(self, asset: FetchedAsset, scene_dir: Path) -> bool:
        """
        Download an asset file to staging and validate it.

        Routes VIDEO assets through yt-dlp (handles YouTube, Twitter, etc.)
        and PHOTO/GIF assets through direct HTTP download.
        """
        url = asset.source_url

        # ── VIDEO assets: download via yt-dlp ──
        if asset.asset_type == AssetType.VIDEO:
            return await self._download_video_asset(asset, scene_dir)

        # ── PHOTO / GIF assets: direct HTTP download ──
        return await self._download_image_asset(asset, scene_dir)

    async def _download_video_asset(self, asset: FetchedAsset, scene_dir: Path) -> bool:
        """Download a video asset via yt-dlp with quality gates."""
        url = asset.source_url

        # Skip if already in download archive
        if self.video_downloader.is_already_downloaded(url):
            url_hash = hashlib.md5(url.encode()).hexdigest()[:16]
            existing = list(scene_dir.glob(f"video_{url_hash}*"))
            if existing and existing[0].exists() and existing[0].stat().st_size > 0:
                asset.local_path = existing[0]
                logger.info(f"Video cached: {existing[0].name}")
                return True

        # Download via yt-dlp (runs in thread pool)
        local_path = await self.video_downloader.async_download(url, scene_dir)
        if not local_path or not local_path.exists():
            return False

        file_size = local_path.stat().st_size

        # ── Video quality gates ──

        # Gate 1: File size bounds
        if file_size < self.config.video_min_file_size:
            logger.warning(f"Rejecting tiny video ({file_size} bytes): {local_path.name}")
            local_path.unlink(missing_ok=True)
            return False

        if file_size > self.config.video_max_file_size:
            logger.warning(
                f"Rejecting oversized video ({file_size / 1_000_000:.1f}MB): {local_path.name}"
            )
            local_path.unlink(missing_ok=True)
            return False

        # Gate 2: Verify it's actually a video file (not HTML error page)
        try:
            with open(local_path, "rb") as fh:
                header = fh.read(16)
            if header.lstrip().startswith(b"<") or header.startswith(b"<!"):
                logger.warning(f"Rejecting HTML masquerading as video: {local_path.name}")
                local_path.unlink(missing_ok=True)
                return False
        except Exception:
            pass

        # Gate 3: Probe duration with ffprobe if available (backup check beyond yt-dlp filter)
        try:
            import subprocess
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(local_path)],
                capture_output=True, text=True, timeout=10,
            )
            if probe.stdout.strip():
                actual_duration = float(probe.stdout.strip())
                if actual_duration > self.config.video_max_duration:
                    logger.warning(
                        f"Rejecting video exceeding duration limit "
                        f"({actual_duration:.1f}s > {self.config.video_max_duration}s): {local_path.name}"
                    )
                    local_path.unlink(missing_ok=True)
                    return False
                # Store actual duration in metadata
                asset.metadata["actual_duration"] = actual_duration
        except FileNotFoundError:
            pass  # ffprobe not installed — rely on yt-dlp's match_filter
        except Exception as e:
            logger.debug(f"ffprobe check skipped for {local_path.name}: {e}")

        asset.local_path = local_path
        logger.info(
            f"Video asset ready: {local_path.name} "
            f"({file_size / 1024:.0f}KB)"
        )
        return True

    async def _download_image_asset(self, asset: FetchedAsset, scene_dir: Path) -> bool:
        """Download an image/GIF asset via direct HTTP with quality gates."""
        url = asset.source_url

        # Determine extension
        ext = ".jpg"
        for candidate_ext in [".png", ".jpg", ".jpeg", ".webp", ".mp4", ".gif"]:
            if candidate_ext in url.lower().split("?")[0]:
                ext = candidate_ext
                break

        filename = f"{asset.source.value}_{_file_hash(url)}{ext}"
        filepath = scene_dir / filename

        success = await _download_file(url, filepath, timeout=self.config.fetch_timeout)
        if success:
            file_size = filepath.stat().st_size

            # Gate 1: Reject tiny files (thumbnails / broken)
            if asset.asset_type == AssetType.PHOTO and file_size < 8_000:
                logger.warning(f"Rejecting tiny download ({file_size} bytes): {filepath.name}")
                filepath.unlink(missing_ok=True)
                return False

            # Gate 2: Reject HTML pages saved as images (403s, captchas)
            if ext in (".jpg", ".jpeg", ".png", ".webp"):
                try:
                    with open(filepath, "rb") as fh:
                        header = fh.read(16)
                    if header.lstrip().startswith(b"<") or header.startswith(b"<!"):
                        logger.warning(f"Rejecting HTML masquerading as image: {filepath.name}")
                        filepath.unlink(missing_ok=True)
                        return False

                    # Pillow integrity check — verify() checks headers,
                    # load() catches truncated/corrupt pixel data that verify() misses.
                    # Must re-open after verify() since it invalidates the image object.
                    from PIL import Image
                    img = Image.open(filepath)
                    img.verify()
                    img = Image.open(filepath)
                    img.load()
                    # Detect alpha channel from actual pixel data, not URL extension
                    asset.has_alpha = img.mode in ("RGBA", "LA", "PA")
                except ImportError:
                    pass  # Pillow not installed
                except Exception as e:
                    logger.warning(f"Rejecting corrupted image: {filepath.name} ({e})")
                    filepath.unlink(missing_ok=True)
                    return False

            asset.local_path = filepath
        return success

    async def fetch_all_routed(self, scenes: list[Scene]) -> dict[int, list[FetchedAsset]]:
        """Fetch assets for all scenes. Returns {scene_id: [FetchedAsset, ...]}"""
        semaphore = asyncio.Semaphore(self.config.max_concurrent_fetches)

        async def _limited(scene: Scene):
            async with semaphore:
                return scene.scene_id, await self.fetch_for_scene(scene)

        tasks = [_limited(s) for s in scenes]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        scene_assets = {}
        for r in results:
            if isinstance(r, Exception):
                logger.error(f"Scene fetch error: {r}")
            else:
                sid, assets = r
                scene_assets[sid] = assets

        # ── Cross-scene deduplication (two layers) ──
        #
        # Layer 1: URL dedup (safety net — catches any duplicates that slipped
        #          past the pre-download check, e.g. from cache backfills)
        # Layer 2: Perceptual dHash dedup — catches the SAME image served from
        #          DIFFERENT URLs (different CDNs, resized, different query params)
        #
        url_dedup_removed = 0
        global_seen_urls: set[str] = set()
        for sid in sorted(scene_assets.keys()):
            deduped = []
            for asset in scene_assets[sid]:
                if asset.source_url and asset.source_url in global_seen_urls:
                    if asset.local_path and asset.local_path.exists():
                        asset.local_path.unlink(missing_ok=True)
                    url_dedup_removed += 1
                else:
                    if asset.source_url:
                        global_seen_urls.add(asset.source_url)
                    deduped.append(asset)
            scene_assets[sid] = deduped
        if url_dedup_removed:
            logger.info(f"Cross-scene URL dedup: removed {url_dedup_removed} exact URL duplicate(s)")

        # Layer 2: Perceptual dedup across scenes — compare dHash fingerprints
        # of all photo assets across scene boundaries. The within-scene dedup
        # already ran in fetch_for_scene(), but two different scenes can fetch
        # the same logo/photo from different Google URLs.
        from AssetFlow.dedup import compute_dhash, hamming_distance, HAMMING_THRESHOLD
        global_hashes: list[tuple[int, str, int]] = []  # (hash, filename, scene_id)
        perceptual_dedup_removed = 0

        for sid in sorted(scene_assets.keys()):
            kept = []
            for asset in scene_assets[sid]:
                # Only dedup photos (videos/GIFs don't get dHash)
                if asset.asset_type != AssetType.PHOTO:
                    kept.append(asset)
                    continue
                if not asset.local_path or not asset.local_path.exists():
                    kept.append(asset)
                    continue

                h = compute_dhash(asset.local_path)
                if h is None:
                    kept.append(asset)
                    continue

                # Check against ALL previously seen hashes from other scenes
                is_dup = False
                for existing_hash, existing_name, existing_sid in global_hashes:
                    dist = hamming_distance(h, existing_hash)
                    if dist <= HAMMING_THRESHOLD:
                        logger.info(
                            f"Cross-scene perceptual dedup: scene {sid} '{asset.local_path.name}' "
                            f"matches scene {existing_sid} '{existing_name}' (distance {dist})"
                        )
                        try:
                            asset.local_path.unlink(missing_ok=True)
                        except OSError:
                            pass
                        is_dup = True
                        perceptual_dedup_removed += 1
                        break

                if not is_dup:
                    kept.append(asset)
                    global_hashes.append((h, asset.local_path.name, sid))

            scene_assets[sid] = kept

        if perceptual_dedup_removed:
            logger.info(
                f"Cross-scene perceptual dedup: removed {perceptual_dedup_removed} "
                f"visually identical image(s) across scenes"
            )

        total = sum(len(v) for v in scene_assets.values())
        logger.info(f"Total fetched: {total} unique assets across {len(scene_assets)} scenes")

        await close_shared_session()
        return scene_assets
