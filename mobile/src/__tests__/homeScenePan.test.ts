import { clampHomeScenePanY, resolveHomeScenePanY } from '../services/homeScenePan';

describe('clampHomeScenePanY', () => {
  test('clamps negative pan values to zero', () => {
    expect(clampHomeScenePanY(-25, 180)).toBe(0);
  });

  test('clamps oversized pan values to the current max', () => {
    expect(clampHomeScenePanY(260, 180)).toBe(180);
  });
});

describe('resolveHomeScenePanY', () => {
  test('uses the default framed position on first mount', () => {
    expect(resolveHomeScenePanY({ currentPanY: null, savedPanY: null, maxPanY: 140 })).toBe(140);
  });

  test('restores the saved pan position after a remount', () => {
    expect(resolveHomeScenePanY({ currentPanY: null, savedPanY: 92, maxPanY: 140 })).toBe(92);
  });

  test('preserves the live viewport when the house grows', () => {
    expect(resolveHomeScenePanY({ currentPanY: 92, savedPanY: 40, maxPanY: 190 })).toBe(92);
  });

  test('clamps the live viewport when the visible bounds shrink', () => {
    expect(resolveHomeScenePanY({ currentPanY: 92, savedPanY: 92, maxPanY: 60 })).toBe(60);
  });
});
