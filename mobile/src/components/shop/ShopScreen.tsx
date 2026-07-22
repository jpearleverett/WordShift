import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CandyColors, TILE_THEMES, CONFETTI_THEMES } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { AmberInline } from '../AmberInline';
import { Confetti } from '../Confetti';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import {
  getCosmeticsByCategory,
  ownsCosmetic,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  unequipCosmetic,
  getEquipped,
  CosmeticItem,
  CosmeticCategory,
} from '../../services/cosmetics';
import { spendAmber } from '../../services/amberCurrency';
import { getRoomsWithStatus } from '../../services/homeWorldData';
import { Room, DialoguePhase } from '../../types/homeWorld';
import {
  areUpgradesAvailable,
  areDeepeningsAvailable,
  areAttunementsAvailable,
  getRoomUpgrade,
  getRoomDeepening,
  getAttunementForLevel,
  getUpgradeDescription,
  getPurchasedUpgrades,
  getDeepenedRooms,
  getAttunedRooms,
  purchaseRoomUpgrade,
  purchaseRoomDeepening,
  purchaseRoomAttunement,
  MAX_ATTUNEMENT_LEVEL,
} from '../../services/roomUpgrades';
import { logEvent } from '../../services/eventLogger';
import {
  getShopTitle,
  getShopSubtitle,
  getShopThemeSectionLabel,
  getShopDefaultThemeName,
  getShopConfettiSectionLabel,
  getShopDefaultConfettiName,
  getShopPatronLockedLabel,
  getShopStoreBridgeText,
} from '../../services/phaseNarrative';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { isPatronSync } from '../../services/entitlements';

interface ShopScreenProps {
  phase: number;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
  /** Open the Patron (cosmetic IAP) modal. */
  onOpenPatron?: () => void;
  /** Open the Store (amber packs). Renders a "Need more amber?" row when provided. */
  onOpenStore?: () => void;
}

const AMBER_ICON = require('../../../assets/ui/amber.png');

const PREVIEW_LETTERS = ['A', 'B', 'C', 'D'];

const previewMotionAllowed = () => !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();

/**
 * Play a one-shot staggered scale pulse over a set of Animated.Values (1 ->
 * 1.15 -> 1), 60ms apart. Returns the composite so the caller can stop it.
 */
function playPulse(values: Animated.Value[]): Animated.CompositeAnimation {
  const anim = Animated.stagger(
    60,
    values.map(v =>
      Animated.sequence([
        Animated.spring(v, { toValue: 1.15, friction: 5, tension: 220, useNativeDriver: true }),
        Animated.spring(v, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }),
      ]),
    ),
  );
  return anim;
}

interface PreviewProps {
  themeId: string | null;
  /** Bumped by the parent on purchase to celebrate this item; also self-plays on tap. */
  pulseToken?: number;
}

/** A small row of tiles previewing a tile palette. Tappable to demo the pulse. */
const ThemePreview: React.FC<PreviewProps> = ({ themeId, pulseToken = 0 }) => {
  const palette = themeId && TILE_THEMES[themeId] ? TILE_THEMES[themeId] : CandyColors.tileColors;
  const scales = useRef(PREVIEW_LETTERS.map(() => new Animated.Value(1))).current;

  const pulse = useCallback(() => {
    if (!previewMotionAllowed()) return;
    const a = playPulse(scales);
    a.start();
  }, [scales]);

  useEffect(() => {
    if (pulseToken > 0) pulse();
  }, [pulseToken, pulse]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={pulse}
      accessibilityRole="button"
      accessibilityLabel="Preview this tile theme"
      style={styles.previewRow}
    >
      {PREVIEW_LETTERS.map((ch, i) => {
        const c = palette[i % palette.length];
        return (
          <Animated.View
            key={ch}
            style={[
              styles.previewTile,
              { backgroundColor: c.bg, borderColor: c.border, transform: [{ scale: scales[i] }] },
            ]}
          >
            <Text style={styles.previewTileText}>{ch}</Text>
          </Animated.View>
        );
      })}
    </TouchableOpacity>
  );
};

const DEFAULT_CONFETTI = ['#FF6B9D', '#C44DFF', '#4DAFFF', '#FFD84D', '#4DE8C2', '#FF8C4D'];

/** A small scatter of dots previewing a confetti palette. Tappable to demo a mini-burst. */
const ConfettiPreview: React.FC<PreviewProps> = ({ themeId, pulseToken = 0 }) => {
  const palette = themeId && CONFETTI_THEMES[themeId] ? CONFETTI_THEMES[themeId] : DEFAULT_CONFETTI;
  const scales = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const pulse = useCallback(() => {
    if (!previewMotionAllowed()) return;
    const a = playPulse(scales);
    a.start();
  }, [scales]);

  useEffect(() => {
    if (pulseToken > 0) pulse();
  }, [pulseToken, pulse]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={pulse}
      accessibilityRole="button"
      accessibilityLabel="Preview this confetti palette"
      style={styles.previewConfetti}
    >
      {[0, 1, 2, 3, 4, 5].map(i => (
        <Animated.View
          key={i}
          style={[styles.previewDot, { backgroundColor: palette[i % palette.length], transform: [{ scale: scales[i] }] }]}
        />
      ))}
    </TouchableOpacity>
  );
};

/** The "Equipped ✓" chip. Springs in from scale 0.8 when it was just purchased. */
const AnimatedEquippedChip: React.FC<{ spring: boolean; borderColor: string; textColor: string }> = ({
  spring,
  borderColor,
  textColor,
}) => {
  const animate = spring && previewMotionAllowed();
  const scale = useRef(new Animated.Value(animate ? 0.8 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    scale.setValue(0.8);
    const a = Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [animate, scale]);
  return (
    <Animated.View style={[styles.statusChip, styles.equippedChip, { borderColor, transform: [{ scale }] }]}>
      <Text style={[styles.equippedChipText, { color: textColor }]}>Equipped ✓</Text>
    </Animated.View>
  );
};

export const ShopScreen: React.FC<ShopScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
  onOpenPatron,
  onOpenStore,
}) => {
  const screenInsets = useScreenInsets();
  const t = getSurfaceTheme(phase);
  // Framed light lift for the back chip: the kit's own highlight band alpha
  // over the deep screen base, framed with the panel border tint.
  const chipBg = `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`;

  const [balance, setBalance] = useState(amberBalance);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticCategory, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // House upgrades (tier-1 decorations + tier-2 deepenings + tier-3
  // attunements), sold here alongside the cosmetics — amber sinks,
  // expression only.
  const [rooms, setRooms] = useState<Room[]>([]);
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<Record<string, number>>({});
  const [purchasedDeepenings, setPurchasedDeepenings] = useState<Record<string, number>>({});
  const [attunedRooms, setAttunedRooms] = useState<Record<string, number>>({});
  const [houseFeedback, setHouseFeedback] = useState<string | null>(null);

  const reducedMotion = getSettingsSync().reducedMotion;
  // Cosmetic-purchase celebration (F43): the just-bought palette bursts confetti,
  // pulses its preview, and springs its Equipped chip.
  const [celebration, setCelebration] = useState<{ id: string; palette: string[]; token: number } | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  // House-upgrade in-card resolution (F50): the bought card holds its feedback in
  // place, fades, THEN the list reflows.
  const [resolving, setResolving] = useState<{ key: string; message: string } | null>(null);
  const houseFade = useRef(new Animated.Value(1)).current;

  const tileThemes = useMemo(() => getCosmeticsByCategory('tile_theme'), []);
  const confettiThemes = useMemo(() => getCosmeticsByCategory('confetti'), []);
  const allItems = useMemo(() => [...tileThemes, ...confettiThemes], [tileThemes, confettiThemes]);

  const refresh = useCallback(async () => {
    const ownedEntries = await Promise.all(
      allItems.map(async t => [t.id, await ownsCosmetic(t.id)] as const)
    );
    const [tile, confetti] = await Promise.all([
      getEquipped('tile_theme'),
      getEquipped('confetti'),
    ]);
    setOwned(Object.fromEntries(ownedEntries));
    setEquipped({ tile_theme: tile, confetti });
  }, [allItems]);

  const refreshHouse = useCallback(async () => {
    const [roomList, upgrades, deepenings, attunements] = await Promise.all([
      getRoomsWithStatus(),
      getPurchasedUpgrades(),
      getDeepenedRooms(),
      getAttunedRooms(),
    ]);
    setRooms(roomList);
    setPurchasedUpgrades(upgrades);
    setPurchasedDeepenings(deepenings);
    setAttunedRooms(attunements);
  }, []);

  // In-card purchase resolution (F50): keep the bought card mounted for a read
  // beat showing its feedback in place of the button, fade it, THEN refresh so
  // the reflow happens while nothing draws attention to it.
  const resolveHousePurchase = useCallback(async (key: string, message: string) => {
    setResolving({ key, message });
    houseFade.setValue(1);
    await new Promise<void>(r => setTimeout(r, 900));
    if (!reducedMotion) {
      await new Promise<void>(r => {
        Animated.timing(houseFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => r());
      });
    }
    await refreshHouse();
    setResolving(null);
    setHouseFeedback(null);
  }, [houseFade, reducedMotion, refreshHouse]);

  useEffect(() => {
    (async () => {
      await Promise.all([refresh(), refreshHouse()]);
      setLoading(false);
    })();
  }, [refresh, refreshHouse]);

  useEffect(() => { setBalance(amberBalance); }, [amberBalance]);

  const handleBuy = useCallback(async (item: CosmeticItem) => {
    if (busy || item.acquisition.kind !== 'amber') return;
    const cost = item.acquisition.cost;
    if (balance < cost) return;
    setBusy(item.id);
    try {
      const spend = await spendAmber(cost, `cosmetic_${item.id}`);
      if (!spend.success) return;
      setBalance(spend.newBalance);
      onAmberChange?.(spend.newBalance);
      await recordAmberCosmeticPurchase(item.id);
      await equipCosmetic(item.id); // auto-equip on purchase
      hapticMedium();
      // Celebrate the biggest expression purchase: burst the purchased palette,
      // pulse the preview, and spring the Equipped chip. Confetti self-skips
      // under reduced motion; the palette drives the color either way.
      const palette =
        item.category === 'tile_theme'
          ? (TILE_THEMES[item.id]?.map(c => c.bg) ?? [])
          : (CONFETTI_THEMES[item.id] ?? []);
      setCelebration(prev => ({ id: item.id, palette, token: (prev?.token ?? 0) + 1 }));
      if (palette.length > 0) setConfettiActive(true);
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, balance, onAmberChange, refresh]);

  const handleEquip = useCallback(async (item: CosmeticItem) => {
    if (busy) return;
    setBusy(item.id);
    try {
      await equipCosmetic(item.id);
      hapticLight();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, refresh]);

  const handleEquipDefault = useCallback(async (category: CosmeticCategory) => {
    if (busy) return;
    setBusy(`__default_${category}__`);
    try {
      await unequipCosmetic(category);
      hapticLight();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [busy, refresh]);

  // -------------------------------------------------------------------------
  // HOUSE UPGRADES — tier-1 room decorations + tier-2 "deepenings"
  // -------------------------------------------------------------------------

  const housePhase = phase as DialoguePhase;

  const availableUpgrades = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const upgrade = getRoomUpgrade(room.id);
        if (!upgrade || purchasedUpgrades[room.id]) return null;
        return { room, upgrade };
      })
      .filter((entry): entry is { room: Room; upgrade: NonNullable<ReturnType<typeof getRoomUpgrade>> } => entry !== null);
  }, [rooms, purchasedUpgrades]);

  // Tier-2 "deepenings": eligible once the room's tier-1 decoration is in
  // place and the deepening hasn't been bought yet.
  const availableDeepenings = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        const deepening = getRoomDeepening(room.id);
        if (!deepening) return null;
        if (!purchasedUpgrades[room.id]) return null; // tier-1 required first
        if (purchasedDeepenings[room.id]) return null;
        return { room, deepening };
      })
      .filter((entry): entry is { room: Room; deepening: NonNullable<ReturnType<typeof getRoomDeepening>> } => entry !== null);
  }, [rooms, purchasedUpgrades, purchasedDeepenings]);

  // Tier-3 "attunements": eligible once the room's tier-1 decoration is in
  // place (the deepening is NOT required) and the room isn't fully attuned.
  // Each row is the room's NEXT level (levels purchase strictly in order).
  const availableAttunements = useMemo(() => {
    return rooms
      .filter(room => room.isUnlocked)
      .map(room => {
        if (!purchasedUpgrades[room.id]) return null; // tier-1 required first
        const info = getAttunementForLevel(room.id, (attunedRooms[room.id] ?? 0) + 1);
        if (!info) return null; // no attunement for this room, or fully attuned
        return { room, info };
      })
      .filter((entry): entry is { room: Room; info: NonNullable<ReturnType<typeof getAttunementForLevel>> } => entry !== null);
  }, [rooms, purchasedUpgrades, attunedRooms]);

  const handleBuyUpgrade = useCallback(async (roomId: string) => {
    if (busy) return;
    const upgrade = getRoomUpgrade(roomId);
    if (!upgrade) return;
    setBusy(`upgrade_${roomId}`);
    try {
      const spendResult = await spendAmber(upgrade.cost, `room_upgrade_${roomId}`);
      if (!spendResult.success) {
        setHouseFeedback('Not enough amber for that yet.');
        return;
      }
      const purchased = await purchaseRoomUpgrade(roomId);
      if (!purchased) {
        setHouseFeedback('That upgrade is already in place.');
        return;
      }
      onAmberChange?.(spendResult.newBalance);
      setBalance(spendResult.newBalance);
      logEvent({ type: 'room_upgrade_purchased', data: { roomId, cost: upgrade.cost } });
      hapticMedium();
      await resolveHousePurchase(`upgrade_${roomId}`, `${upgrade.name} added.`);
    } finally {
      setBusy(null);
    }
  }, [busy, onAmberChange, resolveHousePurchase]);

  const handleBuyDeepening = useCallback(async (roomId: string) => {
    if (busy) return;
    const deepening = getRoomDeepening(roomId);
    if (!deepening) return;
    setBusy(`deepening_${roomId}`);
    try {
      const spendResult = await spendAmber(deepening.cost, `room_deepening_${roomId}`);
      if (!spendResult.success) {
        setHouseFeedback('Not enough amber for that yet.');
        return;
      }
      const purchased = await purchaseRoomDeepening(roomId);
      if (!purchased) {
        setHouseFeedback('That upgrade is already in place.');
        return;
      }
      onAmberChange?.(spendResult.newBalance);
      setBalance(spendResult.newBalance);
      logEvent({ type: 'room_upgrade_purchased', data: { roomId, cost: deepening.cost, tier: 2 } });
      hapticMedium();
      await resolveHousePurchase(`deepen_${roomId}`, `${deepening.name} settles in.`);
    } finally {
      setBusy(null);
    }
  }, [busy, onAmberChange, resolveHousePurchase]);

  const handleBuyAttunement = useCallback(async (roomId: string) => {
    if (busy) return;
    const info = getAttunementForLevel(roomId, (attunedRooms[roomId] ?? 0) + 1);
    if (!info) return;
    setBusy(`attunement_${roomId}`);
    try {
      const spendResult = await spendAmber(info.cost, `attunement_${roomId}`);
      if (!spendResult.success) {
        setHouseFeedback('Not enough amber for that yet.');
        return;
      }
      const purchased = await purchaseRoomAttunement(roomId);
      if (!purchased) {
        setHouseFeedback('That upgrade is already in place.');
        return;
      }
      onAmberChange?.(spendResult.newBalance);
      setBalance(spendResult.newBalance);
      logEvent({ type: 'room_upgrade_purchased', data: { roomId, cost: info.cost, tier: 3, level: info.level } });
      hapticMedium();
      await resolveHousePurchase(`attune_${roomId}`, `The room is ${info.name.toLowerCase()} now.`);
    } finally {
      setBusy(null);
    }
  }, [busy, attunedRooms, onAmberChange, resolveHousePurchase]);

  const showHouseUpgrades =
    areUpgradesAvailable(housePhase) &&
    availableUpgrades.length +
      (areDeepeningsAvailable(housePhase) ? availableDeepenings.length : 0) +
      (areAttunementsAvailable(housePhase) ? availableAttunements.length : 0) > 0;

  const renderActionButton = (item: CosmeticItem) => {
    const isOwned = owned[item.id];
    const isEquipped = equipped[item.category] === item.id;
    if (isEquipped) {
      return (
        <AnimatedEquippedChip
          spring={celebration?.id === item.id}
          borderColor={t.sectionBorder}
          textColor={t.body}
        />
      );
    }
    if (isOwned) {
      return (
        <CandyButton
          label="Equip"
          onPress={() => handleEquip(item)}
          phase={phase}
          variant="secondary"
          disabled={busy != null}
          style={styles.actionSlot}
          accessibilityLabel={`Equip ${item.name}`}
        />
      );
    }
    if (item.acquisition.kind === 'amber') {
      const cost = item.acquisition.cost;
      const affordable = balance >= cost;
      return (
        <CandyButton
          label={`${cost}`}
          onPress={() => handleBuy(item)}
          phase={phase}
          variant="amber"
          icon={AMBER_ICON}
          disabled={!affordable || busy != null}
          style={styles.actionSlot}
          accessibilityLabel={`Buy ${item.name} for ${cost} amber`}
        />
      );
    }
    // entitlement (e.g. Patron): locked unless owned
    return (
      <View style={[styles.statusChip, { borderColor: t.sectionBorder }]}>
        <Text style={[styles.lockedChipText, { color: t.muted }]}>{getShopPatronLockedLabel()}</Text>
      </View>
    );
  };

  const renderSection = (
    category: CosmeticCategory,
    sectionLabel: string,
    defaultName: string,
    defaultDesc: string,
    items: CosmeticItem[],
    Preview: React.FC<PreviewProps>,
  ) => {
    const defaultEquipped = equipped[category] === undefined;
    return (
      <View key={category}>
        <Text style={[styles.sectionLabel, { color: t.headerMuted }]}>{sectionLabel}</Text>

        {/* Default (free) option */}
        <PanelCard phase={phase} kind="card" style={styles.card}>
          <Preview themeId={null} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardName, { color: t.title }]}>{defaultName}</Text>
            <Text style={[styles.cardDesc, { color: t.body }]}>{defaultDesc}</Text>
          </View>
          {defaultEquipped ? (
            <View style={[styles.statusChip, styles.equippedChip, { borderColor: t.sectionBorder }]}>
              <Text style={[styles.equippedChipText, { color: t.body }]}>Equipped ✓</Text>
            </View>
          ) : (
            <CandyButton
              label="Equip"
              onPress={() => handleEquipDefault(category)}
              phase={phase}
              variant="secondary"
              disabled={busy != null}
              style={styles.actionSlot}
              accessibilityLabel={`Equip ${defaultName}`}
            />
          )}
        </PanelCard>

        {items.map(item => (
          <PanelCard key={item.id} phase={phase} kind="card" style={styles.card}>
            <Preview themeId={item.id} pulseToken={celebration?.id === item.id ? celebration.token : 0} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardName, { color: t.title }]}>{item.name}</Text>
              <Text style={[styles.cardDesc, { color: t.body }]} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
            {renderActionButton(item)}
          </PanelCard>
        ))}
      </View>
    );
  };

  // A house-upgrade card that, once bought, holds its feedback in place and fades
  // (F50) instead of vanishing in an abrupt reflow. `extraLine` carries the
  // attunement "level X of Y" line.
  const renderHouseCard = (
    key: string,
    title: string,
    description: string,
    cost: number,
    buyLabel: string,
    onBuy: () => void,
    a11y: string,
    extraLine?: string,
  ) => {
    const isResolving = resolving?.key === key;
    return (
      <Animated.View key={key} style={isResolving ? { opacity: houseFade } : undefined}>
        <PanelCard phase={phase} kind="card" style={styles.card}>
          <View style={styles.houseCardBody}>
            <Text style={[styles.cardName, { color: t.title }]}>{title}</Text>
            {extraLine ? (
              <Text style={[styles.attuneLevel, { color: t.muted }]}>{extraLine}</Text>
            ) : null}
            <Text style={[styles.cardDesc, { color: t.body }]}>{description}</Text>
            <Text style={[styles.houseCost, { color: t.amberText }]}>
              <AmberInline size={12} /> {cost}
            </Text>
          </View>
          {isResolving ? (
            <View style={[styles.resolveChip, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
              <Text style={[styles.resolveCheck, { color: t.amberText }]}>✓</Text>
              <Text style={[styles.resolveMsg, { color: t.amberText }]} numberOfLines={2}>
                {resolving?.message}
              </Text>
            </View>
          ) : (
            <CandyButton
              label={buyLabel}
              onPress={onBuy}
              phase={phase}
              variant="amber"
              disabled={balance < cost || busy != null}
              style={styles.actionSlot}
              accessibilityLabel={a11y}
            />
          )}
        </PanelCard>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: screenInsets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: chipBg, borderColor: t.headerChipBorder }]}
          onPress={onClose}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backChipText, { color: t.headerTitle }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: t.headerTitle }]}>{getShopTitle(phase)}</Text>
          <Text style={[styles.subtitle, { color: t.headerMuted }]} numberOfLines={2}>
            {getShopSubtitle(phase)}
          </Text>
        </View>
        <View style={[styles.amberPill, { backgroundColor: t.sectionBg, borderColor: t.amberTintBorder }]}>
          <Text style={[styles.amberPillText, { color: t.amberText }]}><AmberInline size={14} /> {Math.max(0, balance)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(48, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={t.headerTitle} />
          </View>
        ) : (
          <>
            {onOpenPatron && !isPatronSync() && (
              <TouchableOpacity
                onPress={() => { hapticLight(); onOpenPatron(); }}
                accessibilityLabel="Become a Patron"
                accessibilityRole="button"
                activeOpacity={0.85}
              >
                <PanelCard
                  phase={phase}
                  kind="card"
                  style={{ ...styles.patronBanner, borderColor: t.amberTintBorder }}
                >
                  <View pointerEvents="none" style={[styles.tintInset, { backgroundColor: t.amberTint }]} />
                  <Text style={[styles.patronBannerTitle, { color: t.amberText }]}>{'✦'} Become a Patron</Text>
                  <Text style={[styles.patronBannerSub, { color: t.body }]}>Support WordShift. A small amber bonus + an exclusive gold tile set</Text>
                </PanelCard>
              </TouchableOpacity>
            )}
            {renderSection(
              'tile_theme',
              getShopThemeSectionLabel(phase),
              getShopDefaultThemeName(phase),
              'The original candy tiles.',
              tileThemes,
              ThemePreview,
            )}
            {renderSection(
              'confetti',
              getShopConfettiSectionLabel(phase),
              getShopDefaultConfettiName(phase),
              'The usual phase-aware celebration.',
              confettiThemes,
              ConfettiPreview,
            )}

            {showHouseUpgrades && (
              <View>
                <Text style={[styles.sectionLabel, { color: t.headerMuted }]}>HOUSE UPGRADES</Text>
                {houseFeedback != null && (
                  <Text style={[styles.houseFeedback, { color: t.headerMuted }]}>{houseFeedback}</Text>
                )}
                {availableUpgrades.map(({ room, upgrade }) =>
                  renderHouseCard(
                    `upgrade_${room.id}`,
                    `${room.name}: ${upgrade.name}`,
                    getUpgradeDescription(room.id, housePhase),
                    upgrade.cost,
                    'Decorate',
                    () => handleBuyUpgrade(room.id),
                    `Decorate ${room.name} with ${upgrade.name} for ${upgrade.cost} amber`,
                  ),
                )}
                {areDeepeningsAvailable(housePhase) && availableDeepenings.map(({ room, deepening }) =>
                  renderHouseCard(
                    `deepen_${room.id}`,
                    `${room.name}: ${deepening.name}`,
                    deepening.description,
                    deepening.cost,
                    'Deepen',
                    () => handleBuyDeepening(room.id),
                    `Deepen ${room.name} with ${deepening.name} for ${deepening.cost} amber`,
                  ),
                )}
                {areAttunementsAvailable(housePhase) && availableAttunements.map(({ room, info }) =>
                  renderHouseCard(
                    `attune_${room.id}`,
                    `${room.name}: ${info.name}`,
                    info.description,
                    info.cost,
                    'Attune',
                    () => handleBuyAttunement(room.id),
                    `Attune ${room.name}, level ${info.level} of ${MAX_ATTUNEMENT_LEVEL}, ${info.name}, for ${info.cost} amber`,
                    `Attunement ${info.level} of ${MAX_ATTUNEMENT_LEVEL}`,
                  ),
                )}
              </View>
            )}

            {onOpenStore && (
              <TouchableOpacity
                onPress={() => { hapticLight(); onOpenStore(); }}
                accessibilityRole="button"
                accessibilityLabel="Open the Store for amber packs"
                activeOpacity={0.85}
              >
                <PanelCard
                  phase={phase}
                  kind="card"
                  style={{ ...styles.storeBridge, borderColor: t.amberTintBorder }}
                >
                  <View pointerEvents="none" style={[styles.tintInset, { backgroundColor: t.amberTint }]} />
                  <View style={styles.storeBridgeBody}>
                    <Text style={[styles.storeBridgeTitle, { color: t.amberText }]}>{getShopStoreBridgeText(phase).title}</Text>
                    <Text style={[styles.storeBridgeSub, { color: t.body }]}>
                      {getShopStoreBridgeText(phase).subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.storeBridgeChevron, { color: t.amberText }]}>{'>'}</Text>
                </PanelCard>
              </TouchableOpacity>
            )}

            <Text style={[styles.footnote, { color: t.headerMuted }]}>
              Cosmetics are for expression only. They never change the puzzle, the
              story, or your progress.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Purchase celebration burst (F43), painted in the just-bought palette.
          Self-skips under reduced motion. */}
      <Confetti
        active={confettiActive}
        colors={celebration?.palette}
        phase={phase}
        onComplete={() => setConfettiActive(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied inline (phase-aware screenBg)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backChip: {
    width: 76,
    minHeight: 44,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChipText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.3,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    opacity: 0.78,
  },
  amberPill: {
    minWidth: 76,
    minHeight: 40,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amberPillText: { fontSize: 15, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD },
  patronBanner: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  patronBannerTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4, fontFamily: PIXEL_FONT_BOLD },
  // Washes only the parchment, never the painted wood frame.
  tintInset: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12 },
  patronBannerSub: { fontSize: 12.5, fontWeight: '600', fontFamily: PIXEL_FONT_BOLD },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  loading: { paddingTop: 80, alignItems: 'center' },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 8,
    marginBottom: 12,
    opacity: 0.8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  cardBody: { flex: 1, paddingHorizontal: 12 },
  cardName: { fontSize: 16, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  cardDesc: { fontSize: 12.5, fontWeight: '500', marginTop: 3, lineHeight: 17, fontFamily: BODY_FONT },
  previewRow: { flexDirection: 'row', width: 96, flexWrap: 'wrap', gap: 4 },
  previewTile: {
    width: 22,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTileText: { color: CandyColors.white, fontSize: 12, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD },
  previewConfetti: {
    width: 96,
    height: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewDot: { width: 12, height: 12, borderRadius: 3 },
  actionSlot: { minWidth: 96 },
  houseCardBody: { flex: 1, paddingRight: 12 },
  houseFeedback: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: BODY_FONT,
    lineHeight: 17,
    marginBottom: 10,
  },
  houseCost: { fontSize: 13, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD, marginTop: 6 },
  attuneLevel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  statusChip: {
    minWidth: 96,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedChip: {
    // Settled, lifted tint: the framed "this one is worn" state.
    backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
  },
  equippedChipText: { fontSize: 13, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  lockedChipText: { fontSize: 12, fontWeight: '700', textAlign: 'center', fontFamily: PIXEL_FONT_BOLD },
  // In-card purchase resolution chip (F50): amber inset + check + short line.
  resolveChip: {
    minWidth: 96,
    maxWidth: 130,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveCheck: { fontSize: 18, fontWeight: '900', fontFamily: PIXEL_FONT_BOLD },
  resolveMsg: { fontSize: 10.5, fontWeight: '700', textAlign: 'center', fontFamily: PIXEL_FONT_BOLD, marginTop: 2 },
  storeBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 4,
  },
  storeBridgeBody: { flex: 1 },
  storeBridgeTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 2, fontFamily: PIXEL_FONT_BOLD },
  storeBridgeSub: { fontSize: 12, fontWeight: '600', fontFamily: PIXEL_FONT_BOLD },
  storeBridgeChevron: { fontSize: 18, fontWeight: '900', marginLeft: 10, fontFamily: PIXEL_FONT_BOLD },
  footnote: {
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.75,
  },
});
