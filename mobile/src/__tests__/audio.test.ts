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
  startMusicForPhase,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
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
      'amber_earn',
      'dialogue',
      'victory',
      'perfect',
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
      for (const name of ['hint', 'achievement', 'unlock', 'phase_change', 'daily_ready']) {
        expect(resolveSfxForPhase(name, 4)).toBe(name);
      }
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
    test('musicTrackForPhase maps the descent: bright 0-1, dusk 2, dark 3+', () => {
      expect(musicTrackForPhase(0)).toBe('music_bright');
      expect(musicTrackForPhase(1)).toBe('music_bright');
      expect(musicTrackForPhase(2)).toBe('music_dusk');
      expect(musicTrackForPhase(3)).toBe('music_dark');
      expect(musicTrackForPhase(4)).toBe('music_dark');
      expect(musicTrackForPhase(5)).toBe('music_dark');
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
