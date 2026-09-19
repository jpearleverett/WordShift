/** Enumerate actual authored story variants without loading native modules. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const mobile=path.resolve(import.meta.dirname,'../..');
const source=fs.readFileSync(path.join(mobile,'src/services/storySpine.ts'),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({})});
const ids=['cup','echo','witness','supper','plan','shelter','plum','plum_recruited','record','seeds','promise','returned','council','after','reply','old_mark'];
const animals=['fox','owl','pangolin','rabbit','wombat','tarsier','axolotl','capybara','sloth','red_panda'];
const beats=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'story-art-beats.json'),'utf8'));
const all=new Map(beats.filter(beat=>!['council-05','council-15','after-01'].includes(beat.id)).map(beat=>[beat.id,{...beat,samples:[],speakers:[],scenes:[]}]))
let seed=32019;
const random=(values)=>{seed=(seed*1664525+1013904223)>>>0;return values[(seed>>>8)%values.length];};
for(let iteration=0;iteration<2400;iteration++){
 const context={phase:5,puzzlesSolved:200,cycleCount:random([0,1]),postRevelation:true,unlockedAnimals:iteration<2?(iteration===0?animals:['fox']):animals.filter(()=>random([0,1,1])),ritualWord:'HOME'};
 const state={version:1,cycle:context.cycleCount,memories:{},boundary:random([null,'remember','release']),carriedBoundary:random([null,'remember','release']),carriedRecord:random([false,true]),arrivedBeforeRevision:random([false,true])};
 for(const [id,values] of Object.entries({cup:[undefined,'flower','chip'],witness:[undefined,'share','private'],shelter:[undefined,'road','room'],seeds:[undefined,'confidence','share'],promise:[undefined,'beside','apart'],record:[undefined,'keep','correct']})){
  const choice=random(values);if(choice)state.memories[id]={choice,completed:true,scene:{lines:[]}};
 }
 if(random([false,true]))state.memories.council={completed:true,scene:{lines:[]}};
 for(const id of ['plum','plum_recruited','returned'])if(random([false,true]))state.memories[id]={completed:true,scene:{lines:random([[{speaker:'axolotl'}],[{speaker:'fox'}]])}};
 for(const id of ids){const scene=exports.buildStoryScene(id,context,state);for(const line of [...scene.lines,...(scene.options??[]).flatMap(o=>o.response)]){
  if(!line.artId)throw Error('Missing artId: '+line.text);
  if(!all.has(line.artId))all.set(line.artId,{id:line.artId,scene:id,text:line.text,speaker:line.speaker,samples:[],speakers:[],scenes:[]});
  const beat=all.get(line.artId);if(!beat.samples.includes(line.text))beat.samples.push(line.text);if(!beat.speakers.includes(line.speaker))beat.speakers.push(line.speaker);if(!beat.scenes.includes(id))beat.scenes.push(id);
 }}
}
for(const id of ids)all.set(id+'-recollection',{id:id+'-recollection',scene:id,text:'From an earlier evening in the house, a conversation worth keeping.',samples:['From an earlier evening in the house, a conversation worth keeping.'],speaker:'narrator',speakers:['narrator'],scenes:[id]});
const missing=[...all.values()].filter(b=>!b.samples.length);if(missing.length)throw Error('Inventory did not cover: '+missing.map(b=>b.id));
fs.writeFileSync(path.join(import.meta.dirname,'story-art-inventory.json'),JSON.stringify([...all.values()],null,2)+'\n');
console.log(`${all.size} distinct illustration beats across ${ids.length} scene IDs, including aftermath and old-save recollections.`);
