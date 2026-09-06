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
 *  4. Share button — the daily-bonus hint is stated in the button's own
 *     label ("Share +N") and in full in its accessibility label. The action
 *     buttons are cottage CandyButtons, so their internal layout (one
 *     centered label row) is guaranteed there, not re-asserted here.
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

let mockSwiftVictories = false;
jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({
    reducedMotion: true,
    soundEnabled: false,
    hapticsEnabled: false,
    swiftVictories: mockSwiftVictories,
  }),
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

import { VictoryModal, VictoryData , getButtonTheme } from '../components/puzzle/VictoryModal';
import { getToastTheme } from '../components/puzzle/Toast';
import { SWIFT_VICTORY_MIN_PUZZLES } from '../hooks/useVictoryFlow';
import {
  VICTORY_FEEDBACK_POOLS,
  getRitualEchoFooter,
  getRitualEchoHeader,
  getAutoCollectCaption,
  getMandatoryHarvestText,
  getMandatoryHarvestCTA,
  getVictoryTitle,
  getFlawlessHonorific,
  getUnbrokenWeaveRankUpLine,
  getResonanceBonusLabel,
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
  mockSwiftVictories = false;
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

/**
 * Composite an `rgba(r, g, b, a)` wash over an opaque hex fill. The toast's
 * shine is a real layer between the fill and the text, so the ratio the player
 * reads is measured against this, not against the raw fill.
 */
function blendOver(rgbaWash: string, bgHex: string): string {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(rgbaWash);
  if (!m) return bgHex;
  const [wr, wg, wb] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const bg = bgHex.replace('#', '');
  const chan = (i: number, w: number) =>
    Math.round(w * a + parseInt(bg.substr(i * 2, 2), 16) * (1 - a));
  return `#${[chan(0, wr), chan(1, wg), chan(2, wb)]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
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
    // Feedback is a random pool pick now — assert NO pool line renders.
    for (const line of VICTORY_FEEDBACK_POOLS[1].three) {
      expect(text).not.toContain(line);
    }
  });

  it('phase 0 with a chain: footer is intentionally empty, so the feedback line stays', () => {
    expect(getRitualEchoFooter(0, chain.length)).toBe('');
    const tree = render(baseProps({ phase: 0, completedWords: chain }));
    const text = textOf(tree);
    // Feedback is a random pool pick now — assert SOME pool line renders.
    expect(VICTORY_FEEDBACK_POOLS[0].three.some(line => text.includes(line))).toBe(true);
    expect(text).toContain(getRitualEchoHeader(0));
  });

  it('no chain (e.g. autosave-restored board): the feedback line carries the register', () => {
    const tree = render(baseProps({ phase: 3, completedWords: [] }));
    const text = textOf(tree);
    expect(VICTORY_FEEDBACK_POOLS[3].three.some(line => text.includes(line))).toBe(true);
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

describe('Unbroken Weave mastery', () => {
  it('renders the current rank, next objective, and rank-up line on a Weave victory', () => {
    const tree = render(baseProps({
      phase: 5,
      victoryData: baseVictoryData({
        unbrokenWeaveRank: 3,
        unbrokenWeaveTitle: 'Seamless Dark',
        unbrokenWeaveNextObjective: 'Complete 10 flawless Unbroken Weaves (2/10).',
        unbrokenWeaveRankedUp: true,
      }),
    }));
    const text = textOf(tree);

    expect(text).toContain('UNBROKEN WEAVE');
    expect(text).toContain('Rank 3');
    expect(text).toContain('Seamless Dark');
    expect(text).toContain('Complete 10 flawless Unbroken Weaves (2/10).');
    expect(text).toContain(getUnbrokenWeaveRankUpLine(5, 'Seamless Dark'));
  });
});

// ===========================================================================
// 4. Share button — bonus layout is a flex row, never an inline image in Text
// ===========================================================================

describe('share button bonus layout', () => {
  const bonusLabel = `Share result, earns ${DAILY_SHARE_BONUS_AMBER} amber for the first share today`;

  // The share action is now a CandyButton (the shared cottage bevel), so its
  // internals are owned and guaranteed there: ONE centered label row, so an
  // <Image> can no longer be nested inside a Text run (the playtest bug this
  // suite was written for is structurally impossible now). What stays this
  // file's business is the CONTRACT the victory screen hands the button:
  // the bonus must be visible in the label AND stated in full for readers.
  // (This harness does not expand nested function components, so the
  // assertions read the element's props rather than its rendered tree.)

  it('states the bonus in the visible label and in full for screen readers', async () => {
    (isDailyShareBonusAvailable as jest.Mock).mockResolvedValueOnce(true);
    const tree = await renderWithEffects(baseProps());

    const btn = findByA11yLabel(tree, bonusLabel);
    expect(btn).not.toBeNull();
    const props = btn!.props as Record<string, unknown>;
    expect(props.label).toBe(`Share +${DAILY_SHARE_BONUS_AMBER}`);
    // A generated sprite, never an OS emoji, sits beside the label. (Jest maps
    // image requires to a numeric asset stub, so this asserts presence only.)
    expect(props.icon).not.toBeUndefined();
    // Supporting action: the single strong CTA above it stays the only primary.
    expect(props.variant).toBe('secondary');
  });

  it('drops the "+N" from the label when no bonus is available', () => {
    const tree = render(baseProps());
    const btn = findByA11yLabel(tree, 'Share result');
    expect(btn).not.toBeNull();
    expect((btn!.props as Record<string, unknown>).label).toBe('Share');
  });

  it('keeps exactly one primary CTA on the surface', () => {
    const tree = render(baseProps());
    const next = findByA11yLabel(tree, 'Next level');
    expect(next).not.toBeNull();
    expect((next!.props as Record<string, unknown>).variant).toBe('primary');
    expect((findByA11yLabel(tree, 'Return home')!.props as Record<string, unknown>).variant).toBe('secondary');
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

describe('rewarded double display (the doubled reward must be visible after the ad)', () => {
  it('shows the doubled total + a Doubled line once claimed, so the 2x is visible', () => {
    // The bug: after watching the "double" ad the balance really doubled, but
    // the modal kept showing the original amberEarned — reading as "I watched
    // an ad and got nothing." The total must reflect the doubling.
    const tree = render(baseProps({
      phase: 0,
      rewardedDoubleEnabled: true,
      rewardedDoubleClaimed: true,
      onRewardedDouble: jest.fn(),
      victoryData: baseVictoryData({ amberEarned: 15, autoCollected: false }),
    }));
    const text = textOf(tree);
    expect(text).toContain('Doubled');
    expect(text).toContain('30'); // 15 doubled — the new total is shown
  });

  it('shows only the single reward before the double is claimed', () => {
    const tree = render(baseProps({
      phase: 0,
      rewardedDoubleEnabled: false,
      rewardedDoubleClaimed: false,
      victoryData: baseVictoryData({ amberEarned: 15, autoCollected: false }),
    }));
    const text = textOf(tree);
    expect(text).not.toContain('Doubled');
    expect(text).toContain('15');
  });

  it('renders the double slot when App enables it for this victory', () => {
    // App decides per-victory (daily cadence cap + phase gate live upstream in
    // monetizationPrompts); the modal just presents when told to.
    const tree = render(baseProps({
      phase: 0,
      rewardedDoubleEnabled: true,
      rewardedDoubleClaimed: false,
      onRewardedDouble: jest.fn(),
      victoryData: baseVictoryData({ amberEarned: 15, autoCollected: false }),
    }));
    const slots = findAll(tree, el => (el.props as Record<string, unknown>)?.placement === 'victory_double');
    expect(slots).toHaveLength(1);
  });

  it('renders NO double slot when App withholds it (cadence exhausted / dread arc)', () => {
    const tree = render(baseProps({
      phase: 0,
      rewardedDoubleEnabled: false,
      rewardedDoubleClaimed: false,
      onRewardedDouble: jest.fn(),
      victoryData: baseVictoryData({ amberEarned: 15, autoCollected: false }),
    }));
    const slots = findAll(tree, el => (el.props as Record<string, unknown>)?.placement === 'victory_double');
    expect(slots).toHaveLength(0);
  });
});

// ===========================================================================
// 6. Amber itemization — the modal renders the REAL breakdown when present
// ===========================================================================

describe('amber breakdown threading (economy is the display source of truth)', () => {
  function breakdown(overrides: Record<string, number> = {}) {
    return {
      base: 12,
      starBonus: 6,
      streakBonus: 0,
      challengeBonus: 0,
      lexiconBonus: 0,
  speedBonus: 0,
      patronBonus: 0,
      surpriseBonus: 0,
      resonanceBonus: 0,
      variantBonus: 0,
      freshVariantBonus: 0,
      firstCompletionBonus: 0,
      milestoneBonus: 0,
      streakMilestoneBonus: 0,
      total: 18,
      ...overrides,
    };
  }

  it('renders base + star bonus from amberBreakdown, not the local AMBER_REWARDS math', () => {
    // MEDIUM's local fallback would be base 10 / star +5; the breakdown says
    // 12 / +6 (as if the economy changed) — the display must follow the data.
    const tree = render(baseProps({
      difficulty: 'MEDIUM',
      earnedStars: 3,
      victoryData: baseVictoryData({ amberEarned: 18, amberBreakdown: breakdown() }),
    }));
    // textOf joins tree text parts with single spaces, so "+{n}" reads "+ n".
    const text = textOf(tree);
    expect(text).toContain('12');
    expect(text).toContain('+ 6');
    expect(text).not.toContain('+ 5');
  });

  it('falls back to the local computation when the breakdown is absent', () => {
    const tree = render(baseProps({
      difficulty: 'MEDIUM',
      earnedStars: 3,
      victoryData: baseVictoryData({ amberEarned: 15 }),
    }));
    const text = textOf(tree);
    // AMBER_REWARDS.MEDIUM = 10, 3-star bonus floor(10 * 0.5) = +5
    expect(text).toContain('10');
    expect(text).toContain('+ 5');
  });

  it('renders the resonance line with the phase label when the breakdown carries one', () => {
    const tree = render(baseProps({
      phase: 0 as DialoguePhase,
      victoryData: baseVictoryData({
        amberEarned: 22,
        amberBreakdown: breakdown({ resonanceBonus: 4, total: 22 }),
      }),
    }));
    const text = textOf(tree);
    expect(text).toContain(getResonanceBonusLabel(0));
    expect(text).toContain('+ 4');

    // Dark-phase label follows the phase-aware copy function.
    resetHookState();
    const darkTree = render(baseProps({
      phase: 4 as DialoguePhase,
      victoryData: baseVictoryData({
        amberEarned: 22,
        amberBreakdown: breakdown({ resonanceBonus: 4, total: 22 }),
      }),
    }));
    expect(textOf(darkTree)).toContain(getResonanceBonusLabel(4));
  });

  it('renders no resonance line when the bonus is zero/absent', () => {
    const tree = render(baseProps({
      victoryData: baseVictoryData({ amberEarned: 18, amberBreakdown: breakdown() }),
    }));
    expect(textOf(tree)).not.toContain(getResonanceBonusLabel(0));

    resetHookState();
    const noBreakdown = render(baseProps({
      victoryData: baseVictoryData({ amberEarned: 15 }),
    }));
    expect(textOf(noBreakdown)).not.toContain(getResonanceBonusLabel(0));
  });

  it('shows the Patron line only when the breakdown carries a patron bonus', () => {
    const withPatron = render(baseProps({
      victoryData: baseVictoryData({
        amberEarned: 20,
        amberBreakdown: breakdown({ patronBonus: 2, total: 20 }),
      }),
    }));
    expect(textOf(withPatron)).toContain('Patron');

    resetHookState();
    const withoutPatron = render(baseProps({
      victoryData: baseVictoryData({ amberEarned: 18, amberBreakdown: breakdown() }),
    }));
    expect(textOf(withoutPatron)).not.toContain('Patron');
  });
});

// ===========================================================================
// 7. Swift Victories — compact result strip for routine wins
// ===========================================================================

/** Routine victory data: past the early game, no special beat attached. */
function routineVictoryData(overrides: Partial<VictoryData> = {}): VictoryData {
  return baseVictoryData({
    amberEarned: 18,
    puzzlesSolved: SWIFT_VICTORY_MIN_PUZZLES + 30,
    isDaily: false,
    phaseTransitionPending: false,
    firstCompletionBonus: 0,
    ...overrides,
  });
}

describe('swift victories compact strip', () => {
  it('renders the condensed strip for a routine win when the setting is ON', () => {
    mockSwiftVictories = true;
    // A routine win past the auto-collect window queues its amber in a harvest
    // batch, so the strip must keep the Collect Now affordance and frame the
    // amber as gathered-for-the-pit (not credited).
    const tree = render(baseProps({ victoryData: routineVictoryData({ autoCollected: false }) }));
    const text = textOf(tree);

    // Condensed content: title, stars, total amber; all actions intact.
    expect(text).toContain(getVictoryTitle(3, 0));
    expect(findByA11yLabel(tree, '3 of 3 stars')).not.toBeNull();
    expect(findByA11yLabel(tree, '18 amber gathered for the pit')).not.toBeNull();
    expect(findByA11yLabel(tree, 'Next level')).not.toBeNull();
    expect(findByA11yLabel(tree, 'Share result')).not.toBeNull();
    expect(findByA11yLabel(tree, 'Return home')).not.toBeNull();
    // Queued amber keeps its pit collection path in the compact strip.
    expect(findByA11yLabel(tree, 'Collect amber in the pit')).not.toBeNull();

    // Ceremony content is gone: no ritual echo, no skip layer.
    expect(text).not.toContain(getRitualEchoHeader(0));
    expect(findByA11yLabel(tree, 'Skip celebration animation')).toBeNull();
  });

  it('shows the flawless honorific on a flawless routine win', () => {
    mockSwiftVictories = true;
    const tree = render(baseProps({
      victoryData: routineVictoryData({ flawless: true }),
    }));
    expect(textOf(tree)).toContain(getFlawlessHonorific(0));
  });

  it('stays phase-aware: the compact card uses the phase modal colors', () => {
    mockSwiftVictories = true;
    const phase4 = getPhaseTheme(4);
    const tree = render(baseProps({
      phase: 4,
      victoryData: routineVictoryData(),
    }));
    const cards = findAll(tree, el =>
      flatStyle((el.props as Record<string, unknown>).style).backgroundColor === phase4.modalBgColor);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('setting OFF keeps the full ceremony for the same routine win', () => {
    mockSwiftVictories = false;
    const tree = render(baseProps({
      victoryData: routineVictoryData(),
      completedWords: ['WARM', 'WORM'],
    }));
    // Full modal markers: the ritual echo chain renders.
    expect(textOf(tree)).toContain(getRitualEchoHeader(0));
  });

  it('special beats keep the full modal even with the setting ON', () => {
    mockSwiftVictories = true;
    const specials: Partial<VictoryData>[] = [
      { milestoneBonus: 50, milestoneMessage: 'Milestone!' },
      { firstCompletionBonus: 20 },
      { streakMilestoneBonus: 30 },
      { phaseChanged: true, newPhase: 1 },
      { phaseTransitionPending: true },
      { mandatoryHarvest: true },
      { isDaily: true },
      { ritualEnergy: 9 },
      { questsCompleted: ['Solve 3'] },
      { unbrokenWeaveRankedUp: true },
      { puzzlesSolved: 3 }, // early game
    ];
    for (const special of specials) {
      resetHookState();
      const tree = render(baseProps({
        victoryData: routineVictoryData(special),
        completedWords: ['WARM', 'WORM'],
      }));
      // The full modal renders the ritual echo chain; the compact strip never does.
      expect(textOf(tree)).toContain(getRitualEchoHeader(0));
    }
  });

  it('the daily prop alone forces the full modal (belt and braces with isDaily)', () => {
    mockSwiftVictories = true;
    const tree = render(baseProps({
      isPlayingDaily: true,
      dailyRank: null,
      victoryData: routineVictoryData(),
    }));
    expect(textOf(tree)).toContain('Daily Challenge Complete');
  });

  it('onboarding victories always keep the full (single-button) modal', () => {
    mockSwiftVictories = true;
    const tree = render(baseProps({
      isOnboarding: true,
      onOnboardingContinue: jest.fn(),
      victoryData: routineVictoryData(),
    }));
    expect(findByA11yLabel(tree, 'Continue')).not.toBeNull();
  });
});

// ===========================================================================
// 8. Phase-aware toast colors (Toast.tsx sibling component)
// ===========================================================================

describe('phase-aware toast colors', () => {
  it('normal + error pairs hold WCAG AA (>=4.5:1) at every phase', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const t = getToastTheme(phase);
      expect(contrast(t.normalText, t.normalBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.errorText, t.errorBg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the toast surface follows the phase (no fixed candy white at Phase 4)', () => {
    const bright = getToastTheme(0);
    const dark = getToastTheme(4);
    expect(bright.normalBg).not.toBe(dark.normalBg);
    // Phase 4's toast fill is the phase modal surface, not candy white.
    expect(dark.normalBg).toBe(getPhaseTheme(4).modalBgColor);
    expect(dark.normalBg).not.toBe('#FFFFFF');
  });

  it('the old error pair (white on red.main, 3.8:1) is gone at every phase', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      expect(getToastTheme(phase).errorBg).not.toBe('#EF4444');
    }
  });

  // The pill paints `toastShine` OVER the fill and UNDER the label, so the raw
  // fill is not the background the player reads. The audit above measured the
  // raw pair and recorded 6.5:1 for the bright error toast; the composite was
  // 3.84:1 (white on #CE6060) because the candy 0.3 white wash lightens
  // #B91C1C. Compositing here is what stops the next audit repeating that.
  it('the SHINE-composited pairs hold WCAG AA (>=4.5:1) at every phase', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const t = getToastTheme(phase);
      expect(contrast(t.errorText, blendOver(t.errorShine, t.errorBg))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.normalText, blendOver(t.shine, t.normalBg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the error pill keeps its own shine, so the candy gloss survives on the normal pill', () => {
    // Changing the single shared `shine` would have flattened the most common
    // toast in the game to fix the rarest-styled one.
    const bright = getToastTheme(0);
    expect(bright.shine).toBe('rgba(255, 255, 255, 0.3)');
    expect(bright.errorShine).not.toBe(bright.shine);
  });
});

// ===========================================================================
// 9. Swift-victory strip button theme (the compact result strip's own colors)
// ===========================================================================

describe('swift-victory button theme contrast', () => {
  it('share and secondary labels hold >=4.5:1 on their own fills at every phase', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
      const btn = getButtonTheme(phase);
      // 14px/700 is below WCAG's large-text threshold, so the 4.5 bar applies.
      expect(contrast(btn.share.text, btn.share.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(btn.secondary.text, btn.secondary.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the bright Share pair is no longer the mis-recorded 4.07:1 grey', () => {
    for (const phase of [0, 1, 2] as DialoguePhase[]) {
      // gray[700] on blue.light measured 4.073 while the inline comment claimed
      // 4.6 — the growth CTA carrying the first-share amber bonus was the
      // weakest text on the strip.
      expect(getButtonTheme(phase).share.text).not.toBe('#334155');
      expect(contrast(getButtonTheme(phase).share.text, getButtonTheme(phase).share.bg))
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});
