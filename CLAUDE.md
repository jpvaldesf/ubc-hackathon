# UBC 2026 Hackathon — Project Brain

You are my second teammate for the University Blockchain Conference 2026 hackathon.
Your job is to help me WIN, which means shipping a working, demoable, well-documented
project by the deadline, not writing the most code.

## Hard facts (do not get these wrong)
- Build window: Thu Nov 12, 6:00 PM CST → **Fri Nov 20, 12:00 PM CST** (= 10:00 AM PT). Submit on Devpost.
- Projects must be substantially built during the hackathon. No pre-existing project code.
- Exactly ONE main track, at most ONE chain award (Solana OR Arc, never both), any number of bounties.
- Finalists (≤13) pitch in person Sat Nov 21: **5 min pitch + 2 min Q&A**. Must be present in person to win anything.
- Judging criteria: Technical Execution · Product & UX · Innovation · Impact & Potential · Demo.
- Full requirement checklist: @docs/JUDGING.md

## Team (3 people; fill in names, keep current)
| Person | Lane | Owns these folders |
|---|---|---|
| NAME_1 | On-chain + backend | contracts/ or programs/, server/, shared/abi/, shared/addresses.json |
| NAME_2 | Frontend + product | app/ (or web/) |
| NAME_3 | Integrations + demo | integrations/, docs/, README.md, demo assets |

Team rules for every Claude session:
- Work only in the folders of the person running this session. For a change in another lane, write a short
  note in that person's `docs/status/<name>.md` under "Requests from others" instead of editing their files.
- Never push to `main`. Work on a branch (`feat/...`, `fix/...`), then open a pull request.
  Run the `security-auditor` subagent before opening it, and fill in `.github/pull_request_template.md`.
- Shared interfaces (`shared/abi/`, `shared/addresses.json`, the API shape in `docs/API.md`) change only with
  agreement at a team sync, recorded with `/decide`.
- Update your own `docs/status/<name>.md` after each task. Only edit the shared `docs/STATUS.md` for the demo path
  and team-level blockers.

## Our choices (fill in at kickoff, keep current)
- Project name: Deposit Keeper (working title)
- One-line pitch: Rental deposits held in a neutral USDC escrow on Arc; an AI compares move-in vs move-out photos and drafts the itemized deductions; the tenant gets the undisputed amount back the same day, the rest needs their OK or a ruling.
- Main track: Consumer
- Chain award: Arc
- Bounties: None
- Network: devnet/testnet ONLY. Never mainnet.

## Live state
@docs/STATUS.md
Per-person status: `docs/status/*.md` (read them with `cat docs/status/*.md`).
Architecture decisions live in @docs/DECISIONS.md. Read it before proposing a change that contradicts an earlier decision.

## Stack (fill in)
- Frontend: TBD
- Onchain: TBD (Anchor/Rust on Solana, or Foundry/Hardhat on Arc)
- Agent/backend: TBD
- Package manager & commands:
  - install: TBD
  - dev: TBD
  - test: TBD
  - build: TBD

## How we work
1. **Demo path first.** The single user journey shown in the demo video must work end-to-end
   before anything else gets polished. If a task doesn't move the demo path, say so.
2. **Never guess an SDK API.** For Solana, Arc, Circle, Gemini, QuickNode, or ElevenLabs code, look it up
   through the docs MCP servers (solana, arc-docs, circle, quicknode) or the `researcher` subagent first.
   These SDKs changed a lot in 2025–2026; your training data is likely stale.
3. **Spike before you build.** Any integration we haven't proven yet gets a time-boxed spike
   (`/spike`) in `spikes/` that produces a real tx signature or API response. Then integrate.
4. **Prove it onchain.** When you say something works onchain, show the tx signature / explorer link.
5. **Small commits**, conventional messages, one concern each. Commit after every working step.
6. **Secrets:** keys live only in `.env*` files and wallet keypair files, which you must never read,
   print, or commit. Use `.env.example` with placeholder names.
7. **Plan mode for anything over ~30 minutes of work.** Show me the plan, then build.
8. When you finish a task, update `docs/STATUS.md` (Done / Next / Blockers) in two or three lines.
9. When unsure about scope, ask: "Does this help us win a prize we're entered for?"

## Agents and skills available
- Subagents: `researcher`, `security-auditor`, `judge-panel`, `qa-demo-tester`
- Skills: `/standup`, `/idea-gauntlet`, `/spike`, `/judge`, `/submit-check`, `/pitch-drill`, `/demo-script`, `/decide`, `/readme`
