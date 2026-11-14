# Luka: status (your Claude session updates this after each task)

**Lane:** AI vision + integrations + demo (integrations/, docs/, README.md, demo assets)
**Today's lane goal (Fri Nov 13):** Vision spike results on 5 photo pairs. GO/NO-GO is due Sat Nov 14 end of day (D-001).
**Branch:** feat/vision-spike

## Done (with evidence: tx hash, PR link, screenshot)
-

## Next (max 3)
1. Fri night: shoot 5 before/after pairs (2 clean, 2 damaged, 1 lighting-only change) in a real room. These photos become the demo assets too.
2. Fri night → Sat: `/spike` in `spikes/vision/`: model returns JSON findings (region, damage vs normal wear, confidence, cost from a fixed price table). Pass = flags the 2 damaged pairs, nothing on the clean and lighting-only pairs. Look up the vision model API in docs first.
3. Sat EOD: GO/NO-GO note in docs/STATUS.md. If NO-GO, switch to Skin in the Game (D-001). If GO, wrap the pipeline as a Python function Pablo's server calls.

## Blocked by / waiting on
- Pick the vision model provider (needs an API key in .env).

## Requests from others (teammates write here instead of editing your files)
-
