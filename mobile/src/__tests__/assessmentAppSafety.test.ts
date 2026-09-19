import fs from 'fs';
import path from 'path';

const app = fs.readFileSync(path.join(__dirname, '../../App.tsx'), 'utf8');
const between = (start: string, end: string) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));

test('boot retries retain the alert host while hydration is held', () => {
  const boot = between('const bootHeld =', '// Helper: render the active screen content');
  expect(boot).toContain('|| !ceremonyReady');
  expect(boot).not.toContain('!alertPending');
  expect(boot).toContain('<GameAlertModal key="game-alert-host"');
  expect(app.match(/<GameAlertModal key="game-alert-host"/g)).toHaveLength(2);
});

test('the overlay scheduler holds the speed clock across practice, alerts, rule teaching and the store', () => {
  const overlays = between('const overlayOwner = useGlobalOverlays', 'const [presentedPhaseEvent');
  for (const request of ['practice: practiceLesson !== null', 'alert: alertPending', 'store: showStoreModal']) {
    expect(overlays).toContain(request);
  }
  expect(overlays).toContain("setSpeedTimerOverlayPaused(overlayOwner !== null || previewGraduationBlocked || currentScreen !== 'puzzle')");
});

test('leaving a live board resets the speed ladder and daily identity only at the screen swap', () => {
  const home = between('const handleGoHome =', '// Reset All completed');
  const swap = home.indexOf("transitionTo('home', () => {");
  expect(home.indexOf('resetSpeedRun()')).toBeGreaterThan(swap);
  expect(home.indexOf('setIsPlayingDaily(false)')).toBeGreaterThan(swap);
  expect(home.indexOf('setGameState(GameState.IDLE)')).toBeGreaterThan(swap);
});

test('hardware Back delegates a visible ceremony and uses the same live-board Home path', () => {
  const back = between('// Android hardware back button', '// Speed rescue:');
  expect(back).toContain('if (phaseTransitionEvent !== null) return false;');
  expect(back).toContain("if (currentScreen === 'puzzle') handleGoHome();");
  expect(back).not.toContain('phaseTransitionEvent !== null ||');
});

test('home Play exposes storage failure through a retry alert', () => {
  const play = between('const handlePlayPuzzle =', '// Return to home screen');
  expect(play).toContain('showGameAlert(copy.title, copy.message');
  expect(play).toContain('void handlePlayPuzzle(difficulty)');
  expect(play).not.toContain('puzzleActions.setMessage');
});

test('daily handoffs never clear a preserved normal-board save on victory exit', () => {
  expect(between('const startDailyBoard =', '// Start the Daily Challenge')).toContain("loadPuzzleState('daily')");
  expect(app).toContain("await clearPuzzleState(isPlayingDaily ? 'daily' : 'normal')");
  expect(between('const startVictoryExitFlow =', '// Navigation & puzzle lifecycle handlers')).not.toContain('clearPuzzleState()');
});
