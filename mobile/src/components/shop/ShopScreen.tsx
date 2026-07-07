import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { CandyColors, TILE_THEMES, CONFETTI_THEMES } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { PIXEL_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { AmberInline } from '../AmberInline';
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

/** A small row of tiles previewing a tile palette. */
const ThemePreview: React.FC<{ themeId: string | null }> = ({ themeId }) => {
  const palette = themeId && TILE_THEMES[themeId] ? TILE_THEMES[themeId] : CandyColors.tileColors;
  return (
    <View style={styles.previewRow}>
      {PREVIEW_LETTERS.map((ch, i) => {
        const c = palette[i % palette.length];
        return (
          <View
            key={ch}
            style={[styles.previewTile, { backgroundColor: c.bg, borderColor: c.border }]}
          >
            <Text style={styles.previewTileText}>{ch}</Text>
          </View>
        );
      })}
    </View>
  );
};

const DEFAULT_CONFETTI = ['#FF6B9D', '#C44DFF', '#4DAFFF', '#FFD84D', '#4DE8C2', '#FF8C4D'];

/** A small scatter of dots previewing a confetti palette. */
const ConfettiPreview: React.FC<{ themeId: string | null }> = ({ themeId }) => {
  const palette = themeId && CONFETTI_THEMES[themeId] ? CONFETTI_THEMES[themeId] : DEFAULT_CONFETTI;
  return (
    <View style={styles.previewConfetti}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View key={i} style={[styles.previewDot, { backgroundColor: palette[i % palette.length] }]} />
      ))}
    </View>
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

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

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

  const renderActionButton = (item: CosmeticItem) => {
    const isOwned = owned[item.id];
    const isEquipped = equipped[item.category] === item.id;
    if (isEquipped) {
      return (
        <View style={[styles.statusChip, styles.equippedChip, { borderColor: t.sectionBorder }]}>
          <Text style={[styles.equippedChipText, { color: t.body }]}>Equipped ✓</Text>
        </View>
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
    Preview: React.FC<{ themeId: string | null }>,
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
            <Preview themeId={item.id} />
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
    fontFamily: PIXEL_FONT,
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
  cardDesc: { fontSize: 12.5, fontWeight: '500', marginTop: 3, lineHeight: 17, fontFamily: PIXEL_FONT },
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
    fontFamily: PIXEL_FONT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    opacity: 0.75,
  },
});
