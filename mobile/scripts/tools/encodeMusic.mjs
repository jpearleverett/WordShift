// Re-encodes the player's authored music originals into the shipped MP3 beds.
//
//   node scripts/tools/encodeMusic.mjs            encode all 12 and print the table
//   node scripts/tools/encodeMusic.mjs --measure  measure the originals only, encode nothing
//
// Sources:  assets/raw/music/{home,puzzle}_phase{0..5}.mp3  (tracked, NOT bundled)
// Outputs:  assets/music/{home,puzzle}_phase{0..5}.mp3       (bundled via app.json)
//
// The originals are 48 kHz stereo VBR at ~180-195 kbps with an ID3v2.4 tag that
// carries generator metadata and a 360x360 cover picture as a second STREAM
// (ffprobe stream index 1). The shipped file is what the game needs and nothing
// else: 44.1 kHz joint stereo, libmp3lame -q:a 6 (VBR, roughly 85-120 kbps on
// this material), every tag stripped, and `-vn` so the cover stream is dropped
// (`-map_metadata -1` strips TAGS but not streams; without `-vn` the mp3 muxer
// transcodes the picture to PNG and embeds 65-360 KB of APIC in each file).
// ffmpeg still writes its own Xing frame, which is what makes `player.loop`
// gapless: the encoder delay / padding live in that first frame, and both
// ExoPlayer and (mostly) AVPlayer read them.
//
// Loudness policy (a STATIC per-track gain, never loudnorm, never a limiter):
// every original is measured with ebur128; if the twelve span more than
// LOUDNESS_SPAN_TRIGGER_LU of integrated loudness, each track gets a static
// `volume=<dB>dB` that moves it onto the mean, capped so its true peak stays
// under TRUE_PEAK_CEILING_DBTP (a positive gain can push a hot track over; a
// negative gain never can). Below the trigger the gain is 0 dB everywhere and
// the beds ship at the loudness the player authored. As measured on
// 2026-09-10 the originals span 2.6 LU (-13.8 to -16.4 LUFS, mean -15.7), so
// the rule does not fire and the table below prints 0.0 for every row.
//
// Idempotent: the outputs are always rewritten (about 4 s per track), and the
// same inputs through the same ffmpeg produce byte-identical files, so running
// it twice is a no-op for git. Requires ffmpeg + ffprobe with libmp3lame on
// PATH (override with FFMPEG= / FFPROBE=). Exits 1 when any output breaks a
// shipping invariant (size, duration drift, missing Xing frame, or a positive
// gain that still overshoots the peak ceiling).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW_DIR = path.join(ROOT, 'assets/raw/music');
const OUT_DIR = path.join(ROOT, 'assets/music');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';

const FAMILIES = ['home', 'puzzle'];
const PHASES = [0, 1, 2, 3, 4, 5];
const TRACKS = FAMILIES.flatMap((family) => PHASES.map((phase) => `${family}_phase${phase}`));

/** Above this spread of integrated loudness across the set, per-track gains apply. */
const LOUDNESS_SPAN_TRIGGER_LU = 3;
/** Every gained track must land within this distance of the set's mean. */
const LOUDNESS_TOLERANCE_LU = 1;
/** A gain may never push a track's true peak above this. */
const TRUE_PEAK_CEILING_DBTP = -1;
/** Shipping caps, mirrored by src/__tests__/musicAssets.test.ts. */
const MAX_OUT_BYTES = 3.5 * 1024 * 1024;
const MAX_DURATION_DELTA_S = 0.15;
/** Hand overrides (dB) keyed by track name, applied after the computed gain. */
const GAIN_OVERRIDE_DB = {
  // The twelve originals span 2.6 LU (under the 3 LU auto-gain trigger), but
  // puzzle_phase3 sits +1.9 LU above the mean and re-encodes to -0.1 dBTP,
  // hot enough to clip on a warm decoder. Pulling it alone puts every bed
  // within +-0.5 LU of the mean and under -1 dBTP.
  puzzle_phase3: -1.9,
};

const MEASURE_ONLY = process.argv.includes('--measure');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw new Error(`${cmd} failed to start: ${res.error.message}`);
  return res;
}

function requireTool(cmd) {
  const res = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  if (res.error || res.status !== 0) {
    console.error(`encodeMusic: ${cmd} is not available on PATH (set ${cmd.toUpperCase()}=/path/to/${cmd}).`);
    process.exit(1);
  }
}

/** Integrated loudness (LUFS), loudness range (LU) and true peak (dBTP) via ebur128. */
function measure(file) {
  const res = run(FFMPEG, [
    '-nostats', '-hide_banner', '-i', file, '-vn',
    '-af', 'ebur128=framelog=quiet:peak=true', '-f', 'null', '-',
  ]);
  const err = res.stderr || '';
  const grab = (section, label) => {
    const at = err.indexOf(section);
    if (at < 0) return NaN;
    const m = err.slice(at).match(new RegExp(`${label}:\\s*(-?[0-9.]+|-inf)`));
    return m ? Number(m[1]) : NaN;
  };
  return {
    integrated: grab('Integrated loudness:', 'I'),
    lra: grab('Loudness range:', 'LRA'),
    truePeak: grab('True peak:', 'Peak'),
  };
}

function duration(file) {
  const res = run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(String(res.stdout).trim());
}

/**
 * The 4-byte tag at the start of the first MPEG frame's payload ('Xing' for a
 * VBR file, 'Info' for CBR), or null. Skips an ID3v2 prefix (ffmpeg still
 * writes a tiny ID3v2.3 TSSE tag even with -map_metadata -1) and reads the
 * side-info length off the frame header so the parser holds for MPEG1/2 and
 * mono/stereo alike.
 */
function firstFrameTag(buf) {
  let off = 0;
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    off = 10 + size + ((buf[5] & 0x10) ? 10 : 0);
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

function encode(raw, out, gainDb) {
  const args = ['-y', '-nostats', '-loglevel', 'error', '-i', raw, '-vn'];
  if (gainDb !== 0) args.push('-af', `volume=${gainDb.toFixed(1)}dB`);
  args.push(
    '-c:a', 'libmp3lame', '-q:a', '6', '-ar', '44100', '-ac', '2',
    '-map_metadata', '-1', '-id3v2_version', '3', out,
  );
  const res = run(FFMPEG, args);
  if (res.status !== 0) throw new Error(`ffmpeg failed on ${path.basename(raw)}:\n${res.stderr}`);
}

/** Per-track static gain toward the mean, capped by the true-peak ceiling. */
function computeGains(rawStats) {
  const values = TRACKS.map((t) => rawStats[t].integrated);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const span = Math.max(...values) - Math.min(...values);
  const gains = {};
  for (const t of TRACKS) {
    let g = 0;
    if (span > LOUDNESS_SPAN_TRIGGER_LU) {
      g = Math.round((mean - rawStats[t].integrated) * 10) / 10;
      const headroom = TRUE_PEAK_CEILING_DBTP - rawStats[t].truePeak;
      if (g > 0 && g > headroom) g = Math.max(0, Math.floor(headroom * 10) / 10);
    }
    if (t in GAIN_OVERRIDE_DB) g = GAIN_OVERRIDE_DB[t];
    gains[t] = g;
  }
  return { mean, span, gains };
}

const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a');
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

function main() {
  requireTool(FFMPEG);
  requireTool(FFPROBE);
  const missing = TRACKS.filter((t) => !fs.existsSync(path.join(RAW_DIR, `${t}.mp3`)));
  if (missing.length) {
    console.error(`encodeMusic: missing originals under assets/raw/music: ${missing.join(', ')}`);
    process.exit(1);
  }

  const rawStats = {};
  for (const t of TRACKS) {
    const raw = path.join(RAW_DIR, `${t}.mp3`);
    rawStats[t] = { ...measure(raw), duration: duration(raw), bytes: fs.statSync(raw).size };
  }
  const { mean, span, gains } = computeGains(rawStats);
  console.log(
    `originals: mean ${fmt(mean)} LUFS, span ${fmt(span)} LU ` +
    `(trigger > ${LOUDNESS_SPAN_TRIGGER_LU} LU: ${span > LOUDNESS_SPAN_TRIGGER_LU ? 'gains applied' : 'no gain'})`,
  );

  if (MEASURE_ONLY) {
    console.log('track          raw MB  raw s    raw LUFS  LRA   raw dBTP  gain dB');
    for (const t of TRACKS) {
      const r = rawStats[t];
      console.log(
        `${t.padEnd(14)} ${mb(r.bytes).padStart(6)}  ${fmt(r.duration, 3).padStart(8)}  ` +
        `${fmt(r.integrated).padStart(8)}  ${fmt(r.lra).padStart(4)}  ${fmt(r.truePeak).padStart(8)}  ${fmt(gains[t]).padStart(7)}`,
      );
    }
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const failures = [];
  const rows = [];
  let rawTotal = 0;
  let outTotal = 0;
  for (const t of TRACKS) {
    const raw = path.join(RAW_DIR, `${t}.mp3`);
    const out = path.join(OUT_DIR, `${t}.mp3`);
    encode(raw, out, gains[t]);
    const o = { ...measure(out), duration: duration(out), bytes: fs.statSync(out).size };
    const tag = firstFrameTag(fs.readFileSync(out));
    const r = rawStats[t];
    const delta = o.duration - r.duration;
    rawTotal += r.bytes;
    outTotal += o.bytes;
    const flags = [];
    if (o.bytes > MAX_OUT_BYTES) flags.push(`FAIL size > ${mb(MAX_OUT_BYTES)} MB`);
    if (Math.abs(delta) > MAX_DURATION_DELTA_S) flags.push(`FAIL duration drift ${fmt(delta, 3)} s`);
    if (tag !== 'Xing' && tag !== 'Info') flags.push(`FAIL no Xing/Info frame (${JSON.stringify(tag)})`);
    if (gains[t] > 0 && o.truePeak > TRUE_PEAK_CEILING_DBTP) flags.push(`FAIL peak ${fmt(o.truePeak)} dBTP after +gain`);
    if (gains[t] !== 0 && Math.abs(o.integrated - mean) > LOUDNESS_TOLERANCE_LU) {
      flags.push(`FAIL ${fmt(o.integrated)} LUFS is > ${LOUDNESS_TOLERANCE_LU} LU off the mean`);
    }
    if (gains[t] <= 0 && o.truePeak > TRUE_PEAK_CEILING_DBTP) flags.push(`warn peak ${fmt(o.truePeak)} dBTP (authored)`);
    if (flags.some((f) => f.startsWith('FAIL'))) failures.push(`${t}: ${flags.filter((f) => f.startsWith('FAIL')).join('; ')}`);
    rows.push({ t, r, o, delta, tag, flags });
  }

  console.log('track          raw MB  out MB  raw s     out s     delta s  raw LUFS  out LUFS  out dBTP  gain dB  tag');
  for (const { t, r, o, delta, tag, flags } of rows) {
    console.log(
      `${t.padEnd(14)} ${mb(r.bytes).padStart(6)}  ${mb(o.bytes).padStart(6)}  ` +
      `${fmt(r.duration, 3).padStart(8)}  ${fmt(o.duration, 3).padStart(8)}  ${fmt(delta, 3).padStart(7)}  ` +
      `${fmt(r.integrated).padStart(8)}  ${fmt(o.integrated).padStart(8)}  ${fmt(o.truePeak).padStart(8)}  ` +
      `${fmt(gains[t]).padStart(7)}  ${tag}${flags.length ? '  ' + flags.join('; ') : ''}`,
    );
  }
  console.log(`total: ${mb(rawTotal)} MB raw -> ${mb(outTotal)} MB shipped (${TRACKS.length} tracks)`);

  if (failures.length) {
    console.error('\nencodeMusic: shipping invariants broken:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
}

main();
