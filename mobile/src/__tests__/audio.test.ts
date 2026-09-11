/**
 * Audio service tests — the audio-overhaul contract:
 *   - soundValidMove(comboTier?) combo ladder: tier 0 = base chime, tiers
 *     1-3 escalate, clamped; bright names below Phase 3, dark names at 3+.
 *   - resolveSfxForPhase: every registered `<name>_dark` swaps in at Phase 3+;
 *     sounds without a dark variant keep their base name at every phase.
 *   - Ambient music: startMusicForPhase / startMusicForScreen pick the
 *     authored per-phase bed (the home family for home AND the pit, the
 *     puzzle family on the board), loop it, crossfade on switch, gate on
 *     musicEnabled (NOT soundEnabled), and stopMusic releases the player.
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
  hasMusicTrack,
  startMusicForPhase,
  startMusicForScreen,
  stopMusic,
  getActiveMusicTrack,
  unloadAllSounds,
  createCinematicSoundScope,
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

  test('a cinematic scope releases its cue when skipped without removing a gameplay player', async () => {
    await soundTap();
    const tap = getPlayers()[0];
    const scope = createCinematicSoundScope();
    scope.play('arrival');
    for (let n = 0; n < 4; n++) await Promise.resolve();
    const arrival = getPlayers()[1];
    expect(arrival.play).toHaveBeenCalledTimes(1);
    scope.stop();
    expect(arrival.remove).toHaveBeenCalledTimes(1);
    expect(tap.remove).not.toHaveBeenCalled();
  });

  test('a stopped cinematic scope cannot start a delayed cue', async () => {
    const scope = createCinematicSoundScope();
    scope.play('arrival'); scope.stop();
    for (let n = 0; n < 4; n++) await Promise.resolve();
    expect(getPlayers()).toHaveLength(0);
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

    test('the dark ladder takes over at Phase 3-4 (sinking, not celebrating)', () => {
      expect(validMoveSoundName(0, 3)).toBe('valid_move_dark');
      expect(validMoveSoundName(1, 3)).toBe('valid_move_2_dark');
      expect(validMoveSoundName(2, 4)).toBe('valid_move_3_dark');
      expect(validMoveSoundName(3, 4)).toBe('valid_move_4_dark');
    });

    test('the peace ladder takes over at Phase 5 (the chord assembles, nothing rises or sinks)', () => {
      expect(validMoveSoundName(0, 5)).toBe('valid_move_peace');
      expect(validMoveSoundName(1, 5)).toBe('valid_move_2_peace');
      expect(validMoveSoundName(2, 5)).toBe('valid_move_3_peace');
      expect(validMoveSoundName(3, 5)).toBe('valid_move_4_peace');
    });

    test('stays bright through Phase 2', () => {
      expect(validMoveSoundName(3, 2)).toBe('valid_move_4');
    });
  });

  describe('dark variant resolution (resolveSfxForPhase)', () => {
    // Names with a dark mirror but NO peace variant — dark from 3 all the way
    // through 5 (the settled-dark palette carries the less frequent sounds).
    const darkOnly = [
      'tap',
      'invalid_move',
      'undo',
      'hint',
      'amber_earn',
      'pit_devour',
    ];
    // The most frequent sounds carry a Phase-5 peace variant on top.
    const withPeace = ['letter_select', 'dialogue', 'victory', 'perfect'];

    test.each([...darkOnly, ...withPeace])('%s swaps to its dark variant at Phase 3-4', (name) => {
      expect(resolveSfxForPhase(name, 3)).toBe(`${name}_dark`);
      expect(resolveSfxForPhase(name, 4)).toBe(`${name}_dark`);
    });

    test.each(darkOnly)('%s keeps its dark mirror at Phase 5 (no peace variant)', (name) => {
      expect(resolveSfxForPhase(name, 5)).toBe(`${name}_dark`);
    });

    test.each(withPeace)('%s resolves to its PEACE variant at Phase 5 (serene tier wins over dark)', (name) => {
      expect(resolveSfxForPhase(name, 5)).toBe(`${name}_peace`);
      // The peace tier never leaks below Phase 5.
      expect(resolveSfxForPhase(name, 4)).toBe(`${name}_dark`);
    });

    test.each([...darkOnly, ...withPeace])('%s stays bright below Phase 3', (name) => {
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
    const SCREENS = ['home', 'puzzle', 'pit'] as const;
    const PHASES = [0, 1, 2, 3, 4, 5];

    test('musicTrackForPhase maps every phase to its own home bed (six steps, no bands)', () => {
      expect(musicTrackForPhase(0)).toBe('music_home_0');
      expect(musicTrackForPhase(1)).toBe('music_home_1');
      expect(musicTrackForPhase(2)).toBe('music_home_2');
      expect(musicTrackForPhase(3)).toBe('music_home_3');
      expect(musicTrackForPhase(4)).toBe('music_home_4');
      expect(musicTrackForPhase(5)).toBe('music_home_5');
    });

    test('musicTrackForPhase rounds and clamps into 0..5 and treats NaN as phase 0', () => {
      expect(musicTrackForPhase(-1)).toBe('music_home_0');
      expect(musicTrackForPhase(9)).toBe('music_home_5');
      expect(musicTrackForPhase(2.4)).toBe('music_home_2');
      expect(musicTrackForPhase(2.6)).toBe('music_home_3');
      // The retired band mapping resolved NaN to the bright bed; a key like
      // music_home_NaN would instead make the switch a silent no-op.
      expect(musicTrackForPhase(NaN)).toBe('music_home_0');
    });

    test('musicTrackForContext picks the screen family and keeps the per-phase step', () => {
      // Home = the house-world beds (also the default for menu screens).
      expect(musicTrackForContext('home', 0)).toBe('music_home_0');
      expect(musicTrackForContext('home', 2)).toBe('music_home_2');
      expect(musicTrackForContext('home', 4)).toBe('music_home_4');
      // Puzzle family descends with the same per-phase steps.
      expect(musicTrackForContext('puzzle', 1)).toBe('music_puzzle_1');
      expect(musicTrackForContext('puzzle', 2)).toBe('music_puzzle_2');
      expect(musicTrackForContext('puzzle', 3)).toBe('music_puzzle_3');
      expect(musicTrackForContext('puzzle', 5)).toBe('music_puzzle_5');
    });

    test('the Offering Pit plays the HOME family at every phase (the pit is part of the house world)', () => {
      expect(musicTrackForContext('pit', 0)).toBe('music_home_0');
      expect(musicTrackForContext('pit', 2)).toBe('music_home_2');
      expect(musicTrackForContext('pit', 4)).toBe('music_home_4');
      expect(musicTrackForContext('pit', 5)).toBe('music_home_5');
      for (const p of PHASES) {
        expect(musicTrackForContext('pit', p)).toBe(musicTrackForContext('home', p));
      }
    });

    test('every (screen, phase) resolves to a bed that is actually registered', () => {
      for (const screen of SCREENS) {
        for (const p of PHASES) {
          expect(hasMusicTrack(musicTrackForContext(screen, p))).toBe(true);
        }
      }
    });

    test('the retired band beds are gone from the registry and nothing past phase 5 exists', () => {
      for (const name of [
        'music_bright', 'music_dusk', 'music_dark', 'music_peace',
        'music_puzzle_bright', 'music_pit_dark', 'music_pit_peace',
      ]) {
        expect(hasMusicTrack(name)).toBe(false);
      }
      expect(hasMusicTrack('music_home_6')).toBe(false);
      expect(hasMusicTrack('music_home_NaN')).toBe(false);
      expect(hasMusicTrack('')).toBe(false);
    });

    test('startMusicForScreen plays the screen-specific bed and crossfades on a screen change', async () => {
      await startMusicForScreen('home', 0);
      expect(getActiveMusicTrack()).toBe('music_home_0');
      await startMusicForScreen('puzzle', 0);
      expect(getActiveMusicTrack()).toBe('music_puzzle_0');
      // puzzle -> pit is still a real switch (back to the home family).
      await startMusicForScreen('pit', 0);
      expect(getActiveMusicTrack()).toBe('music_home_0');
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(3);
    });

    test('walking home <-> pit never restarts the bed (same family, resume no-op)', async () => {
      await startMusicForScreen('home', 0);
      await startMusicForScreen('pit', 0);
      await startMusicForScreen('home', 0);
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(getActiveMusicTrack()).toBe('music_home_0');
    });

    test('startMusicForPhase starts a looping player and fades it in', async () => {
      await startMusicForPhase(0);
      expect(getActiveMusicTrack()).toBe('music_home_0');
      const player = getPlayers()[0];
      expect(player.loop).toBe(true);
      expect(player.play).toHaveBeenCalled();
      expect(player.volume).toBe(0); // starts silent
      jest.advanceTimersByTime(5000);
      expect(player.volume).toBeGreaterThan(0.3); // faded up to bed volume
    });

    test('the same phase twice does not restart or duplicate the bed', async () => {
      await startMusicForPhase(0);
      await startMusicForPhase(0);
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(getActiveMusicTrack()).toBe('music_home_0');
    });

    test('every phase owns its own bed: 0 -> 1 is a real switch (no bright band spans it any more)', async () => {
      await startMusicForPhase(0);
      await startMusicForPhase(1);
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(2);
      expect(getActiveMusicTrack()).toBe('music_home_1');
    });

    test('phase change crossfades to the new bed and releases the old player', async () => {
      await startMusicForPhase(0);
      const first = getPlayers()[0];
      jest.advanceTimersByTime(5000);

      await startMusicForPhase(4);
      expect(getActiveMusicTrack()).toBe('music_home_4');
      const fourth = getPlayers()[1];
      expect(fourth.loop).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(first.remove).toHaveBeenCalled(); // old bed released after fade
      expect(fourth.volume).toBeGreaterThan(0.3);
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
      expect(getActiveMusicTrack()).toBe('music_home_0');
      expect(expoAudio.createAudioPlayer).toHaveBeenCalledTimes(1);
    });
  });
});
