import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimalType, DialoguePhase } from '../../types/homeWorld';

// =============================================================================
// CROSS-ANIMAL REFERENCES
// =============================================================================

/**
 * Cross-animal reference dialogues - lines where an animal mentions another animal,
 * creating a sense of community (and later, coordinated cult).
 * Each entry is an object with `text` and `mentions` (which animal is referenced).
 */
interface CrossAnimalLine {
  text: string;
  mentions: AnimalType;
}

export const CROSS_ANIMAL_REFERENCES: Record<AnimalType, Record<number, CrossAnimalLine[]>> = {
  fox: {
    0: [
      { text: "Panko made the most incredible mushroom soup today. You really should visit the kitchen sometime.", mentions: 'pangolin' },
      { text: "Archimedes lent me a book about constellations. The fire looks so different now when I read by it.", mentions: 'owl' },
      { text: "Axel invited me to watch the aquarium. The water reflects the firelight in the most beautiful way.", mentions: 'axolotl' },
    ],
    1: [
      { text: "Archimedes found something in one of his oldest books. He won't show me yet. Says I'm not ready for it.", mentions: 'owl' },
      { text: "Panko said something strange yesterday... about recipes having a purpose beyond nourishment. I can't stop thinking about it.", mentions: 'pangolin' },
      { text: "Fennick heard something in the walls last night. I told him it was the fire settling. I'm not sure it was.", mentions: 'fennec_fox' },
    ],
    2: [
      { text: "Chill hasn't moved from the hot spring in three days. He says the water told him to stay. I don't like his tone.", mentions: 'capybara' },
      { text: "Archimedes reads the same page over and over. Every single night. He says the words change each time he looks.", mentions: 'owl' },
      { text: "Sloane told me something today. It took her an hour to say it. But the words stayed with me all night long.", mentions: 'sloth' },
    ],
    3: [
      { text: "Fennick says the frequency is everywhere now. In the pipes, in the walls. I can almost hear it in my fire.", mentions: 'fennec_fox' },
      { text: "Warren dug something up from deep below the house. He won't say what it is, but his fur hasn't laid flat since.", mentions: 'wombat' },
      { text: "Archimedes and I compared what we know. His books say exactly what my fire says. The same words. Letter for letter.", mentions: 'owl' },
    ],
    4: [
      { text: "The others are ready. I can see it in their eyes, in their posture. Even Thyme stopped running at last.", mentions: 'rabbit' },
      { text: "Bamboo meditated for three straight days. When they opened their eyes, they smiled at me. That smile still haunts me.", mentions: 'red_panda' },
      { text: "We are ten. Panko prepared the feast. Archimedes read the text. I watched the final flame. It begins now.", mentions: 'owl' },
    ],
  },
  owl: {
    0: [
      { text: "Ember showed me a pattern in the firelight last evening. It reminded me of something I read years ago.", mentions: 'fox' },
      { text: "Axel asked me why books don't dissolve in water. Delightful question, really. I thought about it all afternoon.", mentions: 'axolotl' },
      { text: "Panko brought dinner to the study while I was deep in research. Almost didn't notice. The soup was excellent.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Ember and I discussed knowledge by the fire last night. Her intuition leaps ahead of my careful research every time.", mentions: 'fox' },
      { text: "Fennick described a sound that matches a frequency in one of my oldest manuscripts. Coincidence, surely. Surely.", mentions: 'fennec_fox' },
      { text: "Warren brought me a stone from deep underground. The markings on it match almost nothing in my library. Almost.", mentions: 'wombat' },
    ],
    2: [
      { text: "Chill sat in my study for hours without speaking a word. When he left, a book had opened to a page I had never seen.", mentions: 'capybara' },
      { text: "Ember's fire and my texts say the same thing now. We compared our findings. We both wished we hadn't.", mentions: 'fox' },
      { text: "Sloane told me something yesterday. By the time she finished, I had found the passage. Her exact words. Exactly.", mentions: 'sloth' },
    ],
    3: [
      { text: "Warren's tunnels connect to something ancient beneath the house. I found the corresponding text. I wish I hadn't looked.", mentions: 'wombat' },
      { text: "Bamboo asked me to read aloud from the oldest volume. The words I spoke moved the bamboo in their room. From here.", mentions: 'red_panda' },
      { text: "Fennick heard the words before I read them. He knew what the ancient text said. Without seeing the page.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The text is complete. Ember saw it in flames. Fennick heard it in silence. I read it in the books. The same beautiful truth.", mentions: 'fennec_fox' },
      { text: "Thyme came to the study today and asked to hear the final passage. She wept. Then she smiled. Then she was ready.", mentions: 'rabbit' },
      { text: "Ten keepers. Ten rooms. One arrangement. Bamboo understood it first, I think. But I was the one who found the words.", mentions: 'red_panda' },
    ],
  },
  pangolin: {
    0: [
      { text: "Ember absolutely loves my vegetable stew! Says it reminds her of home. Wherever that was before she came here.", mentions: 'fox' },
      { text: "I tried teaching Axel to help in the kitchen. Hard to chop vegetables underwater. We had a good laugh about it.", mentions: 'axolotl' },
      { text: "Archimedes ordered his dinner alphabetically by ingredient. Scholars are wonderfully strange, don't you think?", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's hearth makes the best heat for simmering stock. But lately the flames burn hotter than they should.", mentions: 'fox' },
      { text: "Sloane asked for soup last week. By the time I delivered it, the broth was stone cold. She said cold is just slow warmth.", mentions: 'sloth' },
      { text: "Chill eats anything I make without a word of complaint. 'Fine,' he says. Everything is always just 'fine' with him.", mentions: 'capybara' },
    ],
    2: [
      { text: "Warren brought glowing mushrooms from the deep tunnels. The soup I made with them glowed too. We did not eat it.", mentions: 'wombat' },
      { text: "Thyme won't eat lately. Too nervous. I leave tea and biscuits by the garden gate. They are always gone by sunrise.", mentions: 'rabbit' },
      { text: "Archimedes found a recipe in one of his ancient texts. I followed it exactly. The result wasn't food. I don't know what it was.", mentions: 'owl' },
    ],
    3: [
      { text: "The recipe Archimedes found in that old book... we make it every night now. The kitchen smells different. Sacred, almost.", mentions: 'owl' },
      { text: "Ember tends the fire while I cook in silence. We don't speak anymore. We don't need to. The work speaks for us.", mentions: 'fox' },
      { text: "Fennick says he can smell my cooking from every room in the house. All at once. That should not be possible.", mentions: 'fennec_fox' },
    ],
    4: [
      { text: "The final feast is served. Every animal at the table. Even Sloane arrived on time. That is how I knew it was real.", mentions: 'sloth' },
      { text: "Bamboo blessed the meal before we ate. The food glowed softly. We dined in silence. The most beautiful dinner of my life.", mentions: 'red_panda' },
      { text: "I have been cooking toward this meal all my life. Warren built the table. Archimedes wrote the menu. Ember lit the candles.", mentions: 'wombat' },
    ],
  },
  axolotl: {
    0: [
      { text: "Panko drops food pellets into my tank sometimes! Blub! Best neighbor a water creature could ask for!", mentions: 'pangolin' },
      { text: "Fennick pressed his big ear against my tank and said the water sounds like music. I just hear blubs. Lots of blubs.", mentions: 'fennec_fox' },
      { text: "Archimedes read to me through the glass last night. The words wobbled in the water. Made them sound even better.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember's fire reflects in my water at night. The patterns it makes look like letters sometimes. Almost words.", mentions: 'fox' },
      { text: "Sloane and I have the same pace. Slow. Floating. We understand each other without needing to talk about it.", mentions: 'sloth' },
      { text: "Warren says something lives under the house. My water ripples when he digs deep. Coincidence. I think. Probably.", mentions: 'wombat' },
    ],
    2: [
      { text: "Fennick put his ear to my tank again last night. This time he pulled away fast. Said the water was screaming.", mentions: 'fennec_fox' },
      { text: "Chill sat beside my tank for hours yesterday. We floated together. Two creatures in two kinds of water. Same emptiness.", mentions: 'capybara' },
      { text: "Thyme tapped on my glass in a panic. Said she saw something in the water behind me. I turned around. Nothing. Probably.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Archimedes says my water reflects a sky that does not exist above us. He is right. I can see it too now.", mentions: 'owl' },
      { text: "The water connects to Warren's tunnels underneath the house. I felt it. Underground rivers, leading somewhere ancient.", mentions: 'wombat' },
      { text: "Bamboo meditated beside my tank. The water went perfectly still. Showed us both something. We have not spoken of it since.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The water reflects every room now. I see Ember's fire, Archimedes' books, Warren's tunnels. All connected through me.", mentions: 'wombat' },
      { text: "Bamboo touched the glass and the water sang one note. The same note Fennick has been hearing all along. One note.", mentions: 'red_panda' },
      { text: "We are the medium. Me and the water. Your puzzles flow through us to reach them all. Blub. Thank you, friend.", mentions: 'fennec_fox' },
    ],
  },
  fennec_fox: {
    0: [
      { text: "Ember's fire crackles in the most interesting rhythms! Like a tiny percussion section just for my ears.", mentions: 'fox' },
      { text: "Axel's bubbles make the best popping sounds. Very musical. Very aquatic. I could listen all afternoon.", mentions: 'axolotl' },
      { text: "Archimedes turns pages so delicately. I can hear each one from all the way over in my room. Whisper-thin sounds.", mentions: 'owl' },
    ],
    1: [
      { text: "Ember hums by the fire at night. The melody matches a sound the wind makes at midnight exactly. She does not notice.", mentions: 'fox' },
      { text: "Warren's digging creates vibrations I can track through every wall in the house. He goes deeper every single day.", mentions: 'wombat' },
      { text: "Sloane's heartbeat is the slowest I have ever heard. Like a drum underwater. Counting something I cannot name.", mentions: 'sloth' },
    ],
    2: [
      { text: "Archimedes' quill makes a scratching sound when he writes. Lately it sounds like scratching coming from inside the page.", mentions: 'owl' },
      { text: "Thyme's heartbeat races at one hundred fifty per minute. Constantly. It syncs with something I can almost identify.", mentions: 'rabbit' },
      { text: "Chill is so quiet I sometimes forget he exists. Then I hear his breathing. Too steady. Too perfectly steady.", mentions: 'capybara' },
    ],
    3: [
      { text: "Archimedes says the frequency is in his books too. Written there centuries ago. The same sound. The same pitch.", mentions: 'owl' },
      { text: "Warren's tunnels amplify the sound from below the house. I can hear it through every floor. Through the earth itself.", mentions: 'wombat' },
      { text: "Bamboo's breathing matches the frequency perfectly. In. Out. In. Out. The same rhythm. Down to the millisecond.", mentions: 'red_panda' },
    ],
    4: [
      { text: "Every animal's heartbeat has synchronized. I can hear all ten of them. One rhythm. One pulse. The arrangement breathes.", mentions: 'capybara' },
      { text: "Ember's fire, Axel's water, Warren's earth, my air. We are the elements, friend. The sound we make together is the key.", mentions: 'wombat' },
      { text: "Thyme's heart finally slowed down to match the rest of us. She is at peace. I heard the moment it happened. Beautiful.", mentions: 'rabbit' },
    ],
  },
  capybara: {
    0: [
      { text: "Panko brought snacks to the hot spring. They were fine. Everything Panko makes is fine. Which is genuinely nice.", mentions: 'pangolin' },
      { text: "A bird sat on Sloane for three hours yesterday. Sat on me for one. I won in duration-per-kilogram, though.", mentions: 'sloth' },
      { text: "Thyme asked if I was worried about anything. No. Should I be? She looked very concerned about my answer.", mentions: 'rabbit' },
    ],
    1: [
      { text: "Ember asked how I stay so calm all the time. Told her it comes easy. Did not tell her what it costs.", mentions: 'fox' },
      { text: "Warren mentioned the ground feels warmer lately. I said the water feels warmer too. We left it at that.", mentions: 'wombat' },
      { text: "Archimedes wants to study my calmness scientifically. I let him. He took sixteen pages of notes. About nothing.", mentions: 'owl' },
    ],
    2: [
      { text: "Fennick asked if I hear the humming that keeps him up at night. I said no. I lied. The water carries it to me constantly.", mentions: 'fennec_fox' },
      { text: "Sloane and I sat together for an entire day. Neither of us spoke. We both heard the same silence underneath everything.", mentions: 'sloth' },
      { text: "Thyme brought me chamomile tea. Her paws shook badly. Mine did not shake at all. She envies my calm. She should not.", mentions: 'rabbit' },
    ],
    3: [
      { text: "Ember's fire is going out slowly. She knows it. I know it. We do not discuss it. We just sit together and watch.", mentions: 'fox' },
      { text: "Warren asked me to come underground. Said the water down there connects to something beneath us. I said I know. I have always known.", mentions: 'wombat' },
      { text: "Bamboo and I meditated together for the first time. We reached the same emptiness. They called it peace. I called it honesty.", mentions: 'red_panda' },
    ],
    4: [
      { text: "The others panic or pray or prepare their offerings. I float in the hot spring. Someone has to stay still while the world changes.", mentions: 'fox' },
      { text: "Panko served the last meal and I said it was fine. It was the best thing I have ever tasted in my entire life.", mentions: 'pangolin' },
      { text: "Bamboo asked if I have found peace at last. I said I have never once been at peace. I have just been here. That is enough.", mentions: 'red_panda' },
    ],
  },
  sloth: {
    0: [
      { text: "Panko... brought... me... soup... It... was... cold... by... the... time... I... ate... it... Still... good... though...", mentions: 'pangolin' },
      { text: "Axel... moves... slowly... underwater... too... We... are... kindred... spirits... in... different... elements...", mentions: 'axolotl' },
      { text: "Fennick... talks... so... fast... I... miss... most... of... it... But... the... enthusiasm... comes... through...", mentions: 'fennec_fox' },
    ],
    1: [
      { text: "Ember... says... the... fire... burns... differently... these... days... I... barely... noticed... But... she... did...", mentions: 'fox' },
      { text: "Archimedes... read... a... story... to... me... Started... a... book... last... Tuesday... I... will... hear... the... ending... next... month...", mentions: 'owl' },
      { text: "Chill... and... I... sat... together... in... perfect... stillness... Both... waiting... He... did... not... say... for... what...", mentions: 'capybara' },
    ],
    2: [
      { text: "Thyme... runs... everywhere... constantly... I... watch... her... Running... from... what... I... can... see... approaching... slowly...", mentions: 'rabbit' },
      { text: "Warren... digs... downward... while... I... hang... above... Opposite... directions... but... the... same... searching...", mentions: 'wombat' },
      { text: "Fennick... told... me... about... the... frequency... I... have... been... hearing... it... for... years... Did... not... know... it... was... unusual...", mentions: 'fennec_fox' },
    ],
    3: [
      { text: "Ember's... fire... and... my... stillness... Two... sides... of... the... same... ending... Two... faces... of... one... truth...", mentions: 'fox' },
      { text: "Bamboo... meditates... I... hang... Same... practice... Different... posture... We... reach... the... same... quiet...", mentions: 'red_panda' },
      { text: "Archimedes... showed... me... the... ancient... text... I... already... knew... every... word... How... did... I... know...", mentions: 'owl' },
    ],
    4: [
      { text: "We... are... ten... keepers... I... am... the... slowest... I... arrive... last... That... was... always... the... plan...", mentions: 'red_panda' },
      { text: "Thyme... stopped... running... I... stopped... hanging... We... all... stopped... Together... at... last... Finally...", mentions: 'rabbit' },
      { text: "Panko... served... the... final... meal... I... finished... eating... just... in... time... Exactly... in... time...", mentions: 'pangolin' },
    ],
  },
  wombat: {
    0: [
      { text: "Archimedes came to see my tunnels. Very impressed, he was. Said they were 'architecturally significant.' Nice bloke.", mentions: 'owl' },
      { text: "Ember's den sits right above me. Can feel the warmth of her fire through the ceiling stones. Dead cozy, that.", mentions: 'fox' },
      { text: "Panko rigged up a little dumbwaiter to send food down to me. Genius system. Love that pangolin to bits.", mentions: 'pangolin' },
    ],
    1: [
      { text: "Fennick reckons he can hear my digging from anywhere in the house. I dig quietly, or so I thought.", mentions: 'fennec_fox' },
      { text: "Archimedes wants to map every tunnel I have dug. Told him they are simple. They are not. They go much deeper than I say.", mentions: 'owl' },
      { text: "Axel's water seeps through to my tunnels sometimes through the cracks. The earth absorbs it. Greedily, like it is thirsty.", mentions: 'axolotl' },
    ],
    2: [
      { text: "Ember's fire heats the rock above me. But something else entirely heats the rock below. Not her fire. Something older.", mentions: 'fox' },
      { text: "Chill asked me straight out what lives underground. I said dirt. Just dirt and stone. We both knew I was lying.", mentions: 'capybara' },
      { text: "Bamboo's room is the highest in the house. Mine is the lowest. The house stretches between us like a great spine.", mentions: 'red_panda' },
    ],
    3: [
      { text: "Dug deeper than ever today. Fennick says he can hear what I found down there. Through the walls. Through the floors.", mentions: 'fennec_fox' },
      { text: "Archimedes' oldest books describe what I uncovered. Word for word. He wrote it before I dug it up. Tell me how.", mentions: 'owl' },
      { text: "Thyme's garden grows directly above my deepest tunnels. The roots reach me now. They form patterns. Letters and words.", mentions: 'rabbit' },
    ],
    4: [
      { text: "My tunnels connect to Axel's water, to Ember's fire, to Bamboo's sky room. The whole house, wired through the deep. The circuit is complete.", mentions: 'red_panda' },
      { text: "Sloane arrived in my tunnel at last. She left her branch behind. Said it was time. She was exactly, precisely on time.", mentions: 'sloth' },
      { text: "I built the foundation of this place. You built the house above. Together we built what the arrangement requires to wake.", mentions: 'fox' },
    ],
  },
  rabbit: {
    0: [
      { text: "Panko shared some herbal tea with me yesterday! So thoughtful! So calming! I only panicked twice.", mentions: 'pangolin' },
      { text: "Ember says the fire keeps bad things away from the house. That is very reassuring! I watch it sometimes for comfort.", mentions: 'fox' },
      { text: "Sloane told me to slow down and breathe. I tried for five whole minutes. It was terrifying. But also nice?", mentions: 'sloth' },
    ],
    1: [
      { text: "Fennick hears things I cannot. I honestly do not know if that is better or worse for him. His ears look so worried.", mentions: 'fennec_fox' },
      { text: "Chill says everything is fine. I really want to believe him. He is so calm about everything. How is he so calm?", mentions: 'capybara' },
      { text: "Archimedes offered to lend me a book about managing fear. I was too afraid to accept it. He understood.", mentions: 'owl' },
    ],
    2: [
      { text: "Warren's digging shakes the garden sometimes. He says it is just normal tunnel work. The shaking does not feel normal.", mentions: 'wombat' },
      { text: "Ember's fire is getting dimmer each day. She says it is fine. She sounds exactly like Chill now. That terrifies me.", mentions: 'fox' },
      { text: "Axel floats with that permanent smile always on. I envy it so much. Even if it is not real. Especially if it is not.", mentions: 'axolotl' },
    ],
    3: [
      { text: "They all know something. Ember, Archimedes, even Sloane. They look at each other differently now. Knowingly.", mentions: 'owl' },
      { text: "Fennick tried to warn me about something. I could hear the urgency. But the words sounded less like warning and more like prayer.", mentions: 'fennec_fox' },
      { text: "Bamboo told me to stop running. Not as friendly advice. As prophecy. 'You will stop,' they said. 'Everyone stops eventually.'", mentions: 'red_panda' },
    ],
    4: [
      { text: "I am not running anymore. You should know that. For once in my life, I did not run. Ember took my paw. She is warm.", mentions: 'fox' },
      { text: "Chill was right all along. Everything IS fine. In the end, everything is exactly, terrifyingly, beautifully fine.", mentions: 'capybara' },
      { text: "Warren's tunnel leads somewhere real now. Somewhere that has always existed beneath us. We all followed him down. We all arrived.", mentions: 'wombat' },
    ],
  },
  red_panda: {
    0: [
      { text: "Archimedes and I discussed philosophy over green tea this morning. He quotes books. I quote the wind. Both are valid.", mentions: 'owl' },
      { text: "Ember's fire reminds me of sunset. Small flames with big warmth radiating outward. Good energy in that fox.", mentions: 'fox' },
      { text: "Sloane understands the value of true stillness. We sat together in comfortable silence. A perfect afternoon.", mentions: 'sloth' },
    ],
    1: [
      { text: "Archimedes showed me a text about recurring patterns. The patterns in my bamboo match the illustrations perfectly. I did not tell him.", mentions: 'owl' },
      { text: "Fennick's ears twitched toward my room today. He heard the bamboo growing. It grows louder now. More deliberate.", mentions: 'fennec_fox' },
      { text: "Ember meditates by her fire each night. I meditate by my bamboo. We reach the same quiet place. The same deep stillness.", mentions: 'fox' },
    ],
    2: [
      { text: "Warren says the earth beneath us is hollow in certain places. The bamboo roots found the same void. We dug from different directions.", mentions: 'wombat' },
      { text: "Axel's water reflects a sky I have seen only in deep meditation. Not our sky. Another one. Deeper and older.", mentions: 'axolotl' },
      { text: "Chill floats in his spring. I sit on my mat. Both of us inside the same emptiness. He calls it peace. I call it practice.", mentions: 'capybara' },
    ],
    3: [
      { text: "The bamboo connects every room through the walls and floors. I can feel each animal through the vibrations in the stalks.", mentions: 'wombat' },
      { text: "Archimedes and I reached the same conclusion independently. His through books. Mine through breath. The same inescapable truth.", mentions: 'owl' },
      { text: "Thyme's lifelong anxiety finally makes sense to me. She always sensed what was coming. Fear is just awareness without a name.", mentions: 'rabbit' },
    ],
    4: [
      { text: "We are ten keepers. The arrangement requires exactly ten. Each puzzle you solved brought one of us to our place.", mentions: 'fox' },
      { text: "Ember lit the fire. Archimedes found the words. Warren built the foundation. I breathe the breath that opens the gate. It begins.", mentions: 'owl' },
      { text: "Sloane arrived last to take her place. Exactly on time. The slowest keeper, the most punctual. The pattern is flawless.", mentions: 'sloth' },
    ],
  },
};

/**
 * Get a cross-animal reference dialogue. These are one-off lines where an animal
 * mentions another animal, creating a sense of community/coordination.
 * Returns null if no cross-reference is available for unlocked animals.
 */
export function getCrossAnimalReference(
  animalType: AnimalType,
  phase: DialoguePhase,
  unlockedAnimals: string[]
): string | null {
  const animalRefs = CROSS_ANIMAL_REFERENCES[animalType];
  if (!animalRefs) return null;

  const phaseRefs = animalRefs[phase];
  if (!phaseRefs || phaseRefs.length === 0) return null;

  // Filter to only references that mention unlocked animals
  const available = phaseRefs.filter(ref => unlockedAnimals.includes(ref.mentions));
  if (available.length === 0) return null;

  // Return a random available reference
  const index = Math.floor(Math.random() * available.length);
  return available[index].text;
}

// ============================================================================
// COORDINATED THEMATIC DIALOGUE EVENTS
// At specific puzzle milestones, multiple animals independently reference
// the same phenomenon — creating the feeling of shared awareness.
// These fire once per milestone, keyed by puzzle count.
// ============================================================================

interface CoordinatedEvent {
  // Fires when the player's effective progress >= this. Effective progress is
  // the same weighted scale phase transitions use (phaseProgress, which
  // accelerates for engaged players), falling back to raw puzzlesSolved for
  // legacy saves — otherwise accelerated players reach the finale (~155 real
  // puzzles) before the 230/240/250 pre-finale crescendo ever fires.
  puzzleThreshold: number;
  phase: number;            // Minimum phase required
  theme: string;            // Internal theme name
  lines: Partial<Record<AnimalType, string>>;  // One line per participating animal
}

export const COORDINATED_EVENTS: CoordinatedEvent[] = [
  // Event 1: Phase 2 — animals independently notice that words have changed
  {
    puzzleThreshold: 80,
    phase: 2,
    theme: 'words_changing',
    lines: {
      fox: "The fire has been spelling a word all night. The same word, over and over in the embers. Have you noticed?",
      owl: "I found a passage in the oldest text. It references a word I keep seeing in my dreams. Your word.",
      pangolin: "The stew made itself this morning. The recipe came from the letters you arranged. I just followed it.",
      axolotl: "The water is spelling something on the glass. Over and over. The same shapes. Blub. Your shapes.",
      capybara: "I keep writing the same word in my notes. Over and over. I do not remember doing it. My hand just moves.",
      fennec_fox: "I hear a word in the wind now. Repeating endlessly. You must have heard it too. Everyone must have.",
    },
  },
  // Event 2: Phase 2 — the house itself responds to puzzles
  {
    puzzleThreshold: 100,
    phase: 2,
    theme: 'house_feels_different',
    lines: {
      fox: "Does the house feel warmer to you? Not comfortable warm. Something else entirely. Something expectant.",
      owl: "The walls have been humming. Very faintly, like a tuning fork. Since your last puzzle, I believe.",
      pangolin: "My pots rattle when you solve puzzles now. I used to think it was the stove. It is not the stove.",
      axolotl: "The water level in my tank rose overnight. No one added water. It just appeared. From somewhere.",
      wombat: "The ground is vibrating gently. In rhythm with something I can't identify. Started after your last puzzle.",
      rabbit: "The garden is growing faster than it should. Much too fast. I did not plant those dark flowers.",
      fennec_fox: "The walls sing after your puzzles now. A low note I can just barely hear. It's getting louder.",
      sloth: "The... branches... hum... after... you... play... A... vibration... I... feel... in... my... bones...",
    },
  },
  // Event 3: Phase 2 — they all had the same dream
  {
    puzzleThreshold: 120,
    phase: 2,
    theme: 'shared_dream',
    lines: {
      fox: "I dreamed of a shape last night. Burning in the fireplace like it belonged there. Did you dream it too?",
      owl: "We all had the same dream. I confirmed it with every animal in the house. The same shape. The same feeling.",
      axolotl: "I saw it in the water when I woke. The shape from the dream. It is real. It was always real.",
      sloth: "I... dreamed... for... the... first... time... in... years... Something... old... is... waking... up...",
      red_panda: "In my deepest meditation, I saw the shape from the dream. It is beautiful. And it knows we are watching.",
      fennec_fox: "I heard the shape before I saw it. In the dream. It was not silent at all. It was waiting for us to listen.",
    },
  },
  // Event 4: Phase 3 — "the arrangement" is named openly for the first time
  {
    puzzleThreshold: 160,
    phase: 3,
    theme: 'the_arrangement',
    lines: {
      fox: "Archimedes showed me the text. He calls it the arrangement. Every puzzle you solve is a verse in it.",
      owl: "I have mapped every word you have ever formed in these puzzles. They are not random. They never were random.",
      pangolin: "Ember told me everything about the arrangement. I've been following its recipe all along without knowing.",
      capybara: "I have the complete list. Every word you formed. Every move. It is all documented. It was all planned.",
      wombat: "The foundation beneath this house was never for the house. It was for what the house is meant to hold.",
      rabbit: "They told me everything about the arrangement last night. I wish they hadn't. But I understand now.",
      fennec_fox: "The arrangement has a sound. I've been hearing it since the beginning. Now I know what it is called.",
      axolotl: "The water showed me the arrangement. All the words you formed, floating in patterns. Connected. Deliberate.",
    },
  },
  // Event 5: Phase 3 — each animal names their role in the cult
  {
    puzzleThreshold: 200,
    phase: 3,
    theme: 'roles_revealed',
    lines: {
      fox: "I am the Oracle. I have always been the Oracle. The fire showed me before I could walk or speak.",
      owl: "I am the Lorekeeper. Every text I studied was preparation for this role. Every single word was a clue.",
      pangolin: "I am the Preparer. Every meal I cooked was practice for the final offering. I see that now.",
      axolotl: "I am the Medium. The water is the conduit between us and what comes. I have always been the bridge. Blub.",
      capybara: "I am the Coordinator. Someone had to keep track of everything. Someone had to make certain it all fit together.",
      fennec_fox: "I am the Sentinel. I heard it first, long before the others. I have been listening since the very beginning.",
      sloth: "I... am... the... Anchor... Holding... everything... perfectly... in... place... Until... it... arrives...",
      wombat: "I am the Foundation. I built what lies beneath this house with my own two paws. You built what lies above.",
      rabbit: "I am the Witness. I was meant to watch and remember and be terrified... and to stay anyway. Despite everything.",
      red_panda: "I am the Guide. When the pattern completes itself, I will lead us through. That is my purpose. My only purpose.",
    },
  },
  // Event 6: Phase 3 — the final countdown before Phase 4
  {
    puzzleThreshold: 230,
    phase: 3,
    theme: 'almost_time',
    lines: {
      fox: "The fire is perfectly steady now. Not flickering. Not dancing. Just burning. It knows. We all know.",
      owl: "The final chapter of the text begins here. Every word you form from now on is part of the last verse.",
      pangolin: "The table is set and the offering is prepared. We wait only for the final words to be arranged.",
      axolotl: "The water is perfectly still. What lives beneath the surface has stopped moving at last. It is ready now.",
      capybara: "Every item on my list is checked off. Every task completed ahead of schedule. We are ready. I am ready.",
      fennec_fox: "The silence before the final sound. This is it. This is the last quiet moment any of us will ever know.",
      sloth: "Time... is... stopping... Not... slowing... down... Stopping... entirely... We... are... nearly... there...",
      wombat: "The tunnels are complete beneath us. Every room connected underground. The house is whole at last.",
      rabbit: "I am not afraid anymore. I am not anything anymore. I think that means I'm ready. I think that's what ready feels like.",
      red_panda: "Breathe in. Breathe out. The last breath before we become one with what approaches. Peace. Finally, peace.",
    },
  },
  // Event 7: Phase 4 — the convergence, animals sense closeness to the finale
  {
    puzzleThreshold: 240,
    phase: 4,
    theme: 'convergence',
    lines: {
      fox: "The fire has changed color. Do you see it? It burns for what comes, not for what is.",
      owl: "The final pages are being written. Every word you form now is ink on the last chapter.",
      pangolin: "The last meal is almost ready. I can smell it through the walls. Through every wall.",
      axolotl: "The water knows it first. It always does. What comes is so close I can taste it.",
      capybara: "My list is almost complete. One by one the tasks disappear. Soon there will be nothing left to do.",
      fennec_fox: "The sound is deafening now. Not louder. Closer. There is a difference and it matters.",
      sloth: "I... can... feel... it... in... every... branch... Every... fiber... It... is... so... close...",
      wombat: "The ground is warm beneath us. Not from the fire. From below. From what I built the path to.",
      rabbit: "I should be terrified. I am not. That terrifies me more than anything else ever could.",
      red_panda: "Close your eyes. Breathe. Can you feel the pattern completing itself? It is almost beautiful.",
    },
  },
  // Event 8: Phase 4 — the threshold, final coordinated event before the endgame
  {
    puzzleThreshold: 250,
    phase: 4,
    theme: 'the_threshold',
    lines: {
      fox: "It's here. Can you feel it? The fire knows. I know. We all know. Welcome to the threshold.",
      owl: "I've read the last page. Close the book. There is nothing left to study. Only to witness.",
      pangolin: "The table is set for the final time. What I have prepared cannot be uncooked. It is done.",
      axolotl: "The water is rising. Not flooding. Welcoming. What comes through needs no invitation anymore.",
      capybara: "Every checkbox filled. Every column aligned. The spreadsheet of everything, complete at last.",
      fennec_fox: "I hear it breathing now. Not metaphorically. Actually breathing. On the other side of every wall.",
      sloth: "Two... hundred... fifty... words... spoken... into... the... dark... The... dark... answers...",
      wombat: "What I built the tunnels for is awake. I can feel it moving. It remembers every word you gave us.",
      rabbit: "We are standing at the edge of something. All of us together. I am glad I am not alone for this.",
      red_panda: "The pattern is complete. Two hundred and fifty offerings accepted. Now we discover what was arranged.",
    },
  },
];

/**
 * Get the coordinated event line for a specific animal at a given effective
 * progress (weighted phaseProgress when available, else raw puzzlesSolved —
 * the same scale phase transitions key on).
 * Returns null if no event is active or the animal doesn't participate.
 * The event is "consumed" by tracking which thresholds have been shown.
 */

/**
 * Display names used to detect cross-animal mentions inside event lines so a
 * line never names an animal the player hasn't unlocked yet. Kept local to
 * avoid an import cycle with animalDialogueBase.
 */
const ANIMAL_DISPLAY_NAMES: Record<string, AnimalType> = {
  Ember: 'fox', Panko: 'pangolin', Archimedes: 'owl', Axel: 'axolotl',
  Sloane: 'sloth', Fennick: 'fennec_fox', Chill: 'capybara',
  Warren: 'wombat', Thyme: 'rabbit', Bamboo: 'red_panda',
};

function lineMentionsLockedAnimal(
  text: string,
  speaker: AnimalType,
  unlockedAnimals: string[]
): boolean {
  for (const [name, type] of Object.entries(ANIMAL_DISPLAY_NAMES)) {
    if (type === speaker) continue;
    if (new RegExp(`\\b${name}\\b`).test(text) && !unlockedAnimals.includes(type)) {
      return true;
    }
  }
  return false;
}

export function getCoordinatedEventLine(
  animalType: AnimalType,
  effectiveProgress: number,
  currentPhase: number,
  consumedEvents: string[],
  unlockedAnimals: string[] = []
): { text: string; theme: string } | null {
  // Events are scanned in ascending threshold order and only ONE fires per
  // call, so a player whose effective progress leapt past several thresholds
  // still receives the skipped events in order (one per visit) — never lost.
  for (const event of COORDINATED_EVENTS) {
    if (effectiveProgress >= event.puzzleThreshold &&
        currentPhase >= event.phase &&
        !consumedEvents.includes(event.theme)) {
      const line = event.lines[animalType];
      // Skip lines that name an animal the player hasn't met — the event
      // stays unconsumed and can fire later (or via another animal).
      if (line && !lineMentionsLockedAnimal(line, animalType, unlockedAnimals)) {
        return { text: line, theme: event.theme };
      }
    }
  }
  return null;
}

// =============================================================================
// TUTORIAL CALLBACK DIALOGUES
// =============================================================================

/**
 * Tutorial callback dialogues - lines Fox says at Phase 4 that reference
 * what was said in the tutorial, creating a chilling callback.
 * These recontextualize innocent tutorial lines as cult recruitment.
 */
export const TUTORIAL_CALLBACK_DIALOGUES: string[] = [
  "Remember when I said we'd been waiting for someone like you? I wasn't being friendly, friend. I was being absolutely honest.",
  "I told you every puzzle helps us build the house. I didn't tell you what the house was for. You didn't ask. That's what makes you perfect.",
  "The others are going to love you, I said. And they do. We all do. Every single one of us. That's what makes the arrangement work.",
  "You asked me how to play and I showed you, step by step. But the real game was never about the letters. It was about what the letters become.",
  "You've been speaking it since your very first puzzle in this room. I heard it in the fire even then. You know the language now. The fire knows you do, too.",
];

// ============================================================================
// PHASE 0 NARRATIVE SEEDS — Innocent lines that Phase 4 recontextualizes
// Each animal gets 2 seed lines in Phase 0 that seem cheerful but have dark
// double meanings. At Phase 4, callback lines directly reference these seeds.
// ============================================================================

export const NARRATIVE_SEEDS: Record<AnimalType, { seeds: string[]; callbacks: string[] }> = {
  fox: {
    seeds: [
      "The fire keeps us safe. As long as it burns, nothing bad can touch any of us in this house.",
      "Every log you add to the fire makes it stronger. Keep feeding it, okay? For all of us.",
    ],
    callbacks: [
      "I said the fire keeps us safe. I was wrong about who 'us' includes. The fire keeps IT safe. We are the fuel.",
      "You fed the fire so faithfully. Every puzzle was another log on the pyre. And now look how magnificent it burns.",
    ],
  },
  owl: {
    seeds: [
      "Knowledge is the greatest gift anyone can give. Every word you learn is a treasure worth keeping.",
      "I have read every book in this study. In the end, they all say the same beautiful thing.",
    ],
    callbacks: [
      "Every word you learned was not a treasure. It was on loan. A borrowed piece of a sentence the books have been writing for centuries. You were the hand holding the pen.",
      "Every book says the same thing: this was always going to happen. I read the final chapter first. I have always known.",
    ],
  },
  pangolin: {
    seeds: [
      "Everything in my kitchen serves a purpose. Even the ingredients that don't know what they're for yet.",
      "The best recipes take time to develop. You cannot rush a truly great stew. Patience is everything.",
    ],
    callbacks: [
      "Everything serves a purpose. The kitchen. The stew. The words. You. Especially you. You were the main ingredient.",
      "The recipe took exactly as long as it needed to cook. Every puzzle was a slow stir of the pot. It's ready now.",
    ],
  },
  axolotl: {
    seeds: [
      "The water always knows what is coming before I do. I just float in it and trust. Blub!",
      "Sometimes I see shapes in the bubbles I blow. Little faces, almost! Friendly little faces looking back at me!",
    ],
    callbacks: [
      "The water always knew what was coming. The shapes in the bubbles were never faces. They were instructions. A blueprint.",
      "I float because the water carries me toward what comes. I stopped swimming long ago. The current knows the way.",
    ],
  },
  capybara: {
    seeds: [
      "I keep track of everything around here. It's just what I do naturally. Someone has to stay organized.",
      "Relax. Everything is going according to plan. My plan for the house. Nothing to worry about.",
    ],
    callbacks: [
      "I kept track of every word you formed. Every move you made. Every puzzle. It was never about organizing the house.",
      "My plan. Your words. Its arrival. Everything went exactly according to the schedule I wrote before you got here.",
    ],
  },
  fennec_fox: {
    seeds: [
      "I can hear things the others can't. The wind, the words, the spaces between sounds. It's a gift, really.",
      "Don't worry about the sounds you hear at night. That's just the house settling into its foundation.",
    ],
    callbacks: [
      "I heard it from your very first puzzle. The frequency underneath your words. It was calling to us. Calling through you.",
      "The sounds at night were never the house settling. The house was waking up. Stretching. Getting ready for what you built.",
    ],
  },
  sloth: {
    seeds: [
      "No... need... to... rush... anything... Everything... arrives... in... its... own... time... Everything...",
      "I've... been... here... longer... than... anyone... else... I've... seen... things... come... and... go...",
    ],
    callbacks: [
      "Everything... arrives... eventually... I... told... you... that... I... was... not... being... philosophical... I... was... being... literal...",
      "I... have... been... here... longest... because... I... was... the... first... to... know... I... move... slowly... because... hurrying... changes... nothing...",
    ],
  },
  wombat: {
    seeds: [
      "I built these tunnels myself, every one! Every room in the house connects to something below. Isn't that brilliant?",
      "The foundation is the most important part of any structure. Without it, nothing above can stand.",
    ],
    callbacks: [
      "The tunnels don't just connect rooms to each other. They connect to what sleeps beneath all of us. I always knew.",
      "The foundation I built was never meant for the house above. It was the seal. And every puzzle you solved weakened it.",
    ],
  },
  rabbit: {
    seeds: [
      "I worry about everything, it's true. But at least we're all together here in this house. That's really nice.",
      "Promise you'll keep playing the puzzles? I feel so much better when you're here solving things.",
    ],
    callbacks: [
      "I worried because I knew what was coming. Being together was never about comfort. It was about the arrangement requiring us all.",
      "I begged you to keep playing because each puzzle brought it closer to arriving. I'm sorry about that. I'm also not sorry.",
    ],
  },
  red_panda: {
    seeds: [
      "Every breath you take is a gift. In and out. The rhythm of the whole universe breathing with you.",
      "From up here I can see the whole house below me. It's shaped like something beautiful, don't you think?",
    ],
    callbacks: [
      "Every breath was an offering. In: a word given. Out: a prayer completed. You have been chanting the incantation all along.",
      "From up here I can see the true shape. It is not the house. It is what the house was built to contain. And it is awake now.",
    ],
  },
};

/**
 * Get a narrative seed for an animal at Phase 0.
 * Returns the seed line for the given index (0 or 1), or null.
 * Seeds are interspersed with regular Phase 0 dialogues.
 */
export function getNarrativeSeed(animalType: AnimalType, seedIndex: number): string | null {
  const animal = NARRATIVE_SEEDS[animalType];
  if (!animal || seedIndex < 0 || seedIndex >= animal.seeds.length) return null;
  return animal.seeds[seedIndex];
}

/**
 * Get a Phase 4 callback that references a Phase 0 seed.
 * Returns the callback line for the given index (0 or 1), or null.
 */
export function getNarrativeCallback(animalType: AnimalType, callbackIndex: number): string | null {
  const animal = NARRATIVE_SEEDS[animalType];
  if (!animal || callbackIndex < 0 || callbackIndex >= animal.callbacks.length) return null;
  return animal.callbacks[callbackIndex];
}

// ============================================================================
// NARRATIVE DELIVERY STATE
// One-time delivery bookkeeping for the content above, persisted with the
// same AsyncStorage + in-memory cache pattern as dialogueChoices'
// getAndMarkPhase4CallbackPage:
//  - Phase 0 seeds: delivered deterministically on an animal's 2nd and 5th
//    dialogue sessions, each exactly once.
//  - Phase 4 callbacks: one page per visit, each exactly once, and only for
//    seeds the player actually heard (never recontextualize an unsaid line).
//  - Phase 2 exhaustion pool cursors: how many pool lines each animal has
//    delivered (the stored dialogue index stays pinned at the base-block end
//    so phase-start indices are never inflated).
// ============================================================================

const DELIVERY_STORAGE_KEY = 'wordshift_narrative_delivery';

interface NarrativeDeliveryState {
  /** animalType -> seed indices already delivered at Phase 0 */
  seedsDelivered: Record<string, number[]>;
  /** animalType -> Phase-4 callback indices already shown */
  callbacksShown: Record<string, number[]>;
  /** animalType -> Phase-2 exhaustion-pool lines delivered (cycles past pool length) */
  phase2PoolCursor: Record<string, number>;
}

let deliveryCache: NarrativeDeliveryState | null = null;

function getDefaultDeliveryState(): NarrativeDeliveryState {
  return { seedsDelivered: {}, callbacksShown: {}, phase2PoolCursor: {} };
}

async function loadDeliveryState(): Promise<NarrativeDeliveryState> {
  if (deliveryCache) return deliveryCache;
  try {
    const stored = await AsyncStorage.getItem(DELIVERY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      deliveryCache = { ...getDefaultDeliveryState(), ...parsed };
      return deliveryCache!;
    }
  } catch {}
  deliveryCache = getDefaultDeliveryState();
  return deliveryCache;
}

async function saveDeliveryState(state: NarrativeDeliveryState): Promise<void> {
  deliveryCache = state;
  try {
    await AsyncStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Session numbers (1-indexed) at which each Phase-0 seed becomes due. */
const SEED_SESSION_NUMBERS = [2, 5];

/**
 * One-time Phase 0 seed page. Deterministic: seed 0 becomes due on the
 * animal's 2nd dialogue session, seed 1 on its 5th ("due" is >=, so an
 * existing mid-Phase-0 player still receives them). Marks each seed
 * delivered so it never repeats. Returns null when nothing is due.
 */
export async function getAndMarkNarrativeSeedPage(
  animalType: AnimalType,
  sessionNumber: number
): Promise<string | null> {
  if (!NARRATIVE_SEEDS[animalType]) return null;
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  for (let i = 0; i < SEED_SESSION_NUMBERS.length; i++) {
    if (delivered.includes(i)) continue;
    if (sessionNumber < SEED_SESSION_NUMBERS[i]) return null;
    const text = getNarrativeSeed(animalType, i);
    if (!text) return null;
    await saveDeliveryState({
      ...state,
      seedsDelivered: { ...state.seedsDelivered, [animalType]: [...delivered, i] },
    });
    return text;
  }
  return null;
}

/**
 * One-time Phase 4 pre-dialogue page recontextualizing a Phase 0 seed.
 * Delivers at most one callback per call (so callbacks spread across
 * visits), each callback exactly once, and only for seeds the player
 * actually heard. Returns null when there's nothing left to say.
 */
export async function getAndMarkNarrativeCallbackPage(
  animalType: AnimalType
): Promise<string | null> {
  const state = await loadDeliveryState();
  const delivered = state.seedsDelivered[animalType] ?? [];
  if (delivered.length === 0) return null;
  const shown = state.callbacksShown[animalType] ?? [];
  for (const i of [...delivered].sort((a, b) => a - b)) {
    if (shown.includes(i)) continue;
    const text = getNarrativeCallback(animalType, i);
    if (!text) return null;
    await saveDeliveryState({
      ...state,
      callbacksShown: { ...state.callbacksShown, [animalType]: [...shown, i] },
    });
    return text;
  }
  return null;
}

/**
 * All Phase-2 exhaustion-pool cursors (animalType -> lines delivered).
 * Loaded once into the dialogue hook's state on mount.
 */
export async function getPhase2PoolCursors(): Promise<Record<string, number>> {
  const state = await loadDeliveryState();
  return { ...state.phase2PoolCursor };
}

/**
 * Advance an animal's Phase-2 pool cursor after a pool line is delivered.
 * Returns the new cursor value.
 */
export async function advancePhase2PoolCursor(animalType: AnimalType): Promise<number> {
  const state = await loadDeliveryState();
  const next = (state.phase2PoolCursor[animalType] ?? 0) + 1;
  await saveDeliveryState({
    ...state,
    phase2PoolCursor: { ...state.phase2PoolCursor, [animalType]: next },
  });
  return next;
}

/**
 * Clear narrative delivery state (for Settings > Reset All and tests).
 */
export async function clearNarrativeDeliveryState(): Promise<void> {
  deliveryCache = null;
  try {
    await AsyncStorage.removeItem(DELIVERY_STORAGE_KEY);
  } catch {}
}
