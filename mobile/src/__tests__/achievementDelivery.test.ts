import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
const readApp = () => fs.readFileSync(path.join(SRC_ROOT, '..', 'App.tsx'), 'utf8');

/**
 * The journey achievements (Curious Thoughts / Deeper Questions / Growing
 * Shadows / The Horizon) are the only ones keyed on `currentPhase`, and
 * `currentPhase` only ever advances in one place: `confirmPhaseTransition`,
 * called from the Offering Pit's ward-ignition ceremony. The victory chain was
 * the sole achievement trigger, so lighting a new era left its own achievement
 * locked in Statistics — and its amber uncredited — until the player happened
 * to finish another puzzle. A player reported exactly that.
 */
describe('phase achievements unlock at the ceremony that earns them', () => {
  const app = readApp();

  it('the pit ceremony confirmation runs an achievement check', () => {
    const handler = /onPhaseTransitionConfirmed=\{\(newPhase\) => \{[\s\S]*?\n            \}\}/.exec(app);
    expect(handler).not.toBeNull();
    expect(handler![0]).toContain('checkAchievementsNow');
  });

  it('the hook exposes a victory-free entry point built from live state', () => {
    const hook = read('hooks/useAchievementQueue.ts');
    expect(hook).toContain('checkAchievementsNow');
    // It must read live storage, not a VictoryData the ceremony does not have.
    expect(hook).toContain('buildAchievementCheckState');
    // One presentation path, so the two entry points cannot drift.
    expect(hook).toContain('presentUnlocks');
    expect(hook.match(/playUiSound\('achievement'\)/g) ?? []).toHaveLength(1);
  });

  it('the victory-side check survives a victory exit', () => {
    // Every exit path runs clearVictoryTimeouts, so a check scheduled through
    // addVictoryTimeout was dropped entirely when the player tapped inside its
    // 500ms window, with nothing left to re-run it.
    expect(app).toContain('achievementCheckTimerRef');
    expect(app).not.toMatch(/addVictoryTimeout\(\s*\(\)\s*=>\s*achievementActions\.checkForAchievements/);
  });
});

/**
 * The toast's reward pill. Its Text is the one row child sized by its own
 * paragraph measurement, so the single space before an inline <Image> is the
 * only line-break opportunity on the line — and the gem took it, landing on a
 * second row under the amount. A nowrap flex row has no break opportunity.
 */
describe('achievement toast reward pill cannot wrap', () => {
  const src = read('components/AchievementToast.tsx');

  it('the gem is a flex-row sibling, never an inline embed in the reward Text', () => {
    const rewardText = /<Text[^>]*styles\.reward[\s\S]*?<\/Text>/.exec(src);
    expect(rewardText).not.toBeNull();
    expect(rewardText![0]).not.toContain('<AmberInline');
    expect(rewardText![0]).toContain('numberOfLines={1}');
    expect(src).toContain('styles.rewardGem');
  });

  it('the gem carries its own gap now that the literal space is gone', () => {
    const block = /\n  rewardGem: \{[\s\S]*?\n  \},/.exec(src);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/margin/);
  });

  it('the split only works because the host is a nowrap row', () => {
    const block = /\n  inner: \{[\s\S]*?\n  \},/.exec(src);
    expect(block).not.toBeNull();
    expect(block![0]).toContain("flexDirection: 'row'");
    expect(block![0]).not.toContain('flexWrap');
  });
});

/**
 * Repo-wide sweep of the same wrap hazard the toast hit.
 *
 * An inline `<AmberInline />` inside a `<Text>` is fine in FLOWING prose ("Your
 * Amber: <gem> 240") — the paragraph owns a full-width box and a wrap is
 * ordinary text flow. It is NOT fine where the Text is sized by its own
 * intrinsic measurement: a chip, a pill, a value column, a row's value slot.
 * There the single space before the gem is the only break opportunity on the
 * line, and the gem drops beneath the number. Those sites render `AmberValue`,
 * a real nowrap row with no break opportunity at all.
 */
describe('intrinsically-sized amber values use the nowrap row', () => {
  const SWEPT: Array<[string, string]> = [
    ['components/StatsScreen.tsx', 'achievementRewardText'],
    ['components/StatsScreen.tsx', 'journeyValue'],
    ['components/OfferingPitScreen.tsx', 'tendingCostText'],
    ['components/OfferingPitScreen.tsx', 'summaryValue'],
    ['components/monetization/StoreModal.tsx', 'balanceText'],
    ['components/monetization/StoreModal.tsx', 'valueAmber'],
    ['components/shop/ShopScreen.tsx', 'amberPillText'],
    ['components/SeasonPassModal.tsx', 'headerBalance'],
    ['components/AchievementToast.tsx', 'reward'],
  ];

  it.each(SWEPT)('%s %s is not an inline gem embed', (file, style) => {
    const src = read(file);
    // No <Text> carrying this style may contain an <AmberInline> before it closes.
    const re = new RegExp(`<Text[^>]*styles\\.${style}[\\s\\S]*?<\\/Text>`, 'g');
    for (const block of src.match(re) ?? []) {
      expect(block).not.toContain('<AmberInline');
    }
  });

  it('AmberValue lays the gem and its amount out as a nowrap row', () => {
    const src = read('components/AmberInline.tsx');
    expect(src).toContain('export const AmberValue');
    const row = /\n  row: \{[\s\S]*?\},/.exec(src);
    expect(row).not.toBeNull();
    expect(row![0]).toContain("flexDirection: 'row'");
    expect(row![0]).not.toContain('flexWrap');
    // The amount is clamped, and the gem carries a real margin in place of the
    // literal space that used to be the break opportunity.
    expect(src).toContain('numberOfLines={1}');
    const amount = /\n  amount: \{[\s\S]*?\},/.exec(src);
    expect(amount).not.toBeNull();
    expect(amount![0]).toMatch(/marginLeft/);
  });
});
