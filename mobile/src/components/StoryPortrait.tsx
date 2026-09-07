import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CHARACTER_SPRITES } from './home/AnimalSprite';

/** A short speaking gesture, using the existing cast frames; never a looping distraction. */
export function StoryPortrait({ speaker, phase, passage, size = 116 }: {
  speaker: AnimalType; phase: DialoguePhase; passage: string; size?: number;
}) {
  const passageKey = `${speaker}:${passage}`;
  const [frame, setFrame] = useState<{ key: string; talking: boolean } | null>(null);
  const sprites = CHARACTER_SPRITES[speaker];
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      setFrame({ key: passageKey, talking: ticks < 5 && ticks % 2 === 1 });
      if (ticks >= 5) clearInterval(timer);
    }, 220);
    return () => clearInterval(timer);
  }, [passageKey, reducedMotion]);
  const talking = !reducedMotion && frame?.key === passageKey && frame.talking;
  if (!sprites) return null;
  const idle = phase >= 4 ? sprites.robed ?? sprites.idle : sprites.idle;
  const talk = phase >= 4 ? sprites.robedTalk ?? idle : sprites.talk ?? idle;
  return <View style={[styles.frame, { width: size, height: size }]} accessible={false} pointerEvents="none">
    <Image source={talking ? talk : idle} resizeMode="contain" style={[styles.sprite, { width: size * 1.36, height: size * 1.36, left: -size * 0.18, top: -size * 0.17 }]} accessible={false} />
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: 116, height: 116, alignSelf: 'center', overflow: 'hidden', marginBottom: 8 },
  sprite: { width: 158, height: 158, position: 'absolute', left: -21, top: -20 },
});
