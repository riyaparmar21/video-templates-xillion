#!/usr/bin/env python3
"""
Local server for the GroundCaptions tuner.

Serves the tuner HTML, reads/writes the spec JSON, and triggers renders
with live progress tracking.

Usage:
  python3 scripts/ground-tuner-server.py
  → opens http://localhost:4455/tuner
"""

import json
import os
import re
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = ROOT / "src" / "ground-captions-spec.json"
PUBLIC_DIR = ROOT / "public"

app = Flask(__name__, static_folder=str(PUBLIC_DIR))
CORS(app)

# ── Render state (shared between threads) ──
render_state = {
    "active": False,
    "progress": 0,       # 0-100
    "frame": 0,
    "totalFrames": 0,
    "status": "idle",     # idle | rendering | done | error
    "output": "",
    "error": "",
}


def _read_render_output(proc, output_path):
    """Read Remotion CLI stdout in a background thread, parse progress."""
    global render_state
    render_state["active"] = True
    render_state["status"] = "rendering"
    render_state["progress"] = 0
    render_state["error"] = ""

    for raw_line in iter(proc.stdout.readline, b""):
        line = raw_line.decode("utf-8", errors="replace").strip()
        if not line:
            continue

        # Remotion outputs lines like:
        #   "Rendered frame 45/150"  or  " (30%)"  or  "stitching"
        # Also: "Rendering frames (X/Y)"
        m = re.search(r"(\d+)/(\d+)", line)
        if m:
            current = int(m.group(1))
            total = int(m.group(2))
            render_state["frame"] = current
            render_state["totalFrames"] = total
            if total > 0:
                render_state["progress"] = min(100, int(current / total * 100))

        # Percentage fallback
        mp = re.search(r"(\d+)%", line)
        if mp:
            render_state["progress"] = min(100, int(mp.group(1)))

        # Stitching phase
        if "stitch" in line.lower() or "encod" in line.lower():
            render_state["progress"] = max(render_state["progress"], 90)
            render_state["status"] = "rendering"

    proc.wait()
    if proc.returncode == 0:
        render_state["status"] = "done"
        render_state["progress"] = 100
        render_state["output"] = str(output_path)
    else:
        render_state["status"] = "error"
        render_state["error"] = f"Render failed (exit code {proc.returncode})"
    render_state["active"] = False


@app.route("/tuner")
def tuner():
    return send_from_directory(str(PUBLIC_DIR), "ground-tuner.html")


@app.route("/api/spec", methods=["GET"])
def get_spec():
    if SPEC_PATH.exists():
        with open(SPEC_PATH) as f:
            return jsonify(json.load(f))
    return jsonify({}), 404


@app.route("/api/spec", methods=["POST"])
def save_spec():
    data = request.get_json()
    with open(SPEC_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    return jsonify({"ok": True})


@app.route("/api/render", methods=["POST"])
def render_video():
    """Trigger Remotion render with progress tracking."""
    global render_state

    if render_state["active"]:
        return jsonify({"ok": False, "error": "Render already in progress"}), 409

    output = ROOT / "out" / "ground-captions.mp4"
    output.parent.mkdir(exist_ok=True)

    cmd = [
        "npx", "remotion", "render",
        "src/index.ts", "GroundCaptions",
        "--output", str(output),
    ]

    proc = subprocess.Popen(
        cmd, cwd=str(ROOT),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )

    # Read output in background thread
    t = threading.Thread(target=_read_render_output, args=(proc, output), daemon=True)
    t.start()

    return jsonify({"ok": True, "output": str(output)})


@app.route("/api/render/progress", methods=["GET"])
def render_progress():
    """Returns current render progress."""
    return jsonify(render_state)


# Serve static files (images, etc.) from public/
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(str(PUBLIC_DIR), path)


if __name__ == "__main__":
    port = 4455
    print(f"\n  GroundCaptions Tuner → http://localhost:{port}/tuner\n")
    webbrowser.open(f"http://localhost:{port}/tuner")
    app.run(port=port, debug=False)
