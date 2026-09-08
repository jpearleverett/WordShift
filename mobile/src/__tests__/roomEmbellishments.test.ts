/**
 * World-rendering upgrade tests:
 *
 * 1. In-world investment rendering (RoomView embellishments) — a purchased
 *    room upgrade used to render as a single 10px "✦" glyph, deepenings and
 *    attunements rendered nothing. Pins the new pure visual contract
 *    (hearth glow / nameplate pips / wall sigils / dust motes) and its parity
 *    with the service's getRoomEmbellishmentIntensity math.
 * 2. Procedural gait (AnimalSprite) — the 12 animals without real walk frames
 *    get a bob/lean/squash gait derived from their species movement speed.
 * 3. Android-safe Arrangement sigil glow (HouseWorld) — layered Views, not
 *    shadowColor/shadowRadius (Android renders no View shadow blur).
 * 4. Phase-2 dialogue chrome softening (colors.ts) — the descent now arrives
 *    in two steps (warm white → twilight lavender-grey → phase-3 dark)
 *    instead of one cliff to the #1A1A2E family, with WCAG AA contrast held
 *    on the surfaces the inks actually render on.
 */

import fs from 'fs';
import path from 'path';

// Mock react-native since we're in Node (no renderer). Only what the
// components touch at module load matters (StyleSheet.create); the rest are
// inert stubs.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      interpolate: jest.fn().mockReturnValue('interpolated'),
      setValue: jest.fn(),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    multiply: jest.fn().mockReturnValue('multiplied'),
  },
  Easing: {
    inOut: jest.fn((fn: any) => fn),
    out: jest.fn((fn: any) => fn),
    in: jest.fn((fn: any) => fn),
    sin: jest.fn(),
    ease: jest.fn(),
    linear: jest.fn(),
    quad: jest.fn(),
  },
  Platform: { OS: 'android', select: (obj: any) => obj.android },
  PixelRatio: { get: jest.fn().mockReturnValue(2) },
  Dimensions: { get: jest.fn().mockReturnValue({ width: 400, height: 800 }) },
}));

// AnimalSprite pulls TouchableOpacity from react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  TouchableOpacity: 'TouchableOpacity',
}));

// homeWorldData transitively imports eventLogger; mock it so the debounced
// flush timer can't fire after teardown.
jest.mock('../services/eventLogger');

import {
  computeEmbellishmentIntensity,
  getEmbellishmentVisuals,
  getSigilColors,
  getRoomPropAnchor,
  ROOM_PROP_ANCHORS,
  ROOM_PROP_SIZE,
  GLOW_OPACITY_CAP,
  GLOW_OPACITY_BOOST_CAP,
} from '../components/home/RoomView';
import { getRoomUpgradeArt } from '../components/shop/shopArt';
import { ROOMS } from '../services/homeWorldData';
import {
  getGaitPeriodMs,
  getGaitBobPx,
  GAIT_LEAN_DEG,
} from '../components/home/AnimalSprite';
import { getDialogueTheme } from '../theme/colors';
import { PIXEL_SKINS } from '../theme/pixelSkin.generated';
import { AnimalType } from '../types/homeWorld';

const ROOM_VIEW_SRC = fs.readFileSync(
  path.resolve(__dirname, '../components/home/RoomView.tsx'),
  'utf8'
);
const HOUSE_WORLD_SRC = fs.readFileSync(
  path.resolve(__dirname, '../components/home/HouseWorld.tsx'),
  'utf8'
);

// ---------------------------------------------------------------------------
// 1. Embellishment intensity + visuals
// ---------------------------------------------------------------------------

describe('computeEmbellishmentIntensity (mirrors roomUpgrades service math)', () => {
  test('tier-1 decoration alone = 0.25', () => {
    expect(computeEmbellishmentIntensity(true, false, 0)).toBeCloseTo(0.25);
  });

  test('deepening adds 0.25', () => {
    expect(computeEmbellishmentIntensity(true, true, 0)).toBeCloseTo(0.5);
  });

  test('attunement adds 0.5 × level/3', () => {
    expect(computeEmbellishmentIntensity(true, true, 1)).toBeCloseTo(0.5 + 0.5 / 3);
    expect(computeEmbellishmentIntensity(true, true, 2)).toBeCloseTo(0.5 + 1 / 3);
    expect(computeEmbellishmentIntensity(true, true, 3)).toBeCloseTo(1);
  });

  test('caps at 1 and clamps out-of-range levels', () => {
    expect(computeEmbellishmentIntensity(true, true, 99)).toBe(1);
    expect(computeEmbellishmentIntensity(false, false, -5)).toBe(0);
  });

  test('untouched room = 0', () => {
    expect(computeEmbellishmentIntensity(false, false, 0)).toBe(0);
  });
});

describe('getEmbellishmentVisuals', () => {
  test('untouched room renders nothing', () => {
    const v = getEmbellishmentVisuals(false, false, 0);
    expect(v.showHearthGlow).toBe(false);
    expect(v.namePips).toBe(0);
    expect(v.sigilCount).toBe(0);
    expect(v.deepTintOpacity).toBe(0);
    expect(v.showMotes).toBe(false);
  });

  test('tier-1 decoration: the object + hearth glow + one nameplate pip, no sigils', () => {
    const v = getEmbellishmentVisuals(true, false, 0);
    expect(v.showHearthGlow).toBe(true);
    expect(v.showDecorationProp).toBe(true);
    expect(v.showDeepeningProp).toBe(false);
    expect(v.namePips).toBe(1);
    expect(v.sigilCount).toBe(0);
    expect(v.deepTintOpacity).toBe(0);
  });

  test('a lone tier-1 purchase is unmistakable: 0.42 peak glow (was 0.195)', () => {
    // The old floor (0.16 + 0.25 * 0.14 = 0.195, breathing down to ~0.10)
    // sat under a 7-27% night scrim over a free 0.055-0.11 floor reflection in
    // the same colour: the purchase delta was below notice, and the player
    // report was "I don't see them show up in the game".
    expect(getEmbellishmentVisuals(true, false, 0).glowMaxOpacity).toBeCloseTo(0.42);
    expect(getEmbellishmentVisuals(true, true, 0).glowMaxOpacity).toBeCloseTo(0.48);
    expect(getEmbellishmentVisuals(true, true, 3).glowMaxOpacity).toBeCloseTo(0.6);
  });

  test('deepening: the second piece, first wall sigil + a richer interior wash', () => {
    const v = getEmbellishmentVisuals(true, true, 0);
    expect(v.showDeepeningProp).toBe(true);
    expect(v.sigilCount).toBe(1);
    expect(v.deepTintOpacity).toBeCloseTo(0.18); // was an 8% wash, below the perceptual threshold
    expect(v.deepTintOpacity).toBeLessThanOrEqual(0.25); // still a wash, never a repaint
  });

  test('the deepening piece never appears without the decoration it builds on', () => {
    expect(getEmbellishmentVisuals(false, true, 0).showDeepeningProp).toBe(false);
    expect(getEmbellishmentVisuals(false, true, 0).showDecorationProp).toBe(false);
  });

  test('each attunement level visibly deepens: +1 pip, +1 sigil, bigger glow', () => {
    const l0 = getEmbellishmentVisuals(true, true, 0);
    const l1 = getEmbellishmentVisuals(true, true, 1);
    const l2 = getEmbellishmentVisuals(true, true, 2);
    const l3 = getEmbellishmentVisuals(true, true, 3);
    expect([l1.namePips, l2.namePips, l3.namePips]).toEqual([2, 3, 4]);
    expect([l1.sigilCount, l2.sigilCount, l3.sigilCount]).toEqual([2, 3, 4]);
    expect(l1.glowScale).toBeGreaterThan(l0.glowScale);
    expect(l3.glowScale).toBeGreaterThan(l1.glowScale);
    expect(l3.glowMaxOpacity).toBeGreaterThan(l0.glowMaxOpacity);
  });

  test('dust motes appear only at full attunement', () => {
    expect(getEmbellishmentVisuals(true, true, 2).showMotes).toBe(false);
    expect(getEmbellishmentVisuals(true, true, 3).showMotes).toBe(true);
  });

  test('layers stay capped so rooms remain readable (raised ceilings, still moody)', () => {
    // The caps were 0.3 / 4 / 4. The glow ceiling is now 0.6: the old cap kept
    // the layer "subtle" to the point that players could not see the purchase
    // they had just made. 0.6 at FULL investment is still a lit hearth in a
    // painted room, not a spotlight, and the dark phases keep their scrim.
    const v = getEmbellishmentVisuals(true, true, 3);
    expect(v.glowMaxOpacity).toBeLessThanOrEqual(GLOW_OPACITY_CAP);
    expect(GLOW_OPACITY_CAP).toBe(0.6);
    expect(v.sigilCount).toBeLessThanOrEqual(4);
    expect(v.namePips).toBeLessThanOrEqual(4);
  });

  test('the night-scrim compensation lifts the glow but never past the hard ceiling', () => {
    // HouseWorld passes 1 / (1 - room scrim): ~1.075 at dusk, ~1.28 at storm,
    // ~1.37 at shadow. The perceived glow stays roughly phase-invariant.
    const day = getEmbellishmentVisuals(true, false, 0, undefined, 1);
    const shadow = getEmbellishmentVisuals(true, false, 0, undefined, 1 / (1 - 0.27));
    expect(shadow.glowMaxOpacity).toBeGreaterThan(day.glowMaxOpacity);
    expect(shadow.glowMaxOpacity * (1 - 0.27)).toBeCloseTo(day.glowMaxOpacity, 2);
    // Full investment under the deepest scrim stays under the hard cap...
    const full = getEmbellishmentVisuals(true, true, 3, undefined, 1 / (1 - 0.27));
    expect(full.glowMaxOpacity).toBeLessThanOrEqual(GLOW_OPACITY_BOOST_CAP);
    expect(GLOW_OPACITY_BOOST_CAP).toBe(0.85);
    // ...and a nonsense boost (0, negative, NaN, huge) can neither dim nor blow out.
    expect(getEmbellishmentVisuals(true, false, 0, undefined, 0).glowMaxOpacity).toBeCloseTo(0.42);
    expect(getEmbellishmentVisuals(true, false, 0, undefined, Number.NaN).glowMaxOpacity).toBeCloseTo(0.42);
    expect(getEmbellishmentVisuals(true, true, 3, undefined, 99).glowMaxOpacity).toBeLessThanOrEqual(GLOW_OPACITY_BOOST_CAP);
  });

  test('an explicitly passed intensity drives the glow (prop parity)', () => {
    const low = getEmbellishmentVisuals(true, false, 0, 0.25);
    const high = getEmbellishmentVisuals(true, false, 0, 1);
    expect(high.glowMaxOpacity).toBeGreaterThan(low.glowMaxOpacity);
  });
});

describe('the promised object (decoration props)', () => {
  test('every room has its own tier-1 and tier-2 art, so the shop copy is honest', () => {
    for (const room of ROOMS) {
      expect(getRoomUpgradeArt(room.id, 1)).not.toBeNull();
      expect(getRoomUpgradeArt(room.id, 2)).not.toBeNull();
    }
  });

  test('an unknown room gets no art, never the parcel placeholder', () => {
    expect(getRoomUpgradeArt('not_a_room', 1)).toBeNull();
    expect(getRoomUpgradeArt('not_a_room', 2)).toBeNull();
  });

  test('every room has a primary and a secondary anchor on the right half of the room', () => {
    // The occupant's tag hangs bottom-LEFT (animalPlate: left 6, maxWidth
    // 62%) and the sigils cluster on the left wall, so the objects live on
    // the right: `right` insets keep every 32dp piece inside x >= 250 * 0.5.
    const ROOM_W = 250;
    for (const room of ROOMS) {
      expect(ROOM_PROP_ANCHORS[room.id]).toBeDefined();
      for (const tier of [1, 2] as const) {
        const a = getRoomPropAnchor(room.id, tier);
        expect(a.right).toBeGreaterThanOrEqual(8);
        expect(ROOM_W - a.right - ROOM_PROP_SIZE).toBeGreaterThanOrEqual(ROOM_W / 2);
        // Exactly one vertical anchor, and it keeps the piece inside a 123dp room.
        expect((a.top !== undefined ? 1 : 0) + (a.bottom !== undefined ? 1 : 0)).toBe(1);
        const edge = a.top ?? a.bottom ?? 0;
        expect(edge + ROOM_PROP_SIZE).toBeLessThanOrEqual(123);
        // A hung piece clears the centred room sign (top 4, ~29dp tall).
        if (a.top !== undefined) expect(a.top).toBeGreaterThanOrEqual(22);
      }
      // The pair composes: the second piece sits inboard, never on the first.
      const p = getRoomPropAnchor(room.id, 1);
      const q = getRoomPropAnchor(room.id, 2);
      const overlapX = Math.abs(p.right - q.right) < ROOM_PROP_SIZE;
      const pTop = p.top ?? 123 - (p.bottom ?? 0) - ROOM_PROP_SIZE;
      const qTop = q.top ?? 123 - (q.bottom ?? 0) - ROOM_PROP_SIZE;
      const overlapY = Math.abs(pTop - qTop) < ROOM_PROP_SIZE;
      expect(overlapX && overlapY).toBe(false);
    }
  });

  test('a room without an anchor entry falls back to the floor band', () => {
    const a = getRoomPropAnchor('not_a_room', 1);
    expect(a.bottom).toBeDefined();
    expect(a.right).toBeGreaterThan(0);
  });
});

describe('getSigilColors (phase register)', () => {
  test('dusk phases lean lavender', () => {
    expect(getSigilColors(2).line).toBe('#9B7FCF');
    // Cycle-2 (NG+) bright phases read the same lavender
    expect(getSigilColors(0)).toEqual(getSigilColors(2));
  });

  test('growing shadows (3+) lean crimson', () => {
    expect(getSigilColors(3).glow).toBe('#8B2252');
    expect(getSigilColors(4).glow).toBe('#8B2252');
  });

  test('terrible peace (5) is serene mauve, not crimson', () => {
    const c = getSigilColors(5);
    expect(c.glow).toBe('#6B5B8A');
    expect(c.glow).not.toBe(getSigilColors(4).glow);
  });
});

describe('RoomView source pins', () => {
  test('the lone ✦ upgrade glyph is gone (replaced by procedural pips)', () => {
    expect(ROOM_VIEW_SRC).not.toContain('✦');
    expect(ROOM_VIEW_SRC).toMatch(/pipRow/);
  });

  test('embellishment layers are non-interactive and hidden from a11y', () => {
    expect(ROOM_VIEW_SRC).toMatch(/styles\.embellishOverlay/);
    expect(ROOM_VIEW_SRC).toMatch(/pointerEvents="none"/);
    expect(ROOM_VIEW_SRC).toMatch(/importantForAccessibility="no-hide-descendants"/);
  });

  test('embellishment animation is native-driver and motion-gated', () => {
    // Every animation in the new layers declares useNativeDriver: true,
    // and the motion gate reads both reduced motion and device tier.
    expect(ROOM_VIEW_SRC).toMatch(/getSettingsSync\(\)\.reducedMotion && !shouldSimplifyAnimations\(\)/);
    expect(ROOM_VIEW_SRC).not.toMatch(/useNativeDriver: false/);
  });

  test('the visible-investment floors: bigger ovals, a 0.75 breath, 6dp rimmed pips, 30dp sigils, 5dp motes', () => {
    const style = (name: string) => {
      const at = ROOM_VIEW_SRC.indexOf(`  ${name}: {`);
      expect(at).toBeGreaterThan(-1);
      return ROOM_VIEW_SRC.slice(at, ROOM_VIEW_SRC.indexOf('},', at));
    };
    expect(style('glowCore')).toMatch(/width: 64,\s*height: 34/);
    expect(style('glowMid')).toMatch(/width: 100,\s*height: 52/);
    expect(ROOM_VIEW_SRC).toMatch(/outputRange: \[0\.75, 1\]/);
    expect(style('pip')).toMatch(/width: 6,\s*height: 6/);
    expect(style('pip')).toMatch(/borderWidth: 1/);
    expect(style('sigilBox')).toMatch(/width: 30,\s*height: 30,\s*opacity: 0\.85/);
    expect(style('sigilCrispLeft')).toMatch(/width: 3/);
    expect(style('dustMote')).toMatch(/width: 5,\s*height: 5/);
    expect(ROOM_VIEW_SRC).toMatch(/outputRange: \[0, 0\.6, 0\.45, 0\]/);
  });

  test('six motes, mounted ONLY at full attunement and only with motion on', () => {
    const block = ROOM_VIEW_SRC.slice(
      ROOM_VIEW_SRC.indexOf('{embellish.showMotes && embellishMotion && ('),
      ROOM_VIEW_SRC.indexOf('Shop handoff: flare'),
    );
    expect((block.match(/<DustMote /g) ?? []).length).toBe(6);
  });

  test('the drawn object: shop art, a View contact shadow (no shadowRadius), a settle spring', () => {
    const prop = ROOM_VIEW_SRC.slice(
      ROOM_VIEW_SRC.indexOf('const RoomProp: React.FC'),
      ROOM_VIEW_SRC.indexOf('export const FOCUS_FLARE_MS'),
    );
    expect(prop).toMatch(/Animated\.spring\(settle/);
    expect(prop).toMatch(/useNativeDriver: true/);
    expect(prop).not.toMatch(/shadowRadius/);
    expect(prop).toMatch(/styles\.roomPropShadow/);
    // Once per session: keyed on a module-scope set, pinned to rest otherwise.
    expect(prop).toMatch(/settledRoomProps\.has\(settleKey\)/);
    expect(prop).toMatch(/settledRoomProps\.add\(settleKey\)/);
    // Both pieces render inside the non-interactive overlay from the shop art.
    expect(ROOM_VIEW_SRC).toMatch(/getRoomUpgradeArt\(room\.id, 1\)/);
    expect(ROOM_VIEW_SRC).toMatch(/getRoomUpgradeArt\(room\.id, 2\)/);
  });

  test('the focus flare is native-driven and instant under reduced motion', () => {
    const flare = ROOM_VIEW_SRC.slice(
      ROOM_VIEW_SRC.indexOf('const FocusFlare: React.FC'),
      ROOM_VIEW_SRC.indexOf('interface RoomViewProps'),
    );
    expect(flare).toMatch(/if \(!animate\) \{\s*flare\.setValue\(1\);/);
    expect(flare).toMatch(/useNativeDriver: true/);
    expect(flare).not.toMatch(/useNativeDriver: false/);
    expect(ROOM_VIEW_SRC).toMatch(/\{isFocusTarget && <FocusFlare/);
  });
});

describe('HouseWorld focus-room handoff (source pins)', () => {
  test('the focus pan is a visit: springs natively, never notifies the saved pan', () => {
    const block = HOUSE_WORLD_SRC.slice(
      HOUSE_WORLD_SRC.indexOf('// ─── Focus-room handoff'),
      HOUSE_WORLD_SRC.indexOf('// Preserve the current viewport'),
    );
    expect(block.length).toBeGreaterThan(200);
    expect(block).toMatch(/Animated\.spring\(panRaw/);
    expect(block).toMatch(/useNativeDriver: true/);
    expect(block).not.toMatch(/onPanYChange/);
    expect(block).toMatch(/syncPanPosition\(panY, false\)/);
    // Reduced motion / low tier lands instantly.
    expect(block).toMatch(/if \(!panPhysicsEnabled\)/);
    // Never under a live finger.
    expect(block).toMatch(/if \(!isPanningRef\.current\)/);
    // Consumed on a timer the owner can rely on.
    expect(block).toMatch(/onFocusRoomConsumedRef\.current\?\.\(\)/);
  });

  test('a real pan takes the scene back from the focus hold', () => {
    const active = HOUSE_WORLD_SRC.slice(
      HOUSE_WORLD_SRC.indexOf('if (state === State.ACTIVE) {'),
      HOUSE_WORLD_SRC.indexOf('// Every terminal state releases'),
    );
    expect(active).toMatch(/focusHoldRef\.current = null/);
  });

  test('the night scrim compensation is derived from the SAME tint table the scrim uses', () => {
    expect(HOUSE_WORLD_SRC).toMatch(/const glowScrimBoost = houseTint\.room >= 1 \? 1 : 1 \/ \(1 - houseTint\.room\)/);
    expect(HOUSE_WORLD_SRC).toMatch(/glowScrimBoost=\{glowScrimBoost\}/);
    expect(HOUSE_WORLD_SRC).toMatch(/isFocusTarget=\{focusRoomId === room\.id\}/);
  });
});

// ---------------------------------------------------------------------------
// 2. Procedural gait
// ---------------------------------------------------------------------------

describe('procedural gait profile', () => {
  const SPECIES: AnimalType[] = [
    'pangolin', 'owl', 'axolotl', 'capybara', 'fennec_fox', 'sloth', 'wombat',
    'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
  ];

  test('period derives from species movement speed (fast patter, slow trudge)', () => {
    expect(getGaitPeriodMs('rabbit')).toBeLessThan(getGaitPeriodMs('capybara'));
    expect(getGaitPeriodMs('fennec_fox')).toBeLessThan(getGaitPeriodMs('sloth'));
  });

  test('period stays within sane animation bounds for every species', () => {
    for (const type of SPECIES) {
      const period = getGaitPeriodMs(type);
      expect(period).toBeGreaterThanOrEqual(300);
      expect(period).toBeLessThanOrEqual(1400);
    }
  });

  test('bob amplitude is the spec 2-3px band for every species', () => {
    for (const type of SPECIES) {
      const bob = getGaitBobPx(type);
      expect(bob).toBeGreaterThanOrEqual(2);
      expect(bob).toBeLessThanOrEqual(3);
    }
  });

  test('lean is slight (±2.5deg)', () => {
    expect(GAIT_LEAN_DEG).toBe(2.5);
  });

  test('gait respects the reverence/motion gates in source', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/home/AnimalSprite.tsx'),
      'utf8'
    );
    // Robed Phase-4+ figures glide (no gait), real-frame walkers keep frames,
    // and reduced motion / low tier keep the static sprite.
    expect(src).toMatch(/!hasWalkFrames &&\s*\n\s*currentPhase < 4/);
    expect(src).not.toMatch(/useNativeDriver: false/);
  });
});

// ---------------------------------------------------------------------------
// 3. Android-safe Arrangement sigil glow
// ---------------------------------------------------------------------------

describe('ArrangementConnector Android-safe glow', () => {
  // The arrangementStyles block, isolated so unrelated shadow usage elsewhere
  // in HouseWorld can't mask a regression here.
  const block = HOUSE_WORLD_SRC.slice(
    HOUSE_WORLD_SRC.indexOf('const ArrangementConnector'),
    HOUSE_WORLD_SRC.indexOf('// ═', HOUSE_WORLD_SRC.indexOf('const arrangementStyles'))
  );

  test('glow is layered Views, not shadowColor/shadowRadius', () => {
    expect(block.length).toBeGreaterThan(100); // slice sanity
    expect(block).not.toMatch(/shadowColor/);
    expect(block).not.toMatch(/shadowRadius/);
    expect(block).toMatch(/glowLayer/);
    expect(block).toMatch(/nodeHalo/);
  });

  test('glow pulse is native-driven and motion/tier gated', () => {
    expect(block).toMatch(/useNativeDriver: true/);
    expect(block).not.toMatch(/useNativeDriver: false/);
    expect(block).toMatch(/reducedMotion/);
    expect(block).toMatch(/shouldSimplifyAnimations\(\)/);
  });

  test('tending-intensity scaling is preserved', () => {
    expect(block).toMatch(/0\.3 \+ t \* 0\.5/); // lineOpacity ramp
    expect(block).toMatch(/1\.5 \+ t \* 2\.5/); // lineWidth ramp
    expect(block).toMatch(/t > 0\.25/);         // nodes
    expect(block).toMatch(/t > 0\.4/);          // glow
  });

  test('connector height stays 10 (skyGeometry seat math contract)', () => {
    expect(block).toMatch(/connector: \{\s*\n\s*height: 10,/);
  });
});

// ---------------------------------------------------------------------------
// 4. Phase-2 dialogue chrome softening
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('phase-2 dialogue chrome (two-step descent, not a cliff)', () => {
  const p1 = getDialogueTheme(1);
  const p2 = getDialogueTheme(2);
  const p3 = getDialogueTheme(3);

  test('phase 2 is a mid step between phase 1 warm white and phase 3 dark', () => {
    expect(luminance(p1.modalBg)).toBeGreaterThan(luminance(p2.modalBg));
    expect(luminance(p2.modalBg)).toBeGreaterThan(luminance(p3.modalBg));
    // Meaningfully lighter than the old near-black #1A1A2E cliff (≈0.0116)
    expect(luminance(p2.modalBg)).toBeGreaterThan(luminance('#1A1A2E') * 2);
    // ...but still clearly a darkening step from phase 1 (not another light theme)
    expect(luminance(p2.modalBg)).toBeLessThan(luminance(p1.modalBg) / 4);
  });

  test('the sprite alcove softens on the same ladder', () => {
    expect(luminance(p1.spriteBg)).toBeGreaterThan(luminance(p2.spriteBg));
    expect(luminance(p2.spriteBg)).toBeGreaterThan(luminance(p3.spriteBg));
  });

  test('phases 0-1 and 3+ are untouched (pinned)', () => {
    expect(getDialogueTheme(0).modalBg).toBe('#FFFFFF');
    expect(p1.modalBg).toBe('#FEFCF8');
    expect(p3.modalBg).toBe('#0E0E1A');
    expect(getDialogueTheme(4).modalBg).toBe('#0A0810');
    expect(getDialogueTheme(5).modalBg).toBe('#100E18');
  });

  test('phase-2 inks hold WCAG AA (>=4.5:1) on their own surfaces', () => {
    expect(contrast(p2.textColor, p2.bubbleBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p2.textColor, p2.modalBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p2.subtitleColor, p2.bubbleBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p2.secondaryButtonText, p2.secondaryButtonBg)).toBeGreaterThanOrEqual(4.5);
  });

  test('phase-2 nameplate ink reads on its REAL host: the hostDark storm parchment', () => {
    // At phase 2 the dialogue nameplate renders on getPixelSkin(2, true).fill
    // (the storm skin parchment), not on modalBg. The old light #A898C8
    // measured ~1.3:1 there.
    expect(contrast(p2.nameColor, PIXEL_SKINS.storm.fill)).toBeGreaterThanOrEqual(4.5);
  });

  test('white cooldown-toast text reads on the phase-2 toast', () => {
    // cooldownBg is rgba(96, 74, 128, 0.95) — check against the solid base.
    expect(contrast('#FFFFFF', '#604A80')).toBeGreaterThanOrEqual(4.5);
    expect(p2.cooldownBg).toContain('96, 74, 128');
  });
});
