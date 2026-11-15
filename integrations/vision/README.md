# Vision pipeline (`integrations/vision/`)

Compares each move-in/move-out photo pair with Claude (`claude-sonnet-5-5`, structured JSON output) and drafts the itemized deductions for the move-out report. Contract: docs/API.md, "Vision contract with Luka" (D-005).

## Use (from `server/`)
```python
from integrations.vision import analyze, load_price_table, VisionError

report = analyze(
    pairs=[{"shot_id": "s2", "room": "living room", "label": "Wall behind couch",
            "before_path": ".../in/s2.jpg", "after_path": ".../out/s2.jpg"}],
    price_table=load_price_table(),            # price_key -> cents
    on_progress=lambda done, room: ...,        # called after each pair
)
# VisionError on any failure -> return 502 vision_error
```
Output: the docs/PLAN.md findings schema in integer cents (D-003). See `sample_report.json`, a real run on a staged wall-mark pair. Each finding has `id, room, item, before_photo, after_photo, region, category, description, confidence, price_key, cost_cents`. Photo ids are `p_in_{shot_id}` / `p_out_{shot_id}`. `region` is `[x, y, w, h]` as fractions of the after photo, or `null` if the model's box was unusable.

The output has **one extra field** beyond the frozen schema: `dropped_unknown_price_key` (count). It's additive; agreed with Luka on Nov 15.

## Rules (enforced in code, not only in the prompt)
- The model never sees or returns money. `cost_cents` = `price_table[price_key]`, nothing else.
- `normal_wear` always costs 0.
- `damage` with a `price_key` not in the table: dropped, counted in `dropped_unknown_price_key`.
- `confidence < 0.7`: dropped, counted in `dropped_low_confidence`.
- `no_change` items are discarded, so nothing changed gives `findings: []`.
- Region is clamped to the photo; a malformed region becomes `null` (finding kept). Confidence is capped at 1.0.
- Anti-padding: at most one damage finding per `price_key` per photo pair (highest confidence wins) and at most 3 findings per pair, so text in a photo can't multiply charges.

## Safety limits
- `max_tokens=1024`, 60 s timeout, SDK `max_retries=2`.
- Invalid JSON or a truncated reply: one retry, then `VisionError`.
- Spend cap: at most 12 pairs per call and a 200k-token budget per call (about 8.5k tokens per pair).
- Inputs are checked before any API call: the file exists, is jpg/jpeg/png, is ≤25 MB and ≤40 MP, and is a real image; `shot_id`s are unique. Decompression bombs raise `VisionError`, not a crash.
- **Not in this module (server's job):** cap `total_deduction_cents` at the deposit, load `price_table.json` server-side (never from a request), and limit analyze attempts per lease.
- `ANTHROPIC_API_KEY` is loaded from the repo-root `.env` via python-dotenv. It's never printed or logged, and logs carry only request ids and token counts.

## Price table
`price_table.json` holds **placeholder** demo-scale (1:100, D-002) cents: `carpet_spot_clean` 120, `wall_mark_repaint` 120, `nail_holes` 0. Still to be confirmed with Pablo.

## Setup and tests
```bash
python3 -m venv ~/.venvs/ubc-vision
~/.venvs/ubc-vision/bin/pip install -r integrations/vision/requirements.txt
~/.venvs/ubc-vision/bin/pytest integrations/vision          # unit tests, no network
VISION_TEST_PHOTOS=~/vision-test ~/.venvs/ubc-vision/bin/pytest integrations/vision -m integration
```
The integration test runs the 5 spike pairs (`pN_before/after.jpg`, kept **outside the repo**): damage on p3 and p4, nothing on p1, p2 or p5. It costs 5 API calls. Set `VISION_REPORT_DIR` (outside the repo) to save each report.

## Known limits
- Proven only on staged wall marks (5 pairs, one room). The carpet stain (demo item) is not yet proven.
- Region boxes are approximate. On Nov 15, p3 was on target in two runs; p4 was about 9% of the photo height below the mark in one run and on target in the next. Treat boxes as a hint in the UI.
