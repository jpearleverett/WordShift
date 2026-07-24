#!/usr/bin/env bash
# Long-haul orchestrator for the 6 REVERSE apex banks that were deferred to
# on-device at first ship: EXPERT reverse (6-letter, fair) + the 5 Lexicon
# reverse banks (rare + reverse-solvable — the scarcest supply, hours of
# generation). Runs up to MAX_JOBS concurrently; each bank is checkpointed +
# plateau-terminated by its own driver, so this is safe to re-invoke and
# resumes across container restarts (checkpoints live on disk).
#
# Usage: cd mobile && bash scripts/runReverseApexBanks.sh [MAX_JOBS]

set -u
cd "$(dirname "$0")/.." || exit 1
MAX_JOBS="${1:-4}"

JOBS=(
  "runGatedReverseRegen.sh EXPERT"
  "runGatedReverseRegen.sh EASY LEXICON"
  "runGatedReverseRegen.sh MEDIUM LEXICON"
  "runGatedReverseRegen.sh MEDIUM_PLUS LEXICON"
  "runGatedReverseRegen.sh HARD LEXICON"
  "runGatedReverseRegen.sh EXPERT LEXICON"
)

echo "=== reverse apex orchestrator: ${#JOBS[@]} banks, up to ${MAX_JOBS} concurrent ($(date -u +%FT%TZ)) ==="
running=0
for J in "${JOBS[@]}"; do
  bash scripts/$J &
  running=$((running + 1))
  echo "  launched: $J (pid $!)"
  if [ "$running" -ge "$MAX_JOBS" ]; then
    wait -n 2>/dev/null || wait
    running=$((running - 1))
  fi
done
wait
echo "=== reverse apex orchestrator: all banks done ($(date -u +%FT%TZ)) ==="
