/**
 * The dialogue card's CHOICE PAGE: the surface a relationship choice turns
 * over to. The prompt arrives as an ordinary line with an ordinary Next; that
 * Next turns the card over (useDialogueFlow.choiceOpen): the portrait steps
 * aside into a small header, the animal's line shrinks to a caption, and the
 * two answers take the full column as left-aligned parchment trays under a
 * YOU mark, so every word of the writing keeps the width a sentence needs.
 * The answers press like everything else the player has learned to touch
 * (the fill darkens under the thumb, the tap sounds); nothing else on the
 * page is a control, and the card refuses to close until one is picked (the
 * hook's must-answer lock, which also keeps the scrim from being rendered).
 *
 * DialogueChoiceEcho is the second half: the answer just given stays on the
 * card, dimmed, above the animal's reply, so the reply reads as a reply.
 */
import React, { useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';
import { AppText } from '../ui/AppText';
import { NineSliceFrame } from '../ui/NineSlice';
import { CARD_CORNER_DP, CARD_EDGE_DP, type PixelSkin } from '../../theme/pixelSkin.generated';
import { SURFACE } from '../../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';
import { getDialoguePortraitFrame } from '../../theme/dialoguePortrait';
import { playUiSound } from '../../services/uiSound';
import { announceForA11y } from '../../services/a11yAnnounce';
import type { AnimalType } from '../../types/homeWorld';
import type { DialogueChoice, PlayerChoice } from '../../services/dialogueChoices';

/** The header portrait is a keepsake of the speaker, not the reading alcove. */
const CHOICE_PORTRAIT_WIDTH = 56;
const CHOICE_PORTRAIT_MAX_HEIGHT = 64;
/** The speaker mark over the player's answers (and over the echoed pick). */
export const CHOICE_SPEAKER_MARK = 'YOU';

interface AnswerTrayProps {
  text: string;
  skin: PixelSkin;
  ink: string;
  onPress: () => void;
}

function AnswerTray({ text, skin, ink, onPress }: AnswerTrayProps) {
  return (
    <Pressable
      style={styles.answer}
      onPress={() => {
        playUiSound('dialogue');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={text}
    >
      {({ pressed }) => (
        <>
          <NineSliceFrame
            skin={skin.card}
            cornerDp={CARD_CORNER_DP}
            edgeDp={CARD_EDGE_DP}
            fillColor={skin.fillCard}
          />
          {/* The parchment darkens under the thumb: an ink veil inset past the
              wood band, so the frame itself stays lit and the tray reads as
              pressed rather than dimmed. */}
          {pressed ? <View pointerEvents="none" style={[styles.pressedVeil, { backgroundColor: ink }]} /> : null}
          <Text style={[styles.answerText, { color: ink }]}>{text}</Text>
        </>
      )}
    </Pressable>
  );
}

export interface DialogueChoicePageProps {
  animalType: AnimalType;
  name: string;
  nameColor: string;
  /** The speaker's current portrait (idle, or robed from the reveal); null renders no portrait. */
  portrait: ImageSourcePropType | null;
  choice: DialogueChoice;
  skin: PixelSkin;
  /** The card's body ink (panelSt.body): caption and answers. */
  inkBody: string;
  /** The card's muted ink (panelSt.muted): the YOU mark. */
  inkMuted: string;
  onChoose: (choice: PlayerChoice) => void;
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
}: DialogueChoicePageProps) {
  const frame = getDialoguePortraitFrame(animalType, CHOICE_PORTRAIT_WIDTH, CHOICE_PORTRAIT_MAX_HEIGHT);

  // The turn is the signal: say who asked and what, then hand over the answer.
  // Only what the page already shows (spoiler discipline of a11yAnnounce).
  useEffect(() => {
    announceForA11y(`${name}. ${choice.prompt} Your answer.`);
  }, [name, choice.prompt]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {portrait ? (
          <View
            style={[styles.portrait, frame.box]}
            accessibilityRole="image"
            accessibilityLabel={`${name} portrait`}
          >
            <Image source={portrait} style={[styles.portraitLayer, frame.layer]} resizeMode="cover" />
          </View>
        ) : null}
        <Text numberOfLines={1} style={[styles.name, { color: nameColor }]}>
          {name}
        </Text>
      </View>

      <View style={styles.caption}>
        <NineSliceFrame
          skin={skin.card}
          cornerDp={CARD_CORNER_DP}
          edgeDp={CARD_EDGE_DP}
          fillColor={skin.fillCard}
        />
        <AppText textRole="caption" style={{ color: inkBody }}>
          {choice.prompt}
        </AppText>
      </View>

      <AppText textRole="label" style={[styles.speakerMark, { color: inkMuted }]}>
        {CHOICE_SPEAKER_MARK}
      </AppText>
      <AnswerTray text={choice.options.ask} skin={skin} ink={inkBody} onPress={() => onChoose('ask')} />
      <AnswerTray text={choice.options.refuse} skin={skin} ink={inkBody} onPress={() => onChoose('refuse')} />
    </View>
  );
}

export interface DialogueChoiceEchoProps {
  text: string;
  inkMuted: string;
}

export function DialogueChoiceEcho({ text, inkMuted }: DialogueChoiceEchoProps) {
  return (
    <View style={styles.echo} accessible accessibilityLabel={`You said: ${text}`}>
      <AppText textRole="label" style={[styles.echoMark, { color: inkMuted }]}>
        {CHOICE_SPEAKER_MARK}
      </AppText>
      <AppText textRole="caption" style={[styles.echoText, { color: inkMuted }]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors dialogueTextCol's insets so the page sits exactly where the
  // reading column did; the sheet's panel clearance is the host's.
  page: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 34,
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // The crop box owns the crop (see theme/dialoguePortrait); its dims arrive
  // per character from getDialoguePortraitFrame.
  portrait: {
    overflow: 'hidden',
    marginRight: 10,
  },
  portraitLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  // Card-framed caption: clear the 12dp card band with room to spare.
  caption: {
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  speakerMark: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  // Card-framed answer tray: the shared card clearance on both axes, and a
  // 56dp minimum so a one-line answer is still a comfortable target.
  answer: {
    paddingHorizontal: SURFACE.cardPadX,
    paddingVertical: SURFACE.cardPadY,
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: 10,
  },
  // Left-aligned like speech, never centred like signage.
  answerText: {
    fontFamily: BODY_FONT,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
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
  echo: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  echoMark: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    marginBottom: 2,
  },
  echoText: {
    opacity: 0.8,
  },
});
