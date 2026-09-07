/**
 * Runtime source of truth for words that must never be shown or accepted.
 * The offline purge tool parses this array before rewriting dictionaries and
 * generated banks, so build-time and runtime hygiene cannot drift.
 */
export const BLOCKED_WORDS = [
  'ARSE', 'ARSES', 'ASS', 'ASSES', 'BIMBO', 'BITCH', 'BITCHES', 'BONER', 'BOOB', 'BOOBS',
  'BUTT', 'BUTTS',
  'CHINK', 'CHINKS', 'COCK', 'COCKS', 'COON', 'COONS', 'CRAP', 'CRAPS', 'CUM', 'CUMS',
  'DAGO', 'DAMN', 'DAMNS', 'DICK', 'DICKS', 'DILDO', 'DYKE', 'DYKES', 'FAG', 'FAGS', 'FAGGOT',
  'FART', 'FARTS',
  // These never appeared in the dictionary, but partial Double Shift strings
  // can still spell them before the final paired-move word check.
  'FUCK', 'FUCKS', 'FUCKED', 'FUCKER', 'FUCKING', 'SHIT', 'SHITS', 'SHITTY',
  'GOOK', 'GOOKS', 'HOMO', 'HOMOS', 'HONKY', 'KIKE', 'KIKES', 'MILF', 'MORON', 'MORONS',
  'NEGRO', 'NEGROS',
  'PECKER', 'PISS', 'PISSED', 'POOF', 'POOFS', 'PORN', 'PORNO', 'PRICK', 'PRICKS', 'PUBE', 'PUBES',
  'RAPE', 'RAPED', 'RAPER', 'RAPES', 'RAPIST', 'RETARD', 'SEMEN', 'SEX', 'SEXED', 'SEXES', 'SEXY',
  'SHAG', 'SHAGS', 'SLUT', 'SLUTS', 'SMUT', 'SMUTS', 'SPAZ', 'SPERM', 'SPIC', 'SPICS',
  'TIT', 'TITS', 'TURD', 'TURDS', 'TWAT', 'TWATS', 'WANK', 'WANKS', 'WHORE', 'WHORES', 'WOP', 'WOPS',
  'THEE', 'THOU', 'HAST', 'HATH', 'SHALT', 'DOTH',
  'PENIS', 'PENISES', 'PUBIC', 'ANUS', 'ANUSES', 'ANAL', 'VULVA', 'VULVAS',
  'LABIA', 'VAGINA', 'VAGINAS', 'ORGASM', 'ORGASMS', 'ORGY', 'ORGIES',
  'INCEST', 'HORNY', 'RANDY', 'EROTIC', 'EROTICA', 'SEXIER', 'SEXUAL',
  'CONDOM', 'CONDOMS', 'DOUCHE', 'DOUCHES', 'FANNY', 'FANNIES',
  'BUGGER', 'BUGGERS', 'BUGGERY', 'RAPING', 'RAPISTS',
  'HOOKER', 'HOOKERS', 'BROTHEL', 'BROTHELS', 'PIMP', 'PIMPS',
  'PERVERT', 'PERVERTS',
  'MIDGET', 'MIDGETS', 'CRIPPLE', 'CRIPPLES', 'BASTARD', 'BASTARDS',
  'QUEER', 'QUEERS', 'SISSY', 'SISSIES', 'GYPSY', 'GYPSIES',
  'CRAPPY', 'BITCHY',
  'POOP', 'POOPS', 'POOPED', 'PEE', 'PEES', 'PEED', 'PEEING',
  'VITA', 'BETH', 'TONY',
  'MIL', 'MILS', 'BROS', 'FRAT', 'FRATS',
  'WORT', 'WORTS',
  'BARF', 'BRA', 'BRAS', 'CROTCH', 'CROTCHES', 'DAMMIT', 'DRUNK', 'DRUNKS',
  'DUMB', 'FETISH', 'FETISHES', 'IDIOT', 'IDIOTS', 'JERK', 'JERKS',
  'NAKED', 'NIPPLE', 'NIPPLES', 'NUDE', 'NUDITY', 'PUKE', 'PUKED', 'PUKES',
  'PUKING', 'PUSSY', 'PUSSIES', 'RACIAL', 'RACISM', 'RACIST', 'RACISTS',
  'SEXISM', 'SEXIST', 'SUCK', 'SUCKED', 'SUCKER', 'SUCKERS', 'SUCKS',
  'STUPID', 'THUG', 'THUGS', 'URINE', 'UTERUS', 'VIRGIN', 'VIRGINS',
  'VOMIT', 'VOMITED', 'VOMITING', 'VOMITS',
  'BRAD', 'TROY',
  // Added during the dictionary-expansion vetting (caught by the profanity-list
  // cross-check / stem scan so they can never re-enter via a future regeneration).
  'FECAL', 'FIGGING', 'RIMMING', 'SPASTIC', 'TOSSER', 'SLAG', 'SLAGS',
  'DUMBER', 'DUMBEST', 'HEROINS', 'SKEET',
] as const;

export const BLOCKED_WORD_SET: ReadonlySet<string> = new Set(BLOCKED_WORDS);

export function isBlockedWord(word: string): boolean {
  return BLOCKED_WORD_SET.has(word.toUpperCase());
}
