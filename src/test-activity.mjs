import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {aggregate, captureSession, refreshReport, writeActivity, reportData, activityView, activityChart, activityMarkdown, sessionCalls, RECEIPT_FORMAT} from './history.mjs';
import {concurrency} from './activity.mjs';
import record from './record.cjs';

const start = Date.parse('2026-11-01T12:00:00Z');
const usage = {input: 100, output: 30, cacheRead: 300, cacheWrite: 0, totalTokens: 430, cost: {total: .01}};
const origin = {id: 'a'.repeat(32), label: 'maple'};
const pi = (id, offset = 0, role = 'worker', open = false) => ({runtime: 'pi', header: {id}, meta: {role, taskId: id},
  attribution: [{from: 0, producer: origin, mission: 'math', packRevision: 'rev-1'}],
  events: [
    {type: 'custom', id: id + '-s', customType: 'pe-turn', data: {id, phase: 'start', time: start + offset}},
    {type: 'model_change', id: id + '-model', parentId: id + '-s', provider: 'test', modelId: 'model'},
    {type: 'thinking_level_change', id: id + '-effort', parentId: id + '-model', thinkingLevel: 'high'},
    {type: 'message', id: id + '-call', parentId: id + '-effort', timestamp: new Date(start + offset + 4000).toISOString(),
      message: {role: 'assistant', usage, content: [{type: 'text', text: 'PRIVATE_TEXT_KEEP_LOCAL'}]}},
    ...open ? [] : [{type: 'custom', id: id + '-e', customType: 'pe-turn', data: {id, phase: 'end', time: start + offset + 10000}}],
  ]});
const dataFor = usage => ({usage, collective: {labs: [{...origin, ids: [origin.id], calls: usage.calls, updated: '2026-11-01T12:00:10Z'}]}});

test('measured turns, weighted cache rates, model effort, and unknown costs stay distinct', () => {
  const a = pi('one'), b = pi('two', 5000, 'manager');
  b.events[3].message = {...b.events[3].message, usage: {input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15}};
  const c = pi('missing', 20000, 'worker', true);
  c.events[3].message = {...c.events[3].message, usage: {input: 9000, output: 1}};
  const view = activityView(dataFor(aggregate([a, b, c]))), s = view.summary;
  assert.equal(s.calls, 3); assert.equal(s.sessions, 3); assert.equal(s.workers, 2);
  assert.equal(s.cache.calls, 2); assert.equal(s.cache.rate, 300 / 410, 'not the average of request hit rates');
  assert.deepEqual(s.costs.reported, {value: null, calls: 0});
  assert.deepEqual(s.costs.estimate, {value: .01, calls: 1});
  assert.equal(s.turns.completed, 2); assert.equal(s.turns.unfinished, 1);
  assert.equal(s.turns.medianMs, 10000); assert.equal(s.timing.agentMs, 20000); assert.equal(s.timing.elapsedMs, 15000);
  assert.equal(s.timing.peak, 2); assert.equal(s.workersTiming.peak, 1);
  assert.equal(view.models[0].name, 'test/model · high · manager');
  assert.match(activityMarkdown(view), /unknown end/);
});

test('concurrency merges overlap per session, excludes clock errors and unfinished spans', () => {
  const t = (session, lo, hi) => ({session, started: start + lo, ended: hi == null ? null : start + hi});
  const result = concurrency([t('a', 0, 10), t('a', 5, 15), t('b', 8, 12), t('c', 20, 25), t('broken', 10, 2), t('open', 0, null)]);
  assert.equal(result.peak, 2); assert.equal(result.elapsedMs, 20); assert.equal(result.agentMs, 24);
});

test('DSH native turns include tool waits and retries without confusing calls with turns', () => {
  const events = [
    {type: 'turn/end', data: {turn: 0}}, // An inherited end without its start.
    {type: 'turn/start', data: {turn: 1}},
    {type: 'request/header', data: {header: {config: {provider: 'test', model: 'dsh', reasoningEffort: 'medium'}}}},
    {type: 'assistant/attempt', data: {usage: {inputTokens: 10, outputTokens: 1}}},
    {type: 'tool/call', data: {name: 'bash'}},
    {type: 'tool/result', data: {}},
    {type: 'assistant/message', data: {usage: {inputTokens: 20, outputTokens: 2, cacheReadTokens: 10, cacheWriteTokens: 0}}},
    {type: 'turn/end', data: {turn: 1}},
  ].map((event, i) => ({...event, seq: i, time: start + 1000 * i}));
  const log = {runtime: 'dsh', header: {id: 'native', origin: 'subagent'}, events};
  const got = aggregate([log, log]);
  assert.equal(got.calls, 2); assert.equal(got.turns.length, 1);
  assert.equal(got.turns[0].ended - got.turns[0].started, 6000);
  assert.ok(got.receipts.every(c => c.turn === got.turns[0].identity));
});

test('old and new receipt copies enrich one observation, including a later turn end', () => {
  const log = pi('upgrade'), parsed = sessionCalls(log);
  const {time, turn, ...old} = parsed.calls[0];
  const open = {...parsed.turns[0], ended: null};
  const got = aggregate([], [], [old, ...parsed.calls, old], [open, ...parsed.turns, open]);
  assert.equal(got.calls, 1); assert.equal(got.receipts[0].time, time);
  assert.equal(got.turns.length, 1); assert.equal(got.turns[0].ended, start + 10000);
  const conflict = aggregate([], [], [], [...got.turns, {...got.turns[0], ended: start + 12000}]);
  assert.equal(activityView(dataFor(conflict)).summary.turns.completed, 0);
});

function labFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'pe-activity-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const lab = join(root, 'source');
  mkdirSync(join(lab, '.research'), {recursive: true});
  writeFileSync(join(lab, '.research/LAB.md'), '# Lab\n');
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  git(lab, 'init', '-b', 'main'); git(lab, 'config', 'user.name', 'Fixture'); git(lab, 'config', 'user.email', 'fixture@example.invalid');
  git(lab, 'config', 'pe.lab', 'maple');
  return {root, lab, git};
}
function generated(root) {
  const files = {};
  const walk = dir => { for (const item of readdirSync(dir, {withFileTypes: true})) {
    const file = join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.(svg|md)$/.test(file)) files[file.slice(root.length)] = readFileSync(file, 'utf8');
  } };
  walk(join(root, '.research/activity'));
  return files;
}

test('shared Markdown and SVG rebuild identically in a fresh clone without transcripts', t => {
  const {root, lab, git} = labFixture(t), source = pi('SECRET_NATIVE_ID');
  captureSession(lab, 'pi', source.header, source.events, {...source.meta, observedFrom: 0, taskId: 'T-1', mission: 'math'});
  refreshReport(lab, true); writeActivity(lab); record.build(lab);
  const before = generated(lab);
  assert.ok(Object.keys(before).some(p => p.endsWith('overview.svg')));
  assert.match(readFileSync(join(lab, '.research/REPORT.md'), 'utf8'), /activity\/README.md/);
  for (const text of Object.values(before)) {
    assert.ok(!text.includes('SECRET_NATIVE_ID')); assert.ok(!text.includes('PRIVATE_TEXT_KEEP_LOCAL')); assert.ok(!text.includes(lab));
  }
  git(lab, 'add', '.research'); git(lab, 'commit', '-m', 'Research receipts and generated activity');
  refreshReport(lab, true);
  assert.equal(git(lab, 'status', '--porcelain'), '', 'no clock or HEAD churn');
  const clone = join(root, 'clone'); git(root, 'clone', lab, clone);
  assert.equal(existsSync(join(clone, '.research/local')), false);
  const view = activityView(reportData(clone));
  assert.equal(view.summary.turns.completed, 1); assert.equal(view.summary.cache.rate, .75);
  git(clone, 'config', 'pe.lab', 'different-local-name');
  refreshReport(clone, true); writeActivity(clone);
  assert.deepEqual(generated(clone), before);
  const scope = view.labs.find(l => l.label === 'maple').id;
  assert.equal(activityView(reportData(clone), scope).summary.calls, 1);
});

test('old missing timing and malformed peers remain visible without blocking good activity', t => {
  const {lab} = labFixture(t), source = pi('good');
  captureSession(lab, 'pi', source.header, source.events, {role: 'worker', observedFrom: 0});
  refreshReport(lab, true);
  writeFileSync(join(lab, '.research/activity/bad.json'), '{incomplete');
  refreshReport(lab, true); writeActivity(lab);
  assert.equal(activityView(reportData(lab)).summary.turns.completed, 1);
  assert.match(readFileSync(join(lab, '.research/activity/README.md'), 'utf8'), /bad.json/);
  const old = pi('old'); old.events = [old.events[3]]; delete old.events[0].timestamp;
  const v = activityView(dataFor(aggregate([old])));
  assert.equal(v.summary.timedCalls, 0); assert.equal(v.summary.turns.medianMs, null);
  assert.match(activityChart(v), /No timestamped calls/);
});

test('routine refreshes append receipts and update local previews without rewriting shared views', t => {
  const {lab} = labFixture(t), source = pi('first');
  captureSession(lab, 'pi', source.header, source.events, {observedFrom: 0});
  refreshReport(lab, true); writeActivity(lab); record.build(lab);
  const before = generated(lab), report = readFileSync(join(lab, '.research/REPORT.md'), 'utf8');
  const next = pi('second', 20000);
  captureSession(lab, 'pi', next.header, next.events, {observedFrom: 0});
  mkdirSync(join(lab, '.research/updates'));
  writeFileSync(join(lab, '.research/updates/new.md'), '## A fresh representation\n');
  refreshReport(lab, true);
  assert.match(record.refresh(lab).text, /fresh representation/);
  assert.deepEqual(generated(lab), before);
  assert.equal(readFileSync(join(lab, '.research/REPORT.md'), 'utf8'), report);
  assert.ok(existsSync(join(lab, '.research/local/activity/overview.svg')));
  assert.equal(reportData(lab).usage.calls, 2);
});

test('versioned batches tolerate future formats and isolate malformed entries and fields', t => {
  const {lab} = labFixture(t), parsed = sessionCalls(pi('good'));
  const dir = join(lab, '.research/activity'); mkdirSync(dir);
  const envelope = {format: RECEIPT_FORMAT, producer: origin, updated: '2026-11-01T12:00:10Z',
    calls: [...parsed.calls, {identity: 'invalid'}], turns: 'unfinished field'};
  writeFileSync(join(dir, 'partial.json'), JSON.stringify(envelope));
  const future = JSON.stringify({...envelope, format: 'pe-activity-receipts/2'});
  writeFileSync(join(dir, 'future.json'), future);
  writeFileSync(join(dir, 'timing.json'), JSON.stringify({...envelope, calls: 'unfinished field', turns: parsed.turns}));
  writeActivity(lab);
  const data = reportData(lab);
  assert.equal(data.usage.calls, 1);
  assert.equal(data.warnings.length, 4);
  assert.equal(data.usage.turns.length, 1);
  const page = readFileSync(join(dir, 'README.md'), 'utf8');
  assert.match(page, /Unsupported receipt format pe-activity-receipts\/2/);
  assert.match(page, /partial.json/);
  assert.equal(readFileSync(join(dir, 'future.json'), 'utf8'), future);
});

test('a later completion enriches an immutable open-turn receipt across refreshes', t => {
  const {lab} = labFixture(t), source = pi('later', 0, 'worker', true);
  const meta = {role: 'worker', observedFrom: 0};
  captureSession(lab, 'pi', source.header, source.events, meta);
  refreshReport(lab, true);
  const folder = join(lab, '.research/activity');
  const producer = readdirSync(folder).find(name => /^[a-f0-9]{32}$/.test(name));
  const batch = readdirSync(join(folder, producer)).find(name => name.startsWith('turns-'));
  const file = join(folder, producer, batch), before = readFileSync(file, 'utf8');
  assert.equal(activityView(reportData(lab)).summary.turns.unfinished, 1);
  const complete = pi('later');
  captureSession(lab, 'pi', complete.header, complete.events, meta);
  refreshReport(lab, true); refreshReport(lab, true);
  const summary = activityView(reportData(lab)).summary;
  assert.equal(summary.calls, 1); assert.equal(summary.turns.completed, 1); assert.equal(summary.turns.unfinished, 0);
  assert.equal(readFileSync(file, 'utf8'), before);
  const tool = new URL('./history.mjs', import.meta.url).pathname;
  const exported = JSON.parse(execFileSync(process.execPath, [tool, 'report', '--json'], {cwd: lab, encoding: 'utf8'}));
  assert.equal(exported.activity.summary.turns.completed, 1);
});

test('charts escape labels and keep missing accounting unknown', () => {
  const data = dataFor(aggregate([pi('safe')]));
  data.collective.labs[0].label = '<script>alert("oops")</script>';
  const view = activityView(data, data.collective.labs[0].id), chart = activityChart(view);
  assert.ok(!chart.includes('<script>')); assert.ok(chart.includes('&lt;script&gt;'));
  assert.ok(!chart.includes('NaN')); assert.ok(!chart.includes('Infinity'));
  assert.equal(activityChart(view), chart);
  assert.throws(() => activityView(data, 'absent'), /Unknown/);
});

test('a shared receipt without an update time is unknown, not local-only data', () => {
  const data = dataFor(aggregate([pi('shared')]));
  delete data.collective.labs[0].updated;
  const text = activityMarkdown(activityView(data), {overall: true});
  assert.match(text, /\| unknown \|/);
  assert.ok(!text.includes('local only'));
});

test('the DSH activity endpoint returns the same view and honors the selected lab', async t => {
  const {lab} = labFixture(t), source = pi('native-private');
  captureSession(lab, 'pi', source.header, source.events, {role: 'manager', observedFrom: 0});
  refreshReport(lab, true);
  const {apply} = await import('./dsh-host.js'), {Readable} = await import('node:stream');
  let handler;
  apply({sessions: {get: id => id === 'manager' ? {header: {cwd: lab}} : null}, get: () => null,
    connection: {requestRejection: () => null}, effect: fn => fn(), webServer: {register: route => {handler = route.handler;}}});
  const request = async scope => {
    const req = Readable.from([JSON.stringify({method: 'usage', rpcId: 'test', payload: {sessionId: 'manager', scope}})]);
    req.method = 'POST'; req.url = '/persistent-eclipse/usage';
    let response;
    await handler(req, {writeHead: () => {}, end: body => {response = JSON.parse(body).result;}});
    return response;
  };
  const all = await request('all');
  assert.equal(all.ok, true); assert.equal(all.value.view.summary.turns.completed, 1);
  assert.equal(all.value.chart, activityChart(activityView(reportData(lab))));
  assert.equal((await request(all.value.view.labs[0].id)).value.view.label, 'maple');
  assert.equal((await request('missing')).ok, false);
  assert.ok(!JSON.stringify(all).includes('native-private'));
});
