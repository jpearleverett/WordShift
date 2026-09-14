/**
 * errorReporting: the ErrorUtils global handler is the one runtime hook this
 * module installs. The old `global.onunhandledrejection` assignment was dead
 * code on React Native (nothing ever dispatched it) and is gone; unhandled
 * rejections are Sentry's alone, so the module must neither install a
 * browser-style hook nor claim to.
 */
import fs from 'fs';
import path from 'path';

jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));

import { logEvent } from '../services/eventLogger';
import {
  installGlobalErrorHandler,
  reportError,
  setErrorForwarder,
  clearSessionErrors,
  getSessionErrors,
} from '../services/errorReporting';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../services/errorReporting.ts'), 'utf8');

describe('installGlobalErrorHandler', () => {
  let originalErrorUtils: unknown;
  let installed: ((error: Error, isFatal?: boolean) => void) | null;
  const previousHandler = jest.fn();

  beforeEach(() => {
    installed = null;
    originalErrorUtils = (global as Record<string, unknown>).ErrorUtils;
    (global as Record<string, unknown>).ErrorUtils = {
      getGlobalHandler: () => previousHandler,
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => { installed = handler; },
    };
    delete (global as Record<string, unknown>).onunhandledrejection;
    clearSessionErrors();
    setErrorForwarder(null);
    (logEvent as jest.Mock).mockClear();
    previousHandler.mockClear();
  });

  afterEach(() => {
    (global as Record<string, unknown>).ErrorUtils = originalErrorUtils;
    delete (global as Record<string, unknown>).onunhandledrejection;
  });

  test('installs the ErrorUtils handler and chains to the previous one', () => {
    installGlobalErrorHandler();
    expect(installed).not.toBeNull();
    const boom = new Error('boom');
    installed!(boom, true);
    expect(previousHandler).toHaveBeenCalledWith(boom, true);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'app_error',
      data: expect.objectContaining({ message: 'boom', source: 'global_error_handler', isFatal: true }),
    }));
    expect(getSessionErrors()).toHaveLength(1);
  });

  test('does not install a browser-style onunhandledrejection hook (dead on React Native)', () => {
    installGlobalErrorHandler();
    expect((global as Record<string, unknown>).onunhandledrejection).toBeUndefined();
    expect(SOURCE).not.toMatch(/onunhandledrejection\s*=/);
    expect(SOURCE).not.toContain("'unhandled_promise_rejection'");
  });

  test('the module documents that rejections reach Sentry only', () => {
    expect(SOURCE).toMatch(/Unhandled PROMISE REJECTIONS are\s*\*\s*NOT captured here/);
  });

  test('a throwing forwarder never breaks local reporting', () => {
    setErrorForwarder(() => { throw new Error('transport down'); });
    expect(() => reportError('quiet', { source: 'test' })).not.toThrow();
    expect(getSessionErrors()).toHaveLength(1);
  });
});
