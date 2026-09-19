/** Check authored coverage, unique runtime content, and immutable production metadata. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..');
const expected=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'story-art-prompts.json')));
const missing=[];const invalid=[];const hashes=new Map();let totalBytes=0;
for(const beat of expected){
 const file=path.join(root,'assets/story/pages',beat.id+'.webp');
 const record=path.join(import.meta.dirname,'generation',beat.id+'.json');
 if(!fs.existsSync(file)||!fs.existsSync(record)){missing.push(beat.id);continue;}
 const buffer=fs.readFileSync(file);const digest=crypto.createHash('sha256').update(buffer).digest('hex');const saved=JSON.parse(fs.readFileSync(record));const image=await sharp(buffer).metadata();
 if(saved.sha256!==digest||saved.bytes!==buffer.length||image.width!==960||image.height!==540||image.hasAlpha)invalid.push({id:beat.id,reason:'Metadata, dimensions or opacity mismatch'});
 if(hashes.has(digest))invalid.push({id:beat.id,reason:'Duplicate image content',other:hashes.get(digest)});hashes.set(digest,beat.id);totalBytes+=buffer.length;
 if(saved.prompt&&crypto.createHash('sha256').update(saved.prompt).digest('hex')!==saved.promptSha256)invalid.push({id:beat.id,reason:'Exact prompt hash mismatch'});
}
const result={expected:expected.length,present:expected.length-missing.length,totalBytes,missing,invalid};console.log(JSON.stringify(result,null,2));
if(invalid.length||(!process.argv.includes('--partial')&&missing.length))process.exitCode=1;
