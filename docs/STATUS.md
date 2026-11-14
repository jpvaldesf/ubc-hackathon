# STATUS (keep this short; Claude updates it after every task)

**Today's one goal (Fri Nov 13 night → Sat 1 PM sync):** By the sync, a judge could watch the AI flag the 2 damaged photo pairs (and nothing else), and click one Arc testnet release tx on the explorer.
**Demo path:**
1. Landlord creates a lease; tenant deposits $1,000 USDC into escrow (tx on Arc explorer).
2. Move-in photos taken in-app; fingerprints committed onchain.
3. Move-out photos taken; AI report flags carpet stain ($120, damage) and faded paint (normal wear, $0).
4. Undisputed $880 pays out to tenant immediately (tx).
5. Tenant accepts; $120 releases to landlord (tx); simulated interest shown.

## Done
- Roles assigned (Nov 13, 5 PM): Pablo onchain+backend, Marcus frontend, Luka AI vision+demo.
- Project chosen: Deposit Keeper (D-001). Explainer: https://claude.ai/artifact/UvpoQrNT1K8KoYQJAAEaxZ
- Vision spike: **conditional GO** (Fri Nov 13, Luka). claude-sonnet-5-5 flagged a staged wall mark as damage in 5/5 real-photo runs (0.80–0.90). Zero false damage charges on the clean and lighting-only pairs in 8 runs. A second, permanent damage type is not yet proven. Full note: docs/status/luka.md · evidence: spikes/vision/.

## Next (max 5, in priority order)
1. Luka: present the vision conditional GO at the Sat 1 PM sync, then wrap the pipeline as `analyze(before, after) -> findings` (location TBD at sync). A close-up permanent-mark reshoot for a second damage type is next but not blocking.
2. Pablo: escrow contract in `contracts/` on Arc testnet; get faucet USDC first. Pass = one release tx link pasted here.
3. Marcus: clickable mock of the move-out report screen (mock JSON), then stub the 5 demo screens.
4. Everyone: push a branch tonight, even if WIP. As of Fri 8 PM PT there is no code on any branch.
5. Sat 1 PM sync (all): GO/NO-GO, confirm stack, agree docs/API.md + finding JSON schema, record with /decide.

## Milestones (our deadline: submitted Tue Nov 17, 11:59 PM PT · detail: docs/PLAN.md)
- Fri night: contract deployed + release tx; app scaffold + report screen; photos shot.
- Sat 1 PM: vision GO/NO-GO; API, schema and stack frozen (/decide). Sat night: Circle tx or fallback; server + vision packaged.
- Sun: pieces connected; first full run-through at 9 PM.
- Mon 2 PM: full demo path works end to end on testnet. Then hosting, judge-panel, fixes.
- Tue: freeze at noon, README + video, /submit-check, submit by 11:59 PM.
- Wed to Thu: buffer only (bug fixes, pitch drills). Sat 21: pitch in person.

## Blockers / open questions (for office hours, Telegram, or mentor)
- Verify AB 2801 effective dates and the bad-faith deposit penalty against the statute text before putting them in the pitch.
- No code pushed yet by anyone (Fri 8 PM PT); the Fri-night milestone is at risk.
- For the Sat 1 PM sync (from the vision spike): how to treat a tenant's own rug vs built-in carpet (the model calls area rugs belongings even when told otherwise); where the pipeline code lives (server/ vs integrations/); who owns the API.
- Open product decisions: where interest goes, who pays the fee, appeal window length, price-table costs in v1.

## Proven integrations (with evidence)
| Integration | Status | Evidence (tx sig / response / link) |
|---|---|---|
| Claude vision (claude-sonnet-5-5, structured JSON) | Conditional GO: 1 damage scene proven, 2nd pending | spikes/vision/results/run8_reshoot_closeup/p4_run1.json (damage/repaint @0.90, req_011Ch2MWf4fxn5qdcX69gCVR); summary: spikes/vision/README.md |

## Judge runs (date · Tech/UX/Innov/Impact/Demo · verdict)
-
