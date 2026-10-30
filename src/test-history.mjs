import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, appendFileSync, existsSync, symlinkSync, lstatSync, cpSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {aggregate, archive, captureSession, captureSearch, collect, indexSession, readLog, refreshReport, scheduleReport, reportData, renderReport, verifyArchive} from './history.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pe-history-')), lab = join(root, 'lab with spaces');
  mkdirSync(join(lab, '.research'), {recursive: true});
  writeFileSync(join(lab, '.research', 'LAB.md'), '# Lab\n');
  t.after(() => rmSync(root, {recursive: true, force: true}));
  return {root, lab, put(path, value) { const file = join(lab, path); mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, value); return file; }};
}
const usage = {input: 100, output: 30, cacheRead: 50, cacheWrite: 0, reasoning: 10, cost: {total: 0.01}};
const piEvents = [
  {type: 'model_change', id: 'a', parentId: null, provider: 'probe', modelId: 'one'},
  {type: 'thinking_level_change', id: 'b', parentId: 'a', thinkingLevel: 'high'},
  {type: 'message', id: 'c', parentId: 'b', timestamp: '2026-10-29T12:00:00Z', message: {role: 'assistant', provider: 'probe', model: 'one', usage, content: [{type: 'toolCall', name: 'bash', arguments: {command: 'true'}}]}},
];

test('Pi forks and copies count once, while branch effort follows parents', () => {
  const extended = [...piEvents,
    {type: 'thinking_level_change', id: 'd', parentId: 'c', thinkingLevel: 'low'},
    {...piEvents[2], id: 'e', parentId: 'd'},
    {...piEvents[2], id: 'f', parentId: 'b'},
    {type: 'compaction', id: 'g', parentId: 'f', usage},
    {type: 'message', id: 'h', parentId: 'g', message: {role: 'assistant', usage: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0}, content: []}},
  ];
  const a = {runtime: 'pi', header: {id: 'original'}, events: piEvents};
  const b = {runtime: 'pi', header: {id: 'fork', parentSession: 'original'}, events: extended};
  const u = aggregate([a,b,a]);
  assert.equal(u.calls, 5); assert.equal(u.duplicateCalls, 2); assert.equal(u.unmetered, 1);
  assert.equal(u.tools.bash, 3);
  assert.equal(u.rows.find(r => r.effort === 'high' && r.costKind === 'estimate').sums.input, 200);
  assert.equal(u.rows.find(r => r.effort === 'low').sums.input, 100);
  assert.equal(u.rows.find(r => r.kind === 'compaction').model, 'unknown');
});

test('DSH counts settled attempts, model changes, cache buckets, and optional fields', () => {
  const events = [
    {type: 'request/header', data: {header: {config: {provider: 'probe', model: 'deep', reasoningEffort: 'high'}}}},
    {type: 'assistant/attempt', data: {stream: [{type: 'chunk', chunk: {type: 'usage', usage: {inputTokens: 10, outputTokens: 2}}}]}},
    {type: 'assistant/message', data: {usage: {inputTokens: 100, outputTokens: 30, cacheReadTokens: 40, cacheWriteTokens: 5, reasoningTokens: 20}, stream: [{type: 'chunk', chunk: {type: 'usage', usage: {inputTokens: 90, outputTokens: 25}}}]}},
    {type: 'request/header', data: {header: {config: {provider: 'probe', model: 'other'}}}},
    {type: 'assistant/message', data: {stream: []}},
    {type: 'tool/call', data: {name: 'read'}},
  ].map((e,seq) => ({...e, seq, time: 1793275200000 + seq}));
  const log = {runtime: 'dsh', header: {id: 'dsh'}, events};
  const u = aggregate([log, {...log, header: {id: 'fork', isSeeded: true}}]);
  assert.equal(u.calls, 3); assert.equal(u.unmetered, 1); assert.equal(u.tools.read, 1);
  const row = u.rows.find(r => r.model === 'deep' && r.kind === 'response');
  assert.equal(row.sums.input, 100); assert.equal(row.sums.output, 30); assert.equal(row.sums.reasoning, 20);
  assert.equal(u.rows.find(r => r.kind === 'attempt').coverage.cacheRead, undefined);
  assert.equal(u.rows.find(r => r.model === 'other').effort, 'unknown');
});

test('capture survives scratch deletion, preserves rewrites, and respects History: off', t => {
  const {lab, put} = fixture(t), header = {type: 'session', id: 'pi-1', cwd: lab};
  const path = captureSession(lab, 'pi', header, piEvents, {role: 'worker'});
  captureSession(lab, 'pi', header, piEvents, {role: 'worker'});
  assert.equal(readLog(path).events.length, 3);
  const rewritten = captureSession(lab, 'pi', header, [piEvents[0]]);
  assert.notEqual(path, rewritten); assert.equal(readLog(path).events.length, 3);
  put('.research/scratch/task/session/worker.jsonl', [header, ...piEvents].map(JSON.stringify).join('\n') + '\n');
  assert.equal(collect(lab, {piDir: join(lab, 'nonexistent')}).sessions, 1);
  rmSync(join(lab, '.research', 'scratch'), {recursive: true});
  refreshReport(lab, true);
  assert.equal(reportData(lab).usage.calls, 1);
  assert.ok(existsSync(join(lab, '.research', 'local', 'ACTIVITY.md')));
  put('.research/LAB.md', '# lab\nHistory: off\n');
  assert.equal(captureSession(lab, 'pi', {...header, id: 'off'}, piEvents), null);
});

test('collection separates labs, reports torn records, and tolerates a legacy contributor', t => {
  const {root, lab, put} = fixture(t), piDir = join(root, 'pi'); mkdirSync(piDir);
  writeFileSync(join(piDir, 'same.jsonl'), [{type: 'session', id: 'same', cwd: lab}, ...piEvents].map(JSON.stringify).join('\n') + '\n{"torn":');
  writeFileSync(join(piDir, 'other.jsonl'), JSON.stringify({type: 'session', id: 'other', cwd: root}) + '\n');
  put('.research/inbox/visitor.md', 'A useful review with no metadata.\n');
  const got = collect(lab, {piDir});
  assert.equal(got.sessions, 1); assert.equal(got.warnings.length, 1);
  const data = reportData(lab); assert.equal(data.identity, null); assert.equal(data.usage.sessions.length, 1);
});

test('report uses recorded states, links, partial accounting, and search receipts', t => {
  const {lab, put} = fixture(t);
  put('.research/notes/R-1.md', '---\nid: R-1\nstate: refuted\n---\n# A claim\n');
  put('.research/notes/R-2.md', '---\nid: R-2\nstate: supported\n---\n# Another claim\n');
  put('.research/reviews/visitor.md', '# Review\n');
  captureSession(lab, 'pi', {id: 'usage', cwd: lab}, piEvents);
  const receipt = {model: 'search', retrieved: '2026-10-29', usage: {prompt_tokens: 100, prompt_tokens_details: {cached_tokens: 40}, completion_tokens: 20, cost: .002}};
  const path = put('.research/intel/search-one.json', JSON.stringify(receipt)); captureSearch(lab, path);
  const data = reportData(lab), text = renderReport(data);
  assert.equal(data.record.counts.refuted, 1); assert.equal(data.record.artifacts.reviews, 1);
  assert.equal(data.usage.calls, 2); assert.equal(data.usage.rows.find(r => r.kind === 'search').sums.input, 60);
  assert.ok(text.includes('../notes/R-1.md')); assert.ok(text.includes('unnamed')); assert.ok(text.includes('REASONING'));
  assert.ok(text.includes('reported')); assert.ok(text.includes('estimate'));
});

test('archive restores reachable Git history, staged and loose work, logs, and extra inputs', async t => {
  const {root, lab, put} = fixture(t);
  const g = args => execFileSync('git', ['-C', lab, ...args], {encoding: 'utf8'});
  g(['init', '-q']); g(['config', 'user.email', 'test@example.invalid']); g(['config', 'user.name', 'Test']);
  put('paper.txt', 'original\n'); g(['add', '.']); g(['commit', '-qm', 'initial']);
  put('paper.txt', 'staged\n'); g(['add', 'paper.txt']); put('paper.txt', 'unstaged\n');
  put('untracked.txt', 'loose notes\n'); put('node_modules/rebuild.txt', 'cache\n');
  captureSession(lab, 'pi', {type: 'session', id: 'saved', cwd: lab}, piEvents, {runtimeVersion: 'fixture', role: 'manager'});
  const extra = join(root, 'input.csv'); writeFileSync(extra, 'a,b\n1,2\n');
  symlinkSync(extra, join(lab, 'external-input'));
  const out = join(root, 'archive'), saved = await archive(lab, out, {include: [extra]});
  assert.equal((await verifyArchive(out)).files, saved.files);
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.json')));
  assert.ok(manifest.omitted.some(x => x.path.includes('node_modules')));
  assert.equal(manifest.links[0].target, extra); assert.ok(!existsSync(join(out, 'workspace', 'external-input')));
  assert.equal(readFileSync(join(out, 'workspace', 'paper.txt'), 'utf8'), 'unstaged\n');
  assert.equal(readFileSync(join(out, 'extras', '0', 'input.csv'), 'utf8'), 'a,b\n1,2\n');
  assert.ok(readFileSync(join(out, 'ACTIVITY.md'), 'utf8').includes('1 recorded calls'));
  const restored = join(root, 'restored');
  execFileSync('git', ['clone', '-q', join(out, manifest.repositories[0].bundle), restored]);
  assert.equal(readFileSync(join(restored, 'paper.txt'), 'utf8'), 'original\n');
  execFileSync('git', ['-C', restored, 'apply', '--cached', join(out, 'repositories/0/staged.patch')]);
  assert.equal(execFileSync('git', ['-C', restored, 'show', ':paper.txt'], {encoding: 'utf8'}), 'staged\n');
  assert.ok(readdirSync(join(out, 'conversations')).some(f => f.endsWith('.pi.jsonl')));
  await assert.rejects(archive(lab, out), /already exists/);
  await assert.rejects(archive(lab, join(lab, 'archive')), /outside/);
  appendFileSync(join(out, 'workspace', 'paper.txt'), 'tampered\n');
  await assert.rejects(verifyArchive(out), /mismatch/);
});

test('verifier rejects path traversal and symlink replacement', async t => {
  const {root, lab, put} = fixture(t); put('data', 'kept');
  const out = join(root, 'archive'); await archive(lab, out);
  rmSync(join(out, 'workspace', 'data')); symlinkSync(join(lab, 'data'), join(out, 'workspace', 'data'));
  await assert.rejects(verifyArchive(out), /symlink/);
  const manifestPath = join(out, 'manifest.json'), manifest = JSON.parse(readFileSync(manifestPath));
  manifest.files[0].path = '../escape'; writeFileSync(manifestPath, JSON.stringify(manifest));
  await assert.rejects(verifyArchive(out), /Unsafe/);
});

test('archives worktrees with external gitdirs and rejects a disguised recursive destination', async t => {
  const {root, lab, put} = fixture(t);
  const g = args => execFileSync('git', ['-C', lab, ...args], {encoding: 'utf8'});
  g(['init', '-q']); g(['config', 'user.email', 'test@example.invalid']); g(['config', 'user.name', 'Test']);
  put('result', 'proof'); g(['add', '.']); g(['commit', '-qm', 'a result']);
  const worktree = join(root, 'worktree'); g(['worktree', 'add', '--detach', worktree]);
  const out = join(root, 'worktree-archive'); await archive(worktree, out);
  assert.ok(existsSync(join(out, 'repositories/0/history.bundle')));
  const disguised = join(root, 'shortcut'); symlinkSync(lab, disguised);
  await assert.rejects(archive(lab, join(disguised, 'recursive')), /outside/);
});

test('one malformed record leaves the rest of a conversation useful', t => {
  const {lab, put} = fixture(t);
  put('.research/local/sessions/bad.jsonl', [JSON.stringify({type: 'pe-session', version: 1, runtime: 'dsh', header: {id: 'damaged'}}), 'null', JSON.stringify({type: 'assistant/attempt'})].join('\n'));
  const data = reportData(lab);
  assert.equal(data.usage.calls, 1); assert.equal(data.usage.unmetered, 1); assert.equal(data.warnings.length, 1);
});

test('the standalone CLI prints Markdown and writes a local report', t => {
  const {lab} = fixture(t), tool = new URL('./history.mjs', import.meta.url).pathname;
  const stdout = execFileSync(process.execPath, [tool, 'report'], {cwd: lab, encoding: 'utf8'});
  assert.ok(stdout.startsWith('# lab with spaces'));
  execFileSync(process.execPath, [tool, 'report', '--write'], {cwd: lab});
  assert.ok(lstatSync(join(lab, '.research/local/ACTIVITY.md')).isFile());
});

test('a real shared remote gives every clone collective usage without sharing transcripts', t => {
  const {root, lab: mac, put} = fixture(t), remote = join(root, 'shared.git'), gpu = join(root, 'gpu'), reader = join(root, 'reader');
  const g = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {encoding: 'utf8', stdio: ['ignore','pipe','pipe']});
  const configure = (cwd, name) => { g(cwd, 'config','user.name','Test'); g(cwd,'config','user.email','test@example.invalid'); g(cwd,'config','pe.lab', name); };
  g(root,'init','--bare',remote); g(mac,'init','-b','main'); configure(mac,'mac');
  for (const name of ['mac','gpu','old']) put(`.research/labs/${name}/HOST.md`, `# ${name}\n`);
  put('.research/notes/R-mac-1.md', '---\nid: R-mac-1\nstate: supported\n---\n# Shared result\n');
  g(mac,'add','.'); g(mac,'commit','-m','Start a shared lab'); g(mac,'remote','add','origin',remote); g(mac,'push','-u','origin','main');
  g(root,'clone','-b','main',remote,gpu); configure(gpu,'gpu');
  const events = structuredClone(piEvents); events[2].message.content.push({type: 'text', text: 'DO_NOT_SHARE_PRIVATE_TEXT'});
  captureSession(mac,'pi',{type:'session',id:'private-mac-session',cwd:mac},events,{role:'manager',observedFrom:0});
  refreshReport(mac,true);
  const own = reportData(mac).collective.labs.find(x => x.label === 'mac');
  assert.equal(own.calls,1); assert.equal(own.tokens,180);
  g(mac,'add','.research/activity'); g(mac,'commit','-m','Share usage receipts'); g(mac,'push');
  g(gpu,'pull','--ff-only');
  const fork = [...events, {type:'thinking_level_change',id:'gpu-level',parentId:'c',thinkingLevel:'low'},
    {...events[2],id:'gpu-new-call',parentId:'gpu-level',message:{...events[2].message,model:'two'}}];
  captureSession(gpu,'pi',{type:'session',id:'private-gpu-fork',cwd:gpu,parentSession:'private-mac-session'},fork,{role:'worker',observedFrom:events.length});
  refreshReport(gpu,true);
  let data = reportData(gpu);
  assert.equal(data.usage.calls,2); assert.equal(data.collective.tokens,360);
  assert.equal(data.collective.labs.find(x => x.label === 'gpu').calls,1);
  assert.equal(data.collective.labs.find(x => x.label === 'gpu').models[0].effort,'low');
  assert.equal(data.collective.labs.find(x => x.label === 'mac').calls,1);
  assert.equal(data.collective.labs.find(x => x.label === 'old').calls,null);
  const text = renderReport(data); assert.ok(text.includes('not shared')); assert.ok(text.includes('collective'));
  g(gpu,'add','.research/activity'); g(gpu,'commit','-m','Share GPU effort'); g(gpu,'push');
  refreshReport(gpu,true);
  assert.equal(g(gpu,'status','--porcelain'), '', 'unchanged receipts do not create Git churn');
  const tracked = g(gpu,'ls-files'); assert.ok(!tracked.includes('.research/local'));
  const sharedText = g(gpu,'grep','-h','.','--','.research/activity');
  for (const secret of ['DO_NOT_SHARE_PRIVATE_TEXT', 'private-mac-session', 'private-gpu-fork', mac, gpu, 'arguments', 'command']) assert.ok(!sharedText.includes(secret), secret);
  g(mac,'pull','--ff-only'); g(root,'clone','-b','main',remote,reader);
  data = reportData(reader);
  assert.equal(data.usage.calls,2); assert.equal(data.collective.tokens,360);
  assert.equal(data.usage.sessions.length,0); assert.equal(data.collective.sessions,2);
  assert.equal(data.record.notes.length,1);
  assert.deepEqual(reportData(mac).collective.labs.map(x=>[x.label,x.calls]), data.collective.labs.map(x=>[x.label,x.calls]));
  rmSync(join(gpu,'.research/local/sessions'),{recursive:true}); refreshReport(gpu,true);
  assert.equal(reportData(gpu).collective.tokens,360,'shared receipts survive local transcript cleanup');
});

test('unnamed labs remain distinct and old work stays unattributed', t => {
  const {root, lab} = fixture(t), other = join(root,'second');
  mkdirSync(join(other,'.research'),{recursive:true}); writeFileSync(join(other,'.research/LAB.md'),'# Lab\n');
  captureSession(lab,'pi',{id:'first',cwd:lab},piEvents,{observedFrom:0}); refreshReport(lab,true);
  const newer = structuredClone(piEvents); newer[2].id = 'different-call';
  captureSession(other,'pi',{id:'second',cwd:other},newer,{observedFrom:0}); refreshReport(other,true);
  cpSync(join(other,'.research/activity'),join(lab,'.research/activity'),{recursive:true});
  let data = reportData(lab);
  assert.equal(data.usage.calls,2); assert.equal(data.collective.labs.filter(x=>x.label.startsWith('unnamed ')).length,2);
  const old = structuredClone(piEvents); old[2].id='old-call';
  captureSession(lab,'pi',{id:'legacy',cwd:lab},old,{imported:true});
  data = reportData(lab); assert.equal(data.collective.labs.find(x=>x.label==='unattributed').calls,1);
  const next = {...old[2],id:'new-local-call'};
  captureSession(lab,'pi',{id:'legacy',cwd:lab},[...old,next],{observedFrom:old.length});
  data = reportData(lab); assert.equal(data.collective.labs.find(x=>x.label==='unattributed').calls,1);
  assert.equal(data.usage.calls,4);
});

test('Sync off leaves fresh effort local and malformed shared receipts are just a gap', t => {
  const {lab,put} = fixture(t); put('.research/LAB.md','# lab\nSync: off\n');
  captureSession(lab,'pi',{id:'private',cwd:lab},piEvents,{observedFrom:0}); refreshReport(lab,true);
  assert.equal(existsSync(join(lab,'.research/activity')),false);
  put('.research/activity/unknown.json','{"format":"future-version"}');
  const data=reportData(lab); assert.equal(data.usage.calls,1); assert.equal(data.warnings.length,1);
});

test('Sync uses the first word on its own line, including an operator note after off', t => {
  const {lab,put} = fixture(t);
  captureSession(lab,'pi',{id:'private-with-note',cwd:lab},piEvents,{observedFrom:0});
  for (const policy of ['Sync: off (operator, 2026-10-30)', '\tSync: OFF\t(operator)', 'Sync: off(operator)', 'Sync: off # paused']) {
    put('.research/LAB.md', `# lab\n${policy}\n`);
    refreshReport(lab,true);
    assert.equal(existsSync(join(lab,'.research/activity')),false,policy);
    assert.equal(reportData(lab).usage.calls,1,'local accounting continues');
  }
  for (const policy of ['Sync: office', 'Sync:\n off']) {
    put('.research/LAB.md', `# lab\n${policy}\n`);
    refreshReport(lab,true);
    assert.equal(existsSync(join(lab,'.research/activity')),true,policy);
    rmSync(join(lab,'.research/activity'),{recursive:true});
  }
});

test('conflicting attribution never doubles effort or silently picks a lab', () => {
  const origin = {id:'a'.repeat(32),label:'mac'}, other = {id:'b'.repeat(32),label:'gpu'};
  const call = aggregate([{runtime:'pi',header:{id:'one'},events:piEvents,attribution:[{from:0,producer:origin}]}]).receipts[0];
  const u = aggregate([],[],[call,{...call,origin:other},call]);
  assert.equal(u.calls,1); assert.equal(u.attributionConflicts,1); assert.equal(u.receipts[0].origin,null);
  const again = aggregate([],[],[call,...u.receipts,call]);
  assert.equal(again.attributionConflicts,1); assert.equal(again.receipts[0].origin,null);
});

test('naming an unnamed lab changes its label without splitting its past effort', t => {
  const {lab} = fixture(t);
  captureSession(lab,'pi',{id:'unnamed-first',cwd:lab},piEvents,{observedFrom:0}); refreshReport(lab,true);
  const before = reportData(lab).collective.labs[0]; assert.ok(before.label.startsWith('unnamed '));
  execFileSync('git',['-C',lab,'init','-q']); execFileSync('git',['-C',lab,'config','pe.lab','mac']);
  refreshReport(lab,true);
  const after = reportData(lab).collective.labs;
  assert.equal(after.length,1); assert.equal(after[0].label,'mac'); assert.equal(after[0].id,before.id); assert.equal(after[0].calls,1);
});

test('Pi indexing avoids copies, and collection retains attribution before originals are removed', t => {
  const {root, lab} = fixture(t), original = join(root, 'native.jsonl');
  const header = {type: 'session', id: 'native', cwd: lab};
  writeFileSync(original, [header, ...piEvents].map(JSON.stringify).join('\n') + '\n');
  indexSession(lab, header, original, {role: 'worker', observedFrom: 0});
  assert.equal(existsSync(join(lab, '.research/local/sessions')), false);
  const before = reportData(lab);
  assert.equal(before.collective.labs.find(r => r.local).calls, 1);
  const got = collect(lab, {piDir: join(root, 'none')});
  assert.equal(got.sessions, 1); assert.equal(got.warnings.length, 0);
  assert.equal(reportData(lab).usage.calls, 1, 'the index and retained copy count once');
  rmSync(original);
  const after = reportData(lab);
  assert.equal(after.collective.labs.find(r => r.local).tokens, before.collective.tokens);
  assert.equal(after.usage.calls, 1);
  assert.equal(after.warnings.length, 0, 'expected cleanup uses the retained snapshot without missing-file noise');
});

test('archives materialize indexed conversations without depending on their original machine', async t => {
  const {root, lab} = fixture(t), original = join(root, 'outside-native.jsonl');
  const header = {type: 'session', id: 'external-native', cwd: lab};
  writeFileSync(original, [header, ...piEvents].map(JSON.stringify).join('\n') + '\n');
  indexSession(lab, header, original, {role: 'manager', observedFrom: 0});
  const out = join(root, 'archive'); await archive(lab, out);
  assert.equal(existsSync(join(lab, '.research/local/sessions')), false, 'archiving need not duplicate logs in the live lab');
  rmSync(original);
  const data = reportData(join(out, 'workspace'));
  assert.equal(data.usage.calls, 1); assert.equal(data.warnings.length, 0);
  assert.ok(readdirSync(join(out, 'conversations')).some(f => f.endsWith('.pi.jsonl')));
  await verifyArchive(out);
});

test('new receipt batches never rewrite old calls or multiply them across refreshes', t => {
  const {lab} = fixture(t), header = {type: 'session', id: 'growing', cwd: lab};
  const events = [...piEvents], prior = new Map();
  for (let round = 0; round < 8; round++) {
    if (round) events.push({...piEvents[2], id: `call-${round}`});
    captureSession(lab, 'pi', header, events, {observedFrom: 0}); refreshReport(lab, true);
    const root = join(lab, '.research/activity'), dir = join(root, readdirSync(root)[0]);
    let calls = 0;
    for (const name of readdirSync(dir)) {
      const body = readFileSync(join(dir, name), 'utf8');
      if (prior.has(name)) assert.equal(body, prior.get(name), `${name} is immutable`);
      prior.set(name, body); calls += JSON.parse(body).calls.length;
    }
    assert.equal(calls, round + 1);
  }
  assert.equal(reportData(lab).usage.calls, 8);
});

test('large indexed labs report off the caller event loop and coalesce a final refresh', async t => {
  const {root, lab} = fixture(t), native = join(root, 'native'); mkdirSync(native);
  const header = {type: 'session', id: 'large-manager', cwd: lab};
  const original = join(native, 'manager.jsonl');
  const large = {type: 'message', id: 'big-read', parentId: 'c', message: {role: 'toolResult', content: [{type: 'text', text: 'x'.repeat(15 * 1024 * 1024)}]}};
  writeFileSync(original, [header, ...piEvents, large].map(JSON.stringify).join('\n') + '\n');
  indexSession(lab, header, original, {role: 'manager', observedFrom: 0});
  for (let i = 0; i < 120; i++) {
    const h = {...header, id: `worker-${i}`}, file = join(native, `${i}.jsonl`);
    writeFileSync(file, [h, ...piEvents.slice(0,2), {...piEvents[2], id: `worker-call-${i}`}].map(JSON.stringify).join('\n') + '\n');
    indexSession(lab, h, file, {role: 'worker', observedFrom: 0});
  }
  assert.equal(existsSync(join(lab, '.research/local/sessions')), false);
  let beats = 0, maxGap = 0, last = performance.now();
  const timer = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; beats++; }, 5);
  t.after(() => clearInterval(timer));
  const pending = scheduleReport(lab, true);
  appendFileSync(original, JSON.stringify({...piEvents[2], id: 'last-call'}) + '\n');
  assert.equal(scheduleReport(lab, true), pending, 'one in-flight report per lab');
  await pending; clearInterval(timer);
  assert.ok(beats >= 3, 'the caller keeps servicing timers during the scan');
  t.diagnostic(`15 MiB manager + 120 workers: ${beats} caller heartbeats, longest gap ${Math.round(maxGap)} ms`);
  const text = readFileSync(join(lab, '.research/local/ACTIVITY.md'), 'utf8');
  assert.ok(text.includes('122 recorded calls'));
  assert.equal(reportData(lab).collective.tokens, 122 * 180);
});
