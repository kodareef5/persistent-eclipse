// Real DSH goals and subagents with a fake adapter: an idle manager waiting on a held
// worker gets fleet and housekeeping checks, with timings shortened only in this copy, and
// a completed goal asks for a status report.
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const bin = process.argv[2];
if (!bin) throw new Error('Pass the DSH bin.js path');
const root = mkdtempSync(join(tmpdir(), 'pe-supervise-dsh-'));
const out = join(root, 'result.json');
// DSH's own subagent parallelism limit sets the slots; this test home sets it to three.
const labs = {sharing: 'Housekeeping: off\nHistory: off\nSync: off\n', questions: 'Housekeeping: off\n', free: 'Housekeeping: off\n', red: 'Housekeeping: off\n', tidy: 'Housekeeping: 5s\nProgress check: off\nFleet check: off\n', paused: 'Housekeeping: off\n', done: 'Housekeeping: off\n'};
const fleets = {free: 1, red: 3, tidy: 3, paused: 1, done: 1};
for (const [name, lab] of Object.entries(labs)) {
  mkdirSync(join(root, name, '.research/tools'), {recursive: true});
  writeFileSync(join(root, name, '.research/LAB.md'), '# Lab\n' + lab);
}
writeFileSync(join(root, 'tidy', '.research/tools/old-tool.mjs'), '// old\n');
writeFileSync(join(root, 'tidy', '.research/tools/old-tool.mjs.shipped'), '// fixed\n');
const api = pathToFileURL(join(dirname(dirname(bin)), 'node_modules/@deepseek-ai/dsh-llm/lib/index.js')).href;

async function probe(ctx, paths, fleets) {
  const {LlmAdapter, createUserMessage} = await import(paths.api);
  const {defineTool} = await import(paths.tools);
  const fs = process.getBuiltinModule('node:fs');
  fs.mkdirSync(paths.root + '/sharing/.research/local', {recursive:true});
  const sharingStatus = (state, noticeId = state) => fs.writeFileSync(paths.root + '/sharing/.research/local/sync.json',
    JSON.stringify({state, noticeId, conflicts:['PEER_CONFLICT.md'], advice:['CITATION_ADVICE'], at:new Date().toISOString()}));
  const sharingRequests = [];
  const offTool = ctx.get('tools').register(defineTool({
    name: 'sharing_probe', description: 'Read the disposable test fixture.', parameters: {},
    output: {schema: {type:'object',additionalProperties:false,properties:{}}, render: () => [{type:'text',text:'Fixture read.'}]},
    execute: async () => ({}),
  }));
  const seen = {}, holds = {};
  const say = text => [{type: 'block-start', index: 0, blockType: 'text'}, {type: 'text-delta', index: 0, text},
    {type: 'block-end', index: 0, block: {type: 'text', text}}, {type: 'finish', reason: {kind: 'stop'}}];
  class Fixture extends LlmAdapter {
    async *stream(options) {
      const all = JSON.stringify(options.messages), scenario = options.model;
      if (all.includes('Generate the session title')) { yield* say('Title'); return; }
      if (scenario === 'sharing') {
        sharingRequests.push({text:all, prefix:JSON.stringify(options.messages.filter(m=>m.role==='system').map(m=>m.content))});
        if (sharingRequests.length === 1) {
          sharingStatus('needs-merge');
          yield {type:'block-start',index:0,blockType:'tool-call'};
          yield {type:'block-end',index:0,block:{type:'tool-call',id:'sharing-read',name:'sharing_probe',arguments:'{}'}};
          yield {type:'finish',reason:{kind:'tool-calls'}};
        } else yield* say('Independent research continues.');
        return;
      }
      if(scenario==='questions'){yield* say('Independent work continues.');return;}
      if (!all.includes('Start one worker.')) {
        if (scenario === 'free') {
          yield {type:'block-start',index:0,blockType:'text'};
          while (!await Promise.race([holds[scenario].promise.then(()=>true),new Promise(r=>globalThis.setTimeout(()=>r(false),100))]))
            yield {type:'text-delta',index:0,text:'Still measuring. '};
          yield {type:'block-end',index:0,block:{type:'text',text:'Worker result.'}};
          yield {type:'finish',reason:{kind:'stop'}};
        } else {await holds[scenario].promise;yield* say('Worker result.');}
        return;
      }
      if (!all.includes('started subagent')) {
        for (let i = 0; i < fleets[scenario]; i++) {
          yield {type: 'block-start', index: i, blockType: 'tool-call'};
          yield {type: 'block-end', index: i, block: {type: 'tool-call', id: 'call-' + i, name: 'subagent',
            arguments: JSON.stringify({description: 'hold ' + i, prompt: 'Hold until released.'})}};
        }
        yield {type: 'finish', reason: {kind: 'tool-calls'}};
        return;
      }
      const text = options.messages.at(-1).content?.[0]?.text ?? '';
      (seen[scenario] ??= []).push({at: Date.now(), text});
      yield* say('The worker is still useful. Keep waiting.');
    }
  }
  const off = ctx.get('llm').registerAdapter(['pe-supervise'], new Fixture());
  const goals = ctx.get('goals'), sleep = ms => new Promise(r => globalThis.setTimeout(r, ms));
  const run = async (scenario, ms, before) => {
    let release; holds[scenario] = {promise: new Promise(r => { release = r; })};
    const handle = await ctx.get('agents').create({sessionId: 'pe-supervise-' + scenario, meta: {cwd: paths.root + '/' + scenario},
      setup: agentCtx => ctx.get('agentPresets').mount(agentCtx, 'persistent-eclipse').then(() => undefined),
      agentOptions: {provider: 'pe-supervise', model: scenario}});
    const manager = handle.agent;
    try {
      goals.create(manager, {objective: 'Wait on a held worker.'});
      manager.followup(createUserMessage({source: {kind: 'user'}, content: [{type: 'text', text: 'Start one worker.'}]}));
      const started = Date.now();
      await before?.(manager);
      await sleep(ms);
      const goal = goals.get(manager);
      const sources = manager.session.snapshotEvents().filter(e => e.type === 'user/message' && e.data.source?.kind === 'schedule').map(e => e.data.source);
      return {started, createdAt: goal.createdAt, checks: (seen[scenario] ?? []).filter(s => /<fleet_check>|<housekeeping>|<status_report>/.test(s.text)), rounds: goal.roundsStarted, phase: goal.phase, sources};
    } finally { release(); await sleep(200); await handle.dispose(); }
  };
  const questionCheck=async()=>{
    const questions=(await import(paths.questions)).default,root=paths.root+'/questions';
    const q=questions.submit(root,{question:'May I expand the run?',proposedDefault:'Wait'});
    const handle=await ctx.get('agents').create({sessionId:'pe-question-manager',meta:{cwd:root},agentOptions:{provider:'pe-supervise',model:'questions'}});
    const agent=handle.agent;
    const turn=async()=>{agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:'Continue independent work.'}]}));await agent.whenIdle();await sleep(200);};
    const answers=()=>agent.session.snapshotEvents().filter(e=>e.type==='user/message'&&e.data.source?.check==='operator-answer');
    try{
      await turn();const pending=answers().length;
      questions.answer(root,q.id,'Use only the toy fixture.');await turn();await turn();
      const fresh=await ctx.get('agents').create({sessionId:'pe-question-fresh',meta:{cwd:root},agentOptions:{provider:'pe-supervise',model:'questions'}});
      let replayed;
      try {
        fresh.agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:'A fresh session.'}]}));
        await fresh.agent.whenIdle();await sleep(200);
        replayed=fresh.agent.session.snapshotEvents().filter(e=>e.type==='user/message'&&e.data.source?.check==='operator-answer').length;
      } finally {await fresh.dispose();}
      return {pending,delivered:answers().length,replayed,text:JSON.stringify(answers()),goal:goals.get(agent)?.phase};
    }finally{await handle.dispose();}
  };
  const sharingCheck = async () => {
    sharingStatus('waiting');
    const create = id => ctx.get('agents').create({sessionId:id,meta:{cwd:paths.root+'/sharing'},
      setup: agentCtx => ctx.get('agentPresets').mount(agentCtx, 'persistent-eclipse').then(()=>undefined),
      agentOptions:{provider:'pe-supervise',model:'sharing'}});
    const handle = await create('pe-sharing-manager'), agent = handle.agent;
    const notices = a => a.session.snapshotEvents().filter(e=>e.type==='user/message'&&e.data.source?.check==='sharing-status');
    const turn = async a => {
      a.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:'Continue the fixture investigation.'}]}));
      await a.whenIdle(); await sleep(100);
    };
    try {
      await turn(agent);
      const first = sharingRequests.slice();
      await turn(agent); await turn(agent);
      const delivered = notices(agent).length;
      const before = sharingRequests.length;
      sharingStatus('waiting','new-wait'); await sleep(250);
      const idleCalls = sharingRequests.length - before;
      sharingStatus('synced'); await turn(agent);
      const afterResolved = notices(agent).length;
      sharingStatus('needs-merge');
      const fresh = await create('pe-sharing-fresh');
      let replayed;
      try {await turn(fresh.agent); replayed = notices(fresh.agent).length;}
      finally {await fresh.dispose();}
      const normalRequests = sharingRequests.slice();
      // Another middleware can reject the step before admission. Status must
      // preserve that decision. An empty message list alone is not cancellation:
      // DSH's other middleware may still add its skill/time context to it.
      sharingStatus('waiting','withdrawn-input');
      const empty = await create('pe-sharing-empty');
      const withdraw = ctx.on('agent/pre-step', async ({agent:a}, next) => {
        return a.id === empty.agent.id ? {kind:'reject'} : next();
      });
      let rejectedCalls;
      try {
        await turn(empty.agent); rejectedCalls = sharingRequests.length - normalRequests.length;
      }
      finally {await empty.dispose(); withdraw();}
      return {first,delivered,idleCalls,afterResolved,replayed,rejectedCalls,requests:normalRequests,goal:goals.get(agent)?.phase};
    } finally {await handle.dispose();}
  };
  try {
    return {
      sharing:await sharingCheck(),
      questions:await questionCheck(),
      free: await run('free', 4800),
      red: await run('red', 4200),
      tidy: await run('tidy', 6200),
      paused: await run('paused', 2500, async manager => {
        await sleep(300);
        const g = goals.get(manager);
        goals.pause(manager, {id: g.id, revision: g.revision});
      }),
      done: await run('done', 1500, async manager => {
        await sleep(300);
        const g = goals.get(manager);
        goals.complete(manager, {id: g.id, revision: g.revision});
      }),
    };
  } finally { off(); offTool(); }
}

const shipped = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../cordis.patch.yml'), 'utf8');
const fast = shipped.replaceAll('300000','1000').replaceAll('1200000','2500').replaceAll('900000','2000').replaceAll('1800000','4000');
assert.notEqual(fast, shipped, 'the bundle carries the production fleet-check timings');
const script = `(${probe.toString()})(ctx, ${JSON.stringify({root, api, tools:pathToFileURL(join(dirname(dirname(bin)),'node_modules/@deepseek-ai/dsh-tools/lib/index.js')).href, questions:pathToFileURL(join(dirname(fileURLToPath(import.meta.url)),'questions.cjs')).href})}, ${JSON.stringify(fleets)}).then(result => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify(result)), error => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({error: error.stack})))`;
writeFileSync(join(root, 'cordis.patch.yml'), fast + `
- id: subagent
  config:
    maxActiveSubagents: 3
- insert:
    - id: pe-supervise-test
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: pe-supervise-test
        includeDefaultRoots: false
        watch: false
        customSkillDirs: !!js |
          (() => {
            const fs = process.getBuiltinModule('node:fs')
            globalThis.setTimeout(() => {
${script.split('\n').map(line => '              ' + line).join('\n')}
            }, 1500)
            return []
          })()
`);
const child = spawn('node', [bin, '--profile', 'web', '--no-open', '--port', '0', '--host', '127.0.0.1'],
  {env: {...process.env, DSH_HOME: root, PE_PACK_ROOT:join(dirname(fileURLToPath(import.meta.url)),'../packs')}, stdio: ['ignore', 'ignore', 'pipe']});
let stderr = '';
child.stderr.on('data', data => { stderr += data; });
try {
  for (let i = 0; !existsSync(out); i++) {
    if (i > 600 || child.exitCode !== null) throw new Error('DSH supervision probe did not finish\n' + stderr.slice(-4000));
    await new Promise(resolve => globalThis.setTimeout(resolve, 100));
  }
  const r = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(r.error, undefined, r.error);
  const ok = label => console.log('ok  ', label);
  assert.equal(r.sharing.first.length,2);
  assert.ok(r.sharing.first.every(v => (v.text.match(/PE sharing status:/g)||[]).length===1 && !v.text.includes('PEER_CONFLICT')));
  assert.equal(r.sharing.delivered,2); assert.equal(r.sharing.afterResolved,2);
  assert.equal(r.sharing.idleCalls,0); assert.equal(r.sharing.replayed,0); assert.equal(r.sharing.goal,undefined);
  assert.equal(r.sharing.rejectedCalls,0);
  assert.ok(r.sharing.requests.every(v => !v.text.includes('CITATION_ADVICE')));
  const prefixDifferences = r.sharing.requests.map((v, request) => {
    const first = r.sharing.requests[0].prefix;
    let i = 0; while (i < Math.max(first.length, v.prefix.length) && first[i] === v.prefix[i]) i++;
    return {request, before:first.slice(Math.max(0,i-50),i+200), after:v.prefix.slice(Math.max(0,i-50),i+200)};
  });
  assert.ok(r.sharing.requests.every(v => !v.prefix.includes('PE sharing status:')));
  // A fresh session may have its own DSH context. Within the original session,
  // publishing, conflict notices, advice and adoption leave the prefix intact.
  assert.ok(r.sharing.requests.slice(0,-1).every(v => v.prefix === r.sharing.requests[0].prefix),
    'Sharing changes leave the actual system-prompt content stable: ' + JSON.stringify(prefixDifferences));
  ok('sync: one notice per changed state at a DSH turn boundary, stable system prefix, no idle wake or fresh-session replay, even with History off');
  assert.equal(r.questions.pending,0);assert.equal(r.questions.delivered,1);assert.equal(r.questions.replayed,0);assert.match(r.questions.text,/Use only the toy fixture/);assert.equal(r.questions.goal,undefined);
  ok('questions: independent work continues, an answer arrives once, and no goal is armed');
  const [first, second] = r.free.checks;
  assert.ok(first && second && first.text.includes('2/3 slots free') && first.text.includes('Running workers (age)'), JSON.stringify(r.free));
  assert.ok(second.at - first.at >= 1800 && second.text.includes('next check comes after 4 seconds'), JSON.stringify(r.free));
  assert.equal(r.free.rounds, 0);
  assert.ok(r.free.sources.length >= 2 && r.free.sources.every(s => s.kind === 'schedule' && s.check === 'fleet'));
  ok("fleet check: two of DSH's subagent slots free wake an idle manager, streaming workers do not reset backoff, no goal round, an automation source");
  assert.ok(r.red.checks.length >= 1 && r.red.checks[0].text.includes('Progress to inspect: ') && r.red.checks[0].text.includes('0/3 slots free') && r.red.checks[0].at - r.red.started >= 2400, JSON.stringify(r.red));
  ok('fleet check: a full fleet waits until a worker has no observed progress, then names it');
  // Housekeeping starts at goal creation, before followup finishes queuing work.
  assert.ok(r.tidy.checks.some(c => c.text.includes('<housekeeping>') && c.text.includes('come up for air') && c.at - r.tidy.createdAt >= 5000 && c.at - r.tidy.createdAt < 6200), JSON.stringify(r.tidy));
  ok('housekeeping: arrives on schedule while the manager waits on a full, young fleet');
  assert.ok(r.tidy.checks.some(c => c.text.includes('Lab tools differ from runtime copies: old-tool.mjs') && c.text.includes('the runtime copy may be older')), JSON.stringify(r.tidy));
  ok('housekeeping: names differing runtime copies without assuming they are upgrades');
  assert.equal(r.paused.checks.length, 0, JSON.stringify(r.paused));
  assert.equal(r.paused.phase, 'paused');
  ok('fleet check: a paused goal gets none');
  assert.equal(r.done.phase, 'complete');
  assert.deepEqual(r.done.sources.map(s => s.check), ['status-report'], JSON.stringify(r.done));
  assert.ok(r.done.checks.length === 1 && r.done.checks[0].text.includes('pe-status-report'), JSON.stringify(r.done));
  ok('status report: a completed goal asks the manager for one, once, as an automation task');
  console.log('PASS');
} finally {
  child.kill('SIGKILL');
  await new Promise(resolve => child.exitCode !== null || child.signalCode !== null ? resolve() : child.once('close', resolve));
  rmSync(root, {recursive: true, force: true});
}
