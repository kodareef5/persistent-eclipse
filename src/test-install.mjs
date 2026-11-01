// Fresh installations, outside the engine checkout and with empty content caches.
// Optional real harnesses: node src/test-install.mjs pi /path/to/dsh/lib/bin.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [pi, dsh] = process.argv.slice(2);
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
const run = (cmd, args, options) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, {...options, stdio:['ignore','pipe','pipe']});
  let out = '';
  child.stdout.on('data', b => {out += b;}); child.stderr.on('data', b => {out += b;});
  const timer = setTimeout(() => {child.kill('SIGKILL');}, 120000);
  child.on('error', reject);
  child.on('close', code => {clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(' ')}: ${out.slice(-5000)}`));});
});

test('fresh tarball and Git installations resolve all four disciplines with portable shared pins', {timeout:300000}, async t => {
  const root = mkdtempSync(join(tmpdir(), 'pe-install-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const archive = JSON.parse(execFileSync('npm', ['pack','--json','--pack-destination',root], {cwd:repo,encoding:'utf8'}))[0];
  assert.equal(archive.files.filter(f => f.path.startsWith('packs/')).length, 0, 'packs stay outside the engine payload');
  assert.ok(archive.files.some(f => f.path === 'src/pack-defaults.json'));
  execFileSync('tar', ['-xzf', join(root,archive.filename),'-C',root]);
  const engine = join(root,'package'), source = join(root,'source');
  mkdirSync(source);
  for (const file of git(repo,'ls-files','-co','--exclude-standard').split('\n').filter(Boolean)) {
    mkdirSync(dirname(join(source,file)),{recursive:true});cpSync(join(repo,file),join(source,file));
  }
  git(source,'init','-b','main');git(source,'config','user.name','Fixture');git(source,'config','user.email','fixture@example.invalid');
  git(source,'add','.');git(source,'commit','-m','Installation fixture');
  const commit=git(source,'rev-parse','HEAD');
  const resolver=createRequire(import.meta.url)(join(engine,'src/content.cjs'));
  const disciplines=['red','blue','math','signals'];
  const labs=disciplines.map(id=>{
    const lab=join(root,id);mkdirSync(join(lab,'.research'),{recursive:true});
    writeFileSync(join(lab,'.research/LAB.md'),'# Disposable '+id+' lab\nSync: off\n');
    writeFileSync(join(lab,'.research/MISSION.md'),readFileSync(join(source,'packs',id,'mission.md'),'utf8')+'\nOperator addition: keep this fixture intact.\n');
    writeFileSync(join(lab,'.research/packs.json'),JSON.stringify({mission:id,sources:{common:{repository:source,ref:commit},[id]:{repository:source,ref:commit}}}));
    return lab;
  });
  for (const [i,lab] of labs.entries()) {
    const cache=join(root,'tar-cache-'+i);
    const first=resolver.resolveContent(lab,{runtime:true,cache});
    assert.equal(first.mission,disciplines[i]);assert.equal(first.lock.packs[disciplines[i]].commit,commit);
    assert.equal(first.lockFile,join(lab,'.research/packs.lock.json'));
    assert.equal(first.entries.some(s=>s.name==='pe-math'),disciplines[i]==='math');
    const cli=execFileSync(process.execPath,[join(engine,'src/content.cjs'),'inspect'],{cwd:lab,env:{...process.env,PE_PACK_ROOT:'',PE_PACK_CACHE:''},encoding:'utf8'});
    assert.deepEqual(JSON.parse(cli),first.lock);
  }
  // No fixture source remains available: each exact pin must now work offline.
  const hidden=source+'.offline';
  const {renameSync}=await import('node:fs');renameSync(source,hidden);
  try { for(const lab of labs) assert.ok(resolver.resolveContent(lab).entries.length>0); }
  finally { renameSync(hidden,source); }
  console.log(`tarball: ${archive.files.length} engine files, zero pack files; four pinned fetches and offline restarts passed`);

  // Publish prose after the engine tarball was built. New labs can adopt that
  // compatible library without custom per-pack sources; older labs keep pins.
  const library=join(root,'library');mkdirSync(library);cpSync(join(source,'packs'),join(library,'packs'),{recursive:true});
  git(library,'init','-b','main');git(library,'config','user.name','Fixture');git(library,'config','user.email','fixture@example.invalid');
  git(library,'add','.');git(library,'commit','-m','Published library');
  const defaults={...JSON.parse(readFileSync(join(engine,'src/pack-defaults.json'),'utf8')),repository:library};
  const warm=join(root,'warm-defaults');mkdirSync(join(warm,'.research'),{recursive:true});
  writeFileSync(join(warm,'.research/LAB.md'),'# Existing lab\n');writeFileSync(join(warm,'.research/MISSION.md'),'Mode: math\n');
  const pinned=resolver.resolveContent(warm,{runtime:true,defaults,cache:join(root,'warm-cache')});
  for (const id of ['common',...disciplines]) {
    const file=join(library,'packs',id,id==='common'?'research.md':'mission.md');
    writeFileSync(file,readFileSync(file,'utf8')+'\nContent-only fixture update.\n');
  }
  git(library,'add','.');git(library,'commit','-m','Content evolves independently');
  const libraryCommit=git(library,'rev-parse','HEAD');
  const defaultLabs=disciplines.map(id=>{
    const lab=join(root,'defaults-'+id);mkdirSync(join(lab,'.research'),{recursive:true});
    writeFileSync(join(lab,'.research/LAB.md'),'# Fresh lab\nSync: off\n');
    writeFileSync(join(lab,'.research/MISSION.md'),'Mode: '+id+'\n');return lab;
  });
  for (const [i,lab] of defaultLabs.entries()) {
    const data=resolver.resolveContent(lab,{runtime:true,defaults,cache:join(root,'default-cache-'+i)});
    assert.equal(data.lock.packs[disciplines[i]].commit,libraryCommit);
    assert.deepEqual(data.warnings,[]);
    assert.equal(data.provenance.length,2);assert.ok(data.provenance.every(w=>w.includes(libraryCommit)));
  }
  assert.equal(resolver.resolveContent(warm,{runtime:true,defaults,cache:join(root,'warm-cache')}).fingerprint,pinned.fingerprint);
  renameSync(library,library+'.offline');
  try { for(const lab of defaultLabs) assert.ok(resolver.resolveContent(lab).entries.length>0); }
  finally { renameSync(library+'.offline',library); }
  console.log('tarball: newer default content adopted for four fresh labs; existing pin and offline restarts preserved');
  if (!pi && !dsh) return;

  // Exercise the harnesses' real Git installers without network credentials.
  // Git alone rewrites this test URL to the ordinary disposable repository.
  const url='https://pe-install.invalid/fixture/persistent-eclipse.git';
  const baseEnv={...process.env,PE_PACK_ROOT:'',GIT_CONFIG_COUNT:'2',GIT_CONFIG_KEY_0:`url.file://${source}.insteadOf`,GIT_CONFIG_VALUE_0:url,
    GIT_CONFIG_KEY_1:`url.file://${library}.insteadOf`,GIT_CONFIG_VALUE_1:'https://github.com/kodareef5/persistent-eclipse.git',GIT_ALLOW_PROTOCOL:'file:https'};
  if (pi) {
    const home=join(root,'pi-home');mkdirSync(home);
    const env={...baseEnv,PI_CODING_AGENT_DIR:home,PI_OFFLINE:'1',PI_TELEMETRY:'0',PE_PACK_CACHE:join(root,'pi-cache')};
    await run(pi,['install','git:'+url],{cwd:root,env});
    const installed=join(home,'git/pe-install.invalid/fixture/persistent-eclipse');
    assert.ok(existsSync(join(installed,'packs/math/mission.md')),'Pi Git install retains packs');
    const requests=[];
    const server=createServer(async(req,res)=>{
      let body='';for await(const b of req)body+=b;
      requests.push(JSON.parse(body));res.writeHead(200,{'content-type':'text/event-stream'});
      res.end('data: '+JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:'probe',choices:[{index:0,delta:{role:'assistant',content:'Installation checked.'},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({id:'fixture',object:'chat.completion.chunk',created:0,model:'probe',choices:[{index:0,delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    writeFileSync(join(home,'models.json'),JSON.stringify({providers:{fixture:{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,api:'openai-completions',apiKey:'fixture',models:[{id:'probe',contextWindow:200000,maxTokens:2048}]}}}));
    try {
      for(const [i,lab] of labs.entries()) {
        // A brand-new lab exercises installed defaults, not the tarball's pins.
        const fresh=join(root,'pi-'+disciplines[i]);mkdirSync(join(fresh,'.research'),{recursive:true});
        for(const name of ['LAB.md','MISSION.md'])cpSync(join(lab,'.research',name),join(fresh,'.research',name));
        await run(pi,['-p','--no-session','--provider','fixture','--model','probe','Read the mission and report ready.'],{cwd:fresh,env});
        const lock=JSON.parse(readFileSync(join(fresh,'.research/packs.lock.json'),'utf8'));
        assert.equal(lock.mission,disciplines[i]);assert.equal(lock.packs[disciplines[i]].commit,commit);
        const cli=execFileSync(process.execPath,[join(fresh,'.research/tools/content.cjs'),'inspect'],{cwd:fresh,env:{...baseEnv,PE_PACK_CACHE:''},encoding:'utf8'});
        assert.deepEqual(JSON.parse(cli),lock);
        assert.ok(JSON.stringify(requests.at(-1)).includes('Operator addition: keep this fixture intact.'));
      }
    } finally { await new Promise(r=>server.close(r)); }
    const cold=join(root,'pi-cold-clone');mkdirSync(join(cold,'.research'),{recursive:true});
    for(const name of ['LAB.md','MISSION.md','packs.lock.json'])cpSync(join(root,'pi-math/.research',name),join(cold,'.research',name));
    const recovered=resolver.resolveContent(cold,{runtime:true,cache:join(root,'pi-cold-cache')});
    assert.equal(recovered.lock.packs.math.commit,commit,'a fresh clone recovers the shared installed pin from its origin');

    // The copied CLI must update from the installed package's remote, not keep
    // re-selecting its older packs. Preview leaves the manager's pin untouched.
    const mathLab=join(root,'pi-math'),lockFile=join(mathLab,'.research/packs.lock.json');
    const before=readFileSync(lockFile,'utf8');
    const note=join(source,'packs/math/skills/muse.md');
    writeFileSync(note,readFileSync(note,'utf8')+'\nA library update after the Pi Git installation.\n');
    git(source,'add','packs/math/skills/muse.md');git(source,'commit','-m','Independent Math library update');
    const updatedCommit=git(source,'rev-parse','HEAD');
    const cli=(...args)=>execFileSync(process.execPath,[join(mathLab,'.research/tools/content.cjs'),...args],{
      cwd:mathLab,env:{...baseEnv,PE_PACK_CACHE:''},encoding:'utf8',stdio:['ignore','pipe','pipe'],
    });
    assert.match(cli('update','--preview'),/\+A library update after the Pi Git installation/);
    assert.equal(readFileSync(lockFile,'utf8'),before);
    assert.equal(JSON.parse(cli('inspect')).packs.math.commit,commit);
    assert.equal(git(installed,'rev-parse','HEAD'),commit,'updating packs does not upgrade the engine');
    assert.match(cli('update','--apply'),/Adopted/);
    const updated=JSON.parse(cli('inspect'));
    assert.equal(updated.packs.math.commit,updatedCommit);
    assert.notEqual(updated.packs.math.digest,JSON.parse(before).packs.math.digest);
    console.log('Pi Git install: four real mock-provider labs, copied CLIs, and independent remote pack preview/adoption passed');
  }
  if (dsh) {
    const home=join(root,'dsh-home'),env={...baseEnv,DSH_HOME:home,PE_PACK_CACHE:join(root,'dsh-cache')};
    await run(process.execPath,[dsh,'plugin','--profile','web','add','git+'+url+'#'+commit],{cwd:root,env});
    const profileFile=join(home,'profiles/web/package.json'),profile=JSON.parse(readFileSync(profileFile,'utf8'));
    if(!profile.dsh.profile.bundles.includes('persistent-eclipse'))profile.dsh.profile.bundles.push('persistent-eclipse');writeFileSync(profileFile,JSON.stringify(profile));
    const installed=join(home,'profiles/web/node_modules/persistent-eclipse');
    console.log('DSH Git install retains packs: '+existsSync(join(installed,'packs')));
    // DSH follows npm's engine-only files list. Its default public URL is mapped
    // to the newer fixture library, exercising cold default fetches in real DSH.
    const dshLabs=disciplines.map(id=>{
      const lab=join(root,'dsh-'+id);mkdirSync(join(lab,'.research'),{recursive:true});
      writeFileSync(join(lab,'.research/LAB.md'),'# DSH default library lab\nSync: off\n');
      writeFileSync(join(lab,'.research/MISSION.md'),'Mode: '+id+'\n');return lab;
    });
    const output=join(root,'dsh-catalog.json');
    const probe=`- insert:
    - id: pe-install-probe
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: pe-install-probe
        includeDefaultRoots: false
        customSkillDirs: !!js |
          (() => {
            const fs = process.getBuiltinModule('node:fs');
            const scope = (() => { for(let o=ctx;o;o=Object.getPrototypeOf(o)) {const k=Object.getOwnPropertySymbols(o).find(x=>x.description==='dsh.scope');if(k)return o[k];} })();
            const tick = async () => { try {
              const rows = [];
              for (const cwd of ${JSON.stringify(dshLabs)}) rows.push((await skills.list({cwd,scope})).map(s=>s.name));
              fs.writeFileSync(${JSON.stringify(output)},JSON.stringify(rows));
            } catch(e) { fs.writeFileSync(${JSON.stringify(output)},JSON.stringify({error:String(e)})); } };
            const timer=globalThis.setInterval(tick,300);ctx.on('dispose',()=>globalThis.clearInterval(timer));return [];
          })()
`;
    writeFileSync(join(home,'cordis.patch.yml'),probe);
    const child=spawn(process.execPath,[dsh,'--profile','web','--patch',join(home,'cordis.patch.yml'),'--no-open','--port','0','--host','127.0.0.1'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
    let log='';child.stdout.on('data',b=>{log+=b});child.stderr.on('data',b=>{log+=b});
    try {
      let rows;
      for(const end=Date.now()+45000;Date.now()<end;) {
        try {rows=JSON.parse(readFileSync(output,'utf8'));} catch {}
        if(Array.isArray(rows)&&rows.every(r=>r.includes('pe-fleet'))) break;
        if(child.exitCode!==null || child.signalCode!==null) break;
        await new Promise(r=>setTimeout(r,200));
      }
      assert.ok(Array.isArray(rows)&&rows.length===4,log.slice(-3000)+'\n'+JSON.stringify(rows));
      rows.forEach((names,i)=>{
        assert.ok(names.includes('pe-fleet'));assert.equal(names.includes('pe-math'),disciplines[i]==='math');
        assert.equal(names.includes('pe-hunt'),disciplines[i]==='signals');
        const cli=execFileSync(process.execPath,[join(dshLabs[i],'.research/tools/content.cjs'),'inspect'],{cwd:dshLabs[i],env:{...baseEnv,PE_PACK_CACHE:''},encoding:'utf8'});
        assert.equal(JSON.parse(cli).packs[disciplines[i]].commit,libraryCommit);
      });
      console.log('DSH Git install: newer compatible default libraries and four live mission catalogs passed');
    } finally {if(child.exitCode===null && child.signalCode===null){const stopped=new Promise(r=>child.once('close',r));child.kill('SIGKILL');await stopped;}}
  }
});
