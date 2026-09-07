/** Structural/pacing audit; human voice and comprehension judgments stay editorial. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const filename = path.join(appRoot, 'src/services/dialogue/animalDialogueBase.ts');
const source = fs.readFileSync(filename, 'utf8');
const syntax = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
const rows = [];
function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const fields = {};
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) &&
          (ts.isStringLiteral(property.initializer) || ts.isNumericLiteral(property.initializer))) {
        fields[property.name.getText(syntax)] = property.initializer.text;
      }
    }
    if (fields.id && fields.text !== undefined && fields.animalType && fields.phase !== undefined) rows.push(fields);
  }
  ts.forEachChild(node, visit);
}
visit(syntax);
const animals = {};
const seen = new Set();
const problems = [];
for (const row of rows) {
  if (seen.has(row.id)) problems.push(`Duplicate dialogue ID: ${row.id}`);
  seen.add(row.id);
  const words = row.text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) problems.push(`Empty dialogue: ${row.id}`);
  if (words > 60) problems.push(`${row.id}: ${words} words; edit or split the speech before shipping (60-word review budget).`);
  const animal = animals[row.animalType] ??= { lines: 0, words: 0, longestSpeech: 0, phases: {} };
  animal.lines++;
  animal.words += words;
  animal.longestSpeech = Math.max(animal.longestSpeech, words);
  animal.phases[row.phase] = (animal.phases[row.phase] ?? 0) + 1;
}
for (const [name, animal] of Object.entries(animals)) {
  for (let phase = 0; phase <= 4; phase++) {
    if (!animal.phases[phase]) problems.push(`${name} has no phase-${phase} dialogue.`);
  }
}
if (Object.keys(animals).length !== 13) problems.push(`Expected the 13-resident roster, received ${Object.keys(animals).length}.`);
if (syntax.parseDiagnostics.length) problems.push('The dialogue module has syntax errors.');
const report = { baseDialogues: rows.length, uniqueIds: seen.size, residentCount: Object.keys(animals).length, animals, problems };
console.log(JSON.stringify(report, null, 2));
if (problems.length) process.exitCode = 1;
