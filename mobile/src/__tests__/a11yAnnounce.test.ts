/**
 * a11yAnnounce — guarded AccessibilityInfo.announceForAccessibility bridge.
 *
 * Node test env: react-native is stubbed down to just the two APIs the util
 * touches (AccessibilityInfo + findNodeHandle). Covers the trim/dedupe guard,
 * the no-throw contract, optional focus move, and the delay path.
 */

const mockAnnounce = jest.fn();
const mockSetFocus = jest.fn();
let mockFindHandle: (node: unknown) => number | null = () => 77;

jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: (msg: string) => mockAnnounce(msg),
    setAccessibilityFocus: (handle: number) => mockSetFocus(handle),
  },
  findNodeHandle: (node: unknown) => mockFindHandle(node),
}));

import { announceForA11y } from '../services/a11yAnnounce';

beforeEach(() => {
  mockAnnounce.mockReset();
  mockSetFocus.mockReset();
  mockFindHandle = () => 77;
});

describe('announceForA11y', () => {
  it('announces a trimmed message', () => {
    announceForA11y('  Perfect. 15 amber gathered for the pit.  ');
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    expect(mockAnnounce).toHaveBeenCalledWith('Perfect. 15 amber gathered for the pit.');
  });

  it('drops empty, whitespace-only, and non-string messages', () => {
    announceForA11y('');
    announceForA11y('   ');
    announceForA11y(undefined as unknown as string);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('never throws when the native announce fails', () => {
    mockAnnounce.mockImplementationOnce(() => {
      throw new Error('native boom');
    });
    expect(() => announceForA11y('hello')).not.toThrow();
  });

  it('moves accessibility focus when a ref resolves to a handle', () => {
    announceForA11y('hi', { focusRef: { current: {} } });
    expect(mockSetFocus).toHaveBeenCalledWith(77);
  });

  it('skips focus when the handle cannot be resolved', () => {
    mockFindHandle = () => null;
    announceForA11y('hi', { focusRef: { current: {} } });
    expect(mockAnnounce).toHaveBeenCalledWith('hi');
    expect(mockSetFocus).not.toHaveBeenCalled();
  });

  it('accepts a raw numeric focus handle', () => {
    announceForA11y('hi', { focusRef: 42 });
    expect(mockSetFocus).toHaveBeenCalledWith(42);
  });

  it('defers the announcement when delayMs is set', () => {
    jest.useFakeTimers();
    try {
      announceForA11y('later', { delayMs: 500 });
      expect(mockAnnounce).not.toHaveBeenCalled();
      jest.advanceTimersByTime(500);
      expect(mockAnnounce).toHaveBeenCalledWith('later');
    } finally {
      jest.useRealTimers();
    }
  });
});
