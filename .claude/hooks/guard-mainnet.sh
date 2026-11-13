#!/bin/bash
# PreToolUse hook for Bash: stops anything aimed at mainnet. The hackathon only needs devnet/testnet,
# and a mainnet mistake costs real money. If you truly need mainnet, run the command yourself.
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

if echo "$CMD" | grep -Eiq '(mainnet-beta|api\.mainnet|--url[= ]+(m|mainnet)( |$)|-u[= ]*m( |$)|solana config set .*mainnet|--network[= ]+mainnet|--chain[= ]+(mainnet|1|arc-mainnet)( |$)|eth-mainnet|mainnet\.infura|mainnet\.alchemy)'; then
  echo "BLOCKED by guard-mainnet: this command targets mainnet. Use devnet (Solana) or Arc testnet. If mainnet is really intended, the human must run it manually." >&2
  exit 2
fi
exit 0
