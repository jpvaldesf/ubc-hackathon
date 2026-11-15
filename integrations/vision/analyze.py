"""Deposit Keeper vision pipeline: compare move-in vs move-out photos and draft deductions.

Contract (docs/API.md, D-005):
    analyze(pairs, price_table, on_progress=None) -> findings dict (docs/PLAN.md schema, integer cents, D-003)

Every money rule is enforced here in code, not only in the prompt:
- the model never sees or returns money; cost_cents comes only from price_table[price_key]
- normal_wear always costs 0
- damage with a price_key not in the table is dropped and counted (dropped_unknown_price_key)
- confidence below the category's cutoff (MIN_CONFIDENCE: damage 0.7, normal_wear 0.5) is dropped
  and counted (dropped_low_confidence)
- no_change items are discarded, so "nothing changed" gives findings: []
Any failure the server should surface as 502 vision_error raises VisionError.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import math
import os
import uuid
from pathlib import Path
from typing import Callable

import anthropic
from dotenv import load_dotenv
from PIL import Image, ImageOps, UnidentifiedImageError

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
PRICE_TABLE_PATH = Path(__file__).with_name("price_table.json")

MODEL = "claude-sonnet-5-5"
# Per-category cutoffs. normal_wear is always $0, so a lower bar only adds visible $0 lines
# (e.g. nail holes at ~0.6); damage costs money and keeps the stricter 0.7.
MIN_CONFIDENCE = {"damage": 0.7, "normal_wear": 0.5}
MAX_TOKENS = 1024
TIMEOUT_S = 60
MAX_RETRIES = 2  # SDK-level retries for transport/5xx/429
MAX_PAIRS = 12  # spend cap: pairs per analyze() call
TOKEN_BUDGET = 200_000  # spend cap: input+output tokens per analyze() call (~8.5k per pair in the spike)
EST_TOKENS_PER_CALL = 10_000  # reserved before each call so the budget is never overrun
MAX_IMAGE_BYTES = 25 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000  # ~7300x5500; phone photos are 12-48 MP. Stops decompression bombs.
MAX_FINDINGS_PER_PAIR = 3  # with one damage finding per price_key, limits injected "8 stains" padding
ALLOWED_EXT = {".jpg", ".jpeg", ".png"}
MAX_EDGE = 2000
CATEGORIES = ("damage", "normal_wear", "no_change")
PAIR_KEYS = ("shot_id", "room", "label", "before_path", "after_path")


class VisionError(Exception):
    """analyze() failed (bad input, API failure, or invalid model output after one retry)."""


def load_price_table(path: str | Path | None = None) -> dict[str, int]:
    """Read price_table.json (price_key -> cents), ignoring keys that start with '_' (notes)."""
    raw = json.loads(Path(path or PRICE_TABLE_PATH).read_text())
    return {k: v for k, v in raw.items() if not k.startswith("_")}


# ---------- input validation ----------

def _validate_image(path_str) -> Path:
    p = Path(path_str).expanduser()
    if p.suffix.lower() not in ALLOWED_EXT:
        raise VisionError(f"unsupported image type {p.suffix!r} (allowed: jpg, jpeg, png)")
    if not p.is_file():
        raise VisionError(f"photo not found: {p.name}")
    if p.stat().st_size > MAX_IMAGE_BYTES:
        raise VisionError(f"photo too large: {p.name}")
    try:
        with Image.open(p) as im:  # lazy: reads the header only
            w, h = im.size
            if w * h > MAX_IMAGE_PIXELS:
                raise VisionError(f"photo has too many pixels: {p.name} ({w}x{h})")
            im.verify()
    except Image.DecompressionBombError as e:
        raise VisionError(f"photo has too many pixels: {p.name}") from e
    except (UnidentifiedImageError, OSError, SyntaxError) as e:
        raise VisionError(f"not a valid image: {p.name}") from e
    return p


def _validate_inputs(pairs, price_table) -> list[dict]:
    if not isinstance(price_table, dict) or not price_table:
        raise VisionError("price_table must be a non-empty dict of price_key -> cents")
    for k, v in price_table.items():
        if not isinstance(k, str) or isinstance(v, bool) or not isinstance(v, int) or v < 0:
            raise VisionError(f"price_table[{k!r}] must be a non-negative integer (cents)")
    if not isinstance(pairs, list) or not pairs:
        raise VisionError("pairs must be a non-empty list")
    if len(pairs) > MAX_PAIRS:
        raise VisionError(f"too many pairs: {len(pairs)} (max {MAX_PAIRS} per call)")
    clean, seen_ids = [], set()
    for i, pair in enumerate(pairs):
        if not isinstance(pair, dict) or any(k not in pair for k in PAIR_KEYS):
            raise VisionError(f"pair {i} must have keys {', '.join(PAIR_KEYS)}")
        shot_id = str(pair["shot_id"])
        if shot_id in seen_ids:  # photo ids p_in_/p_out_{shot_id} would clash
            raise VisionError(f"duplicate shot_id {shot_id!r}")
        seen_ids.add(shot_id)
        clean.append(dict(pair, before_path=_validate_image(pair["before_path"]),
                          after_path=_validate_image(pair["after_path"])))
    return clean


# ---------- model call ----------

def _make_client() -> anthropic.Anthropic:
    load_dotenv(REPO_ROOT / ".env")  # ANTHROPIC_API_KEY; never printed or logged
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise VisionError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(timeout=TIMEOUT_S, max_retries=MAX_RETRIES)


def _image_block(path: Path) -> dict:
    with Image.open(path) as raw:
        if raw.width * raw.height > MAX_IMAGE_PIXELS:  # re-check: the file could change after validation
            raise VisionError(f"photo has too many pixels: {path.name}")
        raw.draft("RGB", (MAX_EDGE, MAX_EDGE))  # JPEG: decode at reduced scale, saves memory; no-op for PNG
        im = ImageOps.exif_transpose(raw).convert("RGB")
    im.thumbnail((MAX_EDGE, MAX_EDGE))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    data = base64.standard_b64encode(buf.getvalue()).decode()
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}}


def _prompt(pair: dict, price_keys: list[str]) -> str:
    # Prompt iteration 4 (spikes/vision/run_spike.py, the GO prompt), adapted: price keys instead of
    # dollar amounts, shot context, item and region.
    return (
        f"Shot: {pair['room']}, {pair['label']}. "
        "The first photo is BEFORE (move-in) and the second is AFTER (move-out) of the same spot in a "
        "rental unit. Report only physical changes to the property. Ignore lighting, shadows, exposure, "
        "camera angle, and belongings (movable items like clothes, bags and furniture). Treat every rug, "
        "carpet and floor covering as landlord property; a mark on one is a stain unless it is clearly a "
        "loose object. Report only actual changes; never output items for unchanged areas. "
        "Marks, scuffs or paint on doors, walls and trim count as damage. "
        "Small pin, nail or screw holes in a wall are normal_wear with price_key nail_holes. "
        "Classify each change as damage or normal_wear. "
        f"For each change pick a price_key from: {', '.join(price_keys)}; use \"none\" if none fits. "
        "Name the affected item (e.g. wall, carpet, door) and describe the change in one short sentence "
        "about the property only. Give region as [x, y, w, h]: the box around the change in the AFTER "
        "photo, as fractions from 0 to 1 of its width and height, with x, y the top-left corner. "
        "Give each finding a confidence from 0 to 1. "
        "Return only JSON: {findings:[{item, category, description, region, price_key, confidence}]}; "
        "if nothing changed, return {\"findings\":[]}."
    )


def _schema(price_keys: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {"findings": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "item": {"type": "string"},
                "category": {"type": "string", "enum": list(CATEGORIES)},
                "description": {"type": "string"},
                "region": {"type": "array", "items": {"type": "number"}},
                "price_key": {"type": "string", "enum": [*price_keys, "none"]},
                "confidence": {"type": "number"},
            },
            "required": ["item", "category", "description", "region", "price_key", "confidence"],
            "additionalProperties": False,
        }}},
        "required": ["findings"],
        "additionalProperties": False,
    }


def _parse(text: str) -> list[dict]:
    """Model text -> list of raw finding dicts. ValueError if the shape is wrong."""
    data = json.loads(text)
    if not isinstance(data, dict) or not isinstance(data.get("findings"), list):
        raise ValueError("missing findings list")
    if not all(isinstance(f, dict) for f in data["findings"]):
        raise ValueError("findings must be objects")
    return data["findings"]


class _Budget:
    def __init__(self, limit: int):
        self.limit, self.used = limit, 0

    def reserve(self):
        if self.used + EST_TOKENS_PER_CALL > self.limit:
            raise VisionError(f"token budget reached ({self.used}/{self.limit}); stopping")

    def add(self, usage):
        self.used += int(getattr(usage, "input_tokens", 0) or 0) + int(getattr(usage, "output_tokens", 0) or 0)


def _call_model(client, content: list, schema: dict, budget: _Budget, shot_id: str) -> list[dict]:
    """One call plus one retry on invalid output. Raises VisionError."""
    last_problem = ""
    for attempt in (1, 2):
        budget.reserve()
        try:
            resp = client.messages.create(
                model=MODEL, max_tokens=MAX_TOKENS,
                output_config={"format": {"type": "json_schema", "schema": schema}},
                messages=[{"role": "user", "content": content}],
            )
        except anthropic.APIError as e:
            log.warning("vision API error on shot %s: %s", shot_id, type(e).__name__)
            raise VisionError(f"vision API call failed ({type(e).__name__})") from e
        budget.add(getattr(resp, "usage", None))
        log.info("vision shot=%s attempt=%d request_id=%s stop=%s tokens_used=%d",
                 shot_id, attempt, getattr(resp, "_request_id", None), resp.stop_reason, budget.used)
        if resp.stop_reason != "end_turn":
            last_problem = f"stop_reason={resp.stop_reason}"
        else:
            text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), "")
            try:
                return _parse(text)
            except (ValueError, TypeError) as e:  # json.JSONDecodeError is a ValueError
                last_problem = f"invalid JSON ({type(e).__name__})"
        log.warning("vision shot=%s attempt=%d unusable output: %s", shot_id, attempt, last_problem)
    raise VisionError(f"vision output invalid after retry on shot {shot_id}: {last_problem}")


# ---------- rules (pure) ----------

def _clean_region(region):
    """[x, y, w, h] fractions of the after photo, clamped to the image; None if unusable."""
    if not isinstance(region, (list, tuple)) or len(region) != 4:
        return None
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in region):
        return None
    x, y, w, h = (min(max(float(v), 0.0), 1.0) for v in region)
    w, h = min(w, 1.0 - x), min(h, 1.0 - y)
    if w <= 0 or h <= 0:
        return None
    return [round(x, 4), round(y, 4), round(w, 4), round(h, 4)]


def _apply_rules(raw_findings: list[dict], price_table: dict[str, int]) -> tuple[list[dict], int, int]:
    """Returns (kept findings without ids/photo ids, dropped_low_confidence, dropped_unknown_price_key)."""
    kept, low, unknown = [], 0, 0
    for f in raw_findings:
        category = f.get("category")
        if category not in ("damage", "normal_wear"):
            continue  # no_change or anything unexpected: not a finding
        conf = f.get("confidence")
        if isinstance(conf, bool) or not isinstance(conf, (int, float)) or not math.isfinite(conf) \
                or conf < MIN_CONFIDENCE[category]:
            low += 1
            continue
        key = f.get("price_key")
        if category == "damage":
            if key not in price_table:
                unknown += 1
                log.warning("dropped damage finding with unknown price_key %r", key)
                continue
            cost = int(price_table[key])
        else:
            cost = 0  # normal wear is never charged
            key = key if key in price_table else None
        region = _clean_region(f.get("region"))
        if region is None:
            log.warning("finding region unusable, set to null: %r", f.get("region"))
        kept.append({
            "item": str(f.get("item", "")),
            "region": region,
            "category": category,
            "description": str(f.get("description", "")),
            "confidence": round(min(float(conf), 1.0), 2),  # cap: the model can return e.g. 5.0
            "price_key": key,
            "cost_cents": cost,
        })
    return _limit_per_pair(kept), low, unknown


def _limit_per_pair(kept: list[dict]) -> list[dict]:
    """Anti-padding (audit, medium): one damage finding per price_key per photo pair, and at most
    MAX_FINDINGS_PER_PAIR findings. For the cap, damage findings rank first regardless of confidence,
    then normal_wear; each group by confidence. Original order is kept."""
    best: dict[str, dict] = {}
    for f in kept:
        if f["category"] == "damage":
            k = f["price_key"]
            if k not in best or f["confidence"] > best[k]["confidence"]:
                best[k] = f
    deduped = [f for f in kept if f["category"] != "damage" or best[f["price_key"]] is f]
    if len(deduped) > MAX_FINDINGS_PER_PAIR:
        top = sorted(deduped, key=lambda f: (f["category"] != "damage", -f["confidence"]))[:MAX_FINDINGS_PER_PAIR]
        deduped = [f for f in deduped if any(f is t for t in top)]
    if len(deduped) < len(kept):
        log.warning("limited findings for one pair: %d -> %d (duplicate price_key or over cap)",
                    len(kept), len(deduped))
    return deduped


# ---------- public ----------

def analyze(pairs: list[dict], price_table: dict, on_progress: Callable[[int, str], None] | None = None) -> dict:
    pairs = _validate_inputs(pairs, price_table)
    price_keys = list(price_table)
    schema = _schema(price_keys)
    client = _make_client()
    budget = _Budget(TOKEN_BUDGET)

    findings, low_total, unknown_total = [], 0, 0
    for done, pair in enumerate(pairs, start=1):
        shot_id = str(pair["shot_id"])
        try:
            content = [_image_block(pair["before_path"]), _image_block(pair["after_path"]),
                       {"type": "text", "text": _prompt(pair, price_keys)}]
        except (OSError, Image.DecompressionBombError) as e:
            raise VisionError(f"could not read photos for shot {shot_id}") from e
        raw = _call_model(client, content, schema, budget, shot_id)
        kept, low, unknown = _apply_rules(raw, price_table)
        low_total += low
        unknown_total += unknown
        for f in kept:
            findings.append({
                "id": f"f{len(findings) + 1}",
                "room": pair["room"],
                "item": f["item"],
                "before_photo": f"p_in_{shot_id}",
                "after_photo": f"p_out_{shot_id}",
                **{k: f[k] for k in ("region", "category", "description", "confidence", "price_key", "cost_cents")},
            })
        if on_progress is not None:
            on_progress(done, pair["room"])

    return {
        "report_id": f"r_{uuid.uuid4().hex[:8]}",
        "findings": findings,
        "dropped_low_confidence": low_total,
        "dropped_unknown_price_key": unknown_total,
        "total_deduction_cents": sum(f["cost_cents"] for f in findings),
    }
