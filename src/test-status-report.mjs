// status-report.mjs against a real Git lab: the Numbers block since the last report,
// effort as this report's totals minus the last one's, and the summary coverage check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = dirname(fileURLToPath(import.meta.url));
const lab = mkdtempSync(join(tmpdir(), "pe-status-report-"));
const put = (path, text) => { mkdirSync(dirname(join(lab, path)), { recursive: true }); writeFileSync(join(lab, path), text); };
const git = (...args) => execFileSync("git", args, { cwd: lab, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const commit = (message, name = "mac (Persistent Eclipse)") =>
  git("-c", `user.name=${name}`, "-c", "user.email=x@persistent-eclipse.invalid", "commit", "-qam", message);
const tool = (...args) => spawnSync(process.execPath, [join(src, "status-report.mjs"), ...args], { cwd: lab, encoding: "utf8" });
const text = (path) => readFileSync(join(lab, path), "utf8");
const note = (id, state) => `---\nid: ${id}\nkind: finding\nstate: ${state}\n---\n# ${id}\n`;
const report = (name, extra = "") => put(`.research/status-reports/${name}`, `---\nlab: ${name.split("-")[3]}\ntrigger: asked\nat: ${name.slice(0, 13)}:${name.slice(13, 15)}Z\nhead: ${git("rev-parse", "HEAD")}\n${extra}---\n# Report\n`);

git("init", "-q");
git("config", "pe.lab", "mac");
put(".research/LAB.md", "# Lab\n\n    Sync: off\n");
put(".research/labs/mac/QUEUE.md", "");
put(".research/labs/gpu/QUEUE.md", "");
put(".research/notes/R-mac-1.md", note("R-mac-1", "open"));
put(".research/notes/R-gpu-1.md", note("R-gpu-1", "supported"));
cpSync(join(src, "history.mjs"), join(lab, ".research/tools/history.mjs"));
git("add", "-A");
commit("start");

test("a first report has totals only, and a hidden totals line for the next one", () => {
  const r = tool("stats");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^<!-- totals: calls=0 sessions=0 workers=0 total=0 output=0 reasoning=0 cost=0\.00 -->$/m);
  assert.match(r.stdout, /mac's first status report, so the Since column is empty/);
  assert.match(r.stdout, /\| Commits as mac \|  \| 1 \|/);
  assert.match(r.stdout, /\| mac's notes: supported · open · disputed · refuted · superseded \| \| 0 · 1 · 0 · 0 · 0 \|/);
  assert.match(r.stdout, /\| All notes: supported · open · disputed · refuted · superseded \|  \| 1 · 1 · 0 · 0 · 0 \|/);
});

test("since the last report: commits by identity, state changes, new work, inbox, and effort", () => {
  report("2026-10-31T1215Z-mac-asked.md");
  writeFileSync(join(lab, ".research/status-reports/2026-10-31T1215Z-mac-asked.md"),
    `${text(".research/status-reports/2026-10-31T1215Z-mac-asked.md")}\n## Numbers\n<!-- totals: calls=0 sessions=0 workers=0 total=0 output=0 reasoning=0 cost=0.00 -->\n`);
  git("add", "-A");
  commit("status report: mac asked");
  put(".research/notes/R-mac-1.md", note("R-mac-1", "supported"));
  put(".research/notes/R-mac-2.md", note("R-mac-2", "open"));
  put(".research/reports/2026-10-31-mac-result.md", "# Result\n");
  put(".research/runs/R-mac-2/run.sh", "true\n");
  put(".research/runs/R-mac-2/out.txt", "ok\n");
  put(".research/inbox/2026-10-31-gpu-check.md", "---\nfrom: gpu\nto: mac\nkind: request\nstate: open\n---\n# Check\n");
  git("add", "-A");
  commit("R-mac-1 supported");
  put(".research/notes/R-gpu-1.md", note("R-gpu-1", "refuted"));
  commit("R-gpu-1 refuted", "Koda Reef");
  const r = tool("stats");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Since mac's last report \(2026-10-31 12:15 UTC/);
  // The window starts at the last report's head, so it includes the commit that filed it.
  assert.match(r.stdout, /\| Commits, all labs \| 3 \| 4 \|/);
  assert.match(r.stdout, /\| Commits as mac \| 2 \| 3 \|/);
  assert.match(r.stdout, /\| mac's notes: new · total \| 1 \| 2 \|/);
  assert.match(r.stdout, /\| All notes: supported · open · disputed · refuted · superseded \| 0 · 0 · 0 · \+1 · 0 \| 1 · 1 · 0 · 1 · 0 \|/);
  assert.match(r.stdout, /\| New reports · runs · reviews · intel notes · patches · proofs \| 1 · 1 · 0 · 0 · 0 · 0 \| \|/);
  assert.match(r.stdout, /\| Inbox: sent · received · open to mac \| 0 · 1 \| 1 open \|/);
  assert.match(r.stdout, /\| Model calls · sessions · worker sessions \| 0 · 0 · 0 \| 0 · 0 · 0 \|/);
  for (const change of ["R-mac-1 open → supported", "R-mac-2 new → open", "R-gpu-1 supported → refuted"]) assert.ok(r.stdout.includes(change), change);
  assert.match(r.stdout, /Commit authors since: mac \(Persistent Eclipse\) 2, Koda Reef 1\./);
  const json = JSON.parse(tool("stats", "--json").stdout);
  assert.deepEqual(json.notes.changes.map((c) => c.id).sort(), ["R-gpu-1", "R-mac-1", "R-mac-2"]);
  assert.equal(json.commits.lab.since, 2);
});

test("stats uses committed notes, inbox, and reports despite staged edits, deletions, and drafts", () => {
  const before = JSON.parse(tool("stats", "--json").stdout);
  const edited = ".research/notes/R-mac-1.md", deleted = ".research/notes/R-mac-2.md";
  const inbox = ".research/inbox/2026-10-31-gpu-check.md";
  const prior = `.research/status-reports/${before.previous}`;
  const untracked = ".research/notes/R-mac-999.md";
  const draft = ".research/status-reports/2026-11-01T0000Z-mac-asked.md";
  try {
    put(edited, note("R-mac-1", "refuted") + "Unicode evidence: λ → ✓\n");
    git("add", edited);
    rmSync(join(lab, deleted));
    put(inbox, text(inbox).replace("state: open", "state: closed"));
    put(prior, "unfinished rewrite\n");
    put(untracked, note("R-mac-999", "supported"));
    put(draft, "unfinished report\n");
    const r = tool("stats", "--json");
    assert.equal(r.status, 0, r.stderr);
    const after = JSON.parse(r.stdout);
    assert.deepEqual(after.notes, before.notes);
    assert.deepEqual(after.inbox, before.inbox);
    assert.equal(after.previous, before.previous);
    assert.equal(after.base, before.base);
    assert.equal(after.head, before.head);
    assert.equal(after.workingChanges.length, 6);
    assert.match(tool("stats").stdout, /Uncommitted record changes: 6 paths excluded/);
  } finally {
    git("restore", "--staged", "--worktree", "--", edited, deleted, inbox, prior);
    rmSync(join(lab, untracked), { force: true });
    rmSync(join(lab, draft), { force: true });
  }
});

test("standalone labs own unnamed notes, while shared labs respect the recorded owner", () => {
  const root = mkdtempSync(join(tmpdir(), "pe-report-unnamed-"));
  const g = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
  const put = (path, body) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), body); };
  const save = () => { g("add", "."); g("-c", "user.name=test", "-c", "user.email=test@example.invalid", "commit", "-qm", "record"); };
  const stats = () => JSON.parse(execFileSync(process.execPath, [join(src, "status-report.mjs"), "stats", "--json"], { cwd: root, encoding: "utf8" }));
  try {
    g("init", "-q");
    put(".research/LAB.md", "Sync: off\n");
    put(".research/notes/R-1.md", note("R-1", "supported") + "Evidence: λ → ✓\n");
    save();
    let r = stats();
    assert.equal(r.lab, "lab");
    assert.equal(r.notes.own.total, 1);
    assert.equal(r.notes.own.supported, 1);
    put(".research/labs/gpu/QUEUE.md", "# Queue\n");
    put(".research/notes/R-mac-1.md", note("R-mac-1", "open"));
    save();
    assert.equal(stats().notes.own.total, 0, "a shared clone without an identity must not claim unnamed notes");
    put(".research/LAB.md", "Sync: off\nUnnamed ids: gpu\n");
    save();
    g("config", "pe.lab", "mac");
    r = stats();
    assert.equal(r.notes.own.total, 1);
    assert.equal(r.notes.own.open, 1);
    assert.equal(r.notes.own.supported, 0);
    g("config", "pe.lab", "gpu");
    assert.equal(stats().notes.own.supported, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a last report without totals leaves effort since unknown, and says why", () => {
  report("2026-10-31T1500Z-mac-asked.md");
  git("add", "-A");
  commit("status report: mac asked, no totals");
  const r = tool("stats");
  assert.match(r.stdout, /2026-10-31T1500Z-mac-asked\.md records no totals, so effort since is unknown/);
  assert.match(r.stdout, /\| Model calls · sessions · worker sessions \| unknown \|/);
});

test("check: the summary folds every lab's newest report, or names the missing one", () => {
  let r = tool("check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /summary: no SUMMARY\.md folds status-reports\/2026-10-31T1500Z-mac-asked\.md yet/);
  report("2026-10-31T1605Z-gpu-goal.md");
  const summary = (by, folds) => put(".research/SUMMARY.md", `---\nby: ${by}\nfolds: [${folds.join(", ")}]\n---\n# Summary\n`);
  summary("gpu", ["2026-10-31T1500Z-mac-asked.md", "2026-10-31T1605Z-gpu-goal.md"]);
  r = tool("check");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /folds every lab's newest report \(2 labs\)/);
  summary("gpu", ["2026-10-31T1215Z-mac-asked.md", "2026-10-31T1605Z-gpu-goal.md"]);
  r = tool("check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /SUMMARY\.md \(by gpu\) does not fold status-reports\/2026-10-31T1500Z-mac-asked\.md; its writer folds it in/);
  summary("mac", ["2026-10-31T1500Z-mac-asked.md"]);
  assert.match(tool("check").stdout, /does not fold status-reports\/2026-10-31T1605Z-gpu-goal\.md; you wrote it last: fold it in and push again/);
});

test("--sha prints the digest the skill records", () => {
  const r = tool("--sha");
  assert.match(r.stdout, /^[0-9a-f]{64}\n$/);
});

test.after(() => rmSync(lab, { recursive: true, force: true }));
