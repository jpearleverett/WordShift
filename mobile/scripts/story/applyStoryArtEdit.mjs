/**
 * applyStoryArtEdit.mjs: install a reviewed retouch of one story illustration.
 *
 *   node scripts/story/applyStoryArtEdit.mjs <id> <edited.png> <note.json>
 *
 * Encodes the edited 960x540 frame exactly the way saveStoryArt.mjs encoded the
 * original (cover resize, parchment flatten, WebP q83 effort 4), replaces
 * assets/story/pages/<id>.webp atomically, and records the retouch in
 * scripts/story/generation/<id>.json (previous hash kept, model, prompt, cost)
 * and scripts/story/visual-review.json (new hash, `retouched` note). The note
 * JSON carries {model, mode, window, prompt, cost, attempts, review}.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const [id, edited, notePath] = process.argv.slice(2);
if (!/^[a-z0-9_-]+$/.test(id ?? '') || !edited || !fs.existsSync(edited)) throw new Error('Usage: applyStoryArtEdit.mjs <id> <edited.png> <note.json>');
const note = notePath ? JSON.parse(fs.readFileSync(notePath, 'utf8')) : {};
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'assets/story/pages', `${id}.webp`);
if (!fs.existsSync(output)) throw new Error(`No shipped illustration for ${id}`);
const previous = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
const temporary = `${output}.${process.pid}.tmp`;
await sharp(edited).resize(960, 540, { fit: 'cover' }).flatten({ background: '#f2e5bc' }).webp({ quality: 83, effort: 4 }).toFile(temporary);
fs.renameSync(temporary, output);
const bytes = fs.readFileSync(output);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

const metaPath = path.join(import.meta.dirname, 'generation', `${id}.json`);
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : { id };
const retouch = {
  tool: note.model ? `runpod public endpoint: ${note.model}` : 'editStoryArt.mjs',
  mode: note.mode ?? null, window: note.window ?? null, prompt: note.prompt ?? null,
  attempts: note.attempts ?? null, costUsd: note.cost ?? null, review: note.review ?? null,
  previousSha256: previous, editedAt: new Date().toISOString(),
};
const next = { ...meta, id, width: 960, height: 540, webpQuality: 83, encoderEffort: 4, flattenBackground: '#f2e5bc', bytes: bytes.length, sha256,
  retouches: [...(meta.retouches ?? []), retouch] };
fs.writeFileSync(`${metaPath}.tmp`, JSON.stringify(next, null, 2) + '\n');
fs.renameSync(`${metaPath}.tmp`, metaPath);

const reviewPath = path.join(import.meta.dirname, 'visual-review.json');
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const entry = review.reviews.find(item => item.id === id);
if (entry) {
  entry.sha256 = sha256; entry.status = 'pass'; entry.retouched = true;
  entry.note = note.review ?? entry.note;
}
fs.writeFileSync(`${reviewPath}.tmp`, JSON.stringify(review, null, 2) + '\n');
fs.renameSync(`${reviewPath}.tmp`, reviewPath);
console.log(JSON.stringify({ id, bytes: bytes.length, sha256, previous }));
