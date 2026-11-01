// Runs in the host skill provider so standard workers are captured too.
// Import the shipped bytes, never a mutable tool from the research workspace.
const historyBody = engineTools['history.mjs']
if (historyBody) {
  // Standalone lab tools use a relative import. The plain-patch path embeds the
  // same trusted module bytes, including in background report workers.
  const activityUrl = 'data:text/javascript;base64,' + Buffer.from(engineTools['activity.mjs']).toString('base64')
  const historyUrl = 'data:text/javascript;base64,' + Buffer.from(historyBody.replaceAll("'./activity.mjs'", JSON.stringify(activityUrl))).toString('base64')
  const history = import(historyUrl)
  const recordUrl = 'data:text/javascript;base64,' + Buffer.from('const module = {exports:{}}; const require = process.getBuiltinModule;\n' + engineTools['record.cjs'] + '\nexport default module.exports;').toString('base64')
  const pushCheckUrl = 'data:text/javascript;base64,' + Buffer.from(engineTools['push-check.mjs']).toString('base64')
  const sync = import('data:text/javascript;base64,' + Buffer.from(engineTools['sync.mjs']
    .replaceAll("'./history.mjs'", JSON.stringify(historyUrl))
    .replaceAll("'./record.cjs'", JSON.stringify(recordUrl))
    .replaceAll("'./push-check.mjs'", JSON.stringify(pushCheckUrl))).toString('base64'))
  // Status is a transcript message at the start of an already scheduled turn.
  // Tool-loop steps and system-prompt assembly never acquire new reminders.
  ctx.on('agent/pre-step', async ({agent, step}, next) => {
    const decision = await next()
    if (step !== 1 || decision.kind !== 'enter' || !decision.messages.length || agent.session.header.origin === 'subagent') return decision
    try {
      const root = contentRuntime.labRoot(ctx.get('workingDirectory')?.get(agent.session) ?? agent.session.header.cwd)
      if (!root) return decision
      const s = await sync
      const delivered = agent.session.snapshotEvents()
        .filter(e => e.type === 'user/message' && e.data.source?.check === 'sharing-status')
        .map(e => e.data.source.delivery)
      const notice = s.pendingSyncNotice(root, delivered)
      if (!notice) return decision
      return {...decision, messages: [...decision.messages, {
        id: process.getBuiltinModule('node:crypto').randomUUID(), role: 'user',
        source: {kind: 'schedule', check: 'sharing-status', delivery: notice.id},
        content: [{type: 'text', text: 'PE sharing status:\n' + notice.text}],
      }]}
    } catch (error) {
      if (!warned) console.warn('PE sharing status: ' + error.message)
      warned = true
      return decision
    }
  })
  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'user/message' || event.data.source?.check !== 'sharing-status') return
    const root = contentRuntime.labRoot(ctx.get('workingDirectory')?.get(session) ?? session.header.cwd)
    if (root) void sync.then(s => s.acknowledgeSyncNotice(root, [event.data.source.delivery])).catch(() => {})
  })
  const queued = new Map()
  const starts = new WeakMap()
  let warned = false
  const version = (() => {
    try { const p = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(process.argv[1])), 'package.json'), 'utf8')); return p.name === '@deepseek-ai/dsh' ? p.version : null }
    catch { return null }
  })()
  const librarySha = process.getBuiltinModule('node:crypto').createHash('sha256').update(JSON.stringify(engineTools)).digest('hex')
  const capture = (session, event) => {
    if (!starts.has(session)) starts.set(session, event?.seq ?? session.snapshotEvents().length)
    if (queued.has(session)) return queued.get(session)
    const pending = Promise.resolve().then(async () => {
      try {
        const h = await history
        const cwd = ctx.get('workingDirectory')?.get(session) ?? session.header.cwd
        const root = cwd && h.labRoot(cwd)
        if (!root || !h.historyEnabled(root)) return
        h.captureSession(root, 'dsh', session.header, session.snapshotEvents(), {
          ...content(root,session).meta,
          role: session.header.origin === 'subagent' ? 'worker' : 'manager',
          inheritedEvents: session.inheritedEventCount,
          observedFrom: starts.get(session),
          collectorSha256: process.getBuiltinModule('node:crypto').createHash('sha256').update(historyBody).digest('hex'),
          runtime: 'dsh', runtimeVersion: version, skillLibrarySha256: librarySha, node: process.version,
        })
        void sync.then(s=>s.scheduleSync(root)).catch(()=>{})
        h.scheduleReport(root).catch(error => {
          if (!warned) console.warn('PE history could not update: ' + error.message)
          warned = true
        })
      } catch (error) {
        // Diagnostics stay with the host; a reporting failure never stops research.
        if (!warned) console.warn('PE history could not update: ' + error.message)
        warned = true
      } finally { queued.delete(session) }
    })
    queued.set(session, pending)
    return pending
  }
  ctx.on('session/event', capture)
  ctx.on('session/created', capture)
  ctx.on('session/flush', capture)
}
