/**
 * Pure text helpers for the speech bubble. Kept out of the component so they
 * can be unit-tested without pulling react-native into a Node test env.
 */

/**
 * Split a dialogue page into its sentences, for rendering one per block.
 *
 * PRESENTATION ONLY, and deliberately lossless: the dialogue flow compares
 * `dialogueText` against choice prompts by equality and the whisper gallery
 * records the unsplit line, so re-joining the result with a single space must
 * reproduce the input (modulo trailing whitespace). It also has to behave on a
 * growing typewriter PREFIX, which is what the bubble actually renders.
 */
export function splitIntoSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?]["'’”]?)\s+(?=[A-Z"'“‘])/g);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}
