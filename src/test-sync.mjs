import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,renameSync,symlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
import {scheduleSync,syncStatus,pendingSyncNotice,acknowledgeSyncNotice} from './sync.mjs';
import {writeActivity, reportData, RECEIPT_FORMAT} from './history.mjs';
import record from './record.cjs';
const git=(p,...args)=>execFileSync('git',['-C',p,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function setup(t){const root=mkdtempSync(join(tmpdir(),'pe-sync-')),lab=join(root,'lab'),remote=join(root,'remote.git');t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(lab,'.research'),{recursive:true});mkdirSync(remote);git(remote,'init','--bare','-b','main');git(lab,'init','-b','main');git(lab,'config','user.name','Fixture');git(lab,'config','user.email','fixture@example.invalid');writeFileSync(join(lab,'.research/LAB.md'),'Sync: origin main (private, checked today)\n');writeFileSync(join(lab,'.research/.gitignore'),'local/\nscratch/\n');git(lab,'add','.');git(lab,'commit','-m','baseline');git(lab,'remote','add','origin',remote);git(lab,'push','-u','origin','main');git(lab,'config','pe.syncApprovedUrl',remote);return {root,lab,remote};}
function commit(lab,file,text){writeFileSync(join(lab,file),text);git(lab,'add',file);git(lab,'commit','-m','research');}
test('standalone lab commands execute through symlinked installation paths', async t => {
  const {lab,remote,root}=setup(t);
  commit(lab,'.research/FEEDBACK.md','A contribution from a linked installation.');
  for (const name of ['sync','history','cvss'])
    symlinkSync(new URL('./'+name+'.mjs',import.meta.url).pathname,join(root,name+'.mjs'));
  const run=(name,args=[])=>execFileSync(process.execPath,[join(root,name+'.mjs'),...args],{cwd:lab,encoding:'utf8'});
  assert.equal(JSON.parse(run('sync')).state,'synced');
  assert.equal(git(lab,'rev-parse','HEAD'),git(remote,'rev-parse','main'));
  assert.equal(JSON.parse(run('history',['report','--json'])).usage.calls,0);
  assert.match(run('cvss',['CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H']),/score: 9.8/);
});
test('sync pushes only reviewed research, leaves dirty unrelated work alone, and queues outages',async t=>{
 const {lab,remote,root}=setup(t);commit(lab,'.research/FEEDBACK.md','A useful improvement.');writeFileSync(join(lab,'unrelated.txt'),'not staged');await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');assert.equal(git(lab,'rev-parse','HEAD'),git(remote,'rev-parse','main'));assert.ok(git(lab,'status','--porcelain').includes('unrelated.txt'));
 git(lab,'remote','set-url','origin',join(root,'missing'));await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'pending');assert.match(syncStatus(lab).error,/approved/);
 git(lab,'remote','set-url','origin',remote);git(lab,'config','pe.syncApprovedUrl',remote);commit(lab,'.research/FEEDBACK.md','A second finding');renameSync(remote,remote+'.offline');await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'pending');renameSync(remote+'.offline',remote);await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');assert.equal(git(remote,'rev-parse','main'),git(lab,'rev-parse','HEAD'));
});
test('sync does not remove another writer’s lock or publish excluded intermediate commits',async t=>{
 const {lab,remote}=setup(t);mkdirSync(join(lab,'.research/local/sync.lock'),{recursive:true});const r=await scheduleSync(lab,{force:true,background:false});assert.equal(r.state,'busy');assert.ok(existsSync(join(lab,'.research/local/sync.lock')));rmSync(join(lab,'.research/local/sync.lock'),{recursive:true});
 commit(lab,'private.txt','Do not publish');git(lab,'rm','private.txt');git(lab,'commit','-m','remove');await scheduleSync(lab,{force:true,background:false});assert.match(syncStatus(lab).error,/outside/);assert.notEqual(git(lab,'rev-parse','HEAD'),git(remote,'rev-parse','main'));
});

test('the existing approval must match the actual push URL, including multiple destinations', async t => {
  const {lab, remote, root} = setup(t);
  commit(lab, '.research/FEEDBACK.md', 'A reviewed suggestion');
  const before = git(remote, 'rev-parse', 'main');
  git(lab, 'remote', 'set-url', '--push', 'origin', join(root, 'unapproved.git'));
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(syncStatus(lab).state, 'pending'); assert.match(syncStatus(lab).error, /push destinations/);
  git(lab, 'remote', 'set-url', '--add', '--push', 'origin', remote);
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(syncStatus(lab).state, 'pending');
  assert.equal(git(remote, 'rev-parse', 'main'), before);
});
test('conflicting research needs the manager; sync leaves HEAD untouched',async t=>{
 const {lab,remote,root}=setup(t),other=join(root,'other');git(root,'clone',remote,other);git(other,'config','user.name','Other');git(other,'config','user.email','other@example.invalid');commit(other,'.research/FEEDBACK.md','Other finding');git(other,'push');commit(lab,'.research/FEEDBACK.md','Local finding');const head=git(lab,'rev-parse','HEAD');await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'needs-merge');assert.equal(git(lab,'rev-parse','HEAD'),head);
});

function clone(fixture, name) {
  const dir = join(fixture.root, name);
  git(fixture.root, 'clone', fixture.remote, dir);
  git(dir, 'config', 'user.name', name);
  git(dir, 'config', 'user.email', name + '@example.invalid');
  git(dir, 'config', 'pe.syncApprovedUrl', fixture.remote);
  return dir;
}
function put(lab, name, body) {
  const file = join(lab, '.research', name);
  mkdirSync(join(file, '..'), {recursive: true});
  writeFileSync(file, body);
}
function contribute(lab, label, seed) {
  put(lab, 'updates/' + label + '.md', `---\nlab: ${label}\n---\n## ${label}'s new representation\n`);
  const producer = {id: seed.repeat(32), label};
  const envelope = {format: RECEIPT_FORMAT, producer, updated: '2026-11-01T12:00:00Z', calls: [{
    identity: seed.repeat(64), origin: producer, session: seed.repeat(64),
    provider: 'fixture', model: 'model', effort: 'high', role: 'worker', mission: 'math',
    input: 10, output: 5, cacheRead: 10, cacheWrite: 0, total: 25,
  }]};
  put(lab, `activity/${producer.id}/batch-${seed}.json`, JSON.stringify(envelope));
  writeActivity(lab); record.build(lab);
  git(lab, 'add', '.research'); git(lab, 'commit', '-m', label + ' contribution');
}

test('two labs combine additive inputs, regenerate conflicting pages and preserve staged drafts', async t => {
  const f = setup(t), {lab, remote} = f, other = clone(f, 'cedar');
  contribute(lab, 'maple', 'a'); contribute(other, 'cedar', 'b'); git(other, 'push');
  put(lab, 'updates/draft.md', 'PRIVATE_UNCOMMITTED_NOTE');
  git(lab, 'add', '.research/updates/draft.md');
  put(lab, 'updates/draft.md', 'PRIVATE_UNSTAGED_REVISION');
  writeFileSync(join(lab, 'unrelated.txt'), 'Do not stage');
  const staged = git(lab, 'diff', '--cached', '--binary');
  const unstaged = git(lab, 'diff', '--binary');
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(syncStatus(lab).state, 'synced', JSON.stringify(syncStatus(lab)));
  assert.equal(git(lab, 'diff', '--cached', '--binary'), staged);
  assert.equal(git(lab, 'diff', '--binary'), unstaged);
  assert.equal(readFileSync(join(lab, 'unrelated.txt'), 'utf8'), 'Do not stage');
  const page = git(remote, 'show', 'main:.research/REPORT.md');
  assert.match(page, /maple's new representation/); assert.match(page, /cedar's new representation/);
  assert.ok(!page.includes('PRIVATE_'));
  assert.equal(reportData(lab).usage.calls, 2);
  await scheduleSync(other, {force: true, background: false});
  assert.equal(syncStatus(other).state, 'synced');
  assert.equal(git(other, 'rev-parse', 'HEAD'), git(lab, 'rev-parse', 'HEAD'));
  assert.equal(git(other, 'status', '--porcelain'), '');
  assert.equal(readFileSync(join(lab, '.research/activity/overview.svg'), 'utf8'), readFileSync(join(other, '.research/activity/overview.svg'), 'utf8'));
  const head = git(lab, 'rev-parse', 'HEAD');
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(git(lab, 'rev-parse', 'HEAD'), head, 'unchanged inputs create no new report commit');
});

test('simultaneous writers recover after a rejected push without duplicating receipts', async t => {
  const f = setup(t), other = clone(f, 'cedar');
  contribute(f.lab, 'maple', 'a'); contribute(other, 'cedar', 'b');
  await Promise.all([f.lab, other].map(lab => scheduleSync(lab, {force: true, background: false})));
  for (const lab of [f.lab, other, f.lab]) await scheduleSync(lab, {force: true, background: false});
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), git(other, 'rev-parse', 'HEAD'));
  for (const lab of [f.lab, other]) {
    assert.equal(syncStatus(lab).state, 'synced');
    assert.equal(reportData(lab).usage.calls, 2);
    assert.equal(git(lab, 'status', '--porcelain'), '');
  }
});

test('incoming-only sync preserves another renderer’s pages across processes, until this lab contributes', async t => {
  const f = setup(t), other = clone(f, 'older-engine');
  contribute(other, 'cedar', 'b');
  // A different engine version would render different bytes from these inputs.
  put(other, 'REPORT.md', '# Report from a different renderer\n');
  put(other, 'activity/overview.svg', '<svg><!-- different layout --></svg>\n');
  git(other, 'add', '.research'); git(other, 'commit', '-m', 'Other renderer'); git(other, 'push');
  const incoming = git(f.remote, 'rev-parse', 'main');
  const cli = new URL('./sync.mjs', import.meta.url).pathname;
  for (const lab of [f.lab, other, f.lab, other]) {
    execFileSync(process.execPath, [cli], {cwd: lab, stdio: 'pipe'});
    assert.equal(git(lab, 'rev-parse', 'HEAD'), incoming);
    assert.equal(git(f.remote, 'rev-parse', 'main'), incoming);
    assert.equal(readFileSync(join(lab, '.research/REPORT.md'), 'utf8'), '# Report from a different renderer\n');
  }
  put(f.lab, 'updates/maple.md', '## A new local contribution\n');
  git(f.lab, 'add', '.research/updates/maple.md'); git(f.lab, 'commit', '-m', 'Local research');
  await scheduleSync(f.lab, {force: true, background: false});
  assert.match(git(f.remote, 'show', 'main:.research/REPORT.md'), /A new local contribution/);
  assert.match(git(f.remote, 'show', 'main:.research/REPORT.md'), /cedar's new representation/);
  const rebuilt = git(f.remote, 'rev-parse', 'main');
  execFileSync(process.execPath, [cli], {cwd: other, stdio: 'pipe'});
  assert.equal(git(other, 'rev-parse', 'HEAD'), rebuilt);
  assert.equal(git(f.remote, 'rev-parse', 'main'), rebuilt);
});

test('background sharing merges and publishes committed work without touching the live checkout or index', async t => {
  const f = setup(t), other = clone(f, 'cedar');
  contribute(f.lab, 'maple', 'a'); contribute(other, 'cedar', 'b'); git(other, 'push');
  const head = git(f.lab, 'rev-parse', 'HEAD');
  const report = readFileSync(join(f.lab, '.research/REPORT.md'), 'utf8');
  put(f.lab, 'updates/draft.md', 'Staged draft'); git(f.lab, 'add', '.research/updates/draft.md');
  put(f.lab, 'updates/draft.md', 'Still writing');
  put(f.lab, 'MISSION.md', 'Operator’s uncommitted mission');
  const staged = git(f.lab, 'diff', '--cached', '--binary'), unstaged = git(f.lab, 'diff', '--binary');
  await scheduleSync(f.lab, {force: true});
  assert.equal(syncStatus(f.lab).state, 'waiting');
  assert.match(syncStatus(f.lab).notice, /useful pause/);
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), head);
  assert.equal(git(f.lab, 'diff', '--cached', '--binary'), staged);
  assert.equal(git(f.lab, 'diff', '--binary'), unstaged);
  assert.equal(readFileSync(join(f.lab, '.research/REPORT.md'), 'utf8'), report);
  const shared = git(f.remote, 'rev-parse', 'main');
  assert.match(git(f.remote, 'show', 'main:.research/REPORT.md'), /maple's new representation/);
  assert.match(git(f.remote, 'show', 'main:.research/REPORT.md'), /cedar's new representation/);
  assert.ok(!git(f.remote, 'show', 'main:.research/REPORT.md').includes('Staged draft'));
  // A fresh background process neither re-renders nor silently adopts the merge.
  const url = new URL('./sync.mjs', import.meta.url).href;
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const {scheduleSync} = await import(' + JSON.stringify(url) + '); await scheduleSync(process.cwd(), {force:true});'], {cwd: f.lab});
  assert.equal(git(f.remote, 'rev-parse', 'main'), shared);
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), head);
  await scheduleSync(f.lab, {force: true, background: false});
  assert.equal(syncStatus(f.lab).state, 'synced');
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), shared);
  assert.equal(git(f.lab, 'diff', '--cached', '--binary'), staged);
  assert.equal(git(f.lab, 'diff', '--binary'), unstaged);
  assert.equal(readFileSync(join(f.lab, '.research/MISSION.md'), 'utf8'), 'Operator’s uncommitted mission');
});

test('a lone lab publishes successive reports without waiting, notices, or idle commit churn', async t => {
  const {lab, remote} = setup(t);
  for (const name of ['first', 'second', 'third']) {
    put(lab, `updates/${name}.md`, `## ${name} observation\n`);
    git(lab, 'add', '.research/updates'); git(lab, 'commit', '-m', name);
    const head = git(lab, 'rev-parse', 'HEAD'), count = Number(git(remote, 'rev-list', '--count', 'main'));
    await scheduleSync(lab, {force: true});
    const state = syncStatus(lab), published = git(remote, 'rev-parse', 'main');
    assert.equal(state.state, 'synced'); assert.equal(state.behind, 0);
    assert.equal(state.viewsPending, false); assert.equal(state.notice, '');
    assert.equal(pendingSyncNotice(lab), null);
    assert.equal(git(lab, 'rev-parse', 'HEAD'), published);
    assert.equal(git(remote, 'rev-list', '--merges', 'main'), '', 'generated views do not create merge churn');
    assert.match(git(remote, 'show', 'main:.research/REPORT.md'), new RegExp(name + ' observation'));
    assert.equal(Number(git(remote, 'rev-list', '--count', 'main')), count + 2,
      'one contribution plus one prepared report/merge commit, with no additional merge');
    await scheduleSync(lab, {force: true});
    const url = new URL('./sync.mjs', import.meta.url).href;
    execFileSync(process.execPath, ['--input-type=module', '-e',
      'const {scheduleSync} = await import(' + JSON.stringify(url) + '); await scheduleSync(process.cwd(), {force:true});'], {cwd: lab});
    assert.equal(git(remote, 'rev-parse', 'main'), published, 'polling and restart create no commits');
    assert.equal(syncStatus(lab).state, 'synced');
  }
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(git(lab, 'rev-parse', 'HEAD'), git(remote, 'rev-parse', 'main'));
  assert.equal(syncStatus(lab).viewsPending, false);
});

test('background view adoption preserves drafts and waits for staged or edited views', async t => {
  for (const mode of ['unrelated', 'staged', 'view', 'tracked-view']) {
    const {lab, remote} = setup(t);
    if (mode === 'tracked-view') {
      put(lab, 'REPORT.md', 'Earlier report');
      git(lab, 'add', '.research/REPORT.md'); git(lab, 'commit', '-m', 'Earlier view');
    }
    put(lab, 'updates/new.md', '## New observation\n');
    git(lab, 'add', '.research'); git(lab, 'commit', '-m', 'Research');
    const head = git(lab, 'rev-parse', 'HEAD');
    put(lab, 'MISSION.md', 'Operator draft');
    if (mode === 'staged') git(lab, 'add', '.research/MISSION.md');
    if (mode.includes('view')) put(lab, 'REPORT.md', 'Manual report draft');
    const staged = git(lab, 'diff', '--cached', '--binary');
    await scheduleSync(lab, {force: true});
    assert.equal(syncStatus(lab).state, 'synced');
    assert.equal(readFileSync(join(lab, '.research/MISSION.md'), 'utf8'), 'Operator draft');
    assert.equal(git(lab, 'diff', '--cached', '--binary'), staged);
    assert.equal(git(lab, 'rev-parse', 'HEAD'), mode === 'unrelated' ? git(remote, 'rev-parse', 'main') : head);
    assert.equal(syncStatus(lab).viewsPending, mode !== 'unrelated');
    if (mode.includes('view')) assert.equal(readFileSync(join(lab, '.research/REPORT.md'), 'utf8'), 'Manual report draft');
  }
});

test('only generated pages are quiet; peer receipts prompt once until adopted, across restarts', async t => {
  const f = setup(t), other = clone(f, 'peer');
  put(other, 'REPORT.md', '# Another renderer\n');
  put(other, 'activity/labs/peer.svg', '<svg/>');
  git(other, 'add', '.research'); git(other, 'commit', '-m', 'Render'); git(other, 'push');
  await scheduleSync(f.lab, {force: true});
  assert.equal(syncStatus(f.lab).state, 'synced'); assert.equal(pendingSyncNotice(f.lab), null);
  for (const id of ['one', 'two']) {
    put(other, `activity/peer/${id}.json`, '{}');
    git(other, 'add', '.research'); git(other, 'commit', '-m', id); git(other, 'push');
    await scheduleSync(f.lab, {force: true});
    assert.equal(syncStatus(f.lab).state, 'waiting');
    const notice = pendingSyncNotice(f.lab);
    assert.match(notice.text, /Shared research/);
    // Asking or cancelling delivery never acknowledges it.
    assert.deepEqual(pendingSyncNotice(f.lab), notice);
    acknowledgeSyncNotice(f.lab, [notice.id]);
    await scheduleSync(f.lab, {force: true});
    assert.equal(pendingSyncNotice(f.lab), null);
    const url = new URL('./sync.mjs', import.meta.url).href;
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e',
      'const s = await import(' + JSON.stringify(url) + '); console.log(JSON.stringify(s.pendingSyncNotice(process.cwd())));'],
      {cwd: f.lab, encoding: 'utf8'}).trim(), 'null');
    await scheduleSync(f.lab, {force: true, background: false});
    assert.equal(syncStatus(f.lab).state, 'synced');
  }
});

test('background fetch leaves incoming mission and tools for the manager to adopt', async t => {
  const f = setup(t), other = clone(f, 'cedar'), head = git(f.lab, 'rev-parse', 'HEAD');
  put(other, 'MISSION.md', 'Mode: math\nA revised objective.\n');
  put(other, 'tools/research.mjs', '// New conventions\n');
  git(other, 'add', '.research'); git(other, 'commit', '-m', 'Coordinated lab changes'); git(other, 'push');
  await scheduleSync(f.lab, {force: true});
  assert.equal(syncStatus(f.lab).state, 'waiting');
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), head);
  assert.ok(!existsSync(join(f.lab, '.research/MISSION.md')));
  const incoming = git(other, 'rev-parse', 'HEAD');
  await scheduleSync(f.lab, {force: true, background: false});
  assert.equal(git(f.lab, 'rev-parse', 'HEAD'), incoming);
  assert.equal(readFileSync(join(f.lab, '.research/tools/research.mjs'), 'utf8'), '// New conventions\n');
  assert.equal(git(f.remote, 'rev-parse', 'main'), incoming);
});

test('malformed and future peer data stay inspectable without blocking report publication', async t => {
  const {lab, remote} = setup(t);
  contribute(lab, 'maple', 'a');
  put(lab, 'activity/future.json', '{"format":"pe-activity-receipts/9"}');
  put(lab, 'updates/partial.md', '---\nlab: incomplete');
  git(lab, 'add', '.research'); git(lab, 'commit', '-m', 'Peer input needing attention');
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(syncStatus(lab).state, 'synced');
  assert.match(git(remote, 'show', 'main:.research/REPORT.md'), /partial.md/);
  assert.match(git(remote, 'show', 'main:.research/activity/README.md'), /Unsupported receipt format pe-activity-receipts\/9/);
  assert.equal(git(remote, 'show', 'main:.research/activity/future.json'), '{"format":"pe-activity-receipts/9"}');
  assert.equal(reportData(lab).usage.calls, 1);
});

test('local edits overlapping generated output stop integration without a stash or overwrite', async t => {
  const {lab, remote} = setup(t);
  record.build(lab); git(lab, 'add', '.research/REPORT.md'); git(lab, 'commit', '-m', 'Initial report');
  await scheduleSync(lab, {force: true, background: false});
  put(lab, 'updates/new.md', '## A useful observation\n');
  git(lab, 'add', '.research/updates/new.md'); git(lab, 'commit', '-m', 'Research');
  put(lab, 'REPORT.md', 'Manager editing the generated report');
  const head = git(lab, 'rev-parse', 'HEAD'), remoteHead = git(remote, 'rev-parse', 'main');
  await scheduleSync(lab, {force: true, background: false});
  assert.equal(syncStatus(lab).state, 'pending');
  assert.equal(git(lab, 'rev-parse', 'HEAD'), head);
  assert.equal(git(remote, 'rev-parse', 'main'), remoteHead);
  assert.equal(readFileSync(join(lab, '.research/REPORT.md'), 'utf8'), 'Manager editing the generated report');
  assert.equal(git(lab, 'stash', 'list'), '');
});

test('sync recovers a lock left by a terminated process',async t=>{
 const {lab}=setup(t),lock=join(lab,'.research/local/sync.lock');mkdirSync(lock,{recursive:true});
 const dead=spawnSync(process.execPath,['-e','']).pid;writeFileSync(join(lock,'pid'),String(dead));
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');assert.equal(existsSync(lock),false);
});

test('an approved URL is sufficient, with an omitted branch and additive updates',async t=>{
 const {lab,remote}=setup(t);
 commit(lab,'.research/LAB.md','Sync: origin\nHousekeeping: off\n');
 mkdirSync(join(lab,'.research/updates'));
 commit(lab,'.research/updates/fixture.md','## A different approach\n');
 const record=(await import('./record.cjs')).default;record.build(lab);
 git(lab,'add','.research/REPORT.md');git(lab,'commit','-m','Include the readable report');
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');
 assert.equal(git(remote,'rev-parse','main'),git(lab,'rev-parse','HEAD'));
 assert.match(git(remote,'show','main:.research/REPORT.md'),/different approach/);
});

test('sync and manual lint reject a credential anywhere in outgoing history without moving HEAD', async t => {
 const {lab,remote}=setup(t),secret='ghp_'+'A'.repeat(36),before=git(remote,'rev-parse','main');
 commit(lab,'.research/FEEDBACK.md',secret);commit(lab,'.research/FEEDBACK.md','Removed from the current page');
 const head=git(lab,'rev-parse','HEAD');
 const lint=spawnSync(process.execPath,[new URL('./lint-notes.mjs',import.meta.url).pathname,'--push'],{cwd:lab,encoding:'utf8'});
 assert.notEqual(lint.status,0);assert.match(lint.stdout,/looks like a credential/);
 for (const background of [true,false]) {
  await scheduleSync(lab,{force:true,background});
  assert.equal(syncStatus(lab).state,'needs-review');assert.match(syncStatus(lab).problems.join('\n'),/outgoing commit.*credential/);
  assert.equal(git(remote,'rev-parse','main'),before);assert.equal(git(lab,'rev-parse','HEAD'),head);
  assert.ok(!JSON.stringify(syncStatus(lab)).includes(secret),'diagnostics never echo credentials');
 }
});

test('sync advises about unshared evidence without blocking or trusting the mutable copied linter', async t => {
 const {lab,remote}=setup(t),before=git(remote,'rev-parse','main');
 put(lab,'notes/R-1.md','---\nid: R-1\ntargets: [runs/REQ-1/evidence.md:1, vendor/fixture@1.0/source.txt:1, scratch/T-1/draft.md]\n---\n# A finding\n');
 put(lab,'runs/REQ-1/evidence.md','Only local evidence');
 put(lab,'vendor/fixture@1.0/source.txt','A cited dependency source');
 put(lab,'tools/lint-notes.mjs','process.exit(0)');
 git(lab,'add','.research/notes/R-1.md');git(lab,'commit','-m','Finding');
 await scheduleSync(lab,{force:true,background:false});
 assert.equal(syncStatus(lab).state,'synced');assert.match(syncStatus(lab).advice.join('\n'),/not committed/);
 assert.equal(syncStatus(lab).notice,''); assert.equal(pendingSyncNotice(lab),null);
 assert.notEqual(git(remote,'rev-parse','main'),before);
 await scheduleSync(lab,{force:true});assert.equal(syncStatus(lab).advice.length,3,'advice survives a quiet poll');
 put(lab,'notes/R-1.md',readFileSync(join(lab,'.research/notes/R-1.md'),'utf8').replace(', scratch/T-1/draft.md',''));
 git(lab,'add','.research/notes/R-1.md','.research/runs/REQ-1/evidence.md','.research/vendor/fixture@1.0/source.txt');git(lab,'commit','-m','Evidence');
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');
 assert.equal(git(lab,'show','HEAD:.research/runs/REQ-1/evidence.md'),'Only local evidence');
 assert.deepEqual(syncStatus(lab).advice,[],'committing the evidence clears the advice');
});

test('intentional large artifacts need the committed explanation and still get credential checks', async t => {
 const {lab}=setup(t);
 put(lab,'reports/large.txt','Long proof\n'.repeat(530000));git(lab,'add','.research/reports');git(lab,'commit','-m','Full artifact');
 put(lab,'LARGE.md','`.research/reports/large.txt`: complete proof transcript.');
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'needs-review');assert.match(syncStatus(lab).problems.join('\n'),/MiB/);
 git(lab,'add','.research/LARGE.md');git(lab,'commit','-m','Explain artifact');
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');
 commit(lab,'.research/reports/large.txt','Long proof\n'.repeat(530000)+'\nghp_'+'B'.repeat(36));
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'needs-review');assert.match(syncStatus(lab).problems.join('\n'),/credential/);
});

for (const indent of ['', '    ', '\t']) test(`manager-only sharing respects ${JSON.stringify(indent)} indentation and explicit commands use the same checks`, async t => {
 const {lab,remote}=setup(t),before=git(remote,'rev-parse','main');
 commit(lab,'.research/LAB.md',`${indent}Sync: origin main\n${indent}Auto sync: off\n`);
 commit(lab,'.research/FEEDBACK.md','A reviewed finding');
 await scheduleSync(lab,{force:true});assert.equal(syncStatus(lab).state,'manual');assert.equal(git(remote,'rev-parse','main'),before);
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'synced');assert.equal(syncStatus(lab).automatic,false);
 assert.equal(git(remote,'rev-parse','main'),git(lab,'rev-parse','HEAD'));
 commit(lab,'.research/FEEDBACK.md','ghp_'+'C'.repeat(36));
 await scheduleSync(lab,{force:true,background:false});assert.equal(syncStatus(lab).state,'needs-review');
});
