/**
 * Shipped music asset contract. The ambient beds are the player's authored
 * MP3s, not synthesized WAVs, so the guarantees live on disk rather than in a
 * generator:
 *   - the 12 shipped beds exist under assets/music with clean names (a space
 *     in an asset filename is a Metro/Android hazard), each under 3.5 MB, and
 *     each opens with a Xing/Info frame: the LAME/Xing header carries the
 *     encoder delay + padding that make `player.loop` wrap gaplessly;
 *   - each has its original under assets/raw/music (the encode source that
 *     scripts/tools/encodeMusic.mjs reads);
 *   - app.json bundles assets/music/** and leaves assets/raw unbundled;
 *   - the retired music_*.wav beds stay out of assets/sounds, so a stale
 *     `generate:assets` cannot resurrect them;
 *   - the shipped names, the audio.ts require() literals and the registry
 *     keys cannot drift apart.
 */
import fs from 'fs';
import path from 'path';
import appJson from '../../app.json';
import { hasMusicTrack, musicTrackForContext } from '../services/audio';

jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(async () => {}),
}));

const MUSIC_DIR = path.resolve(__dirname, '../../assets/music');
const RAW_DIR = path.resolve(__dirname, '../../assets/raw/music');
const SOUNDS_DIR = path.resolve(__dirname, '../../assets/sounds');
const AUDIO_TS = path.resolve(__dirname, '../services/audio.ts');

const FAMILIES = ['home', 'puzzle'] as const;
const PHASES = [0, 1, 2, 3, 4, 5];
const TRACKS = FAMILIES.flatMap((family) =>
  PHASES.map((phase) => ({ family, phase, file: `${family}_phase${phase}.mp3` })),
);
const MAX_BYTES = 3.5 * 1024 * 1024;

/**
 * The 4-byte tag that opens the first MPEG frame's payload: 'Xing' (VBR) or
 * 'Info' (CBR), else null. Skips an ID3v2 prefix (ffmpeg writes a small
 * ID3v2.3 TSSE tag even with -map_metadata -1, and the originals carry
 * 21-47 KB of artwork tags) and derives the side-info length from the frame
 * header so the same parser holds for MPEG1/MPEG2 and mono/stereo.
 */
function firstFrameTag(buf: Buffer): string | null {
  let off = 0;
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    off = 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  if (off + 4 > buf.length) return null;
  if (buf[off] !== 0xff || (buf[off + 1] & 0xe0) !== 0xe0) return null;
  const version = (buf[off + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const mode = (buf[off + 3] >> 6) & 3; // 3 = mono
  const sideInfo = version === 3 ? (mode === 3 ? 17 : 32) : (mode === 3 ? 9 : 17);
  const at = off + 4 + sideInfo;
  if (at + 4 > buf.length) return null;
  return buf.toString('latin1', at, at + 4);
}

describe('shipped music assets', () => {
  test.each(TRACKS.map((t) => [t.file, t] as const))('%s is shipped, small, gapless-tagged and sourced', (_file, t) => {
    const shipped = path.join(MUSIC_DIR, t.file);
    expect(fs.existsSync(shipped)).toBe(true);
    expect(fs.statSync(shipped).size).toBeLessThan(MAX_BYTES);
    expect(['Xing', 'Info']).toContain(firstFrameTag(fs.readFileSync(shipped)));
    expect(fs.existsSync(path.join(RAW_DIR, t.file))).toBe(true);
  });

  test('assets/music holds exactly the 12 beds and no filename carries a space', () => {
    const entries = fs.readdirSync(MUSIC_DIR).sort();
    expect(entries).toEqual(TRACKS.map((t) => t.file).sort());
    expect(entries.filter((f) => /\s/.test(f))).toEqual([]);
  });

  test('the originals under assets/raw/music also carry a Xing/Info frame (a valid encode source)', () => {
    for (const t of TRACKS) {
      expect(['Xing', 'Info']).toContain(firstFrameTag(fs.readFileSync(path.join(RAW_DIR, t.file))));
    }
  });

  test('app.json bundles assets/music/** and never assets/raw', () => {
    const patterns: string[] = appJson.expo.assetBundlePatterns;
    expect(patterns).toContain('assets/music/**');
    expect(patterns.filter((p) => p.startsWith('assets/raw'))).toEqual([]);
  });

  test('the synthesized music_*.wav beds stay retired from assets/sounds', () => {
    expect(fs.readdirSync(SOUNDS_DIR).filter((f) => f.startsWith('music_'))).toEqual([]);
  });

  test('audio.ts requires every shipped bed by its exact path and registers it under music_<family>_<phase>', () => {
    const src = fs.readFileSync(AUDIO_TS, 'utf8');
    for (const t of TRACKS) {
      expect(src).toContain(`music_${t.family}_${t.phase}: require('../../assets/music/${t.file}')`);
      expect(hasMusicTrack(`music_${t.family}_${t.phase}`)).toBe(true);
    }
    // No require() into assets/music points at a file that does not ship.
    const required = [...src.matchAll(/require\('\.\.\/\.\.\/assets\/music\/([^']+)'\)/g)].map((m) => m[1]).sort();
    expect(required).toEqual(TRACKS.map((t) => t.file).sort());
    // And no bed is required from assets/sounds any more.
    expect(src).not.toMatch(/assets\/sounds\/music_/);
  });

  test('every screen at every phase resolves to a shipped file', () => {
    for (const screen of ['home', 'puzzle', 'pit'] as const) {
      for (const p of PHASES) {
        const key = musicTrackForContext(screen, p);
        const m = key.match(/^music_(home|puzzle)_(\d)$/);
        expect(m).not.toBeNull();
        expect(fs.existsSync(path.join(MUSIC_DIR, `${m![1]}_phase${m![2]}.mp3`))).toBe(true);
      }
    }
  });
});
