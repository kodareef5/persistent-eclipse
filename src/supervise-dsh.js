// Shared capacity/progress decisions wake an idle manager during an armed goal.
// Housekeeping is independent. Checks spend no goal round and stop no worker.
{
  const progress = new Map()
  const agents = new Map(), timers = new Map(), waited = new Map(), since = new Map() // since: this activation's start
  const labOf = cwd => { for (let d = path.resolve(cwd || '.'); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) return d; if (d === path.dirname(d)) return undefined } }
  const labText = root => { try { return fs.readFileSync(path.join(root, '.research', 'LAB.md'), 'utf8') } catch { return '' } }
  const every = root => {
    const m = /^[ \t]*Housekeeping:[ \t]*(off|\d+(?:\.\d+)?)[ \t]*([hms]?)\b/im.exec(labText(root))
    if (!m) return 6 * 3_600_000
    if (m[1].toLowerCase() === 'off') return 0
    return Math.max(5000, Number(m[1]) * {h: 3_600_000, m: 60_000, s: 1000}[m[2].toLowerCase() || 'h'])
  }
  const slots = () => { const n = Number(ctx.get('subagents')?.config?.maxActiveSubagents?.get?.()); return Number.isSafeInteger(n) && n > 0 ? n : 8 }
  const span = ms => ms >= 3_600_000 ? `${Math.round(ms / 360_000) / 10} hours` : ms >= 60_000 ? `${Math.round(ms / 60_000)} minutes` : `${Math.round(ms / 1000)} seconds`
  const age = ms => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
  const goal = agent => { try { return ctx.get('goals')?.get(agent) } catch { return undefined } }
  const armed = agent => { const g = goal(agent); return g?.phase === 'active' && g.activation === 'armed' ? g : undefined }
  const manager = agent => agent.session.header.origin !== 'subagent' && labOf(ctx.get('workingDirectory')?.get(agent.session) ?? agent.session.header.cwd)
  const workers = agent => [...agents.values()].filter(a => a.session.header.parentSession === agent.id && a.status === 'running' && since.has(a.id))
  const send = (agent, check, text) => agent.followup({id: process.getBuiltinModule('node:crypto').randomUUID(), role: 'user', source: {kind: 'schedule', check}, content: [{type: 'text', text}]})
  // The last reminder, or else the goal's creation, starts the clock, so restarts and resumes don't reset it.
  const tidied = (agent, g) => Math.max(g.createdAt ?? 0, ...agent.session.snapshotEvents()
    .filter(e => e.type === 'user/message' && e.data.source?.kind === 'schedule' && e.data.source.check === 'housekeeping').map(e => e.time ?? 0))
  // Lab tools whose shipped version, left beside them as `.shipped`, differs.
  const waiting = root => {
    const dir = path.join(root, '.research', 'tools')
    try { return fs.readdirSync(dir).filter(f => f.endsWith('.shipped')).map(f => f.slice(0, -8)).filter(n => { try { return fs.readFileSync(path.join(dir, n), 'utf8') !== fs.readFileSync(path.join(dir, n + '.shipped'), 'utf8') } catch { return false } }) } catch { return [] }
  }
  const housekeep = (agent, root) => {
    const g = armed(agent), interval = every(root)
    if (!g || !interval || Date.now() - tidied(agent, g) < interval) return false
    const tools = waiting(root)
    send(agent, 'housekeeping', `<housekeeping>
It's been about ${span(interval)}: a sanity check. At a good pause, come up for air.
Clear your head and reevaluate: is the lab still chasing the most useful question?
- Tidy finished scratch work and update the task list and lab notes. Keep anything still in use, cited, or waiting to be saved; pe-fleet has cleanup details. Commit loose ends and sync if enabled.
- Use pe-status-report to add useful changes for the operator; link existing evidence.
${tools.length ? `- Lab tools differ from runtime copies: ${tools.join(', ')} (a \`.shipped\` copy beside each). Compare versions before replacing anything; the runtime copy may be older. See pe-fleet.\n` : ''}- Is there an idea we dismissed too quickly? Give one or two to a fresh reader who goes back to the source or proof. Leave room for new work too.
- If it's been a while, try pe-muse or a web round. Follow a promising angle with a researcher.
${supervision.nudge('housekeeping')}
Then go back to the question you choose.
</housekeeping>`)
    return true
  }
  // A supervision fault is reported once and never reaches DSH's own event handling.
  let warned = false
  const safe = fn => (...args) => { try { return fn(...args) } catch (error) { if (!warned) console.warn('PE supervision: ' + error.message); warned = true } }
  const cancel = agent => { clearTimeout(timers.get(agent.id)); timers.delete(agent.id) }
  const schedule = safe(agent => {
    cancel(agent)
    const root = manager(agent)
    if (!root || !armed(agent) || agent.status !== 'idle') return
    if (housekeep(agent, root)) return
    if (!workers(agent).length) return
    const delay = supervision.delay(labText(root), waited.get(agent.id) ?? 0), g0 = armed(agent)
    if (!delay && !every(root)) return
    // Wake for housekeeping too, so a long wait between checks doesn't hold it back.
    const due = every(root) ? tidied(agent, g0) + every(root) - Date.now() : Infinity
    const started = Date.now()
    const timer = globalThis.setTimeout(safe(() => {
      timers.delete(agent.id)
      const g = armed(agent), live = workers(agent), now = Date.now()
      if (!g || agents.get(agent.id) !== agent || agent.status !== 'idle' || agent.inbox.nextTurn.length || !live.length) return
      if (housekeep(agent, root)) return
      if (Date.now() - started < delay) return schedule(agent) // Woke for housekeeping that moved on.
      const limit = slots(), inspection = supervision.inspect({workers:live.map(w=>({id:w.id,since:progress.get(w.id)?.since ?? since.get(w.id)})),slots:limit,now,text:labText(root)})
      const red = inspection.stalled, why = inspection.reason
      if (!why) return schedule(agent) // A full, young fleet: look again later.
      const n = (waited.get(agent.id) ?? 0) + 1
      waited.set(agent.id, n)
      send(agent, 'fleet', `<fleet_check>
Objective: ${JSON.stringify(g.objective)}
The manager has been idle for ${span(delay)} ${why}.
Now: ${Math.max(0, limit - live.length)}/${limit} slots free. Running workers (age):
${live.map(w => `- ${w.id}: ${age(now - since.get(w.id))}; ${progress.get(w.id)?.activity || 'running'} for ${age(now - (progress.get(w.id)?.since ?? since.get(w.id)))}`).join('\n')}
${red.length ? `\nProgress to inspect: ${red.map(w => w.id).join(', ')}. Take a look at each: its scratch, its session, or a message. A message waits for the worker's current command; interrupt_agent then send_message stops that command so it reads you now.\n` : ''}
${supervision.nudge('capacity', n - 1)}
Give available researchers distinct questions worth pursuing. Inspect missing progress without assuming a long command or provider wait is failure. You may investigate, delegate, steer a worker, or wait when that protects useful work. If waiting is appropriate, end this turn; the next check comes after ${span(supervision.delay(labText(root), n))} idle, or sooner once a worker finishes. Fleet checks use no goal rounds.
</fleet_check>`)
    }), Math.max(1000, Math.min(delay || Infinity, due)))
    timer.unref?.()
    timers.set(agent.id, timer)
  })
  // A worker launch or completion, or the operator speaking, resets repeated-check suppression.
  const reset = id => { if (id) waited.delete(id) }
  ctx.on('session/event', safe((session, event) => {
    const root=labOf(ctx.get('workingDirectory')?.get(session) ?? session.header.cwd)
    if(root && event?.type==='user/message' && event.data.source?.check==='operator-answer')
      questions.acknowledge(root,[event.data.source.delivery])
    if(root && event?.type==='tool/result' && session.header.origin==='subagent')
      questions.integrateDrafts(root)
    if (!['assistant/message','assistant/attempt','tool/call','tool/result'].includes(event?.type)) return
    progress.set(session.header.id, {since:Date.now(),activity:event.type==='tool/call'?'command '+(event.data?.name||'running'):event.type})
  }))
  ctx.on('agent/created' , safe(({agent}) => { agents.set(agent.id, agent); reset(agent.session.header.parentSession) }))
  ctx.on('agent/disposed', safe(({agent}) => { if (agents.get(agent.id) === agent) { agents.delete(agent.id); since.delete(agent.id) } cancel(agent); waited.delete(agent.id) }))
  const answering = new Set()
  ctx.on('agent/status', safe(({agent, status}) => {
    const root=manager(agent)
    if (status === 'idle' && root) {
      try { record.refresh(root) } catch (error) { console.warn('PE report: ' + error.message) }
    }
    if (status==='idle' && root && !answering.has(agent.id)) {
      const delivered=agent.session.snapshotEvents().filter(e=>e.type==='user/message'&&e.data.source?.check==='operator-answer').map(e=>e.data.source.delivery)
      answering.add(agent.id)
      try {for(const q of questions.pending(root,delivered)) agent.followup({id:process.getBuiltinModule('node:crypto').randomUUID(),role:'user',source:{kind:'schedule',check:'operator-answer',delivery:q.delivery},content:[{type:'text',text:`Operator answer to ${q.id}: ${q.question}\n${q.answer}`}]})}finally{answering.delete(agent.id)}
    }
    agents.set(agent.id, agent)
    if (status === 'running') { if (!since.has(agent.id)) since.set(agent.id, Date.now()) } else since.delete(agent.id)
    const parent = agents.get(agent.session.header.parentSession)
    if (parent && status === 'idle') { reset(parent.id); schedule(parent) }
    if (status === 'idle') schedule(agent); else cancel(agent)
  }))
  ctx.on('agent/inbox/inserted', safe(({agent, message}) => { if (message.source?.kind === 'user') reset(agent.id) }))
  // A completed goal files a status report for the operator, as in Pi.
  ctx.on('goal/changed', safe(({agent, change}) => {
    if (change?.operation === 'complete' && manager(agent)) send(agent, 'status-report', `<status_report>
The goal is complete. Use pe-status-report to add what the result changes for the operator, with its evidence. Existing coverage needs no duplicate report.
It is filed once committed, and pushed when sync is on.
</status_report>`)
    schedule(agent)
  }))
}
