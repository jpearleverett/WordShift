#!/usr/bin/env node
/**
 * User-requested source-asset composition experiment. No app, browser, server,
 * native runtime, game save, or live capture is used by this renderer.
 * These authored promotional reconstructions are deliberately kept separate
 * from the authentic-capture launch pipeline and never written to its raw/.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';
import { createHouseRenderer } from './assembledHouse.mjs';
import { createPuzzleRenderer } from './assembledPuzzle.mjs';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = path.join(MOBILE, 'assets/Play_store/assembly-experiment');
const OUT = path.join(MOBILE, 'store-output/assembly-experiment');
const W = 1080, H = 1920, BODY = 1540, TOP = 260, FPS = 30, SECONDS = 18;
const args = process.argv.slice(2);
const onlyStills = args.includes('--stills-only');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rel = p => path.relative(MOBILE, p).split(path.sep).join('/');
const sha = async p => createHash('sha256').update(await fs.readFile(p)).digest('hex');
const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
const fonts = {
  heading: ['Epunda Slab Bold', 'EpundaSlab-Bold.ttf'],
  body: ['Figtree-Regular', 'Figtree-Regular.ttf'],
};

if (args.includes('--help')) {
  console.log('Usage: node scripts/store/buildAssemblyExperiment.mjs [--stills-only]\nBuild three assembled promotional studies, an 18-second animated preview, and an offline review. These are reconstructions, not app screenshots.');
  process.exit(0);
}
for (const arg of args) if (!['--stills-only'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
await fs.mkdir(path.join(ROOT, 'images'), { recursive: true });
await fs.mkdir(path.join(ROOT, 'source'), { recursive: true });
await fs.mkdir(OUT, { recursive: true });

async function text(s, {font='heading', size=78, width=932, color='#274C3E'}={}) {
  for (let n=size; n>=20; n--) {
    const r = await sharp({text:{text:`<span foreground="${color}">${esc(s)}</span>`,font:`${fonts[font][0]} ${n}`,fontfile:path.join(MOBILE,'assets/fonts',fonts[font][1]),rgba:true,dpi:72}}).png().toBuffer({resolveWithObject:true});
    if (r.info.width <= width) return {input:r.data,width:r.info.width,height:r.info.height,size:n};
  }
  throw new Error(`Caption cannot fit: ${s}`);
}

const copy = JSON.parse(await fs.readFile(path.join(MOBILE,'assets/Play_store/launch-2026-09-v2/copy/listing-en-US.json'),'utf8'));
const puzzle = await createPuzzleRenderer({width:W,height:BODY});
const home = await createHouseRenderer({width:W,height:BODY,phase:1});
const night = await createHouseRenderer({width:W,height:BODY,phase:3});
const scenes = [
  {id:'01-one-letter',title:'The letter move',copy:copy.screenshots[0],renderer:puzzle,time:0,dark:false},
  {id:'02-build-a-home',title:'A growing home',copy:copy.screenshots[1],renderer:home,time:1,dark:false},
  {id:'03-after-dark',title:'A hint of mystery',copy:copy.screenshots[3],renderer:night,time:1,dark:true},
];
for (const scene of scenes) {
  const bg = scene.dark ? '#13282A' : '#F7EDDA';
  const heading = await text(scene.copy.headline,{color:scene.dark?'#F7EDDA':'#274C3E'});
  const sub = await text(scene.copy.subtitle,{font:'body',size:38,color:scene.dark?'#DBCEB0':'#586653'});
  const label = await text('ASSEMBLED PREVIEW · SOURCE ASSETS',{font:'body',size:23,width:850,color:scene.dark?'#DBCEB0':'#586653'});
  const wordmark = await sharp(path.join(MOBILE,'assets/ui/wordmark.png')).resize({width:180}).png().toBuffer({resolveWithObject:true});
  scene.shell = await sharp({create:{width:W,height:H,channels:4,background:bg}}).composite([
    {input:heading.input,left:74,top:68},
    {input:sub.input,left:77,top:165},
    {input:svg(`<rect x="77" y="226" width="104" height="4" fill="#B39759"/><path d="M76 1822H1004" stroke="${scene.dark?'#486056':'#D3C5A5'}"/>`)},
    {input:wordmark.data,left:76,top:1842},
    {input:label.input,left:Math.round(W-76-label.width),top:1857},
  ]).png().toBuffer();
  scene.typography = {headingSize:heading.size,subtitleSize:sub.size,disclosureSize:label.size};
}

async function frame(scene,t,raw=false) {
  const body = await scene.renderer.render(t);
  const output = sharp(scene.shell).composite([{input:body,left:0,top:TOP}]).removeAlpha();
  return raw ? output.raw().toBuffer() : output.png({compressionLevel:6}).toBuffer();
}

for (const scene of scenes) {
  const p = path.join(ROOT,'images',`${scene.id}.png`);
  await fs.writeFile(p,await frame(scene,scene.time));
  scene.file=p;
  console.log(`Wrote ${rel(p)}`);
}
const after = path.join(ROOT,'images','01-one-letter-result.png');
await fs.writeFile(after,await frame(scenes[0],4.5));

const contactLayers=[];
for(let i=0;i<scenes.length;i++) contactLayers.push({input:await sharp(scenes[i].file).resize(360,640).toBuffer(),left:20+i*380,top:20});
const contact=path.join(ROOT,'contact-sheet.png');
await sharp({create:{width:1160,height:680,channels:3,background:'#E8E1D3'}}).composite(contactLayers).png().toFile(contact);

const video = path.join(OUT,'WordShift-Assembled-Preview.mp4');
let videoEvidence = null;
if (!onlyStills) {
  const tmpVideo=path.join(OUT,'WordShift-Assembled-Preview.partial.mp4');
  const soundtrack=['puzzle_phase0.mp3','home_phase1.mp3','home_phase3.mp3'].map(f=>path.join(MOBILE,'assets/music',f));
  const audio=soundtrack.map((_,i)=>`[${i+1}:a]atrim=duration=6,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.35,afade=t=out:st=5.6:d=0.4[a${i}]`).join(';')+';[a0][a1][a2]concat=n=3:v=0:a=1,loudnorm=I=-18:TP=-2:LRA=9[a]';
  const child=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',`${W}x${H}`,'-framerate',String(FPS),'-i','pipe:0',...soundtrack.flatMap(p=>['-i',p]),'-filter_complex',audio,'-map','0:v','-map','[a]','-t',String(SECONDS),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-b:a','160k','-movflags','+faststart',tmpVideo],{stdio:['pipe','ignore','pipe']});
  let stderr=''; child.stderr.on('data',d=>{stderr+=d.toString();});
  child.stdin.on('error',()=>{});
  const closed=once(child,'close');
  for(let i=0;i<FPS*SECONDS;i++) {
    const index=Math.min(2,Math.floor(i/(FPS*6)));
    const t=(i-index*FPS*6)/FPS;
    const pixels=await frame(scenes[index],t,true);
    if (!child.stdin.write(pixels)) await Promise.race([once(child.stdin,'drain'),closed.then(([code])=>{throw new Error(`Video encoder stopped (${code}): ${stderr}`);})]);
    if(i%90===0) console.log(`Animated preview: ${i/FPS}/${SECONDS} seconds rendered`);
  }
  child.stdin.end();
  const [code]=await closed;
  if(code!==0) throw new Error(`Video encoding failed: ${stderr}`);
  await fs.rename(tmpVideo,video);
  const inspected=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video],{encoding:'utf8'}));
  const v=inspected.streams.find(s=>s.codec_type==='video');
  const a=inspected.streams.find(s=>s.codec_type==='audio');
  if(v?.width!==W || v?.height!==H || Number(v.nb_read_frames)!==FPS*SECONDS || Math.abs(Number(inspected.format.duration)-SECONDS)>0.1 || !a) throw new Error('Preview failed video/audio/dimension/duration validation.');
  videoEvidence={file:rel(video),sha256:await sha(video),bytes:(await fs.stat(video)).size,width:v.width,height:v.height,frames:Number(v.nb_read_frames),durationSeconds:Number(inspected.format.duration),videoCodec:v.codec_name,audioCodec:a.codec_name,audioSampleRate:Number(a.sample_rate)};
  console.log(`Wrote ${rel(video)}`);
}

const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:MOBILE,encoding:'utf8'}).trim();
const files=await Promise.all([...scenes.map(s=>s.file),after,contact].map(async p=>({file:rel(p),sha256:await sha(p),bytes:(await fs.stat(p)).size})));
const provenance={schemaVersion:1,status:'assembled-review-experiment',sourceCommit,renderMethod:'Sharp/libvips/Pango image composition using existing repository assets and source-derived style values. No app runtime or browser.',notLiveCapture:true,notVerifiedAndroidPixels:true,userAuthorizedAssembly:true,canvas:[W,H],scenes:scenes.map(s=>({id:s.id,title:s.title,headline:s.copy.headline,subtitle:s.copy.subtitle,typography:s.typography,source:s.renderer.provenance})),animation:{durationSeconds:SECONDS,fps:FPS,nature:'Authored animation of an actual legal letter move and existing walk sprite frames; not recorded gameplay.',timeline:[{start:0,end:6,scene:'01-one-letter'},{start:6,end:12,scene:'02-build-a-home'},{start:12,end:18,scene:'03-after-dark'}],music:['assets/music/puzzle_phase0.mp3','assets/music/home_phase1.mp3','assets/music/home_phase3.mp3'],exported:!onlyStills,output:videoEvidence},files};
await fs.writeFile(path.join(ROOT,'source/provenance.json'),JSON.stringify(provenance,null,2)+'\n');

const cards=await Promise.all(scenes.map(async s=>`<figure><img src="data:image/png;base64,${(await fs.readFile(s.file)).toString('base64')}" alt="${esc(s.title)} — assembled promotional reconstruction"><figcaption>${esc(s.title)}</figcaption></figure>`));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordShift · Assembly experiment</title><style>*{box-sizing:border-box}body{margin:0;background:#eee8dc;color:#233e34;font:17px/1.6 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:40px 24px}header{max-width:820px}small{letter-spacing:.12em;font-weight:700;color:#6b745c}h1{font-family:Georgia,serif;font-size:clamp(34px,5vw,62px);line-height:1.1;margin:16px 0}p{max-width:78ch}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin:36px 0}figure{margin:0}img{width:100%;height:auto;display:block;box-shadow:0 10px 28px #233e3420}figcaption{font-weight:650;margin-top:10px}aside{padding:22px 26px;background:#fff9ec;border-left:4px solid #ae884f;max-width:920px}video{display:block;width:min(100%,432px);border-radius:8px;margin:24px 0;background:#13282a}a{color:#275c45}@media(max-width:680px){main{padding:28px 16px}section{grid-template-columns:1fr;gap:30px}figure{max-width:460px;margin:auto}aside{padding:18px}}</style><main><header><small>WORDSHIFT · CREATIVE STUDY 01</small><h1>One letter.<br>A home full of secrets.</h1><p>Three assembled studies made from the game's existing artwork, sprites, fonts and source-defined puzzle. The goal is to judge clarity, warmth and the hint of mystery before expanding this production route.</p></header><section>${cards.join('')}</section><h2>18-second motion study</h2><p>A legal letter move leads into a walking household, then the phase-3 night atmosphere. The soundtrack uses the game's existing music.</p>${onlyStills?'<p>Video is not included in this still-image export.</p>':'<video controls playsinline preload="metadata" src="WordShift-Assembled-Preview.mp4"></video><p>The MP4 is supplied alongside this review.</p>'}<aside><strong>What you are reviewing</strong><p>These are authored promotional reconstructions. Art and sprite frames come from the game; composition, movement timing and selected interface details are assembled outside the app. They are not screenshots or recordings of the running Android game. The images carry an assembled-preview label and are kept out of the production screenshot upload set.</p></aside><p>Source scripts and provenance are preserved on the feature branch. No app code, game saves or published listing were changed for this experiment.</p></main></html>`;
await fs.writeFile(path.join(OUT,'WordShift-Assembly-Review.html'),html);
console.log(`Wrote ${rel(path.join(OUT,'WordShift-Assembly-Review.html'))}`);
