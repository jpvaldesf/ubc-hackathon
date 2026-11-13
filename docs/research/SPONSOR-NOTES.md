# Sponsor tooling notes (checked Nov 7, 2026; re-verify anything you build on)

## x402 (HTTP 402 pay-per-request)
- Open protocol: the server answers 402 with payment requirements, the client signs a payment and retries.
- Live on Base, Solana, and other chains; governed by the x402 Foundation (Linux Foundation) since Apr 2026.
- Packages: `@x402/evm` (EVM) and `@x402/svm` (Solana). Docs: https://x402.org · Solana: https://solana.com/x402
- Fits the Agentic Payments track directly ("agents that pay for APIs, data, or compute per request").

## Circle / Arc
- Arc public **mainnet launched Sep 16, 2026**; the hackathon allows testnet, and you should use testnet.
  EVM-compatible, USDC is the gas token, sub-second finality.
- Arc testnet: chain ID `5042002`, RPC `https://rpc.testnet.arc.network`, explorer `https://testnet.arcscan.app`.
  Consensus: permissioned validators running BFT (Malachite), with deterministic finality.
- ⚠ **USDC has two views on Arc that share ONE balance:** the native balance uses **18 decimals** (`eth_getBalance`,
  `msg.value`, gas math), while the ERC-20 interface at `0x3600000000000000000000000000000000000000` uses **6 decimals**
  (`balanceOf`, `transfer`). Pick one for app-level accounting (Circle recommends the ERC-20 interface) and convert carefully.
- Arc docs MCP (no auth): `https://docs.arc.network/mcp`
- Circle codegen MCP: `https://api.circle.com/v1/codegen/mcp` (Wallets, Contracts, CCTP, Bridge Kit, Gateway)
- Circle Skills plugin for Claude Code: `/plugin marketplace add circlefin/skills` then `/plugin install circle-skills@circle`
- **Nanopayments** (Circle Gateway): gas-free USDC payments down to $0.000001. The buyer signs EIP-3009
  authorizations offchain and Circle settles them in batches onchain; it follows x402.
  Starter kit: https://github.com/circlefin/arc-nanopayments (seller app + LangChain buyer agent + dashboard).
  Batching SDK: `@circle-fin/x402-batching`.
  ⚠ Earlier hackathon teams reported flaky Nanopayments testnet endpoints. Spike it on day 1 and keep a fallback
  (plain USDC transfer on Arc testnet).
- **Agent Wallets** (Circle Agent Stack, May 2026): operated through Circle CLI (`@circle-fin/cli`).
  ⚠ **Spending policies are mainnet-only; testnet rejects them.** For the hackathon, enforce budgets, allowlists, and
  approval thresholds in YOUR OWN code (or your own contract) and document them. That is also what the
  Agentic track asks you to show.

## Solana
- Official Solana Developer MCP (docs RAG + Anchor expert, read-only): `https://mcp.solana.com/mcp` (HTTP transport)
- Official skill: `npx skills add https://github.com/solana-foundation/solana-dev-skill`
  (framework-kit UI, `@solana/kit` SDK, Anchor/Pinocchio, LiteSVM/Mollusk tests, security patterns)
- Solana Agent Kit (SendAI): core package plus plugins (token, nft, defi, misc, blinks), with LangChain/Vercel AI
  adapters and an MCP adapter. Supports a `signOnly` mode, which helps with human-approval flows.
- Always say which SDK you mean: `@solana/web3.js` v1 and `@solana/kit` have very different APIs.

## Gemini Prediction Markets
- Docs: https://developer.gemini.com · LLM index: https://developer.gemini.com/llms.txt
- Public market data needs no key: `GET https://api.gemini.com/v1/prediction-markets/events?status=active&limit=50`,
  then `GET /v1/prediction-markets/events/{eventTicker}`. Live updates come over WebSocket `wss://ws.gemini.com`
  using the contract's `instrumentSymbol` (never construct symbols yourself).
- Private PM requests put the payload in the `X-GEMINI-PAYLOAD` header with an empty body; generic generated clients don't handle this.
- Sandbox: `https://api.sandbox.gemini.com` (creds from exchange.sandbox.gemini.com). The docs don't say whether
  **PM trading works in sandbox. Ask at Gemini office hours.**
- Tools: MCP server in `github.com/gemini/developer-platform/packages/mcp-server` (node; env `GEMINI_API_KEY`,
  `GEMINI_API_SECRET`, `GEMINI_BASE_URL`). Skills: `npx skills add gemini/developer-platform -a claude-code --all -y`
- Largest single bounty ($2.5k for 1st) and the only bounty whose winner gets a finalist pitch slot.

## QuickNode Streams
- QuickNode MCP (OAuth; manages Streams, webhooks, KV lists): `claude mcp add --transport http quicknode https://mcp.quicknode.com/mcp`, then `/mcp` to authorize.
- Bounty needs: at least one Stream **with a filter and a destination**, documented in the README.

## ElevenLabs
- Official MCP server: `elevenlabs-mcp` (Python, run with `uvx`; env `ELEVENLABS_API_KEY`). Good for generating
  demo narration and sound, and for prototyping voices.
- For the product itself, use the API/SDK or ElevenLabs Agents (conversational voice agents with tool calls).
  It must be a core feature, and the demo video must have audio.

## Grok Bot (xAI)
- Grok Bot: always-on agents with their own cloud computer, in beta since Aug 2026, with tighter X integration since Sep 2026.
- The bounty needs a Grok Bot chat export plus a 3–4 sentence README section. The X Premium perk link comes before the hackathon.
