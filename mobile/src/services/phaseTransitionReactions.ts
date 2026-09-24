import type { AnimalType, DialoguePhase } from '../types/homeWorld';
import type { FinalArrivalContext, PhaseTransitionEvent } from './phaseEvents';

const RESIDENTS: readonly AnimalType[] = [
  'fox', 'owl', 'capybara', 'red_panda', 'axolotl', 'pangolin', 'sloth',
  'fennec_fox', 'wombat', 'rabbit', 'tarsier', 'aye_aye', 'kakapo',
];

const EMBER_REACTIONS: Record<Exclude<DialoguePhase, 0>, string> = {
  1: "That cup warmed before I touched the kettle. You saw it too, didn't you? Come sit by me a moment. I'd like to work out what happened.",
  2: "The fire has gone quiet, and the room is still getting warmer. I've opened the door a little. Tell me if you feel it too.",
  3: "You felt that weight in the house. I did too. I owe you more than another cup of tea. When you're ready, come and ask me what I know.",
  4: "Now you know what the words were feeding. I knew some of it when I asked you to help build this home, and I kept it to myself. I'm wearing the robe. It hasn't made me sure of anything.",
  5: "It's here, and it's staying. I keep waiting for it to tidy something. So far it's only listened back. Sit with me, if you like.",
};

const OTHER_REACTIONS: Record<Exclude<DialoguePhase, 0>, string> = {
  1: "Did you feel the room change just then? I'd like to sit here with you a moment and see what happens next.",
  2: "The whole house went quiet just then. I can still hear you beside me. Stay a moment, if you'd like.",
  3: "That weight in the air reached my room too. I don't know what comes next. I would rather say that to you than pretend I do.",
  4: "The house feels different now. I've put on this robe, but I've still got questions. You can ask yours too.",
  5: "It's here. I just heard a cup being set down, an ordinary little sound. I think I'll stay close to ordinary things for a while.",
};

/** A separate event response; never borrows or consumes an unread conversation line. */
export function getPhaseTransitionReaction(
  phase: DialoguePhase,
  unlockedAnimals: readonly string[],
  context?: Pick<FinalArrivalContext, 'boundary'>,
): { speaker: AnimalType; text: string } | null {
  if (phase === 0) return null;
  const preferred: AnimalType = phase === 2 ? 'owl' : phase === 3 ? 'rabbit' : 'fox';
  const speaker = unlockedAnimals.includes(preferred) ? preferred
    : RESIDENTS.find(animal => unlockedAnimals.includes(animal));
  if (!speaker) return null;
  let text = speaker === 'fox' ? EMBER_REACTIONS[phase] : OTHER_REACTIONS[phase];
  if (phase === 2 && speaker === 'owl') {
    text = "Every page in my study lifted at once just then. No draft, as far as I can tell. I've written down the time. If you noticed anything, I'd like your account beside mine.";
  } else if (phase === 3 && speaker === 'rabbit') {
    text = "Oh. You felt that too. The soil warmed under both my paws, all at once. I'm keeping my seed tin with me tonight. Would you walk back to the garden with me?";
  } else if (phase === 5 && speaker === 'fox' && context?.boundary === 'remember') {
    text = "It is here, and the private door stayed shut. I will not ask what you keep behind it. I will sit out here with you, if you want the company.";
  } else if (phase === 5 && speaker === 'fox' && context?.boundary === 'release') {
    text = "It is here, and the road is still open. If you want some air, take it. There will be a place by the hearth when you choose to come back.";
  }
  return { speaker, text };
}

export function buildPhaseReactionEvent(
  phase: DialoguePhase,
  unlockedAnimals: readonly string[],
  context?: Pick<FinalArrivalContext, 'boundary'>,
): PhaseTransitionEvent {
  const reaction = getPhaseTransitionReaction(phase, unlockedAnimals, context);
  if (!reaction) throw new Error('The saved phase response has no available resident.');
  return {
    presentation: 'dialogue', phase, title: '', readAtOwnPace: true,
    bgColor: '#100B15', textColor: '#F2E7D6', accentColor: '#E7C796',
    scenes: [{ ...reaction, delay: 0, duration: 0 }],
  };
}
