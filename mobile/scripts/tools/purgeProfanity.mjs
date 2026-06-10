// Removes profanity/slurs from the playable dictionary, the generation word
// list, and all pre-generated puzzle banks. Bank puzzles that contain a
// blocked word anywhere in their chain or solution are dropped entirely.
// Run: node scripts/tools/purgeProfanity.mjs
import fs from 'fs';
import path from 'path';

// Words that must never appear in puzzles or be accepted as player-formed
// words. Mild oaths that double as legitimate common words (e.g. HELL) are
// retained; everything sexual, scatological, or slur-adjacent is removed.
export const BLOCKED_WORDS = [
  'ARSE', 'ARSES', 'ASS', 'ASSES', 'BIMBO', 'BITCH', 'BITCHES', 'BONER', 'BOOB', 'BOOBS',
  'CHINK', 'CHINKS', 'COCK', 'COCKS', 'COON', 'COONS', 'CRAP', 'CRAPS', 'CUM', 'CUMS',
  'DAGO', 'DAMN', 'DAMNS', 'DICK', 'DICKS', 'DILDO', 'DYKE', 'DYKES', 'FAG', 'FAGS', 'FAGGOT',
  'GOOK', 'GOOKS', 'HOMO', 'HOMOS', 'HONKY', 'KIKE', 'KIKES', 'MILF', 'NEGRO', 'NEGROS',
  'PECKER', 'PISS', 'PISSED', 'PORN', 'PORNO', 'PRICK', 'PRICKS', 'PUBE', 'PUBES',
  'RAPE', 'RAPED', 'RAPER', 'RAPES', 'RAPIST', 'RETARD', 'SEMEN', 'SEX', 'SEXED', 'SEXES', 'SEXY',
  'SHAG', 'SHAGS', 'SLUT', 'SLUTS', 'SMUT', 'SMUTS', 'SPAZ', 'SPERM', 'SPIC', 'SPICS',
  'TIT', 'TITS', 'TURD', 'TURDS', 'TWAT', 'TWATS', 'WANK', 'WANKS', 'WHORE', 'WHORES', 'WOP', 'WOPS',
];
const BLOCKED = new Set(BLOCKED_WORDS);

const MOBILE = path.resolve(import.meta.dirname, '../..');
const REPO = path.resolve(MOBILE, '..');

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
//    Bank entries are single-line object literals; every chain/solution word
//    appears single-quoted ('WORD') somewhere in the entry.
{
  const dataDir = path.join(MOBILE, 'src/data');
  const tokenRe = /'([A-Z]{3,8})'/g;
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
