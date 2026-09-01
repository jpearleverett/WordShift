/**
 * Registry guards for the game-surface art drawn by
 * scripts/tools/generateGameIcons.mjs: the achievement crests, the quest-type
 * icons, the difficulty seals + How-to-Play diagrams, and the chrome glyphs the
 * mode-icon map gained (lexicon books, hourglass, phase-mood family, receipt
 * bullets).
 *
 * The failure these prevent is silent: an achievement, quest type or tier that
 * ships without art quietly falls back to a shared sprite (or a hole), which
 * looks deliberate. So every id a surface can ask for must resolve to its own
 * file on disk, and nothing may be mapped that has no file.
 *
 * Mirrors shopArt.test.ts / storeArt.test.ts. Pixel geometry (size, transparent
 * edges, coverage) is shopIconGeometry.test.ts's concern.
 */
import fs from 'fs';
import path from 'path';
import { ACHIEVEMENTS } from '../services/achievements';
import { ACHIEVEMENT_ART, getAchievementArt, hasAchievementArt } from '../components/achievementArt';
import { QUEST_ART, getQuestArt } from '../components/questArt';
import { DIFFICULTY_ART, RULES_STEP_ART, getRulesStepArt } from '../components/puzzle/difficultyArt';
import { MODE_ICON_SPRITES, getModeIconSprite, getPhaseIndicatorSprite } from '../components/puzzle/modeIcons';
import { getRulesText } from '../services/phaseNarrative';
import { CHROME_ICONS, SPOT_ART } from '../components/ui/chromeIcons';
import { getPhaseTransitionEvent } from '../services/phaseEvents';
import type { DialoguePhase as Phase } from '../types/homeWorld';
import type { Difficulty } from '../types';
import type { DialoguePhase } from '../types/homeWorld';

const UI_DIR = path.resolve(__dirname, '../../assets/ui');

/** Every `assets/ui/...png` a registry source references, in file order. */
function referencedPngs(sourceRel: string): string[] {
  const source = fs.readFileSync(path.resolve(__dirname, sourceRel), 'utf8');
  return source.match(/assets\/ui\/[\w./]+\.png/g) ?? [];
}
function missingOnDisk(refs: string[]): string[] {
  return refs.filter((rel) => !fs.existsSync(path.resolve(UI_DIR, rel.slice('assets/ui/'.length))));
}

describe('achievement crest registry', () => {
  it('gives every achievement its own crest', () => {
    const missing = ACHIEVEMENTS.filter((a) => !hasAchievementArt(a.id)).map((a) => a.id);
    expect(missing).toEqual([]);
  });

  it('maps nothing that is not an achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(Object.keys(ACHIEVEMENT_ART).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('falls back to the category sprite for an unknown id', () => {
    expect(getAchievementArt('not_an_achievement', 'puzzle')).toBeDefined();
    expect(hasAchievementArt('not_an_achievement')).toBe(false);
  });

  it('references one real file per crest', () => {
    const refs = referencedPngs('../components/achievementArt.ts');
    expect(refs.length).toBe(Object.keys(ACHIEVEMENT_ART).length);
    expect(missingOnDisk(refs)).toEqual([]);
  });
});

describe('quest art registry', () => {
  it('covers exactly the QuestType union', () => {
    // The union cannot be enumerated at runtime, so read it off the source:
    // every `| 'name'` member of the `export type QuestType =` declaration.
    const source = fs.readFileSync(path.resolve(__dirname, '../services/weeklyQuests.ts'), 'utf8');
    const decl = source.slice(source.indexOf('export type QuestType ='));
    const block = decl.slice(0, decl.indexOf(';') + 1);
    const members = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(members.length).toBeGreaterThan(0);
    expect([...Object.keys(QUEST_ART)].sort()).toEqual([...members].sort());
  });

  it('never returns undefined', () => {
    expect(getQuestArt('solve_count')).toBeDefined();
    expect(getQuestArt('not_a_type' as never)).toBe(QUEST_ART.solve_count);
  });

  it('references one real file per quest type', () => {
    const refs = referencedPngs('../components/questArt.ts');
    expect(refs.length).toBe(Object.keys(QUEST_ART).length);
    expect(missingOnDisk(refs)).toEqual([]);
  });
});

describe('difficulty seals and rules diagrams', () => {
  const TIERS: Difficulty[] = ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'];

  it('has a seal for every tier', () => {
    // jest maps every PNG require to one file-mock value, so check presence of
    // the key rather than truthiness of the mocked module.
    expect(TIERS.filter((d) => !(d in DIFFICULTY_ART))).toEqual([]);
    expect(Object.keys(DIFFICULTY_ART).sort()).toEqual([...TIERS].sort());
  });

  it('draws a diagram for every How-to-Play step at every phase', () => {
    const maxSteps = Math.max(
      ...([0, 1, 2, 3, 4, 5] as DialoguePhase[]).map((p) => getRulesText(p).steps.length),
    );
    expect(maxSteps).toBeGreaterThan(0);
    expect(RULES_STEP_ART.length).toBeGreaterThanOrEqual(maxSteps);
    for (let i = 0; i < maxSteps; i++) expect(getRulesStepArt(i)).toBeDefined();
    expect(getRulesStepArt(RULES_STEP_ART.length)).toBeNull();
  });

  it('references one real file per seal and diagram', () => {
    const refs = referencedPngs('../components/puzzle/difficultyArt.ts');
    expect(refs.length).toBe(Object.keys(DIFFICULTY_ART).length + RULES_STEP_ART.length);
    expect(missingOnDisk(refs)).toEqual([]);
  });
});

describe('mode-icon chrome additions', () => {
  it.each([
    ['📕 (Lexicon off)', '📕'],
    ['📖 (Lexicon on)', '📖'],
    ['⏱️ (Speed off, with variation selector)', '⏱️'],
    ['hourglass', 'hourglass'],
    ['clover', 'clover'],
    ['ribbon', 'ribbon'],
    ['sun', 'sun'],
  ])('%s resolves to a sprite', (_label, glyph) => {
    expect(getModeIconSprite(glyph)).not.toBeNull();
  });

  it('has a phase-mood sprite for every phase and clamps out-of-range', () => {
    for (const p of [0, 1, 2, 3, 4, 5]) expect(getPhaseIndicatorSprite(p)).toBeDefined();
    expect(getPhaseIndicatorSprite(-1)).toBe(getPhaseIndicatorSprite(0));
    expect(getPhaseIndicatorSprite(99)).toBe(getPhaseIndicatorSprite(5));
    for (const key of ['sun', 'thought', 'moon', 'eye', 'void', 'dove']) expect(MODE_ICON_SPRITES[key]).toBeDefined();
  });

  it('references real files for every mapped sprite', () => {
    const refs = referencedPngs('../components/puzzle/modeIcons.ts');
    expect(missingOnDisk(refs)).toEqual([]);
  });
});

describe('spot illustrations and chrome files', () => {
  it.each([
    ['WordLedger empty state', '../components/WordLedger.tsx', 'assets/ui/spots/empty_ledger.png'],
    ['WhisperGallery empty state', '../components/WhisperGalleryScreen.tsx', 'assets/ui/spots/empty_gallery.png'],
    ['UtilityMenu How to Play row', '../components/ui/UtilityMenu.tsx', 'assets/ui/rules.png'],
    ['UtilityMenu Shop row', '../components/ui/UtilityMenu.tsx', 'assets/ui/shop_sign.png'],
    ['HomeScreen Season Pass row', '../components/home/HomeScreen.tsx', 'assets/ui/season_pass.png'],
  ])('%s requires a file that exists', (_where, sourceRel, expected) => {
    const refs = referencedPngs(sourceRel);
    expect(refs).toContain(expected);
    expect(missingOnDisk([expected])).toEqual([]);
  });
});

describe('chrome marks, scene spots and ceremony emblems (round 2)', () => {
  // The registries are typed literals, so the only failure mode left is a
  // mapped file that is missing on disk (or a drawn file nobody mapped).
  it('maps every chrome mark and spot to a real file', () => {
    const refs = referencedPngs('../components/ui/chromeIcons.ts');
    const expectedCount = Object.keys(CHROME_ICONS).length + Object.keys(SPOT_ART).length;
    expect(refs.length).toBe(expectedCount);
    expect(missingOnDisk(refs)).toEqual([]);
  });

  it('gives the phase 1-3 ceremonies an image that exists', () => {
    const refs = referencedPngs('../components/PhaseTransitionOverlay.tsx');
    for (const name of ['ceremony_curious', 'ceremony_deeper', 'ceremony_shadows']) {
      expect(refs).toContain(`assets/ui/spots/${name}.png`);
    }
    expect(missingOnDisk(refs)).toEqual([]);
    // Every SceneImage a scene names must be one the overlay can render.
    const scenes = ([1, 2, 3] as Phase[]).flatMap((p) => getPhaseTransitionEvent(p)?.scenes ?? []);
    const used = scenes.map((s) => s.image).filter((i): i is NonNullable<typeof i> => Boolean(i));
    expect(used).toEqual(expect.arrayContaining(['ceremony_curious', 'ceremony_deeper', 'ceremony_shadows']));
  });

  it.each([
    ['Row completed badge', '../components/Row.tsx', 'assets/ui/check_badge.png'],
    ['Settings link chevron', '../components/SettingsScreen.tsx', 'assets/ui/chevron.png'],
    ['ErrorBoundary spot', '../components/ErrorBoundary.tsx', 'assets/ui/spots/spilled_ink.png'],
    ['Tending Shrine spot', '../components/OfferingPitScreen.tsx', 'assets/ui/spots/shrine.png'],
    ['Daily card check', '../components/DailyChallengeCard.tsx', 'assets/ui/check.png'],
  ])('%s requires a file that exists', (_where, sourceRel, expected) => {
    const refs = referencedPngs(sourceRel);
    expect(refs).toContain(expected);
    expect(missingOnDisk([expected])).toEqual([]);
  });
});
