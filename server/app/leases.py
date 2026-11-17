"""Lease state machine and every API.md handler. Money is cents here; chain.py converts to base units."""
from __future__ import annotations

import hashlib
import json
import logging
import secrets
import threading
from datetime import date, datetime, timedelta, timezone

from .config import (CENTS_TO_UNITS, DEFAULT_SHOT_LIST, DEMO_SCALE, LANDLORD_ID, LANDLORD_NAME,
                     MAX_ANALYZE_ATTEMPTS, MAX_PHOTO_BYTES, REVIEW_HOURS, SIMULATED_APY, TENANT_ID, Settings)
from .errors import bad_request, not_allowed, not_found, vision_error, wrong_state
from .store import Store

log = logging.getLogger("dk.leases")

PHASE_NEEDS = {"in": "funded", "out": "move_in_recorded"}
PHASE_DONE = {"in": "move_in_recorded", "out": "move_out_recorded"}
# What still sits in escrow, by status (cents are filled in by _escrow_cents).
HOLDS_DEPOSIT = {"funded", "move_in_recorded", "move_out_recorded", "analyzing", "report_draft"}
HOLDS_DEDUCTION = {"proposed", "appealed"}
REPORT_UNHASHED = {"report_hash", "auto_send_at", "sent_by", "error"}


def now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def money(cents: int) -> str:
    return f"${cents / 100:,.2f}"


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def sniff_image(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    return None


class Service:
    def __init__(self, store: Store, chain, settings: Settings, analyze_fn=None, price_table=None):
        self.store, self.chain, self.s = store, chain, settings
        self._analyze_fn = analyze_fn
        self._price_table = price_table

    # ---- vision (imported lazily so tests and the health check don't need the SDK) ----------
    def _vision(self):
        if self._analyze_fn is None:
            from integrations.vision import VisionError, analyze, load_price_table
            self._analyze_fn, self._vision_error = analyze, VisionError
            self._price_table = load_price_table(self.s.price_table_path)
        return self._analyze_fn, self._price_table

    # ---- helpers -----------------------------------------------------------------------------
    def _require(self, lease: dict, *statuses: str, msg: str | None = None):
        if lease["status"] not in statuses:
            raise wrong_state(msg or f"Lease is {lease['status']}, needs {' or '.join(statuses)}")

    @staticmethod
    def _as(user: str, who: str, action: str):
        if user != who:
            raise not_allowed(f"Only the {'tenant' if who == TENANT_ID else 'landlord'} can {action}")

    @staticmethod
    def _step(lease: dict, step: str, label: str, tx: dict | None):
        lease["timeline"].append({"step": step, "at": iso(now()), "label": label, "tx": tx})

    # ---- POST /leases ------------------------------------------------------------------------
    def create(self, user: str, body: dict) -> dict:
        self._as(user, LANDLORD_ID, "create a lease")
        deposit = body.get("deposit_cents")
        if not isinstance(deposit, int) or isinstance(deposit, bool) or deposit <= 0:
            raise bad_request("deposit_cents must be a positive integer")
        if deposit > self.s.max_deposit_cents:
            raise bad_request(f"deposit_cents is capped at {self.s.max_deposit_cents} on testnet")
        if body.get("tenant_id", TENANT_ID) != TENANT_ID:
            raise bad_request("tenant_id must be tenant_demo in v1")
        for f in ("address", "tenant_name"):
            if not isinstance(body.get(f), str) or not body[f].strip():
                raise bad_request(f"{f} is required")
        move_in = body.get("move_in_date") or date.today().isoformat()
        try:
            date.fromisoformat(move_in)
        except (TypeError, ValueError):
            raise bad_request("move_in_date must be YYYY-MM-DD") from None
        shots = body.get("shot_list") or DEFAULT_SHOT_LIST
        ids = set()
        for sh in shots:
            if not isinstance(sh, dict) or not all(isinstance(sh.get(k), str) and sh[k] for k in ("shot_id", "room", "label")):
                raise bad_request("each shot needs shot_id, room, label")
            if not sh["shot_id"].isalnum() or len(sh["shot_id"]) > 16 or sh["shot_id"] in ids:
                raise bad_request(f"bad or duplicate shot_id {sh['shot_id']!r}")
            ids.add(sh["shot_id"])
        if len(shots) > 12:
            raise bad_request("at most 12 shots")  # vision MAX_PAIRS

        onchain_id, tx = self.chain.create_lease(deposit * CENTS_TO_UNITS)
        lease = {
            "lease_id": f"l_{secrets.token_hex(4)}",
            "onchain_id": onchain_id,
            "status": "created",
            "address": body["address"].strip(),
            "tenant": {"id": TENANT_ID, "name": body["tenant_name"].strip()},
            "landlord": {"id": LANDLORD_ID, "name": LANDLORD_NAME},
            "deposit_cents": deposit,
            "move_in_date": move_in,
            "shot_list": [{k: sh[k] for k in ("shot_id", "room", "label")} for sh in shots],
            "photos": {"in": {}, "out": {}},
            "manifest_hash": {"in": None, "out": None},
            "progress": None,
            "report": None,
            "analyze_attempts": 0,
            "appeal_deadline": None,
            "payout": {"to_tenant_cents": None, "to_landlord_cents": None, "pending_cents": None},
            "settled_at": None,
            "timeline": [],
        }
        self._step(lease, "created", "Lease created", tx)
        self.store.put(lease)
        return {**self.view(lease), "tx": tx}

    # ---- POST /leases/{id}/deposit -------------------------------------------------------------
    def deposit(self, user: str, lease_id: str) -> dict:
        self._as(user, TENANT_ID, "pay the deposit")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, "created")
            tx = self.chain.deposit(lease["onchain_id"], lease["deposit_cents"] * CENTS_TO_UNITS)
            lease["status"] = "funded"
            self._step(lease, "funded", f"{money(lease['deposit_cents'])} held in escrow", tx)
            self.store.put(lease)
        return {"lease_id": lease_id, "status": "funded", "escrow_balance_cents": lease["deposit_cents"], "tx": tx}

    # ---- photos --------------------------------------------------------------------------------
    def upload(self, user: str, lease_id: str, phase: str, shot_id: str, data: bytes) -> dict:
        if phase not in PHASE_NEEDS:
            raise not_found("phase must be in or out")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            if shot_id not in {s["shot_id"] for s in lease["shot_list"]}:
                raise not_found(f"Unknown shot {shot_id}")
            self._require(lease, PHASE_NEEDS[phase], msg=f"Move-{phase} photos need the lease to be {PHASE_NEEDS[phase]}")
            if not data:
                raise bad_request("file is empty")
            if len(data) > MAX_PHOTO_BYTES:
                raise bad_request("photo is larger than 25 MB")
            ext = sniff_image(data[:16])
            if not ext:
                raise bad_request("photo must be JPEG or PNG (HEIC is not supported)")
            folder = self.store.files_dir / lease_id / phase
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob(f"{shot_id}.*"):
                old.unlink()
            (folder / f"{shot_id}.{ext}").write_bytes(data)
            photo = {
                "photo_id": f"p_{phase}_{shot_id}",
                "shot_id": shot_id,
                "phase": phase,
                "url": f"/files/{lease_id}/{phase}/{shot_id}.{ext}",
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            lease["photos"][phase][shot_id] = photo
            self.store.put(lease)
        return {**photo, "shots_uploaded": len(lease["photos"][phase]), "shots_total": len(lease["shot_list"])}

    def commit(self, user: str, lease_id: str, phase: str) -> dict:
        if phase not in PHASE_NEEDS:
            raise not_found("phase must be in or out")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, PHASE_NEEDS[phase])
            missing = [s["shot_id"] for s in lease["shot_list"] if s["shot_id"] not in lease["photos"][phase]]
            if missing:
                raise bad_request(f"Missing shots: {', '.join(missing)}")
            manifest = {sid: p["sha256"] for sid, p in sorted(lease["photos"][phase].items())}
            digest = hashlib.sha256(canonical(manifest)).digest()
            role = "tenant" if user == TENANT_ID else "landlord"
            tx = self.chain.commit_photos(lease["onchain_id"], phase, digest, role)
            lease["manifest_hash"][phase] = "0x" + digest.hex()
            lease["status"] = PHASE_DONE[phase]
            self._step(lease, PHASE_DONE[phase], f"Move-{phase} photos recorded", tx)
            self.store.put(lease)
        return {"lease_id": lease_id, "phase": phase, "status": lease["status"],
                "manifest_hash": lease["manifest_hash"][phase], "tx": tx}

    # ---- report --------------------------------------------------------------------------------
    def start_report(self, user: str, lease_id: str, background: bool = True) -> dict:
        self._as(user, LANDLORD_ID, "start the report")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, "move_out_recorded")
            if lease["analyze_attempts"] >= MAX_ANALYZE_ATTEMPTS:
                raise wrong_state(f"Analysis already tried {MAX_ANALYZE_ATTEMPTS} times for this lease")
            lease["analyze_attempts"] += 1
            lease["status"] = "analyzing"
            first_room = lease["shot_list"][0]["room"]
            lease["progress"] = {"shots_done": 0, "shots_total": len(lease["shot_list"]), "current_room": first_room}
            self.store.put(lease)
        if background:
            threading.Thread(target=self._run_analysis, args=(lease_id,), daemon=True).start()
        else:
            self._run_analysis(lease_id)
        return {"lease_id": lease_id, "status": "analyzing", "progress": lease["progress"]}

    def _run_analysis(self, lease_id: str) -> None:
        lease = self.store.get(lease_id)
        folder = self.store.files_dir / lease_id
        pairs = []
        for sh in lease["shot_list"]:
            sid = sh["shot_id"]
            pairs.append({**sh,
                          "before_path": str(folder / "in" / lease["photos"]["in"][sid]["url"].rsplit("/", 1)[1]),
                          "after_path": str(folder / "out" / lease["photos"]["out"][sid]["url"].rsplit("/", 1)[1])})

        def on_progress(done: int, room: str):
            with self.store.locked(lease_id):
                l = self.store.get(lease_id)
                if l["status"] == "analyzing":
                    l["progress"] = {"shots_done": done, "shots_total": len(pairs), "current_room": room}
                    self.store.put(l)

        error = None
        result = None
        try:
            analyze, table = self._vision()
            result = analyze(pairs, table, on_progress=on_progress)
        except Exception as e:  # VisionError → its message; anything else → generic (no traceback to clients)
            vision_cls = getattr(self, "_vision_error", None)
            if (vision_cls and isinstance(e, vision_cls)) or type(e).__name__ == "VisionError":
                error = str(e)[:300]
            else:
                log.exception("analysis crashed for %s", lease_id)
                error = "The photo comparison failed. Please try again."

        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            lease["progress"] = None
            if not error:
                try:
                    lease["report"] = self._draft(lease, result)
                    lease["status"] = "report_draft"
                except Exception:
                    log.exception("bad analyze() output for %s", lease_id)
                    error = "The photo comparison returned an unreadable report. Please try again."
            if error:
                lease["status"] = "move_out_recorded"
                lease["report"] = {"error": error}
            self.store.put(lease)

    def _draft(self, lease: dict, result: dict) -> dict:
        findings = []
        for f in result.get("findings", []):
            f = dict(f)
            if f.get("category") != "damage":
                f["cost_cents"] = 0  # normal wear and no-change are never charged
            f["cost_cents"] = max(0, int(f.get("cost_cents") or 0))
            f["edited_by_landlord"] = False
            f["original_cost_cents"] = f["cost_cents"]
            findings.append(f)
        report = {k: v for k, v in result.items() if k not in ("findings", "total_deduction_cents")}
        report.update({
            "report_id": result.get("report_id") or f"r_{secrets.token_hex(4)}",
            "findings": findings,
            "total_deduction_cents": min(sum(f["cost_cents"] for f in findings), lease["deposit_cents"]),
            "report_hash": None,
            "auto_send_at": iso(now() + timedelta(hours=REVIEW_HOURS)),
            "sent_by": None,
            "error": None,
        })
        return report

    def send_report(self, user: str | None, lease_id: str, body: dict) -> dict:
        """user=None means the 48 h auto-send (D-004)."""
        if user is not None:
            self._as(user, LANDLORD_ID, "send the report")
        remove = body.get("remove_finding_ids") or []
        lower = body.get("lower_costs") or {}
        if not isinstance(remove, list) or not isinstance(lower, dict):
            raise bad_request("remove_finding_ids must be a list and lower_costs an object")
        if not all(isinstance(i, str) for i in remove):
            raise bad_request("remove_finding_ids must be a list of finding ids")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, "report_draft")
            report = lease["report"]
            by_id = {f["id"]: f for f in report["findings"]}
            for fid in list(remove) + list(lower):
                if fid not in by_id:
                    raise bad_request(f"Unknown finding {fid}")
            for fid, cents in lower.items():
                if not isinstance(cents, int) or isinstance(cents, bool) or cents < 0:
                    raise bad_request(f"lower_costs[{fid}] must be a non-negative integer")
                if cents > by_id[fid]["cost_cents"]:
                    raise bad_request(f"Costs can only be lowered (finding {fid})")
            findings = []
            for f in report["findings"]:
                if f["id"] in remove:
                    continue
                f = dict(f)
                if f["id"] in lower and lower[f["id"]] != f["cost_cents"]:
                    f["cost_cents"] = lower[f["id"]]
                    f["edited_by_landlord"] = True
                findings.append(f)
            total = min(sum(f["cost_cents"] for f in findings), lease["deposit_cents"])
            final = {**report, "findings": findings, "total_deduction_cents": total,
                     "removed_finding_ids": sorted(remove)}
            hashed = {k: v for k, v in final.items() if k not in REPORT_UNHASHED}
            digest = hashlib.sha256(canonical(hashed)).digest()

            tx, deadline = self.chain.propose(lease["onchain_id"], total * CENTS_TO_UNITS, digest)

            final["report_hash"] = "0x" + digest.hex()
            final["sent_by"] = "landlord" if user else "auto"
            lease["report"] = final
            to_tenant = lease["deposit_cents"] - total
            lease["payout"] = {"to_tenant_cents": to_tenant, "to_landlord_cents": None, "pending_cents": total}
            if deadline:
                lease["appeal_deadline"] = iso(datetime.fromtimestamp(deadline, timezone.utc))
            lease["status"] = "proposed"
            self._step(lease, "proposed", f"{money(to_tenant)} sent to you", tx)
            if total == 0:  # contract closes a zero-deduction lease in the same tx
                lease["status"] = "settled"
                lease["payout"] = {"to_tenant_cents": to_tenant, "to_landlord_cents": 0, "pending_cents": 0}
                lease["settled_at"] = iso(now())
            self.store.put(lease)
        return {"lease_id": lease_id, "status": lease["status"], "paid_to_tenant_cents": to_tenant,
                "deduction_cents": total, "tx": tx}

    def autosend_due(self) -> list[str]:
        sent = []
        for lease_id in self.store.ids_with_status("report_draft"):
            lease = self.store.get(lease_id)
            at = (lease.get("report") or {}).get("auto_send_at")
            if at and at <= iso(now()):
                try:
                    self.send_report(None, lease_id, {})
                    sent.append(lease_id)
                except Exception:
                    log.exception("auto-send failed for %s", lease_id)
        return sent

    # ---- tenant decision -----------------------------------------------------------------------
    def accept(self, user: str, lease_id: str) -> dict:
        self._as(user, TENANT_ID, "accept the deductions")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, "proposed")
            tx = self.chain.accept(lease["onchain_id"])
            ded = lease["report"]["total_deduction_cents"]
            lease["status"] = "settled"
            lease["settled_at"] = iso(now())
            lease["payout"] = {**lease["payout"], "to_landlord_cents": ded, "pending_cents": 0}
            self._step(lease, "settled", f"{money(ded)} released to the landlord", tx)
            self.store.put(lease)
        return {"lease_id": lease_id, "status": "settled", "paid_to_landlord_cents": ded, "tx": tx}

    def appeal(self, user: str, lease_id: str, body: dict) -> dict:
        self._as(user, TENANT_ID, "appeal")
        ids = body.get("finding_ids") or []
        reason = body.get("reason")
        if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids) or (reason is not None and not isinstance(reason, str)):
            raise bad_request("finding_ids must be a list and reason a string")
        with self.store.locked(lease_id):
            lease = self.store.get(lease_id)
            self._require(lease, "proposed")
            known = {f["id"] for f in lease["report"]["findings"]}
            if any(i not in known for i in ids):
                raise bad_request("Unknown finding id in appeal")
            tx = self.chain.appeal(lease["onchain_id"])
            lease["status"] = "appealed"
            lease["appeal"] = {"finding_ids": ids, "reason": (reason or "")[:1000], "at": iso(now())}
            self._step(lease, "appealed", "Sent to a neutral reviewer", tx)
            self.store.put(lease)
        return {"lease_id": lease_id, "status": "appealed", "tx": tx}

    # ---- GET /leases/{id} ----------------------------------------------------------------------
    def get(self, lease_id: str) -> dict:
        return self.view(self.store.get(lease_id))

    def _escrow_cents(self, lease: dict) -> int:
        if lease["status"] in HOLDS_DEPOSIT:
            return lease["deposit_cents"]
        if lease["status"] in HOLDS_DEDUCTION:
            return lease["report"]["total_deduction_cents"]
        return 0

    def _interest_cents(self, lease: dict) -> int:
        """Simulated yield on the deposit from move-in until settlement (D-001; labeled simulated in the UI)."""
        if lease["status"] == "created":
            return 0
        start = datetime.fromisoformat(lease["move_in_date"]).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(lease["settled_at"].replace("Z", "+00:00")) if lease["settled_at"] else now()
        years = max(0.0, (end - start).total_seconds()) / (365 * 24 * 3600)
        return int(lease["deposit_cents"] * SIMULATED_APY * years)

    def view(self, lease: dict) -> dict:
        report = lease["report"]
        if report and set(report) == {"error"}:
            report = {"report_id": None, "report_hash": None, "auto_send_at": None, "sent_by": None,
                      "findings": [], "dropped_low_confidence": 0, "total_deduction_cents": 0, "error": report["error"]}
        return {
            "lease_id": lease["lease_id"],
            "status": lease["status"],
            "address": lease["address"],
            "tenant": lease["tenant"],
            "landlord": lease["landlord"],
            "deposit_cents": lease["deposit_cents"],
            "demo_scale": DEMO_SCALE,
            "escrow_balance_cents": self._escrow_cents(lease),
            "simulated_interest_cents": self._interest_cents(lease),
            "appeal_deadline": lease["appeal_deadline"],
            "shot_list": lease["shot_list"],
            "photos": {ph: [lease["photos"][ph][s["shot_id"]] for s in lease["shot_list"] if s["shot_id"] in lease["photos"][ph]]
                       for ph in ("in", "out")},
            "progress": lease["progress"],
            "report": report,
            "payout": lease["payout"],
            "timeline": lease["timeline"],
        }
