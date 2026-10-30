// Runs in the host skill provider so standard workers are captured too.
// Import the shipped bytes, never a mutable tool from the research workspace.
const historyBody = lib()['pe-history']?.content.match(/```js history\.mjs\n([\s\S]*?)^```/m)?.[1]
if (historyBody) {
  const history = import('data:text/javascript;base64,' + Buffer.from(historyBody).toString('base64'))
  const queued = new Map()
  const starts = new WeakMap()
  let warned = false
  const version = (() => {
    try { const p = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(process.argv[1])), 'package.json'), 'utf8')); return p.name === '@deepseek-ai/dsh' ? p.version : null }
    catch { return null }
  })()
  const librarySha = process.getBuiltinModule('node:crypto').createHash('sha256').update(JSON.stringify(lib())).digest('hex')
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
          role: session.header.origin === 'subagent' ? 'worker' : 'manager',
          inheritedEvents: session.inheritedEventCount,
          observedFrom: starts.get(session),
          collectorSha256: process.getBuiltinModule('node:crypto').createHash('sha256').update(historyBody).digest('hex'),
          runtime: 'dsh', runtimeVersion: version, skillLibrarySha256: librarySha, node: process.version,
        })
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
