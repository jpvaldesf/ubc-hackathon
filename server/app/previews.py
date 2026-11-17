"""Small display copies of uploaded photos, so the app doesn't download 2–4 MB phone originals.

Originals stay untouched: they are what gets hashed onchain and what the AI analyzes.
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image, ImageOps

log = logging.getLogger("dk")

PREVIEW_MAX_SIDE = 1280
PREVIEW_QUALITY = 80


def make_preview(data: bytes, dest: Path) -> bool:
    """Write a JPEG at most PREVIEW_MAX_SIDE px on its long side. Returns False (no preview) on failure."""
    try:
        with Image.open(io.BytesIO(data)) as im:
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
