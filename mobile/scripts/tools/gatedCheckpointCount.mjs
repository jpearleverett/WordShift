#!/usr/bin/env node
/** Driver count with the same policy fingerprint as the TypeScript harness. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const checkpoint = process.argv[2];
if (!checkpoint || process.argv.length !== 3) {
  console.error('Usage: node scripts/tools/gatedCheckpointCount.mjs <checkpoint-path>');
  process.exit(1);
}
const checkpointPath = path.resolve(root, checkpoint);
if (!fs.existsSync(checkpointPath)) {
  console.log(0);
} else {
  try {
    const data = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    const expected = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(root, 'src/data/vocabulary/puzzleVocabulary.ts')))
      .update('fresh-routes-v1').digest('hex');
    if (!Array.isArray(data.puzzles) || data.vocabularyPolicyHash !== expected) {
      throw new Error('Checkpoint vocabulary policy changed or checkpoint is malformed; run scripts/tools/prepareGatedTopUp.mjs for this bank.');
    }
    console.log(data.puzzles.length);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
