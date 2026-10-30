// Real DSH agent loops and its native retry executor, using a local fake adapter.
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const bin = process.argv[2];
if (!bin) throw new Error('Pass the DSH bin.js path');
const root = mkdtempSync(join(tmpdir(), 'pe-retry-dsh-'));
const lab = join(root, 'lab'), plain = join(root, 'plain'), out = join(root, 'result.json');
mkdirSync(join(lab, '.research'), {recursive: true}); mkdirSync(plain);
writeFileSync(join(lab, '.research/LAB.md'), '# Lab\n');
const api = pathToFileURL(join(dirname(dirname(bin)), 'node_modules/@deepseek-ai/dsh-llm/lib/index.js')).href;

async function probe(ctx, paths) {
  const fs = process.getBuiltinModule('node:fs');
  const {LlmAdapter, createUserMessage} = await import(paths.api);
  const calls = new Map(), requests = new Map();
  class Fixture extends LlmAdapter {
    async *stream(options) {
      const n = (calls.get(options.model) ?? 0) + 1;
      calls.set(options.model, n);
      requests.set(options.model, [...(requests.get(options.model) ?? []), JSON.stringify(options.messages)]);
      if (n <= 3 || options.model.startsWith('cancel')) {
        yield {type: 'finish', reason: {kind: 'error', failure: {
          code: ['outside', 'off'].includes(options.model) ? 'UNKNOWN' : ['QUOTA', 'UNAUTHORIZED', 'UNKNOWN'][Math.min(n - 1, 2)], message: 'Fixture provider is unavailable',
        }}};
        return;
      }
      yield {type: 'block-start', index: 0, blockType: 'text'};
      yield {type: 'text-delta', index: 0, text: 'Recovered original work.'};
      yield {type: 'block-end', index: 0, block: {type: 'text', text: 'Recovered original work.'}};
      yield {type: 'finish', reason: {kind: 'stop'}};
    }
  }
  const registration = ctx.get('llm').registerAdapter(['pe-retry-fixture'], new Fixture());
  const handles = [];
  const create = async (model, cwd, parentAgent) => {
    const handle = await ctx.get('agents').create({sessionId: 'pe-retry-' + model,
      ...(parentAgent ? {parentAgent} : {}),
      meta: {cwd, ...(parentAgent ? {origin: 'subagent', parentSession: parentAgent.session.id} : {})},
      agentOptions: {provider: 'pe-retry-fixture', model}});
    handles.push(handle);
    return handle.agent;
  };
  const start = agent => agent.followup(createUserMessage({source: {kind: 'user'}, content: [{type: 'text', text: 'Continue this exact research task.'}]}));
  const events = agent => agent.session.snapshotEvents().filter(e => e.type === 'llm/retry').map(e => e.data);
  const wait = async check => { for (let i = 0; !check(); i++) { if (i > 200) throw new Error('Fixture wait timed out'); await new Promise(r => globalThis.setTimeout(r, 10)); } };
  try {
    const manager = await create('manager', paths.lab);
    const worker = await create('worker', paths.lab, manager);
    start(manager); start(worker);
    await Promise.all([manager.whenIdle(), worker.whenIdle()]);
    const cancel = await create('cancel', paths.lab);
    start(cancel); await wait(() => events(cancel).length > 0);
    cancel.cancel({kind: 'user'});
    await cancel.whenIdle();
    const cancelledCalls = calls.get('cancel');
    await new Promise(r => globalThis.setTimeout(r, 300));
    const outside = await create('outside', paths.plain);
    start(outside); await outside.whenIdle();
    fs.writeFileSync(paths.lab + '/.research/LAB.md', '# lab\nRetry: off (operator)\n');
    const off = await create('off', paths.lab);
    start(off); await off.whenIdle();
    return {calls: Object.fromEntries(calls), cancelledCalls,
      manager: events(manager), worker: events(worker), outside: events(outside), off: events(off),
      sameTask: ['manager', 'worker'].every(key => requests.get(key).every(request => request.includes('Continue this exact research task.')))};
  } finally {
    for (const handle of handles.reverse()) await handle.dispose();
    registration();
  }
}

const shipped = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../cordis.patch.yml'), 'utf8');
const script = `(${probe.toString()})(ctx, ${JSON.stringify({lab, plain, api})}).then(result => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify(result)), error => fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({error: error.stack})))`;
writeFileSync(join(root, 'cordis.patch.yml'), shipped.replace('initialDelayMs: 30_000', 'initialDelayMs: 100') + `
- insert:
    - id: pe-retry-test
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: pe-retry-test
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
    if (i > 200 || child.exitCode !== null) throw new Error('DSH retry probe did not finish\n' + stderr.slice(-4000));
    await new Promise(resolve => globalThis.setTimeout(resolve, 100));
  }
  const result = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.calls.manager, 4); assert.equal(result.calls.worker, 4);
  // DSH may repair credentials itself; PE delegates before scheduling another wait.
  for (const retries of [result.manager, result.worker]) {
    assert.ok(retries.length >= 2 && retries.length <= 3);
    assert.ok(retries.every(e => e.mode === 'always' && e.policyKey.includes('1800000')));
    assert.ok(retries.some(e => e.failure.code === 'QUOTA'));
    assert.ok(retries.some(e => e.failure.code === 'UNKNOWN'));
  }
  assert.ok(result.sameTask, 'retries preserve the original task');
  assert.equal(result.calls.cancel, result.cancelledCalls);
  assert.ok(result.calls.outside < 4); assert.ok(result.calls.off < 4);
  assert.equal(result.outside.length, 0); assert.equal(result.off.length, 0);
  console.log('PASS: DSH managers and workers retry provider failures, preserve requests, cancel, and respect lab scope / Retry: off');
} finally {
  child.kill('SIGKILL');
  await new Promise(resolve => child.exitCode !== null || child.signalCode !== null ? resolve() : child.once('close', resolve));
  rmSync(root, {recursive: true, force: true});
}
