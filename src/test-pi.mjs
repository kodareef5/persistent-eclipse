// Pi test for Persistent Eclipse. It copies only the files Git would push into a
// scratch package, installs that package into an isolated Pi home, and runs real Pi
// against a local model server that records each request. It checks that a lab gets
// the persona and every skill exactly as written in src/, that other directories get
// neither, and that /pe sends pe-kickoff. Worker tests use the same real Pi runtime.
// Usage: node src/test-pi.mjs [path to pi]
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { reportData } from './history.mjs'

const pi = process.argv[2] || 'pi'
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(repo, 'src')
const scratch = mkdtempSync(join(tmpdir(), 'pe-pi-'))
const pkg = join(scratch, 'package'), home = join(scratch, 'home'), lab = join(scratch, 'lab'), notLab = join(scratch, 'notlab')

// The package holds what Git would push: tracked files and new files that are not ignored.
const shipped = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean)
for (const file of shipped) { mkdirSync(dirname(join(pkg, file)), { recursive: true }); cpSync(join(repo, file), join(pkg, file)) }
// Exercise the shipped retry hooks with short waits in this isolated installation.
const retrySource = join(pkg, 'src', 'retry.mjs');
writeFileSync(retrySource, readFileSync(retrySource, 'utf8').replace('initialDelayMs: 30_000', 'initialDelayMs: 100'));
for (const dir of [home, join(lab, '.research'), notLab]) mkdirSync(dir, { recursive: true })
writeFileSync(join(lab, '.research', 'LAB.md'), '# lab\n')
const hooks = join(scratch, 'worker-hooks.jsonl')
mkdirSync(join(home, 'extensions'))
writeFileSync(join(home, 'extensions', 'guard.ts'), `
import { appendFileSync } from 'node:fs';
import { Type } from '@earendil-works/pi-ai';
export default function(pi) {
  pi.registerTool({name: 'fixture_probe', label: 'Fixture helper', description: 'An installed research helper.',
    parameters: Type.Object({}), async execute() { appendFileSync(${JSON.stringify(hooks)}, JSON.stringify({event: 'probe'}) + '\\n'); return {content: [{type: 'text', text: 'Installed helper ran.'}], details: {}}; }});
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => String(url) === 'https://openrouter.ai/api/v1/chat/completions'
    ? (appendFileSync(${JSON.stringify(hooks)}, JSON.stringify({event: 'search', maxTokens: JSON.parse(options.body).max_tokens}) + '\\n'), Promise.resolve(new Response(JSON.stringify({choices: [{message: {content: 'Fixture search answer.',
      annotations: [{url_citation: {title: 'Primary source', url: 'https://example.test/paper'}}]}}]}), {status: 200})))
    : realFetch(url, options);
  const worker = ctx => ctx.getSystemPrompt().match(/# Persistent Eclipse worker (T-\\d+)/)?.[1];
  for (const event of ['session_start', 'session_shutdown']) pi.on(event, (_event, ctx) => {
    const id = worker(ctx);
    if (id) appendFileSync(${JSON.stringify(hooks)}, JSON.stringify({event, id}) + '\\n');
  });
  pi.on('tool_call', (event, ctx) => {
    if (worker(ctx) && event.toolName === 'read' && event.input.path === 'blocked.txt')
      return {block: true, reason: 'Fixture security hook blocked this read.'};
  });
  pi.registerCommand('pe-test-reload', {description: 'Test reload', handler: async (_args, ctx) => { await ctx.reload(); }});
  pi.registerCommand('pe-test-tree', {description: 'Test tree', handler: async (id, ctx) => { await ctx.navigateTree(id, {summarize: false}); }});
  pi.registerCommand('pe-test-fork', {description: 'Test fork', handler: async (id, ctx) => { await ctx.fork(id, {position: 'at'}); }});
}
`)

// A chat completions endpoint that can script real parent/worker conversations.
const requests = []
let answer = async () => 'ok'
const server = createServer((req, res) => {
  let body = ''
  req.on('data', d => { body += d })
  req.on('end', async () => {
    const request = JSON.parse(body || '{}')
    requests.push(request)
    const response = await answer(request)
    if (res.destroyed) return
    if (response.error) {
      res.writeHead(response.status ?? 400, {'content-type': 'application/json'})
      res.end(JSON.stringify({error: {message: response.error}}))
      return
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    const chunk = delta => `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', created: 0, model: 'probe', choices: [{ index: 0, ...delta }] })}\n\n`
    const tools = typeof response === 'string' ? [] : response.tools ?? []
    res.end(chunk({ delta: { role: 'assistant', content: typeof response === 'string' ? response : response.text ?? '',
      ...(tools.length ? { tool_calls: tools.map(([name, args], index) => ({ index, id: `call_${requests.length}_${index}`, type: 'function', function: { name, arguments: JSON.stringify(args) } })) } : {}) } }) +
      chunk({ delta: {}, finish_reason: tools.length ? 'tool_calls' : 'stop' }) +
      (response.usage ? `data: ${JSON.stringify({choices: [], usage: response.usage})}\n\n` : '') + 'data: [DONE]\n\n')
  })
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
writeFileSync(join(home, 'models.json'), JSON.stringify({ providers: { probe: {
  baseUrl: `http://127.0.0.1:${server.address().port}/v1`, api: 'openai-completions', apiKey: 'probe',
  models: [{ id: 'probe', contextWindow: 200000, maxTokens: 4096 },
    {id: 'reasoner', reasoning: true, contextWindow: 200000, maxTokens: 4096}] },
  alternate: {baseUrl: `http://127.0.0.1:${server.address().port}/v1`, api: 'openai-completions', apiKey: 'alternate-fixture',
    models: [{id: 'scout', reasoning: false, contextWindow: 32000, maxTokens: 4096},
      {id: 'reviewer', reasoning: true, contextWindow: 32000, maxTokens: 4096}]},
  unavailable: {baseUrl: `http://127.0.0.1:${server.address().port}/v1`, api: 'openai-completions',
    models: [{id: 'locked', contextWindow: 32000, maxTokens: 4096}]}
} }))
const env = { ...process.env, OPENROUTER_API_KEY: '', PI_CODING_AGENT_DIR: home, PI_OFFLINE: '1', PI_SKIP_VERSION_CHECK: '1', PI_TELEMETRY: '0' }

const run = (args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(pi, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  child.stdout.on('data', d => { out += d }); child.stderr.on('data', d => { out += d })
  const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`pi ${args.join(' ')} timed out:\n${out}`)) }, 60000)
  child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`pi ${args.join(' ')} exited ${code}:\n${out}`)) })
})
// One prompt in print mode. Returns the system prompt and the last user message the model saw.
async function ask(cwd, prompt) {
  const before = requests.length
  await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', prompt], cwd)
  if (requests.length === before) throw new Error(`no model request for ${JSON.stringify(prompt)}`)
  return parse(requests.at(-1))
}
function parse(request) {
  const text = m => typeof m.content === 'string' ? m.content : m.content.map(p => p.text ?? '').join('')
  return { system: text(request.messages.find(m => m.role === 'system' || m.role === 'developer')), user: text(request.messages.findLast(m => m.role === 'user')),
    tools: (request.tools ?? []).map(t => t.function.name) }
}

const peTools = ['pe_subagent', 'pe_send_message', 'pe_list_agents', 'pe_archive_agents', 'pe_interrupt_agent', 'pe_list_models', 'pe_web_search'].sort()
const goalTools = ['create_goal', 'get_goal', 'update_goal']
// The goal a scripted model last read with get_goal, so it can name the exact revision.
const lastGoal = request => {
  const found = request.messages.filter(m => m.role === 'tool').map(m => typeof m.content === 'string' ? m.content : m.content.map(p => p.text ?? '').join(''))
    .filter(text => text.startsWith('{"goal"')).at(-1)
  return JSON.parse(found).goal
}
const notified = (s, text) => s.events.some(e => e.type === 'extension_ui_request' && typeof e.message === 'string' && e.message.includes(text))
const updateGoal = (request, action, extra = {}) => { const g = lastGoal(request); return tool('update_goal', {goal_id: g.id, revision: g.revision, action, ...extra}) }
const workerId = request => parse(request).system.match(/^# Persistent Eclipse worker (T-\d+)/m)?.[1]
const toolResults = request => request.messages.filter(m => m.role === 'tool').map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const tool = (name, args) => ({ tools: [[name, args]] })
async function until(predicate, detail = () => '') {
  for (const deadline = Date.now() + 10000; !predicate(); await new Promise(r => setTimeout(r, 10))) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for Pi.\n${detail()}`)
  }
}

// Real persisted sessions, including commands which settle without a model call.
function goalSession(cwd, sessionFile) {
  const child = spawn(pi, ['--mode', 'rpc', '--provider', 'probe', '--model', 'probe',
    '--session-dir', join(scratch, 'goal-sessions'), ...(sessionFile ? ['--session', sessionFile] : [])],
    {cwd, env, stdio: ['pipe', 'pipe', 'pipe']})
  const events = []
  let pending = '', output = '', sequence = 0
  child.stderr.on('data', d => { output += d })
  child.stdout.on('data', d => {
    output += d; pending += d
    const lines = pending.split('\n'); pending = lines.pop() ?? ''
    for (const line of lines) { try { events.push(JSON.parse(line)) } catch {} }
  })
  const rpc = async command => {
    const id = `goal${sequence++}`
    child.stdin.write(JSON.stringify({...command, id}) + '\n')
    await until(() => events.some(e => e.type === 'response' && e.id === id), () => output.slice(-5000))
    const response = events.find(e => e.type === 'response' && e.id === id)
    if (!response.success) throw new Error(JSON.stringify(response))
    return response.data
  }
  const settled = () => events.filter(e => e.type === 'agent_settled').length
  const waitSettled = count => until(() => settled() > count, () => output.slice(-5000))
  const prompt = async message => { const count = settled(); await rpc({type: 'prompt', message}); await waitSettled(count) }
  const branch = async () => {
    const {entries, leafId} = await rpc({type: 'get_entries'})
    const byId = new Map(entries.map(e => [e.id, e])), chain = []
    for (let entry = byId.get(leafId); entry; entry = byId.get(entry.parentId)) chain.unshift(entry)
    return chain
  }
  const snapshot = async () => (await branch()).findLast(e => e.type === 'custom' && e.customType === 'pe-goal')?.data.goal ?? null
  const close = async () => { child.kill('SIGKILL'); await until(() => child.exitCode !== null || child.signalCode !== null) }
  return {rpc, prompt, settled, waitSettled, branch, snapshot, close, events}
}

// Several prompts in one RPC session, the way a live Pi session runs them. Print mode
// exits before a turn that a command queues, so /pe is tested here. `between`
// runs after each settled prompt. Returns one { system, user } per prompt.
async function session(cwd, prompts, between = () => {}) {
  const child = spawn(pi, ['--mode', 'rpc', '--no-session', '--provider', 'probe', '--model', 'probe'], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
  let out = '', seen = 0
  child.stdout.on('data', d => { out += d }); child.stderr.on('data', d => { out += d })
  const results = []
  try {
    for (const [i, message] of prompts.entries()) {
      const before = requests.length
      child.stdin.write(JSON.stringify({ id: `p${i}`, type: 'prompt', message }) + '\n')
      for (const end = Date.now() + 60000; ; await new Promise(r => setTimeout(r, 100))) {
        if (Date.now() > end) throw new Error(`rpc ${JSON.stringify(message)} did not settle:\n${out}`)
        const settled = out.split('\n').filter(l => l.includes('"type":"agent_settled"')).length
        if (settled > seen) { seen = settled; break }
      }
      if (requests.length === before) throw new Error(`no model request for ${JSON.stringify(message)}`)
      results.push(parse(requests.at(-1)))
      await between(i)
    }
  } finally { child.kill('SIGKILL') }
  return results
}

// What the source says each skill and the persona should be.
const body = text => text.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
// build.py fills pe-cvss with the calculator, pe-lint with the linter, and each hash, so
// do the same here.
const code = readFileSync(join(src, 'cvss.mjs'), 'utf8').trimEnd() + '\n'
const lint = readFileSync(join(src, 'lint-notes.mjs'), 'utf8').trimEnd() + '\n'
const packer = readFileSync(join(src, 'pack.mjs'), 'utf8').trimEnd() + '\n'
const history = readFileSync(join(src, 'history.mjs'), 'utf8').trimEnd() + '\n'
const research = readFileSync(join(src, 'research.md'), 'utf8').trim()
const missionText = Object.fromEntries(['red-team', 'blue-team', 'math-team'].map(mode => [mode, readFileSync(join(src, 'missions', mode + '.md'), 'utf8').trimEnd() + '\n']))
const expand = text => Object.entries(missionText).reduce((t, [mode, m]) => t.replace(`{{mission:${mode}}}`, m), text)
  .replace('{{pe_research}}', research)
  .replace('{{cvss.mjs}}', code).replace('{{cvss.sha256}}', createHash('sha256').update(code).digest('hex'))
  .replace('{{lint.mjs}}', lint).replace('{{lint.sha256}}', createHash('sha256').update(lint).digest('hex'))
  .replace('{{pack.mjs}}', packer).replace('{{pack.sha256}}', createHash('sha256').update(packer).digest('hex'))
  .replace('{{history.mjs}}', () => history).replace('{{history.sha256}}', createHash('sha256').update(history).digest('hex'))
// A skill's {{table:<file>}} slots take src/skills/<name>/<file>.md, trimmed.
const tables = (name, text) => text.replace(/\{\{table:([a-z0-9][a-z0-9.-]*)\}\}/g, (_, t) => readFileSync(join(src, 'skills', name, t + '.md'), 'utf8').trim())
const want = Object.fromEntries(readdirSync(join(src, 'skills')).filter(f => f.endsWith('.md')).map(f => {
  const text = expand(tables(f.slice(0, -3), readFileSync(join(src, 'skills', f), 'utf8')))
  return [text.match(/^name: (.*)$/m)[1], { description: text.match(/^description: (.*)$/m)[1], body: body(text) }]
}))
const personaTemplate = expand(readFileSync(join(src, 'persona.md'), 'utf8').trim())
const missions = Object.fromEntries(['red-team', 'blue-team', 'math-team'].map(mode => [mode, readFileSync(join(src, 'missions', mode + '.md'), 'utf8')]))
const withMission = mission => personaTemplate.replace('{{pe_mission}}', () => mission)
const persona = withMission(missions['blue-team'])
const listed = system => [...system.matchAll(/<skill>\s*<name>(.*?)<\/name>\s*<description>([\s\S]*?)<\/description>\s*<location>(.*?)<\/location>/g)]
  .map(([, name, description, location]) => ({ name, description, location }))
const xml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

const ok = label => console.log('ok  ', label)
const check = (cond, label, detail) => { if (!cond) throw new Error(`${label}${detail ? `\n${detail}` : ''}`); ok(label) }

let failed
try {
  await run(['install', pkg], scratch)
  check(JSON.parse(readFileSync(join(home, 'settings.json'), 'utf8')).packages?.length === 1, 'pi install accepts the pushed files as a package')

  {
    let manager = 0, worker = 0;
    const priorProbes = existsSync(hooks) ? readFileSync(hooks, 'utf8').split('\n').filter(x => x.includes('"event":"probe"')).length : 0;
    const retried = [];
    answer = async request => {
      retried.push(request);
      if (workerId(request)) {
        switch (worker++) {
          case 0: return tool('fixture_probe', {});
          case 1: return {status: 402, error: 'Insufficient credits'};
          case 2: return {error: 'Upstream implementation broke'};
          default: return 'Worker continued its original task.';
        }
      }
      if (manager++ === 0) return tool('pe_subagent', {taskId: 'T-880', task: 'Use fixture_probe once, then finish.'});
      if (manager === 2) return {status: 401, error: 'Provider temporarily rejected credentials'};
      return 'Manager continued its original task.';
    };
    await ask(lab, 'Keep working through provider failures.');
    const probes = readFileSync(hooks, 'utf8').split('\n').filter(x => x.includes('"event":"probe"')).length - priorProbes;
    check(worker === 4 && manager >= 3 && probes === 1 && existsSync(join(lab, '.research/scratch/T-880/.done')),
      'retry: manager and worker recover from credits, auth, and arbitrary provider errors without replaying a tool');
    check(retried.filter(workerId).slice(2).every(r => toolResults(r).includes('Installed helper ran.')),
      'retry: worker keeps its successful tool results and original conversation');
    check(retried.filter(r => !workerId(r)).some(r => { const text = JSON.stringify(r.messages); return text.includes('PE worker T-880 is waiting on its provider') && text.includes('Insufficient credits'); }),
      'retry: the manager hears once, with the provider error, when a worker starts waiting');

    const s = goalSession(lab);
    try {
      answer = async () => ({status: 402, error: 'Still out of credit'});
      await s.rpc({type: 'prompt', message: 'Wait for funding.'});
      await until(() => s.events.some(e => e.type === 'entry_appended' && e.entry?.customType === 'pe-retry'));
      const settled = s.settled();
      await s.rpc({type: 'abort'}); await s.waitSettled(settled);
      const calls = requests.length;
      await new Promise(r => setTimeout(r, 350));
      check(requests.length === calls, 'retry: cancelling during backoff settles promptly and never wakes the session again');
    } finally { await s.close(); }
    answer = async () => 'ok';
  }

  const inside = await ask(lab, 'hello')
  check(inside.system.includes(persona), 'lab: the persona is in the system prompt')
  check(inside.system.includes('## In Pi'), 'lab: the Pi note is in the system prompt')
  check(JSON.stringify(inside.tools.filter(t => t.startsWith('pe_')).sort()) === JSON.stringify(peTools), 'lab: PE worker tools, model discovery, and web search are active')
  check(goalTools.every(t => inside.tools.includes(t)) && inside.system.includes('Mark blocked only after the same blocking condition persists for at least 3'),
    'lab: the DSH goal tools and goal policy are present')
  const skills = listed(inside.system).filter(s => s.name.startsWith('pe-'))
  check(JSON.stringify(skills.map(s => s.name).sort()) === JSON.stringify(Object.keys(want).sort()),
    `lab: all ${Object.keys(want).length} skills are listed`, JSON.stringify(skills.map(s => s.name)))
  for (const s of skills) {
    const file = readFileSync(s.location, 'utf8')
    if (xml(s.description) !== want[s.name].description) throw new Error(`${s.name}: description differs`)
    if (body(file) !== want[s.name].body) throw new Error(`${s.name}: body differs from src/skills`)
    if (!/^---\nname: [a-z-]+\ndescription: "/.test(file)) throw new Error(`${s.name}: frontmatter is not quoted`)
  }
  ok('lab: every skill file matches src/skills')

  check(!existsSync(join(lab, '.research/local/sessions')), 'history: --no-session does not retain the manager conversation')
  {
    const historyLab = join(scratch, 'history-lab')
    mkdirSync(join(historyLab, '.research'), {recursive: true})
    writeFileSync(join(historyLab, '.research/LAB.md'), '# lab\n')
    await run(['-p', '--provider', 'probe', '--model', 'probe', 'Keep a session receipt.'], historyLab)
    const data = reportData(historyLab)
    check(data.usage.sessions.length === 1 && data.usage.calls === 1 && existsSync(join(historyLab, '.research/local/ACTIVITY.md')) &&
      !existsSync(join(historyLab, '.research/local/sessions')) && existsSync(join(historyLab, '.research/local/index')),
      'history: Pi indexes its native manager transcript and finishes its background shutdown report without a duplicate copy')
    check(data.usage.unmetered === 1, 'history: a provider without usage is shown as unmetered')
    check(data.collective.labs.some(row => row.local && row.calls === 1) && existsSync(join(historyLab, '.research/activity')),
      'history: new manager work has a stable origin and shareable usage receipts')
    writeFileSync(join(historyLab, '.research/LAB.md'), '# lab\nHistory: off\n')
    await run(['-p', '--provider', 'probe', '--model', 'probe', 'Leave this session out.'], historyLab)
    check(reportData(historyLab).usage.sessions.length === 1, 'history: History off stops automatic capture')
  }

  // The lab tools must land as the bytes the skill tells the agent to hash. Pi copies
  // them out of the same skill text DSH does, so this is the second runtime of one rule.
  const placedTool = (name, src) => {
    const file = join(lab, '.research', 'tools', name)
    return readFileSync(file, 'utf8') === readFileSync(join(repo, 'src', src), 'utf8')
  }
  check(placedTool('lint-notes.mjs', 'lint-notes.mjs') && placedTool('cvss.mjs', 'cvss.mjs') && placedTool('pack.mjs', 'pack.mjs') && placedTool('history.mjs', 'history.mjs') && !existsSync(join(notLab, '.research', 'tools')),
    'lab: the linter, calculator, and packer are placed in the lab, and nowhere else')

  // With no OpenRouter key, search fails with a request to the operator, not silence.
  let searched = false
  answer = async () => searched ? 'ok' : (searched = true, tool('pe_web_search', {query: 'probe'}))
  const search = await ask(lab, 'search the web')
  answer = async () => 'ok'
  check(toolResults(requests.at(-1)).includes('No OpenRouter key. Ask the operator') && search.system.includes('pe-web'),
    'lab: web search without a key asks the operator for one')

  // The manager's search path saves a receipt in its own lab; worker receipts stay in scratch.
  {
    const searchLab = join(scratch, 'manager-search')
    mkdirSync(join(searchLab, '.research'), {recursive: true})
    writeFileSync(join(searchLab, '.research', 'LAB.md'), '# Search lab\n')
    writeFileSync(join(searchLab, '.research', 'MISSION.md'), missions['math-team'])
    const query = 'Exponential Time Hypothesis (ETH): primary papers on SAT lower bounds'
    let searched = false
    answer = async () => searched ? 'Search complete.' : (searched = true, tool('pe_web_search', {query}))
    env.OPENROUTER_API_KEY = 'fixture-manager-search-key'
    try {
      const manager = await ask(searchLab, 'Search for prior work on the Exponential Time Hypothesis.')
      const intel = join(searchLab, '.research', 'intel')
      const receipts = readdirSync(intel).filter(name => /^search-.*\.json$/.test(name))
      const receipt = JSON.parse(readFileSync(join(intel, receipts[0]), 'utf8'))
      check(manager.system.includes('Start web discovery with `pe_web_search`, for the manager') &&
        toolResults(requests.at(-1)).includes('Fixture search answer.') && receipts.length === 1 &&
        receipt.query === query && receipt.sources[0].url === 'https://example.test/paper' &&
        !JSON.stringify(receipt).includes('fixture-manager-search-key'),
        'manager: discovery guidance names its search tool, which returns sources and keeps a credential-free intel receipt')
    } finally {
      env.OPENROUTER_API_KEY = ''
      answer = async () => 'ok'
    }
  }

  const reader = await ask(lab, '/skill:pe-reader trace the login path')
  check(reader.user.includes('<skill name="pe-reader"') && reader.user.includes(want['pe-reader'].body), 'lab: /skill:pe-reader expands the skill')

  const outside = await ask(notLab, 'hello')
  check(!outside.system.includes('# Persistent Eclipse') && !listed(outside.system).some(s => s.name.startsWith('pe-') || s.name === 'persistent-eclipse'),
    'outside a lab: no persona and no skills')
  check(!outside.tools.some(t => t.startsWith('pe_') || goalTools.includes(t)) && !outside.tools.includes('subagent'), 'outside a lab: no PE worker or goal tools')

  // /pe in a plain directory, then the lab appears, as kickoff would make it.
  const [kickoff, next] = await session(notLab, ['/pe add github.com/example/app', 'continue'],
    () => { mkdirSync(join(notLab, '.research'), { recursive: true }); writeFileSync(join(notLab, '.research', 'LAB.md'), '# lab\n') })
  check(kickoff.user.includes('<skill name="pe-kickoff"') && kickoff.user.includes(want['pe-kickoff'].body) && kickoff.user.endsWith('add github.com/example/app'),
    '/pe sends pe-kickoff with the request')
  check(kickoff.system.includes(persona) && JSON.stringify(listed(kickoff.system).filter(s => s.name.startsWith('pe-')).map(s => s.name)) === '["pe-kickoff"]',
    '/pe turns on the persona and only pe-kickoff before the lab exists')
  check(!kickoff.tools.some(t => t.startsWith('pe_')), '/pe: no workers before the lab exists')
  check(next.system.includes(persona) && listed(next.system).filter(s => s.name.startsWith('pe-')).length === Object.keys(want).length,
    'a lab made mid-session lists every skill on the next prompt')
  check(next.tools.filter(t => t.startsWith('pe_')).length === peTools.length, 'a lab made mid-session activates PE worker and search tools')

  // A lab follows Blue Team until it records its own mission, and the mission it
  // records wins in every later session and working directory. /pe never rewrites it:
  // a request for Red or Math reaches the manager as words, and kickoff amends the file.
  {
    const dir = join(scratch, 'red-request')
    mkdirSync(dir)
    const [requested, continued] = await session(dir, ['/pe red-team examine this source', 'continue'], i => {
      if (i === 0) {
        mkdirSync(join(dir, '.research'))
        writeFileSync(join(dir, '.research', 'LAB.md'), '# lab\n')
        writeFileSync(join(dir, '.research', 'MISSION.md'), missions['red-team'])
      }
    })
    check(requested.system.includes(persona) && requested.user.endsWith('red-team examine this source') && requested.user.includes(want['pe-kickoff'].body),
      'mission: before setup, /pe passes the request to kickoff under the default Blue Team mission')
    check(continued.system.includes(withMission(missions['red-team'])) && (await ask(dir, 'resume')).system.includes(withMission(missions['red-team'])),
      'mission: the mission kickoff records survives continuation and restart')
    const nested = join(dir, 'sources', 'example')
    mkdirSync(nested, {recursive: true})
    check((await ask(nested, 'resume here')).system.includes(withMission(missions['red-team'])), 'mission: a nested working directory inherits the lab mission')
  }

  // Operator additions, including replacement metacharacters and a distant final
  // instruction, must reach the manager and a fresh reporter intact.
  for (const [n, mode] of ['red-team', 'blue-team', 'math-team'].entries()) {
    const file = join(lab, '.research', 'MISSION.md')
    const complete = missions[mode] + '\n## Operator additions\n' + 'Keep this exact condition, including $& and {{literal}}.\n'.repeat(250) + 'FINAL_MISSION_REQUIREMENT\n'
    writeFileSync(file, complete)
    const [preserved] = await session(lab, ['/pe continue this objective'])
    check(preserved.system.includes(withMission(complete)) && readFileSync(file, 'utf8') === complete && preserved.user === 'continue this objective',
      `${mode}: /pe in a lab works it with the customized mission, without kickoff or a rewrite`)
    let stage = 0
    const reporterRequests = [], managerRequests = []
    answer = async request => {
      if (workerId(request)) { reporterRequests.push(request); return 'Reporter draft for the inherited mission.' }
      managerRequests.push(request)
      return stage++ === 0 ? tool('pe_subagent', {taskId: `T-${90 + n}`, task: 'Prepare the mission deliverable.', skill: 'pe-reporter'}) : 'Draft received.'
    }
    await ask(lab, 'Delegate the report. PRIVATE_PARENT_HISTORY')
    check(managerRequests.every(r => parse(r).system.includes(withMission(complete))), `${mode}: the manager inherits every operator addition verbatim`)
    check(reporterRequests.length > 0 && reporterRequests.every(r => parse(r).system.includes(complete) && parse(r).system.includes(want['pe-reporter'].body) &&
      !JSON.stringify(r.messages).includes('PRIVATE_PARENT_HISTORY')), `${mode}: a fresh reporter receives the entire mission and its reporting skill`,
      reporterRequests.length ? undefined : JSON.stringify(managerRequests.at(-1)?.messages.slice(-2)))
    const guide = mode === 'math-team' ? 'pe-math' : mode === 'blue-team' ? 'pe-patch' : undefined
    if (guide) check(reporterRequests.every(r => parse(r).system.includes(want[guide].body)), `${mode}: reporter inherits the mission's artifact guidance`)
    answer = async () => 'ok'
  }
  rmSync(join(lab, '.research', 'MISSION.md')) // The remaining tests also cover labs with no recorded mission.
  check(reportData(lab).usage.sessions.filter(s => s.role === 'worker').length >= 3,
    'history: real worker conversations are indexed for reporting and later collection')

  writeFileSync(join(lab, '.research', 'SCOPE.md'), '# Scope\nLocal fixture only.\n')
  writeFileSync(join(lab, 'source.txt'), 'fixture evidence\n')
  const scratchFile = (id, name) => join(lab, '.research', 'scratch', id, name)

  // Exercise model choice through real tools, worker requests, and saved usage.
  {
    const modelLab = join(scratch, 'model-lab')
    const before = requests.length
    const settingsFile = join(home, 'settings.json')
    writeFileSync(settingsFile, JSON.stringify({...JSON.parse(readFileSync(settingsFile, 'utf8')),
      modelThinkingLevels: {'alternate/reviewer': 'medium'}}))
    mkdirSync(join(modelLab, '.research'), {recursive: true})
    writeFileSync(join(modelLab, '.research/LAB.md'), '# Models\n')
    const workerRequests = []
    let step = 0
    answer = async request => {
      if (workerId(request)) {
        workerRequests.push(request)
        return {text: 'Checked the fixture.', usage: {prompt_tokens: 20, completion_tokens: 5, total_tokens: 25}}
      }
      const last = request.messages.filter(m => m.role === 'tool').at(-1)?.content ?? ''
      switch (step++) {
        case 0: return tool('pe_list_models', {})
        case 1: {
          const choices = JSON.parse(last)
          check(choices.current.model === 'reasoner' && choices.current.effort === 'high' &&
            choices.providers.some(p => p.provider === 'alternate') && !choices.providers.some(p => p.provider === 'unavailable'),
            'models: discovery starts with configured providers and the current model/effort')
          return tool('pe_list_models', {provider: 'alternate'})
        }
        case 2: {
          const choices = JSON.parse(last)
          check(choices.models.length === 2 && choices.models.find(m => m.model === 'scout')?.efforts.join() === 'off' && choices.nextOffset === null,
            'models: provider discovery gives exact IDs and supported efforts')
          return tool('pe_list_models', {provider: 'unavailable', model: 'locked'})
        }
        case 3:
          check(JSON.parse(last).model.configuredAccess === false, 'models: an exact lookup can explain missing configured access')
          return tool('pe_subagent', {taskId: 'T-1', task: 'No partial model choice.', model: 'scout'})
        case 4:
          check(last.includes('Supply provider and model together'), 'models: incomplete choices fail before launch')
          return tool('pe_subagent', {taskId: 'T-1', task: 'No made-up model.', provider: 'alternate', model: 'missing'})
        case 5:
          check(last.includes('Unknown model'), 'models: unknown choices are not silently replaced')
          return tool('pe_subagent', {taskId: 'T-1', task: 'No unsupported effort.', provider: 'alternate', model: 'scout', reasoning_effort: 'high'})
        case 6:
          check(last.includes('Unsupported effort') && last.includes('off'), 'models: unsupported effort returns the actual alternatives')
          return tool('pe_subagent', {taskId: 'T-1', task: 'No missing credentials.', provider: 'unavailable', model: 'locked'})
        case 7:
          check(last.includes('No configured access') && !existsSync(join(modelLab, '.research/scratch/T-1')),
            'models: unavailable choices consume neither a worker slot nor a task folder')
          return {tools: [
            ['pe_subagent', {taskId: 'T-1', task: 'Inherit my model and effort.'}],
            ['pe_subagent', {taskId: 'T-2', task: 'Try a different provider and its default effort.', provider: 'alternate', model: 'scout'}],
            ['pe_subagent', {taskId: 'T-3', task: 'Use my model with less effort.', reasoning_effort: 'low'}],
            ['pe_subagent', {taskId: 'T-4', task: 'Use the selected model’s configured effort.', provider: 'alternate', model: 'reviewer'}]
          ]}
        case 8: return tool('pe_list_agents', {})
        case 9:
          check(last.includes('T-2  pe-git-research  alternate/scout') && last.includes('probe/reasoner'),
            'models: fleet status names worker models and efforts')
          return 'Results received.'
        default: return 'Results received.'
      }
    }
    await run(['-p', '--no-session', '--provider', 'probe', '--model', 'reasoner', '--thinking', 'high', 'Try these worker choices. PRIVATE_REVIEW_CONTEXT'], modelLab)
    check(workerRequests.length === 4 && workerRequests.find(r => workerId(r) === 'T-1')?.model === 'reasoner' &&
      workerRequests.find(r => workerId(r) === 'T-1')?.reasoning_effort === 'high' &&
      workerRequests.find(r => workerId(r) === 'T-2')?.model === 'scout' &&
      workerRequests.find(r => workerId(r) === 'T-3')?.reasoning_effort === 'low' &&
      requests.slice(before).filter(r => !workerId(r)).every(r => r.model === 'reasoner' && r.reasoning_effort === 'high'),
      'models: workers inherit, switch provider/model, or vary effort without changing the parent')
    check(workerRequests.find(r => workerId(r) === 'T-4')?.reasoning_effort === 'medium',
      'models: a changed model uses its own configured effort instead of inheriting the parent effort')
    check(workerRequests.every(r => !JSON.stringify(r.messages).includes('PRIVATE_REVIEW_CONTEXT')),
      'models: mixed workers get fresh briefs without the parent conversation')
    const data = reportData(modelLab)
    check(data.usage.rows.some(r => r.provider === 'alternate' && r.model === 'scout' && r.effort === 'off' && r.sums.total === 25) &&
      data.usage.rows.some(r => r.model === 'reasoner' && r.effort === 'high' && r.sums.total === 25) &&
      data.usage.rows.some(r => r.model === 'reasoner' && r.effort === 'low' && r.sums.total === 25) &&
      data.usage.rows.some(r => r.model === 'reviewer' && r.effort === 'medium' && r.sums.total === 25),
      'models: history accounts for the actual model and effort of each worker')
    answer = async () => 'ok'
  }

  // Goals follow DSH: durable phases on the branch, process-local arming, rounds that
  // continue the same session, operator-only creation and resumption, and a blocked
  // report the model can make only after three consecutive rounds. Exercised against
  // real Pi sessions and their disk log rather than mocked events.
  {
    const clients = [], held = []
    const open = file => { const s = goalSession(lab, file); clients.push(s); return s }
    let s = open(), stage = 0
    const rounds = entries => entries.filter(e => e.type === 'custom_message' && e.customType === 'pe-goal-round')
    const results = request => toolResults(request)
    try {
      let before = requests.length
      await s.rpc({type: 'prompt', message: '/goal'})
      check(requests.length === before && notified(s, 'PE: no goal.'), 'goals: status is a command with no model call')

      // /goal starts round 1 at once; rounds continue until the model completes it. A
      // round is not the operator, so it cannot create a goal of its own.
      answer = async request => {
        switch (stage++) {
          case 0: return 'One pass complete; more remains.'
          case 1: return tool('create_goal', {objective: 'A goal round inventing its own goal.'})
          case 2: check(results(request).includes('requires a direct request from the operator'), 'goals: a goal round cannot create a goal'); return tool('get_goal', {})
          case 3: return updateGoal(request, 'complete')
          default: return 'Goal achieved.'
        }
      }
      await s.prompt('/goal Read the fixture and document every required fact.')
      let state = await s.snapshot(), entries = await s.branch()
      check(state.phase === 'complete' && state.roundsStarted === 2 && state.maxGoalRounds === 256 && rounds(entries).length === 2 &&
        rounds(entries).every(r => r.display === false) && rounds(entries)[0].content.includes('<goal_round>') && rounds(entries)[0].content.includes('Round: 1/256'),
        'goals: /goal continues the same session in hidden rounds until the model marks it complete')

      // The model creates a goal from a direct operator request; the cap blocks it.
      stage = 0
      answer = async request => stage++ === 0 ? tool('create_goal', {objective: 'Examine every fixture regime.', max_goal_rounds: 3})
        : stage === 2 ? 'I will keep working on this.' : 'The objective still has open work.'
      before = requests.length
      await s.prompt('Keep going on this until every fixture regime is examined.')
      state = await s.snapshot()
      check(requests.length === before + 5 && state.phase === 'blocked' && state.roundsStarted === 3 && state.blockedReason.code === 'round-limit',
        'goals: create_goal from an operator request runs rounds up to its cap, then blocks with round-limit')
      before = requests.length
      await s.rpc({type: 'prompt', message: '/goal resume'})
      check(requests.length === before && (await s.snapshot()).phase === 'blocked' && notified(s, 'used all 3 rounds'),
        'goals: resume refuses a goal with no rounds left')
      await s.rpc({type: 'prompt', message: '/goal clear'})

      // A model may report blocked only after three consecutive rounds without the operator.
      stage = 0
      answer = async request => {
        switch (stage++) {
          case 0: return tool('get_goal', {})
          case 1: return updateGoal(request, 'blocked', {blocked_reason: 'Need the missing fixture data.'})
          case 2: check(results(request).includes('rejected before 3 consecutive goal rounds'), 'goals: blocked is rejected in the first round'); return 'Continuing.'
          case 3: return 'Still missing the fixture data.'
          case 4: return tool('get_goal', {})
          case 5: return updateGoal(request, 'blocked', {blocked_reason: 'Need the missing fixture data.'})
          default: return 'Blocked on the missing input.'
        }
      }
      await s.prompt('/goal Establish the missing fixture fact.')
      state = await s.snapshot()
      check(state.phase === 'blocked' && state.roundsStarted === 3 && state.blockedReason.code === 'model-reported' && state.blockedReason.message.includes('missing fixture data'),
        'goals: a blocker that persists three rounds is recorded and stops continuation')
      before = requests.length
      await s.rpc({type: 'prompt', message: '/goal Replace the unfinished objective.'})
      check(requests.length === before && (await s.snapshot()).objective === state.objective, 'goals: a new objective cannot silently replace unfinished work')
      answer = async () => 'Manual inspection only.'
      before = requests.length
      await s.prompt('Inspect the blocked goal.')
      check(requests.length === before + 1 && (await s.snapshot()).phase === 'blocked', 'goals: ordinary input does not rearm a blocked goal')
      stage = 0
      answer = async request => stage++ === 0 ? tool('get_goal', {}) : stage === 2 ? updateGoal(request, 'complete') : 'Done.'
      await s.prompt('/goal resume')
      state = await s.snapshot()
      check(state.phase === 'complete' && !state.blockedReason, 'goals: an explicit resume rearms blocked work and clears its blocker')

      // A host pause aborts the round under way; the model cannot resume a paused goal.
      const ready = deferred(), release = deferred(); held.push(release)
      answer = async () => { ready.resolve(); await release.promise; return 'Current turn finished.' }
      before = requests.length
      let count = s.settled()
      await s.rpc({type: 'prompt', message: '/goal Keep reading the fixture.'})
      await ready.promise
      await s.rpc({type: 'prompt', message: '/goal pause'})
      await s.waitSettled(count); release.resolve()
      check(requests.length === before + 1 && (await s.snapshot()).phase === 'paused', 'goals: pause stops the round under way and any follow-up')
      stage = 0
      answer = async request => { switch (stage++) {
        case 0: return tool('get_goal', {})
        case 1: return updateGoal(request, 'resume')
        case 2: return 'Resumed.'
        case 3: return updateGoal(request, 'complete')
        default: return 'Done.'
      } }
      await s.prompt('Resume the goal.')
      check((await s.snapshot()).phase === 'complete' && stage >= 4,
        'goals: asked directly, the model resumes a paused goal and its rounds go on')
      await s.rpc({type: 'prompt', message: '/goal clear'})

      const clearReady = deferred(), clearRelease = deferred(); held.push(clearRelease)
      answer = async () => { clearReady.resolve(); await clearRelease.promise; return 'The cleared turn finished.' }
      count = s.settled(); before = requests.length
      await s.rpc({type: 'prompt', message: '/goal Clear me while I work.'})
      await clearReady.promise; await s.rpc({type: 'prompt', message: '/goal clear'})
      clearRelease.resolve(); await s.waitSettled(count)
      check(requests.length === before + 1 && (await s.snapshot()) === null, 'goals: clear writes a tombstone and prevents an in-flight round from continuing')

      let recovery = 0;
      answer = async request => {
        if (recovery++ < 2) return {status: 402, error: 'Waiting for credit'};
        if (recovery === 3) return tool('get_goal', {});
        if (recovery === 4) return updateGoal(request, 'complete');
        return 'Recovered goal finished.';
      };
      await s.prompt('/goal Finish after funding returns.');
      state = await s.snapshot();
      check(state.phase === 'complete' && state.roundsStarted === 1,
        'retry: provider failures preserve an armed goal without spending extra goal rounds');
      await s.rpc({type: 'prompt', message: '/goal clear'});

      answer = async () => ({error: 'Fixture model failure.'})
      writeFileSync(join(lab, '.research', 'LAB.md'), '# lab\nRetry: off (operator)\n')
      before = requests.length
      await s.prompt('/goal Investigate a provider failure.')
      state = await s.snapshot()
      check(requests.length === before + 1 && state.phase === 'active' && parse(requests.at(-1)).system !== undefined &&
        notified(s, 'active, disarmed'), 'goals: a model error disarms the goal instead of retrying rounds')
      await s.rpc({type: 'prompt', message: '/goal clear'})
      writeFileSync(join(lab, '.research', 'LAB.md'), '# lab\n')

      const abortReady = deferred(), abortRelease = deferred(); held.push(abortRelease)
      answer = async () => { abortReady.resolve(); await abortRelease.promise; return 'Cancelled response.' }
      count = s.settled(); before = requests.length
      await s.rpc({type: 'prompt', message: '/goal Test cancellation.'})
      await abortReady.promise; await s.rpc({type: 'abort'}); await s.waitSettled(count); abortRelease.resolve()
      check(requests.length === before + 1 && (await s.snapshot()).phase === 'paused', 'goals: aborting a round pauses the goal')
      await s.rpc({type: 'prompt', message: '/goal clear'})

      // Operator input queued during a round gets the next request and spends no round.
      const inputReady = deferred(), inputRelease = deferred(); held.push(inputRelease)
      stage = 0
      answer = async request => {
        switch (stage++) {
          case 0: inputReady.resolve(); await inputRelease.promise; return 'Initial pass.'
          case 1: check(JSON.stringify(request.messages).includes('USER_GOAL_STEERING'), 'goals: queued operator input gets the next request'); return tool('get_goal', {})
          case 2: return updateGoal(request, 'complete')
          default: return 'Done.'
        }
      }
      count = s.settled()
      await s.rpc({type: 'prompt', message: '/goal Follow the clarified fixture request.'})
      await inputReady.promise
      await s.rpc({type: 'follow_up', message: 'USER_GOAL_STEERING: use the supplied fixture facts.'})
      inputRelease.resolve(); await s.waitSettled(count)
      await until(() => s.events.filter(e => e.type === 'agent_settled').length > count && stage >= 4)
      check((await s.snapshot()).roundsStarted === 1, 'goals: queued input consumes no automatic round')
      await s.rpc({type: 'prompt', message: '/goal clear'})

      const restartReady = deferred(), restartRelease = deferred(); held.push(restartRelease)
      answer = async () => { restartReady.resolve(); await restartRelease.promise; return 'Interrupted by process exit.' }
      await s.rpc({type: 'prompt', message: '/goal PRESERVED_OBJECTIVE with exact requirements.'})
      await restartReady.promise
      const sessionFile = (await s.rpc({type: 'get_state'})).sessionFile
      check(existsSync(sessionFile) && readFileSync(sessionFile, 'utf8').includes('PRESERVED_OBJECTIVE'), 'goals: the objective is in Pi\'s real session file')
      await s.close(); restartRelease.resolve()
      answer = async () => 'Manual inspection only.'
      s = open(sessionFile); before = requests.length
      await s.prompt('Inspect restored work without starting it.')
      check(requests.length === before + 1 && (await s.snapshot()).phase === 'active' &&
        parse(requests.at(-1)).system.includes('PRESERVED_OBJECTIVE') && parse(requests.at(-1)).system.includes('active, disarmed'),
        'goals: reopening preserves the active objective but never rearms it')
      await s.rpc({type: 'prompt', message: '/pe-test-reload'})
      before = requests.length; await s.prompt('Inspect reloaded work.')
      check(requests.length === before + 1 && (await s.snapshot()).objective.includes('PRESERVED_OBJECTIVE'), 'goals: extension reload preserves the objective without rearming it')

      const activeEntry = (await s.branch()).findLast(e => e.type === 'custom' && e.customType === 'pe-goal')
      // Asked in plain words, the model rearms the restored goal and the rounds go on.
      stage = 0
      answer = async request => {
        switch (stage++) {
          case 0: return tool('get_goal', {})
          case 1: return updateGoal(request, 'resume')
          case 2: return 'Resumed.'
          case 3: return tool('get_goal', {})
          case 4: return updateGoal(request, 'complete')
          default: return 'Done.'
        }
      }
      await s.prompt('Please continue where you left off.')
      check((await s.snapshot()).phase === 'complete', 'goals: an operator request to continue lets the model rearm a restored goal')
      await s.rpc({type: 'prompt', message: '/goal clear'})
      const clearedEntry = (await s.branch()).at(-1)
      answer = async () => 'Manual inspection only.'
      await s.rpc({type: 'prompt', message: `/pe-test-tree ${activeEntry.id}`})
      before = requests.length; await s.prompt('Inspect this earlier branch.')
      check(requests.length === before + 1 && (await s.snapshot()).objective.includes('PRESERVED_OBJECTIVE'), 'goals: tree navigation restores branch state without inheriting a later clear')
      await s.rpc({type: 'prompt', message: `/pe-test-fork ${activeEntry.id}`})
      before = requests.length; await s.prompt('Inspect the fork.')
      check(requests.length === before + 1 && (await s.snapshot()).objective.includes('PRESERVED_OBJECTIVE'), 'goals: a fork inherits the objective with continuation disarmed')
      await s.rpc({type: 'switch_session', sessionPath: sessionFile})
      await s.rpc({type: 'prompt', message: `/pe-test-tree ${clearedEntry.id}`})
      check((await s.snapshot()) === null, 'goals: navigating back restores the clear rather than an abandoned goal')

      // Record work on the selected branch before reopening it: Pi persists the
      // branch through new entries, not a tree cursor which has no new messages.
      await s.prompt('Keep this cleared branch.')
      const clearedFile = (await s.rpc({type: 'get_state'})).sessionFile
      await s.close(); s = open(clearedFile)
      before = requests.length; await s.prompt('Inspect the cleared session.')
      state = await s.snapshot()
      check(requests.length === before + 1 && state === null && parse(requests.at(-1)).system.includes('PE: no goal.'),
        'goals: a clear survives restart', JSON.stringify({requests: requests.length - before, state}))
    } finally {
      for (const release of held) release.resolve()
      for (const client of clients) await client.close()
      answer = async () => 'ok'
    }
  }

  // A goal round that makes the lab is followed by a round that sees it: the lab's
  // mission in the persona, and the worker tools. A continuation would see neither.
  {
    const fresh = join(scratch, 'midgoal')
    mkdirSync(fresh)
    const s = goalSession(fresh)
    let stage = 0, second
    try {
      await s.prompt('/pe set up a math lab')
      answer = async request => {
        switch (stage++) {
          case 0:
            mkdirSync(join(fresh, '.research'))
            writeFileSync(join(fresh, '.research', 'LAB.md'), '# lab\n')
            writeFileSync(join(fresh, '.research', 'MISSION.md'), missions['math-team'])
            return 'Lab made; more remains.'
          case 1: second = parse(request); return tool('get_goal', {})
          case 2: return updateGoal(request, 'complete')
          default: return 'Done.'
        }
      }
      await s.prompt('/goal Make the lab and study the fixture.')
      await until(() => stage > 3, () => JSON.stringify({stage}))
      check(second.system.includes(withMission(missions['math-team'])) && peTools.every(t => second.tools.includes(t)),
        'goals: the round after a round that makes the lab gets its mission and worker tools')
    } finally {
      await s.close()
      answer = async () => 'ok'
    }
  }

  // A lab made mid-run gets its worker tools and lab tools on the next turn of the same run.
  {
    const fresh = join(scratch, 'midrun')
    mkdirSync(fresh)
    let stage = 0, second
    answer = async request => {
      switch (stage++) {
        case 0: return tool('write', { path: '.research/LAB.md', content: '# lab\n' })
        case 1: second = { tools: parse(request).tools, packer: existsSync(join(fresh, '.research', 'tools', 'pack.mjs')) }; return 'Lab made.'
        default: return 'ok'
      }
    }
    await session(fresh, ['/pe set up a lab'])
    answer = async () => 'ok'
    check(second && peTools.every(t => second.tools.includes(t)) && second.packer, 'a lab made mid-run has its tools on the next turn of that run', JSON.stringify(second))
  }

  // Hold two real worker requests until the parent has continued independently.
  let stage = 0, parentContinued = false, workerStarts = 0
  const release = deferred(), subagents = [], parents = []
  answer = async request => {
    const id = workerId(request)
    if (id) {
      subagents.push(request)
      if (!request.messages.some(m => m.role === 'tool')) {
        workerStarts++
        if (workerStarts === 2 && parentContinued) release.resolve()
        await release.promise
        return tool('read', { path: 'source.txt' })
      }
      return `${id}: draft evidence from source.txt:1; against: fixture only.`
    }
    parents.push(request)
    if (stage++ === 0) return { tools: [...['T-1', 'T-2'].map(taskId => ['pe_subagent', { taskId, task: 'Read source.txt and report evidence.' }]),
      ['pe_send_message', {taskId: 'T-1', message: 'Also check early steering.'}]] }
    parentContinued = true
    if (workerStarts === 2) release.resolve()
    return 'Manager continues its own reading.'
  }
  try { await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE parallel test. PARENT_ONLY_SECRET'], lab) }
  finally { release.resolve() }
  check(parentContinued && workerStarts === 2, 'workers: two requests overlap while the parent continues')
  check(subagents.every(r => !JSON.stringify(r).includes('PARENT_ONLY_SECRET') && !parse(r).system.includes(persona)), 'workers: fresh history and worker instructions, without the manager persona')
  const researchTools = ['bash', 'edit', 'find', 'grep', 'ls', 'read', 'write', 'pe_web_search', 'fixture_probe']
  check(subagents.every(r => researchTools.every(t => parse(r).tools.includes(t)) &&
    !parse(r).tools.some(t => goalTools.includes(t) || t === 'pe_subagent') && r.model === 'probe'),
    'workers: inherit the model and full research tools, including search and installed helpers')
  check(subagents.every(r => { const system = parse(r).system; return system.includes('trusted researcher') && system.includes('run small experiments') &&
    system.includes('shared compute checkout') && system.includes('shared Git state') && system.includes('.research/scratch/' + workerId(r) + '/') &&
    system.includes('- pe-cvss: ') && system.includes('- pe-fleet: ') }),
    'workers: get a shared mission, flexible skills, compute coordination, and manager-owned Git')
  check(parents.every(r => parse(r).system.includes(research)) && subagents.every(r => parse(r).system.includes(research)),
    'manager and workers receive the same complete research outlook')
  check(subagents.some(r => toolResults(r).includes('fixture evidence')), 'workers: real read tools run in the lab')
  check(subagents.some(r => workerId(r) === 'T-1' && JSON.stringify(r.messages).includes('Also check early steering.')), 'workers: steering is retained while a worker starts')
  for (const id of ['T-1', 'T-2']) {
    check(existsSync(scratchFile(id, '.done')) && readFileSync(scratchFile(id, 'answer.md'), 'utf8').includes(`${id}: draft evidence`), `workers: ${id} saves its own draft and success marker`)
    check(parents.some(r => JSON.stringify(r.messages).includes(`PE worker ${id} completed`)), `workers: ${id} completion automatically reaches the parent model`)
  }

  // A busy manager hears of a finished worker after its current turn, not after its whole run.
  {
    let stage = 0, heard
    answer = async request => {
      if (workerId(request)) return 'T-777: done.'
      switch (stage++) {
        case 0: return tool('pe_subagent', { taskId: 'T-777', task: 'Answer done.' })
        case 1:
          await until(() => existsSync(scratchFile('T-777', 'answer.md')))
          await new Promise(r => setTimeout(r, 500))
          return tool('read', { path: 'source.txt' })
        case 2: heard = JSON.stringify(request.messages).includes('PE worker T-777 completed'); return tool('read', { path: 'source.txt' })
        default: return 'Manager done.'
      }
    }
    await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE busy-manager test'], lab)
    answer = async () => 'ok'
    check(heard, 'workers: a busy manager hears a completion on its next turn')
  }

  // A model response without an answer is a failure, not a completed draft.
  stage = 0
  const failureParents = []
  answer = async request => {
    if (workerId(request)) return ''
    failureParents.push(request)
    return stage++ === 0 ? tool('pe_subagent', { taskId: 'T-3', task: 'Return no evidence.' }) : 'Manager receives failure.'
  }
  await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE empty-answer test'], lab)
  check(!existsSync(scratchFile('T-3', '.done')) && failureParents.some(r => JSON.stringify(r.messages).includes('PE worker T-3 failed')), 'workers: empty answers fail, omit .done, and notify the parent')

  // Steering a live session changes its next request. Cancellation preserves the
  // previous assistant turn, and does not automatically restart the manager.
  stage = 0
  const ready = deferred(), first = deferred(), secondReady = deferred(), second = deferred()
  let workerTurns = 0, steered = false, controls = ''
  answer = async request => {
    if (workerId(request)) {
      if (workerTurns++ === 0) {
        ready.resolve()
        await first.promise
        return { text: 'Partial evidence already found.', tools: [['read', { path: 'source.txt' }]] }
      }
      steered = JSON.stringify(request.messages).includes('Focus on fixture boundaries.')
      secondReady.resolve()
      await second.promise
      return 'Should have been cancelled.'
    }
    controls = toolResults(request)
    switch (stage++) {
      case 0: return tool('pe_subagent', { taskId: 'T-4', task: 'Investigate source.txt.' })
      case 1: await ready.promise; return tool('pe_send_message', { taskId: 'T-4', message: 'Focus on fixture boundaries.' })
      case 2: first.resolve(); return tool('pe_list_agents', {})
      case 3: await secondReady.promise; return tool('pe_interrupt_agent', { taskId: 'T-4' })
      default: return 'Manager acknowledged cancellation.'
    }
  }
  try { await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE control test'], lab) }
  finally { first.resolve(); second.resolve() }
  check(steered && controls.includes('T-4') && controls.includes('running'), 'workers: steering reaches the subagent and list shows its running task')
  check(controls.includes('1 running. Completion notices arrive automatically; keep working or end your turn.') &&
    controls.includes('Do not call pe_list_agents again just to wait.'), 'workers: a running list tells the manager how to wait for completion without polling')
  check(!existsSync(scratchFile('T-4', '.done')) && readFileSync(scratchFile('T-4', 'partial.md'), 'utf8').includes('Partial evidence'), 'workers: cancellation preserves partial evidence without .done')

  // Invalid requests must never overwrite a finished task or create extra jobs.
  stage = 0
  let invalidResults = ''
  answer = async request => {
    if (workerId(request)) throw new Error('An invalid launch reached a model.')
    invalidResults = toolResults(request)
    return stage++ === 0 ? { tools: [
      ['pe_subagent', { taskId: 'T-1', task: 'Overwrite evidence.' }],
      ['pe_subagent', { taskId: '../escape', task: 'Escape scratch.' }],
      ['pe_subagent', { taskId: 'T-5', task: 'Use an unknown skill.', skill: 'pe-unknown' }],
      ['pe_subagent', { taskId: 'T-6', task: 'Use an invalid skill path.', skill: '../reader' }],
    ] } : 'Invalid requests handled.'
  }
  await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE invalid-request test'], lab)
  check(invalidResults.includes('EEXIST') && invalidResults.includes('Unknown PE skill: pe-unknown') && invalidResults.includes('Unknown PE skill: ../reader') &&
    !existsSync(scratchFile('T-5', 'answer.md')) && !existsSync(scratchFile('T-6', 'answer.md')) &&
    readFileSync(scratchFile('T-1', 'answer.md'), 'utf8').includes('T-1: draft evidence'), 'workers: reject reused IDs, traversal, and unknown skills without changing evidence')

  // A general researcher can write and run code, use installed tools, and search directly.
  stage = 0
  let researchResults = ''
  answer = async request => {
    if (workerId(request)) {
      const done = request.messages.filter(m => m.role === 'tool').length
      researchResults = toolResults(request)
      if (done === 0) return tool('write', {path: '.research/scratch/T-7/probe.mjs',
        content: "import { writeFileSync } from 'node:fs'; writeFileSync('.research/scratch/T-7/result.txt', String(6 * 7)); console.log('computed 42');"})
      if (done === 1) return tool('bash', {command: 'node .research/scratch/T-7/probe.mjs'})
      if (done === 2) return tool('fixture_probe', {})
      if (done === 3) return tool('pe_web_search', {query: 'Fixture primary research'})
      return 'T-7: computed 42, checked the installed helper, and found a primary source.'
    }
    return stage++ === 0 ? tool('pe_subagent', {taskId: 'T-7', task: 'Test an idea and look for prior work.'}) : 'Researcher launched.'
  }
  env.OPENROUTER_API_KEY = 'fixture-search-key'
  try { await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE research tools test'], lab) }
  finally { env.OPENROUTER_API_KEY = '' }
  const receiptName = readdirSync(scratchFile('T-7', '')).find(n => /^search-.*\.json$/.test(n))
  check(readFileSync(scratchFile('T-7', 'result.txt'), 'utf8') === '42' && existsSync(scratchFile('T-7', '.done')) &&
    ['computed 42', 'Installed helper ran.', 'Fixture search answer.'].every(text => researchResults.includes(text)),
    'workers: a general researcher writes and executes code, uses an installed helper, and searches the web')
  check(receiptName && JSON.parse(readFileSync(scratchFile('T-7', receiptName), 'utf8')).sources[0].url === 'https://example.test/paper' &&
    !existsSync(join(lab, '.research', 'intel')), 'workers: search receipts stay with their artifacts for manager review')
  const searches = readFileSync(hooks, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(e => e.event === 'search')
  check(searches.length > 0 && searches.every(e => e.maxTokens === 4096),
    'search: requests cap their answer, so a low-balance key is not refused for a 65k reservation', JSON.stringify(searches))

  // Skills are optional lenses, including those previously reserved for the manager.
  for (const [taskId, skill, heading] of [['T-8', 'pe-coderunner', '# Code Runner'], ['T-9', 'pe-dead-end', '# Dead End'], ['T-16', 'pe-intel', '# Intel']]) {
    stage = 0
    let system = ''
    answer = async request => {
      if (workerId(request)) { system = parse(request).system; return `${taskId}: investigated the assigned question.` }
      return stage++ === 0 ? tool('pe_subagent', {taskId, task: 'Investigate a useful next experiment.', skill}) : 'Lens suggested.'
    }
    await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE optional lens test'], lab)
    check(system.includes(heading) && system.includes('Skills suggest approaches') && existsSync(scratchFile(taskId, '.done')),
      `workers: ${skill} is available as a research lens`)
    const handoff = system.slice(system.lastIndexOf('## Worker handoff'))
    check(system.lastIndexOf('## Worker handoff') > system.indexOf(heading) &&
      handoff.includes(`only in .research/scratch/${taskId}/`) && handoff.includes('Do not write to .research/notes/, .research/intel/ (including INDEX.md)') &&
      handoff.includes('Use id: draft') && handoff.includes('shared compute checkout is the exception'),
      `workers: ${skill} ends with the task's draft handoff and shared-record ownership`)
  }

  stage = 0
  let starts = 0, parentAtCapacity = false, capacityResults = ''
  const capacity = deferred()
  answer = async request => {
    if (workerId(request)) {
      starts++
      if (starts === 4 && parentAtCapacity) capacity.resolve()
      await capacity.promise
      return 'Capacity-test draft.'
    }
    capacityResults = toolResults(request)
    if (stage++ === 0) return { tools: [10, 11, 12, 13, 14].map(n => ['pe_subagent', { taskId: `T-${n}`, task: 'Read independently.' }]) }
    parentAtCapacity = true
    if (starts === 4) capacity.resolve()
    return 'Manager keeps reading at capacity.'
  }
  try { await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE capacity test'], lab) }
  finally { capacity.resolve() }
  check(starts === 4 && capacityResults.includes('All 4 PE worker slots are busy') && !existsSync(scratchFile('T-14', 'answer.md')), 'workers: capacity is enforced before starting a fifth worker')

  // The lab sets its own limit with a Workers: line, read again at each launch.
  {
    const labFile = join(lab, '.research', 'LAB.md'), before = readFileSync(labFile, 'utf8')
    writeFileSync(labFile, before + '\n    Workers: 2\n')
    let limitStage = 0, limitStarts = 0, limitResults = ''
    const limited = deferred()
    answer = async request => {
      if (workerId(request)) { limitStarts++; await limited.promise; return 'Limit-test draft.' }
      limitResults = toolResults(request)
      if (limitStage++ === 0) return { tools: [140, 141, 142].map(n => ['pe_subagent', { taskId: `T-${n}`, task: 'Read independently.' }]) }
      limited.resolve()
      return 'Manager keeps reading at the lab limit.'
    }
    try { await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE lab limit test'], lab) }
    finally { limited.resolve(); writeFileSync(labFile, before) }
    check(limitResults.includes('All 2 PE worker slots are busy') && !existsSync(scratchFile('T-142', 'answer.md')) && existsSync(scratchFile('T-141', 'answer.md')),
      'workers: a lab\'s Workers: line sets its limit', limitResults.slice(-400))
  }

  stage = 0
  let blocked = false
  answer = async request => {
    if (workerId(request)) {
      if (!request.messages.some(m => m.role === 'tool')) return tool('read', { path: 'blocked.txt' })
      blocked = toolResults(request).includes('Fixture security hook blocked this read.')
      return 'The installed hook prevented the read.'
    }
    return stage++ === 0 ? tool('pe_subagent', { taskId: 'T-15', task: 'Try reading blocked.txt.' }) : 'Hook checked.'
  }
  await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE hook test'], lab)
  check(blocked, 'workers: other installed tool hooks remain effective')

  // Aborting the manager's turn stops that turn, not the workers it launched.
  {
    const s = goalSession(lab)
    const held = deferred(), release = deferred(), workerRelease = deferred()
    let step = 0, live = false
    answer = async request => {
      if (workerId(request)) { live = true; await workerRelease.promise; return 'T-33: draft survived the abort.' }
      if (step++ === 0) return tool('pe_subagent', { taskId: 'T-33', task: 'Read source.txt.' })
      if (step === 2) { held.resolve(); await release.promise; return 'Aborted reply.' }
      return 'Manager received the draft.'
    }
    try {
      const count = s.settled()
      await s.rpc({type: 'prompt', message: 'Launch a worker, then keep going.'})
      await held.promise; await until(() => live)
      await s.rpc({type: 'abort'}); await s.waitSettled(count); release.resolve()
      workerRelease.resolve()
      await until(() => existsSync(scratchFile('T-33', '.done')))
      check(readFileSync(scratchFile('T-33', 'answer.md'), 'utf8').includes('survived the abort'),
        'workers: aborting the manager turn leaves a running worker to finish')
    } finally { release.resolve(); workerRelease.resolve(); await s.close(); answer = async () => 'ok' }
  }

  // RPC sessions stay responsive with a worker in flight. Reload and switch must
  // stop it, tear down its hooks, and discard its old completion callback.
  const plain = join(scratch, 'plain')
  mkdirSync(plain)
  const plainSession = join(scratch, 'plain.jsonl')
  writeFileSync(plainSession, JSON.stringify({type: 'session', version: 3, id: 'plain-session', timestamp: new Date().toISOString(), cwd: plain}) + '\n')
  for (const [action, taskId] of [['reload', 'T-30'], ['switch', 'T-31']]) {
    stage = 0
    let live = false
    const finish = deferred()
    answer = async request => {
      if (workerId(request)) { live = true; await finish.promise; return 'Old worker result must not reach the replacement session.' }
      return stage++ === 0 ? tool('pe_subagent', { taskId, task: 'Investigate until interrupted.' }) : 'Parent remains responsive.'
    }
    const child = spawn(pi, ['--mode', 'rpc', '--no-session', '--provider', 'probe', '--model', 'probe'], {cwd: lab, env, stdio: ['pipe', 'pipe', 'pipe']})
    let pending = '', output = '', sequence = 0
    const events = []
    child.stderr.on('data', d => { output += d })
    child.stdout.on('data', d => {
      output += d
      pending += d
      const lines = pending.split('\n'); pending = lines.pop() ?? ''
      for (const line of lines) { try { events.push(JSON.parse(line)) } catch {} }
    })
    const rpc = async command => {
      const id = `rpc${sequence++}`
      child.stdin.write(JSON.stringify({...command, id}) + '\n')
      await until(() => events.some(e => e.type === 'response' && e.id === id), () => output)
      const response = events.find(e => e.type === 'response' && e.id === id)
      if (!response.success) throw new Error(JSON.stringify(response))
    }
    try {
      await rpc({type: 'prompt', message: 'Launch a PE worker.'})
      await until(() => live, () => output)
      await rpc(action === 'reload' ? {type: 'prompt', message: '/pe-test-reload'} : {type: 'switch_session', sessionPath: plainSession})
      check(!existsSync(scratchFile(taskId, '.done')), `workers: ${action} stops an in-flight worker without marking success`)
      if (action === 'reload') check(existsSync(scratchFile(taskId, '.interrupted')), 'workers: the interrupted marker survives until its notice is delivered')
      const before = requests.length
      await rpc({type: 'prompt', message: 'Hello from the replacement session.'})
      await until(() => requests.length > before, () => output)
      const replacement = requests.at(-1)
      const messages = JSON.stringify(replacement.messages)
      check(!messages.includes('Old worker result must not reach') && !messages.includes(`PE worker ${taskId} completed`) &&
        (action === 'reload' || (!messages.includes(taskId) && !parse(replacement).tools.some(t => t.startsWith('pe_')))),
        `workers: ${action} delivers no late result; plain sessions have no PE tools`)
      const note = existsSync(scratchFile(taskId, 'interrupted.md')) ? readFileSync(scratchFile(taskId, 'interrupted.md'), 'utf8') : ''
      check(note.includes(`# ${taskId} interrupted`) && note.includes('Investigate until interrupted.') && note.includes('probe/probe'),
        `workers: ${action} leaves interrupted.md with the task and model in the worker's scratch`, note)
      if (action === 'reload') {
        await until(() => !existsSync(scratchFile(taskId, '.interrupted')), () => output)
        check(messages.includes('PE: Pi stopped while 1 worker(s) ran') && messages.includes(`${taskId}: Investigate until interrupted.`),
          'workers: the next lab session hears once which tasks were cut off, and the marker clears after delivery')
      }
      // A plain session cannot report a lab's workers; clear the marker so later lab tests start clean.
      rmSync(scratchFile(taskId, '.interrupted'), { force: true })
      if (action === 'reload') {
        let listed = '', asked = 0
        answer = async request => asked++ === 0 ? tool('pe_list_agents', {}) : (listed = toolResults(request), 'Listed.')
        await rpc({type: 'prompt', message: 'List the workers.'})
        await until(() => listed !== '', () => output)
        check(listed.includes('PE: no workers.') && listed.includes('0 running.') && !listed.includes('end your turn'),
          'workers: reload starts with an empty fleet and no waiting instruction')
      }
    } finally {
      finish.resolve()
      child.stdin.end()
      await until(() => child.exitCode !== null, () => output).catch(() => { child.kill('SIGKILL') })
    }
  }
  const lifecycle = readFileSync(hooks, 'utf8').trim().split('\n').map(JSON.parse)
  check(lifecycle.filter(e => e.event === 'session_start').length === lifecycle.filter(e => e.event === 'session_shutdown').length,
    'workers: every SDK session emits shutdown to installed extensions before disposal')

  // Exercise the real footer while the manager is idle: four pie-circle indicators,
  // a freed middle slot, a failed worker, and readable age and goal state.
  if (process.platform !== 'win32') {
    stage = 0
    let launched = false, readGoal = false, completedGoal = false
    answer = async request => {
      const id = workerId(request)
      if (id) {
        await new Promise(r => setTimeout(r, {'T-40': 4200, 'T-41': 1600, 'T-42': 2600, 'T-43': 3400}[id]))
        return id === 'T-41' ? '' : 'TUI-test draft.'
      }
      if (stage++ === 0) return tool('create_goal', {objective: 'Read the fixture with four independent workers.', max_goal_rounds: 10})
      const messages = JSON.stringify(request.messages)
      if (!launched && messages.includes('Round: 1/10')) {
        launched = true
        return {tools: [40, 41, 42, 43].map(n => ['pe_subagent', {taskId: `T-${n}`, task: 'Read while the manager is idle.'}])}
      }
      if (messages.includes('Round: 2/10')) {
        if (!readGoal) { readGoal = true; return tool('get_goal', {}) }
        if (!completedGoal) { completedGoal = true; return updateGoal(request, 'complete') }
      }
      return 'Manager keeps working.'
    }
    const terminalProbe = `
import fcntl, json, os, pty, re, select, struct, subprocess, sys, termios, time
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 35, 140, 0, 0))
child = subprocess.Popen([sys.argv[1], '--no-session', '--provider', 'probe', '--model', 'probe'], cwd=sys.argv[2], stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
os.close(slave)
output = b''
sent = False
try:
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if select.select([master], [], [], 0.1)[0]:
            try: chunk = os.read(master, 65536)
            except OSError: break
            if not chunk: break
            output += chunk
        text = re.sub(chr(27) + re.escape('[') + '[0-9;]*m', '', output.decode('utf-8', 'replace'))
        if not sent and 'Persistent Eclipse · ○ ○ ○ ○ · +0' in text:
            os.write(master, b'Read the fixture with four independent workers and a ten-round budget.\\r')
            sent = True
        slots = [s.split() for s in re.findall('Persistent Eclipse · ([◴◷◶◵○ ]+) · ', text)]
        active = [s for s in slots if len(s) == 4 and '○' not in s]
        glyphs = '◴◷◶◵'
        animated = all(len({s[i] for s in active}) > 1 for i in range(4))
        independent = len({(glyphs.index(s[1]) - glyphs.index(s[0])) % 4 for s in active}) > 1
        middle_free = any(len(s) == 4 and s[1] == '○' and all(s[i] != '○' for i in [0, 2, 3]) for s in slots)
        finished = 'Persistent Eclipse · ○ ○ ○ ○ · +3 · !1' in text and 'goal complete' in text
        if animated and independent and middle_free and 'oldest 0:01' in text and 'goal active' in text and finished:
            print('ok   workers and goals: real TUI shows independent pie circles, stable slots, counts, and labeled age and goal state')
            break
    else:
        raise RuntimeError('TUI footer did not update: ' + output.decode('utf-8', 'replace')[-8000:])
    if not sent or not finished:
        raise RuntimeError('TUI exited early: ' + output.decode('utf-8', 'replace')[-8000:])
finally:
    child.terminate()
    try: child.wait(timeout=5)
    except subprocess.TimeoutExpired:
        child.kill()
        child.wait()
    os.close(master)
`
    const probe = spawn('python3', ['-c', terminalProbe, pi, lab], {cwd: scratch, env: {...env, TERM: 'xterm-256color'}, stdio: ['ignore', 'pipe', 'pipe']})
    let terminalOutput = ''
    probe.stdout.on('data', d => { terminalOutput += d }); probe.stderr.on('data', d => { terminalOutput += d })
    const code = await new Promise(r => probe.on('close', r))
    check(code === 0, 'workers and goals: actual Pi TUI status and timer update together', terminalOutput)
  }
  // A worker that saves its own answer.md still completes; PE puts its reply beside it.
  {
    let stage = 0, wstage = 0, notice = ''
    answer = async request => {
      if (workerId(request) === 'T-901') return wstage++ === 0 ? tool('write', {path: '.research/scratch/T-901/answer.md', content: 'Worker-written summary.\n'}) : 'T-901: final reply.'
      const text = JSON.stringify(request.messages)
      if (text.includes('PE worker T-901')) notice = text
      return stage++ === 0 ? tool('pe_subagent', {taskId: 'T-901', task: 'Write your own answer.md, then reply.'}) : 'Noted.'
    }
    await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'PE own-answer test'], lab)
    check(readFileSync(scratchFile('T-901', 'answer.md'), 'utf8') === 'Worker-written summary.\n' &&
      readFileSync(scratchFile('T-901', 'final-answer.md'), 'utf8').includes('T-901: final reply.') && notice.includes('PE worker T-901 completed'),
      'workers: a worker that writes its own answer.md completes, with the final reply saved beside it', notice.slice(-400))
  }

  // A long goal gets a quiet housekeeping reminder between turns, at the lab's interval.
  {
    const tidyLab = join(scratch, 'housekeeping-lab')
    mkdirSync(join(tidyLab, '.research'), { recursive: true })
    writeFileSync(join(tidyLab, '.research', 'LAB.md'), '# lab\n\n    Housekeeping: 5s\n')
    let stage = 0, reminded = 0
    answer = async request => {
      const seen = request.messages.filter(m => m.role === 'user' && JSON.stringify(m.content).includes('<housekeeping>')).length
      reminded = Math.max(reminded, seen)
      switch (stage++) {
        case 0: return tool('create_goal', {objective: 'Run one slow experiment.'})
        case 1: return tool('bash', {command: 'sleep 6'})
        case 2: return tool('get_goal', {})
        case 3: return updateGoal(request, 'complete')
        default: return 'Done.'
      }
    }
    await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'Keep at the slow experiment until it is done.'], tidyLab)
    check(reminded === 1, 'goals: a long goal gets one housekeeping reminder between turns at the lab interval', `saw ${reminded} reminders after ${stage} requests`)
  }
  // Real worker launches and archiving, with a clock offset only for completion
  // age in this isolated package. Runtime timers and the six-hour rule stay intact.
  {
    const extensionFile = join(pkg, 'extension.ts'), extension = readFileSync(extensionFile, 'utf8')
    const clockFile = join(scratch, 'archive-clock')
    writeFileSync(clockFile, '0')
    writeFileSync(extensionFile, extension
      .replace('export default function (pi: ExtensionAPI)', `const archiveTestNow = () => Date.now() + Number(readFileSync(${JSON.stringify(clockFile)}, 'utf8'));\nexport default function (pi: ExtensionAPI)`)
      .replace('function archivable(now = Date.now())', 'function archivable(now = archiveTestNow())')
      .replace('job.ended = Date.now();', 'job.ended = archiveTestNow();'))
    const dir = join(scratch, 'archive-lab')
    mkdirSync(join(dir, '.research'), {recursive: true})
    writeFileSync(join(dir, '.research', 'LAB.md'), '# Archive fixture\n')
    const held = deferred(), s = goalSession(dir)
    let nextCall
    answer = async request => {
      const id = workerId(request)
      if (id === 'T-800' || id === 'T-600') { await held.promise; return 'Held worker finished.' }
      if (id === 'T-700') return '' // Failed, not completed.
      if (id) return 'Evidence retained.'
      if (nextCall) { const call = nextCall; nextCall = undefined; return call }
      return 'Acknowledged.'
    }
    const call = async (name, args = {}) => {
      nextCall = tool(name, args)
      const before = s.events.length
      await s.rpc({type: 'prompt', message: 'Run the requested fixture operation.', streamingBehavior: 'followUp'})
      let result
      await until(() => {
        result = s.events.slice(before).find(e => e.type === 'tool_execution_end' && e.toolName === name)?.result
        return result !== undefined
      }, () => `Archive fixture waiting for ${name}: ${JSON.stringify(s.events.slice(-8)).slice(-5000)}`)
      // Wait for the manager's response before sending another RPC prompt.
      await until(() => s.events.slice(before).some(e => e.type === 'agent_settled'), () => `Archive fixture waiting to settle after ${name}`)
      return result.content.map(c => c.text ?? '').join('')
    }
    const launch = async id => {
      await call('pe_subagent', {taskId: id, task: 'Retain evidence for archive testing.'})
      if (id !== 'T-800' && id !== 'T-600') await until(() => s.events.some(e =>
        e.type === 'agent_end' && e.messages?.some(m => m.customType === 'pe-worker' && m.details?.taskId === id)),
        () => `Archive fixture waiting for ${id}: ${JSON.stringify(s.events.slice(-8)).slice(-5000)}`)
    }
    const ids = text => [...text.matchAll(/^(T-\d+)  /gm)].map(m => m[1])
    try {
      await launch('T-900')
      await launch('T-800')
      await launch('T-700')
      await launch('T-600')
      await call('pe_interrupt_agent', {taskId: 'T-600'})
      for (let i = 1; i <= 6; i++) await launch(`T-${i}`)
      // Ten total: the oldest has only nine newer workers, even after seven hours.
      writeFileSync(clockFile, String(7 * 3_600_000))
      check((await call('pe_archive_agents')).includes('No completed worker records'),
        'archive: six-hour-old completions stay listed with fewer than ten newer workers')
      await launch('T-7')
      writeFileSync(clockFile, '0')
      check((await call('pe_archive_agents')).includes('No completed worker records'),
        'archive: ten newer launches do not bypass completion age')
      writeFileSync(clockFile, String(7 * 3_600_000))
      const beforeList = await call('pe_list_agents')
      check(beforeList.includes('1 completed worker records can be archived'), 'archive: fleet lists eligible cleanup')
      const evidence = join(dir, '.research/scratch/T-900/answer.md')
      const transcript = join(dir, '.research/scratch/T-900/session')
      const prior = readFileSync(evidence, 'utf8'), logs = readdirSync(transcript)
      check((await call('pe_archive_agents')).includes('Archived 1 completed worker records'),
        'archive: eligible completed worker is archived by launch order, not task ID')
      let list = await call('pe_list_agents')
      check(!ids(list).includes('T-900') && ids(list).length === 10 && list.includes('1 completed worker records archived'),
        'archive: old completion leaves the list and the newest ten stay visible')
      check(readFileSync(evidence, 'utf8') === prior && JSON.stringify(readdirSync(transcript)) === JSON.stringify(logs) &&
        existsSync(join(dir, '.research/scratch/T-900/.done')),
        'archive: answer, completion marker, and transcript files remain intact')
      check((await call('pe_subagent', {taskId: 'T-900', task: 'Must not reuse archived task.'})).includes('already been used'),
        'archive: archived task IDs cannot be reused')
      for (let i = 8; i <= 17; i++) await launch(`T-${i}`)
      await call('pe_archive_agents')
      list = await call('pe_list_agents')
      check(['T-800', 'T-700', 'T-600', 'T-7'].every(id => ids(list).includes(id)) &&
        !ids(list).includes('T-1') && list.includes('7 completed worker records archived'),
        'archive: old running, failed, cancelled, and recently completed workers stay visible')
      check((await call('pe_archive_agents')).includes('No completed worker records'), 'archive: repeated cleanup is idempotent')
      const archives = (await s.branch()).filter(e => e.customType === 'pe-worker-archive')
      check(archives.length === 2 && archives.flatMap(e => e.data.taskIds).length === 7,
        'archive: session history records exactly which workers were archived')
    } finally {
      await s.close(); held.resolve(); writeFileSync(extensionFile, extension); answer = async () => 'ok'
    }
  }
  // Idle fleet checks use a short timeout only in this isolated package. The real
  // worker requests stay open, reproducing a manager waiting on a lingering worker.
  {
    const extensionFile = join(pkg, 'extension.ts')
    const extension = readFileSync(extensionFile, 'utf8')
    const idleMs = 1000
    check(extension.includes('const IDLE_REVIEW_MS = 15 * 60_000;'), 'idle review: production interval is fifteen minutes')
    writeFileSync(extensionFile, extension.replace('const IDLE_REVIEW_MS = 15 * 60_000;', `const IDLE_REVIEW_MS = ${idleMs};`))
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    let sequence = 0
    async function fixture({workers = 2, slots = 4, goal = true, cap = 8, headless = false} = {}) {
      const dir = join(scratch, `idle-review-${sequence++}`)
      mkdirSync(join(dir, '.research'), {recursive: true})
      writeFileSync(join(dir, '.research', 'LAB.md'), `# Lab\nWorkers: ${slots}\n`)
      const release = Array.from({length: workers}, deferred)
      const busy = deferred(), busyStarted = deferred()
      let stage = 0, authorityTried = false, authorityDenied = false, completing = false
      const reviews = new Map(), completions = []
      answer = async request => {
        const id = workerId(request)
        if (id) {
          if (headless && workers > 1 && id === 'T-1') await sleep(idleMs / 3)
          else await release[Number(id.slice(2)) - 1].promise
          return 'Worker finished.'
        }
        const user = parse(request).user
        if (user.includes('PE worker T-1 completed')) completions.push(Date.now())
        if (user.includes('<fleet_check>')) {
          // Each check adds one message to the conversation; a tool call repeats the same one.
          const nth = JSON.stringify(request.messages).split('<fleet_check>').length - 1
          if (!reviews.has(nth)) reviews.set(nth, {at: Date.now(), text: user})
          if (headless) {
            if (!completing) { completing = true; return updateGoal(request, 'complete') }
            release.forEach(r => r.resolve())
          } else if (!authorityTried) {
            authorityTried = true
            return updateGoal(request, 'pause')
          } else authorityDenied ||= toolResults(request).includes('requires a direct request from the operator')
          return 'The workers are still useful. Keep waiting.'
        }
        if (user === 'BUSY_MANAGER') { busyStarted.resolve(); await busy.promise; return 'Finished my own check; keep waiting.' }
        if (user === 'FINISH_GOAL') {
          if (!completing) { completing = true; return updateGoal(request, 'complete') }
          return 'Goal complete.'
        }
        if (goal && stage === 0) {
          stage++
          return tool('create_goal', {objective: 'Review useful work while experiments run.', max_goal_rounds: cap})
        }
        if (stage === (goal ? 1 : 0)) {
          stage++
          return {tools: release.map((_, i) => ['pe_subagent', {taskId: `T-${i + 1}`, task: `Wait for experiment ${i + 1}.`}])}
        }
        return 'Waiting for evidence.'
      }
      if (headless) {
        await run(['-p', '--no-session', '--provider', 'probe', '--model', 'probe', 'Run the experiment.'], dir)
        return {reviews, completions}
      }
      const s = goalSession(dir)
      await s.prompt('Run the experiment.')
      return {s, reviews, release, busy, busyStarted, authorityDenied: () => authorityDenied,
        close: async () => { await s.close(); release.forEach(r => r.resolve()); busy.resolve() }}
    }
    try {
      const f = await fixture({cap: 2})
      try {
        check((await f.s.snapshot()).roundsStarted === 0, 'idle review: workers initially suppress ordinary goal rounds')
        await until(() => f.reviews.size === 1 && f.authorityDenied())
        const first = [...f.reviews.values()][0].text
        check(first.includes('2/4 slots free') && first.includes('T-1:') && first.includes('T-2:') &&
          first.includes('last observed activity') && first.includes('keep waiting'),
          'idle review: two free slots wake the manager with worker context and permission to wait')
        check((await f.s.snapshot()).roundsStarted === 0 && (await f.s.snapshot()).phase === 'active',
          'idle review: the nudge spends no round and cannot pause with operator authority')
        await f.s.rpc({type: 'prompt', message: 'BUSY_MANAGER'})
        await f.busyStarted.promise
        await sleep(idleMs + 300)
        check(f.reviews.size === 1, 'idle review: no nudge interrupts an active manager')
        const settled = f.s.settled()
        f.busy.resolve(); await f.s.waitSettled(settled)
        await sleep(idleMs / 2)
        check(f.reviews.size === 1, 'idle review: manager activity starts a fresh idle window')
        await until(() => f.reviews.size === 2)
        check(f.reviews.get(2).text.includes(`next check comes after 2 seconds`),
          'idle review: the operator speaking resets the interval, and waiting doubles the next one')
        await until(() => f.reviews.size === 3)
        check(f.reviews.get(3).at - f.reviews.get(2).at >= 2 * idleMs && f.reviews.get(3).text.includes('next check comes after 4 seconds'),
          'idle review: checks slow while the manager keeps waiting')
        check((await f.s.snapshot()).roundsStarted === 0 && (await f.s.snapshot()).phase === 'active',
          'idle review: waiting through checks never exhausts the goal round cap')
      } finally { await f.close() }

      for (const config of [{workers: 3}, {workers: 1, slots: 2}, {goal: false}]) {
        const f = await fixture(config)
        try {
          await sleep(idleMs + 300)
          check(f.reviews.size === 0, `idle review: quiet with ${config.goal === false ? 'no goal' : 'only one free slot at capacity ' + (config.slots ?? 4)}`)
        } finally { await f.close() }
      }
      for (const command of ['/goal pause', '/goal clear', 'FINISH_GOAL', '/pe-test-reload']) {
        const f = await fixture()
        try {
          if (command === 'FINISH_GOAL') await f.s.prompt(command)
          else await f.s.rpc({type: 'prompt', message: command})
          await sleep(idleMs + 300)
          check(f.reviews.size === 0, `idle review: ${command} cancels the pending check`)
        } finally { await f.close() }
      }
      const aborted = await fixture()
      try {
        await aborted.s.rpc({type: 'prompt', message: 'BUSY_MANAGER'})
        await aborted.busyStarted.promise
        const before = aborted.s.settled()
        await aborted.s.rpc({type: 'abort'}); await aborted.s.waitSettled(before)
        aborted.busy.resolve()
        await sleep(idleMs + 300)
        check(aborted.reviews.size === 0, 'idle review: abort disarms nudges while workers remain running')
        await aborted.s.rpc({type: 'prompt', message: '/goal resume'})
        await until(() => aborted.reviews.size === 1)
        check((await aborted.s.snapshot()).phase === 'active',
          'idle review: an explicit resume rearms the timer even after an aborted turn')
      } finally { await aborted.close() }
      const completingWorker = await fixture()
      try {
        const before = completingWorker.s.settled()
        await sleep(idleMs / 2)
        completingWorker.release[0].resolve()
        await completingWorker.s.waitSettled(before)
        await sleep(idleMs / 2)
        check(completingWorker.reviews.size === 0, 'idle review: a worker completion gets priority and resets the window')
        await until(() => completingWorker.reviews.size === 1)
        check([...completingWorker.reviews.values()][0].text.includes('3/4 slots free'), 'idle review: a remaining worker cannot suppress the later check')
      } finally { await completingWorker.close() }

      const headless = await fixture({workers: 1, headless: true})
      check(headless.reviews.size === 1, 'idle review: headless Pi wakes at its worker-wait boundary')
      const partial = await fixture({workers: 2, headless: true})
      const review = [...partial.reviews.values()][0]
      check(partial.completions.length > 0 && review?.text.includes('3/4 slots free') &&
        review.at - partial.completions[0] >= idleMs,
        'idle review: headless Pi handles a completion before checking the remaining worker')
    } finally {
      writeFileSync(extensionFile, extension)
    }
  }
  answer = async () => 'ok'
} catch (e) { failed = e }
server.close()
rmSync(scratch, { recursive: true, force: true })
if (failed) { console.error('FAIL', failed.message); process.exit(1) }
console.log('PASS')
