#!/bin/bash
# Prints where we are in the hackathon timeline. Portable (macOS + Linux): uses only `date +%s`.
KICKOFF=1794528000    # Thu Nov 12 2026, 6:00 PM CST (00:00 UTC Nov 13)
DEADLINE=1795197600   # Fri Nov 20 2026, 12:00 PM CST (18:00 UTC)
NOW=$(date +%s)

if [ "$NOW" -lt "$KICKOFF" ]; then
  H=$(( (KICKOFF - NOW) / 3600 ))
  echo "PRE-HACK: ${H}h until kickoff (Thu Nov 12, 6 PM CST / 4 PM PT). Setup, learning and research only; no project code yet."
elif [ "$NOW" -lt "$DEADLINE" ]; then
  LEFT=$(( (DEADLINE - NOW) / 3600 ))
  ELAPSED=$(( (NOW - KICKOFF) * 100 / (DEADLINE - KICKOFF) ))
  PHASE="BUILD"
  [ "$LEFT" -le 48 ] && PHASE="POLISH: feature freeze at T-36h; docs, video, submit-check"
  [ "$LEFT" -le 20 ] && PHASE="SHIP: bug fixes only; submit tonight"
  echo "HACK CLOCK: ${LEFT}h left until the Devpost deadline (Fri Nov 20, 12 PM CST / 10 AM PT). ${ELAPSED}% of the time used. Phase: ${PHASE}."
else
  echo "Submission deadline has passed. Focus: pitch rehearsal for Sat Nov 21 (5 min + 2 min Q&A)."
fi
