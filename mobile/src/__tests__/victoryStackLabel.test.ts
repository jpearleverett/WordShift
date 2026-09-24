/**
 * The victory receipt names the full stack (EXPERT + a style + all four
 * modifiers) the way the setup menu's emblem does, instead of calling its
 * trial line the "Maximal Offering" that Blind + Challenge alone earns.
 */
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('the full stack is named on the victory receipt', () => {
  it('carries the maxStack flag from the recorded win into the victory data', () => {
    const persistence = flat(read('services/victoryPersistence.ts'));
    expect(persistence).toMatch(/undoLimited, maxStack, surpriseBonus: amberResult\.surpriseBonus/);
  });

  it('labels the trial line with the emblem name before the Blind/Challenge names', () => {
    const modal = flat(read('components/puzzle/VictoryModal.tsx'));
    const at = modal.indexOf('victoryData.maxStack');
    expect(at).toBeGreaterThan(-1);
    const line = modal.slice(at, at + 400);
    expect(line).toContain("'The Full Arrangement'");
    expect(line).toContain("'The Full Stack'");
    expect(line.indexOf("'The Full Arrangement'")).toBeLessThan(line.indexOf("'Maximal Offering'"));
    // Same names as the setup menu's emblem for the same loadout.
    const menu = read('components/puzzle/DifficultyMenu.tsx');
    expect(menu).toContain("'THE FULL ARRANGEMENT' : 'THE FULL STACK'");
  });
});
