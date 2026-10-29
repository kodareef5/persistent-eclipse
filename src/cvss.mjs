// Usage: node cvss.mjs '<vector>' ...
// node cvss.mjs --sha prints the sha256 of this file, to check a copy is exact.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const V31 = {
  AV: ['Attack Vector', { N: ['Network', 0.85], A: ['Adjacent', 0.62], L: ['Local', 0.55], P: ['Physical', 0.2] }],
  AC: ['Attack Complexity', { L: ['Low', 0.77], H: ['High', 0.44] }],
  PR: ['Privileges Required', { N: ['None'], L: ['Low'], H: ['High'] }],
  UI: ['User Interaction', { N: ['None', 0.85], R: ['Required', 0.62] }],
  S: ['Scope', { U: ['Unchanged'], C: ['Changed'] }],
  C: ['Confidentiality', { H: ['High', 0.56], L: ['Low', 0.22], N: ['None', 0] }],
  I: ['Integrity', { H: ['High', 0.56], L: ['Low', 0.22], N: ['None', 0] }],
  A: ['Availability', { H: ['High', 0.56], L: ['Low', 0.22], N: ['None', 0] }],
}
const PR31 = { U: { N: 0.85, L: 0.62, H: 0.27 }, C: { N: 0.85, L: 0.68, H: 0.5 } }
const HLN = { H: ['High'], L: ['Low'], N: ['None'] }
const V40 = {
  AV: ['Attack Vector', { N: ['Network'], A: ['Adjacent'], L: ['Local'], P: ['Physical'] }],
  AC: ['Attack Complexity', { L: ['Low'], H: ['High'] }],
  AT: ['Attack Requirements', { N: ['None'], P: ['Present'] }],
  PR: ['Privileges Required', { N: ['None'], L: ['Low'], H: ['High'] }],
  UI: ['User Interaction', { N: ['None'], P: ['Passive'], A: ['Active'] }],
  VC: ['Vulnerable System Confidentiality', HLN], VI: ['Vulnerable System Integrity', HLN],
  VA: ['Vulnerable System Availability', HLN], SC: ['Subsequent System Confidentiality', HLN],
  SI: ['Subsequent System Integrity', HLN], SA: ['Subsequent System Availability', HLN],
}
const SPECS = { '3.1': V31, '4.0': V40 }

export const severity = s => s === 0 ? 'None' : s < 4 ? 'Low' : s < 7 ? 'Medium' : s < 9 ? 'High' : 'Critical'

// CVSS 3.1 Roundup
const roundup = x => { const i = Math.round(x * 100000); return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10 }

function score31(m) {
  const w = k => V31[k][1][m[k]][1]
  const iss = 1 - (1 - w('C')) * (1 - w('I')) * (1 - w('A'))
  const impact = m.S === 'U' ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
  const exploitability = 8.22 * w('AV') * w('AC') * PR31[m.S][m.PR] * w('UI')
  if (impact <= 0) return 0
  return m.S === 'U' ? roundup(Math.min(impact + exploitability, 10)) : roundup(Math.min(1.08 * (impact + exploitability), 10))
}

// CVSS 4.0 by the MacroVector method
const MACRO = Object.fromEntries(`
  000100:10 000101:9.6 000200:9.3 000201:9 001100:9.3 001101:9.2 001200:8.8 001201:8
  002101:7.9 002201:6.9 010100:9.5 010101:9.1 010200:9.2 010201:8.1 011100:9.2
  011101:8.2 011200:8.4 011201:7 012101:7.1 012201:6.3 100100:9.4 100101:8.9 100200:8.7
  100201:7.5 101100:8.6 101101:7.6 101200:7.2 101201:5.7 102101:6.5 102201:5.3 110100:9
  110101:7.7 110200:7.7 110201:6.6 111100:7.4 111101:5.9 111200:6.1 111201:5.2
  112101:5.8 112201:2.3 200100:8.6 200101:7.4 200200:7 200201:5.4 201100:7.2 201101:5.7
  201200:5.3 201201:3.6 202101:4.7 202201:2.4 210100:7.3 210101:5.5 210200:5.4
  210201:4.3 211100:6.1 211101:5.1 211200:4.6 211201:1.8 212101:2.4 212201:1
`.trim().split(/\s+/).map(e => { const [k, v] = e.split(':'); return [k, Math.round(Number(v) * 10)] }))

// Most severe first
const STEP = { AV: 'NALP', PR: 'NLH', UI: 'NPA', AC: 'LH', AT: 'NP', VC: 'HLN', VI: 'HLN', VA: 'HLN', SC: 'HLN', SI: 'HLN', SA: 'HLN' }
const step = (k, v) => STEP[k].indexOf(v)
const SCALE = 840 // Only integers
const CLASSES = [
  { metrics: ['AV', 'PR', 'UI'], depth: [1, 4, 5],
    top: [['AV:N/PR:N/UI:N'], ['AV:A/PR:N/UI:N', 'AV:N/PR:L/UI:N', 'AV:N/PR:N/UI:P'], ['AV:P/PR:N/UI:N', 'AV:A/PR:L/UI:P']] },
  { metrics: ['AC', 'AT'], depth: [1, 2], top: [['AC:L/AT:N'], ['AC:H/AT:N', 'AC:L/AT:P']] },
  { metrics: ['VC', 'VI', 'VA'], depth: [7, 8, 10],
    top: [['VC:H/VI:H/VA:H'], ['VC:L/VI:H/VA:H', 'VC:H/VI:L/VA:H'], ['VC:L/VI:L/VA:L']] },
  { metrics: ['SC', 'SI', 'SA'], depth: [6, 5, 4], top: [[], ['SC:H/SI:H/SA:H'], ['SC:L/SI:L/SA:L']] },
]

function score40(m) {
  if (['VC', 'VI', 'VA', 'SC', 'SI', 'SA'].every(k => m[k] === 'N')) return 0
  const vHigh = m.VC === 'H' || m.VI === 'H' || m.VA === 'H'
  const level = [
    m.AV === 'N' && m.PR === 'N' && m.UI === 'N' ? 0 : m.AV !== 'P' && (m.AV === 'N' || m.PR === 'N' || m.UI === 'N') ? 1 : 2,
    m.AC === 'L' && m.AT === 'N' ? 0 : 1,
    m.VC === 'H' && m.VI === 'H' ? 0 : vHigh ? 1 : 2,
    m.SC === 'H' || m.SI === 'H' || m.SA === 'H' ? 1 : 2,
  ]
  const eq6 = vHigh ? 0 : 1
  const macro = ([a, b, c, d], f = eq6) => MACRO[`${a}${b}${c}${d}0${f}`]
  const here = macro(level)
  const lower = i => {
    if (i !== 2) return macro(level.map((l, j) => j === i ? l + 1 : l))
    const [a, b, c, d] = level
    if (c === 0) return Math.max(macro([a, b, 0, d], 1), macro([a, b, 1, d], 0))
    return c === 1 ? macro([a, b, 1, d], 1) : undefined
  }
  let sum = 0, classes = 1
  for (const [i, c] of CLASSES.entries()) {
    const next = lower(i)
    if (next === undefined) continue
    classes++
    const top = c.top[level[i]].map(v => Object.fromEntries(v.split('/').map(p => p.split(':'))))
      .find(t => c.metrics.every(k => step(k, m[k]) >= step(k, t[k])))
    if (!top) throw new Error(`no most severe vector above this one in ${c.metrics.join('/')}`)
    const distance = c.metrics.reduce((s, k) => s + step(k, m[k]) - step(k, top[k]), 0)
    sum += (here - next) * distance * (SCALE / c.depth[level[i]])
  }
  const den = SCALE * classes
  const tenths = Math.floor((2 * (here * den - sum) + den) / (2 * den))
  return Math.min(100, Math.max(0, tenths)) / 10
}

export function parse(vector) {
  const [prefix, ...parts] = String(vector ?? '').trim().split('/')
  const version = { 'CVSS:3.1': '3.1', 'CVSS:4.0': '4.0' }[prefix]
  if (!version) throw new Error(`start the vector with CVSS:3.1/ or CVSS:4.0/, not "${prefix}"`)
  const spec = SPECS[version], choices = {}
  for (const part of parts) {
    const [metric, values, extra] = part.split(':')
    if (extra !== undefined || !values) throw new Error(`"${part}" is not Metric:Value`)
    if (!spec[metric]) throw new Error(`${metric} is not a CVSS ${version} base metric; score base metrics only, and record threat or environment in the note`)
    if (choices[metric]) throw new Error(`${metric} appears twice`)
    const list = values.split('|')
    for (const v of list) if (!spec[metric][1][v]) throw new Error(`${metric}:${v} is not valid; use ${Object.keys(spec[metric][1]).join(', ')}`)
    if (new Set(list).size !== list.length) throw new Error(`${metric} repeats a value`)
    choices[metric] = list
  }
  const missing = Object.keys(spec).filter(k => !choices[k])
  if (missing.length) throw new Error(`missing ${missing.join(', ')}; a base vector needs every one of ${Object.keys(spec).join(', ')}`)
  return { version, choices }
}

const text = (version, m) => `CVSS:${version}/` + Object.keys(SPECS[version]).map(k => `${k}:${[].concat(m[k]).join('|')}`).join('/')

export function score(vector) {
  const { version, choices } = parse(vector)
  const keys = Object.keys(SPECS[version]), calc = version === '3.1' ? score31 : score40
  let combos = [{}]
  for (const k of keys) combos = combos.flatMap(c => choices[k].map(v => ({ ...c, [k]: v })))
  const scored = combos.map(m => ({ m, s: calc(m) }))
  const low = scored.reduce((a, b) => b.s < a.s ? b : a), high = scored.reduce((a, b) => b.s > a.s ? b : a)
  const undecided = keys.filter(k => choices[k].length > 1)
  const decides = undecided.filter(k => scored.some(({ m, s }) => choices[k].some(v => severity(calc({ ...m, [k]: v })) !== severity(s))))
  const restsOn = low.s === 0 ? [] : keys.filter(k => Object.keys(SPECS[version][k][1]).some(v => severity(calc({ ...low.m, [k]: v })) !== severity(low.s)))
  const end = ({ m, s }) => ({ score: s, severity: severity(s), vector: text(version, m) })
  return { version, vector: text(version, choices), low: end(low), high: end(high), undecided, decides, restsOn,
    metrics: keys.map(k => ({ metric: k, name: SPECS[version][k][0], values: choices[k].map(v => SPECS[version][k][1][v][0]) })) }
}

function report(r) {
  const f = s => s.toFixed(1)
  const band = r.low.severity === r.high.severity ? r.low.severity : `${r.low.severity} to ${r.high.severity}`
  const lines = [r.vector, `score: ${r.low.score === r.high.score ? f(r.low.score) : `${f(r.low.score)} to ${f(r.high.score)}`}, ${band}`]
  for (const m of r.metrics) lines.push(`  ${m.metric}: ${m.name}, ${m.values.join(' or ')}`)
  if (r.undecided.length) {
    lines.push(`low: ${f(r.low.score)} ${r.low.severity}  ${r.low.vector}`, `high: ${f(r.high.score)} ${r.high.severity}  ${r.high.vector}`)
    lines.push(r.decides.length ? `decides the band: ${r.decides.join(', ')}` : `undecided: ${r.undecided.join(', ')}; the band is the same for every choice`)
  }
  if (r.restsOn.length) lines.push(`${r.low.severity} at the low end rests on: ${r.restsOn.join(', ')}`)
  return lines.join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vectors = process.argv.slice(2)
  if (vectors[0] === '--sha') {
    console.log(createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url), 'utf8').trimEnd() + '\n').digest('hex'))
    process.exit(0)
  }
  if (!vectors.length) { console.error("usage: node cvss.mjs 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' ..."); process.exit(2) }
  let failed = false
  for (const v of vectors) {
    try { console.log(report(score(v))) } catch (e) { console.error(`${v}\nerror: ${e.message}`); failed = true }
  }
  process.exit(failed ? 1 : 0)
}
