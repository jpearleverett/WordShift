/**
 * A relationship choice stays part of the conversation: the animal and their
 * full-size question share the sheet, with two equally weighted replies below.
 * The host scrolls the complete page so longer writing and larger text settings
 * never trade away an answer. Leaving postpones the decision; it never picks one.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';
import { AppText } from '../ui/AppText';
import { NineSliceFrame } from '../ui/NineSlice';
import { CARD_CORNER_DP, CARD_EDGE_DP, type PixelSkin } from '../../theme/pixelSkin.generated';
import { SURFACE } from '../../theme/surfaces';
import { FONT_SIZE } from '../../theme/typeScale';
import { getDialoguePortraitFrame } from '../../theme/dialoguePortrait';
import { playUiSound } from '../../services/uiSound';
import { announceForA11y } from '../../services/a11yAnnounce';
import type { AnimalType } from '../../types/homeWorld';
import type { DialogueChoice, PlayerChoice } from '../../services/dialogueChoices';

const CHOICE_PORTRAIT_WIDTH = 84;
const CHOICE_PORTRAIT_MAX_HEIGHT = 104;
const SAVING_REVEAL_MS = 300;

interface AnswerTrayProps {
  text: string;
  skin: PixelSkin;
  ink: string;
  saving: boolean;
  onPress: () => void;
}

function AnswerTray({ text, skin, ink, saving, onPress }: AnswerTrayProps) {
  return (
    <Pressable
      style={styles.answer}
      disabled={saving}
      onPress={() => {
        if (saving) return;
        playUiSound('dialogue');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: saving }}
    >
      {({ pressed }) => (
        <>
          <NineSliceFrame
            skin={skin.card}
            cornerDp={CARD_CORNER_DP}
            edgeDp={CARD_EDGE_DP}
            fillColor={skin.fillCard}
          />
          {pressed ? <View pointerEvents="none" style={[styles.pressedVeil, { backgroundColor: ink }]} /> : null}
          <AppText textRole="body" style={[styles.answerText, { color: ink }]}>{text}</AppText>
        </>
      )}
    </Pressable>
  );
}

export interface DialogueChoicePageProps {
  animalType: AnimalType;
  name: string;
  nameColor: string;
  /** The speaker's current portrait; null renders no portrait. */
  portrait: ImageSourcePropType | null;
  choice: DialogueChoice;
  skin: PixelSkin;
  inkBody: string;
  inkMuted: string;
  onChoose: (choice: PlayerChoice) => void;
  onLater: () => void;
  /** Lock immediately while persistence runs, without dimming the whole sheet. */
  saving?: boolean;
  /** The hook supplies a short, actionable retry message after a failed save. */
  error?: string | null;
}

export function DialogueChoicePage({
  animalType,
  name,
  nameColor,
  portrait,
  choice,
  skin,
  inkBody,
  inkMuted,
  onChoose,
  onLater,
  saving = false,
  error = null,
}: DialogueChoicePageProps) {
  const frame = getDialoguePortraitFrame(animalType, CHOICE_PORTRAIT_WIDTH, CHOICE_PORTRAIT_MAX_HEIGHT);
  const [showSaving, setShowSaving] = useState(false);

  useEffect(() => {
    announceForA11y(`${name}. ${choice.prompt} Your response.`);
  }, [name, choice.prompt]);

  // A fast local write should not make the page blink. The status has a
  // permanent slot, and only slow saves reveal it; buttons lock immediately.
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setShowSaving(true), SAVING_REVEAL_MS);
    return () => {
      clearTimeout(timer);
      setShowSaving(false);
    };
  }, [saving]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {portrait ? (
          <View
            style={[styles.portrait, frame.box]}
            accessibilityRole="image"
            accessibilityLabel={`${name} portrait`}
          >
            <Image source={portrait} style={[styles.portraitLayer, frame.layer]} resizeMode="cover" fadeDuration={0} />
          </View>
        ) : null}
        <AppText textRole="label" style={[styles.name, { color: nameColor }]}>
          {name}
        </AppText>
      </View>

      <AppText textRole="reading" style={[styles.prompt, { color: inkBody }]}>
        {choice.prompt}
      </AppText>

      <AppText textRole="label" style={[styles.speakerMark, { color: inkMuted }]}>
        Your response
      </AppText>
      <View style={styles.answers}>
        <AnswerTray text={choice.options.ask} skin={skin} ink={inkBody} saving={saving} onPress={() => onChoose('ask')} />
        <AnswerTray text={choice.options.refuse} skin={skin} ink={inkBody} saving={saving} onPress={() => onChoose('refuse')} />
      </View>

      <View style={styles.status} accessibilityLiveRegion="polite">
        {error ? (
          <AppText textRole="body" style={{ color: inkBody }} accessibilityRole="alert">{error}</AppText>
        ) : saving && showSaving ? (
          <AppText textRole="caption" style={{ color: inkMuted }}>Saving your answer...</AppText>
        ) : null}
      </View>
      <Pressable
        style={({ pressed }) => [styles.later, pressed && styles.laterPressed]}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Come back later"
        accessibilityHint="Leave this question unanswered. It will be here when you return."
        accessibilityState={{ disabled: saving }}
        onPress={() => {
          if (saving) return;
          playUiSound('dialogue');
          onLater();
        }}
      >
        <AppText textRole="body" style={[styles.laterText, { color: inkMuted }]}>Come back later</AppText>
      </Pressable>
    </View>
  );
}

export interface DialogueChoiceEchoProps {
  text: string;
  inkMuted: string;
  inkBody?: string;
}

export function DialogueChoiceEcho({ text, inkMuted, inkBody = inkMuted }: DialogueChoiceEchoProps) {
  return (
    <View style={[styles.echo, { borderColor: inkMuted }]} accessible accessibilityLabel={`You said: ${text}`}>
      <AppText textRole="label" style={[styles.echoMark, { color: inkMuted }]}>
        You said
      </AppText>
      <AppText textRole="body" style={{ color: inkBody }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // The host owns the outer wood frame and safe-area clearance. Keep the
  // question on that parchment, giving the framed replies the full width.
  page: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  portrait: {
    overflow: 'hidden',
    marginRight: 16,
    flexShrink: 0,
  },
  portraitLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: FONT_SIZE.headline,
    lineHeight: 28,
    flexShrink: 1,
  },
  prompt: {
    marginBottom: 24,
  },
  speakerMark: {
    fontSize: FONT_SIZE.bodyLg,
    lineHeight: 21,
    marginBottom: 12,
  },
  answers: {
    gap: 12,
  },
  answer: {
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: SURFACE.cardPadY,
    minHeight: 64,
    justifyContent: 'center',
    width: '100%',
  },
  answerText: {
    textAlign: 'left',
  },
  pressedVeil: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    opacity: 0.14,
  },
  status: {
    minHeight: 29,
    paddingTop: 8,
  },
  later: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  laterPressed: {
    opacity: 0.7,
  },
  laterText: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  echo: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  echoMark: {
    fontSize: FONT_SIZE.bodyLg,
    lineHeight: 21,
    marginBottom: 4,
  },
});
