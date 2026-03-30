"""
Phase 5: HITL Approval Queue & Dashboard

Compiles scenes that failed the quality gate into a review interface.
Supports:
- Rendering SVG variants as previews
- Generating an HTML review dashboard
- Processing user selections
- Finalizing the approved asset pool
"""

import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from AssetFlow.config import Config, TEMPLATES_DIR
from AssetFlow.types import (
    ApprovedAsset,
    AssetSource,
    AssetType,
    HITLItem,
    PipelineResult,
    ScoredAsset,
    SVGVariant,
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
        svg_variants: list[SVGVariant],
    ) -> HITLItem:
        """Add a scene to the HITL review queue."""
        item = HITLItem(
            scene_id=scene_id,
            scene_title=scene_title,
            scene_description=scene_description,
            failed_assets=failed_assets,
            svg_variants=svg_variants,
        )
        self.queue.append(item)
        logger.info(f"Added scene {scene_id} to HITL queue ({len(svg_variants)} variants)")
        return item

    def save_queue(self):
        """Persist the HITL queue to disk as JSON."""
        data = []
        for item in self.queue:
            entry = {
                "scene_id": item.scene_id,
                "scene_title": item.scene_title,
                "scene_description": item.scene_description,
                "svg_variants": [
                    {
                        "variant_id": v.variant_id,
                        "description": v.description,
                        "svg_path": str(v.rendered_path or ""),
                        "svg_code_path": str(
                            self.config.staging_dir
                            / "svg_fallback"
                            / f"scene_{item.scene_id:03d}"
                            / f"variant_{v.variant_id}.svg"
                        ),
                    }
                    for v in item.svg_variants
                ],
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

    def generate_dashboard(self) -> Path:
        """
        Generate an HTML review dashboard for the HITL queue.
        Returns path to the generated HTML file.
        """
        dashboard_path = self.config.hitl_dir / "dashboard.html"

        # Build scene cards
        scene_cards_html = ""
        for item in self.queue:
            variants_html = ""
            for v in item.svg_variants:
                # Strategy: PNG render (pixel-perfect) > inline SVG fallback > "no preview"
                preview_html = '<div class="no-preview">Preview unavailable</div>'

                # 1. PNG render from Playwright (primary — production-ready preview)
                if v.rendered_path and v.rendered_path.exists():
                    # Use file:// absolute path so the browser can load it
                    img_src = f"file://{v.rendered_path.resolve()}"
                    preview_html = f'<img src="{img_src}" alt="Variant {v.variant_id}">'
                # 2. Fallback: inline SVG from memory
                elif v.svg_code and "<svg" in v.svg_code.lower():
                    safe_svg = v.svg_code.replace("<script", "<!-- blocked script").replace("</script", "<!-- /blocked script")
                    preview_html = f'<div class="svg-preview">{safe_svg}</div>'
                # 3. Fallback: read SVG file from disk
                else:
                    svg_file = (
                        self.config.staging_dir
                        / "svg_fallback"
                        / f"scene_{item.scene_id:03d}"
                        / f"variant_{v.variant_id}.svg"
                    )
                    if svg_file.exists():
                        try:
                            raw_svg = svg_file.read_text(encoding="utf-8")
                            safe_svg = raw_svg.replace("<script", "<!-- blocked script").replace("</script", "<!-- /blocked script")
                            preview_html = f'<div class="svg-preview">{safe_svg}</div>'
                        except Exception:
                            pass

                variants_html += f"""
                <div class="variant-card" data-scene="{item.scene_id}" data-variant="{v.variant_id}">
                    <div class="variant-header">Option {v.variant_id}</div>
                    {preview_html}
                    <p class="variant-desc">{v.description}</p>
                    <button class="select-btn" onclick="selectVariant({item.scene_id}, '{v.variant_id}')">
                        Select Option {v.variant_id}
                    </button>
                </div>
                """

            # Failed assets summary
            failed_summary = ""
            for s in item.failed_assets[:3]:
                fname = s.asset.local_path.name if s.asset.local_path else "unknown"
                failed_summary += f'<li>{fname}: {s.overall_score:.1f}/10 — {s.vision_feedback[:80]}</li>'

            scene_cards_html += f"""
            <div class="scene-card" id="scene-{item.scene_id}">
                <div class="scene-header">
                    <h2>Scene {item.scene_id}: {item.scene_title}</h2>
                    <span class="badge pending" id="badge-{item.scene_id}">Pending Review</span>
                </div>
                <p class="scene-desc">{item.scene_description}</p>

                {'<details><summary>Failed fetched assets</summary><ul>' + failed_summary + '</ul></details>' if failed_summary else ''}

                <div class="variants-grid">
                    {variants_html}
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
                        <input type="file" id="upload-{item.scene_id}" accept="image/*,video/*,.svg"
                               onchange="handleUpload({item.scene_id}, this)" style="display:none">
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
        details {{ margin-bottom: 1rem; }}
        details summary {{ cursor: pointer; color: #7c6aef; font-size: 0.85rem; }}
        details ul {{ margin: 0.5rem 0 0 1.5rem; font-size: 0.8rem; color: #888; }}
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
        .svg-preview {{
            width: 100%;
            height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #222;
            border-radius: 6px;
            margin-bottom: 0.5rem;
            overflow: hidden;
            padding: 8px;
        }}
        .svg-preview svg {{
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
        }}
        .variant-card img {{
            max-width: 100%;
            height: 150px;
            object-fit: contain;
            border-radius: 6px;
            background: #222;
            margin-bottom: 0.5rem;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>AssetFlow Review Dashboard</h1>
        <p>Select an asset option for each flagged scene, or upload your own.</p>
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

    <div style="height: 80px;"></div> <!-- spacer for fixed bar -->

    <script>
        const selections = {{}};
        const totalScenes = {len(self.queue)};

        function selectVariant(sceneId, variantId) {{
            selections[sceneId] = {{ type: 'variant', variant: variantId }};
            // Update UI
            document.querySelectorAll(`[data-scene="${{sceneId}}"]`).forEach(card => {{
                card.classList.remove('selected');
            }});
            const selected = document.querySelector(`[data-scene="${{sceneId}}"][data-variant="${{variantId}}"]`);
            if (selected) selected.classList.add('selected');
            // Update badge
            const badge = document.getElementById(`badge-${{sceneId}}`);
            badge.className = 'badge approved';
            badge.textContent = `Option ${{variantId}} Selected`;
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

        function updateStatus() {{
            const resolved = Object.keys(selections).length;
            document.getElementById('resolved-count').textContent = resolved;
            document.getElementById('finalize-status').textContent =
                `${{resolved}} of ${{totalScenes}} scenes resolved`;
            document.getElementById('finalize-btn').disabled = resolved < totalScenes;
        }}

        function finalize() {{
            // Save selections as JSON
            const blob = new Blob([JSON.stringify(selections, null, 2)], {{ type: 'application/json' }});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'hitl_selections.json';
            a.click();
            alert('Selections saved! The pipeline will continue with your choices.');
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

        Args:
            selections_path: Path to hitl_selections.json exported from dashboard.

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
                    # Upload handling would need the actual file path
                    item.selected_variant = "upload"
                    item.resolved = True

        resolved = [item for item in self.queue if item.resolved]
        logger.info(f"Applied selections: {len(resolved)}/{len(self.queue)} resolved")
        return resolved

    def get_approved_asset_for_item(self, item: HITLItem) -> Optional[ApprovedAsset]:
        """Convert a resolved HITL item into an ApprovedAsset."""
        if not item.resolved:
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

        # Find the selected SVG variant
        for v in item.svg_variants:
            if v.variant_id == item.selected_variant:
                # Prefer the PNG render, fall back to SVG
                final_path = v.rendered_path or Path(
                    self.config.staging_dir
                    / "svg_fallback"
                    / f"scene_{item.scene_id:03d}"
                    / f"variant_{v.variant_id}.svg"
                )
                return ApprovedAsset(
                    scene_id=item.scene_id,
                    scene_title=item.scene_title,
                    final_path=final_path,
                    source=AssetSource.SVG_GENERATED,
                    asset_type=AssetType.SVG,
                    score=8.0,  # User-approved
                    attribution=f"Generated SVG (variant {v.variant_id})",
                )

        return None
