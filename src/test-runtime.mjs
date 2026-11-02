import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {normalizeCacheControl} from './cache-control.mjs';import supervision from './supervision.cjs';import questions from './questions.cjs';
const count=x=>!x||typeof x!=='object'?0:(Object.hasOwn(x,'cache_control')?1:0)+Object.entries(x).filter(([k])=>k!=='cache_control').reduce((n,[,v])=>n+(Array.isArray(v)?v.reduce((a,b)=>a+count(b),0):count(v)),0);
const strip=x=>JSON.parse(JSON.stringify(x,(k,v)=>k==='cache_control'?undefined:v));
test('five cache markers become one stable system boundary, content remains identical',()=>{
 const payload={system:['mission','skill','brief','scratch','outlook'].map(text=>({type:'text',text,cache_control:{type:'ephemeral'}})),messages:[{role:'user',content:'Question'}]};const before=structuredClone(payload),result=normalizeCacheControl(payload);assert.equal(count(result),1);assert.deepEqual(strip(result),strip(payload));assert.deepEqual(payload,before);assert.ok(result.system.at(-1).cache_control);
});
test('cache budget includes tools, automatic caching, followups and bridges, without changing signed blocks',()=>{
 for(const bridge of [false,true]){const instruction=['a','b'].map(text=>({type:'text',text,cache_control:{type:'ephemeral'}}));const payload={tools:[{name:'read',input_schema:{type:'object'},cache_control:{type:'ephemeral'}}],cache_control:{type:'ephemeral'},messages:[...(bridge?[{role:'system',content:instruction}]:[]),{role:'assistant',content:[{type:'thinking',thinking:'signed',signature:'signature'}, {type:'tool_use',id:'a',name:'read',input:{}}]},{role:'user',content:[{type:'tool_result',tool_use_id:'a',content:'result',cache_control:{type:'ephemeral'}},{type:'image',source:{type:'base64',data:'AA=='},cache_control:{type:'ephemeral'}}]}],...(!bridge?{system:instruction}:{})};const out=normalizeCacheControl(payload);assert.ok(count(out)<=4);assert.deepEqual(strip(out),strip(payload));assert.deepEqual(normalizeCacheControl(out),out);}
 const plain={messages:[{role:'user',content:'hello'}]};assert.equal(normalizeCacheControl(plain),plain);
});
test('supervision separates capacity, progress, disabled checks, and waiting',()=>{
 const now=2000000;assert.ok(supervision.inspect({workers:[{since:now}],slots:2,now}).reason);assert.equal(supervision.inspect({workers:[{since:now}],slots:1,now}).reason,'');assert.equal(supervision.inspect({workers:[{since:0}],slots:1,now}).stalled.length,1);assert.equal(supervision.inspect({workers:[{since:0}],slots:2,now,text:'Fleet check: off\nProgress check: off'}).reason,'');assert.deepEqual([0,1,2,8].map(n=>supervision.delay('',n)),[300000,900000,1800000,1800000]);assert.equal(new Set(Array.from({length:6},(_,i)=>supervision.nudge('capacity',i))).size,6);
});
test('questions survive restart, answers are delivered once per answer, no default becomes an answer',t=>{
 const root=mkdtempSync(join(tmpdir(),'pe-questions-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const q=questions.submit(root,{question:'May I run the expensive test?',proposedDefault:'Wait',task:'T-1'});assert.equal(questions.pending(root).length,0);assert.equal(questions.list(root)[0].status,'open');questions.answer(root,q.id,'Use the smaller experiment first.');const pending=questions.pending(root);assert.equal(pending.length,1);assert.equal(questions.pending(root,[pending[0].delivery]).length,0);assert.equal(questions.pending(root).length,0);questions.answer(root,q.id,'Now run it.');assert.equal(questions.pending(root,[pending[0].delivery]).length,1);assert.throws(()=>questions.answer(root,'../unsafe','x'),/not found/);
});

test('worker question drafts are integrated once without replacing an operator answer',t=>{
 const root=mkdtempSync(join(tmpdir(),'pe-worker-question-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const folder=join(root,'.research/scratch/T-1');
 const q=questions.draft(folder,{question:'May I expand the run?',author:'worker',task:'T-1'});
 assert.equal(questions.list(root).length,0);questions.integrateDrafts(root);
 assert.equal(questions.list(root)[0].task,'T-1');questions.answer(root,q.id,'Stay with the small case.');questions.integrateDrafts(root);
 assert.equal(questions.list(root).length,1);assert.equal(questions.list(root)[0].answer,'Stay with the small case.');
});

test('question inbox reads, cancels and answers without invoking an agent', async t => {
  const {questionInbox} = await import('./questions-ui.mjs');
  const root=mkdtempSync(join(tmpdir(),'pe-inbox-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const q=questions.submit(root,{question:'May I expand?\nSecond line',affected:'The larger experiment',proposedDefault:'Use all resources',task:'T-1'});
  const views=[], notices=[];let selections=0, edits=0, refreshed=0;
  const ui={
    async select(title, options) {
      views.push(title);
      selections++;
      if(selections===1 || selections===3)return options[0];
      if(selections===2 || selections===4)return 'Answer';
      return 'Close';
    },
    async editor(title,prefill) {assert.equal(prefill,'');edits++;return edits===1 ? undefined : 'Only the small case.\nKeep the source unchanged.';},
    notify(message){notices.push(message);},
  };
  await questionInbox(root,ui,()=>refreshed++);
  assert.ok(views.some(v=>v.includes('Second line')&&v.includes('Affected work: The larger experiment')));
  assert.ok(views.some(v=>v.includes('Suggested default (not approval)')));
  assert.equal(refreshed,1);assert.equal(questions.list(root)[0].answer,'Only the small case.\nKeep the source unchanged.');
  assert.ok(notices.at(-1).includes('next turn'));
  assert.equal(questions.pending(root).length,1,'saving does not prematurely acknowledge delivery');
  let prefilled;
  let step=0;
  await questionInbox(root,{
    async select(_title, options){return [options.find(x=>x.startsWith('Answered questions')),options[0],'Edit answer','Close'][step++];},
    async editor(_title,value){prefilled=value;return '   ';}, notify(){},
  });
  assert.equal(prefilled,questions.list(root)[0].answer);
  assert.equal(questions.list(root)[0].answer,'Only the small case.\nKeep the source unchanged.');
});
