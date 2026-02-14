import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadWhisperGallery,
  recordWhisper,
  getEntriesForAnimal,
  getGroupedEntries,
  getGalleryStats,
  getGalleryTitle,
  getGallerySubtitle,
  clearWhisperGallery,
  WhisperEntry,
} from '../services/whisperGallery';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('whisperGallery', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearWhisperGallery();
  });

  // ===========================================================================
  // loadWhisperGallery
  // ===========================================================================

  describe('loadWhisperGallery', () => {
    it('returns empty default state on first load', async () => {
      const state = await loadWhisperGallery();
      expect(state.entries).toEqual([]);
      expect(state.seenIds).toEqual([]);
      expect(state.totalCollected).toBe(0);
    });

    it('returns cached state on subsequent calls', async () => {
      const state1 = await loadWhisperGallery();
      const state2 = await loadWhisperGallery();
      expect(state1).toBe(state2);
    });

    it('loads from storage after cache clear', async () => {
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'The fire remembers.',
        phase: 3,
        type: 'whisper',
      });
      await clearWhisperGallery();

      // Manually set storage with data
      const customState = {
        entries: [
          { id: 'wg_test', animalType: 'owl', animalName: 'Archimedes', text: 'Books.', phase: 1, type: 'dialogue', timestamp: 1000 },
        ],
        seenIds: ['wg_test'],
        totalCollected: 1,
      };
      await AsyncStorage.setItem('wordshift_whisper_gallery', JSON.stringify(customState));

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(1);
      expect(state.entries[0].animalType).toBe('owl');
    });
  });

  // ===========================================================================
  // recordWhisper
  // ===========================================================================

  describe('recordWhisper', () => {
    it('records a new whisper entry', async () => {
      const result = await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'The fire knows.',
        phase: 2,
        type: 'whisper',
      });
      expect(result).toBe(true);
      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(1);
      expect(state.entries[0].text).toBe('The fire knows.');
    });

    it('deduplicates entries with the same content', async () => {
      const entry = {
        animalType: 'fox',
        animalName: 'Ember',
        text: 'The fire knows.',
        phase: 2,
        type: 'whisper' as const,
      };

      const first = await recordWhisper(entry);
      const second = await recordWhisper(entry);

      expect(first).toBe(true);
      expect(second).toBe(false);

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(1);
    });

    it('allows different text from the same animal', async () => {
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Line one.',
        phase: 0,
        type: 'whisper',
      });
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Line two.',
        phase: 0,
        type: 'whisper',
      });

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(2);
    });

    it('allows same text from different animals', async () => {
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Hello.',
        phase: 0,
        type: 'whisper',
      });
      await recordWhisper({
        animalType: 'owl',
        animalName: 'Archimedes',
        text: 'Hello.',
        phase: 0,
        type: 'whisper',
      });

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(2);
    });

    it('allows same text with different types', async () => {
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Same text.',
        phase: 0,
        type: 'whisper',
      });
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Same text.',
        phase: 0,
        type: 'dialogue',
      });

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(2);
    });

    it('records entries with correct fields', async () => {
      await recordWhisper({
        animalType: 'pangolin',
        animalName: 'Panko',
        text: 'The recipe changed.',
        phase: 3,
        type: 'trigger_reaction',
      });

      const state = await loadWhisperGallery();
      const entry = state.entries[0];
      expect(entry.animalType).toBe('pangolin');
      expect(entry.animalName).toBe('Panko');
      expect(entry.text).toBe('The recipe changed.');
      expect(entry.phase).toBe(3);
      expect(entry.type).toBe('trigger_reaction');
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('updates totalCollected', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'One.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'owl', animalName: 'Archimedes', text: 'Two.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'rabbit', animalName: 'Thyme', text: 'Three.', phase: 0, type: 'whisper' });

      const state = await loadWhisperGallery();
      expect(state.totalCollected).toBe(3);
    });

    it('caps entries at 500 keeping the most recent', async () => {
      // Add 510 unique entries
      for (let i = 0; i < 510; i++) {
        await recordWhisper({
          animalType: 'fox',
          animalName: 'Ember',
          text: `Entry number ${i}`,
          phase: 0,
          type: 'whisper',
        });
      }

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(500);
      // Should keep the most recent (entries 10-509)
      expect(state.entries[0].text).toBe('Entry number 10');
      expect(state.entries[499].text).toBe('Entry number 509');
    });

    it('updates seenIds after capping', async () => {
      for (let i = 0; i < 505; i++) {
        await recordWhisper({
          animalType: 'fox',
          animalName: 'Ember',
          text: `Cap test ${i}`,
          phase: 0,
          type: 'whisper',
        });
      }

      const state = await loadWhisperGallery();
      expect(state.seenIds.length).toBe(500);
    });

    it('persists to storage', async () => {
      await recordWhisper({
        animalType: 'fox',
        animalName: 'Ember',
        text: 'Persisted.',
        phase: 1,
        type: 'dialogue',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('supports all entry types', async () => {
      const types: WhisperEntry['type'][] = ['whisper', 'dialogue', 'cross_reference', 'interjection', 'trigger_reaction'];
      for (const type of types) {
        const result = await recordWhisper({
          animalType: 'fox',
          animalName: 'Ember',
          text: `Type: ${type}`,
          phase: 0,
          type,
        });
        expect(result).toBe(true);
      }

      const state = await loadWhisperGallery();
      expect(state.entries.length).toBe(5);
    });
  });

  // ===========================================================================
  // getEntriesForAnimal
  // ===========================================================================

  describe('getEntriesForAnimal', () => {
    it('returns only entries for specified animal', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'Fox line.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'owl', animalName: 'Archimedes', text: 'Owl line.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'Fox line 2.', phase: 1, type: 'dialogue' });

      const foxEntries = await getEntriesForAnimal('fox');
      expect(foxEntries.length).toBe(2);
      expect(foxEntries.every(e => e.animalType === 'fox')).toBe(true);
    });

    it('returns empty array for animal with no entries', async () => {
      const entries = await getEntriesForAnimal('capybara');
      expect(entries).toEqual([]);
    });

    it('sorts by phase then timestamp', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'Phase 2.', phase: 2, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'Phase 0.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'Phase 1.', phase: 1, type: 'whisper' });

      const entries = await getEntriesForAnimal('fox');
      expect(entries[0].phase).toBe(0);
      expect(entries[1].phase).toBe(1);
      expect(entries[2].phase).toBe(2);
    });
  });

  // ===========================================================================
  // getGroupedEntries
  // ===========================================================================

  describe('getGroupedEntries', () => {
    it('groups entries by animal type', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'owl', animalName: 'Archimedes', text: 'B.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'C.', phase: 1, type: 'whisper' });
      await recordWhisper({ animalType: 'rabbit', animalName: 'Thyme', text: 'D.', phase: 0, type: 'whisper' });

      const grouped = await getGroupedEntries();
      expect(Object.keys(grouped).sort()).toEqual(['fox', 'owl', 'rabbit']);
      expect(grouped.fox.length).toBe(2);
      expect(grouped.owl.length).toBe(1);
      expect(grouped.rabbit.length).toBe(1);
    });

    it('returns empty object when no entries', async () => {
      const grouped = await getGroupedEntries();
      expect(grouped).toEqual({});
    });

    it('entries within each group are sorted by phase', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'P3.', phase: 3, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'P1.', phase: 1, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'P0.', phase: 0, type: 'whisper' });

      const grouped = await getGroupedEntries();
      expect(grouped.fox[0].phase).toBe(0);
      expect(grouped.fox[1].phase).toBe(1);
      expect(grouped.fox[2].phase).toBe(3);
    });
  });

  // ===========================================================================
  // getGalleryStats
  // ===========================================================================

  describe('getGalleryStats', () => {
    it('returns zeros for empty gallery', async () => {
      const stats = await getGalleryStats();
      expect(stats.totalCollected).toBe(0);
      expect(stats.byAnimal).toEqual({});
      expect(stats.byPhase).toEqual({});
      expect(stats.byType).toEqual({});
    });

    it('counts by animal correctly', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'B.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'owl', animalName: 'Archimedes', text: 'C.', phase: 0, type: 'whisper' });

      const stats = await getGalleryStats();
      expect(stats.byAnimal.fox).toBe(2);
      expect(stats.byAnimal.owl).toBe(1);
    });

    it('counts by phase correctly', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'B.', phase: 2, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'C.', phase: 2, type: 'whisper' });

      const stats = await getGalleryStats();
      expect(stats.byPhase[0]).toBe(1);
      expect(stats.byPhase[2]).toBe(2);
    });

    it('counts by type correctly', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'B.', phase: 0, type: 'dialogue' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'C.', phase: 0, type: 'dialogue' });
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'D.', phase: 0, type: 'interjection' });

      const stats = await getGalleryStats();
      expect(stats.byType.whisper).toBe(1);
      expect(stats.byType.dialogue).toBe(2);
      expect(stats.byType.interjection).toBe(1);
    });

    it('totalCollected matches entry count', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await recordWhisper({ animalType: 'owl', animalName: 'Archimedes', text: 'B.', phase: 0, type: 'whisper' });

      const stats = await getGalleryStats();
      expect(stats.totalCollected).toBe(2);
    });
  });

  // ===========================================================================
  // getGalleryTitle
  // ===========================================================================

  describe('getGalleryTitle', () => {
    it('returns "Whisper Gallery" for phase 0', () => {
      expect(getGalleryTitle(0)).toBe('Whisper Gallery');
    });

    it('returns "Whisper Gallery" for phase 1', () => {
      expect(getGalleryTitle(1)).toBe('Whisper Gallery');
    });

    it('returns "The Echoes" for phase 2', () => {
      expect(getGalleryTitle(2)).toBe('The Echoes');
    });

    it('returns "Voices in the Walls" for phase 3', () => {
      expect(getGalleryTitle(3)).toBe('Voices in the Walls');
    });

    it('returns "The Archive" for phase 4', () => {
      expect(getGalleryTitle(4)).toBe('The Archive');
    });

    it('returns "The Archive" for phase 5+', () => {
      expect(getGalleryTitle(5)).toBe('The Archive');
    });
  });

  // ===========================================================================
  // getGallerySubtitle
  // ===========================================================================

  describe('getGallerySubtitle', () => {
    it('returns moments collected at phase 0', () => {
      expect(getGallerySubtitle(0, 10)).toBe('10 moments collected');
    });

    it('returns moments collected at phase 1', () => {
      expect(getGallerySubtitle(1, 25)).toBe('25 moments collected');
    });

    it('returns echoes recorded at phase 2', () => {
      expect(getGallerySubtitle(2, 50)).toBe('50 echoes recorded');
    });

    it('returns voices preserved at phase 3', () => {
      expect(getGallerySubtitle(3, 100)).toBe('100 voices preserved');
    });

    it('returns fragments at phase 4', () => {
      expect(getGallerySubtitle(4, 200)).toBe('200 fragments of the arrangement');
    });

    it('includes correct count', () => {
      expect(getGallerySubtitle(0, 0)).toBe('0 moments collected');
      expect(getGallerySubtitle(0, 1)).toBe('1 moments collected');
      expect(getGallerySubtitle(0, 999)).toBe('999 moments collected');
    });
  });

  // ===========================================================================
  // clearWhisperGallery
  // ===========================================================================

  describe('clearWhisperGallery', () => {
    it('resets gallery to empty state', async () => {
      await recordWhisper({ animalType: 'fox', animalName: 'Ember', text: 'A.', phase: 0, type: 'whisper' });
      await clearWhisperGallery();

      const state = await loadWhisperGallery();
      expect(state.entries).toEqual([]);
      expect(state.totalCollected).toBe(0);
    });

    it('allows recording same entry after clear', async () => {
      const entry = { animalType: 'fox', animalName: 'Ember', text: 'Test.', phase: 0, type: 'whisper' as const };
      await recordWhisper(entry);
      await clearWhisperGallery();
      const result = await recordWhisper(entry);
      expect(result).toBe(true);
    });

    it('calls AsyncStorage.removeItem', async () => {
      await clearWhisperGallery();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_whisper_gallery');
    });
  });
});
