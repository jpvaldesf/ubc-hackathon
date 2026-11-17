# Luka: status (your Claude session updates this after each task)

**Lane:** AI vision + integrations + demo (integrations/, docs/, README.md, demo assets)
**Today's lane goal (Tue Nov 17, morning):** README, and a rerun on a fresh lease with the final photo set.
**Full plan:** docs/PLAN.md (your section)
**Branch:** docs/demo-script-update

## Done (with evidence: tx hash, PR link, screenshot)
- Mon Nov 16 (night): Render-hosted app tested end to end with photos p1–p5. Two findings at $1.20 each; the report showed $7.60 to send and $2.40 held. The proof link opens on the Arc testnet explorer with status Success, and the target is the escrow `0xe3791a88E125ce9e826FB07f84BF88625d9f3e98`. Monday-night test run (not the final demo run): https://explorer.testnet.arc.io/tx/0x8a8f2053fc2fb52ab523d0d2423ed4267193b2a1be699fc206ae9d2c08b6c54b
- Mon Nov 16 (night): demo photos p1, p2, p3, p5, p7 sent to Pablo on Drive, location data stripped, one label per shot.
- Mon Nov 16: demo video script matched to the app's real labels on main (commit 75ac89f on docs/demo-script-update). Simulated interest cut, 269 words over 2:30 (≤ 2.3 words/s per row), tx links still placeholders.
- Mon Nov 16: Photos screen (`PhotoCapturePage`, move-in/move-out upload, Done → Record photos, landlord Analyze photos). PR #23 merged into Marcus's stacked branch feat/photo-service-wiring. It reached main with PR #25 (b307534).
- Sun Nov 15: normal-wear cutoff 0.5, damage stays 0.7 (D-010, b543d90 on main). p7 nail hole shows as normal wear $0 in 3/3 runs; no new findings on p1, p2, p5.
- Sun Nov 15: vision pipeline merged to main and proven in the real server (Pablo's smoke run, lease l_cf673463). Report in 24 s, p3 + p4 damage 120¢ @0.90, clean pairs no findings. Txs: createLease https://explorer.testnet.arc.io/tx/0x39efa863c69ff1b57157e2cef09d1eaac5c15acc504104ed9782a21ba4183714 · accept https://explorer.testnet.arc.io/tx/0xced477e2b09f26d7345a7acb8d11acc65dbda8f6f4102420dbf668407dceab59 (PR #18).
- Sun Nov 15: vision pipeline packaged in integrations/vision/ (`analyze()` per API.md, cents, rules in code, retry/timeout/spend cap). 47 unit tests pass; real 5-pair run 5/5 (p3 wall_mark_repaint @0.88, p4 @0.90, p1/p2/p5 clean). sample_report.json from p3 (privacy-checked).
- Fri Nov 13: picked the vision provider: Anthropic, `claude-sonnet-5-5` (researcher confirmed model ID + API).
- Fri Nov 13: vision spike, 8 runs. Result: **conditional GO** (note below). Evidence: `spikes/vision/results/`, `spikes/vision/README.md`.
- Sat Nov 14: vision spike runs 9–11. Result: **GO** against the PLAN.md bar (note below). Evidence: `spikes/vision/results/run9_*`, `run10_*`, `run11_*`; `spikes/vision/README.md`.

### Vision spike: GO (Sat Nov 14, Luka)

Bar (docs/PLAN.md): flags both damaged pairs, nothing on the clean or lighting-only
pairs, in at least 2 of 3 runs. Prompt and 0.7 cutoff unchanged from run 8.

- p3 (blue paint streak on wall): damage/repaint @0.90 in 3/3 runs (run 11).
- p4 (red wall smear): damage/repaint @0.80–0.85 in 6/6 runs (runs 9–10).
- No false positives: p5 lighting-only clean 6/6; p1 and p2 clean 2/2 each
  (one run per batch, not 3×).
- Runs 9–10 used an earlier p3 after with a thin, faint line: found 6/6 in the
  right spot but at 0.55–0.60, so dropped. Bolder mark in the reshoot fixed it.

Caveats:
- Both damage cases are staged wall marks charged as repaint. A carpet stain
  (the demo-path item) is unproven.
- Small test set: 5 pairs, one room.
- The p3 before photo was reused from an earlier shot (the original before HEIC
  was no longer in the photo folder), not shot alongside the run 11 after.

Evidence: run11_p3_reshoot_bold_x3/p3_run1.json (req_011Ch4Dcp8squfvzcHUqzwm7);
full write-up in spikes/vision/README.md.

### Vision spike: conditional GO (Fri Nov 13, Luka)

Setup: claude-sonnet-5-5, structured JSON output. 5 staged photo pairs, 8 runs.
Costs come from a fixed price table in code. Normal wear is forced to $0.
Findings under 0.7 confidence are dropped.

Proven (small test set):
- Flags a clearly visible staged wall mark as damage/repaint in every real-photo
  run: 5 runs, confidence 0.80 to 0.90. This is ONE damage scene, rerun.
- No false damage charges on 2 clean pairs or the lighting-only pair in any run.
- Removable objects (a tissue, a loose strip) were not charged.
- Faint marks were rated normal wear at ~0.40 and dropped by the cutoff.
- Fast and cheap: valid JSON every time, ~6.6k input tokens per pair.

Not yet proven: a second, permanent damage type (carpet/door tests had no real
damage or only removable objects). A close-up marker-on-surface reshoot is
next, not blocking.

Prompt rule that helped: report only actual changes (return {"findings":[]} when
nothing changed); this removed padded "unchanged" items. Also added, effect not
yet measured: marks on walls/doors/trim count as damage. Recommended for
capture, untested: close-ups from the same spot for before and after.

Open for the 1 PM sync: how to treat a tenant's own rug vs built-in carpet;
where the pipeline code lives (server/ vs integrations/); who owns the API.

Evidence: raw responses in spikes/vision/results/ (run8_reshoot_closeup for p4);
summary in spikes/vision/README.md.

## Next (Tue morning)
1. README on branch `docs/readme` (`/readme`).
2. Price table check: `integrations/vision/price_table.json` (the one the server loads, `server/app/config.py`).
3. PR #26 follow-up: Create lease and the token.
4. Rerun on a fresh lease with the final set (p1, p2, p3, p5, p7). Expect one damage finding ($1.20) and $8.80 sent, matching the demo script.
5. After that rerun, replace the `<..._TX_URL>` placeholders in docs/DEMO-VIDEO.md with its real explorer links.
6. Devpost written answers (built / problem / how it works / unique / next).

## Blocked by / waiting on
- Hosting: on Render as of Mon night, so the tunnel is no longer needed.
- The app doesn't show the "Testnet demo: amounts scaled 1:100" note or simulated interest (Marcus). The video uses a caption for 1:100 and leaves interest out until the app has them.

## Requests from others (teammates write here instead of editing your files)
- Sun Nov 15, 8:30 PM, from Pablo: (1) Tonight, please send me the p1–p5 test photos (AirDrop/drive, not git) plus a one-line label per shot describing what it shows, so the demo shot list matches the real photos. (2) Could you take the app's **Photos screen** (move-in/move-out upload + Analyze) with Marcus on Mon morning? Details are in docs/status/marcus.md, item 3. Coordinate with him so you don't both edit the same files.
- Sat 2:30 PM, from Pablo: `analyze(pairs, price_table, on_progress=None) -> dict` per docs/API.md (D-005). Findings use `cost_cents` and `total_deduction_cents`; price table in cents (D-003). Demo deduction is $1.20 carpet stain + small nail holes as normal wear $0 (D-002, swap if something stages better). Please post your GO/NO-GO in docs/STATUS.md by 6 PM; the sync didn't happen.
- Mon Nov 16, from Marcus: **service layer for your photo screen is ready** (branch `feat/photo-service-wiring`, stacked on PR #20; app/src/services only). I did not touch `app/src/features/photos/`. I will add the route, overview entry points and remove the "not available" notices only when your component is on a branch/PR (tell me its export name and props). Live mode only; sample mode throws `integration_blocked`.
  **Methods** (`const { service } = useServices().bundle`; call `reloadNow()` from `useLeaseContext()` after each one):
  - `service.uploadPhoto(leaseId, 'in'|'out', shotId, file: Blob|File): Promise<{photoId, shotId, phase, src, shotsUploaded, shotsTotal}>` (PUT, retake = call again; JPEG/PNG only, <=25 MB, checked by magic bytes, so HEIC gets a clear error before any request; `src` is absolute and cache-busted, use it directly in `<img>`).
  - `service.commitPhotos(leaseId, phase): Promise<{status, proof?}>` ("Done"; server error "Missing shots: s2, s3" is passed through as the message; a second commit returns a 409 message, so just reload).
  - `service.startReport(leaseId): Promise<void>` (landlord only; then the lease goes `analyzing`).
  **Data** on `useLeaseContext().lease` (all absent in sample mode, so guard with `?.`):
  - `lease.capture`: `{ shots: [{id, room, label}], photos: {in: UploadedPhoto[], out: UploadedPhoto[]}, openPhase: 'in'|'out'|null, committed: {in, out} }`. Show your screen only when `openPhase` is non-null; either persona may upload.
  - `lease.analysis`: `{ state: 'idle'|'running', canStart, progress?: {shotsDone, shotsTotal, currentRoom}, error? }`. Show Analyze when `canStart`; poll is automatic (2 s while `running`); on failure `error` is set and the landlord can retry (max 3 attempts server-side).
  - Errors are `ServiceError` (`.message` is user-ready); use the existing `useMutation()` so double clicks are ignored.
  **Suggested component interface:** `export function PhotoCapturePage()` rendered at `/leases/:leaseId/photos` (reads everything from `useLeaseContext()`), plus nothing else needed from me. Uploads one shot at a time (the server serialises per lease). `<input type="file" accept="image/jpeg,image/png">`.
