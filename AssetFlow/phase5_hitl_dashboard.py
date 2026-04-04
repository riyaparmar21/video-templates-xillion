"""
HITL Approval Queue & Dashboard

Compiles scenes that failed the quality gate into a review interface.
Supports:
- Displaying failed assets with scores and feedback
- Generating an HTML review dashboard
- Processing user selections (upload or skip)
- Finalizing the approved asset pool
"""

import json
import logging
import shutil
from datetime import datetime
from html import escape as html_escape
from pathlib import Path
from typing import Optional
from urllib.parse import quote as url_quote

from AssetFlow.config import Config, TEMPLATES_DIR
from AssetFlow.types import (
    ApprovedAsset,
    AssetSource,
    AssetType,
    HITLItem,
    PipelineResult,
    ScoredAsset,
)

logger = logging.getLogger("AssetFlow.phase5")


class HITLDashboard:
    """
    Manages the Human-in-the-Loop approval queue.
    Generates an HTML dashboard for reviewing flagged scenes.
    """

    def __init__(self, config: Config):
        self.config = config
        self.queue: list[HITLItem] = []
        self.queue_file = config.hitl_dir / "queue.json"

    def add_to_queue(
        self,
        scene_id: int,
        scene_title: str,
        scene_description: str,
        failed_assets: list[ScoredAsset],
    ) -> HITLItem:
        """Add a scene to the HITL review queue."""
        item = HITLItem(
            scene_id=scene_id,
            scene_title=scene_title,
            scene_description=scene_description,
            failed_assets=failed_assets,
        )
        self.queue.append(item)
        logger.info(f"Added scene {scene_id} to HITL queue ({len(failed_assets)} failed assets)")
        return item

    def save_queue(self):
        """Persist the HITL queue to disk as JSON."""
        data = []
        for item in self.queue:
            entry = {
                "scene_id": item.scene_id,
                "scene_title": item.scene_title,
                "scene_description": item.scene_description,
                "failed_asset_scores": [
                    {
                        "filename": s.asset.local_path.name if s.asset.local_path else "unknown",
                        "overall_score": s.overall_score,
                        "feedback": s.vision_feedback,
                    }
                    for s in item.failed_assets
                ],
                "resolved": item.resolved,
                "selected_variant": item.selected_variant,
            }
            data.append(entry)

        self.queue_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
        logger.info(f"Saved HITL queue: {len(data)} items → {self.queue_file}")

    def generate_dashboard(self, regen_port: int = 0) -> Path:
        """
        Generate an HTML review dashboard for the HITL queue.

        Args:
            regen_port: Port of the local server for saving selections. 0 = fallback to download.

        Returns:
            Path to the generated HTML file.
        """
        dashboard_path = self.config.hitl_dir / "dashboard.html"

        # Build scene cards
        scene_cards_html = ""
        for item in self.queue:
            # Failed assets preview — show the fetched images that didn't pass the quality gate
            failed_assets_html = ""
            for s in item.failed_assets:
                fname = s.asset.local_path.name if s.asset.local_path else "unknown"
                local_path = s.asset.local_path if s.asset.local_path else None
                preview_html = '<div class="no-preview">Preview unavailable</div>'
                if local_path and local_path.exists():
                    img_src = f"file://{local_path.resolve()}"
                    preview_html = f'<img src="{img_src}" alt="{fname}">'

                failed_assets_html += f"""
                <div class="variant-card" data-scene="{item.scene_id}" data-variant="asset_{fname}">
                    <div class="variant-header">{fname}</div>
                    {preview_html}
                    <p class="variant-desc">Score: {s.overall_score:.1f}/10 — {s.vision_feedback[:100]}</p>
                    <button class="select-btn" onclick="selectVariant({item.scene_id}, 'asset_{fname}')">
                        Use This Asset Anyway
                    </button>
                </div>
                """

            scene_cards_html += f"""
            <div class="scene-card" id="scene-{item.scene_id}">
                <div class="scene-header">
                    <h2>Scene {item.scene_id}: {item.scene_title}</h2>
                    <span class="badge pending" id="badge-{item.scene_id}">Pending Review</span>
                </div>
                <p class="scene-desc">{item.scene_description}</p>

                <div class="variants-grid" id="variants-grid-{item.scene_id}">
                    {failed_assets_html}
                    <div class="variant-card upload-card" data-scene="{item.scene_id}">
                        <div class="variant-header">Upload Custom</div>
                        <div class="upload-zone" onclick="document.getElementById('upload-{item.scene_id}').click()">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p>Upload your own asset</p>
                        </div>
                        <input type="file" id="upload-{item.scene_id}" accept="image/*,video/*"
                               onchange="handleUpload({item.scene_id}, this)" style="display:none">
                    </div>
                    <div class="variant-card skip-card" data-scene="{item.scene_id}" data-variant="skip">
                        <div class="variant-header">Skip Scene</div>
                        <div class="skip-zone">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 5a2 2 0 0 1 2-2"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                            <p>Don't need an asset for this scene</p>
                        </div>
                        <button class="skip-btn" onclick="skipScene({item.scene_id})">
                            Skip This Scene
                        </button>
                    </div>
                </div>
            </div>
            """

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AssetFlow — Review Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f13;
            color: #e0e0e6;
            padding: 2rem;
        }}
        .header {{
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #2a2a35;
        }}
        .header h1 {{
            font-size: 1.8rem;
            color: #fff;
            margin-bottom: 0.5rem;
        }}
        .header p {{ color: #888; font-size: 0.95rem; }}
        .stats {{
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            margin: 1rem 0;
        }}
        .stat {{
            background: #1a1a24;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-align: center;
        }}
        .stat .num {{ font-size: 1.5rem; font-weight: 700; color: #7c6aef; }}
        .stat .label {{ font-size: 0.8rem; color: #888; }}
        .scene-card {{
            background: #1a1a24;
            border: 1px solid #2a2a35;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }}
        .scene-card.resolved {{ border-color: #2dd4a0; }}
        .scene-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }}
        .scene-header h2 {{ font-size: 1.2rem; color: #fff; }}
        .badge {{
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
        }}
        .badge.pending {{ background: #3a2f00; color: #fbbf24; }}
        .badge.approved {{ background: #0a3022; color: #2dd4a0; }}
        .scene-desc {{ color: #aaa; margin-bottom: 1rem; font-size: 0.9rem; }}
        .variants-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 1rem;
        }}
        .variant-card {{
            background: #12121a;
            border: 2px solid #2a2a35;
            border-radius: 10px;
            padding: 1rem;
            text-align: center;
            transition: border-color 0.2s;
            cursor: pointer;
        }}
        .variant-card:hover {{ border-color: #7c6aef; }}
        .variant-card.selected {{ border-color: #2dd4a0; background: #0f1f1a; }}
        .variant-header {{
            font-weight: 600;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
            color: #ccc;
        }}
        .variant-card img {{
            max-width: 100%;
            height: 150px;
            object-fit: contain;
            border-radius: 6px;
            background: #222;
            margin-bottom: 0.5rem;
            cursor: zoom-in;
        }}
        .no-preview {{
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #222;
            border-radius: 6px;
            color: #555;
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
        }}
        .variant-desc {{ font-size: 0.8rem; color: #888; margin-bottom: 0.75rem; }}
        .select-btn {{
            background: #7c6aef;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: background 0.2s;
        }}
        .select-btn:hover {{ background: #6852e0; }}
        .upload-zone {{
            height: 150px;
            border: 2px dashed #2a2a35;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #555;
            cursor: pointer;
            transition: border-color 0.2s;
            margin-bottom: 0.5rem;
        }}
        .upload-zone:hover {{ border-color: #7c6aef; color: #7c6aef; }}
        .upload-zone p {{ margin-top: 0.5rem; font-size: 0.8rem; }}
        .skip-zone {{
            height: 150px;
            border: 2px dashed #2a2a35;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #555;
            margin-bottom: 0.5rem;
        }}
        .skip-zone p {{ margin-top: 0.5rem; font-size: 0.8rem; }}
        .skip-btn {{
            background: #333;
            color: #aaa;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: background 0.2s;
        }}
        .skip-btn:hover {{ background: #444; color: #fff; }}
        .variant-card.selected.skip-card {{ border-color: #fbbf24; background: #1f1a0f; }}
        .finalize-bar {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a1a24;
            border-top: 1px solid #2a2a35;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .finalize-btn {{
            background: #2dd4a0;
            color: #000;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
        }}
        .finalize-btn:disabled {{ background: #333; color: #666; cursor: not-allowed; }}
        .finalize-btn:not(:disabled):hover {{ background: #25b88a; }}

        /* ── Lightbox Modal ── */
        .lightbox-overlay {{
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.88);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        }}
        .lightbox-overlay.active {{ display: flex; }}
        .lightbox-content {{
            max-width: 90vw;
            max-height: 85vh;
            background: #1a1a24;
            border-radius: 12px;
            padding: 1.5rem;
            position: relative;
            overflow: auto;
            cursor: default;
        }}
        .lightbox-content img {{
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
            display: block;
            margin: 0 auto;
            border-radius: 6px;
        }}
        .lightbox-close {{
            position: absolute;
            top: 0.5rem;
            right: 0.75rem;
            background: none;
            border: none;
            color: #888;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 1001;
            line-height: 1;
        }}
        .lightbox-close:hover {{ color: #fff; }}
        .lightbox-label {{
            text-align: center;
            color: #aaa;
            font-size: 0.85rem;
            margin-top: 0.75rem;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AssetFlow Review Dashboard</h1>
        <p>Review failed scenes. Upload a replacement or skip.</p>
        <div class="stats">
            <div class="stat">
                <div class="num" id="total-count">{len(self.queue)}</div>
                <div class="label">Scenes to Review</div>
            </div>
            <div class="stat">
                <div class="num" id="resolved-count">0</div>
                <div class="label">Resolved</div>
            </div>
        </div>
    </div>

    {scene_cards_html}

    <div class="finalize-bar">
        <span id="finalize-status">0 of {len(self.queue)} scenes resolved</span>
        <button class="finalize-btn" id="finalize-btn" disabled onclick="finalize()">
            Finalize Asset Pool
        </button>
    </div>

    <div style="height: 80px;"></div>

    <!-- Lightbox Modal -->
    <div class="lightbox-overlay" id="lightbox" onclick="closeLightbox(event)">
        <div class="lightbox-content" onclick="event.stopPropagation()">
            <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
            <div id="lightbox-body"></div>
            <div class="lightbox-label" id="lightbox-label"></div>
        </div>
    </div>

    <script>
        const selections = {{}};
        const totalScenes = {len(self.queue)};
        const REGEN_PORT = {regen_port};

        /* ── Lightbox ── */
        function openLightbox(el, label) {{
            const overlay = document.getElementById('lightbox');
            const body = document.getElementById('lightbox-body');
            const lbl = document.getElementById('lightbox-label');
            if (el.tagName === 'IMG') {{
                body.innerHTML = `<img src="${{el.src}}" alt="${{el.alt || ''}}">`;
            }}
            lbl.textContent = label || '';
            overlay.classList.add('active');
        }}

        function closeLightbox(e) {{
            if (e && e.target !== document.getElementById('lightbox')) return;
            document.getElementById('lightbox').classList.remove('active');
        }}

        document.addEventListener('keydown', (e) => {{
            if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('active');
        }});

        document.addEventListener('DOMContentLoaded', () => {{
            document.querySelectorAll('.variant-card img').forEach(el => {{
                el.addEventListener('click', (e) => {{
                    e.stopPropagation();
                    const card = el.closest('.variant-card');
                    const header = card ? card.querySelector('.variant-header') : null;
                    const desc = card ? card.querySelector('.variant-desc') : null;
                    const label = (header ? header.textContent : '') + (desc ? ' — ' + desc.textContent : '');
                    openLightbox(el, label.trim());
                }});
            }});
        }});

        function selectVariant(sceneId, variantId) {{
            selections[sceneId] = {{ type: 'variant', variant: variantId }};
            document.querySelectorAll(`[data-scene="${{sceneId}}"]`).forEach(card => {{
                card.classList.remove('selected');
            }});
            const selected = document.querySelector(`[data-scene="${{sceneId}}"][data-variant="${{variantId}}"]`);
            if (selected) selected.classList.add('selected');
            const badge = document.getElementById(`badge-${{sceneId}}`);
            badge.className = 'badge approved';
            badge.textContent = `Selected`;
            document.getElementById(`scene-${{sceneId}}`).classList.add('resolved');
            updateStatus();
        }}

        function handleUpload(sceneId, input) {{
            if (input.files.length > 0) {{
                selections[sceneId] = {{ type: 'upload', file: input.files[0].name }};
                const badge = document.getElementById(`badge-${{sceneId}}`);
                badge.className = 'badge approved';
                badge.textContent = 'Custom Upload';
                document.getElementById(`scene-${{sceneId}}`).classList.add('resolved');
                updateStatus();
            }}
        }}

        function skipScene(sceneId) {{
            selections[sceneId] = {{ type: 'skip' }};
            document.querySelectorAll(`[data-scene="${{sceneId}}"]`).forEach(card => {{
                card.classList.remove('selected');
            }});
            const skipCard = document.querySelector(`[data-scene="${{sceneId}}"][data-variant="skip"]`);
            if (skipCard) skipCard.classList.add('selected');
            const badge = document.getElementById(`badge-${{sceneId}}`);
            badge.className = 'badge approved';
            badge.textContent = 'Skipped';
            badge.style.background = '#3a2f00';
            badge.style.color = '#fbbf24';
            document.getElementById(`scene-${{sceneId}}`).classList.add('resolved');
            updateStatus();
        }}

        function updateStatus() {{
            const resolved = Object.keys(selections).length;
            document.getElementById('resolved-count').textContent = resolved;
            document.getElementById('finalize-status').textContent =
                `${{resolved}} of ${{totalScenes}} scenes resolved`;
            document.getElementById('finalize-btn').disabled = resolved < totalScenes;
        }}

        async function finalize() {{
            if (Object.keys(selections).length === 0) {{
                alert('No selections made yet.');
                return;
            }}

            if (REGEN_PORT > 0) {{
                try {{
                    const resp = await fetch(`http://127.0.0.1:${{REGEN_PORT}}/save-selections`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify(selections, null, 2),
                    }});
                    const data = await resp.json();
                    if (resp.ok) {{
                        alert(`Saved! ${{data.scenes_resolved}} scene(s) resolved.\\n\\nNow run:\\n  python -m AssetFlow resolve`);
                        return;
                    }}
                }} catch (e) {{
                    console.warn('Server unavailable, falling back to download:', e);
                }}
            }}

            const blob = new Blob([JSON.stringify(selections, null, 2)], {{ type: 'application/json' }});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'selections.json';
            a.click();
            alert('Selections downloaded.\\nMove to hitl_queue/ folder, then run:\\n  python -m AssetFlow resolve');
        }}
    </script>
</body>
</html>"""

        dashboard_path.write_text(html, encoding="utf-8")
        logger.info(f"Generated HITL dashboard: {dashboard_path}")
        return dashboard_path

    def apply_selections(self, selections_path: Path) -> list[HITLItem]:
        """
        Apply user selections from the HITL dashboard JSON.

        Returns:
            List of resolved HITLItems.
        """
        selections = json.loads(selections_path.read_text(encoding="utf-8"))

        for item in self.queue:
            key = str(item.scene_id)
            if key in selections:
                sel = selections[key]
                if sel.get("type") == "variant":
                    item.selected_variant = sel["variant"]
                    item.resolved = True
                elif sel.get("type") == "upload":
                    item.selected_variant = "upload"
                    item.resolved = True
                elif sel.get("type") == "skip":
                    item.selected_variant = "skip"
                    item.resolved = True

        resolved = [item for item in self.queue if item.resolved]
        logger.info(f"Applied selections: {len(resolved)}/{len(self.queue)} resolved")
        return resolved

    def generate_rembg_dashboard(
        self,
        candidates: list[Path],
        other_images: list[Path] | None = None,
        regen_port: int = 0,
    ) -> Path:
        """
        Generate an HTML dashboard for reviewing & selecting background removal candidates.

        Args:
            candidates: List of image file paths recommended for bg removal.
            other_images: List of other output images (already processed, alpha, non-photo) shown
                          in a collapsible section in case the user still wants to process them.
            regen_port: Port of the local server for saving rembg selections. 0 = fallback to download.

        Returns:
            Path to the generated HTML file.
        """
        dashboard_path = self.config.hitl_dir / "rembg_dashboard.html"
        other_images = other_images or []

        # Use HTTP URLs so the browser can actually load the images
        base_url = f"http://127.0.0.1:{regen_port}/images" if regen_port else "file://"

        def _build_card(img_path: Path, idx: int, checked: bool = True) -> str:
            fname = img_path.name
            fname_encoded = url_quote(fname, safe="")          # URL-safe for src
            fname_html = html_escape(fname, quote=True)        # safe for HTML attrs
            fname_js = fname.replace("\\", "\\\\").replace("'", "\\'")  # safe for JS strings
            img_src = f"{base_url}/{fname_encoded}" if regen_port else f"file://{url_quote(str(img_path.resolve()), safe='/:')}"
            size_kb = img_path.stat().st_size / 1024
            parts = fname.split("_")
            scene_label = parts[0] + "_" + parts[1] if len(parts) >= 2 else ""
            checked_attr = "checked" if checked else ""
            return f"""
            <div class="img-card{'  deselected' if not checked else ''}" data-idx="{idx}" data-filename="{fname_html}">
                <div class="img-wrapper">
                    <img src="{img_src}" alt="{fname_html}" onclick="openLightbox(this, '{fname_js}')">
                </div>
                <div class="img-info">
                    <div class="img-name" title="{fname_html}">{fname_html}</div>
                    <div class="img-meta">{size_kb:.0f} KB{f' &middot; {scene_label}' if scene_label else ''}</div>
                </div>
                <label class="checkbox-wrap">
                    <input type="checkbox" {checked_attr} onchange="updateCount()">
                    <span class="checkmark"></span>
                    Remove Background
                </label>
            </div>
            """

        # Build candidate cards (checked by default)
        image_cards_html = ""
        for i, img_path in enumerate(candidates):
            image_cards_html += _build_card(img_path, i, checked=True)

        # Build "other images" cards (unchecked by default)
        other_cards_html = ""
        for i, img_path in enumerate(other_images):
            other_cards_html += _build_card(img_path, len(candidates) + i, checked=False)

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AssetFlow — Background Removal Review</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f13;
            color: #e0e0e6;
            padding: 2rem;
            padding-bottom: 100px;
        }}
        .header {{
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #2a2a35;
        }}
        .header h1 {{ font-size: 1.8rem; color: #fff; margin-bottom: 0.5rem; }}
        .header p {{ color: #888; font-size: 0.95rem; }}
        .stats {{
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            margin: 1rem 0;
        }}
        .stat {{
            background: #1a1a24;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-align: center;
        }}
        .stat .num {{ font-size: 1.5rem; font-weight: 700; color: #7c6aef; }}
        .stat .label {{ font-size: 0.8rem; color: #888; }}

        /* ── Controls ── */
        .controls {{
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 1.5rem;
        }}
        .ctrl-btn {{
            background: #1a1a24;
            border: 1px solid #2a2a35;
            color: #ccc;
            padding: 0.5rem 1.2rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s;
        }}
        .ctrl-btn:hover {{ border-color: #7c6aef; color: #fff; }}

        /* ── Image Grid ── */
        .image-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 1.25rem;
        }}
        .img-card {{
            background: #1a1a24;
            border: 2px solid #2a2a35;
            border-radius: 12px;
            padding: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }}
        .img-card:hover {{ border-color: #3a3a4a; }}
        .img-card.deselected {{ opacity: 0.45; }}
        .img-card.deselected .img-wrapper {{ filter: grayscale(0.6); }}
        .img-wrapper {{
            width: 100%;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #12121a;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 0.75rem;
        }}
        .img-wrapper img {{
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            cursor: zoom-in;
        }}
        .img-info {{ margin-bottom: 0.75rem; }}
        .img-name {{
            font-weight: 600;
            font-size: 0.85rem;
            color: #ddd;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .img-meta {{ font-size: 0.75rem; color: #666; margin-top: 0.2rem; }}

        /* ── Checkbox ── */
        .checkbox-wrap {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            font-size: 0.85rem;
            color: #aaa;
            user-select: none;
        }}
        .checkbox-wrap input {{ display: none; }}
        .checkmark {{
            width: 20px;
            height: 20px;
            border: 2px solid #444;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            flex-shrink: 0;
        }}
        .checkbox-wrap input:checked + .checkmark {{
            background: #7c6aef;
            border-color: #7c6aef;
        }}
        .checkbox-wrap input:checked + .checkmark::after {{
            content: '';
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
            margin-top: -2px;
        }}

        /* ── Section Headings ── */
        .section-heading {{
            font-size: 1.15rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #2a2a35;
        }}
        .section-heading .count {{
            color: #7c6aef;
            font-weight: 600;
        }}

        /* ── Collapsible / Accordion ── */
        .collapsible {{
            margin-top: 2.5rem;
        }}
        .collapsible-toggle {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            background: #1a1a24;
            border: 1px solid #2a2a35;
            border-radius: 10px;
            padding: 1rem 1.25rem;
            cursor: pointer;
            color: #ccc;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.2s;
            text-align: left;
        }}
        .collapsible-toggle:hover {{
            border-color: #3a3a4a;
            color: #fff;
        }}
        .collapsible-toggle .arrow {{
            display: inline-block;
            transition: transform 0.25s ease;
            font-size: 0.8rem;
            color: #666;
        }}
        .collapsible-toggle.open .arrow {{
            transform: rotate(90deg);
        }}
        .collapsible-toggle .toggle-meta {{
            font-size: 0.8rem;
            font-weight: 400;
            color: #666;
            margin-left: auto;
        }}
        .collapsible-body {{
            display: none;
            padding-top: 1.25rem;
        }}
        .collapsible-body.open {{
            display: block;
        }}
        .empty-msg {{
            color: #555;
            font-size: 0.9rem;
            padding: 1.5rem;
            text-align: center;
        }}

        /* ── Finalize Bar ── */
        .finalize-bar {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #1a1a24;
            border-top: 1px solid #2a2a35;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
        }}
        .finalize-btn {{
            background: #7c6aef;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }}
        .finalize-btn:hover {{ background: #6852e0; }}
        .finalize-btn:disabled {{ background: #333; color: #666; cursor: not-allowed; }}

        /* ── Lightbox ── */
        .lightbox-overlay {{
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        }}
        .lightbox-overlay.active {{ display: flex; }}
        .lightbox-content {{
            max-width: 90vw;
            max-height: 90vh;
            position: relative;
            cursor: default;
        }}
        .lightbox-content img {{
            max-width: 90vw;
            max-height: 85vh;
            object-fit: contain;
            border-radius: 8px;
        }}
        .lightbox-close {{
            position: absolute;
            top: -0.5rem;
            right: -0.5rem;
            background: #1a1a24;
            border: 1px solid #333;
            color: #888;
            font-size: 1.3rem;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
        }}
        .lightbox-close:hover {{ color: #fff; }}
        .lightbox-label {{
            text-align: center;
            color: #aaa;
            font-size: 0.85rem;
            margin-top: 0.75rem;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Background Removal Review</h1>
        <p>Select which images should have their backgrounds removed. Click to zoom.</p>
        <div class="stats">
            <div class="stat">
                <div class="num">{len(candidates)}</div>
                <div class="label">Total Candidates</div>
            </div>
            <div class="stat">
                <div class="num" id="selected-count">{len(candidates)}</div>
                <div class="label">Selected</div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button class="ctrl-btn" onclick="selectAllCandidates()">Select All Recommended</button>
        <button class="ctrl-btn" onclick="deselectAllCandidates()">Deselect All Recommended</button>
    </div>

    <h2 class="section-heading">Recommended for Background Removal <span class="count">({len(candidates)})</span></h2>
    <div class="image-grid" id="candidates-grid">
        {image_cards_html}
    </div>

    <div class="collapsible">
        <button class="collapsible-toggle" id="other-toggle" onclick="toggleOther()">
            <span class="arrow">&#9654;</span>
            Other Images
            <span class="toggle-meta">{len(other_images)} image{'s' if len(other_images) != 1 else ''} &middot; already transparent, processed, or non-standard format</span>
        </button>
        <div class="collapsible-body" id="other-body">
            {f'<div class="image-grid">{other_cards_html}</div>' if other_images else '<p class="empty-msg">No other images in output folder.</p>'}
        </div>
    </div>

    <div class="finalize-bar">
        <span id="finalize-status">{len(candidates)} image(s) selected for background removal</span>
        <button class="finalize-btn" id="apply-btn" onclick="applyRemoval()">
            Remove Backgrounds
        </button>
    </div>

    <!-- Lightbox -->
    <div class="lightbox-overlay" id="lightbox" onclick="closeLightbox(event)">
        <div class="lightbox-content" onclick="event.stopPropagation()">
            <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
            <img id="lightbox-img" src="" alt="">
            <div class="lightbox-label" id="lightbox-label"></div>
        </div>
    </div>

    <script>
        const REGEN_PORT = {regen_port};

        function getSelectedFiles() {{
            const selected = [];
            document.querySelectorAll('.img-card').forEach(card => {{
                const cb = card.querySelector('input[type=checkbox]');
                if (cb && cb.checked) {{
                    selected.push(card.dataset.filename);
                }}
            }});
            return selected;
        }}

        function updateCount() {{
            const selected = getSelectedFiles();
            document.getElementById('selected-count').textContent = selected.length;
            document.getElementById('finalize-status').textContent =
                selected.length + ' image(s) selected for background removal';
            document.getElementById('apply-btn').disabled = selected.length === 0;

            // Visual feedback on deselected cards
            document.querySelectorAll('.img-card').forEach(card => {{
                const cb = card.querySelector('input[type=checkbox]');
                card.classList.toggle('deselected', !cb.checked);
            }});
        }}

        function selectAllCandidates() {{
            document.querySelectorAll('#candidates-grid .img-card input[type=checkbox]').forEach(cb => cb.checked = true);
            updateCount();
        }}

        function deselectAllCandidates() {{
            document.querySelectorAll('#candidates-grid .img-card input[type=checkbox]').forEach(cb => cb.checked = false);
            updateCount();
        }}

        /* ── Collapsible toggle ── */
        function toggleOther() {{
            const toggle = document.getElementById('other-toggle');
            const body = document.getElementById('other-body');
            if (!toggle || !body) return;
            const isOpen = toggle.classList.toggle('open');
            body.classList.toggle('open', isOpen);
        }}

        async function applyRemoval() {{
            const selected = getSelectedFiles();
            if (selected.length === 0) {{
                alert('No images selected.');
                return;
            }}

            const payload = {{ images: selected }};

            if (REGEN_PORT > 0) {{
                try {{
                    document.getElementById('apply-btn').disabled = true;
                    document.getElementById('apply-btn').textContent = 'Processing...';
                    document.getElementById('finalize-status').textContent = 'Sending to AssetFlow server...';

                    const resp = await fetch(`http://127.0.0.1:${{REGEN_PORT}}/save-rembg-selections`, {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify(payload),
                    }});
                    const data = await resp.json();
                    if (resp.ok) {{
                        document.getElementById('finalize-status').textContent =
                            `Saved! ${{data.count}} image(s). Now run: python -m AssetFlow rembg-apply`;
                        document.getElementById('apply-btn').textContent = 'Saved ✓';
                        alert(`Selection saved! ${{data.count}} image(s).\\n\\nNow run:\\n  python -m AssetFlow rembg-apply`);
                        return;
                    }}
                }} catch (e) {{
                    console.warn('Server unavailable, falling back to download:', e);
                }}
            }}

            // Fallback: download the selections JSON
            const blob = new Blob([JSON.stringify(payload, null, 2)], {{ type: 'application/json' }});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'rembg_selections.json';
            a.click();

            document.getElementById('finalize-status').textContent =
                'Selections downloaded. Move to hitl_queue/ then run: python -m AssetFlow rembg-apply';
            alert('Selections downloaded.\\nMove rembg_selections.json to hitl_queue/ folder,\\nthen run:\\n  python -m AssetFlow rembg-apply');
        }}

        /* ── Lightbox ── */
        function openLightbox(el, label) {{
            document.getElementById('lightbox-img').src = el.src;
            document.getElementById('lightbox-label').textContent = label || '';
            document.getElementById('lightbox').classList.add('active');
        }}
        function closeLightbox(e) {{
            if (e && e.target !== document.getElementById('lightbox')) return;
            document.getElementById('lightbox').classList.remove('active');
        }}
        document.addEventListener('keydown', (e) => {{
            if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('active');
        }});
    </script>
</body>
</html>"""

        dashboard_path.write_text(html, encoding="utf-8")
        logger.info(f"Generated rembg review dashboard: {dashboard_path}")
        return dashboard_path

    def get_approved_asset_for_item(self, item: HITLItem) -> Optional[ApprovedAsset]:
        """Convert a resolved HITL item into an ApprovedAsset."""
        if not item.resolved:
            return None

        if item.selected_variant == "skip":
            logger.info(f"Scene {item.scene_id}: skipped by user")
            return None

        if item.selected_variant == "upload" and item.user_upload_path:
            return ApprovedAsset(
                scene_id=item.scene_id,
                scene_title=item.scene_title,
                final_path=item.user_upload_path,
                source=AssetSource.USER_UPLOAD,
                asset_type=AssetType.PHOTO,
                score=10.0,
                attribution="User upload",
            )

        # Check if a failed asset was selected (variant starts with "asset_")
        if item.selected_variant and item.selected_variant.startswith("asset_"):
            fname = item.selected_variant[len("asset_"):]
            for s in item.failed_assets:
                if s.asset.local_path and s.asset.local_path.name == fname:
                    return ApprovedAsset(
                        scene_id=item.scene_id,
                        scene_title=item.scene_title,
                        final_path=s.asset.local_path,
                        source=s.asset.source,
                        asset_type=s.asset.asset_type,
                        score=s.overall_score,
                        attribution=f"User-approved (score {s.overall_score:.1f})",
                    )

        return None
