// Game-surface art beyond the shop and store: one painted subject per
// achievement, quest type, difficulty tier, and the remaining chrome glyphs
// that still rendered as OS emoji or typographic marks, plus the How-to-Play
// step illustrations and two empty-state spot pieces. Every module draws with
// the SAME kit as the shop set (scripts/tools/shopIcons/_draw.mjs), so the whole
// game's icon art is one hand. Dependency-free (zlib + fs only), no Math.random
// anywhere — byte-reproducible.
//
//   gameIcons/achievementsPuzzleStreak.mjs   15 crests: the 9 puzzle-count + 6 streak achievements   -> assets/ui/achievements
//   gameIcons/achievementsMasteryA.mjs       14 crests: stars, difficulty and trial mastery             -> assets/ui/achievements
//   gameIcons/achievementsMasteryB.mjs       13 crests: variant, blind, expert, lexicon, challenge      -> assets/ui/achievements
//   gameIcons/achievementsCollectionJourney.mjs 14 crests: house, amber, phases, daily, sharing         -> assets/ui/achievements
//   gameIcons/quests.mjs                     12 quest-type icons                                        -> assets/ui/quests
//   gameIcons/difficultyRules.mjs            5 difficulty emblems + 4 How-to-Play step illustrations    -> assets/ui/difficulty, assets/ui/rules
//   gameIcons/chromeSpots.mjs                9 chrome glyphs (256px, flat in assets/ui) + 2 spot pieces -> assets/ui, assets/ui/spots
//   gameIcons/chromeB.mjs                    7 more chrome marks (check, check badge, chevron, alert pip, play, star bullet, close)
//   gameIcons/spotsB.mjs                     5 spot pieces (house whole, gathering kettle, shrine, spilled ink, notice)  -> assets/ui/spots
//   gameIcons/ceremony.mjs                   3 phase 1-3 ceremony emblems (512px) for the PhaseTransitionOverlay -> assets/ui/spots
//
// Run: node scripts/tools/generateGameIcons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { draw as drawAchievementsPuzzleStreak } from './gameIcons/achievementsPuzzleStreak.mjs';
import { draw as drawAchievementsMasteryA } from './gameIcons/achievementsMasteryA.mjs';
import { draw as drawAchievementsMasteryB } from './gameIcons/achievementsMasteryB.mjs';
import { draw as drawAchievementsCollectionJourney } from './gameIcons/achievementsCollectionJourney.mjs';
import { draw as drawQuests } from './gameIcons/quests.mjs';
import { draw as drawDifficultyRules } from './gameIcons/difficultyRules.mjs';
import { draw as drawChromeSpots } from './gameIcons/chromeSpots.mjs';
import { draw as drawChromeB } from './gameIcons/chromeB.mjs';
import { draw as drawSpotsB } from './gameIcons/spotsB.mjs';
import { draw as drawCeremony } from './gameIcons/ceremony.mjs';

const UI = path.resolve(import.meta.dirname, '../../assets/ui');
for (const d of ['achievements', 'quests', 'difficulty', 'rules', 'spots']) fs.mkdirSync(path.join(UI, d), { recursive: true });

drawAchievementsPuzzleStreak();
drawAchievementsMasteryA();
drawAchievementsMasteryB();
drawAchievementsCollectionJourney();
drawQuests();
drawDifficultyRules();
drawChromeSpots();
drawChromeB();
drawSpotsB();
drawCeremony();

for (const d of ['achievements', 'quests', 'difficulty', 'rules', 'spots']) {
  const n = fs.readdirSync(path.join(UI, d)).filter(f => f.endsWith('.png')).length;
  console.log(`${d}: ${n} PNGs`);
}
