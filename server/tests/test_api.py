"""API tests against a FakeChain and a fake analyze(): no testnet USDC or API key needed."""
from __future__ import annotations

import itertools

import pytest
from fastapi.testclient import TestClient

from server.app.config import Settings
from server.app.errors import chain_error
from server.app.main import create_app

T = {"X-User-Id": "tenant_demo"}
L = {"X-User-Id": "landlord_demo"}
JPG = b"\xff\xd8\xff\xe0" + b"0" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


class FakeChain:
    def __init__(self):
        self.calls = []
        self._n = itertools.count(1)
        self.fail_next = None

    def _tx(self, name, *args):
        if self.fail_next == name:
            self.fail_next = None
            raise chain_error(f"{name} reverted: WrongStatus")
        self.calls.append((name, *args))
        h = f"0x{len(self.calls):064x}"
        return {"hash": h, "explorer_url": f"https://explorer.test/tx/{h}"}

    def lease_count(self):
        return 0

    def create_lease(self, amount):
        return next(self._n), self._tx("createLease", amount)

    def deposit(self, i, amount):
        return self._tx("deposit", i, amount)

    def commit_photos(self, i, phase, h, role):
        assert len(h) == 32
        return self._tx("commitPhotos", i, phase, role)

    def propose(self, i, ded, h):
        return self._tx("proposeDeductions", i, ded), 1_800_000_000

    def accept(self, i):
        return self._tx("accept", i)

    def appeal(self, i):
        return self._tx("appeal", i)


class VisionError(Exception):
    pass


def fake_analyze(pairs, price_table, on_progress=None):
    for i, p in enumerate(pairs, 1):
        if on_progress:
            on_progress(i, p["room"])
    return {
        "report_id": "r_test",
        "findings": [
            {"id": "f1", "room": "bedroom", "item": "wall", "before_photo": "p_in_s3", "after_photo": "p_out_s3",
             "region": None, "category": "damage", "description": "Mark", "confidence": 0.9,
             "price_key": "wall_mark_repaint", "cost_cents": 120},
            {"id": "f2", "room": "bedroom", "item": "wall", "before_photo": "p_in_s4", "after_photo": "p_out_s4",
             "region": None, "category": "normal_wear", "description": "Nail holes", "confidence": 0.6,
             "price_key": "nail_holes", "cost_cents": 50},  # must be forced to 0
        ],
        "dropped_low_confidence": 1,
        "dropped_unknown_price_key": 0,
        "total_deduction_cents": 170,
    }


@pytest.fixture
def env(tmp_path):
    chain = FakeChain()
    s = Settings(rpc_url="x", chain_id=5042002, explorer="https://explorer.test", escrow_address="0x0",
                 usdc_address="0x0", arbiter_address="0x0", data_dir=tmp_path, price_table_path=tmp_path / "p.json",
                 cors_origins=[], autosend=False)
    app = create_app(s, chain=chain, analyze_fn=fake_analyze, price_table={"wall_mark_repaint": 120})
    return TestClient(app), chain, app.state.svc


def new_lease(c, deposit=1000):
    r = c.post("/leases", headers=L, json={"address": "1 Main St", "tenant_name": "Alex Kim", "deposit_cents": deposit,
                                           "move_in_date": "2026-08-15"})
    assert r.status_code == 201, r.text
    return r.json()["lease_id"]


def photos(c, lid, phase, ext=JPG):
    for s in ["s1", "s2", "s3", "s4", "s5"]:
        r = c.put(f"/leases/{lid}/photos/{phase}/{s}", headers=T, files={"file": (f"{s}.jpg", ext, "image/jpeg")})
        assert r.status_code == 200, r.text
    r = c.post(f"/leases/{lid}/photos/{phase}/commit", headers=T)
    assert r.status_code == 200, r.text
    return r.json()


def to_draft(c, svc, lid):
    c.post(f"/leases/{lid}/deposit", headers=T)
    photos(c, lid, "in")
    photos(c, lid, "out")
    svc.start_report("landlord_demo", lid, background=False)


def test_full_demo_path(env):
    c, chain, svc = env
    lid = new_lease(c)
    assert chain.calls[0] == ("createLease", 1000 * 10**4)
    r = c.post(f"/leases/{lid}/deposit", headers=T).json()
    assert r["status"] == "funded" and r["escrow_balance_cents"] == 1000 and r["tx"]["explorer_url"]
    commit = photos(c, lid, "in")
    assert commit["status"] == "move_in_recorded" and commit["manifest_hash"].startswith("0x")
    photos(c, lid, "out")
    r = c.post(f"/leases/{lid}/report", headers=L)
    assert r.status_code == 202
    for _ in range(100):  # background thread
        g = c.get(f"/leases/{lid}").json()
        if g["status"] == "report_draft":
            break
        import time; time.sleep(0.02)
    rep = g["report"]
    assert g["status"] == "report_draft" and rep["total_deduction_cents"] == 120
    assert [f["cost_cents"] for f in rep["findings"]] == [120, 0]  # normal wear forced to $0
    assert rep["auto_send_at"] and rep["dropped_unknown_price_key"] == 0
    r = c.post(f"/leases/{lid}/report/send", headers=L, json={}).json()
    assert (r["paid_to_tenant_cents"], r["deduction_cents"], r["status"]) == (880, 120, "proposed")
    assert chain.calls[-1] == ("proposeDeductions", 1, 120 * 10**4)
    g = c.get(f"/leases/{lid}").json()
    assert g["escrow_balance_cents"] == 120 and g["report"]["report_hash"].startswith("0x") and g["appeal_deadline"]
    assert g["report"]["sent_by"] == "landlord" and g["payout"]["to_tenant_cents"] == 880
    r = c.post(f"/leases/{lid}/accept", headers=T).json()
    assert r["status"] == "settled" and r["paid_to_landlord_cents"] == 120
    g = c.get(f"/leases/{lid}").json()
    assert g["escrow_balance_cents"] == 0 and g["simulated_interest_cents"] > 0
    assert [s["step"] for s in g["timeline"]] == ["created", "funded", "move_in_recorded", "move_out_recorded",
                                                   "proposed", "settled"]
    assert all(s["tx"]["explorer_url"] for s in g["timeline"])
    assert g["demo_scale"] == 100 and len(g["photos"]["in"]) == 5


def test_personas_and_states(env):
    c, _, _ = env
    assert c.post("/leases", headers=T, json={}).json()["error"]["code"] == "not_allowed"
    assert c.post("/leases", json={}).status_code == 403
    lid = new_lease(c)
    r = c.post(f"/leases/{lid}/deposit", headers=L)
    assert r.status_code == 403 and r.json()["error"]["code"] == "not_allowed"
    assert c.post(f"/leases/{lid}/photos/in/commit", headers=T).status_code == 409
    c.post(f"/leases/{lid}/deposit", headers=T)
    r = c.post(f"/leases/{lid}/deposit", headers=T)
    assert r.status_code == 409 and r.json() == {"error": {"code": "wrong_state", "message": r.json()["error"]["message"]}}
    assert c.get("/leases/l_nope").status_code == 404
    assert c.put(f"/leases/{lid}/photos/in/zz", headers=T, files={"file": ("a.jpg", JPG)}).status_code == 404
    assert c.put(f"/leases/{lid}/photos/out/s1", headers=T, files={"file": ("a.jpg", JPG)}).status_code == 409


def test_bad_input(env):
    c, _, _ = env
    for body in ({"address": "x", "tenant_name": "y", "deposit_cents": 10.5},
                 {"address": "x", "tenant_name": "y", "deposit_cents": -1},
                 {"address": "", "tenant_name": "y", "deposit_cents": 100},
                 {"address": "x", "tenant_name": "y", "deposit_cents": 100, "tenant_id": "someone"}):
        r = c.post("/leases", headers=L, json=body)
        assert r.status_code == 400 and r.json()["error"]["code"] == "bad_request", body
    lid = new_lease(c)
    c.post(f"/leases/{lid}/deposit", headers=T)
    r = c.put(f"/leases/{lid}/photos/in/s1", headers=T, files={"file": ("a.heic", b"ftypheic" * 4)})
    assert r.status_code == 400 and "JPEG or PNG" in r.json()["error"]["message"]
    r = c.post(f"/leases/{lid}/photos/in/commit", headers=T)
    assert r.status_code == 400 and "s1" in r.json()["error"]["message"]


def test_retake_replaces_photo(env):
    c, _, svc = env
    lid = new_lease(c)
    c.post(f"/leases/{lid}/deposit", headers=T)
    c.put(f"/leases/{lid}/photos/in/s1", headers=T, files={"file": ("a.jpg", JPG)})
    r = c.put(f"/leases/{lid}/photos/in/s1", headers=T, files={"file": ("a.png", PNG)}).json()
    assert r["url"].endswith("s1.png") and r["shots_uploaded"] == 1
    assert sorted(p.name for p in (svc.store.files_dir / lid / "in").iterdir()) == ["s1.png"]


def test_landlord_can_only_lower_or_remove(env):
    c, chain, svc = env
    lid = new_lease(c)
    to_draft(c, svc, lid)
    assert c.post(f"/leases/{lid}/report/send", headers=L, json={"lower_costs": {"f1": 500}}).status_code == 400
    assert c.post(f"/leases/{lid}/report/send", headers=L, json={"remove_finding_ids": ["f9"]}).status_code == 400
    assert c.post(f"/leases/{lid}/report/send", headers=T, json={}).status_code == 403
    r = c.post(f"/leases/{lid}/report/send", headers=L, json={"lower_costs": {"f1": 80}}).json()
    assert r["deduction_cents"] == 80 and r["paid_to_tenant_cents"] == 920
    f1 = c.get(f"/leases/{lid}").json()["report"]["findings"][0]
    assert f1["edited_by_landlord"] and f1["original_cost_cents"] == 120 and f1["cost_cents"] == 80


def test_remove_all_findings_settles(env):
    c, chain, svc = env
    lid = new_lease(c)
    to_draft(c, svc, lid)
    r = c.post(f"/leases/{lid}/report/send", headers=L, json={"remove_finding_ids": ["f1", "f2"]}).json()
    assert r["deduction_cents"] == 0 and r["paid_to_tenant_cents"] == 1000 and r["status"] == "settled"


def test_deduction_capped_at_deposit(env):
    c, chain, svc = env
    lid = new_lease(c, deposit=100)  # $1 deposit, AI finds $1.20
    to_draft(c, svc, lid)
    assert c.get(f"/leases/{lid}").json()["report"]["total_deduction_cents"] == 100
    r = c.post(f"/leases/{lid}/report/send", headers=L, json={}).json()
    assert r["deduction_cents"] == 100 and r["paid_to_tenant_cents"] == 0


def test_vision_error_and_attempt_cap(env):
    c, _, svc = env

    def broken(pairs, table, on_progress=None):
        raise VisionError("photo not found: s1.jpg")

    svc._analyze_fn = broken
    lid = new_lease(c)
    c.post(f"/leases/{lid}/deposit", headers=T)
    photos(c, lid, "in")
    photos(c, lid, "out")
    for _ in range(3):
        svc.start_report("landlord_demo", lid, background=False)
        g = c.get(f"/leases/{lid}").json()
        assert g["status"] == "move_out_recorded" and g["report"]["error"] == "photo not found: s1.jpg"
    r = c.post(f"/leases/{lid}/report", headers=L)
    assert r.status_code == 409 and "3 times" in r.json()["error"]["message"]


def test_crash_message_is_generic(env):
    c, _, svc = env
    svc._analyze_fn = lambda *a, **k: 1 / 0
    lid = new_lease(c)
    c.post(f"/leases/{lid}/deposit", headers=T)
    photos(c, lid, "in")
    photos(c, lid, "out")
    svc.start_report("landlord_demo", lid, background=False)
    err = c.get(f"/leases/{lid}").json()["report"]["error"]
    assert "division" not in err and "Traceback" not in err


def test_chain_error_keeps_state(env):
    c, chain, _ = env
    lid = new_lease(c)
    chain.fail_next = "deposit"
    r = c.post(f"/leases/{lid}/deposit", headers=T)
    assert r.status_code == 502 and r.json()["error"]["code"] == "chain_error"
    assert c.get(f"/leases/{lid}").json()["status"] == "created"
    assert c.post(f"/leases/{lid}/deposit", headers=T).status_code == 200  # retry works


def test_appeal(env):
    c, _, svc = env
    lid = new_lease(c)
    to_draft(c, svc, lid)
    c.post(f"/leases/{lid}/report/send", headers=L, json={})
    assert c.post(f"/leases/{lid}/appeal", headers=L, json={}).status_code == 403
    r = c.post(f"/leases/{lid}/appeal", headers=T, json={"finding_ids": ["f1"], "reason": "It was there before"})
    assert r.status_code == 200 and r.json()["status"] == "appealed"
    g = c.get(f"/leases/{lid}").json()
    assert g["escrow_balance_cents"] == 120 and g["timeline"][-1]["label"] == "Sent to a neutral reviewer"


def test_autosend_after_48h(env, monkeypatch):
    c, _, svc = env
    lid = new_lease(c)
    to_draft(c, svc, lid)
    assert svc.autosend_due() == []
    lease = svc.store.get(lid)
    lease["report"]["auto_send_at"] = "2000-01-01T00:00:00Z"
    svc.store.put(lease)
    assert svc.autosend_due() == [lid]
    g = c.get(f"/leases/{lid}").json()
    assert g["status"] == "proposed" and g["report"]["sent_by"] == "auto"


def test_audit_fixes(env):
    c, _, svc = env
    r = c.post("/leases", headers=L, json={"address": "x", "tenant_name": "y", "deposit_cents": 10_001})
    assert r.status_code == 400 and "capped" in r.json()["error"]["message"]
    r = c.put("/leases/l_x/photos/in/s1", headers={**T, "Content-Length": str(30 * 1024 * 1024)}, content=b"x")
    assert r.status_code == 413
    lid = new_lease(c)
    svc._analyze_fn = lambda *a, **k: {"findings": [{"id": "f1", "category": "damage", "cost_cents": "lots"}]}
    c.post(f"/leases/{lid}/deposit", headers=T)
    photos(c, lid, "in")
    photos(c, lid, "out")
    svc.start_report("landlord_demo", lid, background=False)
    g = c.get(f"/leases/{lid}").json()
    assert g["status"] == "move_out_recorded" and "unreadable" in g["report"]["error"]
    svc._analyze_fn = fake_analyze
    svc.start_report("landlord_demo", lid, background=False)
    r = c.post(f"/leases/{lid}/report/send", headers=L, json={"remove_finding_ids": [{"id": "f1"}]})
    assert r.status_code == 400
