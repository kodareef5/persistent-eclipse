// Usage: node ledger.mjs <command> [options]
//
//   add        --key K --p P --closes WHEN --question TEXT
//              [--base B] [--via SOURCE] [--by WHO] [--file DRAFT] [--lab LAB]
//   merge      DRAFT... [--lab LAB]   append a researcher's draft rows with new F-ids
//   resolve    --key K --outcome 1|0|void --evidence TEXT [--known WHEN]
//   check                        validate both files; confirm Git history only appended
//   score      [--group via|by] [--committed]
//   hn-resolve --runs DIR [--gap 60]
//   hn-base    --runs DIR [--hours 24] [--gap 60] [--age MIN --points N]
//   hn-misses  --runs DIR [--hours 24] [--gap 60] [--all]
//
// The ledger is two tab-separated files under .research/, moved with --forecasts and
// --resolutions. Rows are only ever appended. A forecast is revised by adding a new
// row with the same key; each lab resolves a key once. Shared resolutions are kept.
// Different outcomes or known times are disputed: check names them, score leaves
// that key out, and researchers evaluate the evidence in ordinary review notes.
// Use --resolutions for an explicitly reviewed set; never erase the original views.
// `check` fails on malformed rows; `score` and `hn-resolve` skip them and say so.
//
// IDs are F-<n>, or F-<lab>-<n> with --lab, for labs that share one record through Git.
// Shared labs also mark the ledger `merge=union` in .gitattributes, so two labs'
// appends merge without conflict; the history audit follows first parents.
//
// Merge deduplicates identical forecast content, including `by`, excluding the
// reassigned F-id. Give independent forecasters distinct, stable --by values;
// otherwise identical anonymous rows cannot be distinguished from reimports.
//
// forecasts.tsv    id made key p base closes via by question
// resolutions.tsv  key resolved outcome known evidence
//
// Times are UTC, as 2026-11-01T14:05:09Z, or a date alone. A date alone in `closes`
// means the end of that day; anywhere else, its start. `known` is when the outcome first became visible; a
// forecast made at or after it is late and is not scored. `-` marks an empty field.
//
// The hn-* commands read hn-collect.mjs output. A key hn:<story id>:front<H> asks
// whether the story reaches the front page within H hours of submission.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const F_COLS = ["id", "made", "key", "p", "base", "closes", "via", "by", "question"];
const R_COLS = ["key", "resolved", "outcome", "known", "evidence"];
const KEY_RE = /^[a-z0-9][a-z0-9:._\/-]*$/;
const ID_RE = /^F-(?:([a-z][a-z0-9]{1,11})-)?[1-9]\d*$/;
const LAB_RE = /^[a-z][a-z0-9]{1,11}$/;
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9:._@/-]*$/;
const TIME_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?Z)?$/;
const HN_RE = /^hn:(\d+):front(\d+)$/;

const [command, ...argv] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(name);
const forecastsFile = flag("--forecasts", ".research/forecasts.tsv");
const resolutionsFile = flag("--resolutions", ".research/resolutions.tsv");

function fail(message) {
  console.error(`ledger: ${message}`);
  process.exit(1);
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
// A date alone is the start of its day, or with `end` the last second of it.
function time(text, end = false) {
  if (typeof text !== "string" || !TIME_RE.test(text)) return NaN;
  const ms = Date.parse(text);
  // Date.parse rolls 2026-02-30 over to March; refuse dates that don't exist.
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== text.slice(0, 10)) return NaN;
  return text.length === 10 && end ? ms + 86_399_000 : ms;
}
const prob = (text) => (typeof text === "string" && /^(0(\.\d+)?|1(\.0+)?)$/.test(text) ? Number(text) : NaN);
const text = (v) => typeof v === "string" && v.trim() !== "";

function read(file, cols) {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines[0] !== cols.join("\t")) fail(`${file}: the first line must be the header: ${cols.join(" ")}`);
  return lines.slice(1).map((line, i) => {
    const cells = line.split("\t");
    const row = Object.fromEntries(cols.map((c, j) => [c, cells[j]]));
    row.line = i + 2;
    row.extra = cells.length - cols.length;
    return row;
  });
}
function append(file, cols, rows) {
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, cols.join("\t") + "\n");
  }
  for (const row of rows)
    for (const c of cols)
      if (/[\t\n]/.test(String(row[c]))) fail(`${c} may not contain a tab or newline`);
  appendFileSync(file, rows.map((r) => cols.map((c) => r[c]).join("\t") + "\n").join(""));
}

function forecastProblems(rows, label) {
  const problems = [];
  const ids = new Set();
  for (const r of rows) {
    const at = `${label}:${r.line}`;
    if (r.extra !== 0) { problems.push(`${at}: has ${F_COLS.length + r.extra} fields, wants ${F_COLS.length}`); r.bad = true; continue; }
    const before = problems.length;
    if (!ID_RE.test(r.id ?? "")) problems.push(`${at}: id "${r.id}" is not F-<n> or F-<lab>-<n>`);
    else if (ids.has(r.id)) problems.push(`${at}: ${r.id} is used twice`);
    ids.add(r.id);
    if (Number.isNaN(time(r.made))) problems.push(`${at}: made "${r.made}" is not a UTC time`);
    if (!text(r.key) || !KEY_RE.test(r.key)) problems.push(`${at}: key "${r.key ?? ""}" is not lowercase [a-z0-9:._/-]`);
    if (Number.isNaN(prob(r.p))) problems.push(`${at}: p "${r.p}" is not a probability from 0 to 1`);
    if (r.base !== "-" && Number.isNaN(prob(r.base))) problems.push(`${at}: base "${r.base}" is not - or a probability`);
    const closes = time(r.closes, true);
    if (Number.isNaN(closes)) problems.push(`${at}: closes "${r.closes}" is not a UTC time or date`);
    else if (closes <= time(r.made)) problems.push(`${at}: closes before it was made`);
    for (const c of ["via", "by"]) if (r[c] !== "-" && !(text(r[c]) && TOKEN_RE.test(r[c]))) problems.push(`${at}: ${c} "${r[c] ?? ""}" is not - or one word`);
    if (!text(r.question)) problems.push(`${at}: question is empty`);
    if (problems.length > before) r.bad = true;
  }
  return problems;
}
function resolutionProblems(rows, forecasts, label) {
  const problems = [];
  const keys = new Set(forecasts.map((f) => f.key));
  for (const r of rows) {
    const at = `${label}:${r.line}`;
    if (r.extra !== 0) { problems.push(`${at}: has ${R_COLS.length + r.extra} fields, wants ${R_COLS.length}`); r.bad = true; continue; }
    const before = problems.length;
    if (!text(r.key)) problems.push(`${at}: key is empty`);
    if (!keys.has(r.key)) problems.push(`${at}: no forecast has key ${r.key}`);
    if (Number.isNaN(time(r.resolved))) problems.push(`${at}: resolved "${r.resolved}" is not a UTC time`);
    if (!["1", "0", "void"].includes(r.outcome)) problems.push(`${at}: outcome "${r.outcome}" is not 1, 0, or void`);
    if (r.known !== "-" && Number.isNaN(time(r.known))) problems.push(`${at}: known "${r.known}" is not - or a UTC time`);
    else if (r.known !== "-" && time(r.known) > time(r.resolved)) problems.push(`${at}: known is later than resolved`);
    if (!text(r.evidence) || r.evidence === "-") problems.push(`${at}: evidence is empty`);
    if (problems.length > before) r.bad = true;
  }
  return problems;
}

// Each commit on the first-parent line that touched a file, oldest first, with the
// file's lines at that commit. Returns undefined when the file is not tracked by Git.
function history(file) {
  const dir = dirname(resolve(file));
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 30 });
  let root, log;
  try {
    root = git("rev-parse", "--show-toplevel").trim();
    log = git("log", "--first-parent", "--format=%H %ct", "--reverse", "--", resolve(file)).trim();
  } catch { return undefined; }
  if (!log) return undefined;
  const path = relative(root, resolve(file));
  const lines = (s) => s.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  return log.split("\n").map((entry) => {
    const [sha, seconds] = entry.split(" ");
    let content = "";
    try { content = git("show", `${sha}:${path}`); } catch (error) {
      // Only a commit that removed the file has no copy of it; anything else is an error.
      if (!/does not exist|exists on disk, but not in/.test(String(error.stderr))) throw error;
    }
    return { sha, at: Number(seconds) * 1000, lines: lines(content) };
  });
}
// The commit time at which each line first appeared, and any version that dropped or
// changed a line an earlier version had. Lines may be added anywhere, since a union
// merge interleaves two labs' appends.
function audit(file) {
  const versions = history(file);
  if (!versions) return { tracked: false, firstSeen: new Map(), rewrites: [] };
  const firstSeen = new Map();
  const rewrites = [];
  let previous = new Map();
  const count = (list) => list.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const current = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n").filter(Boolean) : [];
  for (const v of [...versions, { sha: "working tree", at: Infinity, lines: current }]) {
    const now = count(v.lines);
    if ([...previous].some(([line, n]) => (now.get(line) ?? 0) < n)) rewrites.push(v.sha);
    for (const line of v.lines) if (!firstSeen.has(line)) firstSeen.set(line, v.at);
    previous = now;
  }
  return { tracked: true, firstSeen, rewrites };
}
// The next ID: F-<n>, or F-<lab>-<n>, numbered among the IDs with the same prefix.
function nextId(rows, lab) {
  if (lab !== undefined && !LAB_RE.test(lab)) fail(`--lab "${lab}" is not 2 to 12 lowercase letters and digits, starting with a letter`);
  const prefix = lab ? `F-${lab}-` : "F-";
  let n = 0;
  for (const r of rows) {
    const m = ID_RE.exec(r.id ?? "");
    if (m && (m[1] ?? undefined) === lab) n = Math.max(n, Number(r.id.slice(prefix.length)));
  }
  return () => `${prefix}${++n}`;
}

function loadLedger() {
  const forecasts = read(forecastsFile, F_COLS);
  const resolutions = read(resolutionsFile, R_COLS);
  const problems = [...forecastProblems(forecasts, forecastsFile), ...resolutionProblems(resolutions, forecasts, resolutionsFile)];
  return { forecasts, resolutions, problems };
}
// Git union merges preserve independent resolutions. Agreement counts once;
// neither line order nor majority picks the outcome of a disputed question.
function resolutionSummary(rows) {
  const groups = new Map();
  for (const r of rows.filter((r) => !r.bad)) {
    if (!groups.has(r.key)) groups.set(r.key, []);
    groups.get(r.key).push(r);
  }
  const resolutions = [];
  let disputed = 0;
  for (const [key, group] of groups) {
    const answers = new Set(group.map((r) => JSON.stringify([r.outcome, r.known === "-" ? null : time(r.known)])));
    // With unknown event time, score uses resolution time as a fallback. Use the
    // earliest agreeing observation so reordering rows cannot admit later forecasts.
    if (answers.size === 1) {
      resolutions.push(group.reduce((a, b) => time(a.resolved) <= time(b.resolved) ? a : b));
      continue;
    }
    disputed++;
    console.error(`ledger: disputed ${key}; excluded from scores. Compare the evidence and reasoning; retain each lab's position:`);
    for (const r of group) console.error(`  ${resolutionsFile}:${r.line} outcome=${r.outcome} known=${r.known} evidence=${r.evidence}`);
  }
  if (disputed) console.error(`ledger: ${disputed} disputed key(s); review in notes/inbox, not by file order or vote`);
  return { resolutions, disputed };
}
// The rows a command can use. A malformed row is skipped, not fatal: one bad append
// shouldn't stop scoring, and the only fix the ledger allows is appending.
function usable() {
  const { forecasts, resolutions, problems } = loadLedger();
  const bad = forecasts.filter((f) => f.bad).length + resolutions.filter((r) => r.bad).length;
  if (bad) console.error(`ledger: skipping ${bad} malformed row(s); ledger.mjs check lists them`);
  return { forecasts: forecasts.filter((f) => !f.bad), ...resolutionSummary(resolutions), all: resolutions, problems };
}

// ---------- Hacker News collector output ----------

function loadRuns(dir) {
  if (!dir || !existsSync(dir)) fail(`--runs ${dir ?? ""}: no collector output there`);
  const items = new Map();
  const polls = [];
  for (const name of readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort()) {
    for (const line of readFileSync(join(dir, name), "utf8").split("\n")) {
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if (entry.t === "item" && !items.has(entry.id)) items.set(entry.id, entry);
      if (entry.t === "poll") polls.push({ ...entry, file: name, points: new Map(entry.new.map(([id, p]) => [id, p])) });
    }
  }
  polls.sort((a, b) => a.at - b.at);
  return { items, polls, latest: polls.at(-1)?.at ?? 0 };
}

// Did story `id` reach the front page within `hours` of submission? Returns
// {outcome, known, seen, evidence}, or null while the window is still open. For a hit,
// `known` is the last observation that didn't show the story there, since it may have
// arrived any time after that; `seen` is the poll that showed it.
function frontPage(runs, id, hours, gapMinutes) {
  const item = runs.items.get(id);
  if (!item) return null;
  const deadline = item.created + hours * 3600;
  const inWindow = runs.polls.filter((p) => p.at >= item.created && p.at <= deadline);
  const i = inWindow.findIndex((p) => p.front.includes(id));
  if (i >= 0) {
    const hit = inWindow[i];
    const before = i > 0 ? inWindow[i - 1].at : item.created;
    const rank = hit.front.indexOf(id) + 1;
    return { outcome: "1", known: before, seen: hit.at, evidence: `${hit.file} poll ${iso(hit.at * 1000)} rank ${rank}; not there at ${iso(before * 1000)}` };
  }
  if (runs.latest < deadline) return null;
  const stamps = [item.created, ...inWindow.map((p) => p.at), deadline];
  const gap = Math.max(...stamps.slice(1).map((t, i) => t - stamps[i])) / 60;
  if (gap > gapMinutes) return { outcome: "void", known: deadline, evidence: `collector gap of ${Math.round(gap)} min inside the ${hours}h window` };
  return { outcome: "0", known: deadline, evidence: `not on the front page in ${inWindow.length} polls; largest gap ${Math.round(gap)} min` };
}

// Stories the collector first saw within `gapMinutes` of submission and whose whole
// window has passed, optionally only those with at least `points` at about `age`
// minutes old. A story first seen later, such as the backfill of a collector's first
// run, could have risen unobserved, so it would bias a base rate toward hits.
function eligibleStories(runs, hours, gapMinutes, age, points) {
  const out = [];
  for (const item of runs.items.values()) {
    if (item.at - item.created > gapMinutes * 60) continue;
    if (item.created + hours * 3600 > runs.latest) continue;
    if (age !== undefined) {
      const target = item.created + age * 60;
      const near = runs.polls.filter((p) => Math.abs(p.at - target) <= 600 && p.points.has(item.id));
      if (near.length === 0) continue;
      const nearest = near.reduce((a, b) => (Math.abs(a.at - target) <= Math.abs(b.at - target) ? a : b));
      if (nearest.points.get(item.id) < points) continue;
    }
    out.push(item);
  }
  return out;
}

// ---------- commands ----------

const brier = (pairs) => pairs.reduce((s, [p, o]) => s + (p - o) ** 2, 0) / pairs.length;
const fixed = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "-");

const commands = {
  add() {
    const file = flag("--file", forecastsFile);
    const row = {
      made: iso(Date.now()), key: flag("--key"), p: flag("--p"), base: flag("--base", "-"),
      closes: flag("--closes"), via: flag("--via", "-"), by: flag("--by", "-"), question: flag("--question"),
    };
    row.id = nextId(read(file, F_COLS), flag("--lab"))();
    const problems = forecastProblems([{ ...row, line: "new", extra: 0 }], file);
    if (problems.length) fail(problems.join("\n"));
    append(file, F_COLS, [row]);
    console.log(`${row.id} ${row.key} p=${row.p} in ${file}`);
  },

  merge() {
    const drafts = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
    if (drafts.length === 0) fail("merge needs one or more draft files");
    const rows = read(forecastsFile, F_COLS);
    // IDs are reassigned on import, so compare the complete content instead.
    const identity = (r) => JSON.stringify(F_COLS.slice(1).map((c) => r[c]));
    const present = new Set(rows.map(identity));
    const next = nextId(rows, flag("--lab"));
    const added = [];
    for (const draft of drafts) {
      const incoming = read(draft, F_COLS);
      const problems = forecastProblems(incoming.map((r, i) => ({ ...r, id: `F-${i + 1}` })), draft);
      if (problems.length) fail(problems.join("\n"));
      for (const r of incoming) {
        const key = identity(r);
        if (present.has(key)) continue;
        present.add(key);
        added.push({ ...r, id: next(), was: `${draft} ${r.id}` });
      }
    }
    if (added.length) append(forecastsFile, F_COLS, added);
    for (const r of added) console.log(`${r.was} -> ${r.id} ${r.key}`);
    console.log(`merged ${added.length} forecast(s) into ${forecastsFile}`);
  },

  resolve() {
    const { forecasts, resolutions } = loadLedger();
    const row = { key: flag("--key"), resolved: iso(Date.now()), outcome: flag("--outcome"), known: flag("--known", "-"), evidence: flag("--evidence") };
    if (resolutions.some((r) => r.key === row.key)) fail(`${row.key} is already resolved`);
    const problems = resolutionProblems([{ ...row, line: "new", extra: 0 }], forecasts, resolutionsFile);
    if (problems.length) fail(problems.join("\n"));
    append(resolutionsFile, R_COLS, [row]);
    console.log(`${row.key} resolved ${row.outcome}`);
  },

  check() {
    const { forecasts, resolutions, problems } = loadLedger();
    for (const file of [forecastsFile, resolutionsFile]) {
      const a = audit(file);
      for (const sha of a.rewrites) problems.push(`${file}: ${sha} changed or removed earlier rows; the ledger only appends`);
    }
    const summary = resolutionSummary(resolutions);
    const known = new Map(summary.resolutions.filter((r) => r.known !== "-").map((r) => [r.key, time(r.known)]));
    const late = forecasts.filter((f) => known.has(f.key) && time(f.made) >= known.get(f.key));
    const closed = new Set(summary.resolutions.map((r) => r.key));
    const overdue = [...new Set(forecasts.filter((f) => !closed.has(f.key) && time(f.closes, true) < Date.now()).map((f) => f.key))];
    console.log(`${forecasts.length} forecast(s) on ${new Set(forecasts.map((f) => f.key)).size} key(s); ${resolutions.length} resolution row(s); ${summary.resolutions.length} undisputed key(s); ${overdue.length} past close and unresolved`);
    if (late.length) console.log(`${late.length} forecast(s) made after their outcome was known; score skips them: ${late.map((f) => f.id).join(", ")}`);
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
  },

  score() {
    const { forecasts, resolutions } = usable();
    const group = flag("--group");
    if (group && !["via", "by"].includes(group)) fail("--group takes via or by");
    // With --committed, a forecast counts from the commit that first held it, not the
    // time written in the row: the strongest available evidence of when it existed.
    const firstSeen = has("--committed") ? audit(forecastsFile).firstSeen : undefined;
    const when = (f) => {
      const made = time(f.made);
      if (!firstSeen) return made;
      const line = F_COLS.map((c) => f[c]).join("\t");
      return Math.max(made, firstSeen.get(line) ?? Infinity);
    };
    // First and last eligible forecast per resolved key, among the given forecasts.
    // A group is scored on its own rows, so two scouts on one key are each scored.
    let late = 0, voided = 0;
    const scoreSet = (subset, count) => {
      const out = [];
      for (const r of resolutions) {
        if (r.outcome === "void") { if (count) voided++; continue; }
        const cutoff = r.known !== "-" ? time(r.known) : time(r.resolved);
        const all = subset.filter((f) => f.key === r.key);
        const ok = all.filter((f) => when(f) < cutoff && when(f) <= time(f.closes, true)).sort((a, b) => when(a) - when(b));
        if (count) late += all.length - ok.length;
        if (ok.length) out.push({ key: r.key, outcome: Number(r.outcome), first: ok[0], last: ok.at(-1) });
      }
      return out;
    };
    const scored = scoreSet(forecasts, true);
    if (scored.length === 0) {
      console.log(`nothing to score yet: ${resolutions.length} resolution(s), ${voided} void, ${late} late forecast(s)`);
      return;
    }
    const report = (rows, label) => {
      const first = brier(rows.map((s) => [Number(s.first.p), s.outcome]));
      const last = brier(rows.map((s) => [Number(s.last.p), s.outcome]));
      const paired = rows.filter((s) => s.first.base !== "-");
      const mine = paired.length ? brier(paired.map((s) => [Number(s.first.p), s.outcome])) : NaN;
      const base = paired.length ? brier(paired.map((s) => [Number(s.first.base), s.outcome])) : NaN;
      const skill = base > 0 ? 1 - mine / base : NaN;
      const hits = rows.filter((s) => s.outcome === 1).length;
      console.log(`${label.padEnd(18)} n=${String(rows.length).padEnd(5)} yes=${String(hits).padEnd(5)} brier first ${fixed(first)}  last ${fixed(last)}  ` +
        `vs base (n=${paired.length}) ${fixed(mine)} / ${fixed(base)}  skill ${fixed(skill, 2)}`);
    };
    console.log(`${scored.length} scored key(s); ${voided} void; ${late} late forecast(s) skipped${firstSeen ? "; times from first commit" : ""}`);
    report(scored, "all");
    if (group) {
      const names = [...new Set(forecasts.map((f) => f[group]))];
      const groups = names.map((name) => [name, scoreSet(forecasts.filter((f) => f[group] === name), false)]).filter(([, rows]) => rows.length);
      for (const [name, rows] of groups.sort((a, b) => b[1].length - a[1].length)) report(rows, `${group} ${name}`);
    }
    console.log("\ncalibration, first forecast per key:\n  p range     n     mean p  observed");
    for (let b = 0; b < 10; b++) {
      // Bin b holds probabilities from b/10 up to (b+1)/10; 1.0 goes in the top bin.
      const bin = scored.filter((s) => Math.min(9, Math.floor(Math.round(Number(s.first.p) * 1000) / 100)) === b);
      if (bin.length === 0) continue;
      const mean = bin.reduce((a, s) => a + Number(s.first.p), 0) / bin.length;
      const seen = bin.filter((s) => s.outcome === 1).length / bin.length;
      console.log(`  ${(b / 10).toFixed(1)}-${((b + 1) / 10).toFixed(1)}  ${String(bin.length).padEnd(5)} ${mean.toFixed(2)}    ${seen.toFixed(2)}`);
    }
  },

  "hn-resolve"() {
    const { forecasts, all: resolutions } = usable();
    const runs = loadRuns(flag("--runs"));
    const gap = Number(flag("--gap", 60));
    const closed = new Set(resolutions.map((r) => r.key));
    const rows = [];
    let open = 0, unseen = 0;
    for (const key of new Set(forecasts.map((f) => f.key))) {
      const m = HN_RE.exec(key);
      if (!m || closed.has(key)) continue;
      if (!runs.items.has(Number(m[1]))) { unseen++; continue; }
      const result = frontPage(runs, Number(m[1]), Number(m[2]), gap);
      if (!result) { open++; continue; }
      rows.push({ key, resolved: iso(Date.now()), outcome: result.outcome, known: iso(result.known * 1000), evidence: result.evidence });
    }
    if (rows.length) append(resolutionsFile, R_COLS, rows);
    for (const r of rows) console.log(`${r.key} ${r.outcome} (${r.evidence})`);
    console.log(`resolved ${rows.length}; ${open} still inside their window; ${unseen} never seen by the collector`);
  },

  "hn-base"() {
    const runs = loadRuns(flag("--runs"));
    const hours = Number(flag("--hours", 24));
    const age = flag("--age") === undefined ? undefined : Number(flag("--age"));
    const points = Number(flag("--points", 0));
    const gap = Number(flag("--gap", 60));
    // With --age, leave out stories already on the front page by that age: a forecast
    // made then would be late, so they don't belong in the rate it is compared with.
    const results = eligibleStories(runs, hours, gap, age, points)
      .map((item) => [item, frontPage(runs, item.id, hours, gap)])
      .filter(([item, r]) => r && r.outcome !== "void" && !(age !== undefined && r.outcome === "1" && r.known <= item.created + age * 60))
      .map(([, r]) => r);
    const hits = results.filter((r) => r.outcome === "1").length;
    const filter = age === undefined ? "stories" : `stories with at least ${points} points at about ${age} min`;
    if (results.length === 0) { console.log(`no ${filter} seen young with a complete ${hours}h window yet`); return; }
    console.log(`${filter}: ${hits} of ${results.length} reached the front page within ${hours}h, base rate ${(hits / results.length).toFixed(3)}`);
  },

  "hn-misses"() {
    const { forecasts } = loadLedger();
    const runs = loadRuns(flag("--runs"));
    const hours = Number(flag("--hours", 24));
    const gap = Number(flag("--gap", 60));
    const asked = new Set(forecasts.map((f) => HN_RE.exec(f.key)?.[1]).filter(Boolean).map(Number));
    const missed = [];
    // Only stories the collector saw young: the lab could have forecast those.
    for (const item of runs.items.values()) {
      if (item.at - item.created > gap * 60) continue;
      const r = frontPage(runs, item.id, hours, Infinity);
      if (r?.outcome === "1" && !asked.has(item.id)) missed.push({ ...item, front: r.seen });
    }
    missed.sort((a, b) => a.front - a.created - (b.front - b.created));
    const shown = has("--all") ? missed : missed.slice(0, 20);
    console.log(`${missed.length} front-page stories with no forecast${shown.length < missed.length ? `; fastest ${shown.length} shown, --all for the rest` : ""}`);
    for (const m of shown) console.log(`${m.id}\t${iso(m.created * 1000)}\t+${Math.round((m.front - m.created) / 60)}m\t${m.title}`);
  },
};

if (!commands[command]) {
  console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 12).map((l) => l.slice(3)).join("\n"));
  process.exit(2);
}
commands[command]();
