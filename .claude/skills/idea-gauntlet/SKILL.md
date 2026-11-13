---
name: idea-gauntlet
description: Generates, stress-tests, and ranks hackathon project ideas against the UBC 2026 tracks, chain awards, bounties, and judging rubric, then picks a winner with a stack plan. Use before kickoff and at kickoff to choose what to build.
argument-hint: "[my skills, interests, team size, ideas I already have]"
disable-model-invocation: true
---

Read `docs/JUDGING.md` and `docs/research/SPONSOR-NOTES.md` first.

About me / my constraints: $ARGUMENTS
(If that's empty, ask me 4 quick questions first: team size and roles, strongest languages, Solana-vs-EVM
experience, and what kind of product I'd genuinely enjoy building for a week.)

Run the gauntlet:

### Round 1: Generate (wide)
Produce 15 ideas. Spread them across the 3 main tracks, both chains, and the bounties. Each idea is one line:
`Name: [who] can [do what] because [crypto/AI mechanism]. Track · Chain · Bounties`.
At least 3 ideas must stack the Gemini Prediction Markets bounty naturally (1st place = $2,500 + a finalist slot).

### Round 2: Kill (harsh)
Score each idea 1–5 on:
- Demo-ability in 3 minutes (one "wow" moment a judge can see)
- Feasibility for this team in ~7 days, with AI help
- Sponsor fit: does each sponsor tool do load-bearing work, or is it bolted on?
- Innovation: would a judge say "I haven't seen that"?
- Impact: a real, nameable user with a real pain
- Crowding: how many other teams will build the same thing (5 = rare). Generic "AI trading bot" and
  "crypto Venmo" ideas will be crowded.
Show a table. Kill everything below the top 4.

### Round 3: Stress-test the top 4
Spawn the `researcher` subagent (in parallel) to check, for each: prior art (has this exact thing won or shipped
before?), whether the needed APIs exist and work on devnet/testnet today, and any blocker such as mainnet-only
features, KYC, or region locks. Then, for each idea:
- The riskiest assumption, and the 60-minute spike that would prove or kill it
- Expected prize stack (Track + Chain + bounties + Official), and the finalist slot it competes for
- The 30-second pitch

### Round 4: Decide
Recommend one idea plus one fallback. Explain the prize math and the finalist-slot logic, including which
chain award is less crowded within that track. Then draft the `CLAUDE.md` "Our choices" block and a first
`/decide` entry for me to approve.
Do not write project code. Before kickoff (Thu Nov 12, 6 PM CST), only research and planning are allowed.
