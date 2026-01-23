import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';

/**
 * All dialogue content organized by animal and phase
 * Each animal has a unique personality that evolves from cheerful to existential crisis
 */

// RED PANDA - Zen/contemplative style, bamboo wisdom
const RED_PANDA_DIALOGUES: Dialogue[] = [
  // Phase 0 - Happy and zen
  { id: 'rp_0_1', text: "Welcome, friend! The bamboo is especially crunchy today.", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_2', text: "I find peace in the rustling of leaves. Have you tried just... listening?", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_3', text: "My tail is extra fluffy today. This brings me great joy!", phase: 0, animalType: 'red_panda' },
  { id: 'rp_0_4', text: "Each puzzle you solve adds harmony to the universe. I believe this.", phase: 0, animalType: 'red_panda' },

  // Phase 1 - Curious, slightly philosophical
  { id: 'rp_1_1', text: "I was watching the clouds today. They never repeat. Isn't that strange?", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_2', text: "The bamboo grows so slowly, yet it never seems worried about time.", phase: 1, animalType: 'red_panda' },
  { id: 'rp_1_3', text: "Do you think the puzzles are solving us, in a way?", phase: 1, animalType: 'red_panda' },

  // Phase 2 - Questioning existence
  { id: 'rp_2_1', text: "I meditated for hours and saw only darkness. The void was... warm?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_2', text: "The bamboo I ate yesterday is gone. Where does it go? Where do we go?", phase: 2, animalType: 'red_panda' },
  { id: 'rp_2_3', text: "I counted my stripes today. Tomorrow there may be different stripes. Or no stripes at all.", phase: 2, animalType: 'red_panda' },

  // Phase 3 - Existential dread
  { id: 'rp_3_1', text: "The mountain does not care if we climb it. The bamboo does not know it is eaten.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_2', text: "I achieved inner peace once. Then I realized peace is just the space between catastrophes.", phase: 3, animalType: 'red_panda' },
  { id: 'rp_3_3', text: "My ancestors climbed these trees for millennia. None of them are here now.", phase: 3, animalType: 'red_panda' },

  // Phase 4 - Complete philosophical crisis
  { id: 'rp_4_1', text: "The void doesn't stare back. It doesn't need to. We stare at ourselves.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_2', text: "I am one with everything. Everything is nothing. Therefore, I am nothing. This is fine.", phase: 4, animalType: 'red_panda' },
  { id: 'rp_4_3', text: "Something is coming. I feel it in my fur. The bamboo trembles with a knowledge it cannot speak.", phase: 4, animalType: 'red_panda' },
];

// AXOLOTL - Dreamy, aquatic thoughts
const AXOLOTL_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'ax_0_1', text: "Blub blub! The water is lovely today! Come swim with me... oh wait, you can't. Sorry!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_2', text: "I grew back a whole leg once! Being me is pretty great, honestly.", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_3', text: "My gills are extra frilly today. I feel fancy!", phase: 0, animalType: 'axolotl' },
  { id: 'ax_0_4', text: "I don't need to grow up if I don't want to. Eternal youth! Wheee!", phase: 0, animalType: 'axolotl' },

  // Phase 1
  { id: 'ax_1_1', text: "I can regrow my heart. But if I lose my feelings, can I grow those back too?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_2', text: "The water holds me. But what holds the water? What holds... anything?", phase: 1, animalType: 'axolotl' },
  { id: 'ax_1_3', text: "I'm always smiling. Even my face doesn't know how not to. Is that happiness or just... shape?", phase: 1, animalType: 'axolotl' },

  // Phase 2
  { id: 'ax_2_1', text: "They say I can live forever in the right conditions. But what are the right conditions for a soul?", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_2', text: "I never grew up. I'm stuck between states. Neither larva nor adult. Neither here nor there.", phase: 2, animalType: 'axolotl' },
  { id: 'ax_2_3', text: "If I lose a limb, which one of us is really me? The leg that's gone or the one growing back?", phase: 2, animalType: 'axolotl' },

  // Phase 3
  { id: 'ax_3_1', text: "My lake dried up a long time ago. We all live in artificial lakes now. Is anything real anymore?", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_2', text: "I can regenerate anything except the past. I've tried. It doesn't grow back.", phase: 3, animalType: 'axolotl' },
  { id: 'ax_3_3', text: "Sometimes I float to the surface and pretend I can see the sky. The glass ceiling is always there.", phase: 3, animalType: 'axolotl' },

  // Phase 4
  { id: 'ax_4_1', text: "The water is getting warmer. Everything is getting warmer. I can feel something ending.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_2', text: "I was never supposed to become anything. And now I understand—neither were any of us.", phase: 4, animalType: 'axolotl' },
  { id: 'ax_4_3', text: "When the wave comes, will it wash us away or finally set us free? I can feel it building.", phase: 4, animalType: 'axolotl' },
];

// PANGOLIN - Practical, curling into philosophical balls
const PANGOLIN_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'pg_0_1', text: "Just made the most delicious ant stew! Want the recipe? It's mostly ants.", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_2', text: "I polished my scales today. Very shiny! Very protective! Very me!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_3', text: "When in doubt, curl into a ball. It solves most problems!", phase: 0, animalType: 'pangolin' },
  { id: 'pg_0_4', text: "The kitchen is my happy place. Everything makes sense when you're cooking.", phase: 0, animalType: 'pangolin' },

  // Phase 1
  { id: 'pg_1_1', text: "I curl up to protect myself. But what am I protecting, really? Just more scales?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_2', text: "I made soup today. Then I ate it. Then it was gone. Is that what we all are? Temporary soup?", phase: 1, animalType: 'pangolin' },
  { id: 'pg_1_3', text: "My scales are made of the same stuff as your fingernails. We're more alike than different. Isn't that odd?", phase: 1, animalType: 'pangolin' },

  // Phase 2
  { id: 'pg_2_1', text: "I'm the most trafficked mammal on Earth. Everyone wants my scales. No one asks if I want to keep them.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_2', text: "When I curl into a ball, I can't see what's coming. Maybe that's the point. Maybe seeing is worse.", phase: 2, animalType: 'pangolin' },
  { id: 'pg_2_3', text: "I cooked a feast today. For no one. We feast alone. We always feast alone.", phase: 2, animalType: 'pangolin' },

  // Phase 3
  { id: 'pg_3_1', text: "My armor can't protect me from time. Nothing can. I've tried curling into a tighter ball.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_2', text: "The ants don't know I'm coming. We never know what's coming. That's the great cosmic joke.", phase: 3, animalType: 'pangolin' },
  { id: 'pg_3_3', text: "I keep cooking because if I stop, I'll have to think. The thinking is unbearable.", phase: 3, animalType: 'pangolin' },

  // Phase 4
  { id: 'pg_4_1', text: "Something approaches. I can feel it through my scales. The ground itself is trembling.", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_2', text: "I've curled into my tightest ball. But this time, I don't think I'll uncurl. What's the point?", phase: 4, animalType: 'pangolin' },
  { id: 'pg_4_3', text: "The last meal before the end. I'm making it special. Everyone deserves one beautiful thing.", phase: 4, animalType: 'pangolin' },
];

// SLOTH - Slow, deliberate observations
const SLOTH_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'sl_0_1', text: "Heeeeey... frieeeeend... nice... to... seeeeee... youuuuu...", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_2', text: "I moved three inches today. Personal best! Very tired now. Worth it.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_3', text: "This hammock is perfect. I've been here for... weeks? Months? Time is a construct.", phase: 0, animalType: 'sloth' },
  { id: 'sl_0_4', text: "Why rush? The jungle isn't going anywhere. Neither am I. It's perfect.", phase: 0, animalType: 'sloth' },

  // Phase 1
  { id: 'sl_1_1', text: "I've been thinking about the same thought for three days. I think I'm almost done with it.", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_2', text: "Everyone moves so fast. Are they running toward something or away from something?", phase: 1, animalType: 'sloth' },
  { id: 'sl_1_3', text: "I age slower because I move slower. But I still age. Just... more... slowly...", phase: 1, animalType: 'sloth' },

  // Phase 2
  { id: 'sl_2_1', text: "I watched a leaf fall for an hour. It was born, it lived, it died. All while I watched.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_2', text: "Moving slowly means I see everything. I wish I saw less. Much less.", phase: 2, animalType: 'sloth' },
  { id: 'sl_2_3', text: "The trees are dying. I can feel it. They're dying faster than I can climb down.", phase: 2, animalType: 'sloth' },

  // Phase 3
  { id: 'sl_3_1', text: "I've been screaming internally for years. It takes a long time. The scream is still ongoing.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_2', text: "Moss grows on me. I'm becoming the tree. Soon there will be no difference. Soon there will be nothing.", phase: 3, animalType: 'sloth' },
  { id: 'sl_3_3', text: "I move so slowly that death might miss me. That's my only hope. It's not much.", phase: 3, animalType: 'sloth' },

  // Phase 4
  { id: 'sl_4_1', text: "The vibration is getting closer. Even I can feel it now. Even I cannot be slow enough.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_2', text: "I've had one long life to think about the end. I'm still not ready. No one is ready.", phase: 4, animalType: 'sloth' },
  { id: 'sl_4_3', text: "Theeeee... ennnnd... issss... coming... slooooowly... but... it... is... coming...", phase: 4, animalType: 'sloth' },
];

// FENNEC FOX - Alert, questioning, big-eared listener
const FENNEC_FOX_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'ff_0_1', text: "Did you hear that?! Oh wait, it was just the wind. My ears are VERY sensitive!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_2', text: "The desert is quiet tonight! Perfect for stargazing! The stars tell wonderful stories!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_3', text: "Adventure awaits! I've packed seventeen snacks! That's probably enough, right?!", phase: 0, animalType: 'fennec_fox' },
  { id: 'ff_0_4', text: "My ears can hear a beetle walking from a mile away! Very useful! Very fun!", phase: 0, animalType: 'fennec_fox' },

  // Phase 1
  { id: 'ff_1_1', text: "I hear everything. Literally everything. Sometimes I hear things I wish I couldn't.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_2', text: "The desert sands shift constantly. Nothing stays in place. Not even footprints. Not even memories.", phase: 1, animalType: 'fennec_fox' },
  { id: 'ff_1_3', text: "Last night I heard the stars. They were whispering. They wouldn't tell me what about.", phase: 1, animalType: 'fennec_fox' },

  // Phase 2
  { id: 'ff_2_1', text: "My ears are so big to release heat. I was designed to survive. But survival isn't living, is it?", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_2', text: "I can hear your heartbeat. It's counting down. They all count down.", phase: 2, animalType: 'fennec_fox' },
  { id: 'ff_2_3', text: "The desert is expanding. It swallows everything eventually. Green becomes yellow becomes nothing.", phase: 2, animalType: 'fennec_fox' },

  // Phase 3
  { id: 'ff_3_1', text: "I hear a low hum from the earth itself. It's been getting louder. No one else notices.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_2', text: "My ancestors listened to the silence between sounds. There's less silence now. Something fills it.", phase: 3, animalType: 'fennec_fox' },
  { id: 'ff_3_3', text: "I don't sleep anymore. When I close my eyes, I hear it clearer. The thing that's coming.", phase: 3, animalType: 'fennec_fox' },

  // Phase 4
  { id: 'ff_4_1', text: "I hear it now. Clear as day. A frequency that shouldn't exist. It's calling us home.", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_2', text: "The stars stopped whispering. Now they're screaming. Can you hear them yet?", phase: 4, animalType: 'fennec_fox' },
  { id: 'ff_4_3', text: "Cover your ears. It won't help. But cover them anyway. Here it comes.", phase: 4, animalType: 'fennec_fox' },
];

// FOX - Introspective, fireside musings
const FOX_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'fx_0_1', text: "Come sit by the fire! I've got hot cocoa and warm blankets!", phase: 0, animalType: 'fox' },
  { id: 'fx_0_2', text: "I love autumn evenings. The crackle of fire. The smell of woodsmoke. Perfect.", phase: 0, animalType: 'fox' },
  { id: 'fx_0_3', text: "My den is cozy, my belly is full, and you're here. What more could one want?", phase: 0, animalType: 'fox' },
  { id: 'fx_0_4', text: "They say we're clever. I prefer to think we're just... thoughtful.", phase: 0, animalType: 'fox' },

  // Phase 1
  { id: 'fx_1_1', text: "Fire destroys to create warmth. We destroy to create comfort. Interesting, isn't it?", phase: 1, animalType: 'fox' },
  { id: 'fx_1_2', text: "I've lived in this den for years. It feels less like home lately. More like hiding.", phase: 1, animalType: 'fox' },
  { id: 'fx_1_3', text: "The fire casts shadows that look like memories. Mine mostly look like regrets.", phase: 1, animalType: 'fox' },

  // Phase 2
  { id: 'fx_2_1', text: "Every fire dies eventually. I've watched thousands die. I've started thousands more. The cycle never asks permission.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_2', text: "Clever enough to know. Not wise enough to accept. That's the curse of being a fox.", phase: 2, animalType: 'fox' },
  { id: 'fx_2_3', text: "I curl my tail around myself at night. Pretending it's someone else. Pretending I'm not alone.", phase: 2, animalType: 'fox' },

  // Phase 3
  { id: 'fx_3_1', text: "The fire is dimmer tonight. I don't have the energy to feed it. Maybe it should just go out.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_2', text: "I've seen too many winters. I've buried too many things. The ground is mostly graves now.", phase: 3, animalType: 'fox' },
  { id: 'fx_3_3', text: "My cleverness couldn't outrun time. Nothing can. I was a fool to try.", phase: 3, animalType: 'fox' },

  // Phase 4
  { id: 'fx_4_1', text: "The flames are speaking tonight. They say the same thing the wind says. It's almost time.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_2', text: "I'm letting the fire go out. No point keeping warm for what's coming. Cold or warm, it arrives the same.", phase: 4, animalType: 'fox' },
  { id: 'fx_4_3', text: "Sit with me one last time. The view from here will be... unforgettable.", phase: 4, animalType: 'fox' },
];

// OWL - Intellectual, bookish crisis
const OWL_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'ow_0_1', text: "Ah, a visitor! I was just reading about quantum mechanics. Fascinating stuff!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_2', text: "Knowledge is a lamp in the darkness! And I have MANY lamps! Metaphorically speaking.", phase: 0, animalType: 'owl' },
  { id: 'ow_0_3', text: "Who? Who indeed! The eternal question! And I'm not just saying that because I'm an owl!", phase: 0, animalType: 'owl' },
  { id: 'ow_0_4', text: "I've read 3,472 books. Each one made me wiser! Probably! Hopefully!", phase: 0, animalType: 'owl' },

  // Phase 1
  { id: 'ow_1_1', text: "The more I read, the more I realize how much I don't know. The unknown grows faster than knowledge.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_2', text: "I found a book today with missing pages. The gaps terrified me more than any complete horror.", phase: 1, animalType: 'owl' },
  { id: 'ow_1_3', text: "Wisdom is knowing how little you know. I have become... very wise.", phase: 1, animalType: 'owl' },

  // Phase 2
  { id: 'ow_2_1', text: "I read a philosophy book that proved nothing is real. Then I read one that proved it was. Both were convincing.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_2', text: "My head can rotate 270 degrees. I've looked in every direction. There are no answers anywhere.", phase: 2, animalType: 'owl' },
  { id: 'ow_2_3', text: "I stayed awake to watch the sun rise. Then I understood—we call it rising, but we're the ones falling.", phase: 2, animalType: 'owl' },

  // Phase 3
  { id: 'ow_3_1', text: "All these books. All this knowledge. And still death waits at the end of every chapter.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_2', text: "I've read every answer. None of them work. The questions were wrong from the start.", phase: 3, animalType: 'owl' },
  { id: 'ow_3_3', text: "Who? Who? WHO? Even this question means nothing anymore.", phase: 3, animalType: 'owl' },

  // Phase 4
  { id: 'ow_4_1', text: "I found a book with no author, no title, no words. Just pages. It's the truest book I've ever read.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_2', text: "The final chapter approaches. No library contains it. No scholar has read it. But we will all understand it soon.", phase: 4, animalType: 'owl' },
  { id: 'ow_4_3', text: "Close the books. Open your eyes. The last lesson cannot be read. Only... experienced.", phase: 4, animalType: 'owl' },
];

// CAPYBARA - Calm, accepting, chill philosopher
const CAPYBARA_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'cp_0_1', text: "Hey. Nice day. Want to just... sit here? No pressure.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_2', text: "I let a bird sit on my head today. We didn't talk. It was nice.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_3', text: "Work is fine. Life is fine. Everything is fine. Really. I mean it.", phase: 0, animalType: 'capybara' },
  { id: 'cp_0_4', text: "I'm the world's largest rodent. Pretty cool, huh? Or not. Either way is fine.", phase: 0, animalType: 'capybara' },

  // Phase 1
  { id: 'cp_1_1', text: "Everyone says I look unbothered. That's because I've already processed the bothering internally.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_2', text: "The computer shows me charts. The charts go up or down. I'm not sure which is supposed to be good.", phase: 1, animalType: 'capybara' },
  { id: 'cp_1_3', text: "I float in the water and feel nothing. Is that peace or emptiness? Does it matter?", phase: 1, animalType: 'capybara' },

  // Phase 2
  { id: 'cp_2_1', text: "Everyone thinks I'm calm. I'm not calm. I've just accepted that panic changes nothing.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_2', text: "I let things sit on me because I can't feel them anymore. Birds, thoughts, dread. All weightless.", phase: 2, animalType: 'capybara' },
  { id: 'cp_2_3', text: "The hot springs are warm. My body is warm. Inside I am very, very cold.", phase: 2, animalType: 'capybara' },

  // Phase 3
  { id: 'cp_3_1', text: "I've achieved perfect stillness. Inside and out. The stillness screams if you listen closely.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_2', text: "They call me chill. What they mean is resigned. What I mean is waiting.", phase: 3, animalType: 'capybara' },
  { id: 'cp_3_3', text: "I stare at the water and the water stares back. We've both given up.", phase: 3, animalType: 'capybara' },

  // Phase 4
  { id: 'cp_4_1', text: "I feel something coming. For once, I'm not unbothered. For once, something will finally change.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_2', text: "The water is rippling from something far away. It's getting closer. I won't move. I never do.", phase: 4, animalType: 'capybara' },
  { id: 'cp_4_3', text: "Sit with me. Don't speak. Let's just be here for whatever this is. Together. Still.", phase: 4, animalType: 'capybara' },
];

// WOMBAT - Grounded, earthly, burrowing into truth
const WOMBAT_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'wb_0_1', text: "G'day! Welcome to my burrow! It's cozy down here, far from all the nonsense!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_2', text: "Did you know my poop is cube-shaped? Nature is HILARIOUS!", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_3', text: "I dug this tunnel myself! Took ages! Very proud! Want a tour?", phase: 0, animalType: 'wombat' },
  { id: 'wb_0_4', text: "The earth is warm and safe. Nothing bad happens underground. That's just facts!", phase: 0, animalType: 'wombat' },

  // Phase 1
  { id: 'wb_1_1', text: "I dig deeper every day. Looking for something. Not sure what. Just... deeper.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_2', text: "The dirt tells stories. Layers of time. Layers of things that used to be alive.", phase: 1, animalType: 'wombat' },
  { id: 'wb_1_3', text: "My burrow has gotten so deep, I sometimes forget which way is up.", phase: 1, animalType: 'wombat' },

  // Phase 2
  { id: 'wb_2_1', text: "I found bones down here. Not mine. Not yet. The earth collects everything eventually.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_2', text: "I dig to feel in control. But the earth decides if my tunnel holds or collapses. It always decides.", phase: 2, animalType: 'wombat' },
  { id: 'wb_2_3', text: "Underground, no one sees me cry. The dirt absorbs everything. That's why I stay.", phase: 2, animalType: 'wombat' },

  // Phase 3
  { id: 'wb_3_1', text: "I've dug so deep I found something that shouldn't exist. I covered it back up. Pretend I didn't say this.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_2', text: "The earth trembles sometimes. Not from above. From BELOW. From deeper than I've ever gone.", phase: 3, animalType: 'wombat' },
  { id: 'wb_3_3', text: "My burrow is my grave someday. I've made peace with that. I've made it comfortable for the end.", phase: 3, animalType: 'wombat' },

  // Phase 4
  { id: 'wb_4_1', text: "Something is rising from below. All my digging, and it was already there, waiting.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_2', text: "The earth groans. My tunnels are collapsing. Not from weakness. From something pushing through.", phase: 4, animalType: 'wombat' },
  { id: 'wb_4_3', text: "Stay close to the dirt, friend. When everything falls, the ground will catch us. Or join us. Same thing.", phase: 4, animalType: 'wombat' },
];

// RABBIT - Anxious, hopping thoughts
const RABBIT_DIALOGUES: Dialogue[] = [
  // Phase 0
  { id: 'rb_0_1', text: "Oh hello! Sorry, you startled me! Everything startles me! I'm fine though! Really!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_2', text: "The garden is BEAUTIFUL today! So many carrots! So many flowers! Life is good!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_3', text: "I do a happy hop when I'm joyful! *hop* See? That was a happy hop!", phase: 0, animalType: 'rabbit' },
  { id: 'rb_0_4', text: "Having tea in the garden! Everything is peaceful! No predators in sight! Very good!", phase: 0, animalType: 'rabbit' },

  // Phase 1
  { id: 'rb_1_1', text: "My heart beats 150 times a minute. Always ready. Ready for what? I don't know. Just ready.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_2', text: "The garden is lovely but I keep looking at the exits. Just in case. Always just in case.", phase: 1, animalType: 'rabbit' },
  { id: 'rb_1_3', text: "I have twelve escape routes memorized. Is that normal? It feels normal. It feels necessary.", phase: 1, animalType: 'rabbit' },

  // Phase 2
  { id: 'rb_2_1', text: "I was bred to be soft and edible. Every cell in my body knows this. Every cell is terrified.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_2', text: "The flowers are dying. The carrots are rotting. Everything decays while I watch, frozen.", phase: 2, animalType: 'rabbit' },
  { id: 'rb_2_3', text: "I can't stop running. Even when I'm sitting still, my mind is running. It never stops.", phase: 2, animalType: 'rabbit' },

  // Phase 3
  { id: 'rb_3_1', text: "The shadow overhead isn't a cloud. It hasn't moved in days. It's just... watching.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_2', text: "I've worn a path in the garden from my pacing. A circle. Going nowhere. Forever.", phase: 3, animalType: 'rabbit' },
  { id: 'rb_3_3', text: "My twitching isn't from fear anymore. It's from acceptance. The body keeps going when the mind stops.", phase: 3, animalType: 'rabbit' },

  // Phase 4
  { id: 'rb_4_1', text: "I've stopped running. For the first time. Because I can see now—there's nowhere left to run.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_2', text: "The thing that's coming? I've been running from it my whole life. Time to meet it.", phase: 4, animalType: 'rabbit' },
  { id: 'rb_4_3', text: "My heart is finally slowing. Not from peace. From exhaustion. From inevitability. *thump... thump...*", phase: 4, animalType: 'rabbit' },
];

// Collect all dialogues
const ALL_DIALOGUES: Dialogue[] = [
  ...RED_PANDA_DIALOGUES,
  ...AXOLOTL_DIALOGUES,
  ...PANGOLIN_DIALOGUES,
  ...SLOTH_DIALOGUES,
  ...FENNEC_FOX_DIALOGUES,
  ...FOX_DIALOGUES,
  ...OWL_DIALOGUES,
  ...CAPYBARA_DIALOGUES,
  ...WOMBAT_DIALOGUES,
  ...RABBIT_DIALOGUES,
];

/**
 * Get all dialogues for an animal up to a certain phase
 */
export function getDialoguesForAnimal(
  animalType: AnimalType,
  maxPhase: DialoguePhase
): Dialogue[] {
  return ALL_DIALOGUES.filter(
    d => d.animalType === animalType && d.phase <= maxPhase
  );
}

/**
 * Get the next unread dialogue for an animal
 */
export function getNextDialogue(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): Dialogue | null {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  if (currentIndex >= dialogues.length - 1) {
    return null;
  }
  return dialogues[currentIndex + 1];
}

/**
 * Get current dialogue for an animal
 */
export function getCurrentDialogue(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): Dialogue | null {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  if (currentIndex >= dialogues.length || currentIndex < 0) {
    return dialogues[0] || null;
  }
  return dialogues[currentIndex];
}

/**
 * Check if animal has more dialogues available
 */
export function hasMoreDialogues(
  animalType: AnimalType,
  currentIndex: number,
  maxPhase: DialoguePhase
): boolean {
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  return currentIndex < dialogues.length - 1;
}

/**
 * Get total dialogue count for an animal at current phase
 */
export function getTotalDialogueCount(
  animalType: AnimalType,
  maxPhase: DialoguePhase
): number {
  return getDialoguesForAnimal(animalType, maxPhase).length;
}

/**
 * Get animal name and description
 */
export const ANIMAL_INFO: Record<AnimalType, { name: string; description: string; emoji: string }> = {
  red_panda: { name: 'Bamboo', description: 'A contemplative red panda seeking zen', emoji: '🐼' },
  axolotl: { name: 'Axel', description: 'A dreamy axolotl with fluid thoughts', emoji: '🦎' },
  pangolin: { name: 'Panko', description: 'A practical pangolin who loves cooking', emoji: '🦔' },
  sloth: { name: 'Sloane', description: 'A slow-moving sloth with deep observations', emoji: '🦥' },
  fennec_fox: { name: 'Fennick', description: 'An alert fennec fox who hears everything', emoji: '🦊' },
  fox: { name: 'Ember', description: 'An introspective fox with fireside wisdom', emoji: '🦊' },
  owl: { name: 'Archimedes', description: 'A scholarly owl drowning in knowledge', emoji: '🦉' },
  capybara: { name: 'Chill', description: 'A seemingly unbothered capybara', emoji: '🦫' },
  wombat: { name: 'Warren', description: 'A grounded wombat who digs deep', emoji: '🐻' },
  rabbit: { name: 'Thyme', description: 'An anxious rabbit in the garden', emoji: '🐰' },
};

export { ALL_DIALOGUES };
