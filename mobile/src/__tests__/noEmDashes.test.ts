/**
 * Guard: no em dashes (U+2014) or en dashes (U+2013) in player-facing text.
 *
 * Product decision: all player copy uses ellipses, commas, or sentence splits
 * instead of em/en dashes. This test makes the rule permanent two ways:
 *
 *  1. Runtime sweep — iterates the REAL exported content tables (dialogue for
 *     every animal and phase, Phase-2 extras, intros, post-revelation and
 *     tending pools, narrative seeds, coordinated events, room descriptions,
 *     achievements, quest templates, onboarding lines, store products, ...)
 *     plus a matrix of phaseNarrative/notification getters called across
 *     phases 0-5 with representative args and a deterministic Math.random
 *     sweep so random-pool picks are all visited.
 *
 *  2. Source sweep — AST-parses every non-test source file under src/ (plus
 *     App.tsx) and asserts no string literal, template literal, or JSX text
 *     contains a dash. Comments are allowed. This catches non-exported tables
 *     (micro-beats, trigger reactions, hint templates) and future additions.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { AnimalType, DialoguePhase } from '../types/homeWorld';
import {
  getDialoguesForAnimal,
  PHASE2_EXTRA_DIALOGUES,
  ANIMAL_INFO,
} from '../services/dialogue/animalDialogueBase';
import {
  INTRO_DIALOGUES,
  POST_REVELATION_DIALOGUES,
  CATCHUP_INTRO_DIALOGUES,
} from '../services/dialogue/animalDialogueIntro';
import {
  CROSS_ANIMAL_REFERENCES,
  COORDINATED_EVENTS,
  TUTORIAL_CALLBACK_DIALOGUES,
  NARRATIVE_SEEDS,
} from '../services/dialogue/animalDialogueNarrative';
import { WORD_THRESHOLD_DIALOGUES } from '../services/dialogue/animalDialogueReactions';
import { TENDING_DIALOGUES } from '../services/dialogue/animalDialogueTending';
import { buildPhase5Pool } from '../services/dialogue/phase5Pool';
import { ANIMAL_CHOICES } from '../services/dialogueChoices';
import { ONBOARDING_FOX_LINES } from '../services/onboarding';
import {
  ROOM_DESCRIPTIONS,
  ROOMS,
  ANIMALS,
  UNLOCK_PROGRESSION,
  getReservedArrivalText,
  getReserveGateText,
} from '../services/homeWorldData';
import { ACHIEVEMENTS } from '../services/achievements';
import { DAILY_QUEST_POOL, WEEKLY_QUEST_POOL } from '../services/weeklyQuests';
import { CONSUMABLE_PRODUCTS } from '../services/iap';
import {
  getNotificationMessage,
  getStreakRiskMessage,
  getQuestExpiryMessage,
} from '../services/notifications';
import * as phaseNarrative from '../services/phaseNarrative';
import * as phaseEvents from '../services/phaseEvents';

jest.mock('../services/eventLogger');
jest.mock(
  'expo-notifications',
  () => {
    throw new Error('unavailable in tests');
  },
  { virtual: true }
);

const DASH_RE = /[–—]/;

const ANIMAL_TYPES: AnimalType[] = [
  'fox',
  'pangolin',
  'owl',
  'axolotl',
  'capybara',
  'fennec_fox',
  'sloth',
  'wombat',
  'rabbit',
  'red_panda',
];
const PHASES: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

/** Recursively collect every string reachable from a value. */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, depth + 1);
    return;
  }
  // Skip promises / thenables (async getters are exercised separately).
  if (typeof (value as { then?: unknown }).then === 'function') return;
  for (const v of Object.values(value as Record<string, unknown>)) {
    collectStrings(v, out, depth + 1);
  }
}

function offendersIn(strings: string[]): string[] {
  return strings.filter(s => DASH_RE.test(s));
}

describe('no em/en dashes in player-facing text', () => {
  test('dialogue content tables are dash-free', () => {
    const strings: string[] = [];

    // Full dialogue set: every animal, every phase (covers ALL_DIALOGUES).
    for (const animal of ANIMAL_TYPES) {
      for (const d of getDialoguesForAnimal(animal, 5)) {
        strings.push(d.text);
      }
    }
    collectStrings(PHASE2_EXTRA_DIALOGUES, strings);
    collectStrings(ANIMAL_INFO, strings);
    collectStrings(INTRO_DIALOGUES, strings);
    collectStrings(POST_REVELATION_DIALOGUES, strings);
    collectStrings(CATCHUP_INTRO_DIALOGUES, strings);
    collectStrings(CROSS_ANIMAL_REFERENCES, strings);
    collectStrings(COORDINATED_EVENTS, strings);
    collectStrings(TUTORIAL_CALLBACK_DIALOGUES, strings);
    collectStrings(NARRATIVE_SEEDS, strings);
    collectStrings(WORD_THRESHOLD_DIALOGUES, strings);
    collectStrings(TENDING_DIALOGUES, strings);
    collectStrings(ANIMAL_CHOICES, strings);

    // Phase-5 pool across representative configs (base + choice + tending).
    for (const animal of ANIMAL_TYPES) {
      for (const tendingLevel of [0, 5, 25, 100]) {
        for (const choice of [null, 'ask', 'refuse'] as const) {
          collectStrings(buildPhase5Pool(animal, tendingLevel, choice), strings);
        }
      }
    }

    expect(strings.length).toBeGreaterThan(900); // sanity: content actually loaded
    expect(offendersIn(strings)).toEqual([]);
  });

  test('home world, achievements, quests, onboarding, store copy are dash-free', () => {
    const strings: string[] = [];
    collectStrings(ROOM_DESCRIPTIONS, strings);
    collectStrings(ROOMS, strings);
    collectStrings(ANIMALS, strings);
    collectStrings(UNLOCK_PROGRESSION, strings);
    strings.push(getReservedArrivalText(42, 35), getReservedArrivalText(undefined, 35));
    strings.push(getReserveGateText(42, 35), getReserveGateText(undefined, 35));
    for (const a of ACHIEVEMENTS) strings.push(a.title, a.description);
    collectStrings(DAILY_QUEST_POOL, strings);
    collectStrings(WEEKLY_QUEST_POOL, strings);
    collectStrings(ONBOARDING_FOX_LINES, strings);
    collectStrings(CONSUMABLE_PRODUCTS, strings);
    collectStrings(phaseEvents.HOUSE_COMPLETION_EVENT, strings);
    collectStrings(phaseEvents.FINAL_PUZZLE_EVENT, strings);
    collectStrings(phaseEvents.POST_REVELATION_EVENT, strings);
    collectStrings(phaseEvents.NEW_CYCLE_EVENT, strings);
    for (const p of PHASES) {
      collectStrings(phaseEvents.getPhaseTransitionEvent(p), strings);
    }

    expect(strings.length).toBeGreaterThan(300);
    expect(offendersIn(strings)).toEqual([]);
  });

  test('phaseNarrative getters and notification copy are dash-free across phases 0-5', () => {
    const strings: string[] = [];

    // Exported constants (glitch texts, seed messages, etc.).
    for (const [name, value] of Object.entries(phaseNarrative)) {
      if (typeof value !== 'function') collectStrings(value, strings, 0);
      void name;
    }

    // Every exported get* function, called with representative args across all
    // phases. Calls that throw on unexpected args are skipped; anything that
    // returns collects its reachable strings.
    const getters = Object.entries(phaseNarrative).filter(
      ([name, value]) => name.startsWith('get') && typeof value === 'function'
    ) as [string, (...args: unknown[]) => unknown][];
    expect(getters.length).toBeGreaterThan(40); // sanity: the matrix has teeth

    const argSetsFor = (p: DialoguePhase): unknown[][] => [
      [p],
      [p, p],
      [p, 3],
      [3, p],
      [p, 7],
      [7, p],
      ['R', 'WARM', p],
      [p, 'WARM'],
      ['WARM', p],
      [p, ['CANDY', 'VOID', 'FLAME']],
      [['CANDY', 'VOID', 'FLAME'], p],
      [p, 'fox'],
      ['fox', p],
      [p, 'Ember'],
      [p, true],
      [p, false],
      [p, 1, 2],
      [p, 2, true],
      [],
    ];

    // Deterministic Math.random sweep so every random-pool entry is visited
    // (the deepest pool, phase-2 move messages, holds 26 entries).
    const realRandom = Math.random;
    try {
      for (let k = 0; k < 32; k++) {
        const r = (k + 0.5) / 32;
        Math.random = () => r;
        for (const p of PHASES) {
          for (const args of argSetsFor(p)) {
            for (const [, fn] of getters) {
              try {
                const result = fn(...args);
                if (
                  result &&
                  typeof (result as { then?: unknown }).then === 'function'
                ) {
                  (result as Promise<unknown>).catch(() => undefined);
                  continue;
                }
                collectStrings(result, strings);
              } catch {
                // Not this getter's signature; another arg set will fit.
              }
            }
          }
          strings.push(getNotificationMessage('daily', p));
          strings.push(getStreakRiskMessage(p, 7));
          strings.push(getQuestExpiryMessage(p));
        }
      }
    } finally {
      Math.random = realRandom;
    }

    expect(strings.length).toBeGreaterThan(1000);
    expect(offendersIn(Array.from(new Set(strings)))).toEqual([]);
  });

  test('micro-beats are dash-free', async () => {
    const strings: string[] = [];
    for (let n = 1; n <= 600; n++) {
      const beat = await phaseNarrative.checkNarrativeMicroBeat(n);
      if (beat) collectStrings(beat, strings);
    }
    expect(strings.length).toBeGreaterThan(10);
    expect(offendersIn(strings)).toEqual([]);
  });

  test('no string literal in any non-test source file contains a dash', () => {
    const root = path.resolve(__dirname, '..', '..'); // mobile/
    const files: string[] = [path.join(root, 'App.tsx')];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
    };
    walk(path.join(root, 'src'));
    expect(files.length).toBeGreaterThan(100); // sanity: the walk found the app

    const offenders: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (!DASH_RE.test(text)) continue; // fast path: dash only possible in comments
      const sf = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );
      const visit = (node: ts.Node): void => {
        let literal: string | null = null;
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node) ||
          ts.isJsxText(node)
        ) {
          literal = node.text;
        }
        if (literal !== null && DASH_RE.test(literal)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          offenders.push(
            `${path.relative(root, file)}:${line + 1}: ${literal.trim().slice(0, 120)}`
          );
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(offenders).toEqual([]);
  });
});
