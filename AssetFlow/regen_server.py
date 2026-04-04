"""
AssetFlow Regen Server

Lightweight local HTTP server that the HITL dashboard calls for
scene-level operations. Runs on localhost only.

Endpoints:
    POST /save-selections       — Save HITL selections from the dashboard
    POST /save-rembg-selections — Save background-removal selections
    GET  /health                — Health check
    GET  /images/<filename>     — Serve images from output directory
    GET  /hitl/<filename>       — Serve HTML dashboards from hitl_queue directory
"""

import json
import logging
import mimetypes
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

from AssetFlow.config import Config
from AssetFlow.types import Scene

logger = logging.getLogger("AssetFlow.regen_server")

# ── Module-level reference so the handler can access pipeline state ──
_server_state = {
    "config": None,
    "scenes": {},       # scene_id -> Scene object
    "port": 0,
}


class RegenRequestHandler(BaseHTTPRequestHandler):
    """Handles requests from the HITL dashboard."""

    def log_message(self, format, *args):
        logger.debug(format % args)

    def do_OPTIONS(self):
        """CORS preflight for fetch() calls from file:// origin."""
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == "/save-selections":
            return self._handle_save_selections()
        if self.path == "/save-rembg-selections":
            return self._handle_save_rembg_selections()
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        """Serve health check, images from output/, and dashboards from hitl_queue/."""
        if self.path == "/health":
            self._json_response(200, {"status": "ok"})
            return

        # Serve images from the output directory: /images/<filename>
        if self.path.startswith("/images/"):
            return self._serve_file(self.path[len("/images/"):], "output")

        # Serve dashboard HTML from hitl_queue: /hitl/<filename>
        if self.path.startswith("/hitl/"):
            return self._serve_file(self.path[len("/hitl/"):], "hitl")

        self.send_response(404)
        self.end_headers()

    def _serve_file(self, raw_name: str, source: str):
        """Serve a static file from output_dir or hitl_dir."""
        config: Config = _server_state["config"]
        filename = unquote(raw_name).strip("/")

        # Block path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            self.send_response(403)
            self.end_headers()
            return

        if source == "output":
            file_path = config.output_dir / filename
        else:
            file_path = config.hitl_dir / filename

        if not file_path.exists() or not file_path.is_file():
            self.send_response(404)
            self.end_headers()
            return

        content_type, _ = mimetypes.guess_type(str(file_path))
        content_type = content_type or "application/octet-stream"

        try:
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            logger.error(f"Error serving {file_path}: {e}")
            self.send_response(500)
            self.end_headers()

    def _handle_save_selections(self):
        """Save HITL selections JSON into hitl_queue/ directory."""
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            selections = json.loads(body)

            config: Config = _server_state["config"]
            save_path = config.hitl_dir / "selections.json"
            save_path.write_text(
                json.dumps(selections, indent=2), encoding="utf-8"
            )
            logger.info(f"Selections saved to {save_path} ({len(selections)} scenes)")
            self._json_response(200, {
                "status": "saved",
                "path": str(save_path),
                "scenes_resolved": len(selections),
            })
        except json.JSONDecodeError:
            self._json_response(400, {"error": "Invalid JSON"})
        except Exception as e:
            logger.error(f"Save selections error: {e}", exc_info=True)
            self._json_response(500, {"error": str(e)})

    def _handle_save_rembg_selections(self):
        """Save background removal selections JSON into hitl_queue/ directory."""
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            selections = json.loads(body)

            config: Config = _server_state["config"]
            save_path = config.hitl_dir / "rembg_selections.json"
            save_path.write_text(
                json.dumps(selections, indent=2), encoding="utf-8"
            )
            count = len(selections.get("images", []))
            logger.info(f"Rembg selections saved to {save_path} ({count} images)")
            self._json_response(200, {
                "status": "saved",
                "path": str(save_path),
                "count": count,
            })
        except json.JSONDecodeError:
            self._json_response(400, {"error": "Invalid JSON"})
        except Exception as e:
            logger.error(f"Save rembg selections error: {e}", exc_info=True)
            self._json_response(500, {"error": str(e)})

    # ── Helpers ──

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, code: int, data: dict):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))


def start_regen_server(
    config: Config,
    scenes: list[Scene],
    port: int = 0,
) -> tuple[HTTPServer, int]:
    """
    Start the server in a background daemon thread.

    Args:
        config: Pipeline config.
        scenes: List of scenes in the current run.
        port: Port to bind to. 0 = auto-assign a free port.

    Returns:
        (server, actual_port)
    """
    _server_state["config"] = config
    _server_state["scenes"] = {s.scene_id: s for s in scenes}

    server = HTTPServer(("127.0.0.1", port), RegenRequestHandler)
    actual_port = server.server_address[1]
    _server_state["port"] = actual_port

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    logger.info(f"Regen server listening on http://127.0.0.1:{actual_port}")
    return server, actual_port


def stop_regen_server(server: HTTPServer):
    """Shutdown the regen server gracefully."""
    try:
        server.shutdown()
        logger.info("Regen server stopped")
    except Exception:
        pass
