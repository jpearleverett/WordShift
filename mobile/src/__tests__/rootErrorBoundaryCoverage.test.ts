/**
 * Root ErrorBoundary coverage (boot-persistence-3).
 *
 * MainApp's three screen boundaries wrap renderScreen() only; every overlay
 * rendered after them (the victory receipt, the arrival cinematic, the
 * Store/Patron/GameAlert hosts...) used to be a fatal uncaught render error,
 * and Sentry.wrap composes no error-catching component. App() now mounts
 * MainApp inside a root boundary. App.tsx pulls the full native surface, so
 * this is a static walk of the file (the appIntegration precedent): every
 * overlay must render inside MainApp's body, MainApp must sit inside the root
 * boundary, and no overlay may render outside it.
 */

import fs from 'fs';
import path from 'path';

const APP_TSX = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');

const mainAppStart = APP_TSX.indexOf('function MainApp()');
const bootHoldStart = APP_TSX.indexOf('\nfunction BootHold(');
const rootAppStart = APP_TSX.indexOf('\nfunction App()');
const MAIN_APP_BODY = APP_TSX.slice(mainAppStart, bootHoldStart);
const OUTSIDE_MAIN_APP = APP_TSX.slice(0, mainAppStart) + APP_TSX.slice(bootHoldStart);
const ROOT_APP_BODY = APP_TSX.slice(rootAppStart, APP_TSX.indexOf('const bootStyles = StyleSheet.create'));

/** Every overlay component that renders as a sibling of the screen boundaries. */
const ROOT_OVERLAYS = [
  'VictoryModal',
  'FoxGuide',
  'Confetti',
  'PhaseTransitionOverlay',
  'StorySceneModal',
  'StoryJournalModal',
  'ShareResultModal',
  'DailyLoginModal',
  'NotificationPromptModal',
  'PatronModal',
  'StoreModal',
  'PracticeModal',
  'GameAlertModal',
  'BlindJudgmentOverlay',
  'ScreenTransitionOverlay',
];

describe('root ErrorBoundary coverage', () => {
  test('the file layout the walk relies on is intact', () => {
    expect(mainAppStart).toBeGreaterThan(0);
    expect(bootHoldStart).toBeGreaterThan(mainAppStart);
    expect(rootAppStart).toBeGreaterThan(bootHoldStart);
  });

  test('App() mounts MainApp inside a root ErrorBoundary (Sentry.wrap is not one)', () => {
    expect(ROOT_APP_BODY).toMatch(
      /<ErrorBoundary\s+fallbackMessage="[^"]+"\s+onReset=\{resetAfterRootRenderError\}\s*>\s*<MainApp \/>\s*<\/ErrorBoundary>/
    );
    expect(APP_TSX).toMatch(/export default Sentry\.wrap\(App\);/);
  });

  test.each(ROOT_OVERLAYS)('<%s> renders inside MainApp, and so inside the root boundary', (name) => {
    const tag = new RegExp(`<${name}[\\s/>]`);
    expect(MAIN_APP_BODY).toMatch(tag);
    // Nothing outside MainApp (BootHold, App) may mount an overlay: it would
    // sit outside the boundary again.
    expect(OUTSIDE_MAIN_APP).not.toMatch(tag);
  });

  test('the inner screen boundaries survive so a screen-only error still returns home', () => {
    const inner = MAIN_APP_BODY.match(/<ErrorBoundary/g) ?? [];
    expect(inner.length).toBeGreaterThanOrEqual(3);
    expect(MAIN_APP_BODY).toMatch(/onReset=\{\(\) => setCurrentScreen\('home'\)\}/);
  });

  test('the root reset drops only the transient board autosave and the paint-ahead snapshot', () => {
    const reset = APP_TSX.slice(
      APP_TSX.indexOf('function resetAfterRootRenderError'),
      rootAppStart
    );
    expect(reset).toContain("Promise.all([clearPuzzleState(), clearPuzzleState('daily')])");
    expect(reset).toMatch(/resetHomeSceneSnapshot\(\);/);
    // Durable progress is never touched by a render-error reset.
    expect(reset).not.toMatch(/performFullReset|clearProgress|AsyncStorage\.clear/);
  });

  test('ErrorBoundary is a real boundary (getDerivedStateFromError + componentDidCatch + reportError)', () => {
    const BOUNDARY = fs.readFileSync(path.resolve(__dirname, '../components/ErrorBoundary.tsx'), 'utf8');
    expect(BOUNDARY).toMatch(/static getDerivedStateFromError\(/);
    expect(BOUNDARY).toMatch(/componentDidCatch\(/);
    expect(BOUNDARY).toMatch(/source: 'react_error_boundary'/);
  });
});
