# Luka: status (your Claude session updates this after each task)

**Lane:** AI vision + integrations + demo (integrations/, docs/, README.md, demo assets)
**Today's lane goal (Fri Nov 13):** Vision spike results on 5 photo pairs. GO/NO-GO at the Sat Nov 14, 1 PM sync (moved up from EOD).
**Full plan:** docs/PLAN.md (your section)
**Branch:** feat/vision-spike

## Done (with evidence: tx hash, PR link, screenshot)
- Fri Nov 13: picked the vision provider: Anthropic, `claude-sonnet-5-5` (researcher confirmed model ID + API).
- Fri Nov 13: vision spike, 8 runs. Result: **conditional GO** (note below). Evidence: `spikes/vision/results/`, `spikes/vision/README.md`.

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

## Next (max 3)
1. Sat 1 PM: present the conditional GO; settle the rug question, pipeline location, and API owner (record with /decide).
2. After the sync: wrap the pipeline as `analyze(before, after) -> findings` using the agreed finding JSON (add `no_change` per docs/PLAN.md), so Pablo's `POST /report` can call it.
3. Close-up reshoot of a permanent mark (marker on door/trim, or a stain on the built-in carpet), same spot for before/after; rerun the spike for a second damage type.

## Blocked by / waiting on
- Sat 1 PM sync decisions (pipeline location, API owner).

## Requests from others (teammates write here instead of editing your files)
-
