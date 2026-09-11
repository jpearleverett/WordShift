/**
 * The relationship choice's own page (components/home/DialogueChoicePage):
 * source pins for the host wiring and the page's contracts. The flow itself
 * (Next turns the card over, must answer, echoed pick) is driven through the
 * hook in dialogueFlowPagination.test.ts.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('HomeScreen hosts the choice page', () => {
  const home = read('components/home/HomeScreen.tsx');

  it('turns the card over to DialogueChoicePage while the choice is open, in place of both columns', () => {
    expect(home).toContain('{dialogueFlow.choiceOpen && dialogueFlow.activeChoice ? (');
    expect(home).toContain('<DialogueChoicePage');
    // The old inline option buttons under the bubble are gone for good.
    expect(home).not.toContain('dialogueChoiceBtn');
    expect(home).not.toContain('dialogueChoiceRow');
  });

  it('does not render the scrim close control while the card is turned over', () => {
    const scrim = home.indexOf('accessibilityLabel="Close dialogue"');
    expect(scrim).toBeGreaterThan(0);
    const gate = home.lastIndexOf('{!dialogueFlow.choiceOpen && (', scrim);
    expect(gate).toBeGreaterThan(0);
    expect(scrim - gate).toBeLessThan(400);
  });

  it('echoes the pick above the bubble, in the reading column', () => {
    const echo = home.indexOf('<DialogueChoiceEcho');
    const bubble = home.indexOf('style={styles.dialogueBubble}', echo);
    expect(echo).toBeGreaterThan(0);
    expect(bubble).toBeGreaterThan(echo);
    expect(bubble - echo).toBeLessThan(1200);
  });
});

describe('DialogueChoicePage contracts', () => {
  const page = read('components/home/DialogueChoicePage.tsx');

  it('the answers are real controls: pressable, sounded, card-framed, speech-aligned', () => {
    expect(page).toContain('accessibilityRole="button"');
    expect(page).toContain("playUiSound('dialogue')");
    expect(page).toContain('skin={skin.card}');
    expect(page).toContain("textAlign: 'left'");
    // The pressed state is a fill change, never an opacity dim of the frame.
    expect(page).toContain('pressedVeil');
  });

  it('the answer tray clears the card band on both axes from the shared tokens', () => {
    const block = /\n  answer: \{[\s\S]*?\n  \},/.exec(page);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('SURFACE.cardPadX');
    expect(block![0]).toContain('SURFACE.cardPadY');
  });

  it('names the speaker of the answers, and of the echoed pick', () => {
    expect(page).toContain("export const CHOICE_SPEAKER_MARK = 'YOU'");
    const marks = page.split('{CHOICE_SPEAKER_MARK}').length - 1;
    expect(marks).toBe(2);
  });

  it('announces who asked and what when the page opens, and nothing the page does not show', () => {
    expect(page).toContain('announceForA11y(`${name}. ${choice.prompt} Your answer.`)');
  });

  it('player-facing strings carry no em or en dashes', () => {
    expect(page).not.toMatch(/[—–]/);
  });
});
