/**
 * StatsScreen regression tests (playtest-screenshot bugs).
 *
 * Node test env (no React renderer): React hooks are mocked to run
 * synchronously and react-native primitives become string tags (the project's
 * component-test convention), so a render is a plain createElement tree we
 * can traverse.
 *
 * Covers the three screenshot-verified fixes:
 *  1. BUG 6 — the Amber Balance row shows the LIVE amberCurrency store value
 *     (like the home header), not App's React-state mirror prop, and can
 *     never render a negative number even when the mirror prop is corrupt.
 *  2. BUG 4 — every section card carries bottom padding so the last row
 *     (the cramped HARD row) clears the 12dp card wood band comfortably.
 *  3. BUG 5 — Personal Bests renders sprite/plain-words rows ("Perfect",
 *     "1 hint, 2 mistakes", explicit "No best yet"), never raw sparkle emoji
 *     or the cryptic h/m legend; no em dashes in visible text.
 */

// ---------------------------------------------------------------------------
// Manual synchronous React-hook mock (mirrors victoryModal.test.ts)
// ---------------------------------------------------------------------------

const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: { fn: () => void | (() => void) }[] = [];
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: unknown) => {
      const idx = stateIndex++;
      if (!stateStore.has(idx)) {
        stateStore.set(idx, typeof initial === 'function' ? (initial as () => unknown)() : initial);
      }
      const value = stateStore.get(idx);
      const setter = (valOrFn: unknown) => {
        if (typeof valOrFn === 'function') {
          stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
        } else {
          stateStore.set(idx, valOrFn);
        }
      };
      return [value, setter];
    },
    useEffect: (fn: () => void | (() => void)) => {
      effectCallbacks.push({ fn });
    },
    useRef: (initial: unknown) => {
      const idx = refIndex++;
      if (!refStore.has(idx)) refStore.set(idx, { current: initial });
      return refStore.get(idx)!;
    },
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
  };
});

// ---------------------------------------------------------------------------
// react-native primitives → string tags
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (s: unknown) => s,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios },
}));

// ---------------------------------------------------------------------------
// Component/hook/service mocks (keep the module graph Node-safe)
// ---------------------------------------------------------------------------

jest.mock('../theme/fonts', () => ({
  BODY_FONT: 'BodyFont',
  BODY_FONT_BOLD: 'BodyFontBold',
  BODY_FONT_ITALIC: 'BodyFontItalic',
  PIXEL_FONT: 'PixelFont',
  PIXEL_FONT_BOLD: 'PixelFontBold',
}));

jest.mock('../components/ui/PanelCard', () => ({ PanelCard: 'PanelCard' }));
jest.mock('../components/ui/PixelPlaque', () => ({ PixelPlaque: 'PixelPlaque' }));
jest.mock('../components/AmberInline', () => ({ AmberInline: 'AmberInline' }));
jest.mock('../components/monetization/BannerAd', () => ({ BannerAd: () => null }));

jest.mock('../hooks/useScreenInsets', () => ({
  useScreenInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGetCumulativeStats = jest.fn();
jest.mock('../services/starRating', () => ({
  getCumulativeStats: () => mockGetCumulativeStats(),
  getAverageStars: (stats: { totalStars: number; totalPuzzlesCompleted: number }) =>
    stats.totalPuzzlesCompleted > 0 ? stats.totalStars / stats.totalPuzzlesCompleted : 0,
  getThreeStarRate: (stats: { threeStarCount: number; totalPuzzlesCompleted: number }) =>
    stats.totalPuzzlesCompleted > 0 ? (stats.threeStarCount / stats.totalPuzzlesCompleted) * 100 : 0,
}));

jest.mock('../services/achievements', () => ({
  getAchievementsWithStatus: jest.fn(async () => []),
  getTotalCount: () => 51,
}));

jest.mock('../services/dailyChallenge', () => ({
  getDailyStatus: jest.fn(async () => ({ totalCompleted: 2, bestStreak: 3 })),
}));

// The LIVE store read — the thing the screen must trust over the mirror prop.
const mockGetAmberBalance = jest.fn(async () => 190);
jest.mock('../services/amberCurrency', () => ({
  getStreakInfo: jest.fn(async () => ({ currentStreak: 4 })),
  getAmberBalance: () => mockGetAmberBalance(),
}));

jest.mock('../services/masteryRecords', () => ({
  getBestSpeedRound: jest.fn(async () => 0),
  getResonantChoices: jest.fn(async () => 0),
  getSolveTrend: jest.fn(async () => null),
  getUnbrokenWeaveMastery: jest.fn(async () => null),
}));

jest.mock('../services/phaseNarrative', () => ({
  getJourneyAtmosphereText: jest.fn(() => 'Warm and bright'),
  getPaceTrendMessage: jest.fn(() => 'You are getting faster.'),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  StatsScreen,
  isPerfectPersonalBest,
  formatPersonalBestSummary,
} from '../components/StatsScreen';

// ---------------------------------------------------------------------------
// Tree helpers (project convention)
// ---------------------------------------------------------------------------

type El = { type?: unknown; props?: Record<string, unknown> } & Record<string, unknown>;

function walk(node: unknown, visit: (el: El) => void): void {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(n => walk(n, visit));
    return;
  }
  const el = node as El;
  if (el.props) {
    visit(el);
    walk((el.props as Record<string, unknown>).children, visit);
  }
}

function findAll(tree: unknown, pred: (el: El) => boolean): El[] {
  const out: El[] = [];
  walk(tree, el => {
    if (pred(el)) out.push(el);
  });
  return out;
}

function findByA11yLabel(tree: unknown, label: string): El | null {
  let found: El | null = null;
  walk(tree, el => {
    if (!found && (el.props as Record<string, unknown>)?.accessibilityLabel === label) found = el;
  });
  return found;
}

/** Collect all text content in the tree into one string. */
function textOf(tree: unknown): string {
  const parts: string[] = [];
  walk(tree, el => {
    const children = (el.props as Record<string, unknown>)?.children;
    const collect = (c: unknown) => {
      if (typeof c === 'string' || typeof c === 'number') parts.push(String(c));
      else if (Array.isArray(c)) c.forEach(collect);
    };
    collect(children);
  });
  return parts.join(' ');
}

/** Flatten a (possibly nested, falsy-holed) RN style array to one object. */
function flatStyle(style: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const merge = (s: unknown) => {
    if (!s) return;
    if (Array.isArray(s)) {
      s.forEach(merge);
      return;
    }
    if (typeof s === 'object') Object.assign(out, s as Record<string, unknown>);
  };
  merge(style);
  return out;
}

// ---------------------------------------------------------------------------
// Fixtures + render harness
// ---------------------------------------------------------------------------

function makeStats(overrides: Record<string, unknown> = {}) {
  return {
    totalPuzzlesCompleted: 12,
    totalStars: 30,
    threeStarCount: 8,
    twoStarCount: 3,
    oneStarCount: 1,
    totalInvalidAttempts: 5,
    totalHintsUsed: 2,
    noHintPuzzleCount: 10,
    flawlessCount: 0,
    byDifficulty: {
      EASY: { completed: 4, stars: 11 },
      MEDIUM: { completed: 6, stars: 15 },
      MEDIUM_PLUS: { completed: 1, stars: 2 },
      HARD: { completed: 1, stars: 2 },
    },
    personalBests: {
      EASY: { fewestHints: 0, fewestInvalidAttempts: 0 },
      MEDIUM: { fewestHints: 1, fewestInvalidAttempts: 2 },
    },
    lastUpdated: Date.now(),
    ...overrides,
  };
}

const baseProps = {
  onClose: jest.fn(),
  puzzlesSolved: 12,
  currentPhase: 0,
  amberBalance: 190,
  phase: 0,
};

function render(props: Record<string, unknown>) {
  rewindHookIndices();
  return (StatsScreen as unknown as (p: unknown) => unknown)({ ...baseProps, ...props });
}

/**
 * Render, run the queued mount effects, flush the service promises, then
 * re-render with the loaded state (the first render returns null while the
 * cumulative stats are still loading).
 */
async function renderWithEffects(props: Record<string, unknown> = {}) {
  render(props);
  const pending = [...effectCallbacks];
  pending.forEach(e => e.fn());
  await new Promise(resolve => setTimeout(resolve, 0));
  return render(props);
}

beforeEach(() => {
  resetHookState();
  jest.clearAllMocks();
  mockGetCumulativeStats.mockResolvedValue(makeStats());
  mockGetAmberBalance.mockResolvedValue(190);
});

// ---------------------------------------------------------------------------
// BUG 6 — Amber Balance shows the live store, never a negative mirror
// ---------------------------------------------------------------------------

describe('Amber Balance row (live-store truth)', () => {
  test('shows the LIVE amberCurrency balance even when the mirror prop is negative/stale', async () => {
    mockGetAmberBalance.mockResolvedValue(190);
    // The real-device repro: mirror prop -12, real store 190.
    const tree = await renderWithEffects({ amberBalance: -12 });

    expect(findByA11yLabel(tree, '190 amber')).toBeTruthy();
    expect(textOf(tree)).not.toContain('-12');
  });

  test('before the live read resolves, the fallback prop is clamped: never renders negative', async () => {
    // Live read hangs — the screen must fall back to the prop, clamped to 0.
    mockGetAmberBalance.mockImplementation(() => new Promise(() => {}) as Promise<number>);
    const tree = await renderWithEffects({ amberBalance: -12 });

    expect(findByA11yLabel(tree, '0 amber')).toBeTruthy();
    expect(textOf(tree)).not.toContain('-12');
  });

  test('a healthy mirror prop still shows while the live read is pending', async () => {
    mockGetAmberBalance.mockImplementation(() => new Promise(() => {}) as Promise<number>);
    const tree = await renderWithEffects({ amberBalance: 145 });

    expect(findByA11yLabel(tree, '145 amber')).toBeTruthy();
  });

  test('the live store wins over a stale positive mirror', async () => {
    mockGetAmberBalance.mockResolvedValue(505);
    const tree = await renderWithEffects({ amberBalance: 145 });

    expect(findByA11yLabel(tree, '505 amber')).toBeTruthy();
    expect(findByA11yLabel(tree, '145 amber')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BUG 4 — section cards keep the last row clear of the wood band
// ---------------------------------------------------------------------------

describe('section-card bottom clearance', () => {
  test('every section card carries >=16dp bottom padding (12dp band + breathing room)', async () => {
    const tree = await renderWithEffects();

    const cards = findAll(tree, el => el.type === 'PanelCard');
    // Section cards are the kind='card' frames (the hero is kind='panel' and
    // pads itself with paddingVertical: 24).
    const sectionCards = cards.filter(el => ((el.props as Record<string, unknown>).kind ?? 'card') === 'card');
    expect(sectionCards.length).toBeGreaterThanOrEqual(3); // stars / difficulty / bests / journey
    for (const card of sectionCards) {
      const s = flatStyle((card.props as Record<string, unknown>).style);
      expect(s.paddingBottom as number).toBeGreaterThanOrEqual(16);
    }
  });
});

// ---------------------------------------------------------------------------
// BUG 5 — Personal Bests presentation
// ---------------------------------------------------------------------------

describe('Personal Bests card', () => {
  test('a perfect best renders the star sprite + the word "Perfect" (no raw emoji)', async () => {
    const tree = await renderWithEffects();

    const easyRow = findByA11yLabel(tree, 'EASY best: perfect, no hints, no mistakes');
    expect(easyRow).toBeTruthy();
    // Sprite policy: the marker is the star sprite Image, not an emoji glyph.
    const images = findAll(easyRow, el => el.type === 'Image');
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(textOf(easyRow)).toContain('Perfect');
  });

  test('a non-perfect best reads in plain words with pluralization', async () => {
    const tree = await renderWithEffects();

    const mediumRow = findByA11yLabel(tree, 'MEDIUM best: 1 hint, 2 mistakes');
    expect(mediumRow).toBeTruthy();
    expect(textOf(mediumRow)).toContain('1 hint, 2 mistakes');
  });

  test('difficulties without a best get an explicit "No best yet" row', async () => {
    const tree = await renderWithEffects();

    expect(findByA11yLabel(tree, 'MED+: no best yet')).toBeTruthy();
    expect(findByA11yLabel(tree, 'HARD: no best yet')).toBeTruthy();
    const noBestTexts = findAll(tree, el =>
      el.type === 'Text' && textOf(el).trim() === 'No best yet'
    );
    expect(noBestTexts.length).toBe(2);
  });

  test('the sparkle emoji and the cryptic h/m legend are gone; the caption matches the new rows', async () => {
    const tree = await renderWithEffects();
    const text = textOf(tree);

    expect(text).not.toContain('✨'); // ✨
    expect(text).not.toContain('h = hints');
    expect(text).not.toContain('m = mistakes');
    expect(text).toContain('Fewest hints and mistakes at each difficulty');
  });

  test('no em dashes anywhere in the rendered overview', async () => {
    const tree = await renderWithEffects();
    expect(textOf(tree)).not.toMatch(/[—–]/);
  });

  test('the card stays hidden for a brand-new player with no bests at all', async () => {
    mockGetCumulativeStats.mockResolvedValue(makeStats({ personalBests: {} }));
    const tree = await renderWithEffects();

    expect(textOf(tree)).not.toContain('No best yet');
    expect(findAll(tree, el => el.type === 'PixelPlaque' && (el.props as Record<string, unknown>).label === 'PERSONAL BESTS').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('personal-best helpers', () => {
  test('isPerfectPersonalBest requires BOTH zero hints and zero mistakes', () => {
    expect(isPerfectPersonalBest({ fewestHints: 0, fewestInvalidAttempts: 0 })).toBe(true);
    expect(isPerfectPersonalBest({ fewestHints: 0, fewestInvalidAttempts: 1 })).toBe(false);
    expect(isPerfectPersonalBest({ fewestHints: 1, fewestInvalidAttempts: 0 })).toBe(false);
  });

  test('formatPersonalBestSummary pluralizes both fields', () => {
    expect(formatPersonalBestSummary({ fewestHints: 1, fewestInvalidAttempts: 0 })).toBe('1 hint, 0 mistakes');
    expect(formatPersonalBestSummary({ fewestHints: 0, fewestInvalidAttempts: 1 })).toBe('0 hints, 1 mistake');
    expect(formatPersonalBestSummary({ fewestHints: 2, fewestInvalidAttempts: 3 })).toBe('2 hints, 3 mistakes');
  });
});
