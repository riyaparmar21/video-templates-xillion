#!/usr/bin/env python3
"""
Re-download missing assets from existing _metadata.json files.
Scans assets/backgrounds/ for metadata files and downloads any
missing video/image files.

Usage: python3 redownload-from-metadata.py
"""

import os
import sys
import json
import ssl
import urllib.request
from pathlib import Path

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = None

ASSETS_DIR = Path(__file__).parent.parent / "assets"
BG_DIR = ASSETS_DIR / "backgrounds"


def download_file(url: str, filepath: Path) -> bool:
    """Download a file with proper SSL context."""
    try:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        kwargs = {"timeout": 60}
        if SSL_CONTEXT:
            kwargs["context"] = SSL_CONTEXT
        with urllib.request.urlopen(req, **kwargs) as resp, open(filepath, "wb") as f:
            total = 0
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
        size_mb = total / (1024 * 1024)
        print(f"    ✓ {filepath.name} ({size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        # Clean up partial file
        if filepath.exists():
            filepath.unlink()
        return False


def main():
    if not BG_DIR.exists():
        print("No backgrounds directory found.")
        sys.exit(1)

    # Find all _metadata.json files
    meta_files = list(BG_DIR.rglob("_metadata.json"))
    if not meta_files:
        print("No metadata files found. Run fetch-assets first.")
        sys.exit(0)

    print(f"Found {len(meta_files)} metadata files\n")

    total_missing = 0
    total_downloaded = 0
    total_existing = 0

    for meta_path in sorted(meta_files):
        folder = meta_path.parent
        folder_name = folder.name
        rel_path = folder.relative_to(ASSETS_DIR)

        with open(meta_path) as f:
            meta = json.load(f)

        asset_type = meta.get("type", "photo")
        items = meta.get("items", [])
        source = meta.get("source", "pixabay")

        print(f"── {rel_path} ({len(items)} items, {asset_type})")

        for item in items:
            item_id = item.get("id", 0)
            url = item.get("url", "")
            ext = "mp4" if asset_type == "video" else "jpg"
            filename = f"{source}-{item_id}.{ext}"
            filepath = folder / filename

            if filepath.exists() and filepath.stat().st_size > 0:
                size_mb = filepath.stat().st_size / (1024 * 1024)
                print(f"    ○ {filename} already exists ({size_mb:.1f} MB)")
                total_existing += 1
                continue

            if not url:
                print(f"    ⚠ {filename} — no URL in metadata")
                total_missing += 1
                continue

            print(f"    ↓ Downloading {filename}...")
            width = item.get("width", "?")
            height = item.get("height", "?")
            duration = item.get("duration", "")
            info = f"      {width}x{height}"
            if duration:
                info += f" {duration}s"
            print(info)

            if download_file(url, filepath):
                total_downloaded += 1
            else:
                total_missing += 1

        print()

    print("=" * 50)
    print(f"Already existed: {total_existing}")
    print(f"Downloaded now:  {total_downloaded}")
    print(f"Failed/missing:  {total_missing}")
    print(f"Total assets:    {total_existing + total_downloaded + total_missing}")


if __name__ == "__main__":
    main()
