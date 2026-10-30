// Let DSH keep the request, transcript, retry display, and cancellation handling.
// This runs before its retry executor and applies to managers and standard workers.
ctx.on('agent/request-error', (payload, next) => {
  const cwd = ctx.get('workingDirectory')?.get(payload.agent.session) ?? payload.agent.session.header.cwd
  let root
  for (let d = path.resolve(cwd || '.'); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) { root = d; break }
    if (d === path.dirname(d)) break
  }
  if (root && !/^[ \t]*Retry:[ \t]*off(?:[ \t(]|$)/im.test(fs.readFileSync(path.join(root, '.research', 'LAB.md'), 'utf8'))) {
    payload.retryPolicy = {mode: 'always', initialDelayMs: 30_000, maxDelayMs: 30 * 60_000, jitterRatio: 0.1}
  }
  return next()
}, {prepend: true})
