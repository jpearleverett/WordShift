import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CHARACTER_SPRITES } from './home/AnimalSprite';

/** Stable portrait footprint, retained while the narrator or player speaks. */
export const STORY_PORTRAIT_SIZE = 116;
export const STORY_PORTRAIT_MARGIN_BOTTOM = 8;

/** A short speaking gesture, using the existing cast frames; never a looping distraction. */
export function StoryPortrait({ speaker, phase, passage, size = STORY_PORTRAIT_SIZE, speaking = true }: {
  speaker: AnimalType; phase: DialoguePhase; passage: string; size?: number; speaking?: boolean;
}) {
  const passageKey = `${speaker}:${passage}`;
  const [frame, setFrame] = useState<{ key: string; talking: boolean } | null>(null);
  const sprites = CHARACTER_SPRITES[speaker];
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion || !speaking) return;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      setFrame({ key: passageKey, talking: ticks < 5 && ticks % 2 === 1 });
      if (ticks >= 5) clearInterval(timer);
    }, 220);
    return () => clearInterval(timer);
  }, [passageKey, reducedMotion, speaking]);
  const talking = speaking && !reducedMotion && frame?.key === passageKey && frame.talking;
  if (!sprites) return null;
  const idle = phase >= 4 ? sprites.robed ?? sprites.idle : sprites.idle;
  const talk = phase >= 4 ? sprites.robedTalk ?? idle : sprites.talk ?? idle;
  // Both frames stay mounted and only their opacity changes. Swapping one
  // Image's `source` re-decoded it and, on Android, replayed the default
  // 300 ms fade-in, so the resident blinked on every talk tick and every page.
  const layer = [styles.sprite, { width: size * 1.36, height: size * 1.36, left: -size * 0.18, top: -size * 0.17 }];
  return <View style={[styles.frame, { width: size, height: size }]} accessible={false} pointerEvents="none">
    <Image source={idle} resizeMode="contain" fadeDuration={0} style={[layer, talking && talk !== idle && styles.hidden]} accessible={false} />
    {talk !== idle && <Image source={talk} resizeMode="contain" fadeDuration={0} style={[layer, !talking && styles.hidden]} accessible={false} />}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: STORY_PORTRAIT_SIZE, height: STORY_PORTRAIT_SIZE, alignSelf: 'center', overflow: 'hidden', marginBottom: STORY_PORTRAIT_MARGIN_BOTTOM },
  sprite: { width: 158, height: 158, position: 'absolute', left: -21, top: -20 },
  hidden: { opacity: 0 },
});
