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
// Whitespace-normalised so a wrap or re-indent cannot fail a contract pin.
const flat = src.replace(/\s+/g, ' ');
const runBlock = src.slice(src.indexOf('const run = async'), src.indexOf('const close ='));

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
    expect(flat).toMatch(/revealTimer\.current = setTimeout\(\(\) => setShowSaving\(true\), SAVING_REVEAL_MS\);/);
    expect(runBlock).toContain('setShowSaving(true)');
  });

  it('clears the timer and the affordance when the write settles, and on unmount', () => {
    const finallyBlock = runBlock.slice(runBlock.indexOf('finally {'));
    expect(finallyBlock).toContain('clearTimeout(revealTimer.current)');
    expect(finallyBlock).toContain('busy.current = false');
    expect(finallyBlock).toContain('setShowSaving(false)');
    expect(flat).toMatch(/useEffect\(\(\) => \(\) => \{ if \(revealTimer\.current\) clearTimeout\(revealTimer\.current\);/);
  });

  it('never gates a button on the raw in-flight state', () => {
    expect(src).not.toMatch(/const \[saving, setSaving\]/);
    expect(src).not.toMatch(/disabled=\{saving\}/);
    expect(src).not.toMatch(/disabled: saving\b/);
    expect(src).not.toMatch(/opacity: saving \?/);
    // Every interactive control in the actions column takes the delayed flag.
    expect((src.match(/disabled=\{showSaving\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(flat).toContain('disabled={showSaving || visiblePage === 0}');
    expect(flat).toMatch(/accessibilityState=\{ ?\{ disabled: showSaving \} ?\}/);
  });

  it('keeps double-tap protection on the busy ref for every write path', () => {
    expect(runBlock).toContain('if (busy.current) return;');
    expect(flat).toContain('const close = () => { void run(onClose); };');
    // Previous page is a pure local re-read; it used to be disabled during the
    // write and must stay inert during one, or a fast tap could flash the
    // previous page under a landing save.
    expect(flat).toMatch(/onPress=\{\(\) => \{ if \(!busy\.current && visiblePage > 0\) setReadingPage\(visiblePage - 1\); \}\}/);
  });

  it('gives the caption a slot beside the page counter so a reveal cannot reflow the buttons', () => {
    const statusRow = src.slice(src.indexOf('<View style={styles.statusRow}>'), src.indexOf('{options?.length'));
    expect(statusRow).toContain('accessibilityLabel={`Page ${visiblePage + 1} of ${pages.length}`}');
    expect(statusRow).toMatch(/\{showSaving && <AppText[^>]*numberOfLines=\{1\}[^>]*>\{STORY_COPY\.saving\}<\/AppText>\}/);
    expect(flat).toMatch(/statusRow: \{ flexDirection: 'row'/);
    expect(flat).not.toMatch(/statusRow: \{[^}]*flexWrap/);
  });

  it('keeps artwork and the resident on every page, including compact screens', () => {
    expect(flat).toContain('const illustration = memory && line ? getStoryPageArt(memory, visiblePage) : null;');
    expect(flat).toContain('const portraitSpeaker = memory ? getStoryPortraitSpeaker(memory, visiblePage) : null;');
    expect(flat).toContain('{illustration && <Image source={illustration.source}');
    expect(flat).toContain('speaking={line?.speaker === portraitSpeaker}');
    expect(flat).not.toContain('HEADER_ART_MIN_CARD_DP');
    expect(flat).not.toContain('SCENES_WITH_HEADER_ART');
    expect(flat).not.toContain('reservePortrait');
    expect(flat).not.toContain('STORY_ART.tableHeader');
    expect(flat).toContain('width: layout.artWidth, height: layout.artHeight');
    expect(flat).toContain('resizeMode="contain"');
    expect(flat).toContain('paddingVertical: SURFACE.panelPadY');
    expect(flat).toContain('maxHeight: layout.scrollMaxHeight');
    expect(flat).toMatch(/style=\{visiblePage === 0 \? styles\.hiddenAction : undefined\}/);
    expect(flat).toMatch(/importantForAccessibility=\{visiblePage === 0 \? 'no-hide-descendants' : 'auto'\}/);
    expect(flat).toMatch(/hiddenAction: \{ opacity: 0 \}/);
  });

  it('never attributes narration to "The house", captions the sprite, never draws the player', () => {
    // The ATTRIBUTION is skipped for the narrator before the name is even
    // looked up, so "The house" can never be spoken by a resident's portrait.
    expect(flat).toContain("const speakerName = line && line.speaker !== 'narrator' ? getStorySpeakerName(line.speaker) : '';");
    // But the drawn resident is still named: a sprite with no label left the
    // player nothing to call the animal they were looking at. The caption is
    // the PORTRAIT's name, in the muted ink, only where there is no speaker.
    expect(flat).toContain("const portraitName = portraitSpeaker && line && line.speaker !== 'player' ? getStorySpeakerName(portraitSpeaker) : '';");
    expect(flat).toContain('const nameplate = speakerName || portraitName;');
    expect(flat).toContain('{!!nameplate && <AppText textRole="label" testID="story-scene-speaker"');
    expect(flat).toContain('color: speakerName ? theme.title : theme.muted');
    // The player has no sprite, so the player's own line shows the nameplate
    // alone, and the row keeps the portrait's height so the text never jumps.
    expect(flat).toContain("{portraitSpeaker && line?.speaker !== 'player' && <StoryPortrait");
    expect(flat).toContain('style={[styles.speakerRow, { minHeight: layout.portraitSize }]}');
  });

  it('keeps the error, retry and accessibility paths intact', () => {
    const flatRun = runBlock.replace(/\s+/g, ' ');
    expect(flatRun).toMatch(/catch \{ setError\(true\); [\s\S]*?announceForA11y\(STORY_COPY\.saveError\); \}/);
    expect(src).toContain('retry.current = action');
    expect(src).toMatch(/\{error && <View accessibilityLiveRegion="assertive">/);
    expect(src).toContain('label={STORY_COPY.retry}');
    // Narration is announced bare: it has no speaker to prefix.
    expect(src).toContain('announceForA11y(speakerName ? `${speakerName}. ${line.text}` : line.text)');
    // The modal never closes and re-opens between pages (that would fade).
    expect(src).toContain('visible={!!memory && !!line}');
  });
});

describe('story pages never blink on Android', () => {
  const portrait = fs.readFileSync(path.join(__dirname, '../components/StoryPortrait.tsx'), 'utf8');
  it('draws page art without the default 300 ms Android fade', () => {
    expect(flat).toContain('testID="story-scene-art" resizeMode="contain" fadeDuration={0}');
  });
  it('keeps both portrait frames mounted and toggles opacity instead of swapping source', () => {
    expect(portrait).not.toContain('source={talking ? talk : idle}');
    expect((portrait.match(/fadeDuration=\{0\}/g) ?? []).length).toBe(2);
    expect(portrait).toContain('hidden: { opacity: 0 }');
  });
  it('holds the card at its tallest height within a scene', () => {
    expect(flat).toContain('minHeight: cardFloor && cardFloor.scene === memory?.scene.id');
  });
});
