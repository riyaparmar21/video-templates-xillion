#!/usr/bin/env python3
"""
Pexels API Asset Fetcher
Downloads background videos and stock photos from Pexels.

API docs: https://www.pexels.com/api/documentation/

Usage:
  python3 fetch-pexels.py --type video --query "abstract background" --count 5
  python3 fetch-pexels.py --type photo --query "nature landscape" --count 10
  python3 fetch-pexels.py --type video --query "light leak" --count 3 --orientation landscape
  python3 fetch-pexels.py --dry-run --type video --query "particles"

Requires: PEXELS_API_KEY in .env or environment variable
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_DIR / "assets"

API_BASE = "https://api.pexels.com"


def load_api_key() -> str:
    """Load API key from environment or .env file."""
    key = os.environ.get("PEXELS_API_KEY")
    if key:
        return key

    env_file = PROJECT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("PEXELS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    return ""


def api_request(endpoint: str, params: dict, api_key: str) -> dict:
    """Make authenticated request to Pexels API."""
    query_string = urllib.parse.urlencode(params)
    url = f"{API_BASE}{endpoint}?{query_string}"

    req = urllib.request.Request(url, headers={"Authorization": api_key})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("ERROR: Invalid API key. Check your PEXELS_API_KEY.")
        elif e.code == 429:
            print("ERROR: Rate limited. Pexels allows 200 requests/hour, 20K/month.")
        else:
            print(f"ERROR: HTTP {e.code} — {e.reason}")
        sys.exit(1)


def download_file(url: str, filepath: Path, dry_run: bool = False) -> bool:
    """Download a file from URL."""
    if dry_run:
        print(f"  [dry-run] Would download: {url}")
        print(f"            To: {filepath}")
        return True

    try:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, str(filepath))
        size_mb = filepath.stat().st_size / (1024 * 1024)
        print(f"  ✓ {filepath.name} ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False


def search_videos(query: str, count: int, api_key: str, orientation: str = "",
                  size: str = "medium", min_duration: int = 0, max_duration: int = 0) -> list:
    """Search for videos on Pexels."""
    params = {
        "query": query,
        "per_page": min(count, 80),  # Pexels max per page
        "size": size,
    }
    if orientation:
        params["orientation"] = orientation
    if min_duration:
        params["min_duration"] = min_duration
    if max_duration:
        params["max_duration"] = max_duration

    data = api_request("/videos/search", params, api_key)
    videos = data.get("videos", [])

    results = []
    for video in videos[:count]:
        # Pick the best file — prefer HD (1920x1080) or medium quality
        files = video.get("video_files", [])
        best = None
        for f in files:
            # Prefer HD mp4
            if f.get("quality") == "hd" and f.get("file_type") == "video/mp4":
                best = f
                break
        if not best and files:
            # Fallback to first mp4
            for f in files:
                if f.get("file_type") == "video/mp4":
                    best = f
                    break
        if not best and files:
            best = files[0]

        if best:
            results.append({
                "id": video["id"],
                "url": best["link"],
                "width": best.get("width", 0),
                "height": best.get("height", 0),
                "duration": video.get("duration", 0),
                "photographer": video.get("user", {}).get("name", "Unknown"),
                "pexels_url": video.get("url", ""),
            })

    return results


def search_photos(query: str, count: int, api_key: str, orientation: str = "",
                  size: str = "large") -> list:
    """Search for photos on Pexels."""
    params = {
        "query": query,
        "per_page": min(count, 80),
        "size": size,
    }
    if orientation:
        params["orientation"] = orientation

    data = api_request("/v1/search", params, api_key)
    photos = data.get("photos", [])

    results = []
    for photo in photos[:count]:
        src = photo.get("src", {})
        # Use 'large2x' for high quality, 'original' is often huge
        url = src.get("large2x") or src.get("large") or src.get("original", "")
        results.append({
            "id": photo["id"],
            "url": url,
            "width": photo.get("width", 0),
            "height": photo.get("height", 0),
            "photographer": photo.get("photographer", "Unknown"),
            "pexels_url": photo.get("url", ""),
            "alt": photo.get("alt", ""),
        })

    return results


def save_metadata(items: list, output_dir: Path, query: str, asset_type: str):
    """Save attribution/metadata JSON alongside downloads."""
    meta = {
        "source": "pexels",
        "query": query,
        "type": asset_type,
        "count": len(items),
        "license": "Pexels License (free for personal and commercial use, no attribution required but appreciated)",
        "items": items,
    }
    meta_path = output_dir / "_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Fetch assets from Pexels API")
    parser.add_argument("--type", choices=["video", "photo"], required=True,
                        help="Type of asset to fetch")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--count", type=int, default=5, help="Number of results (default: 5)")
    parser.add_argument("--orientation", choices=["landscape", "portrait", "square"],
                        default="", help="Filter by orientation")
    parser.add_argument("--output", default="", help="Output directory (default: auto)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be downloaded without downloading")
    parser.add_argument("--min-duration", type=int, default=0,
                        help="Min video duration in seconds (videos only)")
    parser.add_argument("--max-duration", type=int, default=0,
                        help="Max video duration in seconds (videos only)")
    args = parser.parse_args()

    api_key = load_api_key()
    if not api_key:
        print("ERROR: No API key found.")
        print("Add PEXELS_API_KEY=your_key_here to your .env file")
        print("Get a free key at: https://www.pexels.com/api/")
        sys.exit(1)

    # Determine output directory
    if args.output:
        output_dir = Path(args.output)
    else:
        subfolder = "videos" if args.type == "video" else "images"
        # Sanitize query for folder name
        safe_query = args.query.lower().replace(" ", "-")[:30]
        output_dir = ASSETS_DIR / "backgrounds" / subfolder / f"pexels-{safe_query}"

    print(f"Searching Pexels for {args.type}s: \"{args.query}\"")
    print(f"Output: {output_dir}")
    print()

    if args.type == "video":
        items = search_videos(
            args.query, args.count, api_key,
            orientation=args.orientation,
            min_duration=args.min_duration,
            max_duration=args.max_duration,
        )
    else:
        items = search_photos(
            args.query, args.count, api_key,
            orientation=args.orientation,
        )

    if not items:
        print("No results found.")
        sys.exit(0)

    print(f"Found {len(items)} {args.type}(s)\n")

    success = 0
    for item in items:
        ext = "mp4" if args.type == "video" else "jpg"
        filename = f"pexels-{item['id']}.{ext}"
        filepath = output_dir / filename

        info = f"  {item['id']} — {item.get('width', '?')}x{item.get('height', '?')}"
        if args.type == "video":
            info += f" — {item.get('duration', '?')}s"
        info += f" — by {item.get('photographer', 'Unknown')}"
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
