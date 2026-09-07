import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// A resumed sidecar cannot silently reintroduce words rejected by a newer
// policy. Old checkpoints must be reseeded through prepareGatedTopUp.mjs.
export const GATED_POLICY_HASH = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(__dirname, '../src/data/vocabulary/puzzleVocabulary.ts')))
  .update('fresh-routes-v1')
  .digest('hex');

export function validateGatedCheckpointPolicy(data: { vocabularyPolicyHash?: string }): void {
  if (data.vocabularyPolicyHash !== GATED_POLICY_HASH) {
    throw new Error('Checkpoint vocabulary policy changed. Run scripts/tools/prepareGatedTopUp.mjs for this bank before resuming.');
  }
}
