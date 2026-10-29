// Fixtures for the record linter. Each case is a lab record with one defect, so a
// regression names the rule it broke rather than "lint failed".
// Usage: node src/test-lint.mjs
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const lint = join(here, 'lint-notes.mjs')
const SHA = 'b243756255f64fe372f01e5f13dc0d51a5ab774c'
let failures = 0
const ok = label => console.log('ok  ', label)
const fail = (label, detail) => { failures++; console.log('FAIL', label, '\n', detail) }

const roots = []
function labRoot(notes = {}, vendor = [], files = []) {
  const root = mkdtempSync(join(tmpdir(), 'pe-lint-'))
  roots.push(root)
  const notesDir = join(root, '.research', 'notes')
  mkdirSync(notesDir, { recursive: true })
  for (const dir of vendor) mkdirSync(join(root, '.research', 'vendor', dir), { recursive: true })
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), 'x\n')
  }
  for (const [name, text] of Object.entries(notes)) writeFileSync(join(notesDir, name), text)
  return root
}
const lab = (notes, vendor = [], files = []) => join(labRoot(notes, vendor, files), '.research', 'notes')
const scratchOf = (root, task = 'T-1') => {
  const dir = join(root, '.research', 'scratch', task)
  mkdirSync(dir, { recursive: true })
  return dir
}
const note = (id, extra = {}, body = '') => {
  const fm = {
    id,
    source: 'app',
    kind: 'observation',
    state: 'open',
    labels: '[area:auth, risk:auth-bypass]',
    targets: '[sources/app/src/x.ts::f]',
    links: '{}',
    checked_at: SHA,
    ...extra,
  }
  const head = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n')
  return `---\n${head}\n---\n# A claim\n## Claim\nSomething checkable.\n## Evidence\n- sources/app/src/x.ts:1 shows it.\n${body}`
}
const run = (...args) => {
  const r = spawnSync(process.execPath, [lint, ...args], { encoding: 'utf8' })
  return { code: r.status, out: `${r.stdout}${r.stderr}` }
}
const expectClean = (label, dir, ...flags) => {
  const r = run('--dir', dir, ...flags)
  r.code === 0 && /no problems/.test(r.out) ? ok(label) : fail(label, r.out.slice(-600))
}
// Advice prints but leaves lint passing.
const expectAdvice = (label, dir, pattern, ...flags) => {
  const r = run('--dir', dir, '--advice', ...flags)
  r.code === 0 && /advice \(does not fail lint\)/.test(r.out) && pattern.test(r.out) ? ok(label) : fail(label, r.out.slice(-800))
}
const expectProblem = (label, dir, pattern, ...flags) => {
  const r = run('--dir', dir, ...flags)
  r.code === 1 && pattern.test(r.out) ? ok(label) : fail(label, `exit ${r.code}\n${r.out.slice(-600)}`)
}

// A claim another lab's pack carried in names that lab's note and pack, and keeps the
// state it was reported in apart from its standing here.
const PACK = 'a'.repeat(64)
expectClean('imported: a claim carried in from a lab pack', lab({ 'R-1.md': note('R-1', { imported_from: `newmath:R-5 sha256:${PACK}`, reported_state: 'supported' }) }))
expectProblem('imported: imported_from names the lab, the note, and the pack hash', lab({ 'R-1.md': note('R-1', { imported_from: 'R-5', reported_state: 'supported' }) }), /imported_from must be/)
expectProblem('imported: reported_state is a state', lab({ 'R-1.md': note('R-1', { imported_from: `newmath:R-5 sha256:${PACK}`, reported_state: 'verified' }) }), /reported_state "verified"/)
expectProblem('imported: reported_state needs imported_from', lab({ 'R-1.md': note('R-1', { reported_state: 'supported' }) }), /imported_from must be/)

// Follow pe-migrator: keep checked_at, but move evidence under the extracted pack.
const importedFile = 'intel/imported/newmath-test/research/vendor/srvx@1.0.8/index.mjs'
const importedFields = { imported_from: `newmath:R-5 sha256:${PACK}`, reported_state: 'supported',
  checked_at: `${SHA} srvx@1.0.8`, targets: `[${importedFile}:1]` }
expectClean('imported: dependency pin resolves through its rewritten evidence target',
  lab({ 'R-1.md': note('R-1', importedFields) }, [], [`.research/${importedFile}`]))
expectProblem('imported: a dependency copy is still required',
  lab({ 'R-1.md': note('R-1', importedFields) }), /vendor\/srvx@1\.0\.8/)
expectProblem('imported: another dependency is not the pinned copy',
  lab({ 'R-1.md': note('R-1', { ...importedFields, checked_at: `${SHA} srvx@2.0.0` }) }, [], [`.research/${importedFile}`]), /vendor\/srvx@2\.0\.0/)
expectProblem('imported: an arbitrary intel file is not a dependency copy',
  lab({ 'R-1.md': note('R-1', { ...importedFields, targets: '[intel/summary.md:1]' }) }, [], ['.research/intel/summary.md']), /vendor\/srvx@1\.0\.8/)

// A well-formed record.
expectClean('valid notes pass', lab({
  'R-1.md': note('R-1'),
  'R-2.md': note('R-2', { links: '{supports: [R-1]}' }),
}))

// The indented list is YAML too, and it is the form a note written by hand reaches for.
// Reading only the bracket form reported every such note as missing its targets.
const blockNote = (targets = ['sources/app/src/x.ts::f', 'sources/app/src/x.ts::g']) => `---
id: R-1
source: app
kind: observation
state: open
labels:
  - area:auth
  - risk:auth-bypass
targets:
${targets.map(t => `  - ${t}`).join('\n')}
links: {}
checked_at: ${SHA}
---
# A claim
## Claim
Something checkable.
## Evidence
- sources/app/src/x.ts:1 shows it.
`
const tree = ['sources/app/src/x.ts']
expectClean('indented list fields parse', lab({ 'R-1.md': blockNote() }, [], tree))

// An anchor is a path a reader can open: the pinned tree, a vendored package, or the
// lab's own evidence. A paper audit cites the extract in intel/, and a run cites its log.
expectClean('evidence anchors into the record resolve', lab({
  'R-1.md': blockNote(['intel/paper.txt:10-20', 'runs/REQ-1/log.txt', 'sources/app/src/x.ts::f']),
}, [], [...tree, '.research/intel/paper.txt', '.research/runs/REQ-1/log.txt']))
expectProblem('an evidence anchor to a missing file is rejected', lab({
  'R-1.md': blockNote(['intel/paper.txt:10-20']),
}), /not in \.research\//)
expectClean('Lean declarations and patch artifacts resolve as evidence', lab({
  'R-1.md': blockNote(['lean/R-1/Main.lean::Main.bound', 'patches/R-1/change.patch']),
}, [], ['.research/lean/R-1/Main.lean', '.research/patches/R-1/change.patch']))
for (const target of ['lean/R-1/Missing.lean::Main.bound', 'patches/R-1/missing.patch'])
  expectProblem(`a missing artifact is rejected: ${target}`, lab({
    'R-1.md': blockNote([target]),
  }), /not in \.research\//)
expectProblem('a source anchor to a missing file is rejected', lab({
  'R-1.md': blockNote(['sources/app/src/gone.ts::f']),
}, [], tree), /not in sources\/app\//)
expectProblem('an anchor outside both trees is rejected', lab({
  'R-1.md': blockNote(['docs/notes.md']),
}, [], tree), /is not sources\//)

// A subagent's draft: id: draft, scratch path, links into the canonical notes.
const draftNote = (extra = {}) => {
  const fm = {
    id: 'draft', source: 'app', kind: 'observation', state: 'open',
    labels: '[area:auth, risk:auth-bypass]', targets: '[sources/app/src/x.ts::f]',
    links: '{}', checked_at: SHA, ...extra,
  }
  const head = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n')
  return `---\n${head}\n---\n# A draft\n## Claim\nSomething.\n## Evidence\n- sources/app/src/x.ts:1.\n`
}
{
  const root = labRoot({ 'R-1.md': note('R-1') }, ['srvx@1.0.8'])
  const scratch = scratchOf(root)
  writeFileSync(join(scratch, 'draft.md'), draftNote({ links: '{refutes: [R-1]}', checked_at: `${SHA} srvx@1.0.8` }))
  expectClean('draft mode: id draft, canonical links, vendor root from scratch', scratch, '--draft')
}
{
  const root = labRoot({ 'R-1.md': note('R-1') })
  const scratch = scratchOf(root)
  writeFileSync(join(scratch, 'draft.md'), draftNote({ id: 'R-9' }))
  expectProblem('draft mode still rejects a canonical id in a draft', scratch, /id: draft/, '--draft')
}
expectProblem('unbraced links are rejected', lab({
  'R-1.md': note('R-1', { links: 'refutes: [R-1]' }),
}), /not a \{relation/)

// The bug a hand-written linter hit: a relation list holding several ids.
expectClean('multi-target relation lists parse', lab({
  'R-1.md': note('R-1'),
  'R-2.md': note('R-2'),
  'R-3.md': note('R-3', { links: '{refutes: [R-1, R-2], depends_on: [R-1]}' }),
}))

expectProblem('dangling link names the note', lab({
  'R-1.md': note('R-1'),
  'R-2.md': note('R-2', { links: '{refutes: [R-99]}' }),
}), /R-2: link target R-99 does not exist/)

expectProblem('padded ids are rejected', lab({
  'R-000001.md': note('R-000001'),
}), /unpadded/)

expectProblem('bad kind is rejected', lab({
  'R-1.md': note('R-1', { kind: 'bug' }),
}), /kind "bug"/)

expectProblem('short checked_at is rejected', lab({
  'R-1.md': note('R-1', { checked_at: 'b243756' }),
}), /checked_at/)

expectProblem('dependency pin needs a vendor copy', lab({
  'R-1.md': note('R-1', { checked_at: `${SHA} srvx@1.0.8` }),
}), /vendor\/srvx@1\.0\.8/)

expectClean('dependency pin with a vendor copy passes', lab({
  'R-1.md': note('R-1', { checked_at: `${SHA} srvx@1.0.8` }),
}, ['srvx@1.0.8']))

expectClean('a vendor target with a vendor copy passes', lab({
  'R-1.md': note('R-1', { targets: '[vendor/srvx@1.0.8/index.mjs::serve]' }),
}, ['srvx@1.0.8']))

expectProblem('a vendor target without a copy is rejected', lab({
  'R-1.md': note('R-1', { targets: '[vendor/srvx@1.0.8/index.mjs::serve]' }),
}), /vendor\/srvx@1\.0\.8/)

const long = note('R-1')
expectProblem('long note needs a Summary', lab({
  'R-1.md': `${long}\n${'- filler line\n'.repeat(45)}`,
}), /Summary/)

expectProblem('relation text outside a list is rejected', lab({
  'R-1.md': note('R-1'),
  'R-2.md': note('R-2', { links: '{refutes: R-1}' }),
}), /links/)

// A missing field is a problem to report, not a crash in the summary table.
expectProblem('a note with no kind or state is reported, not a crash', lab({
  'R-1.md': note('R-1').replace(/^kind: .*\n/m, '').replace(/^state: .*\n/m, ''),
}), /kind "undefined"[\s\S]*state "undefined"/)

// Git keeps no empty directory, so a fresh clone has .research/ without notes/.
{
  const root = labRoot()
  rmSync(join(root, '.research', 'notes'), { recursive: true })
  const r = run('--dir', join(root, '.research', 'notes'))
  r.code === 0 && /^0 notes/.test(r.out) ? ok('a lab with no notes directory lints clean')
    : fail('a lab with no notes directory lints clean', r.out.slice(-600))
}
{
  const r = run('--dir')
  r.code === 2 && /usage/.test(r.out) ? ok('--dir without a path is a usage error')
    : fail('--dir without a path is a usage error', r.out.slice(-600))
}

// Checks beyond the author's argument are optional, unordered, and searchable.
expectClean('checks: optional', lab({ 'R-1.md': note('R-1') }))
expectClean('checks: any combination of review, run, proof', lab({ 'R-1.md': note('R-1', { checks: '[review, run, proof]' }) }))
expectProblem('checks: an unknown check is a typo to fix', lab({ 'R-1.md': note('R-1', { checks: '[kernel-checked]' }) }), /check "kernel-checked"/)
expectAdvice('labels: a family that repeats a field is advice, not failure', lab({ 'R-1.md': note('R-1', { labels: '[area:auth, status:independent]' }) }), /repeats what state or checks record/)
{
  const r = run('--dir', lab({ 'R-1.md': note('R-1', { labels: '[area:auth, review:statement-audit]' }) }), '--advice')
  !/repeats what/.test(r.out) ? ok('labels: a review: label naming an approach is fine') : fail('labels: a review: label naming an approach is fine', r.out.slice(-600))
}
// Routine lint stays brief: problems first, advice only as a count unless asked.
{
  const notes = lab({ 'R-1.md': note('R-1', { state: 'superseded' }), 'R-2.md': note('R-2', { targets: '[scratch/T-1/x]' }) }, [], ['.research/scratch/T-1/x'])
  const r = run('--dir', notes)
  r.code === 1 && /1 optional suggestion\(s\); --advice lists them/.test(r.out) && !/no note links supersedes/.test(r.out)
    && r.out.indexOf('problem(s)') < r.out.indexOf('optional suggestion')
    ? ok('advice: routine lint shows problems, then only a count') : fail('advice: routine lint shows problems, then only a count', r.out.slice(-800))
}
{
  const r = run('--dir', lab({ 'R-1.md': note('R-1') }))
  if (/checks: unrecorded=1/.test(r.out)) ok('checks: notes without the field are counted as unrecorded')
  else fail('checks: notes without the field are counted as unrecorded', r.out.slice(-600))
}

// LABELS.md is an optional shared vocabulary: unfamiliar labels are advice.
{
  const root = labRoot({ 'R-1.md': note('R-1') }, [], [])
  writeFileSync(join(root, '.research', 'LABELS.md'), '# Labels\n- `area:auth` sign-in and sessions\n')
  expectAdvice('labels: a label missing from LABELS.md is advice', join(root, '.research', 'notes'), /risk:auth-bypass" is not in \.research\/LABELS\.md/)
  writeFileSync(join(root, '.research', 'LABELS.md'), '# Labels\n- `area:auth` sign-in\n- `risk:auth-bypass` bypass\n')
  const r = run('--dir', join(root, '.research', 'notes'), '--advice')
  r.code === 0 && !/advice/.test(r.out) ? ok('labels: listed labels draw no advice') : fail('labels: listed labels draw no advice', r.out.slice(-600))
}
{
  const r = run('--dir', lab({ 'R-1.md': note('R-1') }), '--advice')
  !/LABELS/.test(r.out) ? ok('labels: a lab without LABELS.md is not nagged') : fail('labels: a lab without LABELS.md is not nagged', r.out.slice(-600))
}

// Durable notes cite durable evidence; scratch is not kept or packed.
expectProblem('targets: scratch is not durable evidence', lab({ 'R-1.md': note('R-1', { targets: '[scratch/T-1/out.txt]' }) }, [], ['.research/scratch/T-1/out.txt']), /in scratch\//)
{
  const root = labRoot({ 'R-1.md': note('R-1') })
  const dir = scratchOf(root)
  writeFileSync(join(dir, 'out.txt'), 'x\n')
  writeFileSync(join(dir, 'draft.md'), draftNote({ targets: '[scratch/T-1/out.txt]' }))
  expectClean('targets: a draft may cite its own scratch', dir, '--draft')
}

// Supersession is advised in both directions; it never blocks a record.
expectAdvice('supersedes: an old note still supported is advised', lab({
  'R-1.md': note('R-1', { state: 'supported' }),
  'R-2.md': note('R-2', { links: '{supersedes: [R-1]}' }),
}), /supersedes R-1, which is still supported/)
expectAdvice('supersedes: a superseded note without its replacement is advised', lab({ 'R-1.md': note('R-1', { state: 'superseded' }) }), /no note links supersedes to it/)
{
  const r = run('--dir', lab({ 'R-1.md': note('R-1', { state: 'superseded' }), 'R-2.md': note('R-2', { links: '{supersedes: [R-1]}' }) }), '--advice')
  r.code === 0 && !/advice/.test(r.out) ? ok('supersedes: a consistent replacement draws no advice') : fail('supersedes: a consistent replacement draws no advice', r.out.slice(-600))
}
// A pack import keeps a superseded pair as the pack recorded it, and lint passes.
{
  const imported = n => ({ imported_from: `newmath:R-${n} sha256:${PACK}`, reported_state: n === 5 ? 'superseded' : 'supported' })
  expectClean('imported: a superseded pair from a pack passes lint', lab({
    'R-1.md': note('R-1', { ...imported(5), state: 'superseded' }),
    'R-2.md': note('R-2', { ...imported(6), links: '{supersedes: [R-1]}' }),
  }))
  const r = run('--dir', lab({
    'R-1.md': note('R-1', imported(5)),
    'R-2.md': note('R-2', { ...imported(6), links: '{supersedes: [R-1]}' }),
  }))
  r.code === 0 ? ok('imported: a pair imported as open is advice, not failure') : fail('imported: a pair imported as open is advice, not failure', r.out.slice(-600))
}
expectAdvice('refutes: a still-supported target is flagged', lab({
  'R-1.md': note('R-1', { state: 'supported' }),
  'R-2.md': note('R-2', { kind: 'negation', state: 'supported', links: '{refutes: [R-1]}' }),
}), /R-2 refutes it while it is still supported/)

// Prose citations without links are invisible to impact reviews.
expectAdvice('links: an unlinked R-id in prose is advised', lab({
  'R-1.md': note('R-1'),
  'R-2.md': note('R-2', {}, 'This extends R-1 and newmath:R-7.\n'),
}), /R-2: mentions R-1 without a link/)
{
  const r = run('--dir', lab({ 'R-1.md': note('R-1'), 'R-2.md': note('R-2', {}, 'Compare newmath:R-1.\n') }), '--advice')
  !/mentions/.test(r.out) ? ok("links: another lab's id is not an unlinked mention") : fail("links: another lab's id is not an unlinked mention", r.out.slice(-600))
}
expectAdvice('length: a very long note is advised to split', lab({ 'R-1.md': note('R-1', {}, '## Summary\nverdict: x\n' + 'line\n'.repeat(220)) }), /lines; keep one claim here/)

// --sha must describe the file the lab will write.
const source = readFileSync(lint, 'utf8').replace(/\s+$/, '') + '\n'
const want = createHash('sha256').update(source).digest('hex')
const sha = spawnSync(process.execPath, [lint, '--sha'], { encoding: 'utf8' })
sha.status === 0 && sha.stdout.trim() === want
  ? ok('--sha matches the source that would be written')
  : fail('--sha matches the source that would be written', sha.stdout)

// The skill must hash the lab copy externally, never by running it.
const skillText = readFileSync(join(here, 'skills', 'lint.md'), 'utf8')
!/node \.research\/tools\/lint-notes\.mjs --sha/.test(skillText)
  ? ok('the skill hashes the copy instead of running it')
  : fail('the skill hashes the copy instead of running it', 'skill tells the lab to run the linter for its own hash')

for (const root of roots) rmSync(root, { recursive: true, force: true })
if (failures > 0) process.exit(1)
console.log('PASS')
