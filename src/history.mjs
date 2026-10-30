// Local receipts, an activity report, and an archive. No model calls or network access.
import { appendFileSync, closeSync, copyFileSync, createReadStream, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

const sha = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const slash = value => value.split(sep).join('/');
const within = (root, path) => { const r = relative(root, path); return r === '' || (!r.startsWith(`..${sep}`) && r !== '..' && !isAbsolute(r)); };
const regular = file => { try { return lstatSync(file).isFile(); } catch { return false; } };
const git = (cwd, args) => { try { return execFileSync('git', ['-C', cwd, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024}).trimEnd(); } catch { return null; } };
const clean = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/`/g, "'");
const link = path => slash(path).split('/').map(encodeURIComponent).join('/');
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const total = (reported, parts) => count(reported) ?? (parts.every(x => count(x) !== null) ? parts.reduce((a,b) => a+b, 0) : null);

export function labRoot(start = '.') {
  for (let at = resolve(start); ; at = dirname(at)) {
    if (regular(join(at, '.research', 'LAB.md'))) return at;
    if (dirname(at) === at) return null;
  }
}

function localDir(lab) {
  const dir = join(lab, '.research', 'local');
  if (existsSync(dir) && !lstatSync(dir).isDirectory()) throw new Error(`${dir} is not a directory`);
  mkdirSync(dir, {recursive: true, mode: 0o700});
  if (!existsSync(join(dir, '.gitignore'))) writeFileSync(join(dir, '.gitignore'), '*\n', {flag: 'wx', mode: 0o600});
  return dir;
}

function atomic(file, body) {
  mkdirSync(dirname(file), {recursive: true, mode: 0o700});
  const temp = `${file}.${randomUUID()}.tmp`;
  try { writeFileSync(temp, body, {mode: 0o600, flag: 'wx'}); renameSync(temp, file); }
  finally { rmSync(temp, {force: true}); }
}

export function historyEnabled(lab) {
  return !/^[ \t]*History:[ \t]*off[ \t]*$/im.test(readFileSync(join(lab, '.research', 'LAB.md'), 'utf8'));
}

const cursors = new Map();
const indexes = new Map();
const producers = new Map();
function producer(lab, create = false, refresh = false) {
  const cached = producers.get(lab);
  if (!refresh && cached && Date.now() - cached.checked < 60000) return cached.value;
  const file = join(lab, '.research', 'local', 'producer.json');
  let id;
  if (regular(file)) id = JSON.parse(readFileSync(file, 'utf8')).id;
  else if (create) {
    localDir(lab); id = randomUUID().replaceAll('-', '');
    try { writeFileSync(file, json({id}) + '\n', {flag: 'wx', mode: 0o600}); }
    catch (e) { if (e.code !== 'EEXIST') throw e; id = JSON.parse(readFileSync(file, 'utf8')).id; }
  }
  if (!id) return null;
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid local activity producer ID');
  // Live capture needs only the stable ID. Resolve its display name in reports,
  // where Git runs off the agent's event loop.
  const value = {id, label: refresh ? git(lab, ['config', 'pe.lab']) || null : cached?.value.label ?? null};
  producers.set(lab, {checked: Date.now(), value});
  return value;
}

// Pi already persists the conversation. Keep only its location and attribution
// during live work; collect/archive make a retained copy when asked.
export function indexSession(lab, header, source, meta = {}) {
  if (!header?.id || !source || !historyEnabled(lab)) return null;
  const file = join(localDir(lab), 'index', `${sha(`pi:${header.id}`).slice(0,32)}.json`);
  let value = indexes.get(file) ?? (regular(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
  const owner = producer(lab, true);
  if (value?.source === source && value.attribution.at(-1)?.producer?.id === owner.id) { indexes.set(file, value); return file; }
  const attribution = value?.attribution ?? [];
  if (attribution.at(-1)?.producer?.id !== owner.id)
    attribution.push({type: 'pe-attribution', from: meta.observedFrom ?? 0, producer: owner});
  value = {format: 'pe-session-index/1', runtime: 'pi', id: header.id, source, meta, attribution};
  atomic(file, json(value) + '\n'); indexes.set(file, value);
  return file;
}

function indexedLogs(lab) {
  const logs = [], warnings = [];
  for (const file of files(join(lab, '.research', 'local', 'index'), f => f.endsWith('.json'))) {
    let value;
    try {
      value = JSON.parse(readFileSync(file, 'utf8'));
      if (value.format !== 'pe-session-index/1' || typeof value.source !== 'string' || !Array.isArray(value.attribution)) throw new Error('Invalid session index');
      if (!regular(value.source)) throw new Error('Original transcript is missing or is not a regular file');
      const log = readLog(value.source);
      if (log.runtime !== 'pi' || log.header.id !== value.id) throw new Error('Indexed session identity changed');
      logs.push({...log, meta: value.meta, attribution: value.attribution});
    } catch (e) {
      // Cleanup after collect is expected. Use the retained snapshot when the
      // original has gone, without filling the report with missing-file notices.
      const saved = value?.id && !regular(value.source) && files(join(lab, '.research/local/sessions'), f => basename(f).startsWith(sha(`pi:${value.id}`).slice(0,32))).some(f => {
        try { const log = readLog(f); return log.runtime === 'pi' && log.header.id === value.id; } catch { return false; }
      });
      if (!saved) warnings.push(`Indexed conversation unavailable (${basename(file)}): ${e.message}. Collect before removing original transcripts.`);
    }
  }
  return {logs, warnings};
}

function retainIndexed(lab, destination = lab) {
  const {logs, warnings} = indexedLogs(lab), retained = [];
  for (const log of logs) {
    const identity = sha(`pi:${log.header.id}`).slice(0,32);
    const dir = join(localDir(destination), 'sessions');
    let file = join(dir, `${identity}-collected.jsonl`);
    if (regular(file)) {
      const old = readLog(file);
      if (old.events.length > log.events.length || old.warnings.length ||
          (old.events.length && json(old.events.at(-1)) !== json(log.events[old.events.length - 1])))
        file = join(dir, `${identity}-${sha(json(log.events)).slice(0,16)}-collected.jsonl`);
    }
    const header = {type: 'pe-session', version: 1, runtime: 'pi', header: log.header, meta: log.meta};
    atomic(file, [header, ...log.attribution, ...log.events].map(json).join('\n') + '\n');
    if (log.warnings.length) {
      const raw = readFileSync(log.file);
      atomic(join(localDir(destination), 'incomplete', `${sha(raw)}.jsonl`), raw);
    }
    retained.push(file); warnings.push(...log.warnings);
  }
  return {logs, retained, warnings};
}

// Append immutable runtime entries; keep the native header alongside PE metadata.
// A rewrite gets another revision, leaving the earlier record available for inspection.
export function captureSession(lab, runtime, header, events, meta = {}) {
  if (!header?.id || !historyEnabled(lab)) return null;
  const identity = sha(`${runtime}:${header.id}`).slice(0, 32);
  const dir = join(localDir(lab), 'sessions');
  mkdirSync(dir, {recursive: true, mode: 0o700});
  const base = join(dir, `${identity}.jsonl`);
  let state = cursors.get(base), file = state?.file ?? base;
  if (!state) {
    const old = regular(file) ? readLog(file) : null;
    state = {length: old?.events.length ?? 0, last: old?.events.length ? json(old.events.at(-1)) : null, origin: old?.attribution?.at(-1)?.producer?.id ?? null};
    if (old?.warnings.length) state.damaged = true;
  }
  if (state.damaged || state.length > events.length || (state.length && state.last !== json(events[state.length - 1]))) {
    file = join(dir, `${identity}-${sha(json(events)).slice(0, 16)}.jsonl`);
    state = {length: 0, last: null, origin: null};
    if (regular(file)) { const old = readLog(file); state = {length: old.events.length, last: json(old.events.at(-1)), origin: old.attribution?.at(-1)?.producer?.id ?? null}; }
  }
  if (!existsSync(file)) writeFileSync(file, json({type: 'pe-session', version: 1, runtime, header, meta,
    capturedAt: new Date().toISOString()}) + '\n', {mode: 0o600, flag: 'wx'});
  const owner = meta.imported ? null : producer(lab, true);
  if (state.origin !== (owner?.id ?? null)) {
    // Only newly observed work belongs to this recorder. Imported or inherited
    // history keeps its original attribution, or stays unknown when none exists.
    const from = Math.min(events.length, Math.max(state.length, meta.observedFrom ?? (state.length ? state.length : events.length)));
    appendFileSync(file, json({type: 'pe-attribution', from, producer: owner}) + '\n');
  }
  if (events.length > state.length) appendFileSync(file, events.slice(state.length).map(json).join('\n') + '\n');
  cursors.set(base, {file, length: events.length, last: events.length ? json(events.at(-1)) : null, origin: owner?.id ?? null});
  return file;
}

export function readLog(file) {
  const warnings = [], records = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    try { records.push(JSON.parse(line)); } catch { warnings.push(`${basename(file)}: unreadable line ${i + 1}${i === lines.length - 1 ? ' (possibly still being written)' : ''}`); }
  });
  const first = records.shift();
  const attribution = [];
  const events = records.filter((e, i) => {
    if (first?.type === 'pe-session' && e?.type === 'pe-attribution') {
      if (count(e.from) !== null && (e.producer === null || /^[a-f0-9]{32}$/.test(e.producer?.id))) attribution.push(e);
      else warnings.push(`${basename(file)}: invalid attribution record ${i + 2}`);
      return false;
    }
    if (e && typeof e === 'object' && !Array.isArray(e) && typeof e.type === 'string') return true;
    warnings.push(`${basename(file)}: invalid record ${i + 2}`); return false;
  });
  if (first?.type === 'pe-session' && first.version === 1 && ['pi', 'dsh'].includes(first.runtime) && first.header?.id) return {...first, events, attribution, warnings, file};
  if (first?.type === 'session' && first.id) return {runtime: 'pi', header: first, meta: {}, events, warnings, file};
  throw new Error(`${file}: unrecognized session format`);
}

function files(dir, accept = () => true, out = []) {
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return out;
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name), stat = lstatSync(file);
    if (stat.isDirectory()) files(file, accept, out);
    else if (stat.isFile() && accept(file)) out.push(file);
  }
  return out;
}

// Backfill Pi's normal manager directory and PE worker logs. Only exact lab roots
// or working directories inside this lab are admitted; nested labs are separate.
export function collect(lab, {piDir = join(process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi', 'agent'), 'sessions')} = {}) {
  const warnings = [], found = new Set();
  if (!historyEnabled(lab)) return {sessions: 0, warnings, disabled: true};
  const indexed = retainIndexed(lab), sources = new Set(indexed.logs.map(log => log.file));
  indexed.retained.forEach(file => found.add(file)); warnings.push(...indexed.warnings);
  for (const file of [...files(piDir, f => f.endsWith('.jsonl')), ...files(join(lab, '.research', 'scratch'), f => f.endsWith('.jsonl') && dirname(f).endsWith(`${sep}session`))]) {
    if (sources.has(file)) continue;
    try {
      // Inspect only the header of unrelated sessions, not their conversations.
      const fd = openSync(file, 'r'), buffer = Buffer.alloc(65536);
      let header;
      try { const bytes = readSync(fd, buffer, 0, buffer.length, 0); header = JSON.parse(buffer.subarray(0, bytes).toString('utf8').split('\n')[0]); }
      finally { closeSync(fd); }
      if (header.type !== 'session' || !header.cwd || labRoot(header.cwd) !== lab) continue;
      const log = readLog(file);
      warnings.push(...log.warnings);
      if (log.warnings.length) {
        const body = readFileSync(file);
        atomic(join(localDir(lab), 'incomplete', `${sha(body)}.jsonl`), body);
      }
      const worker = within(join(lab, '.research', 'scratch'), file);
      const saved = captureSession(lab, 'pi', log.header, log.events, {source: file, role: worker ? 'worker' : 'manager', imported: true});
      if (saved) found.add(saved);
    } catch (e) { warnings.push(e.message); }
  }
  for (const receipt of files(join(lab, '.research', 'scratch'), f => /search-[^/]+\.json$/.test(f))) {
    try { captureSearch(lab, receipt, true); } catch (e) { warnings.push(e.message); }
  }
  const result = {sessions: found.size, warnings};
  atomic(join(localDir(lab), 'collection.json'), JSON.stringify({at: new Date().toISOString(), ...result}, null, 2) + '\n');
  return result;
}

export function captureSearch(lab, receipt, imported = false) {
  if (!historyEnabled(lab)) return;
  const body = readFileSync(receipt), target = join(localDir(lab), 'search', `${sha(body)}.json`);
  if (!existsSync(target)) atomic(target, body);
  const ownership = target + '.origin';
  if (!existsSync(ownership)) atomic(ownership, json(imported ? null : producer(lab, true)) + '\n');
}

function piUsage(u) {
  // Pi initializes absent provider usage with zeros. Treat that as unmetered.
  if (!u || !['input', 'output', 'cacheRead', 'cacheWrite'].some(k => number(u[k]) > 0)) return {};
  return {input: count(u.input), output: count(u.output), cacheRead: count(u.cacheRead), cacheWrite: count(u.cacheWrite),
    reasoning: count(u.reasoning), total: total(u.totalTokens, [u.input, u.output, u.cacheRead, u.cacheWrite]),
    cost: number(u.cost?.total) > 0 ? u.cost.total : null, costKind: 'estimate'};
}

export function sessionCalls(log) {
  const calls = [], tools = [], states = new Map();
  let route = {provider: 'unknown', model: 'unknown', effort: 'unknown'};
  log.events.forEach((e, index) => {
    const key = e.id || (Number.isFinite(e.time) ? `${e.seq}:${e.time}` : `${log.header.id}:${index}`);
    const identity = sha(`${log.runtime}:${key}:${sha(json(e))}`);
    const owner = log.attribution?.findLast(a => a.from <= index)?.producer ?? null;
    const attribution = {origin: owner, session: sha(`${log.runtime}:${log.header.id}`), batch: Math.floor(index / 1000), role: log.meta?.role ?? (log.header.origin === 'subagent' ? 'worker' : 'unknown')};
    if (log.runtime === 'pi') {
      // Branches can return to an earlier model/effort. Follow parents, not just file order.
      route = {...(e.parentId ? states.get(e.parentId) ?? route : {provider: 'unknown', model: 'unknown', effort: 'unknown'})};
      if (e.type === 'model_change') route = {...route, provider: e.provider, model: e.modelId};
      if (e.type === 'thinking_level_change') route.effort = e.thinkingLevel;
      if (e.id) states.set(e.id, {...route});
      if (e.type === 'message' && e.message?.role === 'assistant') {
        const m = e.message;
        calls.push({identity, ...attribution, ...route, provider: m.provider ?? route.provider, model: m.model ?? route.model,
          kind: 'response', time: e.timestamp, ...piUsage(m.usage)});
        for (const [i, t] of (Array.isArray(m.content) ? m.content : []).entries()) if (t.type === 'toolCall') tools.push({identity: `${identity}:${i}`, name: t.name});
      } else if (['usage', 'compaction', 'branch_summary'].includes(e.type)) {
        calls.push({identity, ...attribution, provider: e.provider ?? 'unknown', model: e.model ?? 'unknown', effort: 'unknown',
          kind: e.kind ?? e.type, time: e.timestamp, ...piUsage(e.usage)});
      }
    } else if (log.runtime === 'dsh') {
      const data = e.data ?? {};
      if (e.type === 'request/header') route = {...route, provider: data.header?.config?.provider ?? route.provider,
        model: data.header?.config?.model ?? route.model, effort: data.header?.config?.reasoningEffort ?? 'unknown'};
      if (e.type === 'request/context') route = {...route, provider: data.provider ?? 'unknown', model: data.model ?? 'unknown'};
      if (e.type === 'tool/call') tools.push({identity, name: data.name ?? 'unknown'});
      if (['assistant/message', 'assistant/attempt'].includes(e.type)) {
        const u = data.usage ?? (Array.isArray(data.stream) ? data.stream : []).findLast(x => x?.type === 'chunk' && x.chunk?.type === 'usage')?.chunk.usage;
        calls.push({identity, ...attribution, ...route, kind: e.type === 'assistant/attempt' ? 'attempt' : 'response', time: Number.isFinite(e.time) ? e.time : null,
          input: count(u?.inputTokens), output: count(u?.outputTokens), cacheRead: count(u?.cacheReadTokens), cacheWrite: count(u?.cacheWriteTokens), reasoning: count(u?.reasoningTokens),
          total: total(u?.totalTokens, [u?.inputTokens, u?.outputTokens, u?.cacheReadTokens, u?.cacheWriteTokens])});
      }
    }
  });
  return {calls, tools};
}

function searchCall(receipt, origin = null) {
  const u = receipt.usage ?? {}, cached = count(u.prompt_tokens_details?.cached_tokens), prompt = count(u.prompt_tokens);
  return {identity: sha(`search:${sha(json(receipt))}`), origin, session: null, role: 'search', provider: 'openrouter', model: receipt.model ?? 'unknown', effort: 'unknown', kind: 'search', time: receipt.retrieved,
    input: prompt !== null && cached !== null && prompt >= cached ? prompt - cached : null,
    output: count(u.completion_tokens), cacheRead: cached, cacheWrite: null,
    reasoning: count(u.completion_tokens_details?.reasoning_tokens), total: total(u.total_tokens, [u.prompt_tokens, u.completion_tokens]), cost: number(u.cost), costKind: 'reported'};
}

export function aggregate(logs, search = [], shared = []) {
  const seen = new Set(), seenTools = new Set(), rows = new Map(), toolCounts = Object.create(null), sessions = new Map();
  const candidates = [], unique = new Map();
  let duplicateCalls = 0, calls = 0, unmetered = 0;
  const add = c => {
    if (seen.has(c.identity)) { duplicateCalls++; return; }
    seen.add(c.identity); calls++;
    const metered = c.input != null && c.output != null;
    if (!metered) unmetered++;
    const key = json([c.provider, c.model, c.effort, c.kind, c.costKind ?? 'unknown']);
    if (!rows.has(key)) rows.set(key, {provider: c.provider, model: c.model, effort: c.effort, kind: c.kind, costKind: c.costKind ?? 'unknown', calls: 0,
      sums: {}, coverage: {}});
    const row = rows.get(key); row.calls++;
    for (const field of ['input', 'output', 'cacheRead', 'cacheWrite', 'reasoning', 'total', 'cost']) {
      if (c[field] == null) continue;
      row.sums[field] = (row.sums[field] ?? 0) + c[field]; row.coverage[field] = (row.coverage[field] ?? 0) + 1;
    }
  };
  for (const log of logs) {
    const {calls: list, tools} = sessionCalls(log);
    const id = `${log.runtime}:${log.header.id}`;
    sessions.set(id, {id: log.header.id, runtime: log.runtime, role: log.meta?.role ?? (log.header.origin === 'subagent' ? 'worker' : 'unknown'),
      parent: log.meta?.parentSession ?? log.header.parentSession ?? null, file: log.file, calls: list.length, unmetered: list.filter(c => c.input == null || c.output == null).length});
    candidates.push(...list);
    for (const t of tools) if (!seenTools.has(t.identity)) { seenTools.add(t.identity); toolCounts[t.name] = (toolCounts[t.name] ?? 0) + 1; }
  }
  candidates.push(...search.map(r => r.receipt ? searchCall(r.receipt, r.origin) : searchCall(r)), ...shared);
  for (const c of candidates) {
    const old = unique.get(c.identity);
    if (old) {
      duplicateCalls++;
      if (old.disputed || c.disputed) unique.set(c.identity, {...old, origin: null, disputed: true});
      else if (old.origin && c.origin && old.origin.id !== c.origin.id) unique.set(c.identity, {...old, origin: null, disputed: true});
      else if (!old.origin && c.origin && !old.disputed) unique.set(c.identity, c);
    } else unique.set(c.identity, c);
  }
  const receipts = [...unique.values()]; receipts.forEach(add);
  return {calls, unmetered, duplicateCalls, attributionConflicts: receipts.filter(c => c.disputed).length, receipts,
    rows: [...rows.values()].sort((a, b) => json([a.provider,a.model,a.effort,a.kind]).localeCompare(json([b.provider,b.model,b.effort,b.kind]))), tools: toolCounts, sessions: [...sessions.values()]};
}

// Only these fields cross between labs. Never share prompts, arguments, paths,
// raw session IDs, answers, or the runtime header as activity metadata.
function publicReceipt(c) {
  if (!/^[a-f0-9]{64}$/.test(c?.identity)) throw new Error('Invalid activity receipt identity');
  const out = {identity: c.identity, origin: null, session: null, batch: count(c.batch) ?? 0};
  if (c.origin) {
    if (!/^[a-f0-9]{32}$/.test(c.origin.id)) throw new Error('Invalid activity origin');
    out.origin = {id: c.origin.id, label: typeof c.origin.label === 'string' ? c.origin.label.slice(0,80) : null};
  }
  if (/^[a-f0-9]{64}$/.test(c.session)) out.session = c.session;
  for (const field of ['provider', 'model', 'effort', 'kind', 'role', 'costKind']) out[field] = typeof c[field] === 'string' ? c[field].slice(0,200) : 'unknown';
  for (const field of ['input', 'output', 'cacheRead', 'cacheWrite', 'reasoning', 'total']) if (count(c[field]) !== null) out[field] = c[field];
  if (number(c.cost) !== null) out.cost = c.cost;
  if (c.disputed) out.disputed = true;
  return out;
}

function readShared(lab) {
  const snapshots = [], warnings = [];
  for (const file of files(join(lab, '.research', 'activity'), f => f.endsWith('.json'))) {
    try {
      const value = JSON.parse(readFileSync(file, 'utf8'));
      if (value.format !== 'pe-activity-receipts/1' || !/^[a-f0-9]{32}$/.test(value.producer?.id) || !Array.isArray(value.calls)
        || !Number.isFinite(Date.parse(value.updated))) throw new Error('Unrecognized activity snapshot');
      snapshots.push({producer: {id: value.producer.id, label: typeof value.producer.label === 'string' ? value.producer.label.slice(0,80) : null},
        updated: value.updated, calls: value.calls.map(publicReceipt)});
    } catch (e) { warnings.push(`${slash(relative(lab, file))}: ${e.message}; left out of totals`); }
  }
  return {snapshots, warnings, calls: snapshots.flatMap(s => s.calls)};
}

function publishActivity(lab, calls) {
  // Match the footer's first-word policy: a note after "off" cannot enable sharing.
  const sync = /^[ \t]*Sync:[ \t]*([^\s(]+)(?:[ \t]+([^\s(]+))?/m.exec(readFileSync(join(lab, '.research', 'LAB.md'), 'utf8'));
  if (sync?.[1].toLowerCase() === 'off') return;
  const source = producer(lab, true, true), root = join(lab, '.research', 'activity'), dir = join(root, source.id);
  for (const folder of [root, dir]) {
    if (existsSync(folder) && !lstatSync(folder).isDirectory()) throw new Error(`${folder} is not a directory`);
    mkdirSync(folder, {recursive: true});
  }
  // Old mutable snapshots remain readable. New batches contain only facts that
  // haven't arrived through sync yet; naming a lab changes one small label file.
  const fact = c => json({...publicReceipt(c), origin: c.origin ? {id: c.origin.id, label: null} : null});
  const known = new Set(readShared(lab).calls.map(fact));
  const fresh = calls.map(publicReceipt).filter(c => !known.has(fact(c))).sort((a,b) => a.identity.localeCompare(b.identity));
  const snapshot = calls => ({format: 'pe-activity-receipts/1', producer: source, updated: new Date().toISOString(), calls});
  for (let start = 0; start < fresh.length; start += 128) {
    const batch = fresh.slice(start, start + 128), file = join(dir, `batch-${sha(json(batch))}.json`);
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temp, json(snapshot(batch)) + '\n', {mode: 0o600, flag: 'wx'});
      try { linkSync(temp, file); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    } finally { rmSync(temp, {force: true}); }
  }
  const identity = join(dir, 'identity.json');
  if (!regular(identity) || json(JSON.parse(readFileSync(identity, 'utf8')).producer) !== json(source))
    atomic(identity, json(snapshot([])) + '\n');
}

function collective(lab, usage, shared, local) {
  const sources = new Map();
  const labels = new Map();
  for (const snapshot of [...shared.snapshots].sort((a,b) => a.updated.localeCompare(b.updated))) labels.set(snapshot.producer.id, snapshot.producer.label);
  if (local) labels.set(local.id, local.label);
  const source = (p, updated = null) => {
    const id = p?.id ?? 'unattributed';
    const label = labels.has(id) ? labels.get(id) : p?.label;
    if (!sources.has(id)) sources.set(id, {id, label: label || (p ? `unnamed ${id.slice(0,6)}` : 'unattributed'), updated,
      local: id === local?.id, calls: 0, sessions: new Set(), tokens: 0, metered: 0, unmetered: 0, receipts: []});
    const row = sources.get(id);
    if (updated && (!row.updated || updated > row.updated)) row.updated = updated;
    return row;
  };
  for (const snapshot of shared.snapshots) {
    source(snapshot.producer, snapshot.updated);
    for (const c of snapshot.calls) if (c.origin) source(c.origin, snapshot.updated);
  }
  if (local) source(local);
  for (const c of usage.receipts) {
    const row = source(c.origin);
    row.calls++; row.receipts.push(c);
    if (c.session) row.sessions.add(c.session);
    if (c.total != null) { row.tokens += c.total; row.metered++; }
    if (c.input == null || c.output == null) row.unmetered++;
  }
  const declared = join(lab, '.research', 'labs');
  const names = existsSync(declared) && lstatSync(declared).isDirectory()
    ? readdirSync(declared).filter(n => /^[a-z][a-z0-9]{1,11}$/.test(n) && lstatSync(join(declared,n)).isDirectory()) : [];
  const self = git(lab, ['config', 'pe.lab']); if (self && !names.includes(self)) names.push(self);
  for (const label of names) if (![...sources.values()].some(s => s.label === label)) sources.set(`declared:${label}`,
    {id: `declared:${label}`, label, updated: null, local: false, calls: null, sessions: new Set(), tokens: null, metered: 0, unmetered: null, receipts: []});
  const labs = new Map();
  for (const s of sources.values()) {
    const key = s.id === 'unattributed' ? s.id : `lab:${s.label}`;
    if (!labs.has(key)) labs.set(key, {...s, ids: [s.id], sessions: new Set(s.sessions), receipts: [...s.receipts]});
    else {
      const row = labs.get(key); row.ids.push(s.id); row.local ||= s.local;
      if (s.updated && (!row.updated || s.updated > row.updated)) row.updated = s.updated;
      row.calls = row.calls == null && s.calls == null ? null : (row.calls ?? 0) + (s.calls ?? 0);
      row.tokens = (row.tokens ?? 0) + (s.tokens ?? 0); row.metered += s.metered; row.unmetered = (row.unmetered ?? 0) + (s.unmetered ?? 0);
      s.sessions.forEach(id => row.sessions.add(id)); row.receipts.push(...s.receipts);
    }
  }
  const rows = [...labs.values()].map(s => ({...s, sessions: s.sessions.size, models: aggregate([], [], s.receipts).rows, receipts: undefined}))
    .sort((a,b) => a.label.localeCompare(b.label));
  return {labs: rows, sessions: new Set(usage.receipts.map(c => c.session).filter(Boolean)).size,
    tokens: usage.receipts.reduce((n,c) => n + (c.total ?? 0), 0), metered: usage.receipts.filter(c => c.total != null).length};
}

function researchRecord(lab) {
  const notes = [], counts = Object.create(null), ids = new Set(), warnings = [];
  for (const file of files(join(lab, '.research', 'notes'), f => f.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8'), fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
    const field = name => new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(fm)?.[1]?.trim().replace(/^["']|["']$/g, '');
    const id = field('id'), state = field('state') || 'unknown';
    if (!id || id === 'draft') continue;
    if (ids.has(id)) { warnings.push(`Duplicate claim ${id}; counted once`); continue; }
    ids.add(id); counts[state] = (counts[state] ?? 0) + 1;
    notes.push({id, state, path: slash(relative(lab, file))});
  }
  const artifacts = Object.fromEntries(['reviews', 'reports', 'runs', 'patches'].map(name => [name, files(join(lab, '.research', name)).length]));
  return {notes, counts, artifacts, warnings};
}

export function reportData(lab, {publish = false} = {}) {
  const logs = [], warnings = [];
  const collection = join(lab, '.research', 'local', 'collection.json');
  if (regular(collection)) {
    try { const status = JSON.parse(readFileSync(collection, 'utf8')); warnings.push(...status.warnings.map(w => `Collection ${status.at}: ${w}`)); }
    catch { warnings.push('The last collection status could not be read'); }
  }
  for (const file of files(join(lab, '.research', 'local', 'sessions'), f => f.endsWith('.jsonl'))) {
    try { const log = readLog(file); logs.push(log); warnings.push(...log.warnings); } catch (e) { warnings.push(e.message); }
  }
  const indexed = indexedLogs(lab); logs.push(...indexed.logs); warnings.push(...indexed.warnings, ...indexed.logs.flatMap(log => log.warnings));
  const receipts = [];
  for (const file of [...files(join(lab, '.research', 'local', 'search'), f => f.endsWith('.json')), ...files(join(lab, '.research', 'intel'), f => /search-[^/]+\.json$/.test(f))]) {
    try {
      const r = JSON.parse(readFileSync(file, 'utf8')), originFile = file + '.origin';
      if (r.model && r.retrieved) receipts.push({receipt: r, origin: regular(originFile) ? JSON.parse(readFileSync(originFile, 'utf8')) : null});
    } catch { warnings.push(`Unreadable search receipt: ${relative(lab, file)}`); }
  }
  const localUsage = aggregate(logs, receipts);
  if (publish) publishActivity(lab, localUsage.receipts);
  const shared = readShared(lab), usage = aggregate(logs, receipts, shared.calls);
  warnings.push(...shared.warnings);
  if (usage.attributionConflicts) warnings.push(`${usage.attributionConflicts} conflicting origin receipts; that work is counted once as unattributed`);
  usage.sessions.forEach(s => { s.path = slash(relative(lab, s.file)); });
  const record = researchRecord(lab);
  const recent = (git(lab, ['log', '-12', '--format=%h%x09%aI%x09%s']) ?? '').split('\n').filter(Boolean).map(line => { const [commit, time, ...subject] = line.split('\t'); return {commit, time, subject: subject.join(' ')}; });
  const days = {};
  for (const line of (git(lab, ['log', '--since=14 days ago', '--format=%cI']) ?? '').split('\n').filter(Boolean)) { const day = line.slice(0,10); days[day] = (days[day] ?? 0) + 1; }
  const status = (git(lab, ['status', '--porcelain=v1', '-z']) ?? '').split('\0').filter(Boolean);
  let dirty = 0;
  for (let i = 0; i < status.length; i++) { dirty++; if (/[RC]/.test(status[i].slice(0,2))) i++; }
  const touched = (git(lab, ['log', '-20', '--format=', '--name-only']) ?? '').split('\n').filter(Boolean);
  const paths = Object.create(null); touched.forEach(p => { paths[p] = (paths[p] ?? 0) + 1; });
  return {format: 'pe-activity/1', generated: new Date().toISOString(), lab: basename(lab), identity: git(lab, ['config', 'pe.lab']) || null,
    git: {head: git(lab, ['rev-parse', '--short', 'HEAD']), branch: git(lab, ['branch', '--show-current']), commits: Number(git(lab, ['rev-list', '--count', 'HEAD']) ?? 0),
      dirty, recent, days,
      paths: Object.entries(paths).sort((a,b) => b[1]-a[1]).slice(0,8)},
    usage, collective: collective(lab, usage, shared, producer(lab, false, true)),
    record, warnings: [...warnings, ...record.warnings]};
}

const compact = n => n == null ? '?' : n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : `${n}`;
export function renderReport(data, {from = '.research/local'} = {}) {
  const u = data.usage, g = data.git, c = data.collective;
  const byLab = c.labs.flatMap(lab => lab.models.map(r => ({...r, lab: lab.label})));
  const rows = byLab.map(r => {
    const val = k => `${compact(r.sums[k])}${r.coverage[k] && r.coverage[k] < r.calls ? '*' : ''}`;
    return [clean(r.lab), clean(`${r.provider}/${r.model}`), clean(r.effort), clean(r.kind), String(r.calls), val('input'), val('cacheRead'), val('cacheWrite'), val('output'), val('reasoning'), val('total')];
  });
  const table = [['LAB', 'MODEL', 'EFFORT', 'WORK', 'CALLS', 'UNCACHED', 'CACHE HIT', 'CACHE WRITE', 'OUTPUT', 'REASONING', 'TOTAL'], ...rows];
  const widths = table[0].map((_, i) => Math.max(...table.map(r => r[i].length)));
  const formatted = table.map(row => row.map((v,i) => v.padEnd(widths[i])).join('  ').trimEnd());
  const effort = [['LAB', 'SESSIONS', 'CALLS', 'TOKENS', 'ACCOUNTED', 'LATEST RECEIPT'], ...c.labs.map(lab => [clean(lab.label), lab.calls == null ? '?' : String(lab.sessions),
    lab.calls == null ? '?' : String(lab.calls), lab.calls == null || !lab.metered ? '?' : compact(lab.tokens) + (lab.metered < lab.calls ? '*' : ''),
    lab.calls == null ? 'not shared' : `${lab.metered}/${lab.calls}`, lab.local ? 'local + shared' : lab.updated?.slice(0,16).replace('T',' ') ?? 'unknown'])];
  const ew = effort[0].map((_,i) => Math.max(...effort.map(r => r[i].length)));
  const lines = [`# ${clean(data.lab)} · collective lab activity`, '', `As of ${data.generated}. Viewed from: ${clean(data.identity || 'unnamed')}.`, '', '```text',
    `EFFORT  ${c.metered ? compact(c.tokens) : '?'} tokens recorded  ${c.metered}/${u.calls} calls have total accounting  ${c.sessions} sessions`,
    ...effort.map(row => row.map((v,i) => v.padEnd(ew[i])).join('  ').trimEnd()), '',
    `GIT     ${g.head ?? 'no commits'}  ${clean(g.branch || 'detached / unborn')}  ${g.commits} commits  ${g.dirty} changed paths`, '', 'COMMITS / last 14 days'];
  for (const [day, n] of Object.entries(g.days).sort()) lines.push(`  ${day}  ${'#'.repeat(Math.min(n, 40))}${n > 40 ? '+' : ''} ${n}`);
  if (!Object.keys(g.days).length) lines.push('  none recorded');
  lines.push('', 'RECORD / shared current states', ...Object.entries(data.record.counts).map(([s,n]) => `  ${clean(s).padEnd(20)} ${n}`),
    `  claims               ${data.record.notes.length}`, ...Object.entries(data.record.artifacts).map(([s,n]) => `  ${s.padEnd(20)} ${n} files`), '', ...formatted, '```', '',
    `${u.calls} recorded calls across the available lab receipts; ${u.unmetered} lack input/output accounting. ${u.sessions.length} conversations are retained on this machine.`, '',
    '`?` means unknown; `*` is a partial sum. Reasoning is part of output, never added again. Effort is the recorded setting, not a comparison of model capability.', '',
    'Totals combine local records with receipts received through sync. Other labs may have newer work that has not arrived yet. Unattributed work counts once without guessing its lab; “not shared” means missing accounting, not zero effort. Counts describe activity, not research quality.', '');
  for (const row of u.rows.filter(r => r.coverage.cost)) lines.push(`- ${clean(row.provider)}/${clean(row.model)} (${clean(row.effort)}, ${clean(row.kind)}): $${row.sums.cost.toFixed(4)} ${row.costKind}; cost available for ${row.coverage.cost}/${row.calls} calls.`);
  lines.push('', '## Recent commits', '', ...g.recent.map(c => `- ${c.commit} · ${clean(c.time)} · ${clean(c.subject)}`), '', '## Frequently changed paths', '',
    ...g.paths.map(([p,n]) => `- ${clean(p)} · touched in ${n} of the last 20 commits`), '', '## Tools / local transcripts', '',
    ...Object.entries(u.tools).sort((a,b) => b[1]-a[1]).map(([name,n]) => `- ${clean(name)}: ${n}`), '', '## Findings', '',
    ...data.record.notes.map(n => `- [${clean(n.id)}](${link(relative(from, n.path))}) · ${clean(n.state)}`), '', '## Conversations / retained here', '',
    ...u.sessions.map(s => `- [${clean(s.runtime)} ${clean(s.id)}](${link(relative(from, s.path))}) · ${clean(s.role)} · ${s.calls} calls (${s.unmetered} unmetered)${s.parent ? ` · parent ${clean(s.parent)}` : ''}`));
  if (data.warnings.length) lines.push('', '## Gaps', '', ...data.warnings.map(w => `- ${clean(w)}`));
  return lines.join('\n') + '\n';
}

const refreshed = new Map();
export function refreshReport(lab, force = false) {
  if (!historyEnabled(lab) || (!force && Date.now() - (refreshed.get(lab) ?? 0) < 300000)) return;
  const data = reportData(lab, {publish: true});
  atomic(join(localDir(lab), 'ACTIVITY.md'), renderReport(data));
  refreshed.set(lab, Date.now());
}

// Automatic scans and Git work run on another event loop. Only one report per
// lab runs at a time; shutdown requests one final pass after any in-flight scan.
const background = new Map();
export function scheduleReport(lab, force = false) {
  if (!historyEnabled(lab)) return Promise.resolve();
  const active = background.get(lab);
  if (active) { if (force) active.again = true; return active.promise; }
  if (!force && Date.now() - (refreshed.get(lab) ?? 0) < 300000) return Promise.resolve();
  const state = {again: false};
  state.promise = (async () => {
    do {
      state.again = false;
      await new Promise((resolve, reject) => {
        // import.meta.url also works for DSH's trusted embedded data URL module.
        const worker = new Worker(`const {workerData} = require('node:worker_threads');
          import(workerData.module).then(m => m.refreshReport(workerData.lab, true));`,
          {eval: true, execArgv: [], workerData: {module: import.meta.url, lab}});
        worker.once('error', reject);
        worker.once('exit', code => code ? reject(new Error(`History report worker exited ${code}`)) : resolve());
      });
      refreshed.set(lab, Date.now());
    } while (state.again);
  })().finally(() => background.delete(lab));
  background.set(lab, state);
  return state.promise;
}

async function fileHash(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function conversation(log) {
  const lines = [`# ${log.runtime} conversation ${clean(log.header.id)}`, '',
    `Role: ${clean(log.meta?.role ?? log.header.origin ?? 'unknown')}. Parent: ${clean(log.meta?.parentSession ?? log.header.parentSession ?? 'none recorded')}.`, '',
    'Recorded messages and tool events follow. This is the runtime log, including any thinking content the provider exposed; it does not reveal unrecorded internal reasoning.', ''];
  for (const event of log.events) {
    const text = JSON.stringify(event, null, 2), fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map(m => m[0].length + 1)));
    lines.push(`## ${clean(event.timestamp ?? event.time ?? '')} · ${clean(event.message?.role ?? event.type)}`, '', `${fence}json`, text, fence, '');
  }
  return lines.join('\n');
}

// A directory is intentional: inspect and verify it before compressing or sharing.
// Symlinks are recorded, never followed or materialized during archive creation.
export async function archive(lab, destination, {include = [], includeCaches = false} = {}) {
  lab = realpathSync(lab);
  let out = resolve(destination);
  if (within(lab, out) || within(out, lab)) throw new Error('Choose an archive destination outside the lab and its parents');
  if (existsSync(out)) throw new Error(`Archive destination already exists: ${out}`);
  mkdirSync(dirname(out), {recursive: true});
  out = join(realpathSync(dirname(out)), basename(out));
  if (within(lab, out) || within(out, lab)) throw new Error('Choose an archive destination outside the lab and its parents');
  const staging = mkdtempSync(join(dirname(out), '.pe-archive-'));
  const manifest = {format: 'pe-archive/1', started: new Date().toISOString(), source: lab, head: git(lab, ['rev-parse', 'HEAD']),
    files: [], links: [], omitted: [], repositories: [], warnings: [], extras: []};
  const caches = new Set(['node_modules', '.lake', '__pycache__', '.cache']);
  const emit = (name, body) => { const path = join(staging, name); mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, body, {mode: 0o600, flag: 'wx'}); };
  const copy = async (source, target, top = false) => {
    const stat = lstatSync(source), rel = slash(relative(staging, target));
    if (stat.isSymbolicLink()) { manifest.links.push({path: rel, target: readlinkSync(source)}); return; }
    if (stat.isDirectory()) {
      mkdirSync(target, {recursive: true, mode: 0o700});
      if (existsSync(join(source, '.git')) || (top && git(source, ['rev-parse', '--show-toplevel']) === source)) {
        const index = manifest.repositories.length, root = `repositories/${index}`, head = git(source, ['rev-parse', 'HEAD']);
        const repo = {path: rel, head, branch: git(source, ['branch', '--show-current']), bundle: null};
        manifest.repositories.push(repo);
        emit(`${root}/staged.patch`, execFileSync('git', ['-C', source, 'diff', '--cached', '--binary'], {maxBuffer: 128 * 1024 * 1024}));
        emit(`${root}/unstaged.patch`, execFileSync('git', ['-C', source, 'diff', '--binary'], {maxBuffer: 128 * 1024 * 1024}));
        emit(`${root}/status.txt`, (git(source, ['status', '--porcelain=v1']) ?? '') + '\n');
        if (head) {
          const name = `${root}/history.bundle`;
          execFileSync('git', ['-C', source, 'bundle', 'create', join(staging, name), '--all', 'HEAD'], {stdio: ['ignore', 'pipe', 'pipe']});
          execFileSync('git', ['-C', source, 'bundle', 'verify', join(staging, name)], {stdio: ['ignore', 'pipe', 'pipe']});
          repo.bundle = name;
        }
      }
      for (const name of readdirSync(source).sort()) {
        const path = join(source, name), dest = join(target, name);
        const reason = name === '.git' ? 'Git refs and reachable history are in a bundle; local Git config and reflogs are not copied'
          : !includeCaches && caches.has(name) && lstatSync(path).isDirectory() ? 'rebuildable cache (use --include-caches to retain)'
          : null;
        if (reason) { manifest.omitted.push({path: slash(relative(staging, dest)), reason}); continue; }
        await copy(path, dest);
      }
    } else if (stat.isFile()) {
      mkdirSync(dirname(target), {recursive: true});
      copyFileSync(source, target);
      const after = lstatSync(source);
      if (stat.size !== after.size || stat.mtimeMs !== after.mtimeMs) manifest.warnings.push(`Changed while copying: ${rel}`);
    } else manifest.omitted.push({path: rel, reason: 'socket, device, or other non-file'});
  };
  try {
    await copy(lab, join(staging, 'workspace'), true);
    for (const [i, requested] of include.entries()) {
      const source = resolve(requested);
      if (within(source, staging) || within(source, out)) throw new Error('An extra path would include the archive itself');
      const target = `extras/${i}/${basename(source)}`;
      await copy(source, join(staging, target), true);
      manifest.extras.push({source, path: target});
    }
    const snapshotLab = join(staging, 'workspace');
    const retained = retainIndexed(lab, snapshotLab);
    manifest.warnings.push(...retained.warnings);
    // An archive must read its own copies, never follow pointers back to this machine.
    rmSync(join(snapshotLab, '.research', 'local', 'index'), {recursive: true, force: true});
    // Use the copied logs so the report and conversation views describe this snapshot.
    const data = reportData(snapshotLab);
    data.lab = basename(lab); data.identity = git(lab, ['config', 'pe.lab']) || null;
    data.git = reportData(lab).git;
    emit('ACTIVITY.md', renderReport(data, {from: '.'}).replaceAll('](.research/', '](workspace/.research/'));
    const index = ['# Conversations', '', 'Raw records and readable copies of the collected sessions.', ''];
    for (const file of files(join(snapshotLab, '.research', 'local', 'sessions'), f => f.endsWith('.jsonl'))) {
      try {
        const log = readLog(file), name = basename(file, '.jsonl');
        emit(`conversations/${name}.md`, conversation(log));
        if (log.runtime === 'pi') emit(`conversations/${name}.pi.jsonl`, [log.header, ...log.events].map(json).join('\n') + '\n');
        else emit(`conversations/${name}.dsh.json`, JSON.stringify({header: log.header, events: log.events, metadata: log.meta}, null, 2) + '\n');
        index.push(`- [${clean(log.runtime)} ${clean(log.header.id)}](${name}.md) · [raw snapshot](../workspace/.research/local/sessions/${basename(file)})`);
        manifest.warnings.push(...log.warnings);
      } catch (e) { manifest.warnings.push(e.message); }
    }
    emit('conversations/INDEX.md', index.join('\n') + '\n');
    // Include the exact standalone verifier used to create the archive.
    emit('history.mjs', readFileSync(fileURLToPath(import.meta.url)));
    emit('README.md', `# ${clean(basename(lab))} archive\n\nSaved ${new Date().toISOString()}. This is a private snapshot, not the small publication pack.\n\n- [Activity](ACTIVITY.md)\n- [Conversations](conversations/INDEX.md)\n- [Manifest](manifest.json): hashes, omitted paths, symlinks, repositories, and extra inputs.\n- workspace/: files as copied, including uncommitted and ignored work.\n- repositories/: Git bundles plus staged and unstaged binary patches. Bundles include refs and reachable commits, not reflogs or unreachable objects.\n\nVerify with \`node history.mjs verify .\`. To compress after inspection, run \`tar -czf ../lab-archive.tar.gz .\` from this directory.\n\nRestore each repository by cloning its bundle into a fresh directory, checking out its recorded HEAD, and overlaying the corresponding workspace files (including deletions shown by status.txt). To restore staging, apply staged.patch with \`git apply --cached\`; the workspace copy already contains both staged and unstaged changes. Symlinks are listed in the manifest and need to be recreated deliberately.\n\nPi native JSONL copies are in conversations/. DSH snapshots preserve headers and events for inspection or a version-aware importer; they are not DSH's on-disk database format. Resuming depends on a compatible runtime and tools. Running processes, credentials from outside the lab, and provider state are not captured.\n\nInline attachments and workspace files travel with the archive. External file references need an explicit --include when making it; references inside arbitrary tool output are not automatically followed. Capture at a quiet moment for a consistent snapshot. Files changing during capture are flagged where detected; this is not an atomic filesystem snapshot.\n\nFull transcripts and ignored files may contain private material. Review a separate copy before publishing.\n`);
    manifest.finished = new Date().toISOString();
    const endHead = git(lab, ['rev-parse', 'HEAD']);
    if (endHead !== manifest.head) manifest.warnings.push(`HEAD changed during capture: ${manifest.head} -> ${endHead}`);
    for (const file of files(staging)) manifest.files.push({path: slash(relative(staging, file)), bytes: lstatSync(file).size, mode: lstatSync(file).mode & 0o777, sha256: await fileHash(file)});
    emit('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
    await verifyArchive(staging);
    // Reserve the destination exclusively; never merge into or overwrite another archive.
    mkdirSync(out, {mode: 0o700});
    for (const name of readdirSync(staging)) renameSync(join(staging, name), join(out, name));
    rmSync(staging, {recursive: true});
    return {path: out, files: manifest.files.length, warnings: manifest.warnings, sha256: await fileHash(join(out, 'manifest.json'))};
  } catch (e) { rmSync(staging, {recursive: true, force: true}); throw e; }
}

export async function verifyArchive(directory) {
  const root = resolve(directory), manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  if (manifest.format !== 'pe-archive/1' || !Array.isArray(manifest.files)) throw new Error('Unrecognized archive manifest');
  const expected = new Set(['manifest.json']);
  for (const entry of manifest.files) {
    if (typeof entry.path !== 'string' || entry.path.split('/').some(p => !p || p === '.' || p === '..') || entry.path.includes('\\') || isAbsolute(entry.path) || expected.has(entry.path)) throw new Error('Unsafe or duplicate archive path');
    expected.add(entry.path);
    let at = root;
    for (const part of entry.path.split('/')) { at = join(at, part); if (lstatSync(at).isSymbolicLink()) throw new Error(`Unexpected symlink: ${entry.path}`); }
    if (!regular(at) || lstatSync(at).size !== entry.bytes || await fileHash(at) !== entry.sha256) throw new Error(`Hash or size mismatch: ${entry.path}`);
  }
  const inspect = dir => { for (const name of readdirSync(dir)) { const file = join(dir, name), stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Unexpected symlink: ${relative(root, file)}`);
    if (stat.isDirectory()) inspect(file);
    else if (!stat.isFile() || !expected.has(slash(relative(root, file)))) throw new Error(`Unlisted archive file: ${relative(root, file)}`);
  } };
  inspect(root);
  return {files: manifest.files.length, warnings: manifest.warnings ?? []};
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === 'verify') { if (rest.length !== 1) throw new Error('verify needs an archive directory'); console.log(JSON.stringify(await verifyArchive(rest[0]), null, 2)); return; }
  const lab = labRoot();
  if (!lab) throw new Error('Run this inside a lab with .research/LAB.md');
  if (command === 'collect') { if (rest.length) throw new Error('collect takes no arguments'); console.log(JSON.stringify(collect(lab), null, 2)); refreshReport(lab, true); return; }
  if (command === 'report') {
    if (rest.some(a => !['--json', '--write'].includes(a))) throw new Error('report accepts --json or --write');
    const data = reportData(lab, {publish: rest.includes('--write') && historyEnabled(lab)});
    if (rest.includes('--write')) { const file = join(localDir(lab), 'ACTIVITY.md'); atomic(file, renderReport(data)); console.log(file); }
    else console.log(rest.includes('--json') ? JSON.stringify(data, null, 2) : renderReport(data));
    return;
  }
  if (command === 'archive') {
    const destination = rest.shift();
    if (!destination || destination.startsWith('--')) throw new Error('archive needs a new destination directory');
    const options = {include: [], includeCaches: false};
    while (rest.length) { const arg = rest.shift(); if (arg === '--include-caches') options.includeCaches = true;
      else if (arg === '--include' && rest[0] && !rest[0].startsWith('--')) options.include.push(rest.shift()); else throw new Error(`Unknown archive argument: ${arg}`); }
    const collected = collect(lab); const result = await archive(lab, destination, options);
    console.log(JSON.stringify({...result, collectionWarnings: collected.warnings}, null, 2)); return;
  }
  throw new Error('Usage: node history.mjs collect | report [--write|--json] | archive DIR [--include PATH] [--include-caches] | verify DIR');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(e => { console.error(`history: ${e.message}`); process.exitCode = 1; });
}
