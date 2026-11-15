"""Optional real-API regression test on the 5 spike photo pairs (5 calls, ~45k tokens).

Run:  VISION_TEST_PHOTOS=~/vision-test pytest integrations/vision -m integration
Photos (pN_before/after.jpg|png) stay outside the repo. Optionally set VISION_REPORT_DIR to save each
report as JSON there (e.g. for drawing the region boxes); point it outside the repo.
"""
import json
import os
from pathlib import Path

import pytest

from integrations.vision import analyze, load_price_table

PHOTOS = os.environ.get("VISION_TEST_PHOTOS")
pytestmark = [pytest.mark.integration,
              pytest.mark.skipif(not PHOTOS, reason="VISION_TEST_PHOTOS not set")]

# pair -> expected damage price_key (None = no damage finding allowed)
EXPECTED = {"p1": None, "p2": None, "p3": "wall_mark_repaint", "p4": "wall_mark_repaint", "p5": None}


def _photo(pair, side):
    for ext in ("jpg", "jpeg", "JPG", "png", "PNG"):
        p = Path(PHOTOS).expanduser() / f"{pair}_{side}.{ext}"
        if p.exists():
            return str(p)
    pytest.fail(f"missing {pair}_{side}.jpg|png in VISION_TEST_PHOTOS")


@pytest.mark.parametrize("pair", list(EXPECTED))
def test_spike_pairs(pair):
    shot = {"shot_id": pair, "room": "living room", "label": f"test pair {pair}",
            "before_path": _photo(pair, "before"), "after_path": _photo(pair, "after")}
    report = analyze([shot], load_price_table())
    if os.environ.get("VISION_REPORT_DIR"):
        out = Path(os.environ["VISION_REPORT_DIR"]).expanduser()
        out.mkdir(parents=True, exist_ok=True)
        (out / f"{pair}.json").write_text(json.dumps(report, indent=2))
    damage = [f for f in report["findings"] if f["category"] == "damage"]
    want = EXPECTED[pair]
    if want is None:
        assert damage == [], f"false positive on {pair}: {damage}"
    else:
        assert any(f["price_key"] == want for f in damage), f"missed damage on {pair}: {report}"
        assert report["total_deduction_cents"] >= 120
