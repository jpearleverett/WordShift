/**
 * Global Jest setup (`setupFilesAfterEnv` in jest.config.js). It runs inside
 * EVERY suite's own module registry, before the suite's first test.
 *
 * A suite that reaches `logEvent` without mocking `services/eventLogger` arms
 * that module's 5 s debounce timer. Under `--runInBand` (how CI runs the
 * suite) one process outlives every suite, so the timer fires during a later
 * suite, after the arming suite's environment is torn down, and the flush's
 * deferred require trips Jest's import-after-teardown guard: every test green,
 * exit code 1 (CI run 442 on main). Cancelling the timer after each suite closes
 * this for every suite that arms it in its live module registry. A suite that
 * resets or isolates the registry AFTER arming is not reached (the require
 * below resolves in the current registry only): mock eventLogger or call
 * clearEvents() there yourself.
 */
afterAll(() => {
  let mod: { cancelPendingFlushForTests?: unknown } | undefined;
  try {
    // Same registry as the suite: a `jest.mock` of the module hands back the
    // mock (nothing armed), and a never-imported module loads cheaply with
    // nothing to cancel. Guarded so a suite whose mocks make it unloadable
    // still passes.
    mod = require('../../services/eventLogger');
  } catch {
    return;
  }
  if (typeof mod?.cancelPendingFlushForTests === 'function') {
    (mod.cancelPendingFlushForTests as () => void)();
  }
});
