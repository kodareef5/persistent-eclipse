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
expectAdvice('long note without a Summary is advice', lab({
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
expectAdvice('labels: their count is advice, not failure', lab({ 'R-1.md': note('R-1', { labels: '[area:auth]' }) }), /labels has 1 entries; two to four search best/)
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

// Shared labs: ids name their lab once .research/labs/ exists.
const shared = (notes, labs = ['mac', 'gpu'], files = []) => {
  const root = labRoot(notes, [], files)
  for (const name of labs) mkdirSync(join(root, '.research', 'labs', name), { recursive: true })
  return root
}
const notesOf = root => join(root, '.research', 'notes')
expectClean('shared: qualified ids and links pass', notesOf(shared({
  'R-mac-1.md': note('R-mac-1'),
  'R-gpu-1.md': note('R-gpu-1', { links: '{depends_on: [R-mac-1]}' }),
})))
expectClean('solo: a qualified id is fine without labs/', lab({ 'R-mac-3.md': note('R-mac-3') }))
expectClean('shared: unnamed and named ids live together', notesOf(shared({
  'R-17.md': note('R-17'),
  'R-mac-18.md': note('R-mac-18', { links: '{depends_on: [R-17]}' }),
})))
expectAdvice('shared: a lab without a folder is advice', notesOf(shared({ 'R-dsk-1.md': note('R-dsk-1') })), /lab "dsk" has no \.research\/labs\/dsk\/ folder yet/)
{
  const r = run('--dir', notesOf(shared({ 'R-dsk-1.md': note('R-dsk-1') })), '--strict')
  r.code === 1 && /lab "dsk"/.test(r.out) ? ok('strict: advice fails under --strict') : fail('strict: advice fails under --strict', r.out.slice(-600))
}
expectProblem('ids: a lab id is lowercase and starts with a letter', lab({ 'R-Mac-1.md': note('R-Mac-1') }), /R-<lab>-<n> id/)
expectAdvice('shared: an unlinked qualified mention is advised', notesOf(shared({
  'R-mac-1.md': note('R-mac-1'),
  'R-gpu-2.md': note('R-gpu-2', {}, 'This extends R-mac-1.\n'),
})), /R-gpu-2: mentions R-mac-1 without a link/)
expectClean('imported: a qualified id from another lab', lab({ 'R-1.md': note('R-1', { imported_from: `ethfalse:R-gpu-5 sha256:${PACK}`, reported_state: 'open' }) }))

// --qualify renames a lab's notes and runs and rewrites the prose that cites them,
// but leaves hashed evidence alone.
{
  const root = labRoot({
    'R-1.md': note('R-1', { targets: '[runs/REQ-2/out.txt]' }),
    'R-2.md': note('R-2', { links: '{depends_on: [R-1]}', targets: '[runs/REQ-2/R-2-update.md]' }, 'Builds on R-1 and newmath:R-1; see REQ-2.\n'),
  }, [], ['.research/runs/REQ-2/out.txt', '.research/runs/REQ-2/R-2-update.md', '.research/lean/R-1/Main.lean'])
  const r = (...a) => spawnSync(process.execPath, [lint, ...a], { encoding: 'utf8', cwd: root })
  writeFileSync(join(root, '.research', 'STATUS.md'), '# Status\nR-2 holds; R-1 is open. REQ-2 reran.\n')
  writeFileSync(join(root, '.research', 'runs', 'REQ-2', 'out.txt'), 'checked R-1 here\n')
  writeFileSync(join(root, '.research', 'runs', 'REQ-2', 'README.md'), '# REQ-2\nSupports R-1.\n')
  const dry = r('--qualify', 'mac')
  dry.status === 0 && /notes\/R-1\.md -> notes\/R-mac-1\.md/.test(dry.stdout) && /runs\/REQ-2 -> runs\/REQ-mac-2/.test(dry.stdout)
    && /left as written[\s\S]*runs\/REQ-2\/out\.txt: R-1/.test(dry.stdout) && readFileSync(join(root, '.research', 'notes', 'R-1.md'), 'utf8').includes('id: R-1\n')
    ? ok('qualify: the dry run reports and changes nothing') : fail('qualify: the dry run reports and changes nothing', dry.stdout + dry.stderr)
  const done = r('--qualify', 'mac', '--write')
  const read = rel => readFileSync(join(root, '.research', rel), 'utf8')
  mkdirSync(join(root, '.research', 'labs', 'mac'), { recursive: true })
  const after = r('--dir', '.research/notes')
  done.status === 0 && read('notes/R-mac-2.md').includes('links: {depends_on: [R-mac-1]}') && read('notes/R-mac-2.md').includes('Builds on R-mac-1 and newmath:R-1; see REQ-mac-2.')
    && read('notes/R-mac-1.md').includes('targets: [runs/REQ-mac-2/out.txt]') && read('STATUS.md').includes('R-mac-2 holds; R-mac-1 is open. REQ-mac-2 reran.')
    && read('runs/REQ-mac-2/README.md').includes('Supports R-mac-1.') && read('runs/REQ-mac-2/out.txt') === 'checked R-1 here\n'
    && read('lean/R-mac-1/Main.lean') === 'x\n'
    && after.status === 0
    ? ok('qualify: --write renames, rewrites prose, keeps evidence, and lints clean') : fail('qualify: --write renames, rewrites prose, keeps evidence, and lints clean', done.stdout + done.stderr + after.stdout)
  // A report the record vouches for by hash keeps its bytes.
  {
    const root2 = labRoot({ 'R-1.md': note('R-1') })
    const report = '# Report\nR-1 holds.\n'
    mkdirSync(join(root2, '.research', 'reports'), { recursive: true })
    writeFileSync(join(root2, '.research', 'reports', 'final.md'), report)
    writeFileSync(join(root2, '.research', 'reports', 'draft.md'), report.replace('holds', 'may hold'))
    mkdirSync(join(root2, '.research', 'local'), {recursive: true})
    writeFileSync(join(root2, '.research', 'local', 'session.jsonl'), createHash('sha256').update(report.replace('holds', 'may hold')).digest('hex'))
    const digest = createHash('sha256').update(report).digest('hex')
    writeFileSync(join(root2, '.research', 'notes', 'R-2.md'), note('R-2', { targets: '[reports/final.md]', checked_at: `sha256:${digest}` }))
    const q = spawnSync(process.execPath, [lint, '--qualify', 'mac', '--write'], { encoding: 'utf8', cwd: root2 })
    const kept = readFileSync(join(root2, '.research', 'reports', 'final.md'), 'utf8') === report
    const moved = readFileSync(join(root2, '.research', 'reports', 'draft.md'), 'utf8').includes('R-mac-1 may hold')
    q.status === 0 && kept && moved && /left as written[\s\S]*reports\/final\.md/.test(q.stdout)
      ? ok('qualify: a hashed report keeps its bytes; a hash in private session history does not pin a draft') : fail('qualify: a hashed report keeps its bytes; an unhashed one is rewritten', q.stdout + q.stderr)
  }
  const again = r('--qualify', 'mac')
  if (/nothing to qualify/.test(again.stdout)) ok('qualify: a qualified lab has nothing to do')
  else fail('qualify: a qualified lab has nothing to do', again.stdout)
  const bad = r('--qualify', 'Mac')
  bad.status === 2 ? ok('qualify: rejects a bad lab id') : fail('qualify: rejects a bad lab id', bad.stdout + bad.stderr)
}

// The inbox: messages between member labs.
{
  const message = (fields, body = '# Hello\n') => `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}`
  const withInbox = messages => {
    const root = shared({ 'R-mac-1.md': note('R-mac-1') })
    mkdirSync(join(root, '.research', 'inbox'), { recursive: true })
    for (const [name, text] of Object.entries(messages)) writeFileSync(join(root, '.research', 'inbox', name), text)
    return root
  }
  const good = { from: 'gpu', to: 'mac', kind: 'request', state: 'open', re: '[R-mac-1]' }
  {
    const root = withInbox({ '2026-10-29-gpu-review.md': message(good), '2026-10-29-mac-hello.md': message({ from: 'mac', to: 'all', kind: 'hello', state: 'open' }) })
    spawnSync('git', ['init', '-q'], { cwd: root })
    spawnSync('git', ['config', 'pe.lab', 'mac'], { cwd: root })
    const r = run('--dir', notesOf(root))
    r.code === 0 && /inbox: 2 open, 1 to mac/.test(r.out) ? ok('inbox: well-formed messages pass and open ones are counted for this lab') : fail('inbox: well-formed messages pass and open ones are counted for this lab', r.out.slice(-600))
  }
  expectAdvice('inbox: the name carries the date and sender', notesOf(withInbox({ 'review.md': message(good) })), /name is not <yyyy-mm-dd>-<from lab>-<slug>\.md/)
  expectAdvice('inbox: from matches the name', notesOf(withInbox({ '2026-10-29-mac-review.md': message(good) })), /from "gpu" does not match/)
  expectAdvice('inbox: labs are members', notesOf(withInbox({ '2026-10-29-gpu-review.md': message({ ...good, to: 'tpu' }) })), /lab "tpu" has no/)
  expectAdvice('inbox: kind and state come from the lists', notesOf(withInbox({ '2026-10-29-gpu-review.md': message({ ...good, kind: 'memo', state: 'pending' }) })), /kind "memo"[\s\S]*state "pending"/)
  expectAdvice('inbox: a reply names what it answers', notesOf(withInbox({ '2026-10-29-gpu-ok.md': message({ ...good, kind: 'reply', re: '[]' }) })), /a reply names what it answers/)
  expectAdvice('inbox: an expired open claim is advised', notesOf(withInbox({ '2026-10-29-gpu-take.md': message({ ...good, to: 'all', kind: 'claim', until: '2026-01-01' }) })), /claim expired on 2026-01-01/)
}

// --push checks what a push would send.
{
  const git = (root, ...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' })
  const committed = (notes, files = {}) => {
    const root = labRoot(notes, [], [])
    for (const [rel, bytes] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true })
      writeFileSync(join(root, rel), bytes)
    }
    git(root, 'init', '-q')
    git(root, 'add', '-A')
    git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'x')
    return root
  }
  const push = root => spawnSync(process.execPath, [lint, '--push'], { cwd: root, encoding: 'utf8' })
  const target = { targets: '[runs/REQ-1/out.txt]' }
  {
    const root = committed({ 'R-1.md': note('R-1', target) }, { '.research/runs/REQ-1/out.txt': 'fine\n' })
    const r = push(root)
    r.status === 0 ? ok('push: a clean record passes') : fail('push: a clean record passes', r.stdout)
  }
  {
    const key = 'sk-or-v1-' + 'a'.repeat(40)
    const root = committed({ 'R-1.md': note('R-1', target) }, { '.research/runs/REQ-1/out.txt': `key=${key}\n` })
    const r = push(root)
    r.status === 1 && /\.research\/runs\/REQ-1\/out\.txt:1: looks like a credential/.test(r.stdout) ? ok('push: a credential fails') : fail('push: a credential fails', r.stdout)
  }
  {
    const big = Buffer.alloc(6 * 2 ** 20, 'a')
    const root = committed({ 'R-1.md': note('R-1', target) }, { '.research/runs/REQ-1/out.txt': 'x\n', '.research/runs/REQ-1/big.bin': big })
    const r = push(root)
    r.status === 1 && /big\.bin: 6\.0 MiB; reference it/.test(r.stdout) ? ok('push: a large file fails') : fail('push: a large file fails', r.stdout)
    writeFileSync(join(root, '.research', 'LARGE.md'), '- `.research/runs/REQ-1/big.bin`: the solver input, too costly to rebuild\n')
    const r2 = push(root)
    r2.status === 0 ? ok('push: LARGE.md allows a listed file') : fail('push: LARGE.md allows a listed file', r2.stdout)
  }
  {
    const root = committed({ 'R-1.md': note('R-1', target) })
    mkdirSync(join(root, '.research', 'runs', 'REQ-1'), { recursive: true })
    writeFileSync(join(root, '.research', 'runs', 'REQ-1', 'out.txt'), 'later\n')
    const r = push(root)
    r.status === 1 && /target "runs\/REQ-1\/out\.txt" is not committed/.test(r.stdout) ? ok('push: an uncommitted target fails') : fail('push: an uncommitted target fails', r.stdout)
  }
}

{
  const git = (root, ...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' })
  const commit = (root, message) => { git(root, 'add', '-A'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', message) }
  const push = root => spawnSync(process.execPath, [lint, '--push'], { cwd: root, encoding: 'utf8' })
  // A credential committed and then deleted still travels in history.
  {
    const root = labRoot({ 'R-1.md': note('R-1') })
    git(root, 'init', '-q')
    writeFileSync(join(root, '.research', 'key.txt'), 'token=ghp_' + 'b'.repeat(36) + '\n')
    commit(root, 'oops')
    rmSync(join(root, '.research', 'key.txt'))
    commit(root, 'remove it')
    const r = push(root)
    r.status === 1 && /key\.txt \(in an outgoing commit, no longer at HEAD\):1: looks like a credential/.test(r.stdout)
      ? ok('push: a credential in an earlier outgoing commit fails') : fail('push: a credential in an earlier outgoing commit fails', r.stdout)
  }
  // Vendor evidence must arrive with the push too.
  {
    const root = labRoot({ 'R-1.md': note('R-1', { targets: '[vendor/srvx@1.0.8/index.mjs]' }) })
    git(root, 'init', '-q')
    commit(root, 'note')
    mkdirSync(join(root, '.research', 'vendor', 'srvx@1.0.8'), { recursive: true })
    writeFileSync(join(root, '.research', 'vendor', 'srvx@1.0.8', 'index.mjs'), 'x\n')
    const r = push(root)
    r.status === 1 && /target "vendor\/srvx@1\.0\.8\/index\.mjs" is not committed/.test(r.stdout)
      ? ok('push: uncommitted vendor evidence fails') : fail('push: uncommitted vendor evidence fails', r.stdout)
  }
  // The lab remote decides, not Git's default destination.
  {
    const bare = mkdtempSync(join(tmpdir(), 'pe-remote-'))
    roots.push(bare)
    git(bare, 'init', '-q', '--bare')
    const root = labRoot({ 'R-1.md': note('R-1') })
    writeFileSync(join(root, '.research', 'LAB.md'), '# Lab\n\n    Sync: shared main\n')
    git(root, 'init', '-q', '-b', 'main')
    commit(root, 'lab')
    git(root, 'remote', 'add', 'origin', bare)
    git(root, 'remote', 'add', 'shared', bare)
    git(root, 'push', '-q', '-u', 'origin', 'main')
    git(root, 'fetch', '-q', 'shared')
    const r = push(root)
    r.status === 1 && /git push would go to origin\/main, but the lab shares shared\/main/.test(r.stdout)
      ? ok('push: a default destination other than the lab remote fails') : fail('push: a default destination other than the lab remote fails', r.stdout)
    git(root, 'branch', '-q', '--set-upstream-to=shared/main')
    const r2 = push(root)
    r2.status === 0 ? ok('push: the lab remote as upstream passes') : fail('push: the lab remote as upstream passes', r2.stdout)
    // The Sync line is read alone, never with the next line as its branch.
    writeFileSync(join(root, '.research', 'LAB.md'), '# Lab\n\n    Sync: origin\nUnnamed ids: old\n')
    git(root, 'branch', '-q', '--set-upstream-to=origin/main')
    const r3 = push(root)
    r3.status === 0 ? ok('push: a Sync line without a branch means main, whatever follows it') : fail('push: a Sync line without a branch means main, whatever follows it', r3.stdout)
  }
}

// One credential list: the linter's push check and the packer warn on the same patterns.
{
  const list = file => /const SECRETS = (\[[\s\S]*?\]);/.exec(readFileSync(join(here, file), 'utf8'))?.[1]
  list('lint-notes.mjs') && list('lint-notes.mjs') === list('pack.mjs') ? ok('push: SECRETS matches pack.mjs') : fail('push: SECRETS matches pack.mjs', 'the two lists differ')
}

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
