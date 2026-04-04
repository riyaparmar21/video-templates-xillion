# AssetFlow

AI-driven video asset pipeline. Takes a video script, finds the right images from Google, scores them with a Vision LLM, and hands you a clean set of approved assets — with a human-in-the-loop dashboard for anything the AI isn't sure about.

**v0.2.0** — Google Search only. Single source, no clutter.

## How it works

```
Script → Director's Framework (LLM) → Google Image Search → Quality Gates → Perceptual Dedup → Vision LLM Scoring → Approved Assets
                                                                                                        ↓
                                                                                                 Failed? → HITL Dashboard
```

Three pipeline phases plus a manual review step:

| Phase | What happens |
|-------|-------------|
| **1 — Parse** | LLM reads your script via the Director's Framework. Produces scenes with targeted Google Search queries (one entity per query, identity queries for named brands/people, "vs" queries for comparisons). |
| **2 — Fetch** | Hits Serper.dev Google Image Search API. Downloads candidates, runs 4-layer quality gates (min 8KB, HTML detection, Pillow verify, perceptual dedup via dHash). Cross-scene URL dedup ensures the same image only appears once. |
| **3 — Score** | Vision LLM (Azure OpenAI or Gemini) evaluates each image for relevance, quality, and framing. Scores 1–10. Images above the threshold are auto-approved. |
| **HITL** | Scenes that failed scoring get an HTML dashboard. Upload a replacement, pick a low-scoring image anyway, or skip the scene. |

After the pipeline, there's an optional **background removal** step with its own visual dashboard.

## Quick start

### 1. Environment variables

Add these to your `.env` in the project root:

```bash
# Required — primary asset source
SERPER_API_KEY=your_serper_key          # free at serper.dev

# Vision LLM (pick one)
AZURE_OPENAI_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o     # default

# OR use Gemini instead
GEMINI_API_KEY=your_gemini_key
```

### 2. Install dependencies

```bash
pip install Pillow aiohttp python-dotenv

# Optional — for background removal
pip install rembg
```

### 3. Run

```bash
# Full pipeline
python -m AssetFlow run -s path/to/script.txt

# With options
python -m AssetFlow run -s script.txt --style "tech minimal" --threshold 7 --candidates 8
```

The pipeline auto-resumes from cache. If you've already fetched images for scenes 1–5, it'll skip straight to scene 6.

## CLI commands

### Pipeline

```bash
python -m AssetFlow run -s script.txt                  # full pipeline (auto-resumes)
python -m AssetFlow run -s script.txt --fresh           # wipe cache, start over
python -m AssetFlow run -s script.txt --refetch 3 5     # re-fetch only scenes 3 and 5
python -m AssetFlow run -s script.txt --phase 2         # start from phase 2 (load phase 1 from cache)
python -m AssetFlow run -s script.txt --skip-vision     # skip Vision LLM scoring
python -m AssetFlow run -s script.txt --format 9:16     # vertical video format
python -m AssetFlow parse -s script.txt                 # phase 1 only (no API calls)
```

### HITL review

```bash
python -m AssetFlow resolve selections.json             # apply dashboard selections
```

### Background removal (visual dashboard)

```bash
python -m AssetFlow rembg-review                        # opens visual dashboard in browser
python -m AssetFlow rembg-apply                         # apply to images selected in dashboard
python -m AssetFlow rembg-apply scene_001_Logo.jpg      # specific files
python -m AssetFlow rembg-apply --all                   # all candidates
```

`rembg-review` starts a local HTTP server and opens an HTML dashboard where you can see all the images, zoom in, check/uncheck which ones to process, then save your selections. `rembg-apply` reads those selections and runs background removal using the `birefnet-general` model.

### Cache and diagnostics

```bash
python -m AssetFlow status -s script.txt                # show cache state
python -m AssetFlow clear -s script.txt                 # clear cache for a script
python -m AssetFlow clear -s script.txt --scene 3 5     # clear specific scenes
python -m AssetFlow clear --all                         # clear everything
python -m AssetFlow check                               # verify API keys and config
```

## Quality gates

Downloaded images pass four checks before they ever reach the Vision LLM:

1. **Minimum file size** — rejects files under 8KB (thumbnails, broken downloads)
2. **HTML detection** — catches 403 pages and captchas saved as .jpg
3. **Pillow integrity** — verifies the image can actually be decoded
4. **Perceptual dedup (dHash)** — removes visually identical images within a scene. Uses 256-bit difference hashing with a Hamming distance threshold of 12. Catches the same logo at 3 different resolutions, with/without background, etc.

Cross-scene dedup also runs: if the same Google Image URL appears in multiple scenes, it's kept only in the first.

## Perceptual deduplication

The dedup step (`dedup.py`) solves the problem of Google returning the same image multiple times — same logo at different sizes, with and without background, slightly different compression. Without dedup, you'd get 6 copies of the same thing in one scene.

It uses **difference hashing (dHash)**: resize to 17x16 grayscale, compare adjacent pixel brightness, produce a 256-bit fingerprint. Two images with 12 or fewer bits different are treated as duplicates. No external dependencies beyond Pillow.

## Background removal

Background removal is manual, not automatic. You decide which images need it.

The workflow is: run the pipeline → `rembg-review` opens a visual dashboard showing all approved images in a grid → select the ones you want → `rembg-apply` processes them. Background-removed files are saved as `*_nobg.png` alongside the originals.

The dashboard has two sections: **Recommended** (opaque photos without existing `_nobg`) at the top, and a collapsible **Other Images** section below for anything already processed or transparent, in case you want to re-process them.

## Director's Framework

The LLM prompt that drives Phase 1 lives at `directors_framework.md`. It teaches the LLM to:

- Generate targeted Google Search queries per scene (one entity per query)
- Enforce identity queries for every named brand, person, or product
- Generate "vs" comparison queries for comparison scenes
- Suggest Remotion overlay opportunities for data viz / dynamic text scenes

All queries use `source: "Google_Search"`. The framework outputs structured JSON that maps directly to the `Scene` and `QuerySlot` dataclasses.

## Project structure

```
AssetFlow/
├── __init__.py                 # Package exports, v0.2.0
├── __main__.py                 # CLI entrypoint
├── config.py                   # Config from .env + defaults
├── types.py                    # All dataclasses and enums
├── orchestrator.py             # Main pipeline runner (3 phases + HITL)
├── phase1_script_parser.py     # Script → Director's Framework → scenes
├── phase2_asset_fetcher.py     # Google Search + download + quality gates + dedup
├── phase3_processor.py         # Vision LLM scoring + bg removal functions
├── phase5_hitl_dashboard.py    # HITL approval + bg removal review dashboards
├── dedup.py                    # Perceptual hashing (dHash) deduplication
├── cache.py                    # Pipeline cache (resume support)
├── llm_client.py               # Azure OpenAI / Gemini LLM wrapper
├── regen_server.py             # Local HTTP server for dashboards
├── run_manifest.py             # Per-run audit trail / manifest
├── directors_framework.md      # Director's Framework LLM prompt
├── prompts/                    # LLM prompt templates
│   ├── directors_framework.md
│   ├── query_generation.md
│   ├── scene_breakdown.md
│   └── vision_evaluation.md
├── tests/
│   ├── test_config.py
│   ├── test_types.py
│   └── test_phase3_alpha.py
├── .staging/                   # Downloaded images (intermediate)
├── output/                     # Final approved assets
└── hitl_queue/                 # HITL dashboard files + selections
```

## Configuration

All tunables in `config.py`:

| Setting | Default | What |
|---------|---------|------|
| `candidates_per_source` | 5 | Images to fetch per query |
| `quality_threshold` | 6.0 | Min Vision LLM score (1–10) to auto-approve |
| `max_concurrent_fetches` | 10 | Parallel download limit |
| `fetch_timeout` | 30 | Seconds per HTTP request |
| `vision_llm_provider` | `"azure"` | `"azure"` or `"gemini"` |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SERPER_API_KEY` | Yes | Google Search via Serper.dev |
| `AZURE_OPENAI_KEY` | If using Azure | Vision LLM scoring |
| `AZURE_OPENAI_ENDPOINT` | If using Azure | Azure endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | No | Defaults to `gpt-4o` |
| `AZURE_OPENAI_API_VERSION` | No | Defaults to `2024-02-01` |
| `GEMINI_API_KEY` | If using Gemini | Alternative Vision LLM |
