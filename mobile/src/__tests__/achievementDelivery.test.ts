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
