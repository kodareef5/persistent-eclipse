// Pack a scratch lab, preserve its evidence, and reject damaged or unsafe archives.
// Usage: node src/test-pack.mjs
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readZip, writeZip } from './pack.mjs'

const tool = join(dirname(fileURLToPath(import.meta.url)), 'pack.mjs')
const scratch = mkdtempSync(join(tmpdir(), 'pe-pack-')), lab = join(scratch, 'My lab π'), r = join(lab, '.research')
const put = (path, text) => { mkdirSync(dirname(join(r, path)), { recursive: true }); writeFileSync(join(r, path), text) }
const pack = (...args) => spawnSync(process.execPath, [tool, ...args], { cwd: lab, encoding: 'utf8' })
const sha = b => createHash('sha256').update(b).digest('hex')
const check = (cond, label, detail = '') => { if (!cond) { console.log('FAIL', label, detail); process.exit(1) } console.log('ok  ', label) }
const planFile = join(r, 'exports', 'p1', 'plan.json'), zipFile = join(r, 'exports', 'p1.pe-pack.zip')
const readPlan = () => JSON.parse(readFileSync(planFile, 'utf8'))
const savePlan = p => writeFileSync(planFile, JSON.stringify(p))

put('LAB.md', '# lab\n'); put('MISSION.md', '# Mission: Math Team\nMode: math-team\n')
execFileSync('git', ['init', '-q'], { cwd: lab })
put('notes/R-1.md', '---\nid: R-1\ntargets: [intel/paper.txt:1-2]\n---\n# A claim\n')
put('intel/paper.txt', 'line one\nline two\n'); put('intel/paper.pdf', Buffer.alloc(4096, 7))
put('intel/INDEX.md', '- paper: intel/paper.txt\n'); put('scratch/T-1/draft.md', 'unpromoted\n')
put('tools/lint-notes.mjs', '// placed\n'); put('tools/pack.mjs.shipped', '// shipped\n')
put('local/sessions/private.jsonl', 'private conversation\n'); put('tools/history.mjs', '// placed history tool\n')
put('lean/proof/.lake/cache', 'generated\n')
const authored = ['tools/reproduce.py', 'lean/proof/tools/helper.lean', 'intake/batch/manifest.md', 'intel/proof sketch λ.md',
  'intel/COM10.txt', 'intel/CON notes.txt', 'intel/auxiliary.txt', 'intel/LPT0.md']
for (const path of authored) put(path, 'Authored record, including http://www.ccs.neu.edu/home/viola/\n')
put('reports/long.md', 'authored analysis\n'.repeat(70000))
writeFileSync(join(lab, 'outside.md'), 'not part of the record\n')
symlinkSync(join(lab, 'outside.md'), join(r, 'intel', 'link.md'))

let run = pack('plan', 'p1'), plan = readPlan()
const file = path => plan.files.find(f => f.path === path)
check(run.status === 0 && plan.files.every(f => f.action === 'include') && file('intel/paper.pdf').reference_candidate,
  'plan: includes everything by default, with reference suggestions', run.stderr)
check(authored.every(path => file(path)?.action === 'include') && file('reports/long.md')?.action === 'include',
  'plan: keeps authored helpers, nested tools, intake, ordinary filenames, and large reports')
check(!file('scratch/T-1/draft.md') && !file('tools/lint-notes.mjs') && !file('tools/pack.mjs.shipped') && !file('lean/proof/.lake/cache') && !file('intel/link.md'),
  'plan: excludes scratch, shipped tools, caches, and symlinks')
check(!file('local/sessions/private.jsonl') && !file('tools/history.mjs'), 'plan: private conversations stay out of the research handoff')
check(execFileSync('git', ['check-ignore', '.research/exports/p1.pe-pack.zip'], { cwd: lab, encoding: 'utf8' }).trim().endsWith('p1.pe-pack.zip'),
  'packs are gitignored in an existing lab')

run = pack('build', 'p1')
check(run.status !== 0 && run.stderr.includes('README.md first'), 'build: needs the manager\'s README')
put('exports/p1/README.md', '# Pack p1\nWhat the lab knows.\n')
file('intel/paper.pdf').action = 'reference'; savePlan(plan)
run = pack('build', 'p1')
const fallback = join(lab, 'fallback')
check(run.status === 0 && run.stderr.includes('incomplete reference') && pack('verify', zipFile, '--extract', fallback).status === 0 &&
  readFileSync(join(fallback, 'research/intel/paper.pdf')).equals(readFileSync(join(r, 'intel/paper.pdf'))),
  'build: an incomplete reference keeps the original bytes', run.stderr)
Object.assign(file('intel/paper.pdf'), { origin: 'https://example.org/paper.pdf', summary: 'The paper; intel/paper.txt is its extract.' })
savePlan(plan)
put('STATUS.md', 'Work continued.\n')
run = pack('plan', 'p1'); plan = readPlan()
check(run.status === 0 && file('intel/paper.pdf').origin === 'https://example.org/paper.pdf' && file('intel/paper.pdf').summary && file('intel/paper.pdf').action === 'reference',
  'plan: refresh preserves origins, summaries, and choices')
run = pack('build', 'p1')
check(run.status === 0 && existsSync(zipFile) && !run.stderr.includes('home directory'), 'build: packages without rewriting evidence URLs', run.stderr)
const first = readFileSync(zipFile)
run = pack('build', 'p1')
check(run.status === 0 && sha(readFileSync(zipFile)) === sha(first), 'build: unchanged inputs give the same bytes')

run = pack('verify', zipFile, '--extract', join(lab, 'out'))
const manifest = JSON.parse(readFileSync(join(lab, 'out', 'manifest.json'), 'utf8'))
check(run.status === 0 && readFileSync(join(lab, 'out/research/intel/paper.txt'), 'utf8') === 'line one\nline two\n' &&
  !existsSync(join(lab, 'out/research/intel/paper.pdf')) && manifest.referenced[0].origin === 'https://example.org/paper.pdf' && manifest.mission === 'math-team',
  'verify: round trip retains evidence and reference provenance', run.stderr)
check(authored.every(path => readFileSync(join(lab, 'out/research', path)).equals(readFileSync(join(r, path)))) &&
  readFileSync(join(lab, 'out/research/reports/long.md')).equals(readFileSync(join(r, 'reports/long.md'))), 'round trip preserves authored bytes and Unicode filenames')
check(/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(manifest.lab), 'a lab name with spaces produces usable import provenance')
check(pack('verify', zipFile, '--extract', join(lab, 'out')).status !== 0, 'verify: never extracts over existing files')
const unzip = spawnSync('unzip', ['-t', zipFile], { encoding: 'utf8' })
if (unzip.error?.code === 'ENOENT') console.log('skip unzip compatibility: unzip is not installed')
else check(unzip.status === 0, 'a standard unzip accepts the archive', unzip.stderr)

put('notes/R-1.md', '# Updated claim\n'); put('notes/R-2.md', '# New claim\n')
put('STATUS.md', 'Work continued again.\n')
run = pack('build', 'p1')
const fresh = join(lab, 'fresh')
check(run.status === 0 && pack('verify', zipFile, '--extract', fresh).status === 0 &&
  readFileSync(join(fresh, 'research/notes/R-1.md'), 'utf8') === '# Updated claim\n' && existsSync(join(fresh, 'research/notes/R-2.md')),
  'build: ongoing work needs no replan; changed and new files get current hashes', run.stderr)
put('exports/without-plan/README.md', '# Full record\n')
const beforeBuild = Date.now()
run = pack('build', 'without-plan')
check(run.status === 0 && pack('verify', join(r, 'exports/without-plan.pe-pack.zip')).status === 0,
  'build: README is enough when no packaging choices are needed', run.stderr)
const withoutPlan = readFileSync(join(r, 'exports/without-plan.pe-pack.zip'))
const created = JSON.parse(readZip(withoutPlan).find(e => e.name === 'manifest.json').data()).created
check(Date.parse(created) >= beforeBuild && Date.parse(created) <= Date.now(),
  'build: an export without a plan records its creation time')
run = pack('build', 'without-plan')
check(run.status === 0 && readFileSync(join(r, 'exports/without-plan.pe-pack.zip')).equals(withoutPlan),
  'build: the creation time stays stable on an unchanged rebuild', run.stderr)

if (process.platform !== 'win32') {
  put('intel/CON.txt', 'Original evidence\n')
  put('exports/invalid-name/README.md', '# Full record\n')
  run = pack('build', 'invalid-name')
  check(run.status !== 0 && run.stderr.includes('unsafe archive path') &&
    !existsSync(join(r, 'exports/invalid-name.pe-pack.zip')) && readFileSync(join(r, 'intel/CON.txt'), 'utf8') === 'Original evidence\n',
    'build: refuses Windows device names without changing the evidence', run.stderr)
  rmSync(join(r, 'intel/CON.txt'))
}
for (const name of ['con', 'nul.backup', 'trailing.']) {
  check(pack('plan', name).status !== 0 && pack('build', name).status !== 0 && !existsSync(join(r, 'exports', name)),
    `export names: refuses ${name} before creating its directory`)
}

const token = 'sk-or-v1-' + 'a'.repeat(40)
put('notes/R-3.md', `A quoted test credential: ${token}\n`)
put('exports/p1/README.md', `# A quoted example\n${token}\n`)
plan = readPlan(); Object.assign(file('intel/paper.pdf'), { origin: `https://example.org/${token}` }); savePlan(plan)
run = pack('build', 'p1')
check(run.status === 0 && ['research/notes/R-3.md:1', 'README.md:2', 'manifest.json:'].every(part => run.stderr.includes(part)) &&
  !run.stderr.includes(token) && !run.stdout.includes(token) && readFileSync(join(r, 'notes/R-3.md'), 'utf8').includes(token),
  'credential review covers notes, README, and reference metadata without printing or rewriting values', run.stderr)

const m = { format: 'pe-lab-pack/1', name: 'x', included: [], referenced: [], omitted: [], counts: {} }
const bad = (label, bytes, expect) => {
  const path = join(lab, `${label}.zip`), out = join(lab, `${label}-out`)
  writeFileSync(path, bytes)
  const verify = pack('verify', path), extract = pack('verify', path, '--extract', out)
  check(verify.status !== 0 && verify.stderr.includes(expect) && extract.status !== 0 && !existsSync(out),
    `verify: refuses ${label} before extracting anything`, verify.stderr + extract.stderr)
}
const corrupt = name => {
  const bytes = Buffer.from(first), at = bytes.indexOf(Buffer.from(name)) - 30
  bytes[at + 30 + bytes.readUInt16LE(at + 26) + bytes.readUInt16LE(at + 28)] ^= 1
  return bytes
}
bad('changed evidence', corrupt('research/intel/paper.txt'), 'damaged')
bad('changed README', corrupt('README.md'), 'damaged')
const headers = [['manifest.json', Buffer.from(JSON.stringify(m))], ['README.md', Buffer.from('x')]]
for (const path of ['../evil', '/absolute', 'C:/drive', 'research/../evil', 'research/back\\slash', 'research/a\u0000b'])
  bad(`unsafe-${sha(path).slice(0, 8)}`, writeZip([...headers, [path, Buffer.from('x')]]), 'unsafe entry name')
const windowsNames = [...['<', '>', '"', '|', '?', '*'].map(c => `bad${c}name.txt`),
  'trailing.', 'trailing ', 'CON', 'prn.txt', 'AUX.tar.gz', 'nul', 'COM1.log', 'LPT9', 'COM².txt', 'lpt³.log',
  'CON/note.md', 'trailing./note.md', 'trailing /note.md']
for (const name of windowsNames)
  bad(`windows-${sha(name).slice(0, 8)}`, writeZip([...headers, [`research/${name}`, Buffer.from('x')]]), 'unsafe entry name')
bad('unlisted files', writeZip([...headers, ['research/extra.md', Buffer.from('x')]]), 'not listed in the manifest')
bad('duplicate names', writeZip([...headers, ['README.md', Buffer.from('x')]]), 'duplicate entry names')
bad('case collision', writeZip([...headers, ['readme.md', Buffer.from('x')]]), 'conflicting entry name')
bad('file directory collision', writeZip([...headers, ['README.md/file', Buffer.from('x')]]), 'file/directory conflict')
const linked = writeZip(headers), at = linked.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
linked.writeUInt32LE((0o120777 << 16) >>> 0, at + 38)
bad('symbolic links', linked, 'symbolic link')
rmSync(scratch, { recursive: true, force: true })
console.log('PASS')
