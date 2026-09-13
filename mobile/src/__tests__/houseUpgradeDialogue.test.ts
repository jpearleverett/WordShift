import { DialoguePhase } from '../types/homeWorld';
import { ANIMALS, ROOMS } from '../services/homeWorldData';
import {
  ATTUNEMENT_LEVEL_NAMES,
  HouseUpgradePurchase,
  ROOM_UPGRADES,
  getRoomDeepening,
} from '../services/roomUpgrades';
import {
  getHouseUpgradeGiftDialogue,
  getHouseUpgradeGiftName,
} from '../services/dialogue/houseUpgradeDialogue';

const phases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];
const offersForRoom = (roomId: string): HouseUpgradePurchase[] => [
  { roomId, tier: 1 },
  { roomId, tier: 2 },
  { roomId, tier: 3, level: 1 },
  { roomId, tier: 3, level: 2 },
  { roomId, tier: 3, level: 3 },
];
const spoken = (offer: HouseUpgradePurchase, phase: DialoguePhase) =>
  getHouseUpgradeGiftDialogue(offer, phase).join(' ');

describe('house upgrade gift manuscript', () => {
  test.each(ROOM_UPGRADES)('$roomId has a named, distinct handover for all five purchases', upgrade => {
    const offers = offersForRoom(upgrade.roomId);
    const names = offers.map(getHouseUpgradeGiftName);
    expect(names[0]).toBe(upgrade.name);
    expect(names[1]).toBe(getRoomDeepening(upgrade.roomId)!.name);
    expect(names.slice(2)).toEqual(ATTUNEMENT_LEVEL_NAMES.map(level =>
      `${ROOMS.find(room => room.id === upgrade.roomId)!.name}: ${level}`));
    expect(new Set(names).size).toBe(5);

    for (const phase of phases) {
      const receipts = offers.map(offer => getHouseUpgradeGiftDialogue(offer, phase));
      expect(new Set(receipts.map(lines => lines[0])).size).toBe(5);
      for (const lines of receipts) {
        expect(lines.length).toBeGreaterThanOrEqual(2);
        for (const line of lines) {
          expect(line.trim().length).toBeGreaterThan(30);
          expect(line).not.toMatch(/undefined|\{(?:word|name|room|level)\}|TODO/);
        }
      }
    }
  });

  test.each(ROOM_UPGRADES)('$roomId responds to the current house across each playable purchase phase', upgrade => {
    for (const offer of offersForRoom(upgrade.roomId)) {
      const versions = [2, 3, 4, 5].map(phase => spoken(offer, phase as DialoguePhase));
      expect(new Set(versions).size).toBe(4);
      // A pending gift delivered after Arrival must not retain an approach
      // prediction or claim a uniformly happy ending for the resident.
      expect(versions[3]).not.toMatch(/(?:something|it|the presence) (?:is coming|will arrive)|nearly ready to speak|soon (?:it|the presence) will|nothing to fear|everything is (?:fine|all right)/i);
      // The revealed register has its own authored receipts, rather than a
      // new ending attached to the early phase's contracted speech.
      for (const phase of [4, 5] as DialoguePhase[]) {
        expect(spoken(offer, phase)).not.toMatch(/\b(?:I'm|I'll|I've|I'd|it's|that's|there's|we're|we've|we'll|isn't|doesn't|don't|can't|won't|didn't|wasn't|hadn't|you've|you'll|you're|I'd|needn't)\b/i);
      }
    }
  });

  test.each(ROOM_UPGRADES)('$roomId can receive a gift without referring to locked residents', upgrade => {
    const otherNames = ANIMALS.filter(animal => animal.roomId !== upgrade.roomId).map(animal => animal.name);
    // Bamboo is also the ordinary name of the plant used in that room, so
    // test proper resident references while permitting sentence-internal plants.
    const otherResident = new RegExp(`\\b(?:${otherNames.join('|')})\\b`);
    for (const offer of offersForRoom(upgrade.roomId)) {
      for (const phase of phases) expect(spoken(offer, phase)).not.toMatch(otherResident);
    }
  });

  test('every resident keeps an individual voice in the aftermath', () => {
    const after = ROOM_UPGRADES.map(upgrade =>
      getHouseUpgradeGiftDialogue({ roomId: upgrade.roomId, tier: 1 }, 5)[1]);
    expect(new Set(after).size).toBe(ROOM_UPGRADES.length);
    expect(spoken({ roomId: 'cozy_den', tier: 1 }, 5)).toMatch(/forgiveness/);
    expect(spoken({ roomId: 'jungle_room', tier: 1 }, 5)).toMatch(/changed my mind/);
    expect(spoken({ roomId: 'garden', tier: 1 }, 5)).toMatch(/feel only one way/);
    expect(spoken({ roomId: 'bamboo_attic', tier: 1 }, 4)).toMatch(/mistook an interpretation for certainty/);
    expect(spoken({ roomId: 'burrow', tier: 1 }, 4)).toMatch(/where my knowledge ends/);
  });

  test('attunements do not imply ownership of the optional deepening', () => {
    // These were tempting callbacks from the shop's attunement prose, but
    // Marginalia and New Constellation need not have been purchased.
    for (const phase of phases) {
      expect(spoken({ roomId: 'study', tier: 3, level: 3 }, phase)).not.toMatch(/marginalia/i);
      expect(spoken({ roomId: 'desert_room', tier: 3, level: 3 }, phase)).not.toMatch(/new constellation/i);
    }
    const first = spoken({ roomId: 'aquarium', tier: 3, level: 1 }, 2);
    const second = spoken({ roomId: 'aquarium', tier: 3, level: 2 }, 2);
    const third = spoken({ roomId: 'aquarium', tier: 3, level: 3 }, 2);
    expect(first).toMatch(/coral light/);
    expect(second).toMatch(/current/);
    expect(third).toMatch(/reflection/);
  });

  test('a queued purchase uses the phase at handover and does not capture a previous reading', () => {
    const pendingGift = { roomId: 'belfry', tier: 2 as const, id: 'saved-gift', purchasedAt: 1 };
    const before = getHouseUpgradeGiftDialogue(pendingGift, 3);
    const after = getHouseUpgradeGiftDialogue(pendingGift, 5);
    expect(after).not.toEqual(before);
    expect(after.join(' ')).toContain('presence has arrived');
    before[0] = 'Presentation changed its local page';
    expect(getHouseUpgradeGiftDialogue(pendingGift, 3)[0]).not.toBe(before[0]);
  });

  test('unknown gifts and malformed levels cannot produce a misleading handover', () => {
    for (const roomId of ['missing_room', '__proto__', 'constructor']) {
      expect(getHouseUpgradeGiftName({ roomId, tier: 1 })).toBe('House upgrade');
      expect(getHouseUpgradeGiftDialogue({ roomId, tier: 1 }, 2)).toEqual([]);
    }
    for (const level of [-1, 0, 4, 1.5, NaN, Infinity]) {
      const invalid = { roomId: 'cozy_den', tier: 3 as const, level };
      expect(getHouseUpgradeGiftName(invalid)).toBe('House upgrade');
      expect(getHouseUpgradeGiftDialogue(invalid, 2)).toEqual([]);
    }
  });
});
