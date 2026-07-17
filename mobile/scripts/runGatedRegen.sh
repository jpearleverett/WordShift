#!/usr/bin/env bash
# Gated full-regeneration driver for one WordShift standard bank.
#
# Loops scripts/generateGatedBank.test.ts (each run self-bounds to ~9 minutes
# via its internal deadline and finalizes the sidecar before the jest
# --testTimeout 570000 can kill it) until either:
#   - the checkpoint shows the 500-puzzle target reached, or
#   - two consecutive runs each accept fewer than 3 puzzles (plateau).
# Safe to re-invoke: every run resumes from the per-accept checkpoint.
#
# Per-run progress (full jest output + a summary line) is appended to
# src/data/.gatedRegen_<bank>.log so the campaign is observable while running.
#
# Usage: cd mobile && bash scripts/runGatedRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD>

set -u

BANK="${1:-}"
case "$BANK" in
  EASY|MEDIUM|MEDIUM_PLUS|HARD) ;;
  *)
    echo "Usage: bash scripts/runGatedRegen.sh <EASY|MEDIUM|MEDIUM_PLUS|HARD>" >&2
    exit 1
    ;;
esac

# Run from mobile/ regardless of invocation directory.
cd "$(dirname "$0")/.." || exit 1

KEY=$(echo "$BANK" | tr '[:upper:]' '[:lower:]')
CHECKPOINT="src/data/.gatedRegen_${KEY}_progress.json"
LOG="src/data/.gatedRegen_${KEY}.log"
TARGET=500
MIN_RUN_ACCEPTS=3   # a run accepting fewer than this counts toward the plateau
PLATEAU_RUNS=2      # consecutive sub-minimum runs that end the campaign
MAX_RUNS=200        # hard safety valve; never expected to bind

count_accepted() {
  node -e "
    try {
      const c = JSON.parse(require('fs').readFileSync('$CHECKPOINT', 'utf-8'));
      console.log(Array.isArray(c.puzzles) ? c.puzzles.length : 0);
    } catch { console.log(0); }
  "
}

start_count=$(count_accepted)
echo "=== gated regen driver: $BANK — starting at ${start_count}/${TARGET} ($(date -u +%FT%TZ)) ===" | tee -a "$LOG"

plateau=0
run=0
while :; do
  count=$(count_accepted)
  if [ "$count" -ge "$TARGET" ]; then
    echo "FINAL: $BANK reached ${count}/${TARGET} after ${run} run(s)" | tee -a "$LOG"
    exit 0
  fi
  if [ "$run" -ge "$MAX_RUNS" ]; then
    echo "FINAL: $BANK stopped at ${count}/${TARGET} after ${run} runs (MAX_RUNS safety valve)" | tee -a "$LOG"
    exit 0
  fi

  run=$((run + 1))
  echo "--- run $run: starting at ${count}/${TARGET} ($(date -u +%FT%TZ)) ---" >> "$LOG"

  # Each run is bounded ~9.5 minutes wall clock: the generator's own internal
  # deadline (default GATED_RUN_MS=540000) finalizes the sidecar before jest's
  # 570s testTimeout can kill the process (finalize-before-jest-deadline).
  GATED_BANK="$BANK" NODE_OPTIONS="--max-old-space-size=4096" \
    ./node_modules/.bin/jest --config scripts/jest.config.js --no-coverage --forceExit \
    --testTimeout 570000 scripts/generateGatedBank.test.ts >> "$LOG" 2>&1
  jest_status=$?

  new_count=$(count_accepted)
  accepted=$((new_count - count))
  echo "--- run $run: accepted ${accepted} (now ${new_count}/${TARGET}, jest exit ${jest_status}) ---" | tee -a "$LOG"

  if [ "$accepted" -lt "$MIN_RUN_ACCEPTS" ]; then
    plateau=$((plateau + 1))
  else
    plateau=0
  fi
  if [ "$plateau" -ge "$PLATEAU_RUNS" ]; then
    echo "FINAL: $BANK plateaued at ${new_count}/${TARGET} after ${run} runs (${PLATEAU_RUNS} consecutive runs accepted < ${MIN_RUN_ACCEPTS})" | tee -a "$LOG"
    exit 0
  fi
done
