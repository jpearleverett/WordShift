#!/usr/bin/env node
/** Owner-approved promotional assembly. Not native screenshots or captures. */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { createHouseRenderer } from './assembledHouse.mjs';
import { createPuzzleRenderer } from './assembledPuzzle.mjs';
import { MOBILE, asset, image, text, centered, svg, frame, button, rgbaCanvas, assembledBoard, assetManifest, esc, readPure } from './assembledStorePrimitives.mjs';

const ROOT = path.join(MOBILE, 'assets/Play_store/assembled-listing-2026-09');
const OUT = path.join(MOBILE, 'store-output/assembled-listing-2026-09');
const W=1080, H=1920, TOP=240, BODY=1600;
const args=process.argv.slice(2);
if (args.includes('--help')) { console.log('Usage: node scripts/store/buildAssembledListing.mjs [--allow-pending]\nOffline, source-asset promotional assembly only. Final export requires source/daily-board.json and source/choice-art.json.'); process.exit(0); }
for(const arg of args) if(arg!=='--allow-pending') throw new Error(`Unknown argument: ${arg}`);
const partial=args.includes('--allow-pending');
await Promise.all(['export/phone','export','variants','source','copy'].map(dir=>fs.mkdir(path.join(ROOT,dir),{recursive:true})));
await fs.mkdir(OUT,{recursive:true});
const sha=async filename=>createHash('sha256').update(await fs.readFile(filename)).digest('hex');
const relative=p=>path.relative(ROOT,p).split(path.sep).join('/');
const copy=JSON.parse(await fs.readFile(asset('assets/Play_store/launch-2026-09-v2/copy/listing-en-US.json'),'utf8'));
const evidence=[];
const ui=[];
for (const file of ['scripts/store/assembledHouse.mjs','scripts/store/assembledPuzzle.mjs','scripts/store/assembledStorePrimitives.mjs','scripts/store/buildAssembledListing.mjs','scripts/store/packageAssembledListing.py','src/components/StorySceneModal.tsx','src/components/StoryPortrait.tsx']) asset(file);

async function shell(body, caption, dark=false) {
  const bg=dark?'#13282A':'#F7EDDA';
  const heading=await text(caption.headline,{font:'title',size:80,width:930,color:dark?'#F7EDDA':'#274C3E'});
  const sub=await text(caption.subtitle,{size:38,width:925,color:dark?'#DBCEB0':'#586653'});
  const mark=await sharp(asset('assets/ui/wordmark.png')).resize({width:180}).png().toBuffer();
  const result=await rgbaCanvas(W,H,bg).composite([
    {input:heading.input,left:74,top:55}, {input:sub.input,left:77,top:153},
    {input:svg(W,H,`<path d="M77 212H181" stroke="#B39759" stroke-width="4"/><path d="M76 1840H1004" stroke="${dark?'#486056':'#D3C5A5'}"/>`)},
    {input:body,left:0,top:TOP}, {input:mark,left:76,top:1860},
  ]).removeAlpha().png({compressionLevel:9}).toBuffer();
  return {result, typography:{headingSize:heading.size,subtitleSize:sub.size}, promotionalCaptionArea: { top:TOP,bottom:H-TOP-BODY,fraction:(H-BODY)/H } };
}
async function writeScene(index, body, source, extra={}) {
  const caption=copy.screenshots[index];
  const rendered=await shell(body,caption,index===3);
  const file=path.join(ROOT,'export/phone',`${caption.slug}.png`);
  await fs.writeFile(file,rendered.result);
  const item={order:index+1,id:caption.slug,file:relative(file),headline:caption.headline,subtitle:caption.subtitle,typography:rendered.typography,promotionalCaptionArea:rendered.promotionalCaptionArea,source,...extra};
  evidence.push(item);ui.push({...item,absolute:file});
  console.log(`Wrote ${relative(file)}`);
}
const puzzle=await createPuzzleRenderer({width:W,height:BODY});
const home=await createHouseRenderer({width:W,height:BODY,phase:1,includePit:true,bottomClearance:70});
const night=await createHouseRenderer({width:W,height:BODY,phase:3,includePit:true,bottomClearance:70});
const dayBody=await home.render(1);
await writeScene(0,await puzzle.render(0),puzzle.provenance,{altText:'A selected L in PLAY can move into PANT to make PAY and PLANT. A third row reads HEAR.'});
await writeScene(1,dayBody,home.provenance,{altText:'A bright woodland house with three furnished rooms and Archimedes, Panko and Ember. The complete path and pit entrance are visible below the foundation.'});

// Exact early Ember line. Typography and sheet sizing are editorial; the
// wording, original portrait, frame art and dialogue anatomy come from source.
const dialogueSource=await fs.readFile(asset('src/services/dialogue/animalDialogueBase.ts'),'utf8');
const line=/id: 'fx_0_2', text: "([^"]+)"/.exec(dialogueSource)?.[1];
if(!line) throw new Error('Warm Ember dialogue changed; review source before exporting.');
const dialogueFrame=await frame(1016,705,{scale:2.5});
const dialogueCard=await frame(609,378,{kind:'card',scale:2.35});
const speech=await text(line,{font:'reading',size:40,width:498,wrap:true});
if(speech.height>300) throw new Error('Ember dialogue overflows its card');
const dialogLayers=[
  {input:svg(W,BODY,'<rect width="100%" height="100%" fill="#142A20" opacity=".17"/>')},
  {input:dialogueFrame,left:32,top:862},
  {input:await image('assets/characters/fox/talk.png',328,328),left:57,top:989},
  await centered('Ember',214,1350,{font:'bold',size:43,color:'#764492'}),
  {input:dialogueCard,left:379,top:960},
  {input:speech.input,left:434,top:1016},
  {input:await button('Continue',572,{fontSize:39}),left:409,top:1372},
];
await writeScene(2,await sharp(dayBody).composite(dialogLayers).removeAlpha().png().toBuffer(),{sourceLineId:'fx_0_2',exactDialogue:line,portrait:'assets/characters/fox/talk.png',house:home.provenance,interface:'Source cottage frame, left portrait/name column and right dialogue card; editorial sheet geometry.'},{altText:`Ember the fox says, “${line}” in a cottage dialogue sheet over a furnished woodland house.`});
await writeScene(3,await night.render(1),night.provenance,{altText:'The woodland house beneath a deep blue night sky, with lit furnished rooms and normal residents. The whole path and pit entrance remain in frame.'});

const bank=await readPure('src/data/puzzleBankDoubleShiftEasy.ts');
const sourceDouble=bank.PUZZLE_BANK_DOUBLE_SHIFT_EASY.find(board=>board.id==='75d40a43d494');
if(sourceDouble?.words.join('/')!=='FLIPS/LOWER/WAVES')throw new Error('The shipping Double Shift board changed; re-review the reconstruction.');
const doubleBoard={words:['LIP','FLOWERS','WAVES'],activeRow:1,locked:{1:[0,6]},mode:'DOUBLE SHIFT',difficulty:'EASY'};
await writeScene(4,await assembledBoard(doubleBoard),{boardId:'75d40a43d494',sourceBank:'src/data/puzzleBankDoubleShiftEasy.ts',before:['FLIPS','LOWER','WAVES'],after:doubleBoard.words,moves:[{letter:'F',from:'FLIPS',to:'LOWER',insertionPosition:0,result:'FLOWER'},{letter:'S',from:'LIPS',to:'FLOWER',insertionPosition:6,result:'FLOWERS'}],lockedLetters:['F','S'],note:'The first pair is complete, not the whole puzzle. Both moved letters are locked in FLOWERS.'},{altText:'A Double Shift board after moving F and S: FLIPS became LIP, and LOWER became FLOWERS. The moved F and S are locked; WAVES is the next row.'});

const dailyFile=path.join(ROOT,'source/daily-board.json');
try {
  const daily=JSON.parse(await fs.readFile(dailyFile,'utf8'));
  const board=daily.board??daily;
  if(!board.words?.length||!board.date||!board.boardVersion) throw new Error('Daily provenance needs actual words, date and boardVersion');
  const d=new Date(`${board.date}T12:00:00Z`);
  const displayDate=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);
  await writeScene(5,await assembledBoard({words:board.words,mode:'DAILY CHALLENGE',date:displayDate,difficulty:board.difficulty??board.ramp?.difficulty}),daily,{altText:`The shared Daily Challenge for ${displayDate}, showing ${board.words.join(', ')}. No score, rank or streak is claimed.`});
} catch(error) { if(!partial||error.code!=='ENOENT')throw error; console.log('Daily board pending; partial review only.'); }

const themed=await createPuzzleRenderer({width:W,height:BODY,tileTheme:'theme_ember'});
await writeScene(6,await themed.render(4.5),themed.provenance,{altText:'PAY, PLANT and HEAR after the legal L move. The active PLANT row uses the source Ember-warm tile palette; its moved L stays locked.'});

try {
  const choice=JSON.parse(await fs.readFile(path.join(ROOT,'source/choice-art.json'),'utf8'));
  if(!choice.file||choice.scene!=='cup'||choice.page!==2)throw new Error('Choice art must identify the current cup scene page 2');
  const storySource=await fs.readFile(asset('src/services/storySpine.ts'),'utf8');
  const quote="That flower was meant to be a fox. You can be kind about it, but please don't lie.";
  const options=['The flower cup. Cocoa, please.','The chipped cup. Tea, please.'];
  if(![quote,...options].every(value=>storySource.includes(value)))throw new Error('Choice copy changed; re-review the assembled scene');
  const muted=await sharp(await puzzle.render(0)).composite([{input:svg(W,BODY,'<rect width="100%" height="100%" fill="#22162F" opacity=".78"/>')}]).png().toBuffer();
  const art=await image(choice.file,832,468,'contain','lanczos3');
  const dialogue=await text(quote,{font:'reading',size:38,width:824,wrap:true});
  if(dialogue.height>102)throw new Error('Choice dialogue collides with the page counter');
  const choiceLayers=[{input:await frame(1008,1530,{scale:2.45}),left:36,top:35},{input:art,left:124,top:118},await centered('A place at the table',540,628,{font:'bold',size:49,width:840}),{input:await image('assets/characters/fox/talk.png',180,180),left:450,top:676},await centered('Ember',540,887,{font:'bold',size:38}),{input:dialogue.input,left:128,top:932},await centered('3 / 3',167,1053,{font:'body',size:29,color:'#6B4A2F'})];
  for(let i=0;i<options.length;i++)choiceLayers.push({input:await button(options[i],838,{variant:i===0?'primary':'secondary',fontSize:38,scale:2.05}),left:121,top:1083+i*104});
  choiceLayers.push({input:await button('Previous page',838,{variant:'quiet',fontSize:34,scale:2.05}),left:121,top:1292});
  choiceLayers.push({input:await button('Come back to this',838,{variant:'quiet',fontSize:34,scale:2.05}),left:121,top:1393});
  await writeScene(7,await sharp(muted).composite(choiceLayers).removeAlpha().png().toBuffer(),{scene:'cup',page:2,exactDialogue:quote,choices:options,art:choice,artFrame:{width:832,height:468,aspectRatio:'16:9',fit:'contain',cropped:false},portrait:'assets/characters/fox/talk.png',interface:'Source cottage frame and page-specific runtime art; assembled geometry, persistent Ember portrait sized approximately 88dp.'},{altText:'Ember jokes that the crooked flower on a cup was meant to be a fox. The player can choose the flower cup with cocoa or the chipped cup with tea.'});
}catch(error){if(!partial||error.code!=='ENOENT')throw error;console.log('Updated choice art pending; partial review only.');}

// An isolated opener challenger; panels explicitly show before versus after.
const before=await puzzle.render(0),after=await puzzle.render(4.5);
const topCrop=await sharp(before).extract({left:0,top:377,width:W,height:625}).resize(958,554).png().toBuffer();
const afterCrop=await sharp(after).extract({left:0,top:377,width:W,height:625}).resize(958,554).png().toBuffer();
const comparison=await rgbaCanvas(W,BODY,'#324B40').composite([
  await centered('BEFORE',540,78,{font:'bold',size:33,color:'#F4E7C9'}),{input:topCrop,left:61,top:125},
  await centered('Move L from PLAY into PANT',540,776,{font:'bold',size:40,color:'#F4E7C9',width:920}),
  await centered('AFTER',540,860,{font:'bold',size:33,color:'#F4E7C9'}),{input:afterCrop,left:61,top:909},
]).png().toBuffer();
await fs.writeFile(path.join(ROOT,'variants/01-one-letter-before-after.png'),(await shell(comparison,copy.opener_challenger)).result);

// Re-compose feature artwork exclusively from the game's actual den, window
// mask, fox portrait and logo; the existing generated-art alternative remains
// in its earlier campaign, unmodified.
const room=await image('assets/rooms/cozy_den.png',1024,500,'cover','lanczos3');
const window=await sharp(asset('assets/rooms/windows/cozy_den.png')).resize(1024,500,{fit:'cover'}).ensureAlpha().linear([0,0,0,.88],[27,42,76,0]).png().toBuffer();
const feature=await sharp(room).composite([
  {input:window},
  {input:svg(1024,500,'<defs><linearGradient id="veil"><stop stop-color="#1A291F" stop-opacity=".82"/><stop offset=".65" stop-color="#1A291F" stop-opacity=".53"/><stop offset="1" stop-color="#1A291F" stop-opacity=".04"/></linearGradient></defs><rect width="1024" height="500" fill="url(#veil)"/>')},
  {input:await image('assets/ui/wordmark.png',624,157),left:46,top:104},
  {input:await image('assets/characters/fox/talk.png',345,345),left:652,top:144},
  await centered('One letter.',347,309,{font:'title',size:42,color:'#F5E7C9',width:610}),
  await centered('A home full of secrets.',347,361,{font:'title',size:42,color:'#F5E7C9',width:610}),
]).removeAlpha().png({compressionLevel:9}).toBuffer();
await fs.writeFile(path.join(ROOT,'export/feature-graphic-1024x500.png'),feature);
for(const [source,target] of [['upload/store-icon-512.png','export/store-icon-512.png'],['variants/store-icon-challenger-512.png','variants/store-icon-challenger-512.png']])await fs.copyFile(asset(`assets/Play_store/launch-2026-09-v2/${source}`),path.join(ROOT,target));

evidence.sort((a,b)=>a.order-b.order);ui.sort((a,b)=>a.order-b.order);
const contactLayers=[];
for(let i=0;i<ui.length;i++)contactLayers.push({input:await sharp(ui[i].absolute).resize(270,480).png().toBuffer(),left:24+(i%4)*290,top:24+Math.floor(i/4)*506});
const contact=path.join(ROOT,'contact-sheet.png');
await rgbaCanvas(1184,1036,'#E8E1D3').composite(contactLayers).removeAlpha().png().toFile(contact);
const exportFiles=[...ui.map(item=>item.absolute),...['export/feature-graphic-1024x500.png','export/store-icon-512.png','variants/01-one-letter-before-after.png','variants/store-icon-challenger-512.png','contact-sheet.png'].map(file=>path.join(ROOT,file))];
const files=await Promise.all(exportFiles.map(async file=>{const metadata=await sharp(file).metadata();return{file:relative(file),sha256:await sha(file),bytes:(await fs.stat(file)).size,width:metadata.width,height:metadata.height,channels:metadata.channels,hasAlpha:metadata.hasAlpha};}));
for(const file of files.filter(file=>file.file.includes('/phone/')||file.file.includes('before-after')))if(file.width!==W||file.height!==H||file.channels!==3||file.hasAlpha)throw new Error(`Invalid phone export: ${file.file}`);
const manifest={schemaVersion:1,campaign:'assembled-listing-2026-09',status:evidence.length===8?'assembled-images-complete':'partial-assembled-review',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:MOBILE,encoding:'utf8'}).trim(),method:'Owner-approved offline assembly of existing source artwork and source-derived UI using Sharp/Pango/SVG. No app or browser capture.',genuineGameplayCapture:false,nativeAndroidFidelityVerified:false,publishStatus:'Not uploaded or published',format:{phone:[W,H],aspectRatio:'9:16',color:'RGB PNG, opaque',feature:[1024,500],icon:[512,512],captionFraction:1/6},playGuidance:{source:'https://support.google.com/googleplay/android-developer/answer/9866151',checked:'2026-09-19',reason:'Portrait matches the game. Google recommends 9:16 with at least 1080 × 1920 for games; no more than eight screenshots, with taglines occupying at most 20% of an image.'},scenes:evidence,assets:await assetManifest(),files,limits:['These are promotional reconstructions, not screenshots of the running Android app.','Source art, fonts, words and dialogue are authentic; overall geometry and framing are authored.','House scenes are illustrative three-room selections rather than complete reachable phase-3 save states.','The icon challenger is the previous generated artwork retained as an optional isolated experiment.','Google may apply authenticity and promotional-surface eligibility requirements beyond dimensions; compliance or placement is not guaranteed by passing format checks.']};
await fs.writeFile(path.join(ROOT,'source/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const finalCopy={locale:copy.locale,campaign:manifest.campaign,app_name:copy.app_name,short_description:copy.short_description,full_description:copy.full_description,character_counts:copy.character_counts,screenshots:evidence.map(item=>({order:item.order,file:item.file,headline:item.headline,subtitle:item.subtitle,alt_text:item.altText,asset_method:'Source-asset promotional assembly; not a native screenshot.'}))};
await fs.writeFile(path.join(ROOT,'copy/listing-en-US.json'),JSON.stringify(finalCopy,null,2)+'\n');
for(const [file,value] of [['app-name.txt',copy.app_name],['short-description.txt',copy.short_description],['full-description.txt',copy.full_description]])await fs.writeFile(path.join(ROOT,'copy',file),value+'\n');
await fs.writeFile(path.join(ROOT,'source/alt-text.tsv'),'order\tfile\talt_text\n'+evidence.map(item=>`${item.order}\t${item.file}\t${item.altText}`).join('\n')+'\n');
const cards=async inline=>Promise.all(ui.map(async item=>`<figure><img loading="lazy" src="${inline?'data:image/png;base64,'+(await fs.readFile(item.absolute)).toString('base64'):item.file}" alt="${esc(item.altText)}"><figcaption>${String(item.order).padStart(2,'0')} · ${esc(item.headline)}</figcaption></figure>`));
const html=async inline=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WordShift · Complete store image set</title><style>*{box-sizing:border-box}body{margin:0;background:#eee8dc;color:#233e34;font:17px/1.55 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:36px 24px}header{max-width:860px}h1{font-family:Georgia,serif;font-size:clamp(32px,5vw,62px);line-height:1.12}small{letter-spacing:.12em;font-weight:700}section{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px;margin:32px 0}figure{margin:0}img{width:100%;height:auto;display:block;box-shadow:0 7px 24px #233e3420}figcaption{font-weight:650;margin-top:9px;font-size:15px}aside{padding:20px 24px;background:#fff9ec;border-left:4px solid #ad8a50}.feature{max-width:1024px}.extras{grid-template-columns:repeat(3,minmax(0,1fr));max-width:960px}.extras img{object-fit:contain;max-height:540px;box-shadow:none}a{color:#275c45}@media(max-width:900px){section{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:550px){main{padding:24px 16px}section,.extras{grid-template-columns:1fr}figure{max-width:430px;margin:auto}}</style><main><header><small>WORDSHIFT · PLAY STORE IMAGE SET</small><h1>One letter.<br>A home full of secrets.</h1><p>Eight 1080 × 1920 portrait images in listing order. The full path and pit fit inside the day and night house scenes. Caption and footer bands together occupy 16.7% of each image.</p></header><section>${(await cards(inline)).join('')}</section><h2>Feature graphic</h2><img class="feature" src="${inline?'data:image/png;base64,'+feature.toString('base64'):'export/feature-graphic-1024x500.png'}" alt="WordShift logo and Ember in the cozy den, with a dark blue window and the line One letter. A home full of secrets."><h2>Baseline and optional experiments</h2><section class="extras">${(await Promise.all([['export/store-icon-512.png','Baseline icon'],['variants/store-icon-challenger-512.png','Optional icon challenger'],['variants/01-one-letter-before-after.png','Optional before / after opener']].map(async([file,label])=>`<figure><img src="${inline?'data:image/png;base64,'+(await fs.readFile(path.join(ROOT,file))).toString('base64'):file}" alt="${label}"><figcaption>${label}</figcaption></figure>`))).join('')}</section><aside><strong>Production method</strong><p>These images use the owner-approved assembly method. They combine the game's actual assets, fonts and source-defined puzzle/dialogue content with authored composition. They are promotional reconstructions, not captures of a running Android app. Native pixel fidelity remains unverified. The downloadable ZIP keeps source provenance and optional alternatives separate from the main eight-image set.</p><p>The previous genuine-capture pipeline remains unchanged. These reconstructions do not pass as gameplay footage or satisfy its capture gates. Nothing has been published.</p></aside></main></html>`;
await fs.writeFile(path.join(ROOT,'review.html'),await html(false));
await fs.writeFile(path.join(OUT,'WordShift-Store-Images-Review.html'),await html(true));
await fs.copyFile(contact,path.join(OUT,'WordShift-Store-Images-Contact-Sheet.png'));
console.log(`Complete: ${evidence.length}/8 phone images. Review: ${OUT}`);
