---
name: judge
description: Runs the simulated UBC 2026 judging panel on the current state of the project and returns scores, disqualification risks, top fixes, and likely Q&A questions.
context: fork
agent: judge-panel
background: false
---

Judge the project in this repository as it stands right now.
Focus area or extra context from the team (may be empty): $ARGUMENTS
Then append a dated one-line score summary to the bottom of `docs/STATUS.md` under "Judge runs", so we can track progress.
