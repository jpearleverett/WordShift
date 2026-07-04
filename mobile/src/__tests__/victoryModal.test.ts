/**
 * VictoryModal streamlining + contrast tests.
 *
 * Node test env (no React renderer): React hooks are mocked to run
 * synchronously and react-native primitives become string tags (the project's
 * component-test convention), so a render is a plain createElement tree we
 * can traverse.
 *
 * Covers the player-reported fixes:
 *  1. Stars are the emotional centerpiece — rendered large (56 / 76dp), three
 *     of them, with the pop-in scale transforms and a11y label intact.
 *  2. Contrast — the streak chip no longer hardcodes orange-on-orange, and the
 *     phase themes' modal text/background pairs hold WCAG AA (>=4.5:1).
 *  3. Streamlining — the performance-feedback line and the ritual-echo footer
 *     never stack (footer wins when a chain renders one); the generic
 *     "Puzzle Complete" subtitle is trimmed (daily keeps its label); the
 *     social-proof line renders only when provided.
 *  4. Share button — the daily-bonus hint renders as a flex row (label text,
 *     amber gem Image as a sibling, "+N" text), never as an inline image
 *     nested inside Text (which baseline-wrapped onto a second line).
 */

// ---------------------------------------------------------------------------
// Manual synchronous React-hook mock (mirrors monetizationUI.test.ts)
// ---------------------------------------------------------------------------

const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: { fn: () => void | (() => void); cleanup?: () => void }[] = [];
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

const animatedStub = () => ({ start: jest.fn(), stop: jest.fn() });
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Image: 'Image',
  StyleSheet: {
    create: (s: unknown) => s,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  Animated: {
    View: 'AnimatedView',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
    timing: jest.fn().mockImplementation(animatedStub),
    spring: jest.fn().mockImplementation(animatedStub),
    parallel: jest.fn().mockImplementation(animatedStub),
    sequence: jest.fn().mockImplementation(animatedStub),
    stagger: jest.fn().mockImplementation(animatedStub),
  },
}));

// ---------------------------------------------------------------------------
// Service/component mocks (keep the module graph Node-safe)
// ---------------------------------------------------------------------------

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true, soundEnabled: false, hapticsEnabled: false }),
}));

jest.mock('../services/haptics', () => ({
  hapticSuccess: jest.fn(),
}));

jest.mock('../services/shareResults', () => ({
  isDailyShareBonusAvailable: jest.fn().mockResolvedValue(false),
  DAILY_SHARE_BONUS_AMBER: 5,
}));

jest.mock('../services/entitlements', () => ({
  isAdFreeSync: () => false,
}));

jest.mock('../services/leaderboard', () => ({
  getBeatPercentText: jest.fn().mockReturnValue(''),
}));

jest.mock('../components/social/DailyLeaderboardCard', () => ({
  DailyLeaderboardCard: () => null,
}));

jest.mock('../components/monetization/RewardedAdButton', () => ({
  RewardedAdButton: () => null,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { VictoryModal, VictoryData } from '../components/puzzle/VictoryModal';
import {
  getVictoryFeedback,
  getRitualEchoFooter,
  getRitualEchoHeader,
  getAutoCollectCaption,
  getMandatoryHarvestText,
  getMandatoryHarvestCTA,
} from '../services/phaseNarrative';
import { isDailyShareBonusAvailable, DAILY_SHARE_BONUS_AMBER } from '../services/shareResults';
import { getPhaseTheme } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';

// ---------------------------------------------------------------------------
// Tree helpers
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

function render(props: Record<string, unknown>) {
  rewindHookIndices();
  return (VictoryModal as unknown as (p: unknown) => unknown)(props);
}

/**
 * Render, run the collected effects (the harness only queues them), flush the
 * isDailyShareBonusAvailable() promise, then re-render with the updated state.
 */
async function renderWithEffects(props: Record<string, unknown>) {
  render(props);
  const pending = [...effectCallbacks];
  pending.forEach(e => e.fn());
  await new Promise(resolve => setTimeout(resolve, 0));
  return render(props);
}

// ---------------------------------------------------------------------------
// Prop scaffolding
// ---------------------------------------------------------------------------

function fakeAnimatedValue() {
  return { setValue: jest.fn(), interpolate: jest.fn() };
}

function baseVictoryData(overrides: Partial<VictoryData> = {}): VictoryData {
  return {
    earnedStars: 3,
    amberEarned: 15,
    streakBonus: 0,
    challengeBonus: 0,
    milestoneBonus: 0,
    milestoneMessage: null,
    currentStreak: 1,
    phaseChanged: false,
    newPhase: 0,
    ...overrides,
  };
}

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    visible: true,
    earnedStars: 3,
    difficulty: 'MEDIUM',
    phase: 0 as DialoguePhase,
    isPlayingDaily: false,
    victoryData: baseVictoryData(),
    completionCoda: null,
    cumulativeStats: { totalPuzzlesCompleted: 40 },
    modalScale: fakeAnimatedValue(),
    modalOpacity: fakeAnimatedValue(),
    star1Scale: fakeAnimatedValue(),
    star2Scale: fakeAnimatedValue(),
    star3Scale: fakeAnimatedValue(),
    onNextLevel: jest.fn(),
    onReturnHome: jest.fn(),
    onGoToPit: jest.fn(),
    onShare: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  resetHookState();
});

// ===========================================================================
// 1. Stars — size, count, choreography, accessibility
// ===========================================================================

describe('victory stars', () => {
  it('renders three large star images (56dp sides, 76dp centerpiece) with scale transforms', () => {
    const tree = render(baseProps());
    const stars = findAll(tree, el => el.type === 'AnimatedImage');
    expect(stars).toHaveLength(3);

    const sizes = stars.map(s => {
      const st = flatStyle((s.props as Record<string, unknown>).style);
      return { width: st.width, height: st.height };
    });
    // Two side stars + one big center star; meaningfully larger than the old
    // 38/52 sizes (they're the modal's emotional centerpiece).
    expect(sizes.filter(s => s.width === 56 && s.height === 56)).toHaveLength(2);
    expect(sizes.filter(s => s.width === 76 && s.height === 76)).toHaveLength(1);
    // 2×(56+10) + (76+10) = 218dp — fits the ~280dp content width at 360dp.
    expect(2 * (56 + 10) + (76 + 10)).toBeLessThanOrEqual(280);

    // Pop-in choreography intact: every star carries a scale transform.
    for (const s of stars) {
      const st = flatStyle((s.props as Record<string, unknown>).style);
      const transform = st.transform as { scale?: unknown }[];
      expect(Array.isArray(transform)).toBe(true);
      expect(transform.some(t => 'scale' in t)).toBe(true);
    }
  });

  it('keeps the stars accessibility label', () => {
    const tree = render(baseProps({ earnedStars: 2 }));
    expect(findByA11yLabel(tree, '2 of 3 stars')).not.toBeNull();
  });
});

// ===========================================================================
// 2. Contrast — streak chip + phase-theme text pairs
// ===========================================================================

/** WCAG relative luminance from a #RRGGBB hex. */
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const chan = (i: number) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
}

function contrast(fgHex: string, bgHex: string): number {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrast', () => {
  it('the streak chip never renders the old orange-on-orange pair', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
      const tree = render(baseProps({
        phase,
        victoryData: baseVictoryData({ currentStreak: 3 }),
      }));
      const chip = findByA11yLabel(tree, '3 day streak');
      expect(chip).not.toBeNull();
      const chipStyle = flatStyle((chip!.props as Record<string, unknown>).style);
      // The reported bug: orange.dark text on orange.light chip (1.6:1).
      expect(chipStyle.backgroundColor).not.toBe('#FB923C');

      const texts = findAll(chip as unknown, el => el.type === 'Text');
      expect(texts.length).toBeGreaterThan(0);
      const textStyle = flatStyle((texts[0].props as Record<string, unknown>).style);
      expect(textStyle.color).not.toBe('#EA580C');

      // When both chip bg and text are plain hex (light phases), verify AA.
      const bg = chipStyle.backgroundColor as string;
      const fg = textStyle.color as string;
      if (/^#[0-9A-Fa-f]{6}$/.test(bg) && /^#[0-9A-Fa-f]{6}$/.test(fg)) {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
      resetHookState();
    }
  });

  it('phase themes hold WCAG AA for modal text on modal + stat backgrounds (all phases)', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const t = getPhaseTheme(phase);
      expect(contrast(t.modalTextColor, t.modalBgColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.modalTextColor, t.modalStatBgColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.modalSecondaryTextColor, t.modalBgColor)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.modalSecondaryTextColor, t.modalStatBgColor)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// ===========================================================================
// 3. Streamlining — feedback/footer de-dup, subtitle trim, social proof
// ===========================================================================

describe('feedback vs ritual-echo footer (same emotional slot)', () => {
  const chain = ['WARM', 'WORM', 'WORD'];

  it('phase 1+ with a chain: the echo footer speaks, the feedback line is suppressed', () => {
    const tree = render(baseProps({ phase: 1, completedWords: chain }));
    const text = textOf(tree);
    expect(text).toContain(getRitualEchoFooter(1, chain.length)); // 'A curious path...'
    expect(text).not.toContain(getVictoryFeedback(3, 1));
  });

  it('phase 0 with a chain: footer is intentionally empty, so the feedback line stays', () => {
    expect(getRitualEchoFooter(0, chain.length)).toBe('');
    const tree = render(baseProps({ phase: 0, completedWords: chain }));
    const text = textOf(tree);
    expect(text).toContain(getVictoryFeedback(3, 0));
    expect(text).toContain(getRitualEchoHeader(0));
  });

  it('no chain (e.g. autosave-restored board): the feedback line carries the register', () => {
    const tree = render(baseProps({ phase: 3, completedWords: [] }));
    const text = textOf(tree);
    expect(text).toContain(getVictoryFeedback(3, 3));
    expect(text).not.toContain(getRitualEchoHeader(3));
  });
});

describe('subtitle trim', () => {
  it('drops the generic "Puzzle Complete" label (stars + title already say it)', () => {
    const tree = render(baseProps());
    expect(textOf(tree)).not.toContain('Puzzle Complete');
  });

  it('keeps the daily label where it disambiguates', () => {
    const tree = render(baseProps({ isPlayingDaily: true, dailyRank: null }));
    expect(textOf(tree)).toContain('Daily Challenge Complete');
  });
});

describe('social proof line', () => {
  it('renders the provided community line', () => {
    const line = 'Players everywhere shared 1,204 words today';
    const tree = render(baseProps({ socialProofLine: line }));
    expect(textOf(tree)).toContain(line);
    expect(findByA11yLabel(tree, line)).not.toBeNull();
  });

  it('renders nothing when the line is null (weak/absent counts)', () => {
    const tree = render(baseProps({ socialProofLine: null }));
    expect(textOf(tree)).not.toContain('words today');
  });
});

// ===========================================================================
// 4. Share button — bonus layout is a flex row, never an inline image in Text
// ===========================================================================

describe('share button bonus layout', () => {
  const bonusLabel = `Share result, earns ${DAILY_SHARE_BONUS_AMBER} amber for the first share today`;

  it('renders label, gem, and +N as siblings in one centered non-wrapping row', async () => {
    (isDailyShareBonusAvailable as jest.Mock).mockResolvedValueOnce(true);
    const tree = await renderWithEffects(baseProps());

    const btn = findByA11yLabel(tree, bonusLabel);
    expect(btn).not.toBeNull();

    // Exactly one horizontal content row, centered on both axes. RN's default
    // flexWrap ('nowrap') is not overridden, so the gem can never wrap onto a
    // second line (the playtest bug).
    const rows = findAll(btn, el =>
      el.type === 'View' && flatStyle((el.props as Record<string, unknown>).style).flexDirection === 'row');
    expect(rows).toHaveLength(1);
    const rowStyle = flatStyle((rows[0].props as Record<string, unknown>).style);
    expect(rowStyle.alignItems).toBe('center');
    expect(rowStyle.justifyContent).toBe('center');
    expect(rowStyle.flexWrap).toBeUndefined();

    // Traversal order pins the reading order: "📤 Share", gem, "+N".
    const ordered = findAll(rows[0], el => el.type === 'Text' || el.type === 'Image');
    expect(ordered.map(el => el.type)).toEqual(['Text', 'Image', 'Text']);
    const [label, gem, amount] = ordered;

    expect(textOf(label)).toContain('Share');
    expect(textOf(amount)).toBe(`+${DAILY_SHARE_BONUS_AMBER}`);

    // Both text pieces fit one line and share the button font + phase color.
    for (const t of [label, amount]) {
      expect((t.props as Record<string, unknown>).numberOfLines).toBe(1);
    }
    const labelStyle = flatStyle((label.props as Record<string, unknown>).style);
    const amountStyle = flatStyle((amount.props as Record<string, unknown>).style);
    expect(labelStyle.fontWeight).toBe('700');
    expect(amountStyle.fontWeight).toBe('700');
    expect(amountStyle.color).toBe(labelStyle.color);

    // The gem is decorative: the button's accessibilityLabel already announces
    // the bonus, so the Image carries no label and is hidden from readers.
    const gemProps = gem.props as Record<string, unknown>;
    expect(gemProps.accessibilityLabel).toBeUndefined();
    expect(gemProps.importantForAccessibility).toBe('no');
    expect(gemProps.accessibilityElementsHidden).toBe(true);

    // The old broken structure: an Image nested INSIDE a Text run.
    for (const t of [label, amount]) {
      const nested = findAll((t.props as Record<string, unknown>).children, el => el.type === 'Image');
      expect(nested).toHaveLength(0);
    }
  });

  it('renders just the share label when no bonus is available (no gem, no +N)', () => {
    const tree = render(baseProps());
    const btn = findByA11yLabel(tree, 'Share result');
    expect(btn).not.toBeNull();
    expect(findAll(btn, el => el.type === 'Image')).toHaveLength(0);
    expect(findAll(btn, el => el.type === 'Text')).toHaveLength(1);
    expect(textOf(btn)).not.toContain(`+${DAILY_SHARE_BONUS_AMBER}`);
  });
});

// ===========================================================================
// 5. Early pit economy — auto-collect lore + one-time mandatory harvest gate
// ===========================================================================

describe('auto-collect lore caption', () => {
  it('renders the in-world reason while the pit auto-collects early rewards', () => {
    const tree = render(baseProps({
      phase: 0,
      victoryData: baseVictoryData({ autoCollected: true }),
    }));
    expect(textOf(tree)).toContain(getAutoCollectCaption(0 as DialoguePhase));
  });

  it('is absent once the player harvests manually (autoCollected falsy)', () => {
    const tree = render(baseProps({
      phase: 0,
      victoryData: baseVictoryData({ autoCollected: false }),
    }));
    expect(textOf(tree)).not.toContain(getAutoCollectCaption(0 as DialoguePhase));
  });
});

describe('mandatory first-harvest gate', () => {
  it('forces the pit: Next Level / Home / Share hide, only the pit CTA remains', () => {
    const tree = render(baseProps({
      phase: 0,
      victoryData: baseVictoryData({ mandatoryHarvest: true }),
    }));
    // The replay + secondary actions are gone — the player cannot continue
    // until they offer their words at the pit.
    expect(findByA11yLabel(tree, 'Next level')).toBeNull();
    expect(findByA11yLabel(tree, 'Return home')).toBeNull();
    expect(findByA11yLabel(tree, 'Share result')).toBeNull();
    // The pit is the only way forward, with its mandatory a11y label.
    expect(findByA11yLabel(tree, 'Visit the pit to continue')).not.toBeNull();
    // The lore dialogue + CTA copy are shown.
    const text = textOf(tree);
    expect(text).toContain(getMandatoryHarvestText(0 as DialoguePhase));
    expect(text).toContain(getMandatoryHarvestCTA(0 as DialoguePhase));
  });

  it('a normal victory keeps Next Level and the plain (optional) Collect Now pill', () => {
    const tree = render(baseProps({
      phase: 0,
      victoryData: baseVictoryData({ mandatoryHarvest: false }),
    }));
    expect(findByA11yLabel(tree, 'Next level')).not.toBeNull();
    expect(findByA11yLabel(tree, 'Collect amber in the pit')).not.toBeNull();
    expect(textOf(tree)).not.toContain(getMandatoryHarvestText(0 as DialoguePhase));
  });
});
