/**
 * Guard: the scene dialogue's REGISTER, which is a narrative device and not a
 * style preference.
 *
 * The 2026-09-02 Dialogue Readability Pass repaired the house corpus
 * (animalDialogueBase.ts) and briefly made the reveal a GRAMMATICAL device:
 * residents contracted through phase 3 and stopped at phase 4. The owner
 * rejected that twice as "awkwardly formal" and "genuinely hard to
 * understand", so on 2026-09-24 residents contract at every phase, in the
 * scenes, the phase reactions and the house corpus alike. The reveal is now
 * carried by what the residents say, never by grammar.
 *
 * Three rules, each enforced below:
 *   1. A line's band is set by the phase its scene is DELIVERED at, never by
 *      the file it lives in. File-level rates are averages of a correct band
 *      and a broken one; chasing them damages finished work.
 *   2. NARRATION NEVER CONTRACTS, at any phase. The narrator is the fixed
 *      baseline the residents' turn is measured against. Contract narration
 *      at 0-3 and stop at 4 and the reader cannot tell whether the residents
 *      changed or the book did, and the device exists only in the diff.
 *   3. The PLAYER and the RESIDENTS contract at every phase, 4 and 5
 *      included.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const CONTRACTED = /\b(?:[A-Za-z]+n't|I'm|I've|I'll|I'd|you're|you've|you'll|you'd|we're|we've|we'll|we'd|they're|they've|they'll|they'd|it's|it'll|that's|that'll|there's|what's|who's|here's|he's|she's|he'd|she'd|he'll|she'll|let's)\b/gi;
const EXPANDED = /\b(?:I am|I have|I will|I would|you are|you have|you will|you would|we are|we have|we will|we would|they are|they will|it is|it will|that is|there is|what is|he is|she is|let us|do not|does not|did not|is not|are not|was not|were not|have not|has not|had not|will not|would not|could not|should not|cannot|must not)\b/gi;
const count = (text: string, re: RegExp) => (text.match(re) || []).length;

// The scene's delivery phase, from storySpine's own GATES table.
const SCENE_PHASE: Record<string, number> = {
  cup: 0, old_mark: 0,
  echo: 1, witness: 1, plum: 1, plum_recruited: 1,
  supper: 2, plan: 2, shelter: 2,
  record: 3,
  seeds: 4, promise: 4, returned: 4, council: 4,
  after: 5, reply: 5,
};

function spineLines(): { phase: number; kind: 'spoken' | 'narrator' | 'player'; text: string }[] {
  const src = read('services/storySpine.ts');
  const body = src.slice(
    src.indexOf('export function buildStoryScene'),
    src.indexOf('export async function openStoryScene'),
  );
  // ember(...) and say('<animal>', ...) are residents; narrator(...) and
  // say('player', ...) are the two bands that answer to their own rules.
  const SPOKEN = /(?:\bember\(|say\('(?!player)[a-z_]+',\s*)(["`'])((?:[^\\]|\\.)*?)\1/g;
  const NARRATOR = /\bnarrator\((["`'])((?:[^\\]|\\.)*?)\1/g;
  const PLAYER = /say\('player',\s*(["`'])((?:[^\\]|\\.)*?)\1/g;
  const out: { phase: number; kind: 'spoken' | 'narrator' | 'player'; text: string }[] = [];
  let scene: string | null = null;
  for (const line of body.split('\n')) {
    const header = /^\s*case '([a-z_]+)':/.exec(line);
    if (header) scene = header[1];
    if (!scene || SCENE_PHASE[scene] === undefined) continue;
    const phase = SCENE_PHASE[scene];
    for (const [re, kind] of [[SPOKEN, 'spoken'], [NARRATOR, 'narrator'], [PLAYER, 'player']] as const) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(line))) out.push({ phase, kind, text: match[2] });
    }
  }
  return out;
}

describe('the story spine speaks in its delivered band', () => {
  const lines = spineLines();

  it('finds every scene, so a silent parse failure cannot pass the suite', () => {
    // A regex that stops matching would make every assertion below vacuous.
    expect(lines.filter(l => l.kind === 'spoken').length).toBeGreaterThan(50);
    expect(lines.filter(l => l.kind === 'narrator').length).toBeGreaterThan(50);
    expect(new Set(lines.map(l => l.phase)).size).toBe(6);
  });

  it('contracts the residents through phase 3', () => {
    const text = lines.filter(l => l.kind === 'spoken' && l.phase <= 3).map(l => l.text).join(' | ');
    const contracted = count(text, CONTRACTED);
    const rate = contracted / (contracted + count(text, EXPANDED));
    // Measured 82%. The shortfall is entirely sites English forbids
    // contracting: stranded positive auxiliaries ("safer than it is."),
    // quoted written text ("I am afraid", whose own sentence counts three
    // words), and "this is" / "on it is", which have no spoken contraction.
    expect(rate).toBeGreaterThan(0.75);
  });

  it('keeps the residents contracting after the reveal too', () => {
    // The zero-contraction turn at the reveal was retired on the owner's
    // report (2026-09-24) that the phase-4 and phase-5 scenes read as
    // "awkwardly formal" and "genuinely hard to understand". Scenes are the
    // one place the story is read closely, so they speak plainly at every
    // phase; the reveal is carried by what the residents say, not by grammar.
    const text = lines.filter(l => l.kind === 'spoken' && l.phase >= 4).map(l => l.text).join(' | ');
    const contracted = count(text, CONTRACTED);
    expect(contracted / (contracted + count(text, EXPANDED))).toBeGreaterThan(0.75);
  });

  it('never contracts narration, at any phase', () => {
    const offenders = lines
      .filter(l => l.kind === 'narrator')
      .flatMap(l => (l.text.match(CONTRACTED) || []).map(hit => `${hit} :: ${l.text.slice(0, 80)}`));
    expect(offenders).toEqual([]);
  });
});

describe('the phase-3 choice scenes', () => {
  const block = (() => {
    const src = read('services/dialogueChoices.ts');
    return src.slice(src.indexOf('export const ANIMAL_CHOICES'), src.indexOf('// In-memory cache'));
  })();
  const field = (name: RegExp) => {
    const out: string[] = [];
    for (const line of block.split('\n')) {
      const match = new RegExp(`^\\s*"(${name.source})": "((?:[^"\\\\]|\\\\.)*)"`).exec(line);
      if (match) out.push(match[2]);
    }
    return out;
  };

  it('contracts what the resident and the player SAY', () => {
    const spoken = [...field(/ask/), ...field(/refuse/)];
    expect(spoken.length).toBeGreaterThan(40);
    const text = spoken.join(' | ');
    const contracted = count(text, CONTRACTED);
    expect(contracted / (contracted + count(text, EXPANDED))).toBeGreaterThan(0.8);
  });

  it('leaves the prompt and convergence stage directions expanded', () => {
    // Both are narration: the prompt sets the scene, the convergence is a
    // wordless action beat. Neither is anybody speaking.
    const narration = [...field(/prompt/), ...field(/convergence/)];
    expect(narration.length).toBeGreaterThan(20);
    expect(narration.flatMap(t => t.match(CONTRACTED) || [])).toEqual([]);
  });
});

describe('the phase-reaction lines speak like the scenes', () => {
  const src = read('services/phaseTransitionReactions.ts');
  // Each table is keyed by the phase the reaction answers.
  const byPhase = (table: string) => {
    const start = src.indexOf(table);
    const block = src.slice(start, src.indexOf('};', start));
    const out = new Map<number, string>();
    for (const line of block.split('\n')) {
      const match = /^\s*(\d): "((?:[^"\\]|\\.)*)"/.exec(line);
      if (match) out.set(Number(match[1]), match[2]);
    }
    return out;
  };

  for (const table of ['EMBER_REACTIONS', 'OTHER_REACTIONS']) {
    it(`${table} speaks plainly, with contractions, at every phase`, () => {
      const rows = byPhase(table);
      expect(rows.size).toBe(5);
      for (const [, text] of rows) expect(count(text, CONTRACTED)).toBeGreaterThan(0);
    });
  }
});

// The house corpus (regular visits, the post-Arrival pool and Tending) used to
// keep a zero-contraction register at phases 4-5 as a device. The owner found
// it "awkwardly formal" and hard to follow, so on 2026-09-24 it was brought
// into plain speech like the scenes. Possession ("I have the call") and quoted
// words (I AM AFRAID) still count as expanded, so the bar is a rate, not zero.
describe('the house corpus speaks plainly after the reveal', () => {
  const { getDialoguesForAnimal, ANIMAL_INFO } = require('../services/dialogue/animalDialogueBase');
  const { POST_REVELATION_DIALOGUES } = require('../services/dialogue/animalDialogueIntro');
  const { TENDING_DIALOGUES } = require('../services/dialogue/animalDialogueTending');
  const rate = (lines: string[]) => {
    const text = lines.join(' ');
    const contracted = count(text, CONTRACTED);
    return contracted / Math.max(1, contracted + count(text, EXPANDED));
  };
  const animals = Object.keys(ANIMAL_INFO);

  it('contracts the phase-4 visits', () => {
    const lines = animals.flatMap(animal => getDialoguesForAnimal(animal, 4))
      .filter((line: { phase: number }) => line.phase === 4).map((line: { text: string }) => line.text);
    expect(lines.length).toBe(13 * 30);
    expect(rate(lines)).toBeGreaterThan(0.85);
  });

  it('contracts the post-Arrival pool and the Tending lines', () => {
    expect(rate(Object.values(POST_REVELATION_DIALOGUES).flat() as string[])).toBeGreaterThan(0.85);
    expect(rate(Object.values(TENDING_DIALOGUES).flat() as string[])).toBeGreaterThan(0.85);
  });
});
