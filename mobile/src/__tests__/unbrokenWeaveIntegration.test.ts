import fs from 'fs';
import path from 'path';

const APP_TSX = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
const MENU_TSX = fs.readFileSync(
  path.resolve(__dirname, '../components/puzzle/DifficultyMenu.tsx'),
  'utf8',
);

describe('Unbroken Weave player-facing wiring', () => {
  test('DifficultyMenu exposes an accessible Phase-5-only toggle with canonical copy', () => {
    expect(MENU_TSX).toMatch(/showUnbrokenWeave && phase === 5/);
    expect(MENU_TSX).toContain('UNBROKEN WEAVE');
    expect(MENU_TSX).toContain('Each letter may cross the chain only once.');
    expect(MENU_TSX).toMatch(/accessibilityRole="button"/);
    expect(MENU_TSX).toMatch(/accessibilityState=\{\{ selected: unbrokenWeaveActive \}\}/);
    expect(MENU_TSX).toMatch(/Unbroken Weave, \$\{unbrokenWeaveActive \? 'on' : 'off'\}/);
  });

  test('App starts a fresh forced-standard board and threads autosave/menu state', () => {
    expect(APP_TSX).toMatch(/const handleToggleUnbrokenWeave = useCallback/);
    expect(APP_TSX).toMatch(
      /startNewGame\(\s*puzzle\.difficulty,\s*'standard',\s*'standard',\s*false,\s*!puzzle\.unbrokenWeaveMode/s,
    );
    expect(APP_TSX).toMatch(/unbrokenWeaveMode: puzzle\.unbrokenWeaveMode/);
    expect(APP_TSX).toMatch(/spentLetters: puzzle\.spentLetters/);
    expect(APP_TSX).toMatch(/showUnbrokenWeave=\{persistence\.currentPhase === 5\}/);
    expect(APP_TSX).toMatch(/unbrokenWeaveActive=\{puzzle\.unbrokenWeaveMode\}/);
    expect(APP_TSX).toMatch(/onToggleUnbrokenWeave=\{handleToggleUnbrokenWeave\}/);
  });

  test('App displays a compact thread badge with the spent count', () => {
    expect(APP_TSX).toMatch(/puzzle\.unbrokenWeaveMode &&/);
    // The thread glyph now renders as the generated weave sprite (via the
    // shared mode-icon resolver), not a bare emoji.
    expect(APP_TSX).toContain("getModeIconSprite('🧵')");
    expect(APP_TSX).toMatch(/puzzle\.spentLetters\.length/);
    expect(APP_TSX).toMatch(/Unbroken Weave is on.*letters spent/);
  });

  test('cold-open and incompatible setup choices explicitly turn the mode off', () => {
    expect(APP_TSX).toMatch(/saved\.unbrokenWeaveMode !== true/);
    expect(APP_TSX).toMatch(
      /startNewGame\('EASY', 'standard', 'standard', false, false, undefined, false\)/,
    );
    expect(APP_TSX).toMatch(
      /startNewGame\(\s*puzzle\.difficulty,\s*puzzle\.gameMode,\s*variant,\s*undefined,\s*false,\s*\)/s,
    );
    // The Challenge toggle keeps blind (undefined) but still forces weave off
    // (the `false` at the 5th arg) and flips the undo-limit flag at the 7th.
    expect(APP_TSX).toMatch(
      /startNewGame\(\s*puzzle\.difficulty,\s*newMode,\s*puzzle\.selectedVariant,\s*undefined,[^\n]*\n\s*false,[^\n]*\n\s*undefined,[^\n]*\n\s*newUndoLimited,/s,
    );
  });
});
