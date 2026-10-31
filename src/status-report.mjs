// Usage: node .research/tools/status-report.mjs stats [--lab LAB] [--json]
//        node .research/tools/status-report.mjs check [--json]
// stats prints the Numbers block for this lab's next status report: everything since its
// last one. Notes and inbox use one committed Git snapshot; receipts and disk are live. A number
// no record supports is left out or marked unknown, never estimated. Receipts carry no
// time, so the block carries a hidden `<!-- totals: ... -->` line and the next report
// subtracts it.
// check lists each lab's newest report that SUMMARY.md does not fold. Exit 1 if any.
// node status-report.mjs --sha prints the sha256 of this file, to check a copy is exact.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statfsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
if (argv.includes("--sha")) {
  const self = readFileSync(process.argv[1], "utf8").replace(/\s+$/, "") + "\n";
  console.log(createHash("sha256").update(self).digest("hex"));
  process.exit(0);
}
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const command = argv[0], asJson = argv.includes("--json");
if (command !== "stats" && command !== "check") {
  console.error("usage: node status-report.mjs stats [--lab LAB] [--json] | check [--json]");
  process.exit(2);
}

let root = resolve(".");
while (!existsSync(join(root, ".research", "LAB.md"))) {
  if (dirname(root) === root) { console.error("status-report: not inside a lab (no .research/LAB.md)"); process.exit(2); }
  root = dirname(root);
}
const research = join(root, ".research");
const git = (...args) => {
  try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 30 }).trim(); }
  catch { return undefined; }
};
function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text ?? "");
  if (!m) return undefined;
  const out = {};
  let open;
  for (const line of m[1].split("\n")) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && open) { out[open].push(item[1].trim()); continue; }
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    open = kv[2].trim() === "" ? kv[1] : undefined;
    out[kv[1]] = open ? [] : kv[2].trim();
  }
  return out;
}
const list = (value) => Array.isArray(value) ? value : /^\[(.*)\]$/.exec((value ?? "").trim())?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? (value ? [value] : []);

// Status reports: .research/status-reports/<yyyy-mm-ddThhmm>Z-<lab>-<trigger>.md
const REPORT_RE = /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{4}Z)-([a-z][a-z0-9]{1,11})-(housekeeping|goal|asked)\.md$/;
const reportsDir = join(research, "status-reports");
const reports = existsSync(reportsDir) ? readdirSync(reportsDir).filter((f) => REPORT_RE.test(f)).sort() : [];
const newest = new Map(); // lab -> its newest report; names sort by their UTC stamp
for (const file of reports) newest.set(REPORT_RE.exec(file)[2], file);

if (command === "check") {
  const page = join(research, "SUMMARY.md");
  const summary = existsSync(page) ? frontmatter(readFileSync(page, "utf8")) ?? {} : undefined;
  const folds = new Set(list(summary?.folds));
  const here = git("config", "--get", "pe.lab") || undefined;
  const unfolded = [...newest.values()].filter((f) => !folds.has(f));
  if (asJson) console.log(JSON.stringify({ summary: summary !== undefined, by: summary?.by ?? null, unfolded }));
  else if (!unfolded.length) console.log(`summary: folds every lab's newest report (${newest.size} lab${newest.size === 1 ? "" : "s"})`);
  else {
    const names = unfolded.map((f) => `status-reports/${f}`).join(", ");
    console.log(summary === undefined ? `summary: no SUMMARY.md folds ${names} yet; the next report writes it`
      : `summary: SUMMARY.md${summary.by ? ` (by ${summary.by})` : ""} does not fold ${names}; ` +
        (summary.by && summary.by === here ? "you wrote it last: fold it in and push again" : "its writer folds it in"));
  }
  process.exit(unfolded.length ? 1 : 0);
}

// Pin the record once: a manager can keep editing or committing while a report runs.
const head = git("rev-parse", "--verify", "HEAD");
if (!head) { console.error("status-report: commit the lab record before reporting"); process.exit(2); }
const paths = (git("ls-tree", "-r", "--name-only", "-z", head, "--", ".research") ?? "").split("\0").filter(Boolean);
const recordPaths = paths.filter((p) => /^\.research\/(?:LAB\.md|(?:notes|inbox|status-reports)\/[^/\r\n]+\.md)$/.test(p));
// Read the small record files in one Git process, without touching live files or
// starting a process per note. cat-file frames each blob with its byte length.
const record = new Map();
if (recordPaths.length) {
  const blobs = execFileSync("git", ["cat-file", "--batch"], { cwd: root,
    input: recordPaths.map((p) => `${head}:${p}\n`).join(""), maxBuffer: 1 << 30 });
  let offset = 0;
  for (const path of recordPaths) {
    const end = blobs.indexOf(10, offset);
    const [, type, length] = blobs.subarray(offset, end).toString().split(" ");
    if (type !== "blob" || !/^\d+$/.test(length)) throw new Error(`cannot read committed record: ${path}`);
    offset = end + 1;
    record.set(path, blobs.subarray(offset, offset + Number(length)).toString("utf8"));
    offset += Number(length) + 1;
  }
}
const localLab = git("config", "--get", "pe.lab");
const lab = flag("--lab") ?? (localLab || "lab");
const labText = record.get(".research/LAB.md") ?? "";
const filed = recordPaths.filter((p) => p.startsWith(".research/status-reports/")).map((p) => p.split("/").pop()).filter((f) => REPORT_RE.test(f)).sort();
const previous = [...filed].reverse().find((f) => REPORT_RE.exec(f)[2] === lab);
const priorText = previous ? record.get(`.research/status-reports/${previous}`) : undefined;
const prior = priorText === undefined ? undefined : frontmatter(priorText) ?? {};
let base = prior?.head && git("rev-parse", "--verify", "--quiet", `${prior.head}^{commit}`);
if (prior && !base) base = git("log", "-1", "--format=%H", "--diff-filter=A", head, "--", `.research/status-reports/${previous}`);
const since = prior ? Date.parse(prior.at ?? "") || Date.parse(REPORT_RE.exec(previous)[1].replace(/T(\d\d)(\d\d)Z$/, "T$1:$2Z")) : undefined;
const range = base ? [`${base}..${head}`] : [];
const count = (...args) => Number(git("rev-list", "--count", ...args) ?? NaN);

// Commits. Labs commit as `<lab> (Persistent Eclipse)`; other identities stay unattributed.
const author = `^${lab} (Persistent Eclipse)`; // git's basic regex: the parentheses are literal
const authors = {};
for (const name of (git("log", "--format=%an", ...(base ? [`${base}..${head}`] : [head])) ?? "").split("\n").filter(Boolean)) authors[name] = (authors[name] ?? 0) + 1;
const commits = {
  all: { since: base ? count(`${base}..${head}`) : null, total: count(head) },
  lab: { since: base ? count(`--author=${author}`, `${base}..${head}`) : null, total: count(`--author=${author}`, head) },
  authors,
};

// Notes at the pinned commit. A standalone unnamed lab owns its R-<n> notes;
// a shared record must name their owner under `Unnamed ids:`.
const STATES = ["supported", "open", "disputed", "refuted", "superseded"];
const unnamedOwner = /^[ \t]*Unnamed ids:[ \t]*([a-z][a-z0-9]{1,11})/m.exec(labText)?.[1];
const standalone = !localLab && !flag("--lab") && !paths.some((p) =>
  p.startsWith(".research/labs/") || /^\.research\/notes\/R-[a-z][a-z0-9]*-/.test(p));
const ownsUnnamed = unnamedOwner ? unnamedOwner === lab : standalone;
const ownId = (id) => new RegExp(`^R-${lab}-[1-9][0-9]*$`).test(id) || (ownsUnnamed && /^R-[1-9][0-9]*$/.test(id));
const states = Object.fromEntries(STATES.map((s) => [s, 0])), own = Object.fromEntries(STATES.map((s) => [s, 0]));
let ownTotal = 0;
for (const path of recordPaths.filter((p) => /^\.research\/notes\/R-[^/]+\.md$/.test(p))) {
  const file = path.split("/").pop();
  const state = frontmatter(record.get(path))?.state;
  if (state in states) states[state]++;
  if (ownId(file.slice(0, -3))) { ownTotal++; if (state in own) own[state]++; }
}
const changes = [], delta = Object.fromEntries(STATES.map((s) => [s, 0]));
let added = 0, addedOwn = 0;
if (base) {
  for (const row of (git("diff", "--name-status", "--no-renames", ...range, "--", ".research/notes") ?? "").split("\n").filter(Boolean)) {
    const [status, path] = row.split("\t");
    const id = /\/(R-[^/]+)\.md$/.exec(path)?.[1];
    if (!id) continue;
    const before = status === "A" ? undefined : frontmatter(git("show", `${base}:${path}`))?.state;
    const after = status === "D" ? undefined : frontmatter(record.get(path))?.state;
    if (status === "A") { added++; if (ownId(id)) addedOwn++; }
    if (before === after) continue;
    if (before in delta) delta[before]--;
    if (after in delta) delta[after]++;
    changes.push({ id, from: before ?? "new", to: after ?? "deleted" });
  }
}

// New artifacts since: one per report, review, or intel note; one per run or proof folder.
const artifacts = {};
if (base) {
  const paths = (git("diff", "--name-only", "--diff-filter=A", ...range, "--", ".research") ?? "").split("\n").filter(Boolean);
  for (const [key, folder] of [["reports", "reports"], ["runs", "runs"], ["reviews", "reviews"], ["intel", "intel"], ["patches", "patches"], ["proofs", "lean"]]) {
    const hits = paths.filter((p) => p.startsWith(`.research/${folder}/`)).map((p) => p.split("/").slice(0, ["runs", "lean", "patches"].includes(folder) ? 3 : 4).join("/"));
    artifacts[key] = new Set(hits.filter((p) => folder === "intel" ? p.endsWith(".md") && !p.endsWith("INDEX.md") : true)).size;
  }
}

// Inbox: sent and received since, and what is still open to this lab.
const inbox = { sent: base ? 0 : null, received: base ? 0 : null, open: 0 };
const fresh = new Set(base ? (git("diff", "--name-only", "--diff-filter=A", ...range, "--", ".research/inbox") ?? "").split("\n").filter(Boolean).map((p) => p.split("/").pop()) : []);
for (const path of recordPaths.filter((p) => p.startsWith(".research/inbox/"))) {
  const file = path.split("/").pop();
  const fm = frontmatter(record.get(path));
  if (!fm) continue;
  const to = list(fm.to), mine = fm.from !== lab && (to.includes(lab) || to.includes("all"));
  if (fresh.has(file) && fm.from === lab) inbox.sent++;
  if (fresh.has(file) && mine) inbox.received++;
  if (mine && fm.state === "open") inbox.open++;
}

// Effort: this lab's receipts from history.mjs. Since is this total minus the last report's.
let effort;
try {
  const report = JSON.parse(execFileSync(process.execPath, [join(research, "tools", "history.mjs"), "report", "--json"],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 30, timeout: 180_000 }));
  // history.mjs's own row for this lab, so both tools always agree; receipts add worker
  // sessions. Unattributed receipts belong to no lab.
  const entry = report.collective?.labs?.find((l) => l.label === lab) ?? report.collective?.labs?.find((l) => l.local);
  if (!entry) throw new Error(`no history row for ${lab}`);
  const ids = new Set(entry.ids ?? []);
  const total = { calls: entry.calls ?? 0, metered: entry.metered ?? 0, sessions: entry.sessions ?? 0, total: entry.tokens ?? 0, output: 0, reasoning: 0, cost: 0, priced: 0, models: {},
    workers: new Set((report.usage?.receipts ?? []).filter((r) => r.origin && ids.has(r.origin.id) && r.role === "worker" && r.session).map((r) => r.session)).size };
  for (const m of entry.models ?? []) {
    total.output += m.sums?.output ?? 0;
    total.reasoning += m.sums?.reasoning ?? 0;
    if (m.coverage?.cost) { total.cost += m.sums.cost; total.priced += m.coverage.cost; }
    const key = `${m.provider}/${m.model} ${m.effort}`;
    (total.models[key] ??= { calls: 0, total: 0 }).calls += m.calls;
    total.models[key].total += m.sums?.total ?? 0;
  }
  const recorded = /<!-- totals: (.*?) -->/.exec(priorText ?? "")?.[1] ?? prior?.totals;
  const then = Object.fromEntries((recorded ?? "").split(/\s+/).filter(Boolean).map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)]));
  const keys = ["calls", "sessions", "workers", "total", "output", "reasoning", "cost"];
  effort = { total, since: keys.every((k) => Number.isFinite(then[k])) ? { ...Object.fromEntries(keys.map((k) => [k, total[k] - then[k]])), priced: total.priced } : null };
} catch (error) {
  effort = { error: String(error.message ?? error).split("\n")[0] };
}

// Disk and the sync remote, as of its last fetch.
let disk = null, free = null;
try { disk = Number(execFileSync("du", ["-sk", root], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120_000 }).split(/\s/)[0]) * 1024; } catch (error) { disk = Number(String(error.stdout ?? "").split(/\s/)[0]) * 1024 || null; }
try { const fs = statfsSync(root); free = fs.bavail * fs.bsize; } catch { /* unknown */ }
const sync = /^[ \t]*Sync:[ \t]*([^\s(]+)(?:[ \t]+([^\s(]+))?/m.exec(labText);
let remote = null;
if (!sync || sync[1].toLowerCase() !== "off") {
  const name = sync?.[1] ?? "origin", branch = sync?.[2] ?? "main";
  const counts = git("rev-list", "--left-right", "--count", `${head}...refs/remotes/${name}/${branch}`);
  if (counts) { const [ahead, behind] = counts.split(/\s+/).map(Number); remote = { name, branch, ahead, behind }; }
}

const workingChanges = (git("status", "--porcelain=v1", "--untracked-files=all", "--",
  ".research/notes", ".research/inbox", ".research/status-reports", ".research/LAB.md") ?? "").split("\n").filter(Boolean);
const stats = { workingChanges, lab, previous: previous ?? null, since: since ? new Date(since).toISOString() : null, base: base ?? null, head, commits,
  notes: { states, own: { ...own, total: ownTotal }, added, addedOwn, delta, changes }, artifacts, inbox, effort, disk, free, remote };
// The next report subtracts these, so each report records its own.
const totals = effort.error ? undefined : ["calls", "sessions", "workers", "total", "output", "reasoning"].map((k) => `${k}=${effort.total[k]}`).concat(`cost=${effort.total.cost.toFixed(2)}`).join(" ");
stats.totals = totals ?? null;
if (asJson) { console.log(JSON.stringify(stats, null, 2)); process.exit(0); }

// The Numbers block, ready to paste.
const n = (v) => v === null || v === undefined || Number.isNaN(v) ? "unknown" : v.toLocaleString("en-US");
const signed = (v) => v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0";
const big = (v) => v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v);
const size = (bytes) => { if (!bytes) return "unknown"; let v = bytes / 1024, i = 0; while (v >= 1024 && i < 3) { v /= 1024; i++; } return `${v < 10 && i ? v.toFixed(1) : Math.round(v)}${"KMGT"[i]}`; };
const hours = since ? (Date.now() - since) / 3_600_000 : 0;
const out = [];
if (totals) out.push(`<!-- totals: ${totals} -->`);
const S = (v) => base ? v : "";
out.push(prior ? `${effort.since || effort.error ? "" : `${previous} records no totals, so effort since is unknown. `}Since ${lab}'s last report (${new Date(since).toISOString().slice(0, 16).replace("T", " ")} UTC, ${hours < 48 ? hours.toFixed(1) + " hours" : (hours / 24).toFixed(1) + " days"} ago; ${(base ?? "").slice(0, 7)}..${head.slice(0, 7)}):`
  : `${lab}'s first status report, so the Since column is empty. At ${head.slice(0, 7)}.`);
out.push("Record counts use that commit; receipts and disk are measured now.");
if (workingChanges.length) out.push(`Uncommitted record changes: ${workingChanges.length} paths excluded from these counts.`);
out.push("", "| | Since last report | Total |", "| --- | ---: | ---: |");
out.push(`| Commits, all labs | ${S(n(commits.all.since))} | ${n(commits.all.total)} |`);
out.push(`| Commits as ${lab} | ${S(n(commits.lab.since))} | ${n(commits.lab.total)} |`);
out.push(`| ${lab}'s notes: new · total | ${S(n(addedOwn))} | ${n(ownTotal)} |`);
out.push(`| ${lab}'s notes: ${STATES.join(" · ")} | | ${STATES.map((s) => own[s]).join(" · ")} |`);
out.push(`| All notes: ${STATES.join(" · ")} | ${S(STATES.map((s) => signed(delta[s])).join(" · "))} | ${STATES.map((s) => states[s]).join(" · ")} |`);
if (base) out.push(`| New reports · runs · reviews · intel notes · patches · proofs | ${["reports", "runs", "reviews", "intel", "patches", "proofs"].map((k) => artifacts[k]).join(" · ")} | |`);
out.push(`| Inbox: sent · received · open to ${lab} | ${S(`${inbox.sent} · ${inbox.received}`)} | ${inbox.open} open |`);
if (effort.error) out.push(`| Model calls, tokens | unknown | unknown (history.mjs: ${effort.error.slice(0, 80)}) |`);
else {
  const e = effort.since, t = effort.total, u = base ? "unknown" : "";
  out.push(`| Model calls · sessions · worker sessions | ${e ? `${n(e.calls)} · ${n(e.sessions)} · ${n(e.workers)}` : u} | ${n(t.calls)} · ${n(t.sessions)} · ${n(t.workers)} |`);
  out.push(`| Tokens: total · output · reasoning | ${e ? `${big(e.total)} · ${big(e.output)} · ${big(e.reasoning)}` : u} | ${big(t.total)} · ${big(t.output)} · ${big(t.reasoning)} |`);
  if (t.priced) out.push(`| Estimated cost (priced calls only) | ${e ? `≈$${e.cost.toFixed(2)}` : u} | ≈$${t.cost.toFixed(2)} |`);
}
out.push(`| Disk: lab folder · free | | ${size(disk)} · ${size(free)} free |`);
if (remote) out.push(`| ${remote.name}/${remote.branch}: to pull · to push (last fetch) | | ${remote.behind} · ${remote.ahead} |`);
const notes = [];
if (changes.length) notes.push(`State changes: ${changes.map((c) => `${c.id} ${c.from} → ${c.to}`).join("; ")}.`);
if (!effort.error && Object.keys(effort.total.models).length)
  notes.push(`By model, total: ${Object.entries(effort.total.models).sort((a, b) => b[1].calls - a[1].calls).slice(0, 6).map(([m, v]) => `${m} ${n(v.calls)} calls, ${big(v.total)}`).join("; ")}.`);
if (base && Object.keys(authors).length) notes.push(`Commit authors since: ${Object.entries(authors).sort((a, b) => b[1] - a[1]).map(([a, k]) => `${a} ${k}`).join(", ")}.`);
if (!effort.error) {
  const gaps = [];
  if (effort.total.calls > effort.total.metered) gaps.push(`${n(effort.total.calls - effort.total.metered)} calls without token counts`);
  if (gaps.length) notes.push(`Accounting gaps: ${gaps.join("; ")}.`);
}
if (notes.length) out.push("", ...notes);
console.log(out.join("\n"));
