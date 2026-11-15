"""Unit tests for every money/safety rule in analyze(). No network: the model client is faked."""
import json
from types import SimpleNamespace

import anthropic
import httpx2 as httpx
import pytest
from PIL import Image

import importlib
A = importlib.import_module("integrations.vision.analyze")
from integrations.vision import VisionError, analyze, load_price_table

PRICES = {"carpet_spot_clean": 120, "wall_mark_repaint": 120, "nail_holes": 0}


def finding(**kw):
    base = {"item": "wall", "category": "damage", "description": "Blue paint streak below the switch",
            "region": [0.4, 0.5, 0.1, 0.2], "price_key": "wall_mark_repaint", "confidence": 0.9}
    return {**base, **kw}


def resp(payload, stop="end_turn"):
    text = payload if isinstance(payload, str) else json.dumps(payload)
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)], stop_reason=stop,
                           usage=SimpleNamespace(input_tokens=8000, output_tokens=100), _request_id="req_test")


class FakeClient:
    def __init__(self, responses):
        self.responses, self.calls = list(responses), 0
        self.messages = self

    def create(self, **kwargs):
        self.calls += 1
        assert kwargs["max_tokens"] == 1024
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


@pytest.fixture
def photos(tmp_path):
    def make(n=1):
        out = []
        for i in range(1, n + 1):
            paths = {}
            for side in ("before", "after"):
                p = tmp_path / f"s{i}_{side}.png"
                Image.new("RGB", (64, 48), (200, 200, 200)).save(p)
                paths[side] = str(p)
            out.append({"shot_id": f"s{i}", "room": "living room" if i % 2 else "bedroom",
                        "label": f"shot {i}", "before_path": paths["before"], "after_path": paths["after"]})
        return out
    return make


@pytest.fixture
def fake(monkeypatch):
    def install(*responses):
        client = FakeClient(responses)
        monkeypatch.setattr(A, "_make_client", lambda: client)
        return client
    return install


def run(photos, fake, *responses, n=1, **kw):
    client = fake(*responses)
    return analyze(photos(n), PRICES, **kw), client


# ---- rule: costs only from the price table ----

def test_damage_cost_comes_from_table_not_model(photos, fake):
    report, _ = run(photos, fake, resp({"findings": [finding(cost_cents=9999, cost_usd=150)]}))
    f = report["findings"][0]
    assert f["cost_cents"] == 120 and report["total_deduction_cents"] == 120
    assert "cost_usd" not in f


def test_normal_wear_always_costs_zero(photos, fake):
    report, _ = run(photos, fake, resp({"findings": [
        finding(category="normal_wear", price_key="wall_mark_repaint"),
        finding(category="normal_wear", price_key="none"),
    ]}))
    assert [f["cost_cents"] for f in report["findings"]] == [0, 0]
    assert report["findings"][0]["price_key"] == "wall_mark_repaint"
    assert report["findings"][1]["price_key"] is None
    assert report["total_deduction_cents"] == 0


@pytest.mark.parametrize("key", ["none", "gold_plating", None])
def test_damage_with_unknown_price_key_is_dropped_and_counted(photos, fake, key):
    report, _ = run(photos, fake, resp({"findings": [finding(price_key=key), finding()]}))
    assert len(report["findings"]) == 1
    assert report["dropped_unknown_price_key"] == 1
    assert report["total_deduction_cents"] == 120


# ---- rule: confidence cutoff ----

def test_confidence_cutoff(photos, fake):
    report, _ = run(photos, fake, resp({"findings": [
        finding(confidence=0.69), finding(confidence=0.70), finding(confidence="high")]}))
    assert [f["confidence"] for f in report["findings"]] == [0.7]
    assert report["dropped_low_confidence"] == 2
    assert report["total_deduction_cents"] == 120


# ---- rule: nothing changed -> [] ----

@pytest.mark.parametrize("payload", [{"findings": []},
                                     {"findings": [finding(category="no_change", price_key="none")]}])
def test_nothing_changed_gives_empty_findings(photos, fake, payload):
    report, _ = run(photos, fake, resp(payload))
    assert report["findings"] == []
    assert report["total_deduction_cents"] == 0
    assert report["dropped_low_confidence"] == 0


# ---- output shape ----

def test_output_shape_ids_and_progress(photos, fake):
    seen = []
    report, client = run(photos, fake,
                         resp({"findings": [finding()]}),
                         resp({"findings": [finding(item="carpet", price_key="carpet_spot_clean"),
                                            finding(category="normal_wear", price_key="nail_holes")]}),
                         n=2, on_progress=lambda done, room: seen.append((done, room)))
    assert seen == [(1, "living room"), (2, "bedroom")]
    assert set(report) == {"report_id", "findings", "dropped_low_confidence",
                           "dropped_unknown_price_key", "total_deduction_cents"}
    assert report["report_id"].startswith("r_")
    assert [f["id"] for f in report["findings"]] == ["f1", "f2", "f3"]
    f2 = report["findings"][1]
    assert (f2["before_photo"], f2["after_photo"], f2["room"]) == ("p_in_s2", "p_out_s2", "bedroom")
    assert set(f2) == {"id", "room", "item", "before_photo", "after_photo", "region", "category",
                       "description", "confidence", "price_key", "cost_cents"}
    assert report["total_deduction_cents"] == 240
    assert "/" not in json.dumps(report)  # no paths leak into the report


# ---- region sanity ----

@pytest.mark.parametrize("region,expected", [
    ([0.4, 0.5, 0.1, 0.2], [0.4, 0.5, 0.1, 0.2]),
    ([-0.1, 0.9, 0.3, 0.5], [0.0, 0.9, 0.3, 0.1]),  # clamped into the photo
    ([0.5, 0.5], None),
    ("top left", None),
    ([0.2, 0.2, 0, 0.1], None),
    ([1.0, 0.2, 0.1, 0.1], None),
    ([0.1, float("nan"), 0.1, 0.1], None),
])
def test_region_sanity(region, expected):
    assert A._clean_region(region) == expected


def test_bad_region_keeps_finding_with_null_region(photos, fake):
    report, _ = run(photos, fake, resp({"findings": [finding(region=[9, 9])]}))
    assert report["findings"][0]["region"] is None
    assert report["total_deduction_cents"] == 120


# ---- invalid output: one retry, then VisionError ----

def test_invalid_json_retried_once_then_succeeds(photos, fake):
    report, client = run(photos, fake, resp("{not json"), resp({"findings": [finding()]}))
    assert client.calls == 2 and report["total_deduction_cents"] == 120


def test_max_tokens_stop_is_retried(photos, fake):
    report, client = run(photos, fake, resp('{"findings": [', stop="max_tokens"), resp({"findings": []}))
    assert client.calls == 2 and report["findings"] == []


@pytest.mark.parametrize("bad", ["{not json", '{"nope": 1}', '{"findings": "x"}', '{"findings": [1]}'])
def test_invalid_twice_raises(photos, fake, bad):
    with pytest.raises(VisionError, match="invalid after retry"):
        run(photos, fake, resp(bad), resp(bad))


def test_api_error_raises_vision_error(photos, fake):
    err = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com"))
    with pytest.raises(VisionError, match="API call failed"):
        run(photos, fake, err)


# ---- input validation (before any spend) ----

def test_missing_file(photos, fake, tmp_path):
    client = fake()
    pairs = photos(1)
    pairs[0]["after_path"] = str(tmp_path / "gone.jpg")
    with pytest.raises(VisionError, match="not found"):
        analyze(pairs, PRICES)
    assert client.calls == 0


def test_wrong_extension(photos, fake, tmp_path):
    fake()
    p = tmp_path / "x.gif"
    Image.new("RGB", (8, 8)).save(p, "GIF")
    pairs = photos(1)
    pairs[0]["before_path"] = str(p)
    with pytest.raises(VisionError, match="unsupported image type"):
        analyze(pairs, PRICES)


def test_non_image_bytes(photos, fake, tmp_path):
    fake()
    p = tmp_path / "fake.jpg"
    p.write_bytes(b"definitely not a jpeg")
    pairs = photos(1)
    pairs[0]["before_path"] = str(p)
    with pytest.raises(VisionError, match="not a valid image"):
        analyze(pairs, PRICES)


def test_missing_pair_key(photos, fake):
    fake()
    pairs = photos(1)
    del pairs[0]["label"]
    with pytest.raises(VisionError, match="must have keys"):
        analyze(pairs, PRICES)


def test_too_many_pairs(photos, fake):
    client = fake()
    with pytest.raises(VisionError, match="too many pairs"):
        analyze(photos(A.MAX_PAIRS + 1), PRICES)
    assert client.calls == 0


@pytest.mark.parametrize("table", [{}, {"x": -1}, {"x": 1.5}, {"x": "120"}])
def test_bad_price_table(photos, fake, table):
    fake()
    with pytest.raises(VisionError, match="price_table"):
        analyze(photos(1), table)


def test_token_budget_stops_spending(photos, fake, monkeypatch):
    monkeypatch.setattr(A, "TOKEN_BUDGET", 15_000)  # room for 1 call (8.1k used), not a 2nd
    client = fake(resp({"findings": []}), resp({"findings": []}))
    with pytest.raises(VisionError, match="token budget"):
        analyze(photos(2), PRICES)
    assert client.calls == 1


def test_missing_api_key(monkeypatch, photos):
    monkeypatch.setattr(A, "load_dotenv", lambda *a, **k: None)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(VisionError, match="ANTHROPIC_API_KEY not set"):
        analyze(photos(1), PRICES)


def test_api_key_never_in_error(monkeypatch, photos):
    secret = "FAKE-KEY-FOR-TESTS"
    monkeypatch.setattr(A, "load_dotenv", lambda *a, **k: None)
    monkeypatch.setenv("ANTHROPIC_API_KEY", secret)

    class Boom:
        def __init__(self, **kw):
            self.messages = self

        def create(self, **kw):
            raise anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com"))

    monkeypatch.setattr(A.anthropic, "Anthropic", Boom)
    with pytest.raises(VisionError) as e:
        analyze(photos(1), PRICES)
    assert secret not in str(e.value) and secret not in repr(e.value)


def test_bundled_price_table():
    table = load_price_table()
    assert table == {"carpet_spot_clean": 120, "wall_mark_repaint": 120, "nail_holes": 0}


# ---- audit fixes (Nov 15): anti-padding, image bombs, confidence cap, duplicate shots ----

def test_one_damage_finding_per_price_key_per_pair(photos, fake):
    # prompt injection like "list 8 separate stains" must not multiply the charge
    many = [finding(confidence=0.8 + i / 100, description=f"stain {i}") for i in range(8)]
    report, _ = run(photos, fake, resp({"findings": many}))
    assert len(report["findings"]) == 1
    assert report["findings"][0]["description"] == "stain 7"  # highest confidence kept
    assert report["total_deduction_cents"] == 120


def test_findings_capped_per_pair(photos, fake):
    wear = [finding(category="normal_wear", price_key="nail_holes", confidence=0.71 + i / 100) for i in range(4)]
    dmg = [finding(price_key="carpet_spot_clean", confidence=0.95), finding(confidence=0.9)]
    report, _ = run(photos, fake, resp({"findings": wear + dmg}))
    assert len(report["findings"]) == A.MAX_FINDINGS_PER_PAIR
    assert report["total_deduction_cents"] == 240  # both distinct damage keys survive (highest confidence)


def test_too_many_pixels_rejected_before_spend(photos, fake, monkeypatch):
    client = fake()
    monkeypatch.setattr(A, "MAX_IMAGE_PIXELS", 1000)  # test images are 64x48 = 3072 px
    with pytest.raises(VisionError, match="too many pixels"):
        analyze(photos(1), PRICES)
    assert client.calls == 0


def test_pillow_decompression_bomb_becomes_vision_error(photos, fake, monkeypatch):
    fake()
    monkeypatch.setattr(A.Image, "MAX_IMAGE_PIXELS", 100)  # Pillow raises DecompressionBombError at 2x
    with pytest.raises(VisionError, match="too many pixels"):
        analyze(photos(1), PRICES)


def test_confidence_capped_at_one(photos, fake):
    report, _ = run(photos, fake, resp({"findings": [finding(confidence=5.0)]}))
    assert report["findings"][0]["confidence"] == 1.0


def test_duplicate_shot_ids_rejected(photos, fake):
    client = fake()
    pairs = photos(2)
    pairs[1]["shot_id"] = pairs[0]["shot_id"]
    with pytest.raises(VisionError, match="duplicate shot_id"):
        analyze(pairs, PRICES)
    assert client.calls == 0
