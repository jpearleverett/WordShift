/**
 * The Keeper's Record — Ember's one-time Phase-5 epilogue.
 *
 * Three contracts:
 *   1. getKeeperRecordLines is honest about the capped ledger: it claims
 *      "your first word" ONLY when the ledger never overflowed its 500 cap
 *      (the ledger keeps the NEWEST 500, so past the cap the true first words
 *      are gone and the copy must speak of the oldest word still held).
 *   2. The seen flag rides home progress (cloud-synced + Reset All covered,
 *      no new storage key) and deliberately survives startNewCycle
 *      (forever-once, like the first-win glitch).
 *   3. HomeScreen wiring: fires on the quiet post-revelation landing, marks
 *      seen on CLOSE in both dialogue handlers, records the gallery keepsake,
 *      and holds the Unbroken Weave intro to the next landing.
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/eventLogger');

import {
  clearProgress,
  hasSeenKeeperRecord,
  markKeeperRecordSeen,
} from '../services/amberCurrency';
import { getKeeperRecordLines, KeeperRecordData } from '../services/phaseNarrative';

const HOME_SCREEN = fs.readFileSync(
  path.resolve(__dirname, '../components/home/HomeScreen.tsx'),
  'utf8'
);
const HOME_TYPES = fs.readFileSync(
  path.resolve(__dirname, '../types/homeWorld.ts'),
  'utf8'
);
const AMBER_CURRENCY = fs.readFileSync(
  path.resolve(__dirname, '../services/amberCurrency.ts'),
  'utf8'
);

const baseData: KeeperRecordData = {
  totalWordsFormed: 312,
  puzzlesSolved: 124,
  strongestWord: 'wraith',
  oldestHeldWord: 'warm',
  ledgerIsComplete: true,
};

describe('getKeeperRecordLines', () => {
  test('a never-overflowed ledger may claim the true first word', () => {
    const lines = getKeeperRecordLines(baseData);
    const wordLine = lines[1];
    expect(wordLine).toContain('first word you ever gave us');
    expect(wordLine).toContain('WARM');
    expect(lines.join(' ')).not.toContain('oldest word my pages still hold');
  });

  test('an overflowed ledger never claims "first word" — the true first words are gone', () => {
    const lines = getKeeperRecordLines({
      ...baseData,
      totalWordsFormed: 700,
      ledgerIsComplete: false,
    });
    expect(lines.join(' ')).not.toContain('first word you ever gave us');
    expect(lines[1]).toContain('oldest word my pages still hold');
    expect(lines[1]).toContain('WARM');
  });

  test('an empty ledger still reads as a finished record (wordless memory line)', () => {
    const lines = getKeeperRecordLines({
      ...baseData,
      oldestHeldWord: null,
      strongestWord: null,
    });
    expect(lines[1]).toContain('too deep to read');
    expect(lines.join(' ')).not.toContain('undefined');
    expect(lines.join(' ')).not.toContain('null');
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });

  test('the strongest word is named when present and cleanly absent when not', () => {
    const withWord = getKeeperRecordLines(baseData).join(' ');
    expect(withWord).toContain('WRAITH');
    const withoutWord = getKeeperRecordLines({ ...baseData, strongestWord: null }).join(' ');
    expect(withoutWord).not.toContain('WRAITH');
    expect(withoutWord).not.toContain('most clearly');
  });

  test('the counts line carries both lifetime totals', () => {
    const lines = getKeeperRecordLines(baseData);
    const counts = lines.find(l => l.includes('312'));
    expect(counts).toBeDefined();
    expect(counts).toContain('124');
  });

  test('every line honors the narrative rules: no em dashes, entity only ever "it"', () => {
    const variants: KeeperRecordData[] = [
      baseData,
      { ...baseData, ledgerIsComplete: false },
      { ...baseData, oldestHeldWord: null, strongestWord: null },
    ];
    for (const data of variants) {
      for (const line of getKeeperRecordLines(data)) {
        expect(line).not.toMatch(/[—–]/);
        expect(line.toLowerCase()).not.toMatch(/entity|demon|shadow figure|phase \d/);
      }
    }
  });

  test('words render uppercase regardless of ledger casing', () => {
    const lines = getKeeperRecordLines({
      ...baseData,
      oldestHeldWord: 'spark',
      strongestWord: 'grave',
    });
    const joined = lines.join(' ');
    expect(joined).toContain('SPARK');
    expect(joined).toContain('GRAVE');
  });
});

describe('keeper record seen flag', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearProgress();
  });

  test('persists inside home progress (no new storage key) and reads back', async () => {
    expect(HOME_TYPES).toContain('keeperRecordSeen?: boolean');
    expect(await hasSeenKeeperRecord()).toBe(false);

    await markKeeperRecordSeen();
    expect(await hasSeenKeeperRecord()).toBe(true);

    const stored = JSON.parse(
      (await AsyncStorage.getItem('wordshift_home_progress')) ?? '{}'
    );
    expect(stored.keeperRecordSeen).toBe(true);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter(key => /keeper/i.test(key))).toEqual([]);
  });

  test('startNewCycle leaves the flag untouched (forever-once across cycles)', () => {
    const body = AMBER_CURRENCY.slice(
      AMBER_CURRENCY.indexOf('export async function startNewCycle'),
      AMBER_CURRENCY.indexOf('return progress.cycleCount;')
    );
    expect(body).not.toContain('keeperRecordSeen');
  });
});

describe('HomeScreen wiring', () => {
  test('fires on the quiet post-revelation landing with real ledger data', () => {
    expect(HOME_SCREEN).toContain("setIntroContext('keeper_record_intro')");
    expect(HOME_SCREEN).toMatch(/hasSeenKeeperRecord\(\)/);
    expect(HOME_SCREEN).toMatch(/getRitualWords\(\), getTotalWordsFormed\(\)/);
    expect(HOME_SCREEN).toMatch(/getStrongestDreadWord\(ledger\)/);
  });

  test('marks seen on CLOSE in both dialogue handlers, never at fire', () => {
    const markSites = HOME_SCREEN.match(/markKeeperRecordSeen\(\)/g) ?? [];
    expect(markSites.length).toBe(2);
    // Neither call sits inside the firing effect (which only checks the flag).
    const effect = HOME_SCREEN.slice(
      HOME_SCREEN.indexOf('// The Keeper\'s Record:'),
      HOME_SCREEN.indexOf('// Unbroken Weave intro:')
    );
    expect(effect).toContain('hasSeenKeeperRecord');
    expect(effect).not.toContain('markKeeperRecordSeen');
  });

  test('records the gallery keepsake and defers the weave intro one landing', () => {
    expect(HOME_SCREEN).toMatch(/keeperRecordShownThisLandingRef/);
    const effect = HOME_SCREEN.slice(
      HOME_SCREEN.indexOf('// The Keeper\'s Record:'),
      HOME_SCREEN.indexOf('// Unbroken Weave intro:')
    );
    expect(effect).toContain('recordWhisper');
    // The weave effect must yield the landing the record fired on.
    const weaveEffect = HOME_SCREEN.slice(
      HOME_SCREEN.indexOf('// Unbroken Weave intro:'),
      HOME_SCREEN.indexOf('hasSeenUnbrokenWeaveIntro()')
    );
    expect(weaveEffect).toContain('keeperRecordShownThisLandingRef.current) return');
  });
});
