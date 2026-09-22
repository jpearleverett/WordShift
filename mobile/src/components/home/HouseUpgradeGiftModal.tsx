import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Animal, DialoguePhase } from '../../types/homeWorld';
import type { HouseUpgradeGift } from '../../services/roomUpgrades';
import { getHouseUpgradeGiftDialogue, getHouseUpgradeGiftName } from '../../services/dialogue/houseUpgradeDialogue';
import { announceForA11y } from '../../services/a11yAnnounce';
import { getHouseUpgradeGiftPrompt } from '../../services/phaseNarrative';
import { getSettingsSync } from '../../services/settings';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { AppText } from '../ui/AppText';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { CHARACTER_SPRITES } from './AnimalSprite';

export interface HouseUpgradeGiftModalProps {
  visible: boolean;
  animal: Animal | null;
  gift: HouseUpgradeGift | null;
  phase: DialoguePhase;
  /** Covers both handing over the gift and acknowledging its final page. */
  giving: boolean;
  error: string | null;
  /** Keep a recoverable storage operation open while still permitting retry. */
  closeDisabled?: boolean;
  onGive: () => void;
  onClose: () => void;
  onComplete: () => void;
}

/** Ownership and delivery are saved by the parent; this sheet only presents them. */
export function HouseUpgradeGiftModal({
  visible, animal, gift, phase, giving, error, closeDisabled = false,
  onGive, onClose, onComplete,
}: HouseUpgradeGiftModalProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = getSurfaceTheme(phase);
  const scroll = useRef<ScrollView>(null);
  const saving = useRef(false);
  const pageGate = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reading, setReading] = useState<{ id: string; page: number } | null>(null);
  const giftId = gift?.id;
  const deliveredAt = gift?.deliveredAt;
  const delivered = deliveredAt !== undefined;
  const pages = gift && delivered ? getHouseUpgradeGiftDialogue(gift, phase) : [];
  const page = giftId && reading?.id === giftId ? Math.min(reading.page, Math.max(0, pages.length - 1)) : 0;
  const line = pages[page];
  const giftName = gift ? getHouseUpgradeGiftName(gift) : '';
  const finalPage = page >= pages.length - 1;

  useEffect(() => {
    saving.current = false;
    if (pageGate.current) clearTimeout(pageGate.current);
    pageGate.current = null;
  }, [giftId, visible]);

  // The ref closes the gap before the parent's saving prop can render. Every
  // completed write (including a failed attempt) releases it for a retry.
  useEffect(() => {
    saving.current = giving;
  }, [giving, error, deliveredAt]);

  useEffect(() => {
    if (!visible) return;
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (line && animal) announceForA11y(`${animal.name}. ${line}`);
  }, [visible, giftId, page, line, animal]);

  useEffect(() => {
    if (visible && error) announceForA11y(error);
  }, [visible, error]);

  useEffect(() => () => {
    if (pageGate.current) clearTimeout(pageGate.current);
  }, []);

  const close = () => {
    if (!visible || giving || saving.current || delivered || closeDisabled) return;
    saving.current = true;
    onClose();
  };

  const advance = () => {
    if (!visible || !gift || giving || saving.current || pageGate.current) return;
    // Also covers an unusually fast Give save: its second tap must not skip
    // the first reaction after the parent switches the receipt to delivered.
    pageGate.current = setTimeout(() => { pageGate.current = null; }, 350);
    if (!delivered || finalPage) {
      saving.current = true;
      if (delivered) onComplete();
      else onGive();
      return;
    }
    // Hold through the next frame and a second quick tap, so a double press
    // cannot skip a reaction page or immediately acknowledge the final one.
    setReading({ id: gift.id, page: page + 1 });
  };

  if (!visible || !animal || !gift) return null;

  const sprites = CHARACTER_SPRITES[animal.type];
  const portrait = phase >= 4 ? sprites?.robed ?? sprites?.idle : sprites?.idle;
  const actionLabel = giving ? 'Saving…' : error ? 'Retry' : delivered ? finalPage ? 'Done' : 'Continue' : `Give to ${animal.name}`;

  return (
    <Modal
      visible
      transparent
      animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'}
      onRequestClose={close}
    >
      <View
        testID="house-upgrade-gift-modal"
        accessibilityViewIsModal
        style={[
          styles.overlay,
          { backgroundColor: theme.overlay, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <PanelCard phase={phase} kind="panel" style={{ width: '100%', maxWidth: 560, maxHeight: Math.max(120, height - insets.top - insets.bottom - 32) }}>
          <ScrollView ref={scroll} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">
            <AppText textRole="caption" style={[styles.eyebrow, { color: theme.muted }]}>
              {delivered ? 'A place in the house' : `A gift for ${animal.name}`}
            </AppText>
            <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>
              {giftName}
            </AppText>
            {portrait && <Image source={portrait} resizeMode="contain" style={styles.portrait} accessible={false} />}
            <AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>{animal.name}</AppText>
            <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>
              {delivered ? line : getHouseUpgradeGiftPrompt(giftName, animal.name, animal.type)}
            </AppText>
            <View style={styles.actions}>
              {delivered && pages.length > 1 && (
                <AppText textRole="caption" accessibilityLabel={`Page ${page + 1} of ${pages.length}`} style={[styles.counter, { color: theme.muted }]}>
                  {page + 1} / {pages.length}
                </AppText>
              )}
              {error && <AppText textRole="body" accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: theme.body }}>{error}</AppText>}
              <CandyButton
                phase={phase}
                label={actionLabel}
                accessibilityLabel={!delivered && !error && !giving ? `Give ${giftName} to ${animal.name}` : actionLabel}
                disabled={giving}
                onPress={advance}
              />
              {!delivered && <CandyButton phase={phase} label="Later" variant="quiet" onPress={close} disabled={giving || closeDisabled} />}
            </View>
          </ScrollView>
        </PanelCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  content: { paddingHorizontal: SURFACE.panelPadX, paddingVertical: SURFACE.panelPadY },
  eyebrow: { textAlign: 'center', marginBottom: 8 },
  title: { textAlign: 'center', marginBottom: 12 },
  portrait: { width: 132, height: 132, alignSelf: 'center', marginBottom: 8 },
  speaker: { marginBottom: 10 },
  body: { marginBottom: 24 },
  actions: { gap: 12 },
  counter: { textAlign: 'center' },
});

export default HouseUpgradeGiftModal;
