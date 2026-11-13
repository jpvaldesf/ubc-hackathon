#!/bin/bash
# PreToolUse hook for Read|Edit|Write|Bash.
# Blocks: touching secret files, writing key material into files, and `git add`/`git commit`
# commands that would stage secret files. Exit 2 = block, and stderr goes back to Claude.
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
CONTENT=$(echo "$INPUT" | jq -r '(.tool_input.content // "") + (.tool_input.new_string // "")')
FILE="${FILE//\\//}"

block() { echo "BLOCKED by guard-secrets: $1" >&2; exit 2; }

is_secret_path() {
  case "$1" in
    *.env.example|*.env.sample|*.env.template) return 1 ;;
    *.env|*.env.*|*/.env|*/wallets/*|wallets/*|*id.json|*keypair*.json|*-keypair.json|*.pem|*.key|*/.config/solana/*|*mnemonic*|*seed-phrase*) return 0 ;;
  esac
  return 1
}

# 1) Reading or editing secret files
if [ -n "$FILE" ] && is_secret_path "$FILE"; then
  block "$FILE looks like a secret or keypair file. Use .env.example with placeholder names; ask the human to set real values."
fi

# 2) Writing key material into any file
if [ "$TOOL" = "Write" ] || [ "$TOOL" = "Edit" ]; then
  if echo "$CONTENT" | grep -Eq -- '-----BEGIN (EC |RSA |OPENSSH )?PRIVATE KEY-----'; then
    block "content contains a PEM private key."
  fi
  if echo "$CONTENT" | grep -Eq '(PRIVATE_KEY|SECRET|API_KEY|MNEMONIC)[A-Z_]*[[:space:]]*[:=][[:space:]]*["'"'"']?(0x)?[A-Fa-f0-9]{64}'; then
    block "content assigns what looks like a real 32-byte hex private key. Read it from process.env instead."
  fi
  if echo "$CONTENT" | grep -Eq '\[([[:space:]]*[0-9]{1,3}[[:space:]]*,){63}[[:space:]]*[0-9]{1,3}[[:space:]]*\]'; then
    block "content contains a 64-byte array that looks like a Solana secret key."
  fi
fi

# 3) Shell commands that dump or stage secrets
if [ "$TOOL" = "Bash" ] && [ -n "$CMD" ]; then
  if echo "$CMD" | grep -Eq '(cat|less|more|head|tail|bat|printenv)[^|;&]*(\.env([^.a-z]|$)|id\.json|keypair)'; then
    block "command would print a secret file. Ask the human to check it themselves."
  fi
  if echo "$CMD" | grep -Eq 'git (add|commit)[^|;&]*(-A|--all|\.( |$))'; then
    STAGED=$(git ls-files --others --exclude-standard 2>/dev/null; git diff --name-only 2>/dev/null)
    for f in $STAGED; do
      if is_secret_path "$f"; then
        block "'$f' would be staged. Add it to .gitignore first."
      fi
    done
  fi
  if echo "$CMD" | grep -Eq 'git add[^|;&]*(\.env([^.a-z]|$)|id\.json|keypair)'; then
    block "refusing to stage a secret or keypair file."
  fi
fi
exit 0
