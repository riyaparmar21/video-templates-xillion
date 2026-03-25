"""
Media Inventory System

Scans a media folder and builds a structured inventory the AI can use
to intelligently place images, videos, and SVGs in video scenes.

Three levels of image understanding:
  1. Filename-based: Uses descriptive filenames (fast, free, always works)
  2. Metadata-based: Extracts EXIF, dimensions, file type info
  3. AI-captioned: Uses a vision model to describe each image (optional, best quality)

Caption caching:
  Captions are stored in `.media-captions.json` inside the media folder.
  Run `--caption-images` once to caption all images. Future runs with just
  `--media` will automatically load cached captions. Only new or modified
  images need re-captioning. Use `--recaption` to force a full re-caption.

Usage:
    from generator.media import MediaInventory

    inv = MediaInventory("./assets")
    manifest = inv.scan()               # Level 1+2 + cached captions
    manifest = await inv.scan_with_captions()  # Level 3: caption new images
    prompt_section = inv.to_prompt()     # Formatted for AI prompt injection
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    from openai import AzureOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


# Supported file extensions by category
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
SVG_EXTS = {".svg"}
AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".m4a", ".aac"}

ALL_MEDIA_EXTS = IMAGE_EXTS | VIDEO_EXTS | SVG_EXTS | AUDIO_EXTS

CAPTION_CACHE_FILE = ".media-captions.json"


def _humanize_filename(filename: str) -> str:
    """
    Convert a filename into a human-readable description.

    Examples:
        'gold_bar_shiny.png'    → 'gold bar shiny'
        'bitcoin-logo-v2.svg'   → 'bitcoin logo v2'
        'chart_overlay.mp4'     → 'chart overlay'
        'IMG_20240315.jpg'      → 'img 20240315'
        'revenue-growth-2024.png' → 'revenue growth 2024'
    """
    name = Path(filename).stem  # Remove extension
    # Replace separators with spaces
    name = re.sub(r'[-_]+', ' ', name)
    # Remove excessive whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name.lower()


def _get_image_dimensions(filepath: str) -> Optional[Dict[str, int]]:
    """Get image width/height using PIL if available."""
    if not PIL_AVAILABLE:
        return None
    try:
        with PILImage.open(filepath) as img:
            return {"width": img.width, "height": img.height}
    except Exception:
        return None


def _get_file_size_human(size_bytes: int) -> str:
    """Convert bytes to human-readable size."""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f}KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f}MB"


def _categorize_file(ext: str) -> str:
    """Return the media category for a file extension."""
    if ext in IMAGE_EXTS:
        return "image"
    elif ext in VIDEO_EXTS:
        return "video"
    elif ext in SVG_EXTS:
        return "svg"
    elif ext in AUDIO_EXTS:
        return "audio"
    return "unknown"


class CaptionCache:
    """
    Persistent cache for AI-generated image captions.

    Stores captions in a JSON sidecar file (.media-captions.json) inside
    the media folder. Each entry is keyed by relative file path and tracks
    file size + mtime so we know when to re-caption.

    Schema:
        {
            "gold_bar.png": {
                "caption": "A gleaming gold bar on dark background...",
                "file_size": 245760,
                "mtime": 1709234567.89
            }
        }
    """

    def __init__(self, media_dir: Path):
        self.cache_path = media_dir / CAPTION_CACHE_FILE
        self._data: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        """Load existing cache from disk."""
        if self.cache_path.exists():
            try:
                self._data = json.loads(self.cache_path.read_text())
                print(f"   [Caption Cache] Loaded {len(self._data)} cached captions from {CAPTION_CACHE_FILE}")
            except (json.JSONDecodeError, OSError) as e:
                print(f"   [Caption Cache] Failed to load cache: {e}")
                self._data = {}
        else:
            self._data = {}

    def save(self) -> None:
        """Persist cache to disk."""
        try:
            self.cache_path.write_text(json.dumps(self._data, indent=2))
            print(f"   [Caption Cache] Saved {len(self._data)} captions to {CAPTION_CACHE_FILE}")
        except OSError as e:
            print(f"   [Caption Cache] Failed to save cache: {e}")

    def get(self, rel_path: str, file_size: int, mtime: float) -> Optional[str]:
        """
        Get cached caption if file hasn't changed.

        Returns the caption string if cached and file is unchanged,
        or None if the file is new/modified and needs re-captioning.
        """
        entry = self._data.get(rel_path)
        if not entry:
            return None

        # Check if file has changed (size or modification time)
        if entry.get("file_size") != file_size or abs(entry.get("mtime", 0) - mtime) > 1.0:
            return None

        return entry.get("caption")

    def set(self, rel_path: str, caption: str, file_size: int, mtime: float) -> None:
        """Store a caption in the cache."""
        self._data[rel_path] = {
            "caption": caption,
            "file_size": file_size,
            "mtime": mtime,
        }

    def has_any(self) -> bool:
        """Check if any captions exist in cache."""
        return len(self._data) > 0

    def count(self) -> int:
        """Number of cached captions."""
        return len(self._data)

    def clear(self) -> None:
        """Clear all cached captions."""
        self._data = {}


class MediaInventory:
    """
    Scans a media folder and builds a structured inventory.

    The inventory gives the AI three layers of understanding:
    1. What files exist (names, types, sizes)
    2. What they look like (dimensions, format details)
    3. What they depict (AI-generated captions — cached persistently)
    """

    def __init__(self, media_dir: str):
        self.media_dir = Path(media_dir)
        self.items: List[Dict[str, Any]] = []
        self._scanned = False
        self._caption_cache: Optional[CaptionCache] = None

    def _get_caption_cache(self) -> CaptionCache:
        """Lazy-load the caption cache."""
        if self._caption_cache is None:
            self._caption_cache = CaptionCache(self.media_dir)
        return self._caption_cache

    def scan(self) -> List[Dict[str, Any]]:
        """
        Level 1+2 scan: filename analysis + metadata extraction.
        Also loads any previously cached AI captions automatically.
        Fast, no API calls needed.
        """
        if not self.media_dir.exists():
            print(f"   [Media] Directory not found: {self.media_dir}")
            return []

        self.items = []
        caption_cache = self._get_caption_cache()
        files = sorted(self.media_dir.rglob("*"))
        cached_hits = 0

        for filepath in files:
            if filepath.is_dir():
                continue
            if filepath.name == CAPTION_CACHE_FILE:
                continue  # Skip the cache file itself

            ext = filepath.suffix.lower()
            if ext not in ALL_MEDIA_EXTS:
                continue

            category = _categorize_file(ext)
            stat = filepath.stat()
            rel_path = str(filepath.relative_to(self.media_dir))

            item: Dict[str, Any] = {
                "filename": filepath.name,
                "path": rel_path,
                "category": category,
                "extension": ext,
                "size": _get_file_size_human(stat.st_size),
                "size_bytes": stat.st_size,
                "mtime": stat.st_mtime,
                "description": _humanize_filename(filepath.name),
            }

            # Image-specific metadata
            if category == "image":
                dims = _get_image_dimensions(str(filepath))
                if dims:
                    item["width"] = dims["width"]
                    item["height"] = dims["height"]
                    if dims["width"] > dims["height"]:
                        item["orientation"] = "landscape"
                    elif dims["height"] > dims["width"]:
                        item["orientation"] = "portrait"
                    else:
                        item["orientation"] = "square"

                # Check for cached caption
                cached_caption = caption_cache.get(rel_path, stat.st_size, stat.st_mtime)
                if cached_caption:
                    item["ai_caption"] = cached_caption
                    cached_hits += 1

            # SVG-specific: try to extract viewBox
            if category == "svg":
                try:
                    content = filepath.read_text()[:2000]
                    vb_match = re.search(r'viewBox=["\']([^"\']+)["\']', content)
                    if vb_match:
                        item["viewBox"] = vb_match.group(1)
                except Exception:
                    pass

            self.items.append(item)

        self._scanned = True
        print(f"   [Media] Scanned {len(self.items)} files from {self.media_dir}")

        if cached_hits > 0:
            print(f"   [Media] Loaded {cached_hits} cached AI captions (no API calls needed)")

        # Print summary by category
        by_cat = {}
        for item in self.items:
            cat = item["category"]
            by_cat[cat] = by_cat.get(cat, 0) + 1
        for cat, count in sorted(by_cat.items()):
            print(f"      {cat}: {count} files")

        return self.items

    async def scan_with_captions(
        self,
        azure_endpoint: Optional[str] = None,
        azure_key: Optional[str] = None,
        deployment: str = "gpt-4o",
        max_images: int = 30,
        force_recaption: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Level 3 scan: AI-powered image captioning with persistent cache.

        Only captions images that are new or modified since last caption run.
        Use force_recaption=True to re-caption everything.

        Captions are saved to .media-captions.json in the media folder.
        Future runs with just scan() will load these automatically.
        """
        # First do a basic scan (which also loads cached captions)
        if not self._scanned:
            self.scan()

        if not OPENAI_AVAILABLE:
            print("   [Media] openai not installed — skipping AI captions")
            return self.items

        endpoint = azure_endpoint or os.getenv("AZURE_GPT_IMAGE_ENDPOINT")
        key = azure_key or os.getenv("AZURE_OPENAI_KEY")

        if not endpoint or not key:
            print("   [Media] Azure credentials not found — skipping AI captions")
            return self.items

        caption_cache = self._get_caption_cache()

        if force_recaption:
            caption_cache.clear()
            # Clear in-memory captions too
            for item in self.items:
                item.pop("ai_caption", None)
            print("   [Media] Force recaption — cleared all cached captions")

        # Find images that need captioning (no cached caption)
        needs_caption = [
            i for i in self.items
            if i["category"] == "image" and not i.get("ai_caption")
        ][:max_images]

        if not needs_caption:
            already = sum(1 for i in self.items if i.get("ai_caption"))
            print(f"   [Media] All {already} images already captioned (cached). Use --recaption to redo.")
            return self.items

        total_images = sum(1 for i in self.items if i["category"] == "image")
        already_captioned = total_images - len(needs_caption)
        print(f"   [Media] Captioning {len(needs_caption)} new images ({already_captioned} already cached)...")

        client = AzureOpenAI(
            api_version="2024-12-01-preview",
            azure_endpoint=endpoint,
            api_key=key,
        )

        import base64

        new_captions = 0
        for i, item in enumerate(needs_caption):
            filepath = self.media_dir / item["path"]
            try:
                with open(filepath, "rb") as f:
                    img_data = base64.b64encode(f.read()).decode("utf-8")

                ext = item["extension"].lstrip(".")
                mime = f"image/{ext}" if ext != "jpg" else "image/jpeg"

                response = client.chat.completions.create(
                    model=deployment,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "Describe this image in 1-2 sentences for a video editor. "
                                        "Focus on: what is shown, dominant colors, mood/tone, and "
                                        "what type of video scene it would work well in. Be concise."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime};base64,{img_data}",
                                        "detail": "low",
                                    },
                                },
                            ],
                        }
                    ],
                    max_tokens=150,
                )

                caption = response.choices[0].message.content.strip()
                item["ai_caption"] = caption
                new_captions += 1

                # Save to cache immediately (survive crashes)
                caption_cache.set(
                    item["path"],
                    caption,
                    item["size_bytes"],
                    item["mtime"],
                )

                print(f"      [{i+1}/{len(needs_caption)}] {item['filename']}: {caption[:80]}...")

            except Exception as e:
                print(f"      [{i+1}/{len(needs_caption)}] {item['filename']}: caption failed — {e}")
                item["ai_caption"] = None

        # Persist cache to disk
        if new_captions > 0:
            caption_cache.save()
            print(f"   [Media] Captioned {new_captions} new images (total cached: {caption_cache.count()})")

        return self.items

    def to_prompt(self) -> str:
        """
        Format the media inventory as a prompt section for AI injection.

        Returns a markdown section that gets inserted into the generation prompt,
        so the AI knows what assets are available and what they depict.
        """
        if not self.items:
            return ""

        lines = [
            "## Available Media Assets",
            "",
            "The following media files are available. You can reference them in scene params",
            "using their filename (e.g., `\"backgroundImage\": \"gold_bar.png\"`).",
            "",
        ]

        # Group by category
        by_cat: Dict[str, List[Dict]] = {}
        for item in self.items:
            cat = item["category"]
            if cat not in by_cat:
                by_cat[cat] = []
            by_cat[cat].append(item)

        for cat in ["image", "svg", "video", "audio"]:
            items = by_cat.get(cat, [])
            if not items:
                continue

            lines.append(f"### {cat.title()}s ({len(items)} files)")
            lines.append("")

            for item in items:
                # Prefer AI caption, fall back to filename-derived description
                desc = item.get("ai_caption") or item["description"]
                dims = ""
                if "width" in item:
                    dims = f" ({item['width']}x{item['height']}, {item.get('orientation', '')})"

                lines.append(f"- **{item['filename']}**{dims}: {desc}")

            lines.append("")

        lines.append(
            "When a scene could benefit from a media asset, include its filename "
            "in the scene params. If no suitable asset exists, the template will "
            "use its built-in CSS/SVG fallback automatically."
        )
        lines.append("")

        return "\n".join(lines)

    def get_summary(self) -> Dict[str, Any]:
        """Return a summary dict for caching or logging."""
        by_cat = {}
        for item in self.items:
            cat = item["category"]
            by_cat[cat] = by_cat.get(cat, 0) + 1

        return {
            "total_files": len(self.items),
            "by_category": by_cat,
            "captioned": sum(1 for i in self.items if i.get("ai_caption")),
            "media_dir": str(self.media_dir),
        }
