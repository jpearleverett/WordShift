/** Flatten only alpha-bearing deliverables against the story card's parchment. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../..');const dir=path.join(root,'assets/story/pages');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');const changed=[];
for(const file of fs.readdirSync(dir).filter(name=>name.endsWith('.webp'))){
 const output=path.join(dir,file);const before=fs.readFileSync(output);if(!(await sharp(before).metadata()).hasAlpha)continue;
 const id=path.basename(file,'.webp');const metaPath=path.join(import.meta.dirname,'generation',id+'.json');if(!fs.existsSync(metaPath))continue;
 const metadata=JSON.parse(fs.readFileSync(metaPath));if(metadata.sha256!==hash(before))continue;
 const original=path.resolve(root,'../../generated_images',metadata.sourceImage);
 const normalized=await sharp(fs.existsSync(original)?original:before).resize(960,540,{fit:'cover'}).flatten({background:'#f2e5bc'}).webp({quality:83,effort:4}).toBuffer();
 // A concurrently completed replacement wins over the snapshot we read.
 if(hash(fs.readFileSync(output))!==metadata.sha256)continue;
 fs.writeFileSync(output+'.normalize.tmp',normalized);fs.renameSync(output+'.normalize.tmp',output);
 const next={...metadata,bytes:normalized.length,sha256:hash(normalized),flattenBackground:'#f2e5bc',webpQuality:83,encoderEffort:4,alphaNormalization:{previousSha256:metadata.sha256,source:fs.existsSync(original)?'original generated PNG':'existing WebP',at:new Date().toISOString()}};
 fs.writeFileSync(metaPath+'.normalize.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(metaPath+'.normalize.tmp',metaPath);changed.push(id);
}
console.log(JSON.stringify({flattened:changed.length,ids:changed}));
