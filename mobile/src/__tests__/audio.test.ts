/**
 * Audio service tests — the audio-overhaul contract:
 *   - soundValidMove(comboTier?) combo ladder: tier 0 = base chime, tiers
 *     1-3 escalate, clamped; bright names below Phase 3, dark names at 3+.
 *   - resolveSfxForPhase: every registered `<name>_dark` swaps in at Phase 3+;
 *     sounds without a dark variant keep their base name at every phase.
 *   - Ambient music: startMusicForPhase picks bright/dusk/dark by phase,
 *     loops, crossfades on switch, is gated by musicEnabled (NOT soundEnabled),
 *     and stopMusic releases the player.
 *
 * All sound assets resolve to the same fileMock in Jest, so playback routing
 *  is asserted through the exported pure resolvers + player lifecycle.
 */
import {
  setAudioPhase,
  resolveSfxForPhase,
  validMoveSoundName,
  soundValidMove,
  soundTap,
  musicTrackForPhase,
  musicTrackForContext,
  startMusicForPhase,
  startMusicForScreen,
  stopMusic,
  getActiveMusicTrack,
  unloadAllSounds,
} from '../services/audio';
import { resetSettings, updateSetting } from '../services/settings';

jest.mock('expo-audio', () => {
  const mockPlayers: any[] = [];
  return {
    __esModule: true,
    createAudioPlayer: jest.fn((source: any) => {
      const player: any = {
        source,
        volume: 1,
        loop: false,
        playing: false,
        seekTo: jest.fn(async () => {}),
        remove: jest.fn(),
      };
      player.play = jest.fn(() => {
        player.playing = true;
      });
      mockPlayers.push(player);
      return player;
    }),
    setAudioModeAsync: jest.fn(async () => {}),
    __getMockPlayers: () => mockPlayers,
  };
});

const expoAudio = require('expo-audio');
const getPlayers = (): any[] => expoAudio.__getMockPlayers();

describe('audio', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await resetSettings();
    setAudioPhase(0);
    await stopMusic();
    await unloadAllSounds();
    getPlayers().length = 0;
    (expoAudio.createAudioPlayer as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('combo ladder (validMoveSoundName)', () => {
    test('tier 0 is the base chime (default call sites unchanged)', () => {
      expect(validMoveSoundName(0, 0)).toBe('valid_move');
    });

    test('tiers 1-3 climb the bright ladder', () => {
      expect(validMoveSoundName(1, 0)).toBe('valid_move_2');
      expect(validMoveSoundName(2, 0)).toBe('valid_move_3');
      expect(validMoveSoundName(3, 0)).toBe('valid_move_4');
    });

    test('clamps out-of-range and non-integer tiers', () => {
      expect(validMoveSoundName(99, 0)).toBe('valid_move_4');
      expect(validMoveSoundName(-5, 0)).toBe('valid_move');
      expect(validMoveSoundName(2.7, 0)).toBe('valid_move_3');
      expect(validMoveSoundName(NaN, 0)).toBe('valid_move');
    });

    test('the dark ladder takes over at Phase 3+ (sinking, not celebrating)', () => {
      expect(validMoveSoundName(0, 3)).toBe('valid_move_dark');
      expect(validMoveSoundName(1, 3)).toBe('valid_move_2_dark');
      expect(validMoveSoundName(2, 4)).toBe('valid_move_3_dark');
      expect(validMoveSoundName(3, 5)).toBe('valid_move_4_dark');
    });

    test('stays bright through Phase 2', () => {
      expect(validMoveSoundName(3, 2)).toBe('valid_move_4');
    });
  });

  describe('dark variant resolution (resolveSfxForPhase)', () => {
    const withDark = [
      'tap',
      'letter_select',
      'invalid_move',
      'undo',
      'hint',
      'amber_earn',
      'dialogue',
      'victory',
      'perfect',
      'pit_devour',
    ];

    test.each(withDark)('%s swaps to its dark variant at Phase 3+', (name) => {
      expect(resolveSfxForPhase(name, 3)).toBe(`${name}_dark`);
      expect(resolveSfxForPhase(name, 5)).toBe(`${name}_dark`);
    });

    test.each(withDark)('%s stays bright below Phase 3', (name) => {
      expect(resolveSfxForPhase(name, 0)).toBe(name);
      expect(resolveSfxForPhase(name, 2)).toBe(name);
    });

    test('sounds without a registered dark variant keep their base name', () => {
      // glitch/whisper/arrival are horror cues with no dark mirror — always
      // their base name; daily_ready is already the dark end of the palette.
      // (achievement/unlock DO have dark mirrors now — covered above.)
      for (const name of ['daily_ready', 'glitch', 'whisper', 'arrival']) {
        expect(resolveSfxForPhase(name, 4)).toBe(name);
      }
    });

    test('the ceremony swell bands on its TARGET phase, never audioPhase', () => {
      // phase_change now has a registered dark twin, but soundPhaseChange
      // selects it explicitly by the ceremony's target phase — the swell
      // fires BEFORE confirmPhaseTransition, so resolving by audioPhase
      // would band the ignition INTO Growing Shadows bright.
      expect(resolveSfxForPhase('phase_change', 4)).toBe('phase_change_dark');
      expect(resolveSfxForPhase('phase_change', 2)).toBe('phase_change');
      const src = require('fs').readFileSync(
        require('path').resolve(__dirname, '../services/audio.ts'), 'utf8'
      );
      expect(src).toMatch(/soundPhaseChange\(targetPhase\?: number\)/);
      expect(src).toMatch(/phase >= 3 \? 'phase_change_dark' : 'phase_change'/);
    });

    test('achievement and unlock swap to their dark variants at Phase 3+', () => {
      expect(resolveSfxForPhase('achievement', 4)).toBe('achievement_dark');
      expect(resolveSfxForPhase('unlock', 3)).toBe('unlock_dark');
      expect(resolveSfxForPhase('achievement', 2)).toBe('achievement');
      expect(resolveSfxForPhase('unlock', 1)).toBe('unlock');
    });
  });

  describe('SFX playback gating', () => {
    test('soundValidMove plays through a created player when sound is enabled', async () => {
      await soundValidMove();
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
      const player = getPlayers()[0];
      expect(player.seekTo).toHaveBeenCalledWith(0);
      expect(player.play).toHaveBeenCalled();
    });

    test('soundValidMove accepts a combo tier without error', async () => {
      await soundValidMove(2);
      expect(getPlayers()[0]?.play).toHaveBeenCalled();
    });

    test('soundEnabled=false silences SFX', async () => {
      await updateSetting('soundEnabled', false);
      await soundValidMove();
      await soundTap();
      expect(expoAudio.createAudioPlayer).not.toHaveBeenCalled();
    });
  });

  describe('ambient music', () => {
    test('musicTrackForPhase maps the descent: bright 0-1, dusk 2, dark 3-4, peace 5', () => {
      expect(musicTrackForPhase(0)).toBe('music_bright');
      expect(musicTrackForPhase(1)).toBe('music_bright');
      expect(musicTrackForPhase(2)).toBe('music_dusk');
      expect(musicTrackForPhase(3)).toBe('music_dark');
      expect(musicTrackForPhase(4)).toBe('music_dark');
      // Post-revelation resolves to the "terrible peace" bed.
      expect(musicTrackForPhase(5)).toBe('music_peace');
    });

    test('musicTrackForContext picks the screen family and keeps the phase band', () => {
      // Home = the bare world beds (also the default for menu screens).
      expect(musicTrackForContext('home', 0)).toBe('music_bright');
      expect(musicTrackForContext('home', 2)).toBe('music_dusk');
      expect(musicTrackForContext('home', 4)).toBe('music_dark');
      // Puzzle family darkens with the same descent.
      expect(musicTrackForContext('puzzle', 1)).toBe('music_puzzle_bright');
      expect(musicTrackForContext('puzzle', 2)).toBe('music_puzzle_dusk');
      expect(musicTrackForContext('puzzle', 3)).toBe('music_puzzle_dark');
      // Pit family too.
      expect(musicTrackForContext('pit', 0)).toBe('music_pit_bright');
      expect(musicTrackForContext('pit', 2)).toBe('music_pit_dusk');
      expect(musicTrackForContext('pit', 4)).toBe('music_pit_dark');
      // Phase 5 resolves to the peace band on every screen family.
      expect(musicTrackForContext('pit', 5)).toBe('music_pit_peace');
    });

    test('startMusicForScreen plays the screen-specific bed and crossfades on a screen change', async () => {
      await startMusicForScreen('home', 0);
      expect(getActiveMusicTrack()).toBe('music_bright');
      await startMusicForScreen('puzzle', 0);
      expect(getActiveMusicTrack()).toBe('music_puzzle_bright');
      await startMusicForScreen('pit', 0);
      expect(getActiveMusicTrack()).toBe('music_pit_bright');
    });

    test('startMusicForPhase starts a looping player and fades it in', async () => {
      await startMusicForPhase(0);
      expect(getActiveMusicTrack()).toBe('music_bright');
      const player = getPlayers()[0];
      expect(player.loop).toBe(true);
      expect(player.play).toHaveBeenCalled();
      expect(player.volume).toBe(0); // starts silent
      jest.advanceTimersByTime(5000);
      expect(player.volume).toBeGreaterThan(0.3); // faded up to bed volume
    });

    test('same phase band twice does not restart or duplicate the bed', async () => {
      await startMusicForPhase(0);
      await startMusicForPhase(1); // still bright
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(getActiveMusicTrack()).toBe('music_bright');
    });

    test('phase change crossfades to the new bed and releases the old player', async () => {
      await startMusicForPhase(0);
      const bright = getPlayers()[0];
      jest.advanceTimersByTime(5000);

      await startMusicForPhase(4);
      expect(getActiveMusicTrack()).toBe('music_dark');
      const dark = getPlayers()[1];
      expect(dark.loop).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(bright.remove).toHaveBeenCalled(); // old bed released after fade
      expect(dark.volume).toBeGreaterThan(0.3);
    });

    test('stopMusic fades out and releases the player', async () => {
      await startMusicForPhase(2);
      const player = getPlayers()[0];
      await stopMusic();
      expect(getActiveMusicTrack()).toBeNull();
      jest.advanceTimersByTime(5000);
      expect(player.remove).toHaveBeenCalled();
    });

    test('musicEnabled=false silences the bed', async () => {
      await updateSetting('musicEnabled', false);
      await startMusicForPhase(0);
      expect(expoAudio.createAudioPlayer).not.toHaveBeenCalled();
      expect(getActiveMusicTrack()).toBeNull();
    });

    test('music has its own toggle: plays even when soundEnabled is off', async () => {
      await updateSetting('soundEnabled', false);
      await startMusicForPhase(0);
      expect(getActiveMusicTrack()).toBe('music_bright');
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
    });
  });
});
