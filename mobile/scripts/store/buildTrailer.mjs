#!/usr/bin/env node
/** Build the store trailer exclusively from genuine, reviewed screen recordings. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_ROOT = path.join(MOBILE, 'assets/Play_store/launch-2026-09-v2');
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const CONTENT_TOP = 152;
const CONTENT_HEIGHT = HEIGHT - CONTENT_TOP;
const SOUNDS = new Set(['letter_select', 'valid_move', 'victory', 'amber_earn']);
const args = process.argv.slice(2);

function fail(message) { throw new Error(message); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
function sha256(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function run(command, parameters, options = {}) {
  try { return execFileSync(command, parameters, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options }); }
  catch (error) { fail(`${command} failed: ${(error.stderr || error.message).toString().trim()}`); }
}
function probe(file) { return JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file])); }
function number(value, label) {
  if (!Number.isFinite(value) || value < 0) fail(`${label} must be a finite nonnegative number.`);
  return value;
}
function within(root, relative) {
  if (typeof relative !== 'string' || !relative) fail('Every source clip needs a relative file path.');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) fail(`Source path leaves its capture directory: ${relative}`);
  return resolved;
}
function checkTools() {
  const version = run('ffmpeg', ['-hide_banner', '-version']).split('\n')[0];
  const filters = run('ffmpeg', ['-hide_banner', '-filters'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const encoders = run('ffmpeg', ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'pipe'] });
  for (const filter of ['drawtext', 'overlay', 'amix', 'loudnorm', 'scale', 'pad']) {
    if (!new RegExp(`\\b${filter}\\b`).test(filters)) fail(`ffmpeg is missing ${filter}.`);
  }
  if (!/\blibx264\b/.test(encoders) || !/\baac\b/.test(encoders)) fail('ffmpeg needs libx264 and AAC encoders.');
  run('ffprobe', ['-hide_banner', '-version']);
  for (const relative of ['assets/fonts/EpundaSlab-Bold.ttf', 'assets/fonts/Figtree-Regular.ttf', 'assets/ui/wordmark.png', 'assets/music/home_phase0.mp3', 'assets/music/home_phase3.mp3']) {
    if (!existsSync(path.join(MOBILE, relative))) fail(`Missing owned production asset: ${relative}`);
  }
  return version;
}

function usage() {
  console.log(`WordShift store trailer — actual footage only

Usage: node scripts/store/buildTrailer.mjs [options]

  --check-tools       Check ffmpeg, ffprobe, fonts, music and wordmark only.
  --preflight         Check source clips, durations, provenance and review status.
  --draft             Allow unreviewed capture timing; write review/trailer-draft.mp4.
  --root <directory>  Campaign directory (default: assets/Play_store/launch-2026-09-v2).
  --keep-work         Retain intermediate files for edit troubleshooting.
  --help              Show this help.

Input:  raw/video.json, real clips under raw/video/, source/trailer-timeline.json.
Final:  upload/video/wordshift-trailer-30s.mp4 plus source/trailer-export.json.

Production export requires timingReviewed:true in raw/video.json after watching
the actual clips. The command never substitutes still images or synthetic motion
for missing footage. See source/video-production.md for the capture contract.`);
}

function readSources(root, draft) {
  const timelinePath = path.join(root, 'source/trailer-timeline.json');
  const recordingPath = path.join(root, 'raw/video.json');
  if (!existsSync(recordingPath)) fail(`Missing real capture manifest: ${recordingPath}\nRecord the approved scenes first. No trailer or placeholder was generated.`);
  const timeline = readJson(timelinePath);
  const recording = readJson(recordingPath);
  if (timeline.duration_seconds !== 30 || timeline.export.width !== WIDTH || timeline.export.height !== HEIGHT || timeline.export.fps !== FPS) fail('Expected the approved 30-second, 1080×1920, 30 fps timeline.');
  if (!Array.isArray(timeline.segments) || !Array.isArray(recording.segments)) fail('Both manifests need segment arrays.');
  if (!recording.sourceCommit || !recording.renderer) fail('Record sourceCommit and renderer honestly in raw/video.json.');
  if (!draft && recording.timingReviewed !== true) fail('Capture timing has not been visually reviewed. Use --draft to make a review copy, check every cut against the actual recording, then set timingReviewed:true.');
  const raw = path.join(root, 'raw');
  const clips = new Map();
  const warnings = [];
  for (const [id, clip] of Object.entries(recording.clips || {})) {
    const file = within(raw, clip.file);
    if (!existsSync(file)) fail(`Missing genuine source clip: ${file}`);
    const info = probe(file);
    const stream = info.streams.find(item => item.codec_type === 'video');
    if (!stream) fail(`No video stream in ${clip.file}.`);
    const duration = Number(info.format.duration || stream.duration);
    if (!Number.isFinite(duration) || duration <= 0) fail(`Cannot determine real clip duration: ${clip.file}`);
    if (stream.width >= stream.height) fail(`Portrait source required; ${clip.file} is ${stream.width}×${stream.height}.`);
    // A preserved, full-height portrait UI must occupy at least 80% of the frame.
    const factor = Math.min(WIDTH / stream.width, CONTENT_HEIGHT / stream.height);
    const areaFraction = stream.width * stream.height * factor ** 2 / (WIDTH * HEIGHT);
    if (areaFraction < 0.8) fail(`${clip.file} is too narrow for the approved framing; actual UI would occupy ${(areaFraction * 100).toFixed(1)}% of the frame.`);
    if (stream.width < 1080 || stream.height < 1920) warnings.push(`${clip.file}: ${stream.width}×${stream.height} source is enlarged; check text readability before publication.`);
    clips.set(id, { ...clip, file, duration, stream, sha256: sha256(file), areaFraction });
  }
  let end = 0;
  const segments = timeline.segments.map(segment => {
    if (segment.start !== end || segment.end <= segment.start) fail(`Timeline gap/overlap at ${segment.id}.`);
    end = segment.end;
    const matching = recording.segments.filter(item => item.id === segment.id);
    if (matching.length !== 1) fail(`Need exactly one capture segment for ${segment.id}.`);
    const captured = matching[0];
    if (!Array.isArray(captured.cuts) || !captured.cuts.length) fail(`No genuine cuts for ${segment.id}.`);
    let duration = 0;
    const cuts = captured.cuts.map(cut => {
      const clip = clips.get(cut.clip);
      if (!clip) fail(`Unknown clip ${cut.clip} in ${segment.id}.`);
      const sourceIn = number(cut.sourceIn, `${segment.id}.sourceIn`);
      const seconds = number(cut.durationSeconds, `${segment.id}.durationSeconds`);
      if (seconds <= 0 || Math.abs(seconds * FPS - Math.round(seconds * FPS)) > 0.001) fail(`Cut duration must be positive and align to 30 fps: ${segment.id}.`);
      if (sourceIn + seconds > clip.duration + 0.025) fail(`${segment.id} exceeds actual ${cut.clip} duration (${clip.duration.toFixed(3)}s). Re-record or correct sourceIn; no freeze-frame padding is allowed.`);
      const result = { ...cut, clip, sourceIn, durationSeconds: seconds, destinationIn: segment.start + duration };
      duration += seconds;
      return result;
    });
    if (Math.abs(duration - (segment.end - segment.start)) > 0.001) fail(`${segment.id} cuts total ${duration}s; approved duration is ${segment.end - segment.start}s.`);
    return { ...segment, cuts };
  });
  if (end !== 30) fail('Timeline must end at exactly 30 seconds.');
  if (recording.segments.length !== segments.length) fail('Capture contains extra segments not present in the approved timeline.');
  return { timeline, recording, segments, clips, warnings: [...new Set(warnings)], timelinePath, recordingPath };
}

// ffmpeg filter values have their own quoting rules; all text itself lives in files.
function filterPath(file) { return `'${file.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "'\\''")}'`; }
function drawText({ textFile, font, size, y, color, start, end }) {
  return `drawtext=fontfile=${filterPath(font)}:textfile=${filterPath(textFile)}:expansion=none:fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}:enable='gte(t,${start})*lt(t,${end})'`;
}

function render(root, source, draft, keepWork, ffmpegVersion) {
  const work = mkdtempSync(path.join(os.tmpdir(), 'wordshift-trailer-'));
  const output = path.join(root, draft ? 'review/trailer-draft.mp4' : 'upload/video/wordshift-trailer-30s.mp4');
  const sidecar = path.join(root, draft ? 'review/trailer-draft.json' : 'source/trailer-export.json');
  mkdirSync(path.dirname(output), { recursive: true });
  const temporaryOutput = path.join(work, 'trailer.mp4');
  const logs = [];
  const ffmpeg = parameters => {
    logs.push(['ffmpeg', ...parameters]);
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-threads', '2', ...parameters]);
  };
  try {
    const cuts = source.segments.flatMap(segment => segment.cuts.map(cut => ({ ...cut, segment })));
    const intermediates = [];
    for (const [index, cut] of cuts.entries()) {
      const file = path.join(work, `cut-${String(index).padStart(2, '0')}.mp4`);
      const dark = cut.segment.start >= 23;
      const background = dark ? '0x19332f' : '0xf7edda';
      // Full UI stays visible. No synthesized movement, speed changes, crop or frozen frames.
      const filter = `fps=${FPS},scale=${WIDTH}:${CONTENT_HEIGHT}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:${CONTENT_TOP}+((${CONTENT_HEIGHT}-ih)/2):color=${background},setsar=1,format=yuv420p`;
      console.log(`Encoding actual clip ${index + 1}/${cuts.length}: ${cut.segment.id}`);
      ffmpeg(['-ss', String(cut.sourceIn), '-i', cut.clip.file, '-an', '-vf', filter, '-frames:v', String(Math.round(cut.durationSeconds * FPS)), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), '-video_track_timescale', '30000', file]);
      const encoded = probe(file).streams.find(stream => stream.codec_type === 'video');
      if (Number(encoded.nb_frames) !== Math.round(cut.durationSeconds * FPS)) fail(`Cut ${cut.segment.id} ended early. Capture additional real footage.`);
      intermediates.push(file);
    }
    const concat = path.join(work, 'cuts.txt');
    writeFileSync(concat, intermediates.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
    const picture = path.join(work, 'picture.mp4');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-an', picture]);

    const epunda = path.join(MOBILE, 'assets/fonts/EpundaSlab-Bold.ttf');
    const figtree = path.join(MOBILE, 'assets/fonts/Figtree-Regular.ttf');
    const captionFilters = [];
    for (const segment of source.segments) {
      const textFile = path.join(work, `${segment.id}-headline.txt`);
      writeFileSync(textFile, segment.caption);
      const final = segment.id === '09-end';
      captionFilters.push(drawText({ textFile, font: final ? figtree : epunda, size: final ? 40 : 62, y: final ? 109 : segment.supporting_caption ? 20 : 48, color: segment.start >= 23 ? '0xf7edda' : '0x274c3e', start: segment.start, end: segment.end }));
      if (segment.supporting_caption) {
        const supportFile = path.join(work, `${segment.id}-support.txt`);
        writeFileSync(supportFile, segment.supporting_caption);
        captionFilters.push(drawText({ textFile: supportFile, font: figtree, size: 36, y: 99, color: '0x586653', start: segment.start, end: segment.end }));
      }
    }
    const inputArgs = ['-i', picture, '-loop', '1', '-i', path.join(MOBILE, 'assets/ui/wordmark.png'), '-stream_loop', '-1', '-i', path.join(MOBILE, 'assets/music/home_phase0.mp3'), '-stream_loop', '-1', '-i', path.join(MOBILE, 'assets/music/home_phase3.mp3')];
    const graph = [
      `[0:v]${captionFilters.join(',')}[captioned]`,
      '[1:v]scale=380:95:flags=lanczos,format=rgba[logo]',
      "[captioned][logo]overlay=x=(W-w)/2:y=3:enable='gte(t,27)':shortest=1,format=yuv420p[v]",
      '[2:a]atrim=0:24,asetpts=PTS-STARTPTS,volume=0.18,afade=t=in:st=0:d=0.7,afade=t=out:st=21:d=3[warm]',
      '[3:a]atrim=0:8,asetpts=PTS-STARTPTS,volume=0.15,afade=t=in:st=0:d=1.5,afade=t=out:st=6.6:d=1.4,adelay=22000:all=1[night]',
    ];
    const soundEvents = [];
    for (const cut of cuts) {
      for (const event of cut.clip.eventList || []) {
        if (event.verified !== true || !SOUNDS.has(event.type) || !Number.isFinite(event.atSeconds)) continue;
        if (event.atSeconds < cut.sourceIn || event.atSeconds >= cut.sourceIn + cut.durationSeconds) continue;
        soundEvents.push({ type: event.type, at: cut.destinationIn + event.atSeconds - cut.sourceIn, clip: path.relative(path.join(root, 'raw'), cut.clip.file), sourceAt: event.atSeconds });
      }
    }
    for (const [index, event] of soundEvents.entries()) {
      inputArgs.push('-i', path.join(MOBILE, 'assets/sounds', `${event.type}.wav`));
      graph.push(`[${index + 4}:a]atrim=0:2.5,asetpts=PTS-STARTPTS,volume=0.45,adelay=${Math.round(event.at * 1000)}:all=1[sfx${index}]`);
    }
    graph.push(`[warm][night]${soundEvents.map((_, index) => `[sfx${index}]`).join('')}amix=inputs=${soundEvents.length + 2}:normalize=0:duration=longest,loudnorm=I=-18:TP=-1.5:LRA=9,atrim=0:30,asetpts=PTS-STARTPTS[a]`);
    const filterFile = path.join(work, 'final-filter.txt');
    writeFileSync(filterFile, graph.join(';\n'));
    console.log(`Finishing 30-second ${draft ? 'review copy' : 'production export'} with ${soundEvents.length} verified sound events.`);
    ffmpeg([...inputArgs, '-filter_complex_script', filterFile, '-map', '[v]', '-map', '[a]', '-frames:v', '900', '-t', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-metadata', 'title=WordShift — One letter. A home full of secrets.', '-metadata', 'comment=Actual app footage; capture renderer and source commit are recorded in the accompanying provenance.', temporaryOutput]);

    const result = probe(temporaryOutput);
    const video = result.streams.find(stream => stream.codec_type === 'video');
    const audio = result.streams.find(stream => stream.codec_type === 'audio');
    if (!video || video.width !== WIDTH || video.height !== HEIGHT || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' || video.r_frame_rate !== '30/1' || Number(video.nb_frames) !== 900 || !audio || audio.codec_name !== 'aac' || Math.abs(Number(result.format.duration) - 30) > 0.05) fail('Export validation failed; no final asset was installed.');
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-xerror', '-i', temporaryOutput, '-f', 'null', '-']);
    writeFileSync(output, readFileSync(temporaryOutput));
    const report = {
      version: 1, status: draft ? 'draft_requires_frame_review' : 'rendered_and_technically_verified',
      exportedAt: new Date().toISOString(), ffmpegVersion,
      file: path.relative(root, output), bytes: statSync(output).size, sha256: sha256(output),
      sourceCommit: source.recording.sourceCommit, renderer: source.recording.renderer,
      timingReviewed: source.recording.timingReviewed === true,
      nativeAndroidComparison: source.recording.nativeAndroidComparison || 'not recorded; compare against the signed build before store publication',
      durationSeconds: Number(result.format.duration), width: video.width, height: video.height, fps: 30, frames: Number(video.nb_frames), videoCodec: video.codec_name, pixelFormat: video.pix_fmt, audioCodec: audio.codec_name,
      framing: { fullSourceUiPreserved: true, captionBandHeight: CONTENT_TOP, minimumActualUiAreaFraction: Math.min(...[...source.clips.values()].map(clip => clip.areaFraction)), noSyntheticMotion: true, noFreezeFramePadding: true },
      timelineSha256: sha256(source.timelinePath), recordingManifestSha256: sha256(source.recordingPath),
      sourceClips: Object.fromEntries([...source.clips].map(([id, clip]) => [id, { file: path.relative(path.join(root, 'raw'), clip.file), width: clip.stream.width, height: clip.stream.height, durationSeconds: clip.duration, sha256: clip.sha256 }])),
      soundEvents,
      music: ['assets/music/home_phase0.mp3', 'assets/music/home_phase3.mp3'].map(file => ({ file, sha256: sha256(path.join(MOBILE, file)) })),
      warnings: source.warnings,
      validation: ['900 actual video frames', '1080×1920, 30 fps, H.264/yuv420p', 'AAC stereo, 48 kHz', '30-second duration', 'Complete ffmpeg decode without errors'],
    };
    writeFileSync(sidecar, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(path.join(path.dirname(sidecar), draft ? 'trailer-draft-commands.json' : 'trailer-commands.json'), JSON.stringify(logs, null, 2) + '\n');
    console.log(`${output}\n${sidecar}\nVerified: 30 seconds, 900 frames, 1080×1920, H.264/AAC.`);
  } finally {
    if (keepWork) console.log(`Intermediate files: ${work}`);
    else rmSync(work, { recursive: true, force: true });
  }
}

try {
  if (args.includes('--help')) { usage(); process.exit(0); }
  const known = new Set(['--help', '--check-tools', '--preflight', '--draft', '--root', '--keep-work']);
  for (let index = 0; index < args.length; index++) {
    if (!known.has(args[index])) fail(`Unknown option: ${args[index]}`);
    if (args[index] === '--root') { if (!args[index + 1] || args[index + 1].startsWith('--')) fail('--root needs a directory.'); index++; }
  }
  const rootIndex = args.indexOf('--root');
  const root = rootIndex >= 0 ? path.resolve(args[rootIndex + 1]) : DEFAULT_ROOT;
  const ffmpegVersion = checkTools();
  if (args.includes('--check-tools')) { console.log(`${ffmpegVersion}\nffprobe, libx264, AAC, filters, fonts, owned music and wordmark: ready.`); process.exit(0); }
  const source = readSources(root, args.includes('--draft'));
  for (const warning of source.warnings) console.warn(`Source quality note: ${warning}`);
  if (args.includes('--preflight')) { console.log(`Ready: ${source.clips.size} real recordings, ${source.segments.length} approved segments, 30 seconds. Mode: ${args.includes('--draft') ? 'review draft' : 'production'}.`); process.exit(0); }
  render(root, source, args.includes('--draft'), args.includes('--keep-work'), ffmpegVersion);
} catch (error) {
  console.error(`Trailer build stopped: ${error.message}`);
  process.exitCode = 1;
}
