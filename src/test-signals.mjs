// Signal Hunt's tools and examples: the HN collector (pe-forecast's note) and the
// forecast ledger (a placed lab tool). No network: the collector talks to a local
// server, and the ledger reads fixture runs with fixed times. Then PE's linter accepts
// the lead note in pe-hunt's lead-note example. Usage: node src/test-signals.mjs
import { execFile, execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const src = dirname(fileURLToPath(import.meta.url));
const collect = join(src, "skills", "forecast", "hn-collect.mjs");
const ledgerTool = join(src, "ledger.mjs");
const scratch = mkdtempSync(join(tmpdir(), "pe-signals-tools-"));
const run = promisify(execFile);

let passed = 0;
function check(cond, label, detail = "") {
  if (!cond) throw new Error(`FAIL ${label}${detail ? `\n${detail}` : ""}`);
  passed++;
  console.log("ok  ", label);
}
// Run the ledger in `cwd`; returns {code, out}.
async function ledger(cwd, ...args) {
  try {
    const { stdout, stderr } = await run("node", [ledgerTool, ...args], { cwd });
    return { code: 0, out: stdout + stderr };
  } catch (e) {
    return { code: e.code, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}
const header = "id\tmade\tkey\tp\tbase\tcloses\tvia\tby\tquestion\n";
const rheader = "key\tresolved\toutcome\tknown\tevidence\n";
const git = (cwd, args, extra = {}) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8",
  env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", ...extra } });

try {
  // ---------- collector ----------
  {
    const now = Math.floor(Date.now() / 1000);
    let hits = [
      { objectID: "101", created_at_i: now - 600, title: "Young story", url: "https://a.test", author: "a", points: 4, num_comments: 1 },
      { objectID: "102", created_at_i: now - 8 * 3600, title: "Older story", url: "", author: "b", points: 40, num_comments: 12 },
    ];
    let down = false, unreported = 0;
    const server = createServer((req, res) => {
      if (down) { res.writeHead(503); res.end(); return; }
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url.startsWith("/v0/topstories.json")) res.end(JSON.stringify(Array.from({ length: 40 }, (_, i) => 900 + i)));
      else res.end(JSON.stringify({ nbHits: hits.length + unreported, hits }));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${server.address().port}`;
    const env = { ...process.env, HN_FIREBASE: `${base}/v0`, HN_ALGOLIA: `${base}/api/v1` };
    const out = join(scratch, "collect");
    const poll = () => run("node", [collect, "--out", out, "--hours", "24"], { env });
    try {
      await poll();
      await poll();
      const file = join(out, readdirSync(out)[0]);
      const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      const items = lines.filter((l) => l.t === "item");
      const polls = lines.filter((l) => l.t === "poll");
      check(items.length === 2 && polls.length === 2, "collect: each story gets one item line across runs, and each run one poll");
      check(polls[0].front.length === 30 && polls[0].front[0] === 900, "collect: the front page is the first 30 topstories, rank order kept");
      check(JSON.stringify(polls[0].new) === JSON.stringify([[101, 4, 1]]), "collect: only stories younger than --track get points and comments");
      check(polls.every((p) => p.truncated === undefined), "collect: no truncated mark when Algolia returned every match");
      unreported = 500;
      await poll();
      const last = JSON.parse(readFileSync(file, "utf8").trim().split("\n").at(-1));
      check(last.truncated === 502, "collect: a poll that hit Algolia's 1000-hit cap records how many matched");
      down = true;
      const before = readFileSync(file, "utf8");
      let code = 0;
      try { await poll(); } catch (e) { code = e.code; }
      check(code === 1 && readFileSync(file, "utf8") === before, "collect: a failed request exits 1 and writes nothing");
      const usage = await run("node", [collect, "--out", out, "--track", "8"], { env }).catch((e) => e);
      check(usage.code === 2, "collect: --track longer than --hours is refused");
    } finally {
      server.close();
    }
  }

  // ---------- fixture collector output ----------
  // Polls every 15 minutes for 60 hours from T0, with a two-hour outage from 40h.
  const T0 = Date.parse("2026-01-01T00:00:00Z") / 1000;
  const H = 3600;
  const iso = (s) => new Date(s * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const stories = [
    { id: 1, created: T0 + 600, front: [2 * H, 9 * H], at60: 12, title: "Reaches the front page at 2h" },
    { id: 2, created: T0 + 900, front: null, at60: 2, title: "Never reaches it" },
    { id: 3, created: T0 + 30 * H, front: null, at60: 1, title: "Window spans the outage" },
    { id: 4, created: T0 + 50 * H, front: null, at60: 3, title: "Window still open" },
    { id: 5, created: T0 + 1000, front: [3 * H, 4 * H], at60: 20, title: "Front page, never forecast" },
    { id: 6, created: T0 + 1100, seenFrom: T0 + 3 * H, front: [3 * H, 5 * H], at60: 30, title: "First seen already on the front page" },
  ];
  const seenAt = (s) => s.seenFrom ?? s.created;
  const runs = join(scratch, "lab", ".research", "runs", "REQ-1");
  mkdirSync(runs, { recursive: true });
  for (let at = T0; at <= T0 + 60 * H; at += 900) {
    if (at > T0 + 40 * H && at < T0 + 42 * H) continue;
    const lines = [];
    for (const s of stories) if (seenAt(s) <= at && seenAt(s) > at - 900) lines.push({ t: "item", id: s.id, at, created: s.created, title: s.title, url: "", by: "x" });
    const front = stories.filter((s) => s.front && at >= T0 + s.front[0] && at <= T0 + s.front[1]).map((s) => s.id);
    const young = stories.filter((s) => seenAt(s) <= at && at - s.created <= 6 * H).map((s) => [s.id, at - s.created >= 1800 ? s.at60 : 1, 0]);
    lines.push({ t: "poll", at, front, new: young });
    appendFileSync(join(runs, `${iso(at).slice(0, 10)}.jsonl`), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  }
  const lab = join(scratch, "lab");
  const research = join(lab, ".research");
  const forecasts = join(research, "forecasts.tsv");

  // ---------- ledger ----------
  writeFileSync(join(research, "forecasts.tsv"), header +
    `F-1\t${iso(T0 + 1200)}\thn:1:front24\t0.8\t0.1\t${iso(T0 + 600 + 24 * H)}\thn-new\tT-1\tStory 1 on the front page within 24h\n` +
    `F-2\t${iso(T0 + 1200)}\thn:2:front24\t0.3\t0.1\t${iso(T0 + 900 + 24 * H)}\thn-new\tT-1\tStory 2 on the front page within 24h\n` +
    `F-3\t${iso(T0 + 31 * H)}\thn:3:front24\t0.2\t0.1\t${iso(T0 + 54 * H)}\tlobsters\tT-2\tStory 3 on the front page within 24h\n` +
    `F-4\t${iso(T0 + 51 * H)}\thn:4:front24\t0.5\t-\t${iso(T0 + 74 * H)}\thn-new\tT-2\tStory 4 on the front page within 24h\n` +
    `F-5\t${iso(T0 + 5 * H)}\thn:1:front24\t0.99\t0.1\t${iso(T0 + 600 + 24 * H)}\thn-new\tT-3\tStory 1 again, after it was already up\n`);

  let r = await ledger(lab, "check");
  check(r.code === 0, "check: a well-formed ledger passes", r.out);

  r = await ledger(lab, "hn-resolve", "--runs", runs);
  const resolutions = readFileSync(join(research, "resolutions.tsv"), "utf8");
  check(r.code === 0 && /^hn:1:front24\t\S+\t1\t2026-01-01T01:45:00Z\t/m.test(resolutions), "hn-resolve: a story seen on the front page resolves 1, known from the last poll that didn't show it", resolutions);
  check(/^hn:2:front24\t\S+\t0\t/m.test(resolutions), "hn-resolve: a story never seen there resolves 0 once its window has passed");
  check(/^hn:3:front24\t\S+\tvoid\t.*collector gap of 120 min/m.test(resolutions), "hn-resolve: a window with a collector gap resolves void, not 0");
  check(!/^hn:4:/m.test(resolutions) && r.out.includes("1 still inside their window"), "hn-resolve: an open window stays unresolved", r.out);

  r = await ledger(lab, "hn-resolve", "--runs", runs);
  check(r.out.includes("resolved 0"), "hn-resolve: running again adds nothing");

  r = await ledger(lab, "check");
  check(r.out.includes("1 forecast(s) made after their outcome was known") && r.out.includes("F-5"), "check: names a forecast made after the outcome was visible", r.out);

  // F-1 (0.8, yes) and F-2 (0.3, no): Brier (0.04 + 0.09) / 2 = 0.065.
  // Base 0.1 for both: (0.81 + 0.01) / 2 = 0.41. Skill 1 - 0.065 / 0.41 = 0.84.
  r = await ledger(lab, "score", "--group", "via");
  check(r.code === 0 && r.out.includes("brier first 0.065") && r.out.includes("0.065 / 0.410") && r.out.includes("skill 0.84"), "score: Brier and skill against the recorded base rate", r.out);
  check(r.out.includes("1 void; 1 late"), "score: void resolutions and late forecasts are left out and counted", r.out);
  check(r.out.includes("via hn-new"), "score: --group via splits by the source that surfaced the lead", r.out);
  check(/0\.3-0\.4\s+1\s+0\.30/.test(r.out) && !r.out.includes("0.2-0.3"), "score: p=0.3 falls in the 0.3-0.4 calibration bin", r.out);

  r = await ledger(lab, "hn-base", "--runs", runs);
  check(r.out.includes("2 of 3 reached the front page"), "hn-base: base rate over stories seen young, with a complete, gap-free window; a story first seen on the front page is left out", r.out);
  r = await ledger(lab, "hn-base", "--runs", runs, "--age", "60", "--points", "10");
  check(r.out.includes("2 of 2"), "hn-base: conditional base rate on points at a given age", r.out);
  r = await ledger(lab, "hn-base", "--runs", runs, "--age", "150", "--points", "10");
  check(r.out.includes("no stories with at least 10 points at about 150 min"), "hn-base --age: leaves out stories already on the front page by that age", r.out);
  r = await ledger(lab, "hn-misses", "--runs", runs);
  check(r.out.includes("1 front-page stories with no forecast") && r.out.includes("Front page, never forecast"), "hn-misses: lists front-page stories nobody forecast, among those the collector saw young", r.out);

  // Two labs forecast the same story; merged, each is scored on its own rows.
  for (const [who, p] of [["veteran", "0.9"], ["fresh", "0.2"]])
    writeFileSync(join(scratch, `${who}.tsv`), header + `F-1\t${iso(T0 + 1300)}\thn:1:front24\t${p}\t0.1\t${iso(T0 + 600 + 24 * H)}\thn-new\t${who}\tStory 1 on the front page within 24h\n`);
  const compare = ["--forecasts", join(scratch, "compare.tsv"), "--resolutions", join(scratch, "compare-res.tsv")];
  await ledger(lab, "merge", ...compare, join(scratch, "veteran.tsv"), join(scratch, "fresh.tsv"));
  await ledger(lab, "hn-resolve", ...compare, "--runs", runs);
  r = await ledger(lab, "score", ...compare, "--group", "by");
  check(/by veteran .*brier first 0\.010/.test(r.out) && /by fresh .*brier first 0\.640/.test(r.out), "score --group by: two labs on the same key are each scored on their own forecast", r.out);

  // Independent forecasters may agree exactly; merging must retain both.
  const equalDrafts = ["scout-a", "scout-b"].map((who) => {
    const file = join(scratch, `${who}.tsv`);
    writeFileSync(file, header + `F-1\t${iso(T0 + 1300)}\thn:1:front24\t0.4\t0.1\t${iso(T0 + 600 + 24 * H)}\thn-new\t${who}\tStory 1 on the front page within 24h\n`);
    return file;
  });
  const equalFile = join(scratch, "equal.tsv");
  const equalArgs = ["--forecasts", equalFile, "--resolutions", join(scratch, "equal-res.tsv")];
  r = await ledger(lab, "merge", ...equalArgs, ...equalDrafts);
  const equalRows = readFileSync(equalFile, "utf8").trim().split("\n").slice(1).map((line) => line.split("\t"));
  check(r.code === 0 && equalRows.length === 2 && equalRows[0][7] === "scout-a" && equalRows[1][7] === "scout-b"
    && new Set(equalRows.map((row) => row[0])).size === 2,
    "merge: preserves independent equal-probability forecasts made at the same time", r.out);
  const equalBefore = readFileSync(equalFile, "utf8");
  r = await ledger(lab, "merge", ...equalArgs, ...equalDrafts, equalFile);
  check(r.code === 0 && r.out.includes("merged 0") && readFileSync(equalFile, "utf8") === equalBefore,
    "merge: repeated drafts and reimported assigned IDs are idempotent", r.out);
  await ledger(lab, "hn-resolve", ...equalArgs, "--runs", runs);
  r = await ledger(lab, "score", ...equalArgs, "--group", "by");
  check(/by scout-a .*brier first 0\.360/.test(r.out) && /by scout-b .*brier first 0\.360/.test(r.out),
    "score: both agreeing independent forecasters survive merge and resolution", r.out);

  // Independent resolutions are research positions, not malformed duplicate rows.
  // A disagreement must not turn into a different score when Git changes row order.
  {
    const f = join(scratch, "disputed-forecasts.tsv");
    const res = join(scratch, "disputed-resolutions.tsv");
    const args = ["--forecasts", f, "--resolutions", res];
    writeFileSync(f, header +
      `F-1\t${iso(T0)}\ttrial:split\t0.9\t0.5\t${iso(T0 + H)}\tfeed\tant\tDisputed event\n` +
      `F-2\t${iso(T0)}\ttrial:agreed\t0.9\t0.5\t${iso(T0 + H)}\tfeed\tbee\tAgreed event\n`);
    const yes = `trial:split\t${iso(T0 + 3 * H)}\t1\t${iso(T0 + H)}\tintel/ant-reasoning.md\n`;
    const no = `trial:split\t${iso(T0 + 4 * H)}\t0\t${iso(T0 + H)}\tintel/bee-reasoning.md\n`;
    const agreed = `trial:agreed\t${iso(T0 + 3 * H)}\t1\t${iso(T0 + H)}\tintel/agreed.md\n`;
    for (const rows of [yes + no, no + yes]) {
      writeFileSync(res, rheader + rows + agreed);
      r = await ledger(lab, "score", ...args);
      check(r.code === 0 && r.out.includes("1 scored key(s)") && r.out.includes("1 disputed key(s)")
        && r.out.includes("brier first 0.010") && r.out.includes("intel/ant-reasoning.md") && r.out.includes("intel/bee-reasoning.md"),
        "disputed resolutions: either merge order excludes the question and exposes both evidence trails", r.out);
      check(readFileSync(res, "utf8") === rheader + rows + agreed, "disputed resolutions: scoring preserves every original row");
    }
    r = await ledger(lab, "check", ...args);
    check(r.code === 0 && r.out.includes("disputed trial:split") && !r.out.includes("resolved twice"),
      "check: disagreement is visible research to review, not invalid record structure", r.out);
    writeFileSync(res, rheader + yes + yes.replace(iso(T0 + 3 * H), iso(T0 + 4 * H)).replace("ant-reasoning", "bee-reasoning") + agreed);
    r = await ledger(lab, "score", ...args);
    check(r.out.includes("2 scored key(s)") && !r.out.includes("disputed"),
      "agreeing resolutions: different evidence and review times count once per question", r.out);
    writeFileSync(res, rheader + yes + yes.replace(iso(T0 + H), iso(T0 + 2 * H)) + agreed);
    r = await ledger(lab, "score", ...args);
    check(r.out.includes("1 disputed key(s)") && r.out.includes("1 scored key(s)"),
      "resolution timing: disagreement about when an outcome was known also needs review", r.out);
    const before = readFileSync(res, "utf8");
    const reviewed = join(scratch, "reviewed-resolutions.tsv");
    r = await ledger(lab, "resolve", "--forecasts", f, "--resolutions", reviewed, "--key", "trial:split",
      "--outcome", "1", "--known", iso(T0 + H), "--evidence", "reviews/ant-bee-reasoning.md");
    check(r.code === 0, "review: existing resolve option can record a separately evaluated outcome with its reasoning", r.out);
    r = await ledger(lab, "score", "--forecasts", f, "--resolutions", reviewed);
    check(r.out.includes("1 scored key(s)") && r.out.includes("brier first 0.010") && readFileSync(res, "utf8") === before,
      "review: an explicitly selected reviewed set scores without rewriting the disputed record", r.out);
    // Unknown known-time falls back to the earliest agreeing observation, not row order.
    const early = `trial:split\t${iso(T0 - H)}\t1\t-\tintel/early.md\n`;
    const later = `trial:split\t${iso(T0 + H)}\t1\t-\tintel/later.md\n`;
    for (const rows of [early + later, later + early]) {
      writeFileSync(res, rheader + rows);
      r = await ledger(lab, "score", ...args);
      check(r.out.includes("nothing to score yet") && r.out.includes("1 late forecast(s)"),
        "unknown event time: earliest agreeing resolution is used in either order", r.out);
    }
  }

  // ---------- add, merge, resolve ----------
  const draft = join(research, "scratch", "T-9", "forecasts.tsv");
  r = await ledger(lab, "add", "--file", draft, "--key", "edgar:acme:8k-q1", "--p", "0.35", "--closes", "2099-03-31", "--via", "edgar", "--by", "T-9", "--question", "Acme files an 8-K naming a new supplier by 31 March");
  check(r.code === 0 && readFileSync(draft, "utf8").startsWith(header), "add: writes a draft file with the header and an F-id", r.out);
  r = await ledger(lab, "add", "--file", draft, "--key", "Bad Key", "--p", "1.2", "--closes", "2099-01-01", "--question", "x");
  check(r.code === 1 && r.out.includes("key") && r.out.includes("probability"), "add: refuses a bad key and a probability above 1", r.out);
  r = await ledger(lab, "merge", draft);
  check(r.code === 0 && r.out.includes("-> F-6"), "merge: draft rows get the next F-ids", r.out);
  r = await ledger(lab, "merge", draft);
  check(r.out.includes("merged 0"), "merge: merging the same draft twice adds nothing");
  r = await ledger(lab, "resolve", "--key", "edgar:acme:8k-q1", "--outcome", "1", "--known", "2099-03-02T00:00:00Z", "--evidence", "x");
  check(r.code === 1 && r.out.includes("known is later than resolved"), "resolve: refuses an outcome known after the time it was resolved", r.out);
  r = await ledger(lab, "resolve", "--key", "edgar:acme:8k-q1", "--outcome", "void", "--evidence", "intel/2099-03-02-acme-8k.md");
  check(r.code === 0, "resolve: records a manual resolution", r.out);
  r = await ledger(lab, "resolve", "--key", "edgar:acme:8k-q1", "--outcome", "0", "--evidence", "x");
  check(r.code === 1 && r.out.includes("already resolved"), "resolve: a key is resolved once");

  // ---------- bad input ----------
  r = await ledger(lab, "add", "--file", draft, "--p", "0.2", "--closes", "2099-01-01", "--question", "no key");
  check(r.code === 1 && r.out.includes("key"), "add: refuses a row with no key", r.out);
  r = await ledger(lab, "add", "--file", draft, "--key", "gh:acme/widget:stars1k-2026-12", "--p", "0.2", "--closes", "2026-02-30", "--question", "x");
  check(r.code === 1 && r.out.includes("closes") && !r.out.includes("key"), "add: accepts owner/repo in a key, refuses a date that doesn't exist", r.out);
  r = await ledger(lab, "add", "--file", join(research, "scratch", "T-9", "lab.tsv"), "--lab", "mac", "--key", "x:1", "--p", "0.2", "--closes", "2099-01-01", "--question", "x");
  check(r.out.startsWith("F-mac-1 "), "add --lab: numbers IDs within the lab's own prefix", r.out);
  const crlf = join(scratch, "crlf.tsv");
  writeFileSync(crlf, (header + `F-1\t${iso(T0)}\tx:1\t0.3\t-\t2099-01-01\t-\t-\tq\n`).replace(/\n/g, "\r\n"));
  r = await ledger(lab, "check", "--forecasts", crlf, "--resolutions", join(scratch, "none.tsv"));
  check(r.code === 0, "check: reads a ledger with Windows line endings", r.out);

  // ---------- Git history ----------
  // Committed half an hour after T0: before story 1 reached the front page at 2h.
  git(lab, ["init", "-q"]);
  git(lab, ["add", ".research/forecasts.tsv", ".research/resolutions.tsv"]);
  git(lab, ["commit", "-qm", "ledger"], { GIT_COMMITTER_DATE: iso(T0 + 1800) });
  r = await ledger(lab, "score", "--committed");
  check(r.out.includes("2 scored key(s)") && r.out.includes("times from first commit"), "score --committed: a forecast committed before its outcome was known still counts", r.out);
  appendFileSync(forecasts, `F-7\t${iso(T0 + 1300)}\thn:2:front24\t0.01\t0.1\t${iso(T0 + 900 + 24 * H)}\thn-new\tT-4\tStory 2, written in late and backdated\n`);
  git(lab, ["commit", "-qam", "late row"]);
  r = await ledger(lab, "score", "--committed");
  check(r.out.includes("2 late forecast(s)"), "score --committed: a backdated row committed after the outcome was known is late", r.out);
  writeFileSync(forecasts, readFileSync(forecasts, "utf8").replace("\t0.3\t", "\t0.05\t"));
  r = await ledger(lab, "check");
  check(r.code === 1 && r.out.includes("working tree changed or removed earlier rows"), "check: an edit to a past forecast fails, even before it is committed", r.out);
  git(lab, ["commit", "-qam", "edit history"]);
  r = await ledger(lab, "check");
  check(r.code === 1 && /[0-9a-f]{40} changed or removed earlier rows/.test(r.out), "check: a commit that rewrote a past forecast fails and is named", r.out);

  // A malformed row fails check but doesn't stop scoring.
  appendFileSync(forecasts, `F-8\t${iso(T0)}\t\t0.5\t-\t2099-01-01\t-\t-\tno key\n`);
  r = await ledger(lab, "score");
  check(r.code === 0 && r.out.includes("skipping 1 malformed row") && r.out.includes("scored key(s)"), "score: skips a malformed row instead of refusing", r.out);

  // Two labs append on branches; a union merge keeps both, and the audit accepts it.
  {
    const shared = join(scratch, "shared");
    mkdirSync(join(shared, ".research"), { recursive: true });
    git(shared, ["init", "-q", "-b", "main"]);
    writeFileSync(join(shared, ".gitattributes"), ".research/*.tsv merge=union\n");
    writeFileSync(join(shared, ".research", "forecasts.tsv"), header);
    git(shared, ["add", "."]); git(shared, ["commit", "-qm", "start"]);
    const row = (lab, n) => ledger(shared, "add", "--lab", lab, "--key", `x:${lab}${n}`, "--p", "0.4", "--closes", "2099-01-01", "--question", "q");
    git(shared, ["checkout", "-qb", "other"]);
    await row("bee", 1); git(shared, ["commit", "-qam", "bee"]);
    git(shared, ["checkout", "-q", "main"]);
    await row("ant", 1); git(shared, ["commit", "-qam", "ant"]);
    git(shared, ["merge", "-q", "--no-edit", "other"]);
    await row("ant", 2); git(shared, ["commit", "-qam", "ant again"]);
    r = await ledger(shared, "check");
    const ids = readFileSync(join(shared, ".research", "forecasts.tsv"), "utf8").split("\n").slice(1).filter(Boolean).map((l) => l.split("\t")[0]);
    check(r.code === 0 && ids.sort().join(",") === "F-ant-1,F-ant-2,F-bee-1", "shared labs: lab-prefixed IDs and a union merge keep both labs' rows and pass the audit", r.out + ids);
  }

  // --committed uses the same effective time against both known-time and closing.
  {
    const late = join(scratch, "late-commit");
    mkdirSync(join(late, ".research"), { recursive: true });
    git(late, ["init", "-q"]);
    writeFileSync(join(late, ".research", "forecasts.tsv"), header +
      `F-1\t${iso(T0)}\ttrial:late\t0.9\t0.5\t${iso(T0 + H)}\tfeed\tant\tLate save\n`);
    writeFileSync(join(late, ".research", "resolutions.tsv"), rheader +
      `trial:late\t${iso(T0 + 4 * H)}\t1\t${iso(T0 + 3 * H)}\tintel/outcome.md\n`);
    git(late, ["add", "."]);
    git(late, ["commit", "-qm", "saved after close"], { GIT_COMMITTER_DATE: iso(T0 + 2 * H) });
    r = await ledger(late, "score", "--committed");
    check(r.out.includes("nothing to score yet") && r.out.includes("1 late forecast(s)"),
      "score --committed: first saved after close is late even if the outcome was known later", r.out);
    r = await ledger(late, "score");
    check(r.out.includes("1 scored key(s)"), "score: ordinary guidance still uses the stated forecast time", r.out);
  }

  // A ledger past 1 MiB is still audited.
  {
    const big = join(scratch, "big");
    mkdirSync(join(big, ".research"), { recursive: true });
    git(big, ["init", "-q"]);
    const bigFile = join(big, ".research", "forecasts.tsv");
    writeFileSync(bigFile, header + Array.from({ length: 9000 }, (_, i) => `F-${i + 1}\t${iso(T0)}\thn:${i}:front24\t0.1\t0.1\t2099-01-01\thn-new\tscout\tStory ${i} reaches the front page within 24h of submission\n`).join(""));
    git(big, ["add", "."]); git(big, ["commit", "-qm", "big"]);
    appendFileSync(bigFile, `F-9001\t${iso(T0)}\thn:9001:front24\t0.1\t0.1\t2099-01-01\thn-new\tscout\tone more\n`);
    git(big, ["commit", "-qam", "more"]);
    r = await ledger(big, "check");
    check(r.code === 0 && statSync(bigFile).size > 2 ** 20, "check: audits a ledger larger than 1 MiB without a false rewrite", r.out);
  }

  // ---------- the lead-note example is an ordinary PE note ----------
  {
    const lab = join(scratch, "lint-lab");
    mkdirSync(join(lab, ".research", "notes"), { recursive: true });
    mkdirSync(join(lab, ".research", "intel"), { recursive: true });
    writeFileSync(join(lab, ".research", "LAB.md"), "# lab\n\nCommits: research\nExecution: local\n");
    const example = readFileSync(join(src, "skills", "hunt", "lead-note.md"), "utf8");
    const blocks = [...example.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
    const note = blocks.find((b) => b.startsWith("---\nid: R-14"));
    const extract = blocks.find((b) => b.startsWith("# Fictional processing-capacity announcement"));
    check(note && extract, "lead note: pe-hunt's example has the note and its extract");
    writeFileSync(join(lab, ".research", "notes", "R-14.md"), note);
    writeFileSync(join(lab, ".research", "intel", "2026-11-03-processing.md"), extract);
    let out = "", code = 0;
    try { out = execFileSync("node", [join(src, "lint-notes.mjs"), "--advice"], { cwd: lab, encoding: "utf8" }); } catch (e) { code = e.status; out = e.stdout + e.stderr; }
    check(code === 0 && !/R-14:/.test(out), "lead note: PE's linter accepts the example, with no advice", out);
  }

  console.log(`\n${passed} passed`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
