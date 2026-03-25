#!/usr/bin/env python3
"""
Quick test to verify Pexels and Pixabay API keys are working.
Shows exactly what key is being read and what the API returns.
"""

import os
import sys
import json
import ssl
import urllib.request
import urllib.error
import urllib.parse
import certifi
from pathlib import Path

PROJECT_DIR = Path(__file__).parent.parent


def load_key(name: str) -> str:
    """Load a key from .env"""
    env_file = PROJECT_DIR / ".env"
    if not env_file.exists():
        return ""
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def make_request(url: str, headers: dict = None) -> tuple:
    """Make a request and return (status_code, response_body)."""
    # Create SSL context with certifi certificates
    ctx = ssl.create_default_context(cafile=certifi.where())

    req = urllib.request.Request(url)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            body = resp.read().decode()
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
        except Exception:
            pass
        return e.code, body
    except Exception as e:
        return 0, str(e)


print("=" * 50)
print("API Key Test")
print("=" * 50)

# --- Pexels ---
print("\n--- PEXELS ---")
pexels_key = load_key("PEXELS_API_KEY")
if not pexels_key:
    print("  Key: NOT FOUND in .env")
else:
    masked = pexels_key[:6] + "..." + pexels_key[-4:]
    print(f"  Key: {masked} ({len(pexels_key)} chars)")

    url = "https://api.pexels.com/v1/search?query=test&per_page=1"
    print(f"  Testing: GET {url}")
    status, body = make_request(url, headers={"Authorization": pexels_key})
    print(f"  Status: {status}")
    if status == 200:
        data = json.loads(body)
        print(f"  ✓ Working! Found {data.get('total_results', '?')} results")
    else:
        print(f"  ✗ Failed: {body[:200]}")

# --- Pixabay ---
print("\n--- PIXABAY ---")
pixabay_key = load_key("PIXABAY_API_KEY")
if not pixabay_key:
    print("  Key: NOT FOUND in .env")
else:
    masked = pixabay_key[:6] + "..." + pixabay_key[-4:]
    print(f"  Key: {masked} ({len(pixabay_key)} chars)")

    url = f"https://pixabay.com/api/?key={urllib.parse.quote(pixabay_key)}&q=test&per_page=3"
    print(f"  Testing: GET https://pixabay.com/api/?key={masked}&q=test&per_page=3")
    status, body = make_request(url)
    print(f"  Status: {status}")
    if status == 200:
        data = json.loads(body)
        print(f"  ✓ Working! Found {data.get('totalHits', '?')} results")
    else:
        print(f"  ✗ Failed: {body[:200]}")

print()
