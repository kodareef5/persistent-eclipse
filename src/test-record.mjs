import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  chmodSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import record from "./record.cjs";
const git = (root, ...args) =>
  execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pe-markdown-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".research/updates"), { recursive: true });
  writeFileSync(join(root, ".research/LAB.md"), "# Lab\n");
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Fixture");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "add", ".");
  git(root, "commit", "-m", "baseline");
  return root;
}
const put = (root, name, text) => {
  const file = join(root, ".research", name);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
  return file;
};
const commit = (root) => {
  git(root, "add", ".research");
  git(root, "commit", "-m", "Reviewed research and report");
};

test("Markdown updates combine across labs, preserve substantial reasoning, and relocate evidence links", (t) => {
  const root = fixture(t),
    detail = "The full argument matters.\n".repeat(1000);
  const first = put(
    root,
    "updates/2026-11-01-maple.md",
    "---\nlab: maple\ndate: 2026-11-01\n---\n## A new representation\n\n" +
      detail +
      "\n[Evidence](../notes/R-maple-1.md)\n\n```md\n[Example](../unchanged.md)\n```\n",
  );
  put(
    root,
    "updates/2026-11-01-cedar.md",
    "---\nlab: cedar\nstatus: proposed\n---\n## A useful possibility\n",
  );
  const before = readFileSync(first, "utf8"),
    result = record.build(root);
  assert.equal(result.file, join(root, ".research/REPORT.md"));
  assert.ok(result.text.includes(detail));
  assert.match(result.text, /maple/);
  assert.match(result.text, /cedar/);
  assert.match(result.text, /proposed/);
  assert.match(result.text, /\[Evidence\]\(notes\/R-maple-1.md\)/);
  assert.match(result.text, /\[Example\]\(\.\.\/unchanged.md\)/);
  assert.equal(readFileSync(first, "utf8"), before);
  assert.equal(record.build(root).text, result.text);
  commit(root);
  record.refresh(root);
  assert.equal(
    git(root, "status", "--porcelain"),
    "",
    "committing does not dirty the report again",
  );
});

test("one bad contribution or unsynced legacy reference cannot hide the rest", (t) => {
  const root = fixture(t);
  put(
    root,
    "updates/good.md",
    "## A promising connection\nA neighboring representation exposes the assumption.\n",
  );
  const bad = put(root, "updates/incomplete.md", "---\nlab: unfinished\n");
  put(root, "updates/broken.json", '{"type":');
  put(
    root,
    "updates/old.json",
    JSON.stringify({
      format: 1,
      type: "update",
      id: "old",
      summary: "Earlier evidence",
      supersedes: ["not-synced-yet"],
    }),
  );
  const result = record.build(root);
  assert.match(result.text, /promising connection/);
  assert.match(result.text, /Earlier evidence/);
  assert.match(result.text, /not-synced-yet/);
  assert.equal(result.warnings.length, 2);
  assert.match(result.text, /Entries needing attention/);
  assert.equal(readFileSync(bad, "utf8"), "---\nlab: unfinished\n");
  writeFileSync(
    bad,
    "## A recovered contribution\nThe manager completed this draft.\n",
  );
  assert.equal(record.build(root).warnings.length, 1);
  assert.match(record.build(root).text, /recovered contribution/);
});

test("manager edits and archives ordinary files; Git retains the previous wording", (t) => {
  const root = fixture(t),
    file = put(
      root,
      "updates/idea.md",
      "## An earlier interpretation\nEvidence remains linked here.\n",
    );
  record.build(root);
  commit(root);
  writeFileSync(
    file,
    "---\nstatus: archived\n---\n## An earlier interpretation\nSee [the narrower claim](narrower.md).\n",
  );
  put(
    root,
    "updates/narrower.md",
    "## A narrower claim\nThe missing assumption is explicit.\n",
  );
  const text = record.build(root).text;
  commit(root);
  assert.match(text, /narrower claim/);
  assert.match(text, /Earlier contributions/);
  assert.match(text, /updates\/idea.md/);
  assert.ok(!text.includes("Evidence remains linked here."));
  assert.match(
    git(root, "show", "HEAD~1:.research/updates/idea.md"),
    /Evidence remains linked here/,
  );
});

test("feedback, questions, and earlier reports stay readable; malformed questions are isolated", (t) => {
  const root = fixture(t);
  put(root, "FEEDBACK.md", "2026-11-01 — A useful tool improvement.\n");
  put(root, "SUMMARY.md", "Earlier account.\n");
  put(
    root,
    "questions/Q-open.json",
    JSON.stringify({
      status: "open",
      question: "May we install the tool?",
      proposedDefault: "Continue another avenue",
    }),
  );
  put(root, "questions/Q-bad.json", "{}");
  const text = record.build(root).text;
  assert.match(text, /useful tool improvement/);
  assert.match(text, /May we install/);
  assert.match(text, /awaiting an answer/);
  assert.match(text, /SUMMARY.md/);
  assert.match(text, /Q-bad.json/);
  assert.equal(
    readFileSync(join(root, ".research/SUMMARY.md"), "utf8"),
    "Earlier account.\n",
  );
});

test("building touches no hooks or Git configuration, and partial merges remain visible", (t) => {
  const root = fixture(t),
    hook = join(root, ".git/hooks/post-commit"),
    body = "#!/bin/sh\necho existing-hook\n";
  writeFileSync(hook, body);
  chmodSync(hook, 0o755);
  git(root, "config", "core.hooksPath", "custom-hooks");
  const config = readFileSync(join(root, ".git/config"), "utf8");
  put(
    root,
    "updates/merge.md",
    "<<<<<<< ours\nA claim\n=======\nAnother claim\n>>>>>>> theirs\n",
  );
  put(root, "updates/usable.md", "## Independent research\nStill readable.\n");
  const result = record.refresh(root);
  assert.match(result.text, /Independent research/);
  assert.match(result.text, /unresolved merge conflict/);
  assert.equal(readFileSync(hook, "utf8"), body);
  assert.equal(statSync(hook).mode & 0o777, 0o755);
  assert.equal(readFileSync(join(root, ".git/config"), "utf8"), config);
  assert.equal(existsSync(hook + ".before-pe"), false);
});

test("a committed report is readable remotely and rebuilds identically in another clone", (t) => {
  const root = fixture(t),
    remote = join(tmpdir(), "pe-report-remote-" + Date.now() + ".git"),
    other = remote + ".clone";
  t.after(() => {
    rmSync(remote, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  });
  put(
    root,
    "updates/a.md",
    "---\nlab: maple\n---\n## A different representation\n",
  );
  const text = record.build(root).text;
  commit(root);
  git(root, "init", "--bare", remote);
  git(root, "remote", "add", "origin", remote);
  git(root, "push", "origin", "HEAD:main");
  git(root, "clone", "--branch", "main", remote, other);
  assert.equal(git(remote, "show", "main:.research/REPORT.md"), text.trim());
  assert.equal(record.build(other).text, text);
  assert.equal(git(other, "status", "--porcelain"), "");
});

test("DSH report endpoint returns the combined view for the selected lab", async (t) => {
  const root = fixture(t);
  put(
    root,
    "updates/maple.md",
    "---\nlab: maple\n---\n## An alternative representation\n",
  );
  const { apply } = await import("./dsh-host.js"),
    { Readable } = await import("node:stream");
  let handler;
  apply({
    connection: { requestRejection: () => null },
    sessions: {
      get: (id) => (id === "manager" ? { header: { cwd: root } } : undefined),
    },
    get: () => undefined,
    effect: (fn) => fn(),
    webServer: {
      register: (options) => {
        handler = options.handler;
      },
    },
  });
  const req = Readable.from([
    JSON.stringify({
      method: "report",
      rpcId: "r1",
      payload: { sessionId: "manager" },
    }),
  ]);
  req.method = "POST";
  req.url = "/persistent-eclipse/report";
  let status, body;
  await handler(req, {
    writeHead: (value) => {
      status = value;
    },
    end: (value) => {
      body = value;
    },
  });
  assert.equal(status, 200);
  const response = JSON.parse(body);
  assert.equal(response.result.ok, true);
  assert.equal(response.result.value, record.build(root).text);
  assert.match(response.result.value, /maple/);
});
