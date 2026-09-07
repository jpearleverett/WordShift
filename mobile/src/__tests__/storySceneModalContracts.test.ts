/**
 * Source-level contracts for the story scene reader (StorySceneModal).
 *
 * The Node test environment has no React Native renderer, so like
 * puzzleFeelContracts.test.ts this pins the SHAPE of the component's source.
 *
 * The contract: reading a scene page by page must not flicker. Every Continue
 * tap runs an async storage write; the modal used to dim all of its buttons
 * (CandyButton disabled -> opacity 0.45) and mount a "Keeping this moment..."
 * caption under them for the few frames that write took, then un-dim and
 * unmount it as the next page landed, which read as the card blinking between
 * pages. The saving affordance now reveals only after a write has been slow
 * for SAVING_REVEAL_MS, and the caption shares the page counter's line so even
 * a slow-path reveal never moves a button.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '../components/StorySceneModal.tsx'),
  'utf8',
);

describe('StorySceneModal saving affordance is delayed, never per-page', () => {
  it('declares a reveal delay long enough to skip an ordinary page save', () => {
    const match = src.match(/const SAVING_REVEAL_MS = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(300);
  });

  it('arms the reveal from a timer inside run(), never synchronously', () => {
    // setShowSaving(true) may ONLY be reached through the delayed timer; a
    // synchronous set (or a set inside a useEffect body) would either bring
    // the per-page dim back or trip react-hooks/set-state-in-effect.
    const trueSets = src.match(/setShowSaving\(true\)/g) ?? [];
    expect(trueSets).toHaveLength(1);
    expect(src).toMatch(/revealTimer\.current = setTimeout\(\(\) => setShowSaving\(true\), SAVING_REVEAL_MS\);/);
    const runBlock = src.slice(src.indexOf('const run = async'), src.indexOf('const close ='));
    expect(runBlock).toContain('setShowSaving(true)');
  });

  it('clears the timer and the affordance when the write settles, and on unmount', () => {
    const finallyBlock = src.slice(src.indexOf('finally {'), src.indexOf('const close ='));
    expect(finallyBlock).toContain('clearTimeout(revealTimer.current)');
    expect(finallyBlock).toContain('busy.current = false');
    expect(finallyBlock).toContain('setShowSaving(false)');
    expect(src).toMatch(/useEffect\(\(\) => \(\) => \{\s*if \(revealTimer\.current\) clearTimeout\(revealTimer\.current\);/);
  });

  it('never gates a button on the raw in-flight state', () => {
    expect(src).not.toMatch(/const \[saving, setSaving\]/);
    expect(src).not.toMatch(/disabled=\{saving\}/);
    expect(src).not.toMatch(/disabled: saving\b/);
    expect(src).not.toMatch(/opacity: saving \?/);
    // Every interactive control in the actions column takes the delayed flag.
    expect((src.match(/disabled=\{showSaving\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(src).toMatch(/accessibilityState=\{\{ disabled: showSaving \}\}/);
  });

  it('keeps double-tap protection on the busy ref for every write path', () => {
    const runBlock = src.slice(src.indexOf('const run = async'), src.indexOf('const close ='));
    expect(runBlock).toContain('if (busy.current) return;');
    expect(src).toContain('const close = () => { if (!busy.current) onClose(); };');
    // Previous page is a pure local re-read; it used to be disabled during the
    // write and must stay inert during one, or a fast tap could flash the
    // previous page under a landing save.
    expect(src).toMatch(/onPress=\{\(\) => \{ if \(!busy\.current\) setReadingPage\(visiblePage - 1\); \}\}/);
  });

  it('gives the caption a slot beside the page counter so a reveal cannot reflow the buttons', () => {
    const statusRow = src.slice(src.indexOf('<View style={styles.statusRow}>'), src.indexOf('{options?.length'));
    expect(statusRow).toContain('accessibilityLabel={`Page ${visiblePage + 1} of ${pages.length}`}');
    expect(statusRow).toMatch(/\{showSaving && <AppText[^>]*numberOfLines=\{1\}[^>]*>\{STORY_COPY\.saving\}<\/AppText>\}/);
    expect(src).toMatch(/statusRow: \{ flexDirection: 'row'/);
    expect(src).not.toMatch(/statusRow: \{[^}]*flexWrap/);
  });

  it('keeps the error, retry and accessibility paths intact', () => {
    expect(src).toContain("catch { setError(true); }");
    expect(src).toContain('retry.current = action');
    expect(src).toMatch(/\{error && <View accessibilityLiveRegion="assertive">/);
    expect(src).toContain('label={STORY_COPY.retry}');
    expect(src).toContain('announceForA11y(`${speakerName}. ${line.text}`)');
    // The modal never closes and re-opens between pages (that would fade).
    expect(src).toContain('visible={!!memory && !!line}');
  });
});
