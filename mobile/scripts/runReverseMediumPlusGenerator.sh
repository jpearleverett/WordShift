#!/bin/bash
# Runs the reverse MEDIUM_PLUS puzzle bank generator in batches until all phases are complete.
# Each invocation generates up to BATCH_SIZE (15) puzzles per phase to stay within
# memory limits, then the script re-runs for the same phase until target is met.
#
# Usage: cd mobile && bash scripts/runReverseMediumPlusGenerator.sh

set -e

JEST_CMD="npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1"
SCRIPT="scripts/generateReverseMediumPlusPuzzleBank.test.ts"

# Phase targets (must match generateReverseMediumPlusPuzzleBank.test.ts)
declare -A TARGETS=( [0]=125 [1]=100 [2]=100 [3]=100 [4]=75 )
TOTAL=500

DATA_DIR="src/data"

count_phase() {
  local phase=$1
  local file="${DATA_DIR}/.reverseMediumPlusBank_phase${phase}.json"
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

echo "=== Reverse MEDIUM_PLUS Puzzle Bank Generator ==="
echo "Target: $TOTAL puzzles (125/100/100/100/75)"
echo "Difficulty: MEDIUM_PLUS (5-letter words, 4 rows)"
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
echo "Done! Check src/data/puzzleBankReverseMediumPlus.ts"
