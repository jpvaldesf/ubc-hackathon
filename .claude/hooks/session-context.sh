#!/bin/bash
# SessionStart hook: injects the clock and current status into Claude's context
# at startup, resume, and after compaction, so the teammate never loses the plot.
DIR="${CLAUDE_PROJECT_DIR:-.}"
bash "$DIR/.claude/hooks/countdown.sh"
if [ -f "$DIR/docs/STATUS.md" ]; then
  echo "--- docs/STATUS.md (first 40 lines) ---"
  head -n 40 "$DIR/docs/STATUS.md"
fi
if git -C "$DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "--- last 5 commits ---"
  git -C "$DIR" log --oneline -5 2>/dev/null
fi
exit 0
