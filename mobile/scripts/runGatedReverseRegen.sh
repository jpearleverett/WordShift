#!/usr/bin/env bash
# Gated reverse-regeneration driver for one WordShift reverse bank.
# Reverse fork of runGatedRegen.sh — loops scripts/generateGatedReverseBank.test.ts
# until the target is reached or two consecutive runs plateau (< 3 accepts).
# Reverse banks are legitimately smaller (reverse-solvable chains are scarcer),
# so the plateau exit does most of the terminating.
#
# Usage: cd mobile && bash scripts/runGatedReverseRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT>

set -u

BANK="${1:-}"
MODE="${2:-}"
case "$BANK" in
  EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT) ;;
  *) echo "Usage: bash scripts/runGatedReverseRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT> [LEXICON]" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.." || exit 1

KEY="reverse_$(echo "$BANK" | tr '[:upper:]' '[:lower:]')"
LEXICON_ENV=""
if [ "$MODE" = "LEXICON" ]; then
  KEY="lexicon_${KEY}"
  LEXICON_ENV="1"
  TARGET=240
elif [ "$BANK" = "EXPERT" ]; then
  TARGET=355
else
  TARGET=500
fi
CHECKPOINT="src/data/.gatedRegenReverse_${KEY}_progress.json"
LOG="src/data/.gatedRegenReverse_${KEY}.log"
# Grind hard: rare-reverse supply is scarce, so only treat a run as a plateau
# when a full bounded run yields essentially nothing (a slow-but-nonzero run is
# still progress worth continuing over the multi-hour campaign).
MIN_RUN_ACCEPTS=2
PLATEAU_RUNS=3
MAX_RUNS=400

count_accepted() {
  node -e "
    try { const c = JSON.parse(require('fs').readFileSync('$CHECKPOINT', 'utf-8'));
      console.log(Array.isArray(c.puzzles) ? c.puzzles.length : 0); } catch { console.log(0); }
  "
}

start_count=$(count_accepted)
echo "=== gated reverse driver: $BANK — starting at ${start_count}/${TARGET} ($(date -u +%FT%TZ)) ===" | tee -a "$LOG"

plateau=0
run=0
while :; do
  count=$(count_accepted)
  if [ "$count" -ge "$TARGET" ]; then
    echo "FINAL: REVERSE $BANK reached ${count}/${TARGET} after ${run} run(s)" | tee -a "$LOG"; exit 0
  fi
  if [ "$run" -ge "$MAX_RUNS" ]; then
    echo "FINAL: REVERSE $BANK stopped at ${count}/${TARGET} after ${run} runs (MAX_RUNS)" | tee -a "$LOG"; exit 0
  fi

  run=$((run + 1))
  echo "--- run $run: starting at ${count}/${TARGET} ($(date -u +%FT%TZ)) ---" >> "$LOG"
  GATED_BANK="$BANK" GATED_LEXICON="$LEXICON_ENV" NODE_OPTIONS="--max-old-space-size=4096" \
    ./node_modules/.bin/jest --config scripts/jest.config.js --no-coverage --forceExit \
    --testTimeout 570000 scripts/generateGatedReverseBank.test.ts >> "$LOG" 2>&1

  new_count=$(count_accepted)
  accepted=$((new_count - count))
  echo "--- run $run: accepted ${accepted} (now ${new_count}/${TARGET}) ---" | tee -a "$LOG"

  if [ "$accepted" -lt "$MIN_RUN_ACCEPTS" ]; then plateau=$((plateau + 1)); else plateau=0; fi
  if [ "$plateau" -ge "$PLATEAU_RUNS" ]; then
    echo "FINAL: REVERSE $BANK plateaued at ${new_count}/${TARGET} after ${run} runs" | tee -a "$LOG"; exit 0
  fi
done
