import React, { useMemo } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import { splitIntoSentences } from '../../services/dialogueText';

export { splitIntoSentences };

/**
 * The speech-bubble body text, rendered one SENTENCE per block with a small
 * gap between them.
 *
 * A dialogue page used to render as a single <Text>, so three or four
 * sentences arrived as one solid slab of slab-serif with no vertical landing
 * point anywhere in it. Measured over the shipped corpus that averaged ~8.5
 * rendered lines per line of dialogue, and a reader who lost their place had
 * nothing to re-find it by, which is the mechanic behind "I keep re-reading
 * lines". Splitting on sentence boundaries gives the eye a reset per thought
 * at no cost to the words themselves.
 *
 * The split is PRESENTATION ONLY. The caller still owns the real string (the
 * dialogue flow compares `dialogueText` against choice prompts by equality,
 * and the whisper gallery records the unsplit line), and re-joining these
 * blocks with a single space reproduces the input, so nothing downstream can
 * drift. It also composes with the typewriter: `text` is normally a growing
 * PREFIX of the page, and a prefix splits the same way a whole page does.
 */


export const DialogueBody: React.FC<{
  text: string;
  style?: StyleProp<TextStyle>;
  /** Gap between sentence blocks; 0 falls back to one plain <Text>. */
  gap?: number;
}> = ({ text, style, gap = 7 }) => {
  const sentences = useMemo(() => splitIntoSentences(text), [text]);
  if (gap <= 0 || sentences.length <= 1) {
    return <Text style={style}>{text}</Text>;
  }
  return (
    <View>
      {sentences.map((s, i) => (
        <Text key={i} style={[style, i > 0 && { marginTop: gap }]}>
          {s}
        </Text>
      ))}
    </View>
  );
};

export default DialogueBody;
