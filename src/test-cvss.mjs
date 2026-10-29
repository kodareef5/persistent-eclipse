// Checks cvss.mjs on every base vector, 2,592 for CVSS 3.1 and 104,976 for CVSS 4.0
// Usage: node src/test-cvss.mjs
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { score } from './cvss.mjs'

const src = dirname(fileURLToPath(import.meta.url))
const ok = label => console.log('ok  ', label)
const all = spec => Object.entries(spec).reduce((acc, [k, vs]) => acc.flatMap(a => [...vs].map(v => ({ ...a, [k]: v }))), [{}])
const vec = (version, m) => `CVSS:${version}/` + Object.entries(m).map(([k, v]) => `${k}:${v}`).join('/')

const ORACLE = 'ae-cvss-calculator@1.0.13'
const cache = join(tmpdir(), 'pe-cvss-oracle-1.0.13')
if (!existsSync(join(cache, 'node_modules', 'ae-cvss-calculator'))) {
  mkdirSync(cache, { recursive: true })
  execFileSync('npm', ['install', '--prefix', cache, '--ignore-scripts', '--no-audit', '--no-fund', '--silent', ORACLE], { stdio: 'inherit' })
}
const { Cvss3P1, Cvss4P0 } = createRequire(join(cache, 'package.json'))('ae-cvss-calculator')

// CVSS 3.1
let n = 0
for (const m of all({ AV: 'NALP', AC: 'LH', PR: 'NLH', UI: 'NR', S: 'UC', C: 'HLN', I: 'HLN', A: 'HLN' })) {
  const v = vec('3.1', m), want = new Cvss3P1(v).calculateScores().base
  assert.equal(score(v).low.score, want, v)
  n++
}
ok(`CVSS 3.1: all ${n} base vectors match ${ORACLE}`)

// CVSS 4.0
n = 0
for (const m of all({ AV: 'NALP', AC: 'LH', AT: 'NP', PR: 'NLH', UI: 'NPA', VC: 'HLN', VI: 'HLN', VA: 'HLN', SC: 'HLN', SI: 'HLN', SA: 'HLN' })) {
  const v = vec('4.0', m), want = new Cvss4P0(v).calculateScores().overall
  assert.equal(score(v).low.score, want, v)
  n++
}
ok(`CVSS 4.0: all ${n} base vectors match ${ORACLE}`)

// Ranges
let r = score('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U|C/C:H/I:H/A:H')
assert.deepEqual([r.low.score, r.high.score, r.undecided, r.decides], [9.8, 10, ['S'], []])
r = score('CVSS:3.1/AV:N/AC:L|H/PR:N/UI:N/S:U/C:H/I:H/A:H')
assert.deepEqual([r.low.score, r.low.severity, r.high.score, r.decides], [8.1, 'High', 9.8, ['AC']])
assert.deepEqual(score('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H').restsOn, ['AV', 'AC', 'PR', 'UI'])
assert.equal(r.low.vector, 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H')
r = score('CVSS:4.0/AV:N/AC:L/AT:N|P/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N')
assert.deepEqual([r.low.score, r.high.score, r.decides], [9.2, 9.3, []])
assert.equal(score('CVSS:3.1/A:H/I:H/C:H/S:U/UI:N/PR:N/AC:L/AV:N').vector, 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')
ok('ranges report both ends, the deciding metrics, and a canonical order')

const refuses = (v, re) => assert.throws(() => score(v), re, v)
refuses('CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', /CVSS:3.1\/ or CVSS:4.0\//)
refuses('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H', /missing A/)
refuses('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:F', /not a CVSS 3.1 base metric/)
refuses('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:R/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N', /UI:R is not valid; use N, P, A/)
refuses('CVSS:3.1/AV:N/AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', /AV appears twice/)
refuses('', /start the vector/)
ok('it refuses versions, metrics, and values it does not score')

const code = readFileSync(join(src, 'cvss.mjs'), 'utf8')
const sha = createHash('sha256').update(code.trimEnd() + '\n').digest('hex')
const yml = readFileSync(join(src, '..', 'cordis.patch.yml'), 'utf8')
const fence = yml.match(/^( +)```js cvss\.mjs\n([\s\S]*?)^\1```$/m)
assert.ok(fence, 'cordis.patch.yml has no cvss.mjs block')
const inlined = fence[2].split('\n').map(l => l.slice(fence[1].length)).join('\n')
assert.equal(inlined, code, 'the cvss.mjs block in cordis.patch.yml differs from src/cvss.mjs')
assert.ok(yml.includes(sha), 'cordis.patch.yml does not state the sha256 of cvss.mjs')
assert.ok(!/node \.research\/tools\/cvss\.mjs --sha/.test(yml), 'the skill tells the lab to run the calculator to hash it')
ok(`cordis.patch.yml carries cvss.mjs exactly, sha256 ${sha.slice(0, 12)}`)
console.log('PASS')
