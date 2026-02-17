#!/bin/bash
# Runs all incomplete phases in parallel, each in its own loop.
# Each phase crashes and auto-restarts independently.
# Saves after each puzzle so no progress is lost.
#
# Usage: cd mobile && bash scripts/runReverseParallel.sh

export NODE_OPTIONS="--max-old-space-size=2048 --expose-gc --max-semi-space-size=64"
JEST_CMD="npx jest --config scripts/jest.config.js --no-coverage --testTimeout 600000 --maxWorkers=1"
SCRIPT="scripts/generateReversePuzzleBank.test.ts"

DATA_DIR="src/data"

declare -A TARGETS=( [0]=125 [1]=100 [2]=100 [3]=100 [4]=75 )

count_phase() {
  local phase=$1
  local file="${DATA_DIR}/.reverseBank_phase${phase}.json"
  if [ -f "$file" ]; then
    python3 -c "import json; print(len(json.load(open('$file'))))" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

run_phase() {
  local phase=$1
  local target=${TARGETS[$phase]}
  local logfile="/tmp/reverse_phase${phase}.log"

  echo "[Phase $phase] Starting (target: $target)" > "$logfile"

  while true; do
    local current=$(count_phase $phase)
    if [ "$current" -ge "$target" ]; then
      echo "[Phase $phase] COMPLETE ($current/$target)" >> "$logfile"
      echo "[Phase $phase] COMPLETE ($current/$target)"
      return 0
    fi

    echo "[Phase $phase] $current/$target — running batch..." >> "$logfile"
    $JEST_CMD -t "phase $phase" "$SCRIPT" >> "$logfile" 2>&1
    local new_count=$(count_phase $phase)
    local gained=$((new_count - current))
    echo "[Phase $phase] $new_count/$target (+$gained this run)" | tee -a "$logfile"
  done
}

echo "=== Parallel Reverse Puzzle Bank Generator ==="
echo "Starting all incomplete phases simultaneously..."
echo ""

# Show current state
for p in 0 1 2 3 4; do
  c=$(count_phase $p)
  t=${TARGETS[$p]}
  echo "Phase $p: $c/$t"
done
echo ""

# Launch each incomplete phase in background
PIDS=()
for phase in 0 1 2 3 4; do
  current=$(count_phase $phase)
  target=${TARGETS[$phase]}
  if [ "$current" -lt "$target" ]; then
    run_phase $phase &
    PIDS+=($!)
    echo "Launched Phase $phase (PID $!)"
  else
    echo "Phase $phase already complete"
  fi
done

echo ""
echo "Waiting for all phases to complete..."
echo "Monitor: tail -f /tmp/reverse_phase{1,2,3,4}.log"
echo ""

# Wait for all background jobs
for pid in "${PIDS[@]}"; do
  wait $pid
done

echo ""
echo "=== All phases complete! ==="
for p in 0 1 2 3 4; do
  c=$(count_phase $p)
  t=${TARGETS[$p]}
  echo "Phase $p: $c/$t"
done

echo ""
echo "Running merge step..."
$JEST_CMD -t "merge" "$SCRIPT" 2>&1 | grep -E "Phase|Wrote|Total|PASS" | head -10
echo "Done!"
