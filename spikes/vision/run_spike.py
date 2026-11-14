"""Vision spike (throwaway): does Claude flag real damage between move-in/move-out photos
and ignore lighting-only changes?  Usage: python spikes/vision/run_spike.py [photo_dir]"""
import base64, io, json, sys, time
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env")  # ANTHROPIC_API_KEY; never printed
PHOTOS = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / "vision-test"
RESULTS = Path(__file__).parent / "results" / (sys.argv[2] if len(sys.argv) > 2 else "")
RESULTS.mkdir(parents=True, exist_ok=True)

# usage: run_spike.py [photo_dir] [results_subdir] [model] [pairs,comma,separated]
MODEL = sys.argv[3] if len(sys.argv) > 3 else "claude-sonnet-5-5"
ONLY = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
MIN_CONFIDENCE = 0.7
PRICES = {"carpet_cleaning": 120, "wall_repair": 80, "repaint": 150}
EXPECTED = {  # pair -> (expected findings after filtering, acceptable repair types)
    "p1": ("none", set()), "p2": ("none", set()), "p5": ("none", set()),
    "p3": ("damage", {"wall_repair", "repaint"}),  # iteration 3: p3 is now a door/wall mark
    "p4": ("damage", {"wall_repair", "repaint"}),
}
RUNS = {"p5": 3}  # lighting-only pair runs 3 times

PROMPT = (
    "The first photo is BEFORE (move-in) and the second is AFTER (move-out) of the same spot in a "
    "rental unit. Report only physical changes to the property. Ignore lighting, shadows, exposure, "
    "camera angle, and belongings (movable items like clothes, bags and furniture). Treat every rug, "
    "carpet and floor covering as landlord property; a mark on one is a stain unless it is clearly a "
    "loose object. Report only actual changes; never output items for unchanged areas. "
    "Marks, scuffs or paint on doors, walls and trim count as damage. Classify each change as damage or normal_wear. For damage, pick a "
    "repair_type from: carpet_cleaning ($120), wall_repair ($80), repaint ($150). Give each finding a "
    "confidence from 0 to 1. Return only JSON: {findings:[{area, type, description, repair_type, "
    "cost_usd, confidence}]}; if nothing changed, return {\"findings\":[]}."
)
SCHEMA = {
    "type": "object",
    "properties": {"findings": {"type": "array", "items": {
        "type": "object",
        "properties": {
            "area": {"type": "string"},
            "type": {"type": "string", "enum": ["damage", "normal_wear"]},
            "description": {"type": "string"},
            "repair_type": {"type": "string", "enum": [*PRICES, "none"]},
            "cost_usd": {"type": "number"},
            "confidence": {"type": "number"},
        },
        "required": ["area", "type", "description", "repair_type", "cost_usd", "confidence"],
        "additionalProperties": False,
    }}},
    "required": ["findings"],
    "additionalProperties": False,
}


def find_photo(pair, side):
    for ext in ("jpg", "jpeg", "JPG", "png", "PNG"):
        p = PHOTOS / f"{pair}_{side}.{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"{pair}_{side}.(jpg|png) in {PHOTOS}")


def image_block(path, max_edge=2000):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((max_edge, max_edge))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    data = base64.standard_b64encode(buf.getvalue()).decode()
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}}


def postprocess(findings):
    kept, dropped = [], 0
    for f in findings:
        if f["confidence"] < MIN_CONFIDENCE:
            dropped += 1
            continue
        f = dict(f, model_cost_usd=f["cost_usd"])
        f["cost_usd"] = 0 if f["type"] == "normal_wear" else PRICES.get(f["repair_type"], 0)
        kept.append(f)
    return kept, dropped


def verdict(pair, kept):
    want, repair_ok = EXPECTED.get(pair, ("?", set()))
    damage = [f for f in kept if f["type"] == "damage"]
    if want == "none":
        return "PASS" if not damage else "FAIL (false positive)"
    if want == "damage":
        if not damage:
            return "FAIL (missed)"
        return "PASS" if any(f["repair_type"] in repair_ok for f in damage) else "PARTIAL (repair_type)"
    return "?"


def main():
    client = anthropic.Anthropic()
    pairs = sorted({p.name.split("_")[0] for p in PHOTOS.glob("p*_before.*")}, key=lambda s: int(s[1:]))
    pairs = [p for p in pairs if ONLY is None or p in ONLY]
    print(f"anthropic {anthropic.__version__} · model {MODEL} · pairs {pairs}\n")
    rows = []
    for pair in pairs:
        before, after = find_photo(pair, "before"), find_photo(pair, "after")
        content = [image_block(before), image_block(after), {"type": "text", "text": PROMPT}]
        for run in range(1, RUNS.get(pair, 1) + 1):
            t0 = time.time()
            resp = client.messages.create(
                model=MODEL, max_tokens=16000,
                output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
                messages=[{"role": "user", "content": content}],
            )
            secs = time.time() - t0
            text = next((b.text for b in resp.content if b.type == "text"), "")
            raw = {
                "pair": pair, "run": run, "before": before.name, "after": after.name,
                "model": resp.model, "request_id": resp._request_id, "stop_reason": resp.stop_reason,
                "usage": resp.usage.to_dict(), "latency_s": round(secs, 1), "raw_text": text,
            }
            (RESULTS / f"{pair}_run{run}.json").write_text(json.dumps(raw, indent=2))
            want = EXPECTED.get(pair, ("?",))[0]
            if resp.stop_reason != "end_turn":
                rows.append((pair, run, want, f"stop={resp.stop_reason}", "-", "FAIL", text))
                continue
            findings = json.loads(text)["findings"]
            fmt = lambda fs: "; ".join(
                f"{f['type']}:{f['repair_type']}:${f['cost_usd']}@{f['confidence']:.2f}" for f in fs) or "none"
            kept, _ = postprocess(findings)
            rows.append((pair, run, want, fmt(findings), fmt(kept), verdict(pair, kept), text))

    w = max(24, *(len(r[3]) + 2 for r in rows))
    print(f"{'pair':<5}{'run':<4}{'expected':<10}{'raw model output':<{w}}{'after 0.7 cutoff':<{w}}verdict")
    for r in rows:
        print(f"{r[0]:<5}{r[1]:<4}{r[2]:<10}{r[3]:<{w}}{r[4]:<{w}}{r[5]}")
    passed = sum(r[5] == "PASS" for r in rows)
    print(f"\n{passed}/{len(rows)} runs PASS. Raw responses in {RESULTS}\n\nRaw model JSON:")
    for r in rows:
        print(f"  {r[0]} run{r[1]}: {r[6]}")


if __name__ == "__main__":
    main()
