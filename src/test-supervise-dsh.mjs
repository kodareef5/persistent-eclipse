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
const labs = {free: 'Housekeeping: off\n', red: 'Housekeeping: off\n', tidy: 'Housekeeping: 5s\n', paused: 'Housekeeping: off\n', done: 'Housekeeping: off\n'};
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
  const seen = {}, holds = {};
  const say = text => [{type: 'block-start', index: 0, blockType: 'text'}, {type: 'text-delta', index: 0, text},
    {type: 'block-end', index: 0, block: {type: 'text', text}}, {type: 'finish', reason: {kind: 'stop'}}];
  class Fixture extends LlmAdapter {
    async *stream(options) {
      const all = JSON.stringify(options.messages), scenario = options.model;
      if (all.includes('Generate the session title')) { yield* say('Title'); return; }
      if (!all.includes('Start one worker.')) { await holds[scenario].promise; yield* say('Worker result.'); return; }
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
      return {started, checks: (seen[scenario] ?? []).filter(s => /<fleet_check>|<housekeeping>|<status_report>/.test(s.text)), rounds: goal.roundsStarted, phase: goal.phase, sources};
    } finally { release(); await sleep(200); await handle.dispose(); }
  };
  try {
    return {
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
  } finally { off(); }
}

const shipped = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../cordis.patch.yml'), 'utf8');
const fast = shipped.replace('IDLE_MS = 15 * 60_000, RED_MS = 67 * 60_000', 'IDLE_MS = 1000, RED_MS = 2500');
assert.notEqual(fast, shipped, 'the bundle carries the production fleet-check timings');
const script = `(${probe.toString()})(ctx, ${JSON.stringify({root, api})}, ${JSON.stringify(fleets)}).then(result => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify(result)), error => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({error: error.stack})))`;
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
  {env: {...process.env, DSH_HOME: root}, stdio: ['ignore', 'ignore', 'pipe']});
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
  const [first, second] = r.free.checks;
  assert.ok(first && second && first.text.includes('2/3 slots free') && first.text.includes('Running workers (age)'), JSON.stringify(r.free));
  assert.ok(second.at - first.at >= 1800 && second.text.includes('next check comes after 4 seconds'), JSON.stringify(r.free));
  assert.equal(r.free.rounds, 0);
  assert.ok(r.free.sources.length >= 2 && r.free.sources.every(s => s.kind === 'schedule' && s.check === 'fleet'));
  ok("fleet check: two of DSH's subagent slots free wake an idle manager, waiting doubles the interval, no goal round, an automation source");
  assert.ok(r.red.checks.length >= 1 && r.red.checks[0].text.includes('Red: ') && r.red.checks[0].text.includes('0/3 slots free') && r.red.checks[0].at - r.red.started >= 2400, JSON.stringify(r.red));
  ok('fleet check: a full fleet waits until a worker turns red, then names it');
  assert.ok(r.tidy.checks.some(c => c.text.includes('<housekeeping>') && c.text.includes('come up for air') && c.at - r.tidy.started >= 4900 && c.at - r.tidy.started < 6200), JSON.stringify(r.tidy));
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
