# Judging rubric and submission checklist (from the UBC 26 Hackathon Guide)

## What judges score (all categories)
| Criterion | What they look for | How we win it |
|---|---|---|
| Technical Execution | Functionality, technical depth, effective use of blockchain infra | Real txs on devnet/testnet, nothing faked, one non-trivial onchain piece |
| Product & UX | Clear problem, intuitive experience, quality | One polished user journey > five half-built ones |
| Innovation | Originality and creativity | A "why hasn't anyone done this" angle we can state in one sentence |
| Impact & Potential | Real-world usefulness, adoption, viability | A named user, a believable first 100 users, a business model line |
| Demo | Quality of live demo, clear communication | Rehearsed, timed, with a backup recording |

## Who decides what
- Track Winner: a UBC team representative (within each track)
- Best use of Solana: a Solana representative · Best use of Arc: an Arc representative
- Official UBC Winner 1st/2nd/3rd: the UBC team
- Bounties: the sponsor + a UBC team representative
- Finalists (≤13): top contender for Track Winner, Solana, and Arc in each of 3 tracks (9), the top 3 overall, and the 1st-place Gemini team.

## Universal "What to Submit" (missing any item = no prize, not even participation)
- [ ] Project name, short description, all team members
- [ ] Main track (one), chain award (Solana / Arc / None), every bounty — selected AND opted in on Devpost
- [ ] Written answers: What did you build? What problem does it solve? How does it work? What makes it unique? What would you build next?
- [ ] Technologies / sponsor tools used
- [ ] Public GitHub repo with source + setup instructions, built during the hackathon
- [ ] Working demo or deployed app (link)
- [ ] 2–3 min demo video (YouTube or Google Drive), **accessible to judges** (check in an incognito window)
- [ ] README with technical documentation / architecture overview
- [ ] All track-, chain- and bounty-specific requirements below

## Track-specific
### Agentic Payments and AI
- [ ] Agent executes onchain transactions or reads the chain (devnet/testnet OK)
- [ ] README documents the agent's **decision loop** and the **safety limits** (budgets, allowlists, human approval)
- Recommended tools: x402, Circle Agent Wallets or Nanopayments, Solana Agent Kit

### DeFi and Onchain Applications
- [ ] Interacts with smart contracts (deploying your own is optional)
- [ ] README explains **economic design and risk assumptions**
- [ ] README lists the **address of every program/contract** deployed or used

### Consumer Applications
- [ ] Interacts with the blockchain in some way
- [ ] Working, user-facing frontend (web or mobile); crypto should be invisible (no seed phrases, gas, bridging)

## Chain awards (pick at most one)
### Best use of Solana
- [ ] Core onchain functionality on Solana (devnet OK)
- [ ] README: program ID(s) deployed or used + how the project uses Solana
- Plus points: Anchor or native Rust, SPL / Token Extensions / Solana Pay, existing Solana protocols, smooth wallet UX

### Best use of Arc
- [ ] Core onchain functionality on Arc (testnet OK)
- [ ] README: contract address(es) + how the project uses Arc
- Plus points: USDC-as-gas for predictable fees, Foundry/Hardhat, Circle Wallets / CCTP / Gateway / Paymaster

## Bounties
### Gemini Prediction Markets ($2,500 / $1,000 / $500, and 1st place gets a finalist slot)
- [ ] Uses the Gemini Prediction Markets API (market data and/or trading)

### ElevenLabs
- [ ] ElevenLabs API/SDK is a **core feature, not an add-on**
- [ ] Demo video shows the integration **with audio**
- [ ] README says which ElevenLabs products are used and how

### QuickNode Streams ($500)
- [ ] Streams is a core data source
- [ ] At least one Stream configured with a **filter and a destination** (webhook / DB)
- [ ] README explains the Stream config: network, dataset, filter logic, destination, and why

### Grok Bot
- [ ] Grok Bot is a core part of the project
- [ ] **Grok Bot chat export** included
- [ ] Short README section (3–4 sentences) on Grok Bot's role
- [ ] Working and technically sound

## Logistics
- [ ] Submitted before **Fri Nov 20, 12:00 PM CST (10:00 AM PT)**; aim for Thu night
- [ ] Watch for the finalist email by Fri Nov 20, 11:59 PM CST
- [ ] In person for judging and the closing ceremony, Sat Nov 21
