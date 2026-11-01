import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import content from './content.cjs';
const fixture=t=>{const root=mkdtempSync(join(tmpdir(),'pe-content-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const lab=join(root,'lab');mkdirSync(join(lab,'.research'),{recursive:true});writeFileSync(join(lab,'.research/LAB.md'),'# lab');return {root,lab,cache:join(root,'cache')};};
const choose=(lab,mission,extra={})=>writeFileSync(join(lab,'.research/packs.json'),JSON.stringify({mission,...extra}));
const git=(dir,...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

test('portable folder sources seed shared pins, work in a cold clone, and update only deliberately', t => {
 const {root,lab,cache}=fixture(t),folder=join(lab,'.research/vendor/content');
 cpSync('packs',join(folder,'packs'),{recursive:true});
 choose(lab,'math',{sources:{common:{repository:'vendor/content'},math:{repository:'vendor/content'}}});
 const first=content.resolveContent(lab,{cache});
 assert.equal(first.lockFile,join(lab,'.research/packs.lock.json'));
 assert.equal(first.lock.packs.math.source,'vendor/content');
 const clone=join(root,'peer');cpSync(lab,clone,{recursive:true});rmSync(join(clone,'.research/local'),{recursive:true});
 const peer=content.resolveContent(clone,{runtime:true,cache:join(root,'cold-cache')});
 assert.equal(peer.fingerprint,first.fingerprint);
 const cli=execFileSync(process.execPath,[resolve('src/content.cjs'),'mission'],{cwd:join(clone,'.research'),encoding:'utf8'});
 assert.match(cli,/Math Team/);
 const file=join(folder,'packs/math/skills/muse.md');writeFileSync(file,readFileSync(file,'utf8')+'\nA new analogy.\n');
 const lock=readFileSync(first.lockFile,'utf8');
 assert.equal(content.resolveContent(lab,{cache}).fingerprint,first.fingerprint);
 assert.throws(()=>content.resolveContent(lab,{cache:join(root,'empty')}),/hash mismatch/);
 const preview=content.resolveContent(lab,{cache,update:true,preview:true});
 assert.notEqual(preview.fingerprint,first.fingerprint);assert.equal(readFileSync(first.lockFile,'utf8'),lock);
 assert.equal(content.resolveContent(lab,{cache,update:true}).fingerprint,preview.fingerprint);
 rmSync(folder,{recursive:true});assert.equal(content.resolveContent(lab,{cache}).fingerprint,preview.fingerprint);
});

test('content-addressed vendored snapshots retain upstream pins and validate their bytes', t => {
 const {root,lab,cache}=fixture(t),folder=join(lab,'.research/vendor/content'),packs={};
 for(const id of ['common','math']) {
  const pack=content.readPack('packs/'+id,id);
  packs[id]={digest:pack.digest,commit:'a'.repeat(40)};
  cpSync('packs/'+id,join(folder,'packs',pack.digest),{recursive:true});
 }
 writeFileSync(join(folder,'packs.lock.json'),JSON.stringify({format:1,packs}));
 choose(lab,'math',{sources:{common:{repository:'vendor/content'},math:{repository:'vendor/content',ref:'a'.repeat(40)}}});
 const first=content.resolveContent(lab,{cache});assert.equal(first.lock.packs.math.commit,'a'.repeat(40));
 writeFileSync(join(folder,'packs',packs.math.digest,'mission.md'),'corrupt');
 assert.throws(()=>content.resolveContent(lab,{cache,update:true,preview:true}),/Snapshot hash mismatch/);
 choose(lab,'math',{sources:{common:{repository:'../escape'}}});
 assert.throws(()=>content.resolveContent(lab,{cache,update:true,preview:true}),/Invalid pack path/);
 const outside=join(root,'outside');mkdirSync(outside);symlinkSync(outside,join(lab,'.research/vendor/link'));
 choose(lab,'math',{sources:{common:{repository:'vendor/link'}}});
 assert.throws(()=>content.resolveContent(lab,{cache,update:true,preview:true}),/snapshot escapes/);
});
test('each mission receives its own Muse, common outlook, and no unrelated skill catalog',t=>{
 const {lab,cache}=fixture(t);const full='Mode: math-team\nAn operator addition with $& and {{literal}}.\n';writeFileSync(join(lab,'.research/MISSION.md'),full);
 for(const mission of ['red','blue','math','signals']){choose(lab,mission);const c=content.resolveContent(lab,{localRoot:resolve('packs'),cache});assert.equal(c.mission,mission);assert.equal(c.entries.filter(s=>s.name==='pe-muse').length,1);assert.ok(c.persona.includes('opportunity to look deeply'));assert.ok(c.entries.some(s=>s.name==='pe-git-research'));assert.equal(c.entries.some(s=>s.name==='pe-math'),mission==='math');assert.equal(c.entries.some(s=>s.name==='pe-hunt'),mission==='signals');assert.equal(c.entries.some(s=>s.name==='pe-cvss'),['red','blue'].includes(mission));if(mission==='math')assert.ok(!c.entries.find(s=>s.name==='pe-muse').body.includes('Red Team'));}
 assert.equal(readFileSync(join(lab,'.research/MISSION.md'),'utf8'),full);
});
test('local content is snapshotted; old workers retain their files after a local edit',t=>{
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});choose(lab,'math');
 const before=content.resolveContent(lab,{localRoot:local,cache}),file=before.entries.find(s=>s.name==='pe-muse').filePath,body=readFileSync(file,'utf8');
 writeFileSync(join(local,'math/skills/muse.md'),readFileSync(join(local,'math/skills/muse.md'),'utf8')+'\nNew idea.\n');
 const after=content.resolveContent(lab,{localRoot:local,cache});assert.notEqual(before.fingerprint,after.fingerprint);assert.equal(readFileSync(file,'utf8'),body);
});
test('remote pins, offline cache, preview, update, and corrupt-cache rejection',t=>{
 const {root,lab,cache}=fixture(t),repo=join(root,'remote');mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');git(repo,'add','.');git(repo,'commit','-m','content');
 choose(lab,'math',{sources:{common:{repository:repo},math:{repository:repo}}});
 const first=content.resolveContent(lab,{cache}),lock=readFileSync(join(lab,'.research/packs.lock.json'),'utf8');assert.match(first.lock.packs.math.commit,/^[a-f0-9]{40}$/);
 const source=join(repo,'packs/math/skills/muse.md');writeFileSync(source,readFileSync(source,'utf8')+'\nAnother angle.\n');git(repo,'add','.');git(repo,'commit','-m','revise');
 assert.equal(content.resolveContent(lab,{cache}).fingerprint,first.fingerprint);
 const preview=content.resolveContent(lab,{cache,update:true,preview:true});assert.notEqual(preview.fingerprint,first.fingerprint);assert.equal(readFileSync(join(lab,'.research/packs.lock.json'),'utf8'),lock);
 const adopted=content.resolveContent(lab,{cache,update:true});assert.equal(adopted.fingerprint,preview.fingerprint);
 rmSync(repo,{recursive:true,force:true});assert.equal(content.resolveContent(lab,{cache}).fingerprint,adopted.fingerprint);
 writeFileSync(join(cache,'packs',adopted.lock.packs.math.digest,'mission.md'),'corrupt');assert.throws(()=>content.resolveContent(lab,{cache}),/hash mismatch/);
});
test('reject incompatible manifests, escaping resources, symlinks, missing notes, and unknown modes',t=>{
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});choose(lab,'math');const manifest=join(local,'math/pack.json'),original=readFileSync(manifest,'utf8');
 writeFileSync(manifest,original.replace('"format": 1','"format": 99'));assert.throws(()=>content.resolveContent(lab,{localRoot:local,cache}),/Incompatible/);
 writeFileSync(manifest,original.replace('"mission.md"','"../escape.md"'));assert.throws(()=>content.resolveContent(lab,{localRoot:local,cache}),/Invalid pack path/);
 writeFileSync(manifest,original);symlinkSync('/tmp',join(local,'math/unsafe'));assert.throws(()=>content.resolveContent(lab,{localRoot:local,cache}),/symlinks/);rmSync(join(local,'math/unsafe'));
 rmSync(join(local,'math/skills/muse/connections.md'));assert.throws(()=>content.resolveContent(lab,{localRoot:local,cache}),/Missing/);
});

test('resolver reuses bytes and Git results until content or selection changes',t=>{
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});choose(lab,'math');
 const read=content.createResolver({localRoot:local,cache}),first=read(lab);
 for(let i=0;i<20;i++)assert.equal(read(lab),first);
 assert.equal(read.stats.resolutions,1);
 const note=join(local,'math/skills/muse/connections.md');writeFileSync(note,readFileSync(note,'utf8')+'\nA different representation.\n');
 assert.notEqual(read(lab).fingerprint,first.fingerprint);assert.equal(read.stats.resolutions,2);
 choose(lab,'blue');assert.equal(read(lab).mission,'blue');assert.equal(read.stats.resolutions,3);
});

// Kickoff also loads content before LAB.md exists. Its pin survives process restart.
test('outside a lab, bootstrap pins survive a missing local source and a new resolver',t=>{
 const {root,cache}=fixture(t),cwd=join(root,'uninitialized'),local=join(root,'packs');
 mkdirSync(cwd);cpSync('packs',local,{recursive:true});
 const first=content.createResolver({localRoot:local,cache})(cwd);
 assert.ok(first.lockFile.includes('bootstrap'));
 rmSync(local,{recursive:true,force:true});
 const restarted=content.createResolver({localRoot:local,cache})(cwd);
 assert.equal(restarted.lock.packs.blue.digest,first.lock.packs.blue.digest);
 assert.equal(restarted.lock.packs.common.digest,first.lock.packs.common.digest);
 assert.equal(restarted.lockFile,first.lockFile);
});
test('a source commit refreshes revision attribution even when bytes are unchanged',t=>{
 const {root,lab,cache}=fixture(t),source=join(root,'source');mkdirSync(source);
 cpSync('packs',join(source,'packs'),{recursive:true});
 git(source,'init','-b','main');git(source,'config','user.name','Fixture');git(source,'config','user.email','fixture@example.invalid');
 git(source,'add','.');git(source,'commit','-m','Initial packs');
 const read=content.createResolver({localRoot:join(source,'packs'),cache}),first=read(lab);
 content.conventionStatus(lab,first,{acknowledge:true});
 git(source,'commit','--allow-empty','-m','Revision with identical content');
 const next=read(lab);assert.notEqual(next.lock.packs.common.commit,first.lock.packs.common.commit);
 assert.equal(next.lock.packs.common.digest,first.lock.packs.common.digest);assert.equal(read.stats.resolutions,2);
 assert.equal(content.conventionStatus(lab,next).state,'current','an unrelated repository commit is not a convention change');
});

test('developer packs retain clone-local pins without rewriting the shared lock', t => {
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});
 const shared=join(lab,'.research/packs.lock.json'),original=JSON.stringify({format:1,packs:{}})+'\n';
 writeFileSync(shared,original);
 const first=content.resolveContent(lab,{localRoot:local,cache});
 assert.equal(first.lockFile,join(lab,'.research/local/packs.lock.json'));
 writeFileSync(shared,JSON.stringify(first.lock));rmSync(first.lockFile);
 content.resolveContent(lab,{localRoot:local,cache});
 assert.deepEqual(JSON.parse(readFileSync(first.lockFile,'utf8')),first.lock,'copy identical legacy pins into the local override too');
 writeFileSync(shared,original);
 const file=join(local,'math/skills/muse.md');writeFileSync(file,readFileSync(file,'utf8')+'\nAnother angle.\n');
 choose(lab,'math');const after=content.resolveContent(lab,{localRoot:local,cache});
 assert.equal(readFileSync(shared,'utf8'),original);
 rmSync(local,{recursive:true});
 assert.equal(content.resolveContent(lab,{localRoot:local,cache}).lock.packs.math.digest,after.lock.packs.math.digest);
});

test('lab review is acknowledged explicitly, survives restart and follows relevant bytes only', t => {
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});
 choose(lab,'math');
 const read=()=>content.createResolver({localRoot:local,cache})(lab);
 const first=read();
 assert.equal(content.conventionStatus(lab,first).state,'unreviewed');
 assert.equal(content.conventionStatus(lab,read()).state,'unreviewed','reading is not acknowledging');
 content.conventionStatus(lab,first,{acknowledge:true});
 assert.equal(content.conventionStatus(lab,read()).state,'current');
 const muse=join(local,'math/skills/muse.md');writeFileSync(muse,readFileSync(muse,'utf8')+'\nAn interesting analogy.\n');
 assert.equal(content.conventionStatus(lab,read()).state,'current');
 const fleet=join(local,'common/skills/fleet.md');writeFileSync(fleet,readFileSync(fleet,'utf8')+'\nA convention change.\n');
 const delta=content.conventionStatus(lab,read());
 assert.equal(delta.state,'changed');assert.deepEqual(delta.changed,['common/skills/fleet.md']);
 assert.match(delta.text,/Before launching/);
 content.conventionStatus(lab,read(),{acknowledge:true});
 assert.equal(content.conventionStatus(lab,read()).state,'current');
});

test('installed packs seed shared pins and the copied CLI uses the manager source and cache offline', t => {
 const {root,lab,cache}=fixture(t),installed=join(root,'installation/packs');
 cpSync('packs',installed,{recursive:true});choose(lab,'math');
 const first=content.createResolver({runtime:true,installedRoot:installed,cache})(lab);
 assert.equal(first.lockFile,join(lab,'.research/packs.lock.json'));
 assert.equal(first.localRoot,undefined);
 const tools=join(lab,'.research/tools');mkdirSync(tools,{recursive:true});
 cpSync('src/content.cjs',join(tools,'content.cjs'));
 const env={...process.env,PE_PACK_ROOT:'',PE_PACK_CACHE:''};
 const cli=command=>execFileSync(process.execPath,[join(tools,'content.cjs'),command],{cwd:lab,env,encoding:'utf8'});
 rmSync(installed,{recursive:true});
 assert.equal(cli('mission').trim(),first.defaultMission.trim());
 assert.deepEqual(JSON.parse(cli('inspect')),first.lock);
});

test('installed packs seed pins, but update previews follow their remote until explicitly applied', t => {
 const {root,lab,cache}=fixture(t),repo=join(root,'remote'),installed=join(root,'installation');
 mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});
 git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');
 git(repo,'add','.');git(repo,'commit','-m','Installed library');
 git(root,'clone',repo,installed);
 choose(lab,'math');
 const options={runtime:true,installedRoot:join(installed,'packs'),cache};
 const manager=content.createResolver(options),first=manager(lab);
 const lock=readFileSync(first.lockFile,'utf8'),context=readFileSync(first.contextFile,'utf8');
 const workerFile=first.entries.find(s=>s.name==='pe-muse').filePath,workerText=readFileSync(workerFile,'utf8');
 const initialCommit=git(repo,'rev-parse','HEAD');
 assert.equal(first.lock.packs.math.commit,initialCommit);
 assert.equal(first.lock.packs.math.source,repo);
 assert.equal(first.lockFile,join(lab,'.research/packs.lock.json'));

 const note=join(repo,'packs/math/skills/muse.md');
 writeFileSync(note,readFileSync(note,'utf8')+'\nA library improvement published after installation.\n');
 git(repo,'add','.');git(repo,'commit','-m','Independent library update');
 const publishedCommit=git(repo,'rev-parse','HEAD');
 assert.equal(git(installed,'rev-parse','HEAD'),initialCommit);
 assert.equal(content.resolveContent(lab,options).fingerprint,first.fingerprint);
 const preview=content.resolveContent(lab,{...options,update:true,preview:true});
 assert.equal(preview.lock.packs.math.commit,publishedCommit);
 assert.notEqual(preview.lock.packs.math.digest,first.lock.packs.math.digest);
 assert.match(preview.entries.find(s=>s.name==='pe-muse').body,/A library improvement published after installation/);

 // The copied tool has only the source context saved by the active manager.
 const tools=join(lab,'.research/tools');mkdirSync(tools,{recursive:true});
 cpSync('src/content.cjs',join(tools,'content.cjs'));
 const cli=(...args)=>execFileSync(process.execPath,[join(tools,'content.cjs'),...args],{
   cwd:lab,env:{...process.env,PE_PACK_ROOT:'',PE_PACK_CACHE:''},encoding:'utf8',stdio:['ignore','pipe','pipe'],
 });
 for(const args of [['update'],['update','--preview']]) {
   const diff=cli(...args);
   assert.match(diff,/\+A library improvement published after installation/);
   assert.match(diff,/use update --apply to adopt/);
   assert.equal(readFileSync(first.lockFile,'utf8'),lock);
   assert.equal(readFileSync(first.contextFile,'utf8'),context);
   assert.equal(manager(lab),first,'preview does not switch the active manager');
 }
 assert.match(cli('update','--apply'),/Adopted/);
 assert.deepEqual(JSON.parse(cli('inspect')),preview.lock);
 assert.equal(manager(lab).fingerprint,preview.fingerprint,'the manager observes explicit adoption');
 assert.equal(readFileSync(workerFile,'utf8'),workerText,'running workers retain their launch snapshot');

 // Engine upgrades and a failed remote preview must not replace an adopted pin.
 const installedNote=join(installed,'packs/math/skills/muse.md');
 writeFileSync(installedNote,readFileSync(installedNote,'utf8')+'\nAn unrelated installed edit.\n');
 const adoptedLock=readFileSync(first.lockFile,'utf8');
 rmSync(repo,{recursive:true});
 assert.equal(content.resolveContent(lab,options).fingerprint,preview.fingerprint);
 assert.throws(()=>content.resolveContent(lab,{...options,update:true,preview:true}),/Cannot fetch/);
 assert.equal(readFileSync(first.lockFile,'utf8'),adoptedLock);
 assert.deepEqual(JSON.parse(cli('inspect')),preview.lock,'the adopted remote pin works offline');
});

test('an update preview before the first load checks the remote without seeding a pin', t => {
 const {root,lab,cache}=fixture(t),repo=join(root,'remote'),installed=join(root,'packs');
 cpSync('packs',installed,{recursive:true});mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});
 git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');
 const note=join(repo,'packs/math/skills/muse.md');
 writeFileSync(note,readFileSync(note,'utf8')+'\nA newer remote library.\n');
 git(repo,'add','.');git(repo,'commit','-m','Published library');
 choose(lab,'math');
 const options={runtime:true,installedRoot:installed,cache,defaults:{repository:repo}};
 const preview=content.resolveContent(lab,{...options,update:true,preview:true});
 assert.equal(preview.lock.packs.math.commit,git(repo,'rev-parse','HEAD'));
 assert.equal(existsSync(preview.lockFile),false);
 assert.equal(existsSync(preview.contextFile),false);
 const seeded=content.resolveContent(lab,options);
 assert.equal(seeded.lock.packs.math.digest,content.readPack(join(installed,'math'),'math').digest);
 assert.notEqual(seeded.fingerprint,preview.fingerprint,'preview does not become the initial pin');
});

test('an explicit runtime developer override also reaches the copied CLI without process environment', t => {
 const {root,lab,cache}=fixture(t),local=join(root,'packs');cpSync('packs',local,{recursive:true});choose(lab,'math');
 const first=content.resolveContent(lab,{runtime:true,localRoot:local,cache});
 const env={...process.env,PE_PACK_ROOT:'',PE_PACK_CACHE:''};
 const cli=execFileSync(process.execPath,[resolve('src/content.cjs'),'inspect'],{cwd:lab,env,encoding:'utf8'});
 assert.deepEqual(JSON.parse(cli),first.lock);
 assert.equal(first.lockFile,join(lab,'.research/local/packs.lock.json'));
 assert.throws(()=>readFileSync(join(lab,'.research/packs.lock.json')),/ENOENT/);
 const lock=readFileSync(first.lockFile,'utf8');
 const note=join(local,'math/skills/muse.md');
 writeFileSync(note,readFileSync(note,'utf8')+'\nAn intentional developer edit.\n');
 // Even an unavailable remote and an installed copy cannot displace this override.
 choose(lab,'math',{sources:{common:{repository:join(root,'unavailable')},math:{repository:join(root,'unavailable')}}});
 const preview=content.resolveContent(lab,{runtime:true,localRoot:local,installedRoot:resolve('packs'),cache,update:true,preview:true});
 assert.match(preview.entries.find(s=>s.name==='pe-muse').body,/An intentional developer edit/);
 const diff=execFileSync(process.execPath,[resolve('src/content.cjs'),'update','--preview'],{cwd:lab,env,encoding:'utf8'});
 assert.match(diff,/\+An intentional developer edit/);
 assert.equal(readFileSync(first.lockFile,'utf8'),lock);
 assert.equal(existsSync(join(lab,'.research/packs.lock.json')),false);
});

test('a clean installed Git source has a recoverable shared revision and a cold clone fetches that exact pin', t => {
 const {root,lab,cache}=fixture(t),repo=join(root,'source');mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});
 git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');
 git(repo,'add','.');git(repo,'commit','-m','Installed packs');git(repo,'remote','add','origin',repo);
 choose(lab,'math');
 const first=content.resolveContent(lab,{installedRoot:join(repo,'packs'),cache});
 assert.equal(first.lock.packs.math.source,repo);assert.equal(first.lock.packs.math.commit,git(repo,'rev-parse','HEAD'));
 const other=join(root,'cold-lab');mkdirSync(join(other,'.research'),{recursive:true});
 for(const name of ['LAB.md','packs.json','packs.lock.json'])cpSync(join(lab,'.research',name),join(other,'.research',name));
 const cold=content.resolveContent(other,{cache:join(root,'cold-cache')});assert.equal(cold.fingerprint,first.fingerprint);
});

test('a fresh engine-only install adopts compatible defaults with provenance, then honors its pin offline', t => {
 const {root,lab,cache}=fixture(t),repo=join(root,'remote');mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});
 git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');git(repo,'add','.');git(repo,'commit','-m','Old public content');
 choose(lab,'math');
 const options={runtime:true,cache,defaults:{repository:repo,digests:{common:'0'.repeat(64)}}};
 const first=content.resolveContent(lab,options),commit=git(repo,'rev-parse','HEAD');
 assert.deepEqual(first.warnings,[],'routine provenance never becomes a prompt warning');
 assert.match(first.provenance.join(' '),/Using compatible common content/);
 assert.ok(first.provenance.join(' ').includes(commit));
 assert.deepEqual(content.provenanceStatus(lab),first.provenance);
 assert.equal(first.lock.packs.common.commit,commit);
 assert.equal(first.lockFile,join(lab,'.research/packs.lock.json'));
 const note=join(repo,'packs/math/skills/muse.md');writeFileSync(note,readFileSync(note,'utf8')+'\nA library-only improvement.\n');
 git(repo,'add','.');git(repo,'commit','-m','Independent library publication');
 const fresh=join(root,'fresh');mkdirSync(join(fresh,'.research'),{recursive:true});
 writeFileSync(join(fresh,'.research/LAB.md'),'# New lab\n');choose(fresh,'math');
 const latest=content.resolveContent(fresh,{...options,cache:join(root,'fresh-cache')});
 assert.equal(latest.lock.packs.math.commit,git(repo,'rev-parse','HEAD'));
 assert.notEqual(latest.fingerprint,first.fingerprint);
 rmSync(repo,{recursive:true});
 assert.equal(content.resolveContent(lab,options).fingerprint,first.fingerprint);
 assert.deepEqual(content.resolveContent(lab,options).provenance,first.provenance);
 assert.deepEqual(content.provenanceStatus(lab),first.provenance,'status reads saved provenance with the remote unavailable');
});

test('legacy mission headings retain discipline and operator bytes; explicit disagreement is visible', t => {
 const {lab,cache}=fixture(t),file=join(lab,'.research/MISSION.md');
 for(const [heading,mission] of [['Red Team','red'],['Blue Team','blue'],['Math Team','math'],['Signal Hunt','signals']]) {
  const original=`# Mission: ${heading}\n\nOperator: preserve $& and {{literal}} and the source pins.\n`;
  writeFileSync(file,original);
  const data=content.resolveContent(lab,{localRoot:resolve('packs'),cache});
  assert.equal(data.mission,mission);assert.deepEqual(data.warnings,[]);assert.equal(readFileSync(file,'utf8'),original);
 }
 writeFileSync(file,'Mode: signals\nOperator owns this mission.\n');choose(lab,'math');
 const data=content.resolveContent(lab,{localRoot:resolve('packs'),cache});
 assert.equal(data.mission,'math');assert.match(data.warnings.join(' '),/MISSION.md selects signals, but packs.json selects math/);
 assert.equal(readFileSync(file,'utf8'),'Mode: signals\nOperator owns this mission.\n');
});

test('reviewed remote library updates can evolve independently of the engine default hashes', t => {
 const {root,lab,cache}=fixture(t),repo=join(root,'remote');mkdirSync(repo);cpSync('packs',join(repo,'packs'),{recursive:true});
 git(repo,'init','-b','main');git(repo,'config','user.name','Fixture');git(repo,'config','user.email','fixture@example.invalid');git(repo,'add','.');git(repo,'commit','-m','Published baseline');
 const defaults={repository:repo,digests:Object.fromEntries(['common','math'].map(id=>[id,content.readPack(join(repo,'packs',id),id).digest]))};
 choose(lab,'math');
 const options={runtime:true,cache,defaults};
 const first=content.resolveContent(lab,options),before=readFileSync(first.lockFile,'utf8');
 const note=join(repo,'packs/math/skills/muse.md');writeFileSync(note,readFileSync(note,'utf8')+'\nAn independently published library improvement.\n');
 git(repo,'add','.');git(repo,'commit','-m','Library update without an engine release');
 assert.equal(content.resolveContent(lab,options).fingerprint,first.fingerprint);
 const preview=content.resolveContent(lab,{...options,update:true,preview:true});
 assert.notEqual(preview.fingerprint,first.fingerprint);assert.equal(readFileSync(first.lockFile,'utf8'),before);
 const adopted=content.resolveContent(lab,{...options,update:true});
 assert.equal(adopted.fingerprint,preview.fingerprint);
 assert.equal(content.resolveContent(lab,options).fingerprint,adopted.fingerprint);
});
