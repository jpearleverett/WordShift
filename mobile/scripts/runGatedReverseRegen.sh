#!/usr/bin/env bash
# Gated reverse-regeneration driver for one WordShift reverse bank.
# Reverse fork of runGatedRegen.sh — loops scripts/generateGatedReverseBank.test.ts
# until the target is reached or two consecutive runs plateau (< 3 accepts).
# Reverse banks are legitimately smaller (reverse-solvable chains are scarcer),
# so the plateau exit does most of the terminating.
#
# Usage: cd mobile && bash scripts/runGatedReverseRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD>

set -u

BANK="${1:-}"
case "$BANK" in
  EASY|MEDIUM|MEDIUM_PLUS|HARD) ;;
  *) echo "Usage: bash scripts/runGatedReverseRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD>" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.." || exit 1

KEY="reverse_$(echo "$BANK" | tr '[:upper:]' '[:lower:]')"
CHECKPOINT="src/data/.gatedRegenReverse_${KEY}_progress.json"
LOG="src/data/.gatedRegenReverse_${KEY}.log"
TARGET=500
MIN_RUN_ACCEPTS=3
PLATEAU_RUNS=2
MAX_RUNS=200

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
  GATED_BANK="$BANK" NODE_OPTIONS="--max-old-space-size=4096" \
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
