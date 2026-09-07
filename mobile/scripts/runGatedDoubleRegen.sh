#!/usr/bin/env bash
# Gated double-shift regeneration driver for one WordShift double-shift bank.
# Fork of runGatedReverseRegen.sh — loops scripts/generateGatedDoubleBank.test.ts.
# Usage: cd mobile && bash scripts/runGatedDoubleRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT>

set -u
BANK="${1:-}"
MODE="${2:-}"
case "$BANK" in
  EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT) ;;
  *) echo "Usage: bash scripts/runGatedDoubleRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT> [LEXICON]" >&2; exit 1 ;;
esac
cd "$(dirname "$0")/.." || exit 1

KEY="double_$(echo "$BANK" | tr '[:upper:]' '[:lower:]')"
LEXICON_ENV=""
if [ "$MODE" = "LEXICON" ]; then
  KEY="lexicon_${KEY}"
  LEXICON_ENV="1"
  TARGET=265
elif [ "$BANK" = "EXPERT" ]; then
  TARGET=265
else
  TARGET=500
fi
TARGET="${GATED_TARGET:-$TARGET}"
CHECKPOINT="src/data/.gatedRegenDouble_${KEY}_progress.json"
LOG="src/data/.gatedRegenDouble_${KEY}.log"
MIN_RUN_ACCEPTS=3
PLATEAU_RUNS=2
MAX_RUNS="${GATED_MAX_RUNS:-200}"

count_accepted() {
  node scripts/tools/gatedCheckpointCount.mjs "$CHECKPOINT"
}

start_count=$(count_accepted) || exit 1
echo "=== gated double driver: $BANK — starting at ${start_count}/${TARGET} ($(date -u +%FT%TZ)) ===" | tee -a "$LOG"
plateau=0; run=0
while :; do
  count=$(count_accepted) || exit 1
  if [ "$count" -ge "$TARGET" ]; then echo "FINAL: DOUBLE $BANK reached ${count}/${TARGET} after ${run} run(s)" | tee -a "$LOG"; exit 0; fi
  if [ "$run" -ge "$MAX_RUNS" ]; then echo "FINAL: DOUBLE $BANK stopped at ${count}/${TARGET} (MAX_RUNS)" | tee -a "$LOG"; exit 0; fi
  run=$((run + 1))
  echo "--- run $run: starting at ${count}/${TARGET} ($(date -u +%FT%TZ)) ---" >> "$LOG"
  GATED_BANK="$BANK" GATED_LEXICON="$LEXICON_ENV" GENERATOR_NO_YIELD=1 NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=650}" \
    npm test -- --runInBand --config scripts/jest.config.js --no-coverage --forceExit \
    --testTimeout 570000 scripts/generateGatedDoubleBank.test.ts >> "$LOG" 2>&1
  jest_status=$?
  if [ "$jest_status" -ne 0 ]; then echo "Gated generation failed (exit $jest_status); see $LOG" >&2; exit "$jest_status"; fi
  new_count=$(count_accepted) || exit 1
  accepted=$((new_count - count))
  echo "--- run $run: accepted ${accepted} (now ${new_count}/${TARGET}) ---" | tee -a "$LOG"
  if [ "$accepted" -lt "$MIN_RUN_ACCEPTS" ]; then plateau=$((plateau + 1)); else plateau=0; fi
  if [ "$plateau" -ge "$PLATEAU_RUNS" ]; then echo "FINAL: DOUBLE $BANK plateaued at ${new_count}/${TARGET} after ${run} runs" | tee -a "$LOG"; exit 0; fi
done
