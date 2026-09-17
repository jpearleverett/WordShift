import React, { useEffect, useState } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { DialogueBody } from './DialogueBody';

interface DialogueRevealBodyProps {
  text: string;
  source: string;
  revealing: boolean;
  charMs: number;
  onComplete: () => void;
  style?: StyleProp<TextStyle>;
}

/** Character ticks stay inside this leaf; the conversation only sees completion. */
export const DialogueRevealBody = React.memo(function DialogueRevealBody({
  text, source, revealing, charMs, onComplete, style,
}: DialogueRevealBodyProps) {
  const [reveal, setReveal] = useState({ source, count: 0 });
  useEffect(() => {
    if (!revealing || !text) return;
    let count = 0;
    const timer = setInterval(() => {
      count = Math.min(count + 1, text.length);
      setReveal({ source, count });
      if (count === text.length) {
        clearInterval(timer);
        onComplete();
      }
    }, charMs);
    return () => clearInterval(timer);
  }, [source, text, revealing, charMs, onComplete]);

  const count = reveal.source === source ? reveal.count : 0;
  return <DialogueBody text={revealing ? text.slice(0, count) : text} style={style} />;
});
