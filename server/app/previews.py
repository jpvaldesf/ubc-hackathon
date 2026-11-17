"""Small display copies of uploaded photos, so the app doesn't download 2–4 MB phone originals.

Originals stay untouched: they are what gets hashed onchain and what the AI analyzes.
"""
from __future__ import annotations

import io
import logging
import threading
from pathlib import Path

from PIL import Image, ImageOps

log = logging.getLogger("dk")

PREVIEW_MAX_SIDE = 1280
PREVIEW_QUALITY = 80
# A 48 MP phone photo is ~48M px. Anything bigger is rejected before decoding (a 164 KB PNG can claim
# 13000x13000 px and take 1-2 GB of RAM to decode).
MAX_PIXELS = 50_000_000
MAX_SIDE = 12_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS  # Pillow-wide: bigger images error instead of only warning
_decode_slots = threading.Semaphore(2)  # at most 2 decodes at once, so parallel uploads can't stack up RAM


def too_big(data: bytes) -> str | None:
    """Reads only the header (Image.open is lazy). Returns a reason if the pixel size is over the limits."""
    try:
        with Image.open(io.BytesIO(data)) as im:
            w, h = im.size
    except Image.DecompressionBombError:
        return f"photo has too many pixels; the max is 50 MP and {MAX_SIDE} px per side"
    except Exception:
        return None  # not decodable: the upload decides what to do; no preview is made
    if w * h > MAX_PIXELS or max(w, h) > MAX_SIDE:
        return f"photo is {w}x{h} px; the max is 50 MP and {MAX_SIDE} px per side"
    return None


def make_preview(data: bytes, dest: Path) -> bool:
    """Write a JPEG at most PREVIEW_MAX_SIDE px on its long side. Returns False (no preview) on failure."""
    if too_big(data):
        return False
    try:
        with _decode_slots, Image.open(io.BytesIO(data)) as im:
            im.draft("RGB", (PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE))  # fast JPEG downscale while decoding
            im = ImageOps.exif_transpose(im)  # phone photos: bake in rotation, since EXIF is dropped
            im = im.convert("RGB")
            im.thumbnail((PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE))
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=PREVIEW_QUALITY, optimize=True, progressive=True)
        dest.write_bytes(buf.getvalue())
        return True
    except Exception:
        log.warning("preview failed for %s; serving the original", dest.name, exc_info=True)
        return False
