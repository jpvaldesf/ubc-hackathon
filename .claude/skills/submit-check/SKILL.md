---
name: submit-check
description: Audits the repo and submission against every UBC 2026 requirement (universal, track, chain award, bounties) and reports pass/fail with fixes. Use on Day 6 and again right before submitting on Devpost.
allowed-tools:
  - Bash(git ls-files *)
  - Bash(git log *)
  - Bash(bash .claude/hooks/countdown.sh)
---

## Clock
!`bash .claude/hooks/countdown.sh`

## Tracked files
!`git ls-files 2>/dev/null | head -300 || echo "(not a git repo yet)"`

## First commit (must be after kickoff, Thu Nov 12 2026, 6 PM CST)
!`git log --reverse --format="%h %ad %s" --date=iso 2>/dev/null | head -3 || true`

## Instructions
Read `CLAUDE.md` for our track, chain award, and bounties. Then go through `docs/JUDGING.md` and check **only the
sections that apply to us**, plus the universal list. For every checkbox, give:
`✅ / ❌ / ⚠️ | requirement | evidence (file + line, URL, or "not found") | fix`

Checks you must actually perform (don't assume):
- README has: setup instructions that work from a clean clone, an architecture overview (ideally a Mermaid
  diagram), and each track/chain/bounty-specific section (decision loop + safety limits; economic design + risk;
  program IDs / contract addresses; Stream network, dataset, filter, and destination; ElevenLabs products used;
  Grok Bot role + chat export).
- Every address or program ID in the README actually appears in code or config, and is a devnet/testnet one.
- `.env.example` exists and lists every env var the code reads (grep for `process.env` / `std::env` / `os.environ`).
- No secrets are tracked (spawn the `security-auditor` subagent for this part).
- Demo video link and deployed-app link are present in the README (ask me if they're missing).
- Devpost answers drafted to the 5 questions (draft them into `docs/DEVPOST.md` if they're missing).

End with: **Ready to submit: yes/no**, the blocking items, and the time each will take to fix.
