#!/usr/bin/env bash
# Orchestrator: generate the apex bank set — EXPERT (standard/reverse/double) +
# the 15 Lexicon rare-word banks (standard/reverse/double x 5 difficulties) — via
# the LEXICON mode of the three gated drivers. Runs up to MAX_JOBS banks
# concurrently (default 3) so a 4-core box is not thrashed. Each bank is
# checkpointed + plateau-terminated by its own driver, so this whole script is
# safe to re-invoke: finished banks exit immediately. Fast banks (standard +
# double fill in 1-2 runs) are scheduled first; reverse (slowest) last.
#
# Usage: cd mobile && bash scripts/runApexBanks.sh [MAX_JOBS]

set -u
cd "$(dirname "$0")/.." || exit 1
MAX_JOBS="${1:-4}"

DIFFS="EASY MEDIUM MEDIUM_PLUS HARD EXPERT"

JOBS=()
# EXPERT (a difficulty, fair vocabulary): standard + double are fast (no rarity
# grind). Lexicon standard + double (fast). Reverse last (slowest).
JOBS+=("runGatedRegen.sh EXPERT")
JOBS+=("runGatedDoubleRegen.sh EXPERT")
for D in $DIFFS; do JOBS+=("runGatedRegen.sh $D LEXICON"); done
for D in $DIFFS; do JOBS+=("runGatedDoubleRegen.sh $D LEXICON"); done
JOBS+=("runGatedReverseRegen.sh EXPERT")
for D in $DIFFS; do JOBS+=("runGatedReverseRegen.sh $D LEXICON"); done

echo "=== apex orchestrator: ${#JOBS[@]} banks, up to ${MAX_JOBS} concurrent ($(date -u +%FT%TZ)) ==="

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
echo "=== apex orchestrator: all banks done ($(date -u +%FT%TZ)) ==="
