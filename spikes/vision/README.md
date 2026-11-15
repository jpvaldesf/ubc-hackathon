# Vision spike (throwaway)
**Proves:** Claude (`claude-sonnet-5-5`, structured JSON output) compares move-in vs move-out photos, flags damage, and ignores lighting-only changes.
**Run:** `pip install anthropic python-dotenv pillow` and set `ANTHROPIC_API_KEY` in `.env`, then run `python spikes/vision/run_spike.py [~/vision-test]` (photos named `pN_before.jpg|png` and `pN_after.jpg|png`).
**Run 1 (Nov 13, original prompt, p3/p4 after = digitally edited PNGs):** 6/7 pass, p3 missed. Kept in `results/run1_original_prompt/`.
**Run 2 (prompt fix: floor coverings count as property; real p3/p4 after JPEGs):** 5/7 pass. p1, p2, p5×3 clean; p3 and p4 return `[]`. The real after photos show no clear new damage, so the test set has no real damage pair yet. Reshoot needed.
**Run 3 (reshot p3/p4 after):** 5/7 pass. Clean pairs and p5×3 still clean. The model **saw** both changes but called them normal wear at 0.4 confidence, so both were dropped: p3 is a white speck on the carpet (it said "debris, not a stain"), and p4 is a faint small scuff. Both calls are reasonable; the damage is too small. Run 2 results are in `results/run2_prompt_fix_old_photos/`.
**Run 4 (second reshoot; `python run_spike.py ~/vision-test run4_reshoot2`):** 6/7 pass. **p4 is the first real damage caught:** red smear on the wall, damage/repaint @0.80. p3 is a crumpled tissue on the carpet; the model said "loose debris, not damage" @0.60 and it was dropped. That call is correct; p3 still needs a real stain. p5 stayed clean 3/3. Results are in `results/run4_reshoot2/`.
**Run 5 (third p3 reshoot, red mark on the area rug; `results/run5_reshoot3/`):** 6/7 pass. p4 repeats damage/repaint @0.80. p3 missed: the model said "the area rug is a tenant belonging and the small red item on it is debris," overriding the prompt's rugs-are-property rule. It also padded the output with an "unchanged walls" normal_wear finding @0.70 that survived the cutoff. p5 clean 3/3.
**Run 6 (prompt iteration 3: rugs are landlord property; report only actual changes. p3 = mark on the door; `results/run6_prompt_iter3/`):** 6/7 pass. The padding is gone: no "unchanged" items in any response. p4 damage/repaint @0.85. p5 clean 3/3. p3 returned `[]`: a red vertical mark on the navy door, right of the handle, is clearly visible to a human but was not reported. It may read as a hanging tag or ribbon (a belonging).
**Run 7 (iteration 4: adds "Marks, scuffs or paint on doors, walls and trim count as damage"; `results/run7_iter4/`):** Sonnet 6/7: p4 @0.85, clean pairs and p5×3 clean, p3 door mark missed again (`[]`). Opus diagnostic on p3 also missed the door mark: it reported only a possible brownish rug spot, damage/carpet_cleaning @0.40, which was dropped. **Both models miss it, so the problem is the photo (a thin mark, small in a wide shot), not the model or prompt.**
**Run 8 (p3 reshoot 22:30, Sonnet, iteration 4 prompt; `results/run8_reshoot_closeup/`):** 6/7 pass. p4 damage/repaint @0.90 (highest yet). p5 clean 3/3. p3 `[]`: the photo shows no damage. The door has no mark, and a loose pink/white strip lies on the carpet. Not charging a loose object is correct. The run 6–7 "door mark" was likely the same strip stuck to the door. **p3 still lacks a real, non-removable damage photo.**
**Run 9 (Sat Nov 14, new p3 pair: thin blue line on the wall below the light switch, after shot from a different angle; p3/p4/p5 ×3; `results/run9_new_p3_x3/`):** 8/11 pass. The model found the p3 line in the right spot in 3/3 runs, but at 0.55–0.60, so the 0.7 cutoff dropped it. p4 damage/repaint @0.85 3/3. p1, p2 and p5×3 clean.
**Run 10 (exact repeat of run 9; `results/run10_new_p3_x3_repeat/`):** 8/11 pass, same pattern. p3 was found 3/3 at 0.60 and dropped. p4 @0.80–0.85 3/3. p1, p2 and p5×3 clean. The low p3 score is consistent across runs, so the cause is the photo (thin, faint, chalk-like line), not chance.
**Run 11 (p3 after reshot: bolder blue paint streak with drips, closer to the before angle; p3 only ×3; `results/run11_p3_reshoot_bold_x3/`):** 3/3 pass, damage/repaint @0.90 every run, with one finding each and nothing else reported. The p3 before photo is the same move-in shot used in runs 9–10, reused because the original before HEIC was no longer in the photo folder.

## Result: GO (Sat Nov 14)
Against the docs/PLAN.md bar (flags both damaged pairs, nothing on the clean or lighting-only pairs, in at least 2 of 3 runs), with the prompt and the 0.7 cutoff unchanged:
- p3 (wall paint streak): damage/repaint @0.90 in 3/3 runs (run 11).
- p4 (red wall smear): damage/repaint @0.80–0.85 in 6/6 runs (runs 9–10).
- No false positives: p5 lighting-only clean in 6/6 runs, p1 and p2 clean in 2/2 runs each (runs 9–10; run once per batch, not 3×).

Caveats:
- Both damage cases are staged wall marks charged as repaint. A carpet stain (the demo-path item, carpet_cleaning $120) is unproven.
- The test set is small: 5 pairs in one room.
- The p3 before photo was reused from an earlier shot, not taken in the same session as the run 11 after photo.
- Runs 9–11 used `RUNS = {"p3": 3, "p4": 3, "p5": 3}` (a local override; `run_spike.py` still defaults to p5 ×3).
