---
name: decide
description: Records an architecture or strategy decision in docs/DECISIONS.md (context, options, choice, why, revisit trigger). Use whenever we pick a chain, track, SDK, data source, or cut a feature.
argument-hint: "[the decision in a few words]"
---

Decision to record: $ARGUMENTS

1. If the options or the reasoning aren't clear from our conversation, ask me at most 2 questions.
2. Prepend an entry to `docs/DECISIONS.md` using the template in that file, numbered after the newest entry,
   with today's date and time.
3. If it changes track, chain award, bounties, or stack, update the "Our choices" / "Stack" block in `CLAUDE.md` too.
4. If it contradicts an earlier decision, say so explicitly and mark the old one "superseded by D-xxx".
