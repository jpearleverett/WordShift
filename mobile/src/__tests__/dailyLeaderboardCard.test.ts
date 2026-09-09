/**
 * DailyLeaderboardCard render contracts.
 *
 * The card is the surface that showed a lone daily entrant "#1 of 1" with
 * "You beat 0% of seekers today" under it. The fix suppresses the percentile
 * sentence in the CALLER (leaderboard.getBeatPercentText returns null below
 * DAILY_PERCENTILE_MIN_ENTRANTS), which only holds if the card itself has no
 * percentile copy of its own: it used to carry two hardcoded
 * "You beat N% of players today" fallbacks, so suppressing the passed-in text
 * alone would have resurrected the bug from inside the component.
 *
 * Node test env (no React renderer): react-native primitives become string
 * tags, so a render is a plain createElement tree we can traverse (the
 * project's component-test convention).
 */
import fs from 'fs';
import path from 'path';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: (s: unknown) => s,
    hairlineWidth: 1,
  },
}));

import { DailyLeaderboardCard } from '../components/social/DailyLeaderboardCard';
import { getBeatPercentText, getStandingsGatheringText } from '../services/leaderboard';
import { DAILY_PERCENTILE_MIN_ENTRANTS } from '../constants/gameBalance';

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

/** Collect all text content in the tree into one string. */
function textOf(tree: unknown): string {
  const parts: string[] = [];
  walk(tree, el => {
    const collect = (c: unknown) => {
      if (typeof c === 'string' || typeof c === 'number') parts.push(String(c));
      else if (Array.isArray(c)) c.forEach(collect);
    };
    collect((el.props as Record<string, unknown>)?.children);
  });
  return parts.join(' ');
}

function a11yLabelOf(tree: unknown): string {
  const root = tree as El;
  return String((root?.props as Record<string, unknown>)?.accessibilityLabel ?? '');
}

function render(props: Record<string, unknown>) {
  return (DailyLeaderboardCard as unknown as (p: unknown) => unknown)(props);
}

/**
 * How App/VictoryModal build the card's standing line: the real sentence when
 * the day's board is big enough for a percentile to mean something, the honest
 * substitute when it is not.
 */
function beatTextFor(percentile: number, phase: number, total: number): string {
  return getBeatPercentText(percentile, phase, total) ?? getStandingsGatheringText(phase);
}

describe('DailyLeaderboardCard', () => {
  test('renders no percentage at all on a solo board, but keeps the true rank', () => {
    const tree = render({
      rank: 1,
      total: 1,
      beatText: beatTextFor(0, 0, 1),
      phase: 0,
    });
    const text = textOf(tree);
    // The rank is factually true at any board size and stays (#1 of 1).
    expect(text).toContain('#');
    expect(text).toContain('1');
    expect(text).toContain('of');
    // The demoralising sentence is gone, in every form.
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/beat/i);
    expect(text).toContain(getStandingsGatheringText(0));
  });

  test('the accessibility label carries the same suppression as the visible card', () => {
    const label = a11yLabelOf(
      render({ rank: 1, total: 1, beatText: beatTextFor(0, 0, 1), phase: 0 }),
    );
    expect(label).toContain('rank 1 of 1');
    expect(label).not.toMatch(/%/);
    expect(label).toContain(getStandingsGatheringText(0));
  });

  test('a real board still shows the percentile sentence', () => {
    const total = DAILY_PERCENTILE_MIN_ENTRANTS + 20;
    const tree = render({ rank: 4, total, beatText: beatTextFor(78, 0, total), phase: 0 });
    expect(textOf(tree)).toContain('You beat 78% of seekers today');
    expect(a11yLabelOf(tree)).toContain('78%');
  });

  test('no beatText renders no standing sentence and invents no fallback', () => {
    // The old component filled this hole with its own "You beat N% of players
    // today" using the raw percentile prop; there is no such path now.
    const tree = render({ rank: 1, total: 1, percentile: 0, phase: 0 });
    expect(textOf(tree)).not.toMatch(/%/);
    expect(textOf(tree)).not.toMatch(/beat/i);
  });

  test('the component ships no percentile copy of its own', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../components/social/DailyLeaderboardCard.tsx'),
      'utf8',
    );
    // A hardcoded sentence here would bypass the caller's suppression entirely.
    expect(source).not.toMatch(/You beat \{/);
    expect(source).not.toMatch(/% of players/);
  });

  test('renders nothing when there is no standing, no line and no history', () => {
    expect(render({ phase: 0 })).toBeNull();
  });

  test('still renders for a standing line with no live rank (offline-safe)', () => {
    const tree = render({ beatText: getStandingsGatheringText(2), phase: 2 });
    expect(tree).not.toBeNull();
    expect(textOf(tree)).toContain(getStandingsGatheringText(2));
  });
});
