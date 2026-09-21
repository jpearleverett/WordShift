/**
 * The victory 2x spends the day's allowance on a CLAIM, never on being shown.
 *
 * This is a source sweep rather than a behaviour test because the hazard is
 * structural: the cap used to be charged where the slot is DECIDED (App's
 * victory chain), so a player who kept declining exhausted the day's five and
 * the control vanished until local midnight without ever paying out. Adding
 * recordRewardedDoubleClaimed() back beside that decision would compile, would
 * pass every behavioural suite (they exercise the service layer directly), and
 * would restore the bug verbatim. So the invariant worth pinning is the shape
 * of the call graph: exactly one production caller, and it is the claim.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const PRODUCTION = [path.join(ROOT, 'App.tsx'), ...sourceFiles(path.join(ROOT, 'src'))];

/**
 * Source with comments removed. The prose around this mechanism names the very
 * symbols the sweep looks for (deliberately: the comment at App's decision site
 * warns the next maintainer off adding the call there), so a raw text scan
 * would read those warnings as the violation they warn about.
 */
function codeOf(file: string): string {
  return fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function callersOf(symbol: string): string[] {
  return PRODUCTION
    .filter(file => new RegExp(`\\b${symbol}\\s*\\(`).test(codeOf(file)))
    .map(file => path.relative(ROOT, file).replace(/\\/g, '/'))
    .sort();
}

describe('the rewarded double spends its daily slot on the claim alone', () => {
  test('recordRewardedDoubleClaimed has exactly one production caller', () => {
    // Its own definition, and the credited-claim path. Nothing else.
    expect(callersOf('recordRewardedDoubleClaimed')).toEqual([
      'src/hooks/useVictoryDouble.ts',
      'src/services/monetizationPrompts.ts',
    ]);
  });

  test('the victory chain reads the gate but never writes it', () => {
    const app = codeOf(path.join(ROOT, 'App.tsx'));
    // App decides whether to present the slot...
    expect(app).toContain('canOfferRewardedDouble(');
    // ...and records nothing when it does.
    expect(app).not.toContain('recordRewardedDoubleClaimed');
    // The retired presentation-counting API must not come back under its old
    // name either.
    expect(app).not.toContain('recordRewardedDoubleOffered');
  });

  test('no production file still counts presentations', () => {
    expect(callersOf('recordRewardedDoubleOffered')).toEqual([]);
    for (const file of PRODUCTION) {
      expect(codeOf(file)).not.toContain('rewardedDoubleOffersToday');
    }
  });
});
