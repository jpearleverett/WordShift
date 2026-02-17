#!/bin/bash
# Runs the reverse puzzle bank generator with large heap to avoid segfaults.
# Uses batch size 6 with NODE_OPTIONS for 8GB heap.
#
# Usage: cd mobile && bash scripts/runReverseGeneratorSafe.sh

export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"
JEST_CMD="npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1"
SCRIPT="scripts/generateReversePuzzleBank.test.ts"

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

echo "=== Reverse Puzzle Bank Generator (Safe Mode) ==="
echo "Target: $TOTAL puzzles | Heap: 8GB | Batch: 6"
echo ""

for phase in 0 1 2 3 4; do
  target=${TARGETS[$phase]}
  current=$(count_phase $phase)

  while [ "$current" -lt "$target" ]; do
    echo "--- Phase $phase: $current/$target — running batch ---"
    $JEST_CMD -t "phase $phase" "$SCRIPT" 2>&1 | grep -E "Phase|PASS|FAIL|Time:" | head -5
    current=$(count_phase $phase)
    echo ""
  done

  echo "Phase $phase: COMPLETE ($current/$target)"
done

echo ""
echo "=== All phases complete! ==="
echo "Running merge step..."
$JEST_CMD -t "merge" "$SCRIPT" 2>&1 | grep -E "Phase|Wrote|Total|PASS" | head -10

echo ""
echo "Done! Check src/data/puzzleBankReverseHard.ts"
