/** Contracts for the relationship choice's reading surface and host wiring. */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('HomeScreen hosts the choice page', () => {
  const home = read('components/home/HomeScreen.tsx');

  it('gives the question and answers the entire scrolling sheet', () => {
    expect(home).toContain('{dialogueFlow.choiceOpen && dialogueFlow.activeChoice ? (');
    expect(home).toContain('<DialogueChoicePage');
    const scroll = home.lastIndexOf('<ScrollView', home.indexOf('<DialogueChoicePage'));
    expect(scroll).toBeGreaterThan(0);
    expect(home).not.toContain('dialogueChoiceBtn');
    expect(home).not.toContain('dialogueChoiceRow');
  });

  it('offers postponement while protecting an answer being saved', () => {
    expect(home).toContain('onLater={dialogueFlow.handleCloseDialogue}');
    expect(home).toContain('saving={dialogueFlow.choiceSaving}');
    expect(home).toContain('error={dialogueFlow.choiceError}');
    const scrim = home.indexOf('accessibilityLabel="Close dialogue"');
    expect(scrim).toBeGreaterThan(0);
    const gate = home.lastIndexOf('{!dialogueFlow.choiceSaving && (', scrim);
    expect(gate).toBeGreaterThan(0);
    expect(scrim - gate).toBeLessThan(400);
  });

  it('echoes the pick above the reply, using readable body ink', () => {
    const echo = home.indexOf('<DialogueChoiceEcho');
    const bubble = home.indexOf('style={styles.dialogueBubble}', echo);
    expect(echo).toBeGreaterThan(0);
    expect(bubble).toBeGreaterThan(echo);
    expect(bubble - echo).toBeLessThan(1200);
    expect(home.slice(echo, bubble)).toContain('inkBody={panelSt.body}');
  });
});

describe('DialogueChoicePage reading contracts', () => {
  const page = read('components/home/DialogueChoicePage.tsx');

  it('keeps the full question at reading size without a competing inner frame', () => {
    const prompt = page.slice(page.indexOf('<AppText textRole="reading"'), page.indexOf('<View style={styles.answers}>'));
    expect(prompt).toContain('{choice.prompt}');
    expect(prompt).not.toContain('NineSliceFrame');
    expect(page).not.toContain('numberOfLines');
    expect(page).not.toContain('adjustsFontSizeToFit');
    expect(page).toContain('CHOICE_PORTRAIT_WIDTH = 84');
  });

  it('gives both answers full-width flexible touch targets with the shared frame clearance', () => {
    const block = /\n  answer: \{[\s\S]*?\n  \},/.exec(page);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('SURFACE.cardPadX');
    expect(block![0]).toContain('SURFACE.cardPadY');
    expect(block![0]).toContain('minHeight: 64');
    expect(block![0]).toContain("width: '100%'");
    expect(block![0]).not.toMatch(/\sheight:/);
    expect(page).toContain('<AppText textRole="body" style={[styles.answerText');
    expect(page).toContain("textAlign: 'left'");
  });

  it('uses conversational labels and keeps the selected answer at body size', () => {
    expect(page).toContain('Your response');
    expect(page).toContain('You said');
    const echo = page.slice(page.indexOf('export function DialogueChoiceEcho'), page.indexOf('const styles'));
    expect(echo).toContain('textRole="body"');
    expect(echo).not.toContain('opacity');
  });

  it('announces who asked and what, without revealing any response', () => {
    expect(page).toContain('announceForA11y(`${name}. ${choice.prompt} Your response.`)');
  });

  it('reserves slow-save status space without dimming the answers or sheet', () => {
    expect(page).toContain('const SAVING_REVEAL_MS = 300');
    expect(page).toContain('setTimeout(() => setShowSaving(true), SAVING_REVEAL_MS)');
    expect(page).toContain('clearTimeout(timer)');
    expect(page).toContain('minHeight: 29');
    expect(page).not.toMatch(/opacity: saving/);
  });

  it('player-facing strings carry no em or en dashes', () => {
    expect(page).not.toMatch(/[—–]/);
  });
});
