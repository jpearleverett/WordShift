// Removes profanity/slurs from the playable dictionary, the generation word
// list, and all pre-generated puzzle banks. Bank puzzles that contain a
// blocked word anywhere in their chain or solution are dropped entirely.
// Run: node scripts/tools/purgeProfanity.mjs
import fs from 'fs';
import path from 'path';

// Words that must never appear in puzzles or be accepted as player-formed
// words. Mild oaths that double as legitimate common words (e.g. HELL) are
// retained; everything sexual, scatological, or slur-adjacent is removed.
// Also removed: juvenile scatological/insult words that undercut the game's
// tone (FART/BUTT/MORON), POOF/POOFS (UK slur), and the archaic KJV set
// (THEE/THOU/HAST/HATH/SHALT/DOTH) that reads as unfair obscure vocabulary
// to mainstream players.
export const BLOCKED_WORDS = [
  'ARSE', 'ARSES', 'ASS', 'ASSES', 'BIMBO', 'BITCH', 'BITCHES', 'BONER', 'BOOB', 'BOOBS',
  'BUTT', 'BUTTS',
  'CHINK', 'CHINKS', 'COCK', 'COCKS', 'COON', 'COONS', 'CRAP', 'CRAPS', 'CUM', 'CUMS',
  'DAGO', 'DAMN', 'DAMNS', 'DICK', 'DICKS', 'DILDO', 'DYKE', 'DYKES', 'FAG', 'FAGS', 'FAGGOT',
  'FART', 'FARTS',
  'GOOK', 'GOOKS', 'HOMO', 'HOMOS', 'HONKY', 'KIKE', 'KIKES', 'MILF', 'MORON', 'MORONS',
  'NEGRO', 'NEGROS',
  'PECKER', 'PISS', 'PISSED', 'POOF', 'POOFS', 'PORN', 'PORNO', 'PRICK', 'PRICKS', 'PUBE', 'PUBES',
  'RAPE', 'RAPED', 'RAPER', 'RAPES', 'RAPIST', 'RETARD', 'SEMEN', 'SEX', 'SEXED', 'SEXES', 'SEXY',
  'SHAG', 'SHAGS', 'SLUT', 'SLUTS', 'SMUT', 'SMUTS', 'SPAZ', 'SPERM', 'SPIC', 'SPICS',
  'TIT', 'TITS', 'TURD', 'TURDS', 'TWAT', 'TWATS', 'WANK', 'WANKS', 'WHORE', 'WHORES', 'WOP', 'WOPS',
  // Archaic KJV-register words (not slurs, but unfair to mainstream players)
  'THEE', 'THOU', 'HAST', 'HATH', 'SHALT', 'DOTH',
  // ---------------------------------------------------------------------
  // hygiene pass 2: anatomical + proper nouns + abbreviations
  // (second external review: PENIS/PUBIC shipped on boards; VITA/BETH/TONY
  // are proper nouns; MIL/BROS/FRAT abbreviations; WORT obscure brewing
  // jargon; plus crude words the dictionary still green-check accepted)
  // ---------------------------------------------------------------------
  // Anatomical-sexual terms (and the crude/sexual set the first pass missed)
  'PENIS', 'PENISES', 'PUBIC', 'ANUS', 'ANUSES', 'ANAL', 'VULVA', 'VULVAS',
  'LABIA', 'VAGINA', 'VAGINAS', 'ORGASM', 'ORGASMS', 'ORGY', 'ORGIES',
  'INCEST', 'HORNY', 'RANDY', 'EROTIC', 'EROTICA', 'SEXIER', 'SEXUAL',
  'CONDOM', 'CONDOMS', 'DOUCHE', 'DOUCHES', 'FANNY', 'FANNIES',
  'BUGGER', 'BUGGERS', 'BUGGERY', 'RAPING', 'RAPISTS',
  // Sex-trade terms (WHORE/SLUT family the first pass started)
  'HOOKER', 'HOOKERS', 'BROTHEL', 'BROTHELS', 'PIMP', 'PIMPS',
  'PERVERT', 'PERVERTS',
  // Slur-adjacent (ableist / identity / ethnic exonym)
  'MIDGET', 'MIDGETS', 'CRIPPLE', 'CRIPPLES', 'BASTARD', 'BASTARDS',
  'QUEER', 'QUEERS', 'SISSY', 'SISSIES', 'GYPSY', 'GYPSIES',
  // Derivatives of already-blocked words the first pass missed
  'CRAPPY', 'BITCHY',
  // Juvenile scatological (FART/TURD/CRAP tone precedent)
  'POOP', 'POOPS', 'POOPED', 'PEE', 'PEES', 'PEED', 'PEEING',
  // Proper nouns (the dictionary is common-English-only, no proper nouns)
  'VITA', 'BETH', 'TONY',
  // Abbreviations / clipped informal forms (not standalone dictionary words)
  'MIL', 'MILS', 'BROS', 'FRAT', 'FRATS',
  // Obscure brewing jargon (unfair vocabulary for mainstream players)
  'WORT', 'WORTS',
  // ---------------------------------------------------------------------
  // launch vocabulary pass: crude/charged surface forms + leaked proper nouns
  // These are valid dictionary entries in some contexts, but as isolated
  // puzzle answers they read as juvenile, hostile, anatomical, or simply
  // name-like. The game has plenty of darker vocabulary without these tonal
  // collisions, so remove the whole obvious inflection family.
  // ---------------------------------------------------------------------
  'BARF', 'BRA', 'BRAS', 'CROTCH', 'CROTCHES', 'DAMMIT', 'DRUNK', 'DRUNKS',
  'DUMB', 'FETISH', 'FETISHES', 'IDIOT', 'IDIOTS', 'JERK', 'JERKS',
  'NAKED', 'NIPPLE', 'NIPPLES', 'NUDE', 'NUDITY', 'PUKE', 'PUKED', 'PUKES',
  'PUKING', 'PUSSY', 'PUSSIES', 'RACIAL', 'RACISM', 'RACIST', 'RACISTS',
  'SEXISM', 'SEXIST', 'SUCK', 'SUCKED', 'SUCKER', 'SUCKERS', 'SUCKS',
  'STUPID', 'THUG', 'THUGS', 'URINE', 'UTERUS', 'VIRGIN', 'VIRGINS',
  'VOMIT', 'VOMITED', 'VOMITING', 'VOMITS',
  // Proper names that leaked into shipped boards / on-device generation.
  'BRAD', 'TROY',
];
const BLOCKED = new Set(BLOCKED_WORDS);

const MOBILE = path.resolve(import.meta.dirname, '../..');
const REPO = path.resolve(MOBILE, '..');

/**
 * Stored `allWords` includes starting and formed words, but not the shorter
 * source remainder produced by each removal. A dictionary purge can therefore
 * leave a bank entry whose visible words are clean but whose required hidden
 * remainder was deleted. Inspect the canonical step objects as an additional
 * guard so the solvability suite stays green after every vocabulary pass.
 */
function entryHasBlockedRemainder(entry) {
  const steps = entry.match(/\{stepIndex:\d+,[^{}]*\}/g) ?? [];
  for (const step of steps) {
    const source = /sourceWord:'([A-Z]+)'/.exec(step)?.[1];
    if (!source) continue;

    const pairRaw = /removalPositions:\[([0-9,]+)\]/.exec(step)?.[1];
    if (pairRaw) {
      const positions = pairRaw
        .split(',')
        .map(Number)
        .sort((a, b) => b - a);
      let remainder = source;
      for (const position of positions) {
        remainder = remainder.slice(0, position) + remainder.slice(position + 1);
      }
      if (BLOCKED.has(remainder)) return true;
      continue;
    }

    const storedPosition = /removalPosition:(\d+)/.exec(step)?.[1];
    if (storedPosition !== undefined) {
      const position = Number(storedPosition);
      const remainder = source.slice(0, position) + source.slice(position + 1);
      if (BLOCKED.has(remainder)) return true;
      continue;
    }

    // Reverse hints do not persist a removal position. If every occurrence of
    // the moved character produces a blocked remainder, no shipped-rule move
    // can use that stored step.
    const letter = /letterToMove:'([A-Z])'/.exec(step)?.[1];
    if (!letter) continue;
    const remainders = [...source]
      .map((char, index) => char === letter
        ? source.slice(0, index) + source.slice(index + 1)
        : null)
      .filter(Boolean);
    if (remainders.length > 0 && remainders.every(word => BLOCKED.has(word))) {
      return true;
    }
  }
  return false;
}

// 1) Mobile dictionary (validation + generation source for the app)
{
  const file = path.join(MOBILE, 'src/dictionary.ts');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('= [') + 2;
  const end = src.lastIndexOf(']');
  const words = JSON.parse(src.slice(start, end + 1));
  const kept = words.filter(w => !BLOCKED.has(w));
  console.log(`dictionary.ts: removed ${words.length - kept.length} of ${words.length} words:`);
  console.log('  ' + words.filter(w => BLOCKED.has(w)).join(', '));
  fs.writeFileSync(file, src.slice(0, start) + JSON.stringify(kept) + src.slice(end + 1));
}

// 2) Repo-root generation word list (lowercase, one word per line)
{
  const file = path.join(REPO, 'dictionary.txt');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const kept = lines.filter(l => !BLOCKED.has(l.trim().toUpperCase()));
  console.log(`dictionary.txt: removed ${lines.length - kept.length} of ${lines.length} lines`);
  fs.writeFileSync(file, kept.join('\n'));
}

// 3) Puzzle banks: drop any puzzle whose entry references a blocked word.
//    Bank entries are single-line object literals; every chain word and every
//    step's source/target word appears single-quoted ('WORD') somewhere in the
//    entry — EXCEPT a leg's final formed word, which only appears inside the
//    explanation template string ("...to form WORD."), so both patterns are
//    scanned.
{
  const dataDir = path.join(MOBILE, 'src/data');
  const tokenRe = /'([A-Z]{3,8})'/g;
  const formedRe = /form ([A-Z]{3,8})\./g;
  for (const name of fs.readdirSync(dataDir).filter(f => f.startsWith('puzzleBank') && f !== 'puzzleBankTypes.ts')) {
    const file = path.join(dataDir, name);
    let src = fs.readFileSync(file, 'utf8');
    const open = src.indexOf('= [');
    const close = src.lastIndexOf('];');
    const body = src.slice(open + 3, close);
    const entries = body.split(/\n(?=\s*\{id:)/).filter(e => e.trim().length > 0);
    const kept = entries.filter(entry => {
      for (const m of entry.matchAll(tokenRe)) {
        if (BLOCKED.has(m[1])) return false;
      }
      for (const m of entry.matchAll(formedRe)) {
        if (BLOCKED.has(m[1])) return false;
      }
      if (entryHasBlockedRemainder(entry)) return false;
      return true;
    });
    const removed = entries.length - kept.length;
    if (removed > 0) {
      let out = src.slice(0, open + 3) + '\n' + kept.map(e => e.replace(/\s+$/, '')).join('\n') + '\n' + src.slice(close);
      out = out.replace(/\/\/ Total puzzles: \d+/, `// Total puzzles: ${kept.length}`);
      fs.writeFileSync(file, out);
    }
    console.log(`${name}: kept ${kept.length}, removed ${removed}`);
  }
}

// 4) Safety check: curated/fallback puzzle pools must not contain blocked words
{
  for (const rel of ['src/constants.ts', 'src/constants/wordLists.ts']) {
    const file = path.join(MOBILE, rel);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const hits = new Set();
    for (const m of src.matchAll(/["']([A-Z]{3,8})["']/g)) {
      if (BLOCKED.has(m[1])) hits.add(m[1]);
    }
    console.log(`${rel}: ${hits.size === 0 ? 'clean' : 'CONTAINS BLOCKED WORDS: ' + [...hits].join(', ')}`);
  }
}
