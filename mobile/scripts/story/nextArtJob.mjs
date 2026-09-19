/** Claim a production job atomically; calls no API and never drives a browser. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const dir=import.meta.dirname;
const owner=process.argv[2];
if(!['decision_scene_overhaul','recovery_fix','flow_and_drag','finish_store_images'].includes(owner))throw Error('Pass one assigned owner name');
const queue=JSON.parse(fs.readFileSync(path.resolve(dir,`../../../.git/story-art-queue-${owner}.json`)));
const jobs=JSON.parse(fs.readFileSync(path.join(dir,'story-art-prompts.json')));
const claims=path.resolve(dir,'../../../.git/story-art-production-claims');fs.mkdirSync(claims,{recursive:true});
let selected;
for(const id of queue){
 try{const fd=fs.openSync(path.join(claims,id+'.claim'),'wx');const job=jobs.find(j=>j.id===id);fs.writeFileSync(fd,JSON.stringify({owner,id,prompt:job.prompt,promptSha256:crypto.createHash('sha256').update(job.prompt).digest('hex')}));fs.closeSync(fd);selected=id;break;}catch(e){if(e.code!=='EEXIST')throw e;}
}
if(!selected){console.log('null');process.exit(0);}
const job=jobs.find(j=>j.id===selected);
console.log(JSON.stringify({id:selected,prompt:job.prompt,promptSha256:crypto.createHash('sha256').update(job.prompt).digest('hex')}));
