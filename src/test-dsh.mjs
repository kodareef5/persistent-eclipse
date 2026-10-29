// Boot and reload test for the Persistent Eclipse mode. It boots real DeepSeek
// Harness with the patch in an isolated home and two probes, then checks the lab
// skill library from two scopes: the mode's own (the manager) and a separate
// preset (a Standard worker). It then edits, removes, and restores the patch
// while Harness runs and checks the worker sees each change with no duplicates.
// Usage: node src/test-dsh.mjs /path/to/dsh/apps/cli/lib/bin.js
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const bin = process.argv[2]
if (!bin) { console.error('usage: node src/test-dsh.mjs <dsh bin.js>'); process.exit(2) }
const patch = join(dirname(fileURLToPath(import.meta.url)), '..', 'cordis.patch.yml')
const missions = Object.fromEntries(['red-team', 'blue-team', 'math-team'].map(mode => [mode,
  readFileSync(join(dirname(patch), 'src', 'missions', mode + '.md'), 'utf8')]))
const home = mkdtempSync(join(tmpdir(), 'pe-boot-'))
const lab = mkdtempSync(join(tmpdir(), 'pe-lab-'))
const notLab = mkdtempSync(join(tmpdir(), 'pe-notlab-'))
// A directory that starts without a lab, so the probe can create one mid-session.
const cold = mkdtempSync(join(tmpdir(), 'pe-cold-'))
mkdirSync(join(lab, '.research')); writeFileSync(join(lab, '.research', 'LAB.md'), '# lab\n')
// A lab that already holds a different linter when it is first opened: an older copy
// after an upgrade, or a hand edit. The runtime keeps it and leaves its own beside it.
const drift = mkdtempSync(join(tmpdir(), 'pe-drift-'))
mkdirSync(join(drift, '.research', 'tools'), { recursive: true })
writeFileSync(join(drift, '.research', 'LAB.md'), '# lab\n')
writeFileSync(join(drift, '.research', 'tools', 'lint-notes.mjs'), '// edited by hand\n')
const missionLab = mkdtempSync(join(tmpdir(), 'pe-mission-'))
const missionNested = join(missionLab, 'sources', 'example')
mkdirSync(missionNested, {recursive: true}); mkdirSync(join(missionLab, '.research'))
writeFileSync(join(missionLab, '.research', 'LAB.md'), '# mission lab\n')
const missionFile = join(missionLab, '.research', 'MISSION.md')
let customMission = missions['math-team'] + '\n## Operator directions\nKeep $& and {{literal}} intact.\n'
writeFileSync(missionFile, customMission)

// One plugin row that, every second, lists the catalog from its own scope in a lab
// and outside one, loads the pe-reader body, and writes the result to `out`. On its
// first tick it also snapshots an empty directory, writes .research/LAB.md, and lists
// again: the manager that lays a lab down mid-session must see the library afterwards.
const probe = (id, out, inspectMission = false) => `          - id: ${id}
            name: '@deepseek-ai/dsh-skill-filesystem'
            config:
              providerName: ${id}
              includeDefaultRoots: false
              watch: false
              customSkillDirs: !!js |
                (() => {
                  const fs = process.getBuiltinModule('node:fs')
                  const reg = skills
                  const scope = (() => { for (let o = ctx; o; o = Object.getPrototypeOf(o)) { const k = Object.getOwnPropertySymbols(o).find(x => x.description === 'dsh.scope'); if (k) return o[k] } })()
                  const names = async cwd => (await reg.list({ cwd, scope })).map(s => s.name).filter(n => n.startsWith('pe-')).sort()
                  const coldStart = async () => {
                    const before = await reg.snapshot({ cwd: ${JSON.stringify(join(cold, id))}, scope })
                    fs.mkdirSync(${JSON.stringify(join(cold, id, '.research'))}, { recursive: true })
                    fs.writeFileSync(${JSON.stringify(join(cold, id, '.research', 'LAB.md'))}, '# lab\\n')
                    const after = await names(${JSON.stringify(join(cold, id))})
                    return {
                      completeBefore: before.complete,
                      before: before.skills.map(s => s.name).filter(n => n.startsWith('pe-')).sort(),
                      after,
                    }
                  }
                  let coldResult, missionSession
                  const tick = async () => {
                    try {
                      const inLab = await names(${JSON.stringify(lab)})
                      const outside = await names(${JSON.stringify(notLab)})
                      const body = (await reg.get('pe-reader', { cwd: ${JSON.stringify(lab)}, scope }))?.content ?? ''
                      coldResult ??= await coldStart()
                      await names(${JSON.stringify(drift)})
                      let mission
                      if (${inspectMission}) {
                        const prompt = ctx.get('systemPrompt')
                        const initial = (await prompt.assemble({scope})).variables.pe_mission
                        missionSession ??= ctx.get('sessions').create(undefined, {meta: {cwd: ${JSON.stringify(missionNested)}}})
                        const persisted = (await prompt.assemble({scope, agent: {id: missionSession.id, session: missionSession, ctx, options: {}}})).variables.pe_mission
                        mission = {initial, persisted}
                      }
                      const kickoff = (await reg.get('pe-kickoff', { cwd: ${JSON.stringify(notLab)}, scope }))?.content ?? null
                      fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({ inLab, outside, cold: coldResult, mission, kickoff, heading: body.match(/^# .*/m)?.[0] ?? null }))
                    } catch (e) { fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({ error: e.stack })) }
                    globalThis.setTimeout(tick, 1000)
                  }
                  globalThis.setTimeout(tick, 1500)
                  return []
                })()
`
// A host row that writes what the preset registry reports, the same list the
// Agent presets screen shows, including each preset's load failure.
const presets = join(home, 'presets.json')
const presetProbe = `- insert:
    - id: pe-boot-presets
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: pe-boot-presets
        includeDefaultRoots: false
        watch: false
        customSkillDirs: !!js |
          (() => {
            const fs = process.getBuiltinModule('node:fs')
            const tick = async () => {
              try { fs.writeFileSync(${JSON.stringify(presets)}, JSON.stringify(await ctx.get('agentPresets').list())) }
              catch (e) { fs.writeFileSync(${JSON.stringify(presets)}, JSON.stringify({ error: e.stack })) }
            }
            globalThis.setTimeout(tick, 3000)
            return []
          })()
`
const manager = join(home, 'manager.json')
const worker = join(home, 'worker.json')
const workerPreset = `    - id: preset-pe-boot-worker
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: pe-boot-worker
        plugins:
${probe('pe-boot-probe-worker', worker)}`

let text = readFileSync(patch, 'utf8')
text = text.replace('          - id: delegation', probe('pe-boot-probe-manager', manager, true) + '          - id: delegation')
text = text.trimEnd() + '\n' + workerPreset + presetProbe
// The home patch layer is watched, so editing it exercises a live reload.
const homePatch = join(home, 'cordis.patch.yml')
writeFileSync(homePatch, text)

const child = spawn('node', [bin, '--profile', 'web', '--no-open', '--port', '0', '--host', '127.0.0.1'],
  { env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'ignore', 'pipe'] })
let stderr = ''
child.stderr.on('data', d => { stderr += d })

const want = ['pe-challenger', 'pe-dead-end', 'pe-fleet', 'pe-git-research', 'pe-intel',
  'pe-cvss', 'pe-lint', 'pe-migrator', 'pe-muse', 'pe-coderunner', 'pe-reader',
  'pe-reporter', 'pe-survey', 'pe-patch', 'pe-math', 'pe-web', 'pe-export'].sort()
const read = file => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function until(label, check, ms = 45000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) if (check()) return console.log('ok  ', label)
  throw new Error(`${label}: ${JSON.stringify({ presets: read(presets), manager: read(manager), worker: read(worker) })}`)
}
const library = (heading, r) => r && same(r.inLab, want) && same(r.outside, []) && r.heading === heading
// The mode also registers pe-kickoff for the manager, in a lab or not, so it can make
// one. The library itself stays lab-gated for the manager too.
const managerLibrary = r => r && same(r.inLab, [...want, 'pe-kickoff'].sort()) && same(r.outside, ['pe-kickoff']) && r.heading === '# Reader'
// Before a lab exists the catalog is deliberately incomplete, so it is never cached;
// the same scope must see the library once the marker appears.
const coldStart = r => r?.cold && r.cold.completeBefore === false
  && same(r.cold.before, ['pe-kickoff']) && same(r.cold.after, [...want, 'pe-kickoff'].sort())
// The lab tools must arrive as the bytes the source holds, or the digest the skill prints
// belongs to some other file and the agent stops. The runtime writes them from the skill
// text, the skill text comes from src/, so this compares the two ends of that path.
const placed = (dir, name) => {
  const file = join(dir, '.research', 'tools', name)
  const source = join(dirname(patch), 'src', name)
  return existsSync(file) && readFileSync(file).equals(readFileSync(source))
}
const toolsPlaced = () => placed(lab, 'lint-notes.mjs') && placed(lab, 'cvss.mjs') && placed(lab, 'pack.mjs')
  && placed(join(cold, 'pe-boot-probe-manager'), 'lint-notes.mjs') && placed(join(cold, 'pe-boot-probe-manager'), 'cvss.mjs')
const toolsKept = () => !existsSync(join(notLab, '.research'))

let failed
try {
  await until('one Persistent Eclipse preset loads with no broken rows', () => {
    const rows = read(presets)
    if (!Array.isArray(rows)) return false
    const ours = rows.filter(p => p.id.startsWith('persistent-eclipse'))
    const row = ours.find(p => p.id === 'persistent-eclipse')
    if (row?.broken) throw new Error(`persistent-eclipse preset broken:\n${row.broken}`)
    return ours.length === 1 && row.name === 'Persistent Eclipse'
  })
  await until('manager scope: the full set and pe-kickoff in a lab, only pe-kickoff outside', () => managerLibrary(read(manager)))
  await until('cold start: incomplete before the lab exists, full set after it is made', () => coldStart(read(manager)))
  await until('worker scope: the full set in a lab, none outside, body loads', () => library('# Reader', read(worker)))
  await until('mission: Blue Team by default, and the lab\'s own MISSION.md once it has one', () => {
    const mission = read(manager)?.mission
    return mission?.initial === missions['blue-team'] && mission.persisted === customMission
  })
  customMission += 'The operator updated the mission during the session.\n'
  writeFileSync(missionFile, customMission)
  await until('mission edits reach the next assembly', () => read(manager)?.mission?.persisted === customMission)
  await until('kickoff carries all three mission texts verbatim', () => {
    const body = read(manager)?.kickoff ?? ''
    return body.includes('## The mission') && Object.values(missions).every(m => body.includes(m))
  })
  await until('tools: the lab gets the linter, calculator, and packer, byte for byte', toolsPlaced)
  // A lab keeps the copy its record was built with. The runtime may never replace it, and
  // must leave what it would have written beside it so the difference can be read.
  await until('tools: a lab\'s own copy is kept, with the shipped bytes beside it', () => {
    const file = join(drift, '.research', 'tools', 'lint-notes.mjs')
    return readFileSync(file, 'utf8') === '// edited by hand\n' && existsSync(`${file}.shipped`)
      && readFileSync(`${file}.shipped`).equals(readFileSync(join(dirname(patch), 'src', 'lint-notes.mjs')))
  })
  await until('tools: nothing is placed outside a lab', toolsKept)

  writeFileSync(homePatch, text.replace('\n              # Reader\n', '\n              # Reader (edited)\n'))
  await until('edit: worker sees the new body', () => library('# Reader (edited)', read(worker)))

  const start = text.indexOf('    - id: pe-skills'), end = text.indexOf('    - id: preset-persistent-eclipse')
  writeFileSync(homePatch, text.slice(0, start) + text.slice(end))
  await until('remove: the library disappears', () => same(read(worker)?.inLab, []))

  writeFileSync(homePatch, text)
  await until('restore: the full set again, no duplicates', () => library('# Reader', read(worker)))
} catch (e) { failed = e }
child.kill('SIGKILL')
for (const dir of [home, lab, notLab, cold, drift, missionLab]) rmSync(dir, { recursive: true, force: true })
if (failed) {
  console.error('FAIL', failed.message)
  console.error(stderr.split('\n').filter(l => /pe-|warn|error/i.test(l)).slice(-20).join('\n'))
  process.exit(1)
}
console.log('PASS')
