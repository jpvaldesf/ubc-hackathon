# Luka: status (your Claude session updates this after each task)

**Lane:** AI vision + integrations + demo (integrations/, docs/, README.md, demo assets)
**Today's lane goal (Fri Nov 13):** Vision spike results on 5 photo pairs. GO/NO-GO at the Sat Nov 14, 1 PM sync (moved up from EOD).
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/vision-spike

## Done (with evidence: tx hash, PR link, screenshot)
-

## Next (max 3)
1. Fri night: shoot 5 before/after pairs (2 clean, 2 damaged, 1 lighting-only change) in a real room. These photos become the demo assets too.
2. Fri night → Sat: `/spike` in `spikes/vision/`: model returns JSON findings (region, damage vs normal wear, confidence, cost from a fixed price table). Pass = flags the 2 damaged pairs, nothing on the clean and lighting-only pairs. Look up the vision model API in docs first.
3. Sat 1 PM: GO/NO-GO note in docs/STATUS.md. If NO-GO, switch to Skin in the Game (D-001). If GO, wrap the pipeline as a Python function Pablo's server calls.

## Blocked by / waiting on
- Pick the vision model provider (needs an API key in .env).

## Requests from others (teammates write here instead of editing your files)
- Sat 2:30 PM, from Pablo: `analyze(pairs, price_table, on_progress=None) -> dict` per docs/API.md (D-005). Findings use `cost_cents` and `total_deduction_cents`; price table in cents (D-003). Demo deduction is $1.20 carpet stain + small nail holes as normal wear $0 (D-002, swap if something stages better). Please post your GO/NO-GO in docs/STATUS.md by 6 PM; the sync didn't happen.
