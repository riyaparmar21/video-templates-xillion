#!/usr/bin/env python3
"""
Pixabay API Asset Fetcher
Downloads background videos and stock photos from Pixabay.

API docs: https://pixabay.com/api/docs/

Usage:
  python3 fetch-pixabay.py --type video --query "abstract particles" --count 5
  python3 fetch-pixabay.py --type photo --query "texture dark" --count 10
  python3 fetch-pixabay.py --dry-run --type video --query "bokeh"

Requires: PIXABAY_API_KEY in .env or environment variable

Note: Pixabay prohibits mass downloading. These scripts are for selective,
curated downloads for use in video templates.
"""

import os
import sys
import json
import ssl
import argparse
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = None

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_DIR / "assets"

API_BASE = "https://pixabay.com/api"


def load_api_key() -> str:
    """Load API key from environment or .env file."""
    key = os.environ.get("PIXABAY_API_KEY")
    if key:
        return key

    env_file = PROJECT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("PIXABAY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    return ""


def api_request(endpoint: str, params: dict) -> dict:
    """Make request to Pixabay API."""
    query_string = urllib.parse.urlencode(params)
    url = f"{API_BASE}{endpoint}?{query_string}"

    # Debug: show masked key being used
    key_val = params.get("key", "")
    if key_val:
        masked = key_val[:6] + "..." + key_val[-4:] if len(key_val) > 10 else "***"
        print(f"  [debug] Using key: {masked} ({len(key_val)} chars)")
        print(f"  [debug] URL: {API_BASE}{endpoint}?key={masked}&...")

    try:
        kwargs = {"timeout": 30}
        if SSL_CONTEXT:
            kwargs["context"] = SSL_CONTEXT
        with urllib.request.urlopen(url, **kwargs) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
        except Exception:
            pass
        print(f"ERROR: HTTP {e.code} — {e.reason}")
        if body:
            print(f"  Response: {body[:300]}")
        sys.exit(1)


def download_file(url: str, filepath: Path, dry_run: bool = False) -> bool:
    """Download a file from URL."""
    if dry_run:
        print(f"  [dry-run] Would download: {url}")
        print(f"            To: {filepath}")
        return True

    try:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        kwargs = {"timeout": 60}
        if SSL_CONTEXT:
            kwargs["context"] = SSL_CONTEXT
        with urllib.request.urlopen(req, **kwargs) as resp, open(filepath, "wb") as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)
        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"  ✓ {filepath.name} ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False


def search_videos(query: str, count: int, api_key: str,
                  video_type: str = "all", min_width: int = 0,
                  min_height: int = 0) -> list:
    """Search for videos on Pixabay."""
    params = {
        "key": api_key,
        "q": query,
        "per_page": max(3, min(count, 200)),
        "video_type": video_type,  # "all", "film", "animation"
        "safesearch": "true",
    }
    if min_width:
        params["min_width"] = min_width
    if min_height:
        params["min_height"] = min_height

    data = api_request("/videos/", params)
    hits = data.get("hits", [])

    results = []
    for hit in hits[:count]:
        videos = hit.get("videos", {})
        # Prefer "large" (1920x1080) then "medium" (1280x720)
        best = videos.get("large", {})
        if not best.get("url"):
            best = videos.get("medium", {})
        if not best.get("url"):
            best = videos.get("small", {})

        if best.get("url"):
            results.append({
                "id": hit["id"],
                "url": best["url"],
                "width": best.get("width", 0),
                "height": best.get("height", 0),
                "duration": hit.get("duration", 0),
                "tags": hit.get("tags", ""),
                "user": hit.get("user", "Unknown"),
                "pixabay_url": hit.get("pageURL", ""),
            })

    return results


def search_photos(query: str, count: int, api_key: str,
                  image_type: str = "photo", orientation: str = "",
                  min_width: int = 0, min_height: int = 0) -> list:
    """Search for photos on Pixabay."""
    params = {
        "key": api_key,
        "q": query,
        "per_page": max(3, min(count, 200)),
        "image_type": image_type,  # "all", "photo", "illustration", "vector"
        "safesearch": "true",
    }
    if orientation:
        params["orientation"] = orientation  # "all", "horizontal", "vertical"
    if min_width:
        params["min_width"] = min_width
    if min_height:
        params["min_height"] = min_height

    data = api_request("/", params)
    hits = data.get("hits", [])

    results = []
    for hit in hits[:count]:
        # Use largeImageURL (1280px) — fullHDURL needs paid plan
        url = hit.get("largeImageURL") or hit.get("webformatURL", "")
        results.append({
            "id": hit["id"],
            "url": url,
            "width": hit.get("imageWidth", 0),
            "height": hit.get("imageHeight", 0),
            "tags": hit.get("tags", ""),
            "user": hit.get("user", "Unknown"),
            "pixabay_url": hit.get("pageURL", ""),
        })

    return results


def save_metadata(items: list, output_dir: Path, query: str, asset_type: str):
    """Save attribution/metadata JSON alongside downloads."""
    meta = {
        "source": "pixabay",
        "query": query,
        "type": asset_type,
        "count": len(items),
        "license": "Pixabay Content License (free for commercial use, no attribution required)",
        "items": items,
    }
    meta_path = output_dir / "_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Fetch assets from Pixabay API")
    parser.add_argument("--type", choices=["video", "photo"], required=True,
                        help="Type of asset to fetch")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--count", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--orientation", choices=["horizontal", "vertical", "all"],
                        default="", help="Filter by orientation (photos only)")
    parser.add_argument("--image-type", choices=["all", "photo", "illustration", "vector"],
                        default="photo", help="Image type filter (photos only)")
    parser.add_argument("--video-type", choices=["all", "film", "animation"],
                        default="all", help="Video type filter (videos only)")
    parser.add_argument("--output", default="", help="Output directory (default: auto)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be downloaded without downloading")
    parser.add_argument("--min-width", type=int, default=0, help="Minimum width")
    parser.add_argument("--min-height", type=int, default=0, help="Minimum height")
    args = parser.parse_args()

    api_key = load_api_key()
    if not api_key:
        print("ERROR: No API key found.")
        print("Add PIXABAY_API_KEY=your_key_here to your .env file")
        print("Get a free key at: https://pixabay.com/api/docs/")
        sys.exit(1)

    # Determine output directory
    if args.output:
        output_dir = Path(args.output)
    else:
        subfolder = "videos" if args.type == "video" else "images"
        safe_query = args.query.lower().replace(" ", "-")[:30]
        output_dir = ASSETS_DIR / "backgrounds" / subfolder / f"pixabay-{safe_query}"

    print(f"Searching Pixabay for {args.type}s: \"{args.query}\"")
    print(f"Output: {output_dir}")
    print()

    if args.type == "video":
        items = search_videos(
            args.query, args.count, api_key,
            video_type=args.video_type,
            min_width=args.min_width,
            min_height=args.min_height,
        )
    else:
        items = search_photos(
            args.query, args.count, api_key,
            image_type=args.image_type,
            orientation=args.orientation,
            min_width=args.min_width,
            min_height=args.min_height,
        )

    if not items:
        print("No results found.")
        sys.exit(0)

    print(f"Found {len(items)} {args.type}(s)\n")

    success = 0
    for item in items:
        ext = "mp4" if args.type == "video" else "jpg"
        filename = f"pixabay-{item['id']}.{ext}"
        filepath = output_dir / filename

        info = f"  {item['id']} — {item.get('width', '?')}x{item.get('height', '?')}"
        if args.type == "video":
            info += f" — {item.get('duration', '?')}s"
        info += f" — by {item.get('user', 'Unknown')}"
        if item.get("tags"):
            info += f" — [{item['tags']}]"
        print(info)

        if download_file(item["url"], filepath, dry_run=args.dry_run):
            success += 1

    if not args.dry_run:
        save_metadata(items, output_dir, args.query, args.type)
        print(f"\n✓ Downloaded {success}/{len(items)} {args.type}(s)")
        print(f"  Metadata saved to {output_dir}/_metadata.json")
    else:
        print(f"\n[dry-run] Would download {len(items)} {args.type}(s)")


if __name__ == "__main__":
    main()
