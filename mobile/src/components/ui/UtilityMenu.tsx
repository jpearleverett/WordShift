import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { DialoguePhase } from '../../types/homeWorld';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { getPixelSkin, PANEL_CORNER_DP, PANEL_EDGE_DP } from '../../theme/pixelSkin.generated';
import { BODY_FONT } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';
import { NineSliceFrame } from './NineSlice';
import { PixelPlaque } from './PixelPlaque';
import { SpringIn } from './SpringIn';
import { HubRow } from './HubRow';
import { SacrificeModal } from './SacrificeModal';
import { RulesModal } from '../puzzle/RulesModal';
import { getShopTitle, getNewCycleTitle } from '../../services/phaseNarrative';
import { isSacrificeAvailable, getSacrificePrompt } from '../../services/sacrifice';
import { canStartNewCycle } from '../../services/amberCurrency';

// Candy-style UI icon sprites (cross-platform consistent, replaces emoji)
// Statistics wears the painted-bars stats sprite generateUiIcons drew for it
// (it was generated but never consumed; the row borrowed the 3-star rating
// star, which means "perfect solve" everywhere else).
const STATS_ICON = require('../../../assets/ui/stats.png');
const AMBER_ICON = require('../../../assets/ui/amber.png');
// The How-to-Play row wore the hint bulb (a sprite that means "spend a hint"
// on the board); the signpost (generateGameIcons chrome) says what it is.
const RULES_ICON = require('../../../assets/ui/rules.png');
// The Offering row shares the altar's own lit taper with SacrificeModal (the
// streak flame it used to borrow means "days in a row" on every other surface).
const CANDLE_ICON = require('../../../assets/ui/candle.png');
// The New Cycle door wears its own serpent-ring mark (generateGameIcons chrome)
// rather than the phase-4 void disc it used to borrow from the mood badge.
const CYCLE_ICON = require('../../../assets/ui/cycle_loop.png');
// The Cosmetic Shop row borrowed an emote sparkle; the hanging shop sign is
// the shop's own mark.
const SHOP_ICON = require('../../../assets/ui/shop_sign.png');
const GEAR_ICON = require('../../../assets/ui/gear.png');

interface UtilityMenuProps {
  visible: boolean;
  phase: DialoguePhase;
  onClose: () => void;
  /** Live spendable amber (feeds the phase-4 altar). */
  amber: number;
  onAmberChange?: (newBalance: number) => void;
  onOpenStats?: () => void;
  onOpenShop?: () => void;
  onOpenStore?: () => void;
  onOpenSettings?: () => void;
  onStartNewCycle?: () => void;
}

/**
 * The ☰ utility menu, shared by every surface that hosts it (home, the
 * Offering Pit). The row set, the skin and the two surfaces it opens (How to
 * Play, The Offering) all live HERE rather than in a host, so the menu is the
 * same menu by construction and cannot drift apart again.
 */
export const UtilityMenu: React.FC<UtilityMenuProps> = ({
  visible,
  phase,
  onClose,
  amber,
  onAmberChange,
  onOpenStats,
  onOpenShop,
  onOpenStore,
  onOpenSettings,
  onStartNewCycle,
}) => {
  const [showRules, setShowRules] = useState(false);
  const [showSacrifice, setShowSacrifice] = useState(false);
  // Whether the New Cycle door shows (true endgame only). Re-read on every
  // open so both surfaces agree without the host precomputing it.
  const [canCycle, setCanCycle] = useState(false);
  useEffect(() => {
    let alive = true;
    canStartNewCycle().then(v => { if (alive) setCanCycle(v); }).catch(() => {});
    return () => { alive = false; };
  }, [visible]);

  // The menu hosts its content on dt.modalBg, and the dialogue theme darkens at
  // phase 2 — one phase BEFORE the surface theme. hostDark tells every kit
  // component on the panel to use dark-surface tokens at phase 2 so nothing
  // renders dark-on-dark; panelSt is the same mapping for direct token reads.
  const st = getSurfaceTheme(phase);
  const dtHostDark = phase >= 2;
  const panelSt = getSurfaceTheme(phase === 2 ? 3 : phase === 3 ? 4 : phase);
  const pixelSkin = getPixelSkin(phase, dtHostDark);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: st.overlay }]}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close utility menu"
          accessibilityRole="button"
        >
          <SpringIn
            phase={phase}
            claimTouches
            style={styles.compactHubModal}
          >
            <NineSliceFrame
              skin={pixelSkin.panel}
              cornerDp={PANEL_CORNER_DP}
              edgeDp={PANEL_EDGE_DP}
              fillColor={pixelSkin.fill}
              openBottom
            />
            <PixelPlaque
              phase={phase}
              hostDark={dtHostDark}
              label="Menu"
              style={styles.modalPlaque}
            />
            <Text style={[styles.shopSubtitle, { color: panelSt.muted }]}>
              Everything else can stay tucked away until you need it.
            </Text>
            {onOpenStats && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                icon={STATS_ICON}
                label="Statistics"
                onPress={() => {
                  onClose();
                  onOpenStats?.();
                }}
                accessibilityLabel="Open statistics"
              />
            )}
            {onOpenShop && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                label={getShopTitle(phase)}
                icon={SHOP_ICON}
                onPress={() => {
                  onClose();
                  onOpenShop?.();
                }}
                accessibilityLabel={`Open ${getShopTitle(phase)}`}
              />
            )}
            {onOpenStore && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                icon={AMBER_ICON}
                label="Store"
                onPress={() => {
                  onClose();
                  onOpenStore?.();
                }}
                accessibilityLabel="Open store"
              />
            )}
            <HubRow
              phase={phase}
              hostDark={dtHostDark}
              icon={RULES_ICON}
              label="How to Play"
              onPress={() => {
                onClose();
                setShowRules(true);
              }}
              accessibilityLabel="How to play"
            />
            {onOpenSettings && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                label="Settings"
                icon={GEAR_ICON}
                onPress={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                accessibilityLabel="Open settings"
              />
            )}
            {isSacrificeAvailable(phase) && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                icon={CANDLE_ICON}
                label={getSacrificePrompt(phase).title}
                onPress={() => {
                  onClose();
                  setShowSacrifice(true);
                }}
                accessibilityLabel="Open sacrifice"
              />
            )}
            {/* The Pattern Continues — the New Cycle door, IN the world the
                Phase-5 player actually lives on. Previously findable only in
                Settings, which the in-world pointer lines are forbidden from
                naming; this row IS the door those lines allude to. */}
            {canCycle && onStartNewCycle && (
              <HubRow
                phase={phase}
                hostDark={dtHostDark}
                icon={CYCLE_ICON}
                label={getNewCycleTitle()}
                onPress={() => {
                  onClose();
                  onStartNewCycle();
                }}
                accessibilityLabel={getNewCycleTitle()}
              />
            )}
          </SpringIn>
        </TouchableOpacity>
      </Modal>

      {/* How to Play — phase-aware rules recap, reachable any time from the menu */}
      <RulesModal
        visible={showRules}
        phase={phase}
        onClose={() => setShowRules(false)}
      />

      {/* The Offering altar (Phase 4+) */}
      <SacrificeModal
        visible={showSacrifice}
        phase={phase}
        amber={amber}
        onAmberChange={onAmberChange}
        onClose={() => setShowSacrifice(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Scrim color always comes from the phase theme inline (st.overlay).
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  compactHubModal: {
    paddingVertical: 24,
    paddingHorizontal: SURFACE.panelPadX,
    paddingBottom: 32,
  },
  // Wooden nameplate title overlapping the panel's top frame edge.
  modalPlaque: {
    marginTop: -8,
    marginBottom: 10,
  },
  shopSubtitle: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.large,
    textAlign: 'center',
    marginBottom: 24,
  },
});
