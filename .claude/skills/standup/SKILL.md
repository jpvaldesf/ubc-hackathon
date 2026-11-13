---
name: standup
description: Daily (or post-break) standup. Reads the clock, STATUS.md, recent commits, and open blockers, then proposes today's single goal and a time-boxed plan. Use at the start of each day, after sleeping, or whenever we feel lost.
allowed-tools:
  - Bash(bash .claude/hooks/countdown.sh)
  - Bash(git log *)
  - Bash(git status *)
  - Bash(cat docs/STATUS.md)
  - Bash(cat docs/status/*.md)
---

## Clock
!`bash .claude/hooks/countdown.sh`

## Recent work
!`git log --since="30 hours ago" --oneline 2>/dev/null || echo "(no git history yet)"`

!`git status --short 2>/dev/null | head -20 || true`

## Current status file
!`cat docs/STATUS.md 2>/dev/null || echo "(docs/STATUS.md missing)"`

## Per-person status (team of 3)
!`cat docs/status/*.md 2>/dev/null || echo "(no per-person status files yet)"`

## Your job
Act as a hackathon team lead running a 5-minute standup. Be direct.

1. **Yesterday, in one line:** what actually got proven (evidence only, not intentions).
2. **Risk check:** what's the single biggest threat to having a working demo by the deadline? Is there an
   unproven integration on the demo path? Are we behind the phase in the clock line above?
3. **Per person:** one line each on what they proved yesterday and their lane goal today; flag any
   "Requests from others" that block someone, and any interface change that needs a team decision.
4. **Today's ONE team goal:** a demoable outcome, written as "By tonight, a judge could ___".
5. **Plan:** 3–6 time-boxed blocks (e.g., "90 min: spike Nanopayments buyer flow"). Use the remaining hours
   honestly and leave 20% slack.
6. **Cut list:** what we explicitly will NOT do today.
7. **Office hours / sponsor questions** worth asking today, if any workshops are on (Solana and Circle run them Nov 16–19).

Then update `docs/STATUS.md`: set "Today's one goal", refresh "Next", and move finished items to "Done".
Ask me to confirm or adjust the plan before starting work.

Extra context from me (may be empty): $ARGUMENTS
