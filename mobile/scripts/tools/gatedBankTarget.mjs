/** One naming contract for gated drivers, sidecars, exports and live targets. */
export function getGatedBankTarget(family, selection) {
  const drivers = {
    standard: 'scripts/runGatedRegen.sh',
    reverse: 'scripts/runGatedReverseRegen.sh',
    double: 'scripts/runGatedDoubleRegen.sh',
  };
  const match = /^(LEX_)?(EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT)$/.exec(selection ?? '');
  if (!Object.hasOwn(drivers, family) || !match) return null;
  const lexicon = Boolean(match[1]);
  const difficulty = match[2];
  const lower = difficulty.toLowerCase();
  const title = { EASY: 'Easy', MEDIUM: 'Medium', MEDIUM_PLUS: 'MediumPlus', HARD: 'Hard', EXPERT: 'Expert' }[difficulty];
  const kind = family === 'standard' ? '' : `${family}_`;
  const key = `${lexicon ? 'lexicon_' : ''}${kind}${lower}`;
  const suffix = family === 'reverse' ? 'Reverse' : family === 'double' ? 'DoubleShift' : '';
  const exportKind = family === 'reverse' ? 'REVERSE_' : family === 'double' ? (lexicon ? 'DOUBLE_' : 'DOUBLE_SHIFT_') : '';
  return {
    bank: `${lexicon ? 'LEXICON_' : ''}${kind.toUpperCase()}${difficulty}`,
    key,
    driver: drivers[family],
    driverArgs: [difficulty, ...(lexicon ? ['LEXICON'] : [])],
    liveFile: `${lexicon ? 'lexicon' : 'puzzle'}Bank${suffix}${title}.ts`,
    exportName: `${lexicon ? 'LEXICON' : 'PUZZLE'}_BANK_${exportKind}${difficulty}`,
    sidecar: `.gatedRegen${family === 'reverse' ? 'Reverse' : family === 'double' ? 'Double' : ''}_${key}_output.ts`,
  };
}
