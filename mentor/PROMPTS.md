# Prompt library, by moment

## Mentor (Claude app, "UBC26 War Room" project)
**Pre-hack learning plan (now → Nov 12)**
> I'm leaning toward [track] on [chain]. I know [skills]. Build me a 4-evening learning plan using only official
> tutorials, so that at kickoff I can already: send a devnet/testnet USDC tx from code, call [bounty API], and
> deploy a hello-world [Anchor program / Foundry contract]. Use web search for current docs and link every step.

**Idea sanity check (after /idea-gauntlet)**
> Here are my top 2 ideas from the gauntlet: [paste]. Steelman each, then try to kill each one as the
> Solana rep, the Arc rep, and the Gemini sponsor would. Which one survives, and what single change would make it a clear finalist?

**Office-hours prep (Nov 16–19)**
> I have office hours with [sponsor] in an hour. Here's our STATUS.md and demo path: [paste]. Draft 4 questions that
> (1) unblock our riskiest integration, (2) confirm our use of their tool is "core" by their standard, and (3) learn
> what they'd love to see in a demo. Keep each under 25 words.

**Panic button**
> It's [time] and [X] is broken. The deadline is in [N] hours. Give me a triage plan: keep, cut, or mock (with
> disclosure). What's the smallest demo that still meets every requirement for our track, chain, and bounties?

## Builder (Claude Code, in the repo)
**Kickoff, hour 0**
> Read CLAUDE.md and docs/JUDGING.md. We're building [idea]. Enter plan mode. Propose: the demo path (5 steps),
> the architecture, the list of unproven integrations ranked by risk, and a spike order. Don't write code yet.

**Walking skeleton**
> Build the thinnest end-to-end version of the demo path: real onchain call, hardcoded everything else, ugly UI.
> Commit after each step works. Show me the tx signature at the end.

**Parallel sessions (git worktrees)**
> Create worktrees `../app-frontend`, `../app-onchain`, `../app-agent` on separate branches. First write the shared
> interface (types / IDL / ABI / API contract) to `shared/` on main and commit it. That is the only contract between sessions.

**Before every push**
> Run the security-auditor subagent on the diff since the last push. Fix critical/high issues, then push.

**Nightly**
> Run /judge. Then compare against yesterday's judge run in STATUS.md and tell me whether we're on track for the finalist cut.

## Pitch day
> /pitch-drill drill. Hardest questions first. Be the Arc rep (or the Solana rep), then the Gemini sponsor, then the UBC organizer.
