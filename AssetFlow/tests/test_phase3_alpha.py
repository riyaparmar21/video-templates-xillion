"""Tests for Phase 3 alpha channel detection (P-010 regression test)."""

import struct
import tempfile
from pathlib import Path

from AssetFlow.phase3_processor import _png_has_alpha, has_alpha_channel


def _make_minimal_png(color_type: int) -> bytes:
    """Create a minimal valid PNG with the given color_type in the IHDR chunk."""
    # PNG signature
    sig = b"\x89PNG\r\n\x1a\n"

    # IHDR: width=1, height=1, bit_depth=8, color_type, compression=0, filter=0, interlace=0
    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, color_type, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0)  # placeholder CRC (not validated by our code)
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc

    # Minimal IDAT chunk
    import zlib
    raw_row = b"\x00\x00"  # filter=None, one pixel
    compressed = zlib.compress(raw_row)
    idat_chunk = struct.pack(">I", len(compressed)) + b"IDAT" + compressed + struct.pack(">I", 0)

    # IEND
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", 0)

    return sig + ihdr_chunk + idat_chunk + iend_chunk


class TestPngAlphaDetection:
    def test_rgba_detected(self):
        """Color type 6 (RGBA) should be detected as having alpha."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(_make_minimal_png(color_type=6))
            f.flush()
            assert _png_has_alpha(Path(f.name)) is True

    def test_rgb_no_alpha(self):
        """Color type 2 (RGB) should NOT be detected as having alpha."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(_make_minimal_png(color_type=2))
            f.flush()
            assert _png_has_alpha(Path(f.name)) is False

    def test_greyscale_alpha_detected(self):
        """Color type 4 (greyscale+alpha) should be detected as having alpha."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(_make_minimal_png(color_type=4))
            f.flush()
            assert _png_has_alpha(Path(f.name)) is True

    def test_svg_always_alpha(self):
        """SVG files should always be detected as having alpha."""
        assert has_alpha_channel(Path("test.svg")) is True

    def test_nonexistent_file(self):
        """Non-existent file should return False gracefully."""
        assert _png_has_alpha(Path("/nonexistent/file.png")) is False
