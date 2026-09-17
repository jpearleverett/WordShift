#!/usr/bin/env node
/**
 * Reproducible visual review of the actual committed walk assets. This only
 * renders evidence; it never draws, retouches, or changes character artwork.
 *
 * node scripts/tools/buildWalkReview.mjs --html /tmp/walk-review.html
 * Add --evidence-dir ../docs/visual-review/walking to render PNG/GIF evidence.
 * Requires the repository's sharp package and ffmpeg on PATH for GIF output.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let htmlPath = path.resolve('walk-review.html');
let evidenceDir;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--html') htmlPath = path.resolve(args[++i]);
  else if (args[i] === '--evidence-dir') evidenceDir = path.resolve(args[++i]);
  else throw new Error(`Unknown option: ${args[i]}`);
}
const ANIMALS = ['fox', 'owl', 'pangolin', 'axolotl', 'capybara', 'fennec_fox', 'sloth', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];
const runtime = await fs.readFile(path.join(MOBILE, 'src/components/home/AnimalSprite.tsx'), 'utf8');
const speedBlock = runtime.match(/const MOVEMENT_SPEED:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1];
if (!speedBlock) throw new Error('Cannot read runtime species cadence');
const speeds = Object.fromEntries([...speedBlock.matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));
const box = Number(runtime.match(/const WALK_SPRITE_BOX = ([\d.]+)/)?.[1]);
const foxScale = Number(runtime.match(/const WALK_MATCH_SCALE = ([\d.]+)/)?.[1]);
const foxFootFraction = Number(runtime.match(/WALK_SPRITE_BOX \* \(([\d.]+) - 0.5\)/)?.[1]);
const foxFrameMs = Number(runtime.match(/const WALK_FRAME_MS = ([\d.]+)/)?.[1]);
if (![box, foxScale, foxFootFraction, foxFrameMs].every(Number.isFinite)) throw new Error('Cannot read runtime fox geometry');
const foxFootCorrection = -box * (foxFootFraction - 0.5) * (foxScale - 1);
const asData = (bytes) => `data:image/png;base64,${bytes.toString('base64')}`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const title = (s) => s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const cycles = [];
const sources = [];
for (const animal of ANIMALS) {
  for (const pose of ['normal', 'robed']) {
    const foxNormal = animal === 'fox' && pose === 'normal';
    const count = foxNormal ? 10 : 8;
    const frames = [];
    if (foxNormal) {
      for (let frame = 0; frame < count; frame++) {
        const source = `assets/characters/fox/walk_${frame}.png`;
        const bytes = await fs.readFile(path.join(MOBILE, source));
        frames.push(asData(bytes));
        sources.push({ path: `mobile/${source}`, sha256: hash(bytes) });
      }
    } else {
      const source = `assets/characters/${animal}/${pose === 'robed' ? 'robed_walk' : 'walk'}.png`;
      const bytes = await fs.readFile(path.join(MOBILE, source));
      const info = await sharp(bytes).metadata();
      if (info.width !== 1024 || info.height !== 512) throw new Error(`${source}: expected a 4×2 atlas of 256px cells`);
      for (let frame = 0; frame < count; frame++) {
        const png = await sharp(bytes).extract({ left: frame % 4 * 256, top: Math.floor(frame / 4) * 256, width: 256, height: 256 }).png().toBuffer();
        frames.push(asData(png));
      }
      sources.push({ path: `mobile/${source}`, sha256: hash(bytes) });
    }
    // The review uses the reference travel pace. Actual runtime cadence also
    // adjusts to wander distance and story phase; the frame order is unchanged.
    const frameMs = animal === 'fox' ? foxFrameMs : Math.max(100, Math.min(200, speeds[animal] * 0.032));
    cycles.push({ animal, name: title(animal), pose, count, frameMs, scale: foxNormal ? foxScale : 1, correction: foxNormal ? foxFootCorrection : 0, frames });
  }
}

const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WordShift — walking review</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f3efe5;color:#252e28;font:15px system-ui,sans-serif}header{padding:20px 24px;background:#fdfaf3;border-bottom:1px solid #c8cbbb;position:sticky;top:0;z-index:2}h1{font-size:23px;margin:0 0 8px}p{max-width:1050px;margin:8px 0;line-height:1.45}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px}button,select{font:inherit;padding:7px 12px;border:1px solid #9da997;border-radius:6px;background:white;color:#253526}input[type=range]{width:220px}main{padding:18px;max-width:1600px;margin:auto}.animal{background:#fffdf7;border:1px solid #cad0be;border-radius:12px;padding:16px;margin-bottom:18px}.animal h2{margin:0 0 14px;font-size:20px}.poses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.pose{background:#e5e9da;padding:12px;border-radius:7px}h3{margin:0;font-size:16px}.playback{display:flex;align-items:end;gap:25px;min-height:225px;padding:10px}.sample{text-align:center}.sample span{display:block;font-size:12px}.sample canvas{display:block;background:linear-gradient(transparent calc(100% - 2px),#bcc6ad 2px);overflow:visible}.compare{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.comparison{text-align:center;font-size:11px}.comparison canvas{display:block;background:#f5f5eb}.meta{font-size:12px;color:#52614e;margin:8px 0}.frame{font-variant-numeric:tabular-nums;font-weight:600}@media(max-width:700px){.poses{grid-template-columns:1fr}.playback{justify-content:center}header{position:static}}
</style>
<header><h1>WordShift walking — all 13 animals, both outfits</h1>
<p>Actual shipped PNGs, complete cycles, no replacement artwork. The small view uses the game's ${box}px sprite viewport; the larger view is 2×. Fox retains its original 10 frames, ${foxScale}× scale and ${foxFootCorrection.toFixed(2)}px foot correction. This asset review omits room movement, phase tint and other scene transforms; verify those in the app.</p>
<div class="controls"><button id="play">Pause</button><button id="direction">Facing right →</button><label>Speed <select id="speed"><option value="2">½×</option><option value="1" selected>1×</option><option value="1.8">Phase 4 cadence</option></select></label><label>Cycle scrub <input id="scrub" type="range" min="0" max="999" value="0"></label><output id="position">0%</output><button id="restart">Restart cycles</button></div>
<p class="meta">All indices are zero-based. New 8-frame cycles: contact poses 0/4 and passing poses 2/6. The original fox uses approximate matching phases 0/5 and 2/7. Scrubbing covers every frame; playback preserves each species' base cadence.</p></header><main id="main"></main>
<script>
const cycles=${JSON.stringify(cycles)};
let playing=true, left=false, elapsed=0, last=performance.now(), speed=1;
const root=document.querySelector('#main');
const views=[];
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size*2;c.style.width=c.style.height=size+'px';return c;}
for(let i=0;i<cycles.length;i+=2){
 const animal=document.createElement('section');animal.className='animal';animal.id=cycles[i].animal;animal.innerHTML='<h2>'+cycles[i].name+'</h2><div class="poses"></div>';root.append(animal);
 for(const cycle of cycles.slice(i,i+2)){
  const pose=document.createElement('section');pose.className='pose';pose.dataset.animal=cycle.animal;pose.dataset.pose=cycle.pose;
  pose.innerHTML='<h3>'+cycle.pose[0].toUpperCase()+cycle.pose.slice(1)+'</h3><p class="meta">'+cycle.count+' frames · '+cycle.frameMs+'ms/frame at reference pace · <span class="frame"></span></p><div class="playback"></div><div class="compare"></div>';
  animal.querySelector('.poses').append(pose);
  const screens=[];
  for(const size of [${box},${box * 2}]){const wrap=document.createElement('div');wrap.className='sample';const c=canvas(size);wrap.append(c);const label=document.createElement('span');label.textContent=size===${box}?'90px game viewport':'180px · 2×';wrap.append(label);pose.querySelector('.playback').append(wrap);screens.push(c);}
  const checkpoints=cycle.count===10?[0,5,2,7]:[0,4,2,6];const comparisons=[];
  for(const [j,index] of checkpoints.entries()){const item=document.createElement('div');item.className='comparison';const c=canvas(100);item.append(c);item.append((j<2?'Contact ':'Passing ')+index);pose.querySelector('.compare').append(item);comparisons.push({canvas:c,index});}
  const images=cycle.frames.map(src=>{const image=new Image();image.src=src;return image;});views.push({cycle,images,screens,comparisons,elapsed:0,label:pose.querySelector('.frame')});
 }
}
function draw(c,image,cycle){if(!image.complete||!image.naturalWidth)return;const ctx=c.getContext('2d');const size=c.width;ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(size/2,size/2+cycle.correction*size/${box});ctx.scale(left?-cycle.scale:cycle.scale,cycle.scale);ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore();}
function setPhase(phase){phase=Math.max(0,Math.min(1-Number.EPSILON,phase));elapsed=phase*8*125;for(const view of views)view.elapsed=phase*view.cycle.frameMs*view.cycle.count;}
function tick(now){const delta=(now-last)/speed;if(playing)elapsed+=delta;last=now;for(const view of views){if(playing)view.elapsed+=delta;const index=Math.floor(view.elapsed/view.cycle.frameMs)%view.cycle.count;for(const c of view.screens)draw(c,view.images[index],view.cycle);for(const c of view.comparisons)draw(c.canvas,view.images[c.index],view.cycle);view.label.textContent='Frame '+index+'/'+(view.cycle.count-1);}
 if(playing){const phase=elapsed%(8*125)/(8*125);document.querySelector('#scrub').value=Math.floor(phase*999);document.querySelector('#position').textContent=Math.floor(phase*100)+'% (reference cycle)';}requestAnimationFrame(tick);}
document.querySelector('#play').onclick=()=>{playing=!playing;document.querySelector('#play').textContent=playing?'Pause':'Play';};
document.querySelector('#direction').onclick=()=>{left=!left;document.querySelector('#direction').textContent=left?'← Facing left':'Facing right →';};
document.querySelector('#speed').onchange=e=>{speed=Number(e.target.value);};
document.querySelector('#scrub').oninput=e=>{playing=false;const phase=Number(e.target.value)/1000;setPhase(phase);document.querySelector('#play').textContent='Play';document.querySelector('#position').textContent=(phase*100).toFixed(1)+'%';};
document.querySelector('#restart').onclick=()=>{setPhase(0);document.querySelector('#scrub').value=0;document.querySelector('#position').textContent='0%';};
window.__walkReview={cycles:cycles.map(({frames,...metadata})=>metadata),setFramePhase(phase){playing=false;setPhase(phase);document.querySelector('#play').textContent='Play';},setDirection(direction){left=direction==='left';}};
requestAnimationFrame(tick);
</script></html>`;
await fs.mkdir(path.dirname(htmlPath), { recursive: true });
await fs.writeFile(htmlPath, html);
console.log(`Wrote self-contained review: ${htmlPath} (${cycles.length} complete cycles)`);

if (evidenceDir) {
  await fs.mkdir(evidenceDir, { recursive: true });
  const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const text = (x, y, value, size = 18, fill = '#29392e') => `<text x="${x}" y="${y}" fill="${fill}" font-family="DejaVu Sans,sans-serif" font-size="${size}">${escape(value)}</text>`;
  function sprite(cycle, index, x, y, size, left = false) {
    const scale = cycle.scale;
    return `<g transform="translate(${x + size / 2} ${y + size / 2 + cycle.correction * size / box}) scale(${left ? -scale : scale} ${scale})"><image href="${cycle.frames[index]}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/></g>`;
  }
  const svg = (width, height, content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f5f3e9"/>${content}</svg>`);
  for (const animal of ANIMALS) {
    const pair = cycles.filter(c => c.animal === animal);
    const columns = Math.max(...pair.map(c => c.count));
    const width = columns * 185 + 24;
    let body = text(18, 32, `${title(animal)} — chronological complete cycles`, 24);
    body += text(18, 56, '180px viewport (2× game size). Frame indices start at 0. Original fox includes all 10 frames.', 14);
    pair.forEach((cycle, row) => {
      const top = 85 + row * 230;
      body += text(18, top, `${title(cycle.pose)} · ${cycle.count} frames · ${cycle.frameMs}ms per frame at reference pace`, 17);
      for (let i = 0; i < cycle.count; i++) {
        const x = 12 + i * 185;
        body += `<rect x="${x}" y="${top + 12}" width="180" height="180" fill="#e4e9d9"/>`;
        body += sprite(cycle, i, x, top + 12, 180);
        body += text(x + 80, top + 212, String(i), 16);
      }
    });
    await sharp(svg(width, 550, body)).png().toFile(path.join(evidenceDir, `${animal}-frames.png`));
  }
  const groups = [ANIMALS.slice(0, 3), ANIMALS.slice(3, 6), ANIMALS.slice(6, 9), ANIMALS.slice(9)];
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'wordshift-walk-review-'));
  try {
    for (let group = 0; group < groups.length; group++) {
      const animals = groups[group];
      const width = 790;
      const height = 98 + animals.length * 235;
      const frameDirectory = path.join(temporary, String(group));
      await fs.mkdir(frameDirectory);
      // Ten seconds includes repeated complete cycles, including all 10 fox
      // frames. First five seconds face right, then the same art faces left.
      for (let frame = 0; frame < 100; frame++) {
        const left = frame >= 50;
        let body = text(18, 31, `WordShift walking · ${group + 1}/${groups.length} · ${left ? 'Facing left' : 'Facing right'}`, 24);
        body += text(18, 57, 'Normal outfit', 17) + text(412, 57, 'Robed outfit', 17);
        body += text(18, 80, '90px game viewport + 180px enlargement · actual assets · reference cadence', 13);
        animals.forEach((animal, row) => {
          const y = 105 + row * 235;
          body += text(18, y, title(animal), 19);
          const pair = cycles.filter(c => c.animal === animal);
          pair.forEach((cycle, pose) => {
            const x = 10 + pose * 395;
            const index = Math.floor(frame * 100 / cycle.frameMs) % cycle.count;
            body += `<rect x="${x}" y="${y + 12}" width="380" height="198" rx="8" fill="#e4e9d9"/>`;
            body += sprite(cycle, index, x + 24, y + 96, 90, left);
            body += sprite(cycle, index, x + 153, y + 15, 180, left);
            body += text(x + 30, y + 224, `90px · frame ${index}`, 12);
            body += text(x + 220, y + 224, '2×', 12);
          });
        });
        await sharp(svg(width, height, body)).png().toFile(path.join(frameDirectory, `${String(frame).padStart(3, '0')}.png`));
      }
      const output = path.join(evidenceDir, `walk-group-${group + 1}.gif`);
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '10', '-i', path.join(frameDirectory, '%03d.png'), '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', output], { stdio: 'inherit' });
      console.log(`Wrote ${output}: ${animals.join(', ')}`);
    }
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
  await fs.writeFile(path.join(evidenceDir, 'asset-checksums.json'), JSON.stringify({ schema: 1, renderer: 'mobile/scripts/tools/buildWalkReview.mjs', viewport: box, foxNormal: { frameCount: 10, scale: foxScale, footCorrection: foxFootCorrection }, cycles: cycles.map(({ frames, ...metadata }) => metadata), sources }, null, 2) + '\n');
  await fs.writeFile(path.join(evidenceDir, 'README.md'), `# Walking visual review\n\nRebuild from the current runtime assets (from \`mobile/\`):\n\n\`\`\`sh\nnode scripts/tools/buildWalkReview.mjs --html /tmp/wordshift-walk-review.html --evidence-dir ../docs/visual-review/walking\n\`\`\`\n\nThe self-contained HTML provides pause, complete-cycle scrubbing, direction reversal, 90px and 180px viewports, and contact/passing comparisons. All evidence uses the real packed PNGs; it does not create or retouch artwork. The fox's original normal walk retains all ten frames, its 1.1× runtime scale, and foot correction. Other walks have eight frames. Base species cadence is read from the runtime; actual in-game cadence also varies with travel distance and story phase. Room placement, scene transforms and phase tint require separate in-app review.\n\nGIFs show both outfits, both sizes and both directions. Each PNG strip shows every chronological frame of both outfits. Frame indices are zero-based: new cycles use contact poses 0/4 and passing poses 2/6; the original fox's comparison poses are approximately 0/5 and 2/7.\n\n| Playback | Animals |\n| --- | --- |\n${groups.map((animals, i) => `| [Group ${i + 1}](walk-group-${i + 1}.gif) | ${animals.map(title).join(', ')} |`).join('\n')}\n\n\`asset-checksums.json\` records the exact source PNG hashes and rendering geometry. Generated evidence alone does not certify the quality of a gait: inspect the playback, contact pairs, passing pairs, and in-app transitions.\n`);
  console.log(`Wrote 13 chronological strips, 4 playback GIFs and source checksums: ${evidenceDir}`);
}
