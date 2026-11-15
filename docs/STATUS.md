# STATUS (keep this short; Claude updates it after every task)

**Today's one goal (Fri Nov 13 night → Sat 1 PM sync):** By the sync, a judge could watch the AI flag the 2 damaged photo pairs (and nothing else), and click one Arc testnet release tx on the explorer.
**Demo path:**
1. Landlord creates a lease; tenant deposits $10 USDC (testnet scale 1:100, D-002) into escrow (tx on Arc explorer).
2. Move-in photos taken in-app; fingerprints committed onchain.
3. Move-out photos taken; AI report flags a wall mark ($1.20, damage, D-009) and small nail holes (normal wear, $0); landlord reviews and sends the report (D-004).
4. Undisputed $8.80 pays out to tenant immediately (tx).
5. Tenant accepts; $1.20 releases to landlord (tx); simulated interest shown.

## Done
- Roles assigned (Nov 13, 5 PM): Pablo onchain+backend, Marcus frontend, Luka AI vision+demo.
- Project chosen: Deposit Keeper (D-001). Explainer: https://claude.ai/artifact/UvpoQrNT1K8KoYQJAAEaxZ
- Sat 2:30 PM: sync skipped; decisions D-002…D-008 recorded (amounts in cents, 1:100 demo scale, landlord 48 h review, per-shot upload, contract timeouts, stack). docs/API.md frozen.
- Escrow contract written, 18 forge tests pass; ABI in shared/abi/. Not deployed yet.
- Vision spike: **GO** against the PLAN.md bar (Sat Nov 14, Luka). claude-sonnet-5-5 at the 0.7 cutoff flagged both damaged pairs in 3/3 runs (re-confirmed by the packaged pipeline on Nov 15: p3 @0.88–0.90, p4 @0.88–0.93) with no false positives on p1, p2 and p5. Caveats: both are staged wall marks charged as repaint; carpet stain unproven; small test set; p3 before photo reused from an earlier shot. Full note: docs/status/luka.md · evidence: spikes/vision/README.md.

## Next (max 5, in priority order)
1. Luka: `analyze()` is packaged in integrations/vision/ (Sun Nov 15, branch feat/vision-pipeline, PR pending): 47 unit tests and a real 5/5 run pass, and sample_report.json is in place for Pablo and Marcus. Demo damage item is the wall mark (D-009), proven at 0.88–0.93 confidence; still to be run through the full flow.
2. Pablo: deploy escrow + DemoRun on Arc testnet → release tx link here. Then FastAPI skeleton tonight.
3. Marcus: clickable mock of the move-out report screen, then scaffold app/ with the 5 demo screens.
4. Everyone: read D-002…D-008 in docs/DECISIONS.md and switch mocks to cents + the frozen docs/API.md.

## Milestones (our deadline: submitted Tue Nov 17, 11:59 PM PT · detail: docs/PLAN.md)
- Fri night: contract deployed + release tx; app scaffold + report screen; photos shot.
- Sat 1 PM: vision GO/NO-GO; API, schema and stack frozen (/decide). Sat night: Circle tx or fallback; server + vision packaged.
- Sun: pieces connected; first full run-through at 9 PM.
- Mon 2 PM: full demo path works end to end on testnet. Then hosting, judge-panel, fixes.
- Tue: freeze at noon, README + video, /submit-check, submit by 11:59 PM.
- Wed to Thu: buffer only (bug fixes, pitch drills). Sat 21: pitch in person.

## Blockers / open questions (for office hours, Telegram, or mentor)
- Law check done (verified against Civil Code §1950.5 text (Justia)): AB 2801 move-out photos required since Apr 1 2025 (all tenancies); move-in photos for tenancies starting on/after Jul 1 2025; photos go with the itemized statement within 21 days; bad-faith penalty up to 2x deposit (subd. (m)).
- Fri-night milestone slipped: contract is written and tested but not deployed; no app or server code on the remote yet (Sat Nov 14 night).
- Open (from the vision spike): how to treat a tenant's own rug vs built-in carpet (the model calls area rugs belongings even when told otherwise). Pipeline location and API settled by D-005/D-008.
- Open product decisions: where interest goes, who pays the fee, appeal window length, price-table costs in v1.

## Proven integrations (with evidence)
| Integration | Status | Evidence (tx sig / response / link) |
|---|---|---|
| Claude vision (claude-sonnet-5-5, structured JSON) | GO: 2 staged wall-mark pairs flagged 3/3 at 0.7 cutoff, 0 false positives; carpet stain unproven | spikes/vision/results/run11_p3_reshoot_bold_x3/p3_run1.json (damage/repaint @0.90, req_011Ch4Dcp8squfvzcHUqzwm7); run8_reshoot_closeup/p4_run1.json (damage/repaint @0.90, req_011Ch2MWf4fxn5qdcX69gCVR); runs 9–10 for p4 3/3 and clean pairs; summary: spikes/vision/README.md |

## Judge runs (date · Tech/UX/Innov/Impact/Demo · verdict)
-
