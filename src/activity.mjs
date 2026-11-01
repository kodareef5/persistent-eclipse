// Pure views over sanitized receipts. No transcript reads, clocks, or model calls.
// The same numbers feed Git-readable Markdown/SVG, Pi, and the DSH card.
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export const timestamp = value => {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Date.parse(value);
  return finite(n) && n <= 8.64e15 ? n : null;
};
const fields = ['input', 'output', 'cacheRead', 'cacheWrite', 'total'];
const sum = values => values.reduce((a, b) => a + b, 0);
const quantile = (values, p) => {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * p) - 1)];
};
const promptTokens = call => [call.input, call.cacheRead, call.cacheWrite].every(finite)
  ? call.input + call.cacheRead + call.cacheWrite : null;
const duration = turn => timestamp(turn.started) != null && timestamp(turn.ended) >= timestamp(turn.started)
  && turn.ended != null && !turn.disputed ? timestamp(turn.ended) - timestamp(turn.started) : null;
const label = value => String(value ?? 'unknown').replace(/[\x00-\x1f\x7f]/g, ' ');
const md = value => label(value).replace(/[|<>`\[\]\\]/g, c => ({'|':'\\|','<':'&lt;','>':'&gt;','`':"'",'[':'\\[',']':'\\]','\\':'\\\\'}[c]));
const xml = value => label(value).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export const compact = n => n == null ? '?' : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n));
export const span = ms => ms == null ? '?' : ms < 1000 ? `${Math.round(ms)}ms`
  : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : ms < 3600000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 3600000).toFixed(1)}h`;
const percent = n => n == null ? '?' : `${(n * 100).toFixed(1)}%`;
export const activityFile = id => id.replace(/[^a-zA-Z0-9_-]/g, '_');
const bounds = values => values.reduce((range, value) => [Math.min(range[0], value), Math.max(range[1], value)], [Infinity, -Infinity]);

// Sweep intervals by session, so parallel work adds agent time but not elapsed
// time. Duplicate/overlapping intervals from one session occupy one lane.
export function concurrency(turns) {
  const events = new Map();
  for (const t of turns) {
    if (duration(t) == null) continue;
    for (const [time, delta] of [[timestamp(t.started), 1], [timestamp(t.ended), -1]]) {
      if (!events.has(time)) events.set(time, []);
      events.get(time).push([t.session || t.identity, delta]);
    }
  }
  const active = new Map();
  let peak = 0, elapsedMs = 0, agentMs = 0, previous = null;
  for (const [time, changes] of [...events].sort((a, b) => a[0] - b[0])) {
    if (previous != null) {
      if (active.size) elapsedMs += time - previous;
      agentMs += (time - previous) * active.size;
    }
    for (const [id, delta] of changes) {
      const n = (active.get(id) || 0) + delta;
      if (n) active.set(id, n); else active.delete(id);
    }
    peak = Math.max(peak, active.size);
    previous = time;
  }
  return {peak, elapsedMs, agentMs};
}

function summarize(calls, turns) {
  const sums = {}, coverage = {};
  for (const field of fields) {
    const values = calls.map(c => c[field]).filter(finite);
    sums[field] = values.length ? sum(values) : null;
    coverage[field] = values.length;
  }
  const costs = {};
  for (const kind of ['reported', 'estimate']) {
    const values = calls.filter(c => c.costKind === kind && finite(c.cost)).map(c => c.cost);
    costs[kind] = {value: values.length ? sum(values) : null, calls: values.length};
  }
  const prompts = calls.filter(c => promptTokens(c) != null);
  const denominator = sum(prompts.map(promptTokens));
  const completed = turns.filter(t => duration(t) != null), durations = completed.map(duration);
  const sessions = new Set([...calls, ...turns].map(c => c.session).filter(Boolean));
  const workers = new Set([...calls, ...turns].filter(c => c.role === 'worker').map(c => c.session).filter(Boolean));
  return {calls: calls.length, sessions: sessions.size, workers: workers.size, sums, coverage, costs,
    timedCalls: calls.filter(c => timestamp(c.time) != null).length,
    cache: {rate: denominator ? sum(prompts.map(c => c.cacheRead)) / denominator : null, calls: prompts.length},
    context: {median: quantile(prompts.map(promptTokens), .5), p90: quantile(prompts.map(promptTokens), .9)},
    turns: {count: turns.length, completed: completed.length, unfinished: turns.length - completed.length,
      medianMs: quantile(durations, .5), p90Ms: quantile(durations, .9)},
    timing: concurrency(completed), workersTiming: concurrency(completed.filter(t => t.role === 'worker'))};
}

function groups(calls, key) {
  const by = new Map();
  for (const c of calls) {
    const k = key(c);
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(c);
  }
  return [...by].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, list]) => {
      const {calls, sums, coverage, costs, cache} = summarize(list, []);
      return {name, calls, sums, coverage, costs, cache};
    });
}

export function activityView(data, scope = 'all') {
  const labs = data.collective.labs;
  const selected = scope === 'all' ? null : labs.find(l => l.id === scope);
  if (scope !== 'all' && !selected) throw new Error('Unknown activity lab');
  const belongs = c => !selected || selected.ids.includes(c.origin?.id ?? 'unattributed');
  const calls = data.usage.receipts.filter(belongs), turns = (data.usage.turns || []).filter(belongs);
  const labOf = c => labs.find(l => l.ids.includes(c.origin?.id ?? 'unattributed'))?.label ?? 'unattributed';
  const bySession = new Map();
  for (const item of [...calls, ...turns]) if (item.session) {
    if (!bySession.has(item.session)) bySession.set(item.session, {calls: [], turns: []});
    bySession.get(item.session)[item.started != null ? 'turns' : 'calls'].push(item);
  }
  const conversations = [...bySession].map(([id, entries]) => {
    const all = [...entries.calls, ...entries.turns], first = all[0];
    const times = all.flatMap(c => [c.time, c.started, c.ended]).map(timestamp).filter(t => t != null);
    const {calls: count, turns: measured, context} = summarize(entries.calls, entries.turns);
    const [firstTime, lastTime] = bounds(times);
    return {id, lab: labOf(first), role: first.role, task: first.taskId || 'unknown',
      first: times.length ? firstTime : null, last: times.length ? lastTime : null,
      calls: count, turns: measured, context};
  }).sort((a, b) => (b.last ?? 0) - (a.last ?? 0) || a.id.localeCompare(b.id));
  const days = groups(calls.filter(c => timestamp(c.time) != null), c => new Date(timestamp(c.time)).toISOString().slice(0, 10));
  return {scope, label: selected?.label ?? 'All labs',
    labs: labs.map(l => ({id: l.id, label: l.label, updated: l.updated, shared: l.calls != null,
      summary: summarize(data.usage.receipts.filter(c => l.ids.includes(c.origin?.id ?? 'unattributed')),
        (data.usage.turns || []).filter(t => l.ids.includes(t.origin?.id ?? 'unattributed')))})),
    summary: summarize(calls, turns), days, conversations,
    models: groups(calls, c => `${c.provider}/${c.model} · ${c.effort} · ${c.role}`),
    missions: groups(calls, c => `${c.mission || 'unknown'} @ ${(c.packRevision || 'unknown').slice(0, 12)}`),
    agents: groups(calls, c => `${labOf(c)} · ${c.role} ${c.taskId && c.taskId !== 'unknown' ? c.taskId : c.session?.slice(0, 8) || ''}`),
    fleet: turns.filter(t => duration(t) != null).map(t => ({session: t.session, started: t.started, ended: t.ended, lab: labOf(t)}))};
}

function amount(row, field) {
  return compact(row.sums[field]) + (row.coverage[field] && row.coverage[field] < row.calls ? '*' : '');
}
function cost(row) {
  return ['reported', 'estimate'].filter(k => row.costs[k].calls)
    .map(k => `$${row.costs[k].value.toFixed(4)} ${k} (${row.costs[k].calls}/${row.calls})`).join('; ') || '?';
}
function table(rows) {
  return ['| View | Calls | Tokens | Cache hit | Reported / estimated cost |', '| --- | ---: | ---: | ---: | --- |',
    ...rows.map(r => `| ${md(r.name)} | ${r.calls} | ${amount(r, 'total')} | ${percent(r.cache.rate)} (${r.cache.calls}/${r.calls}) | ${cost(r)} |`)];
}

export function activityMarkdown(view, {chart = 'overview.svg', overall = false} = {}) {
  const s = view.summary;
  const lines = [`# ${md(view.label)} · activity`, '',
    'Generated from received accounting receipts. Rebuild after merging; commit this page and its charts with the receipts.', '',
    `![Tokens, cache, costs, and research turns](${chart})`, '',
    `${s.calls} recorded calls · ${s.sessions} observed conversations · ${s.workers} worker conversations.`, '',
    '| Tokens | Uncached input | Output | Cache read | Cache write |', '| ---: | ---: | ---: | ---: | ---: |',
    `| ${amount(s, 'total')} | ${amount(s, 'input')} | ${amount(s, 'output')} | ${amount(s, 'cacheRead')} | ${amount(s, 'cacheWrite')} |`, '',
    `Costs: ${cost(s)}. Cache hit rate: ${percent(s.cache.rate)} across ${s.cache.calls}/${s.calls} calls with all input buckets.`, '',
    `Recorded turns: ${s.turns.completed} complete, ${s.turns.unfinished} with an unknown end. Median ${span(s.turns.medianMs)}; p90 ${span(s.turns.p90Ms)}.`,
    `Observed elapsed activity: ${s.turns.completed ? span(s.timing.elapsedMs) : '?'}. Summed agent time: ${s.turns.completed ? span(s.timing.agentMs) : '?'}. Peak simultaneous workers: ${s.turns.completed ? s.workersTiming.peak : '?'}.`,
    `Input context per measured call: median ${compact(s.context.median)}, p90 ${compact(s.context.p90)} tokens.`, '',
    'Turns are runtime runs that can contain several model calls and tools (Pi agent loops; DSH turns). Elapsed activity is the union of observed intervals, excluding idle gaps; summed agent time includes parallel work. Neither is a deadline or a measure of research quality.', '',
    `Coverage: ${s.coverage.total}/${s.calls} total-token counts; ${s.timedCalls}/${s.calls} call timestamps. Older receipts may have no timing. Missing values are ?, partial totals carry *. Cache rate is token-weighted cache reads / (uncached input + cache reads + cache writes), using complete input accounting only. Reasoning tokens are already part of output. Costs remain separate reported charges and estimates; unknown costs are not zero.`, ''];
  if (!s.calls && !s.turns.count) lines.push('No accounting has arrived for this view. Activity remains unknown.', '');
  if (overall && view.labs.length) lines.push('## Labs', '', '| Lab | Calls | Workers | Tokens | Cache hit | Median turn | Latest received |', '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...view.labs.map(l => `| [${md(l.label)}](labs/${activityFile(l.id)}.md) | ${l.shared ? l.summary.calls : '?'} | ${l.shared ? l.summary.workers : '?'} | ${amount(l.summary, 'total')} | ${percent(l.summary.cache.rate)} | ${span(l.summary.turns.medianMs)} | ${l.shared ? l.updated || 'unknown' : 'not shared'} |`), '');
  lines.push('## Models, effort, and roles', '', ...table(view.models), '', '## Missions and revisions', '', ...table(view.missions), '',
    '<details><summary>Agents and conversations</summary>', '', ...table(view.agents), '',
    '| Conversation | Lab / role | Calls | Recorded turns | Median / p90 turn | Median input context |', '| --- | --- | ---: | ---: | --- | ---: |',
    ...view.conversations.map(c => `| ${c.id.slice(0, 8)} | ${md(c.lab)} / ${md(c.role)} | ${c.calls} | ${c.turns.completed}${c.turns.unfinished ? ` + ${c.turns.unfinished} unfinished` : ''} | ${span(c.turns.medianMs)} / ${span(c.turns.p90Ms)} | ${compact(c.context.median)} |`), '', '</details>', '');
  return lines.join('\n');
}

// Standalone, deterministic SVG. Restrict the picture to recent activity while
// the tables keep all received data. No scripts, external assets, or raw markup.
export function activityChart(view) {
  const out = [], w = 1000;
  const text = (x, y, value, cls = '') => out.push(`<text x="${x}" y="${y}" class="${cls}">${xml(value)}</text>`);
  const rect = (x, y, width, height, fill, extra = '') => out.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(0, width).toFixed(2)}" height="${Math.max(0, height).toFixed(2)}" fill="${fill}" ${extra}/>`);
  const line = (x1, y1, x2, y2, stroke = '#dce4ed') => out.push(`<path d="M${x1},${y1} L${x2},${y2}" stroke="${stroke}" fill="none"/>`);
  const s = view.summary, colors = ['#4f67be', '#25a68a', '#86cbb8', '#f0a64d'];
  text(32, 38, view.label, 'title');
  text(32, 65, `${s.calls} calls · ${s.sessions} conversations · ${s.workers} workers · ${s.turns.completed} measured turns`, 'sub');
  const cards = [ ['Recorded tokens', amount(s, 'total')], ['Cache hit', percent(s.cache.rate)],
    ['Reported cost', s.costs.reported.calls ? '$' + s.costs.reported.value.toFixed(3) : '?'],
    ['Estimated cost', s.costs.estimate.calls ? '$' + s.costs.estimate.value.toFixed(3) : '?'] ];
  cards.forEach(([name, value], i) => {
    rect(32 + i * 240, 87, 222, 78, '#f0f4f9', 'rx="10"');
    text(46 + i * 240, 111, name, 'sub'); text(46 + i * 240, 145, value, 'metric');
  });
  const last = view.days.at(-1)?.name;
  const days = last ? Array.from({length: 21}, (_, i) => {
    const date = new Date(Date.parse(last) - (20 - i) * 86400000).toISOString().slice(0, 10);
    return view.days.find(d => d.name === date) || {name: date, calls: 0, sums: {}, costs: {}, cache: {}};
  }) : [];
  const plot = {x: 70, width: 886, step: 886 / 21};
  text(32, 201, 'Tokens by day · last 21 days with received timestamps (UTC)', 'heading');
  ['Uncached', 'Cache read', 'Cache write', 'Output'].forEach((name, i) => {
    rect(40 + i * 160, 218, 10, 10, colors[i]); text(56 + i * 160, 228, name, 'sub');
  });
  const stacked = ['input', 'cacheRead', 'cacheWrite', 'output'];
  const maxTokens = Math.max(1, ...days.map(d => sum(stacked.map(f => d.sums[f] || 0))));
  line(plot.x, 365, 956, 365); text(32, 254, compact(maxTokens), 'tiny');
  days.forEach((d, i) => {
    let y = 365;
    stacked.forEach((f, k) => {
      const height = (d.sums[f] || 0) / maxTokens * 115;
      y -= height;
      rect(plot.x + i * plot.step + 3, y, plot.step - 6, height, colors[k]);
    });
    if (i % 4 === 0) text(plot.x + i * plot.step, 386, d.name.slice(5), 'tiny');
  });
  if (!days.length) text(70, 300, 'No timestamped calls received yet.', 'sub');
  text(32, 425, 'Cost by day · known charges and estimates remain separate', 'heading');
  const maxCost = Math.max(.000001, ...days.map(d => sum(['reported', 'estimate'].map(k => d.costs[k]?.value || 0))));
  line(plot.x, 540, 956, 540);
  days.forEach((d, i) => {
    let y = 540;
    ['reported', 'estimate'].forEach((k, j) => {
      const height = (d.costs[k]?.value || 0) / maxCost * 85;
      y -= height;
      rect(plot.x + i * plot.step + 3, y, plot.step - 6, height, j ? '#c6b4e2' : '#7957a4');
    });
  });
  text(32, 450, '$' + (maxCost === .000001 ? '0' : maxCost.toFixed(3)), 'tiny');
  text(70, 563, 'Dark: reported · light: estimate · absent bars may mean missing accounting', 'sub');
  text(32, 603, 'Cache hit rate · token-weighted, complete input accounting only', 'heading');
  line(plot.x, 702, 956, 702); text(32, 629, '100%', 'tiny'); text(32, 703, '0%', 'tiny');
  // Separate segments at gaps; a missing bucket must not draw a zero or a bridge.
  let prev = null;
  days.forEach((d, i) => {
    const rate = d.cache.rate;
    if (rate == null) { prev = null; return; }
    const x = plot.x + (i + .5) * plot.step, y = 702 - rate * 72;
    if (prev) line(prev.x, prev.y, x, y, '#16886f');
    out.push(`<circle cx="${x}" cy="${y}" r="3" fill="#16886f"/>`); prev = {x, y};
  });
  const lanes = view.conversations.filter(c => c.turns.completed).slice(0, 16);
  const laneIds = new Set(lanes.map(l => l.id));
  const turns = view.fleet.filter(t => laneIds.has(t.session));
  const ends = turns.flatMap(t => [timestamp(t.started), timestamp(t.ended)]);
  const [minimum, maximum] = bounds(ends);
  const hi = ends.length ? maximum : 0, lo = Math.max(ends.length ? minimum : 0, hi - 7 * 86400000);
  const x = time => 255 + (time - lo) / Math.max(hi - lo, 1) * 701;
  text(32, 746, 'Research turns · 16 most recent conversations, up to seven days', 'heading');
  lanes.forEach((c, i) => {
    const y = 775 + i * 26;
    text(32, y + 9, `${c.lab} · ${c.role} ${c.task === 'unknown' ? c.id.slice(0, 6) : c.task}`.slice(0, 31), 'tiny');
    line(255, y + 5, 956, y + 5);
    for (const t of turns.filter(t => t.session === c.id && timestamp(t.ended) >= lo))
      rect(x(Math.max(lo, timestamp(t.started))), y, Math.max(2, x(timestamp(t.ended)) - x(Math.max(lo, timestamp(t.started)))), 10,
        c.role === 'worker' ? '#25a68a' : '#4f67be', 'rx="3"');
  });
  const bottom = 797 + Math.max(1, lanes.length) * 26;
  if (ends.length) { text(255, bottom, new Date(lo).toISOString().slice(0, 16).replace('T', ' '), 'tiny'); text(790, bottom, new Date(hi).toISOString().slice(0, 16).replace('T', ' '), 'tiny'); }
  else text(70, 790, 'Turn timing will appear as upgraded runtimes record it.', 'sub');
  const worker = s.workersTiming;
  text(32, bottom + 40, `Workers: peak ${s.turns.completed ? worker.peak : '?'} simultaneous · observed agent time ${s.turns.completed ? span(worker.agentMs) : '?'} · elapsed activity ${s.turns.completed ? span(worker.elapsedMs) : '?'}`, 'sub');
  text(32, bottom + 65, `${s.coverage.total}/${s.calls} token totals · ${s.cache.calls}/${s.calls} cache measurements · ${s.timedCalls}/${s.calls} timestamps · ? unknown · * partial`, 'sub');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${bottom + 88}" role="img" aria-labelledby="title desc"><title id="title">${xml(view.label)} activity</title><desc id="desc">Received tokens, cost, cache rates, and observed research turns. Unknown values are not zero.</desc><style>text{font-family:system-ui,sans-serif;fill:#26374d;font-size:14px}.title{font-size:24px;font-weight:650}.heading{font-size:16px;font-weight:600}.metric{font-size:25px;font-weight:600}.sub{font-size:13px;fill:#53647a}.tiny{font-size:11px;fill:#53647a}</style><rect width="100%" height="100%" fill="#fff" rx="12"/>${out.join('')}</svg>\n`;
}
