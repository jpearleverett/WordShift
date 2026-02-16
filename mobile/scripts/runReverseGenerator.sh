#!/bin/bash
# Runs the reverse puzzle bank generator in batches until all phases are complete.
# Each invocation generates up to BATCH_SIZE (12) puzzles per phase to stay within
# memory limits, then the script re-runs for the same phase until target is met.
#
# Usage: cd mobile && bash scripts/runReverseGenerator.sh

set -e

JEST_CMD="npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1"
SCRIPT="scripts/generateReversePuzzleBank.test.ts"

# Phase targets (must match generateReversePuzzleBank.test.ts)
declare -A TARGETS=( [0]=125 [1]=100 [2]=100 [3]=100 [4]=75 )
TOTAL=500

DATA_DIR="src/data"

count_phase() {
  local phase=$1
  local file="${DATA_DIR}/.reverseBank_phase${phase}.json"
  if [ -f "$file" ]; then
    python3 -c "import json; print(len(json.load(open('$file'))))" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

total_count() {
  local sum=0
  for p in 0 1 2 3 4; do
    sum=$((sum + $(count_phase $p)))
  done
  echo $sum
}

echo "=== Reverse Puzzle Bank Generator ==="
echo "Target: $TOTAL puzzles (125/100/100/100/75)"
echo ""

for phase in 0 1 2 3 4; do
  target=${TARGETS[$phase]}
  current=$(count_phase $phase)

  while [ "$current" -lt "$target" ]; do
    echo "--- Phase $phase: $current/$target — running batch ---"
    $JEST_CMD -t "phase $phase" "$SCRIPT" 2>&1 | tail -5
    current=$(count_phase $phase)
    echo ""
  done

  echo "Phase $phase: COMPLETE ($current/$target)"
done

echo ""
echo "=== All phases complete! Total: $(total_count)/$TOTAL ==="
echo ""
echo "Running merge step..."
$JEST_CMD -t "merge" "$SCRIPT" 2>&1 | tail -10

echo ""
echo "Done! Check src/data/puzzleBankReverseHard.ts"
