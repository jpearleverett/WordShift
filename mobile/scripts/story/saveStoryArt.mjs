import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';
const [id,source,promptSha256]=process.argv.slice(2);
if(!/^[a-z0-9_-]+$/.test(id)||!source?.startsWith('/workspace/scratch/'))throw Error('Invalid generation result');
const root=path.resolve(import.meta.dirname,'../..');
const dir=path.join(root,'assets/story/pages');fs.mkdirSync(dir,{recursive:true});
const output=path.join(dir,id+'.webp');
const temporary=output+'.'+process.pid+'.tmp';
await sharp(source).resize(960,540,{fit:'cover'}).flatten({background:'#f2e5bc'}).webp({quality:83,effort:4}).toFile(temporary);
fs.renameSync(temporary,output);
const bytes=fs.readFileSync(output);
const metaDir=path.join(root,'scripts/story/generation');fs.mkdirSync(metaDir,{recursive:true});
let claim={};try{claim=JSON.parse(fs.readFileSync(path.resolve(root,'../.git/story-art-production-claims',id+'.claim'),'utf8'));}catch{}
const metadata={id,tool:'built-in image_gen',sourceImage:path.basename(source),width:960,height:540,webpQuality:83,encoderEffort:4,flattenBackground:'#f2e5bc',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),generatedAt:new Date().toISOString(),...(claim.prompt?{prompt:claim.prompt}:{}),...(promptSha256||claim.promptSha256?{promptSha256:promptSha256??claim.promptSha256}:{promptProvenance:'Initial queue; prompt source is retained in feature-branch history.'})};
const metaPath=path.join(metaDir,id+'.json');fs.writeFileSync(metaPath+'.tmp',JSON.stringify(metadata,null,2)+'\n');fs.renameSync(metaPath+'.tmp',metaPath);
console.log(id+' '+bytes.length);
