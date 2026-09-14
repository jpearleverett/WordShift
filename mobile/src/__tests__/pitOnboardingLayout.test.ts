import {
  layoutOnboardingWords,
  ONBOARDING_WORD_ROW_GAP,
  ONBOARDING_WORD_MAX_DRIFT,
  type OnboardingWordZone,
} from '../services/pitOnboardingLayout';

const TILE_H = 28;
// The pit's own band on a 390x844 phone once Ember's prompt card has measured.
const ZONE: OnboardingWordZone = { top: 276, bottom: 438.88, left: 10, right: 380 };

/** A word's full travel, drift included — what the player actually has to hit. */
function span(placement: { x: number; y: number; driftAmplitude: number }, width: number) {
  return {
    left: placement.x - placement.driftAmplitude,
    right: placement.x + width + placement.driftAmplitude,
    top: placement.y,
    bottom: placement.y + TILE_H,
  };
}

function overlaps(a: ReturnType<typeof span>, b: ReturnType<typeof span>) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function expectNoOverlaps(widths: number[], zone: OnboardingWordZone) {
  const placements = layoutOnboardingWords(widths, zone, TILE_H);
  const spans = placements.map((placement, index) => span(placement, widths[index]));
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      expect({ a, b, overlap: overlaps(spans[a], spans[b]) }).toEqual({ a, b, overlap: false });
    }
  }
  return { placements, spans };
}

describe('layoutOnboardingWords', () => {
  it('returns nothing for no words', () => {
    expect(layoutOnboardingWords([], ZONE, TILE_H)).toEqual([]);
  });

  // The whole point: during pit_offering there is no Offer All and no continue
  // button, so the step advances only once EVERY word has been tapped. A word
  // hidden under another one is unreachable until the stall rescue fires.
  it('never lets two words overlap, drift included', () => {
    // The opener board's real harvest: PAY / PLAN / HEART at the shipped tile
    // metrics (22 + 1.5 per letter).
    expectNoOverlaps([70.5, 94, 117.5], ZONE);
  });

  it('keeps words apart when the band is crowded', () => {
    expectNoOverlaps([70.5, 94, 117.5, 94, 70.5, 117.5, 94, 70.5], ZONE);
  });

  it('keeps words apart when the prompt card has squeezed the band to one row', () => {
    expectNoOverlaps([70.5, 94, 117.5], { top: 300, bottom: 328, left: 10, right: 380 });
  });

  it('stays inside the band and its sides', () => {
    const { spans } = expectNoOverlaps([70.5, 94, 117.5], ZONE);
    for (const wordSpan of spans) {
      expect(wordSpan.left).toBeGreaterThanOrEqual(ZONE.left);
      expect(wordSpan.right).toBeLessThanOrEqual(ZONE.right);
      expect(wordSpan.top).toBeGreaterThanOrEqual(ZONE.top);
      expect(wordSpan.bottom).toBeLessThanOrEqual(ZONE.bottom);
    }
  });

  it('gives a lone word the middle of the band', () => {
    const [only] = layoutOnboardingWords([94], ZONE, TILE_H);
    expect(only.y).toBeCloseTo(ZONE.top + (ZONE.bottom - ZONE.top - TILE_H) / 2, 5);
  });

  it('stacks into rows before it starts a second column', () => {
    const roomy: OnboardingWordZone = { top: 0, bottom: 28 + 3 * (TILE_H + ONBOARDING_WORD_ROW_GAP), left: 0, right: 300 };
    const placements = layoutOnboardingWords([60, 60, 60, 60], roomy, TILE_H);
    // Four rows fit, so every word gets its own and the column never splits.
    expect(new Set(placements.map(placement => placement.y)).size).toBe(4);
  });

  it('splits into columns once the rows run out', () => {
    const shallow: OnboardingWordZone = { top: 0, bottom: TILE_H + (TILE_H + ONBOARDING_WORD_ROW_GAP), left: 0, right: 300 };
    const placements = layoutOnboardingWords([60, 60, 60, 60], shallow, TILE_H);
    expect(new Set(placements.map(placement => placement.y)).size).toBe(2);
    expect(new Set(placements.map(placement => placement.x)).size).toBe(4);
  });

  it('never drifts a word further than its cell can spare', () => {
    // A word nearly as wide as its cell has no room to move at all.
    const [tight] = layoutOnboardingWords([298], { top: 0, bottom: 200, left: 0, right: 300 }, TILE_H);
    expect(tight.driftAmplitude).toBeLessThanOrEqual(1);
    const [loose] = layoutOnboardingWords([60], { top: 0, bottom: 200, left: 0, right: 300 }, TILE_H);
    expect(loose.driftAmplitude).toBe(ONBOARDING_WORD_MAX_DRIFT);
  });
});
