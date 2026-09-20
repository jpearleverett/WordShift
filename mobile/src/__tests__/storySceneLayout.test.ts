import { getStorySceneLayout } from '../components/storySceneLayout';
import { SURFACE } from '../theme/surfaces';

describe('decision illustrations leave room for the conversation', () => {
  it.each([
    [320, 568, 24, 24, 1],
    [393, 873, 48, 24, 1],
    [390, 844, 44, 34, 2],
    [844, 390, 0, 24, 1],
    [768, 1024, 24, 24, 1.5],
  ])('fits a %ix%i viewport', (width, height, top, bottom, scale) => {
    const layout = getStorySceneLayout(width, height, top, bottom, scale);
    expect(layout.cardWidth + 32).toBeLessThanOrEqual(width);
    expect(layout.cardMaxHeight + top + bottom + 32).toBeLessThanOrEqual(height);
    expect(layout.scrollMaxHeight + SURFACE.panelPadY * 2).toBe(layout.cardMaxHeight);
    expect(layout.artWidth).toBeGreaterThan(0);
    expect(layout.artWidth).toBeLessThanOrEqual(layout.cardWidth - SURFACE.panelPadX * 2);
    expect(layout.artHeight).toBeLessThanOrEqual(136);
    expect(layout.artWidth / layout.artHeight).toBeCloseTo(16 / 9);
    expect(layout.scrollMaxHeight - layout.artHeight).toBeGreaterThan(180);
  });

  it('reduces artwork rather than text at larger reading scales', () => {
    const normal = getStorySceneLayout(390, 844, 44, 34, 1);
    const enlarged = getStorySceneLayout(390, 844, 44, 34, 2);
    expect(enlarged.artHeight).toBeLessThan(normal.artHeight);
    expect(enlarged.portraitSize).toBeLessThan(normal.portraitSize);
    expect(enlarged.scrollMaxHeight).toBe(normal.scrollMaxHeight);
  });
});
