// DSH web: a Persistent Eclipse pill under the composer, beside DSH's own turn and token
// stats, like Pi's footer. Each worker slot is a braille-like dot grid drawn in SVG, its
// color ramping with the worker's age; while the manager works, one gap travels the row.
// Slots are DSH's own subagent parallelism limit (Settings → Subagent), not LAB.md.
// Clicking opens a card: each researcher's age, then the lab's disk, repo, and inbox, as
// the host measures them for Pi's footer (src/lab-status.mjs, via dsh-host.js). build.py wraps this in DSH's module loader with
// src/cells.mjs inlined, so the colors and timings match Pi's footer exactly.
const React = require('react'), h = React.createElement;
CELLS
const NAME = 'Persistent Eclipse';
const light = () => matchMedia('(prefers-color-scheme: light)').matches;
const rgb = c => `rgb(${c.join(',')})`;
const muted = 'var(--dsw-alias-label-tertiary)';
const mins = ms => `${Math.floor(Math.max(0, ms) / 60_000)}m`;
const accounted = (r,key) => r.coverage[key] ? `${r.sums[key]}${r.coverage[key]<r.calls?' (partial)':''}` : '?';
const measuredTime = ms => ms == null ? '?' : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}m`;
function Activity({value, scope, select}) {
  const [tab, setTab] = React.useState('Models');
  const view = value.view, s = view.summary;
  const rows = tab === 'Agents' ? view.agents : tab === 'Missions' ? view.missions : view.models;
  return h('div', {style: {width: 620, maxWidth: 'calc(100vw - 64px)', marginTop: 10, fontSize: 12}},
    h('label', null, 'Activity for ', h('select', {'aria-label': 'Activity lab', value: scope, onChange: e => select(e.target.value)},
      h('option', {value: 'all'}, 'All labs'), ...view.labs.map(l => h('option', {key: l.id, value: l.id}, l.label)))),
    h('img', {src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value.chart), alt: `${view.label}: tokens, cost, cache, and research turns`, style: {display: 'block', width: '100%', margin: '10px 0', borderRadius: 8}}),
    h('p', null, `${s.turns.completed} measured turns · median ${measuredTime(s.turns.medianMs)} · p90 ${measuredTime(s.turns.p90Ms)} · ${s.turns.unfinished} with an unknown end`),
    h('p', null, `Accounting: ${s.coverage.total}/${s.calls} token totals · ${s.cache.calls}/${s.calls} cache measurements. Costs shown separately as reported or estimated; ? means unknown.`),
    h('div', {role: 'group', 'aria-label': 'Activity breakdown'}, ['Models', 'Missions', 'Agents', 'Conversations'].map(name =>
      h('button', {key: name, 'aria-pressed': tab === name, onClick: () => setTab(name)}, name))),
    h('div', {style: {maxHeight: 260, overflow: 'auto'}},
      tab === 'Conversations' ? view.conversations.map(c => h('p', {key: c.id},
        `${c.lab} · ${c.role} ${c.id.slice(0, 8)}: ${c.calls} calls, ${c.turns.completed} measured turns, median/p90 ${measuredTime(c.turns.medianMs)}/${measuredTime(c.turns.p90Ms)}, median input context ${c.context.median ?? '?'} tokens`))
        : rows.map(r => h('p', {key: r.name}, `${r.name}: ${r.calls} calls · input ${accounted(r, 'input')}, output ${accounted(r, 'output')}, cache read/write ${accounted(r, 'cacheRead')}/${accounted(r, 'cacheWrite')} · `,
          ['reported', 'estimate'].map(kind => r.costs[kind].calls ? `$${r.costs[kind].value.toFixed(4)} ${kind} (${r.costs[kind].calls}/${r.calls})` : `${kind} unknown`).join(' · ')))),
    h('p', null, 'Git view: .research/activity/README.md. Turn timings include tools and waits; they describe activity, not research quality.'));
}
const size = bytes => {
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < 3) { v /= 1024; i++; }
  return `${v < 10 && i ? v.toFixed(1) : Math.round(v)}${'KMGT'[i]}`;
};
// The lab's disk, repo, and inbox lines; absent parts are left out rather than guessed.
function labLines(lab) {
  if (!lab) return [];
  const lines = [['Disk', lab.disk === null ? 'measuring…' : size(lab.disk) + (lab.low && lab.free !== null ? ` · ${size(lab.free)} free` : ''), lab.low ? 'var(--dsw-alias-state-warn-primary)' : undefined]];
  const r = lab.remote;
  const behind = !lab.sync?.viewsPending && r?.behind;
  if (r) lines.push(['Repo', [`${r.name}/${r.branch}`, r.bytes && size(r.bytes), behind && `${behind} to pull`, r.ahead && `${r.ahead} to push`].filter(Boolean).join(' · '),
    behind ? 'var(--dsw-alias-link)' : undefined]);
  const box = lab.inbox;
  if (box && lab.name) lines.push(['Inbox', `↓${box.received}${box.open ? ` · ${box.open} open` : ''} · ↑${box.sent}`, box.open ? 'var(--dsw-alias-link)' : undefined]);
  return lines;
}
// Braille dot bits by column and row, as in src/cells.mjs.
const BITS = [[0x01, 0, 0], [0x02, 0, 1], [0x04, 0, 2], [0x40, 0, 3], [0x08, 1, 0], [0x10, 1, 1], [0x20, 1, 2], [0x80, 1, 3]];
function Dots({cell, scale = 1, title}) {
  const bits = cell.glyph.codePointAt(0) - 0x2800;
  const fill = cell.free ? muted : rgb(tint(cell.at, light()));
  return h('svg', {width: 7 * scale, height: 12 * scale, viewBox: '0 0 7 12', 'aria-hidden': !title, style: {display: 'block', opacity: cell.free ? 0.45 : cell.off ? 0.25 : 1}},
    title ? h('title', null, title) : null,
    BITS.filter(([bit]) => bits & bit).map(([bit, c, r]) => h('circle', {key: bit, cx: 1.6 + c * 3.8, cy: 1.5 + r * 3, r: 1.25, fill})));
}
function Fleet({useSubagentLimits, labStatus, answerQuestion, usageReport, researchReport, sessionId, useProjection, useSessionStatus, useSessions}) {
  const preset = useProjection('agentPreset');
  const goalProjection = useProjection('goal');
  const goal = goalProjection?.goal;
  const catalog = useProjection('subagentCatalog') ?? [];
  const statuses = useSessionStatus(value => value);
  const sessions = useSessions(state => state.byId);
  const configured = Number(useSubagentLimits(snapshot => snapshot.value?.maxActiveSubagents));
  const [open, setOpen] = React.useState(false);
  const [usage, setUsage] = React.useState(null);
  const [usageScope, setUsageScope] = React.useState('all');
  const usageRequest = React.useRef(0);
  React.useEffect(() => { usageRequest.current++; setUsage(null); setUsageScope('all'); }, [sessionId]);
  const loadUsage = async (scope = usageScope) => {
    const request = ++usageRequest.current;
    try {
      const value = await usageReport(sessionId, scope);
      if (request !== usageRequest.current) return;
      setUsage({sessionId, value}); setUsageScope(scope); setError('');
    } catch (e) { if (request === usageRequest.current) setError(e.message); }
  };
  const [drafts, setDrafts] = React.useState({});
  const [error, setError] = React.useState('');
  const running = id => (statuses?.get?.(id)?.running ?? sessions?.[id]?.running) === true;
  const workers = catalog.filter(entry => running(entry.id)).map(entry => ({label: entry.label ?? entry.id, start: entry.createdAt}));
  const done = catalog.length - workers.length, slots = Math.max(Number.isSafeInteger(configured) ? configured : 8, workers.length);
  const moving = running(sessionId) && workers.length > 0;
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), moving ? STEP_MS : IDLE_MS);
    return () => clearInterval(timer);
  }, [moving]);
  // Refresh question counts and goal activation while the compact pill is visible.
  const [lab, setLab] = React.useState(null);
  const [report, setReport] = React.useState(null);
  React.useEffect(() => {
    if ((preset?.id ?? preset) !== 'persistent-eclipse') return;
    let live = true;
    const ask = () => labStatus(sessionId).then(value => { if (live) setLab(value); }, () => {});
    ask();
    const timer = setInterval(ask, 15_000);
    return () => { live = false; clearInterval(timer); };
  }, [open, sessionId, preset]);
  if ((preset?.id ?? preset) !== 'persistent-eclipse') return null;
  const cells = row(now, [...workers.map(w => w.start), ...Array(slots - workers.length).fill(null)], moving);
  const list = workers.map((w, i) => ({...w, cell: cells[i], age: age(now - w.start)}));
  return h('span', {style: {position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: muted, cursor: 'pointer'},
    role: 'button', tabIndex: 0, 'aria-expanded': open, title: `${NAME}: ${workers.length} of ${slots} researching, ${done} done`,
    onClick: () => setOpen(!open), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } if (e.key === 'Escape') setOpen(false); }},
    h('span', null, NAME),
    goal?.phase && h('span', {title:goal.objective}, `⚑ ${goal.phase === 'active' && lab?.goalActivation !== 'armed' ? 'awaiting resume' : goal.phase}`),
    lab?.questions?.some(q=>q.status==='open') && h('span',null,`? ${lab.questions.filter(q=>q.status==='open').length}`),
    h('span', {style: {display: 'inline-flex', alignItems: 'center', gap: 4}}, cells.map((cell, i) => h(Dots, {key: i, cell}))),
    h('span', {style: {fontVariantNumeric: 'tabular-nums', color: done ? 'var(--dsw-alias-state-success-primary)' : undefined}}, `+${done}`),
    open && h('div', {role: 'dialog', 'aria-label': NAME, onClick: e => e.stopPropagation(), style: {position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%',
      transform: 'translateX(-50%)', minWidth: 280, maxWidth: 'calc(100vw - 32px)', maxHeight: '70vh', overflow: 'auto', padding: '12px 14px', borderRadius: 12, cursor: 'default', zIndex: 20, textAlign: 'left',
      background: 'var(--dsw-alias-bg-layer-3, #2a2a2e)', border: '1px solid var(--dsw-alias-border-l2, #333)', boxShadow: '0 8px 28px rgba(0,0,0,.3)'}},
      h('div', {style: {display: 'flex', gap: 8, marginBottom: list.length ? 10 : 0, fontSize: 12}},
        h('span', {style: {color: 'var(--dsw-alias-label-secondary)', fontWeight: 600}}, NAME),
        h('span', null, `${workers.length} of ${slots} researching · ${done} done`)),
      h('div', {style: {display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '7px 10px', alignItems: 'center', fontSize: 12.5}},
        list.flatMap((w, i) => [
          h(Dots, {key: `${i}c`, cell: w.cell, scale: 1.2}),
          h('span', {key: `${i}l`, style: {color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240}}, w.label),
          h('span', {key: `${i}a`, style: {fontVariantNumeric: 'tabular-nums', color: w.age.stage >= AGE_INSPECT ? rgb(tint(w.age.at, light())) : muted}},
            mins(now - w.start) + (w.age.stage >= AGE_INSPECT ? ' · take a look' : ''))])),
      lab?.sync && ['synced','manual'].includes(lab.sync.state) && h('div',null,lab.sync.automatic ? 'Sync: automatic after reviewed commits' : 'Sync: manager initiated'),
      lab?.sync?.problems?.map((p,i)=>h('div',{key:'push-problem-'+i},p)),
      lab?.sync?.advice?.map((p,i)=>h('div',{key:'sync-advice-'+i},`Advice: ${p}`)),
      lab?.provenance?.map((p,i)=>h('div',{key:'content-provenance-'+i},p)),
      lab?.sync?.state === 'waiting' && h('div',null,`${lab.sync.behind} shared commit(s) ready. The manager can run sync.mjs at a useful pause to bring them into this checkout.`),
      lab?.sync && ['pending','needs-merge','needs-review'].includes(lab.sync.state) && h('div',null,`Sync ${lab.sync.state}: ${lab.sync.error || 'remote changes need review'}`),
      (lab?.questions || []).map(q=>h('div',{key:q.id,style:{marginTop:10}},
        h('div',null,`${q.status === 'open'?'?':'✓'} ${q.question}`),
        q.affected && h('small',null,q.affected),
        q.status==='answered' ? h('div',null,q.answer) : h('div',null,
          h('input',{'aria-label':'Answer '+q.question,value:drafts[q.id]||'',onChange:e=>setDrafts({...drafts,[q.id]:e.target.value})}),
          h('button',{onClick:async()=>{try{await answerQuestion(sessionId,q.id,drafts[q.id]||'');setLab(await labStatus(sessionId));setError('');}catch(e){setError(e.message);}}},'Answer')))),
      error && h('div',{role:'alert'},error),
      h('button',{onClick:async()=>{try{setReport({sessionId, text: await researchReport(sessionId)});setError('');}catch(e){setError(e.message);}}},'Report'),
      report?.sessionId === sessionId && h('pre',{style:{maxHeight:400,overflow:'auto',whiteSpace:'pre-wrap',fontSize:12}},report.text),
      h('button', {onClick: () => loadUsage()}, usage ? 'Refresh activity' : 'Activity'),
      usage?.sessionId === sessionId && h(Activity, {value: usage.value, scope: usageScope, select: loadUsage}),
      labLines(lab).length ? h('div', {style: {display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 12px', fontSize: 12.5, marginTop: list.length ? 12 : 0,
        paddingTop: list.length ? 10 : 0, borderTop: list.length ? '1px solid var(--dsw-alias-border-l2, #333)' : undefined}},
        labLines(lab).flatMap(([label, value, color]) => [h('span', {key: label}, label), h('span', {key: label + 'v', style: {color: color ?? 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums'}}, value)])) : null));
}
const name = 'persistent-eclipse';
const inject = ['slots', 'configForms', 'connection'];
function apply(ctx) {
  const limits = ctx.configForms.get('subagent');
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({name: 'conversation.composer.dock', id: 'persistent-eclipse', order: 5,
    inject: () => ({hooks: {subagentLimits: limits},
      researchReport:async(sessionId)=>{const r=await ctx.connection.rpc.call('/persistent-eclipse','report',{sessionId});if(!r.ok)throw new Error(r.error.message);return r.value;},
      answerQuestion:async(sessionId,id,answer)=>{const r=await ctx.connection.rpc.call('/persistent-eclipse','answer',{sessionId,id,answer});if(!r.ok)throw new Error(r.error.message);return r.value;},
      usageReport:async(sessionId,scope)=>{const r=await ctx.connection.rpc.call('/persistent-eclipse','usage',{sessionId,scope});if(!r.ok)throw new Error(r.error.message);return r.value;},
      labStatus: async sessionId => {
      const response = await ctx.connection.rpc.call('/persistent-eclipse', 'lab', {sessionId});
      if (!response.ok) throw new Error(response.error.message);
      return response.value;
    }})}, Fleet));
}
exports.name = name;
exports.inject = inject;
exports.apply = apply;
exports.default = {name, inject, apply};
