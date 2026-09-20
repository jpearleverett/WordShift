import { buildPhaseReactionEvent, getPhaseTransitionReaction } from '../services/phaseTransitionReactions';
import type { DialoguePhase } from '../types/homeWorld';

test.each([1, 2, 3, 4, 5] as DialoguePhase[])('phase %i has a specific response with only the starting resident recruited', phase => {
  const reaction = getPhaseTransitionReaction(phase, ['fox']);
  expect(reaction?.speaker).toBe('fox');
  expect(reaction?.text.length).toBeGreaterThan(50);
  const event = buildPhaseReactionEvent(phase, ['fox']);
  expect(event.presentation).toBe('dialogue');
  expect(event.scenes).toEqual([{ ...reaction, delay: 0, duration: 0 }]);
  expect(event.phase).toBe(phase);
});

test('the immediate witness is deterministic and must be an unlocked resident', () => {
  expect(getPhaseTransitionReaction(2, ['fox', 'owl'])?.speaker).toBe('owl');
  expect(getPhaseTransitionReaction(3, ['fox', 'rabbit'])?.speaker).toBe('rabbit');
  expect(getPhaseTransitionReaction(3, ['fox', 'owl'])?.speaker).toBe('fox');
  expect(getPhaseTransitionReaction(4, ['capybara'])?.speaker).toBe('capybara');
  expect(getPhaseTransitionReaction(2, ['not_a_resident'])).toBeNull();
  expect(getPhaseTransitionReaction(0, ['fox'])).toBeNull();
});

test('each phase has a distinct Ember response', () => {
  const reactions = [1, 2, 3, 4, 5].map(phase => getPhaseTransitionReaction(phase as DialoguePhase, ['fox'])?.text);
  expect(new Set(reactions).size).toBe(5);
});

test('the phase-five response respects the actual final boundary and remains neutral for a legacy ending', () => {
  const remember = getPhaseTransitionReaction(5, ['fox'], { boundary: 'remember' })!;
  const release = getPhaseTransitionReaction(5, ['fox'], { boundary: 'release' })!;
  const legacy = getPhaseTransitionReaction(5, ['fox'])!;
  expect(remember.text).toContain('private door stayed shut');
  expect(release.text).toContain('road is still open');
  expect(legacy.text).not.toMatch(/private door|road is still open/);
  expect(getPhaseTransitionReaction(2, ['fox'], { boundary: 'release' }))
    .toEqual(getPhaseTransitionReaction(2, ['fox']));
});
