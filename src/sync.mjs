// Combine committed research and rebuild its views before pushing privately.
// An alternate index holds the snapshot; the manager's index and drafts stay alone.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  renameSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { writeActivity } from './history.mjs';
import record from './record.cjs';
import { checkPush } from './push-check.mjs';
const exec = promisify(execFile),
  active = new Map();
const allowed = (p) =>
  /^\.research\/(?:FEEDBACK\.md$|LARGE\.md$|questions\/|updates\/|inbox\/|patches\/|lean\/|notes\/|runs\/|vendor\/|reviews\/|reports\/|status-reports\/|activity\/|intel\/|(?:REPORT|SUMMARY|STATUS|FRONTIER|QUEUE|FLEET|CADENCE|LAB|MISSION|SCOPE|SOURCES|MAP|RUNS|ENV|WATCH|LABELS)\.md$|labs\/|packs(?:\.lock)?\.json$|tools\/)/.test(
    p,
  ) && !/(?:^|\/)(?:local|scratch|node_modules|credentials)(?:\/|$)/.test(p);
async function gitBytes(root, args, {env, input} = {}) {
  const task = exec("git", ["-C", root, ...args], {
      timeout: 15000,
      maxBuffer: 64 * 1024 * 1024,
      encoding: "buffer",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...env },
  });
  task.child.stdin.on("error", () => {}); // Git may reject before reading input.
  task.child.stdin.end(input);
  return (await task).stdout;
}
const git = async (root, args, options) => (await gitBytes(root, args, options)).toString().trim();

// Only these files are disposable views. Raw receipts, Markdown contributions,
// questions and human-maintained records always get ordinary Git conflict handling.
const generated = (p) => p === ".research/REPORT.md" ||
  /^\.research\/activity\/(?:README\.md|overview\.svg|labs\/[^/]+\.(?:md|svg))$/.test(p);
const reportInput = (p) => /^\.research\/(?:LAB\.md|FEEDBACK\.md|SUMMARY\.md|STATUS\.md|updates\/|questions\/|status-reports\/|labs\/|activity\/)/.test(p);

async function treeFiles(root, tree) {
  const text = (await gitBytes(root, ["ls-tree", "-r", "-z", tree, "--", ".research"])).toString();
  return text.split("\0").filter(Boolean).map(line => {
    const [header, ...name] = line.split("\t");
    const [mode, type, hash] = header.split(" ");
    return {mode, type, hash, path: name.join("\t")};
  });
}

async function rebuildTree(root, tree) {
  const temp = mkdtempSync(join(tmpdir(), "pe-shared-report-"));
  const snapshot = join(temp, "snapshot"), env = {GIT_INDEX_FILE: join(temp, "index")};
  try {
    const entries = await treeFiles(root, tree);
    const inputs = entries.filter(e => reportInput(e.path) && !generated(e.path));
    // Do not follow a shared symlink into private files while rendering a report.
    if (inputs.some(e => e.type !== "blob" || !/^100(644|755)$/.test(e.mode)))
      throw new Error("Report inputs include a symlink or submodule; review those paths before syncing.");
    mkdirSync(snapshot);
    if (inputs.length) {
      const blobs = await gitBytes(root, ["cat-file", "--batch"], {input: inputs.map(e => e.hash).join("\n") + "\n"});
      let offset = 0;
      for (const entry of inputs) {
        const end = blobs.indexOf(10, offset);
        const [hash, type, size] = blobs.subarray(offset, end).toString().split(" ");
        const length = Number(size);
        if (hash !== entry.hash || type !== "blob" || !Number.isSafeInteger(length))
          throw new Error("Cannot read committed report inputs");
        const file = join(snapshot, entry.path);
        mkdirSync(dirname(file), {recursive: true});
        writeFileSync(file, blobs.subarray(end + 1, end + 1 + length));
        offset = end + length + 2;
      }
    }
    // These are the installed engine's builders, never executable code from the lab.
    writeActivity(snapshot);
    record.build(snapshot);
    await git(root, ["read-tree", tree], {env});
    const old = entries.filter(e => generated(e.path));
    if (old.length) await git(root, ["update-index", "--force-remove", "-z", "--stdin"],
      {env, input: old.map(e => e.path).join("\0") + "\0"});
    const walk = (dir) => readdirSync(dir, {withFileTypes: true}).flatMap(e => {
      const file = join(dir, e.name);
      return e.isDirectory() ? walk(file) : [file];
    });
    for (const file of walk(snapshot)) {
      const name = relative(snapshot, file).split("\\").join("/");
      if (!generated(name)) continue;
      const hash = await git(root, ["hash-object", "-w", "--stdin"], {input: readFileSync(file)});
      await git(root, ["update-index", "--add", "--cacheinfo", "100644", hash, name], {env});
    }
    return await git(root, ["write-tree"], {env});
  } finally {
    rmSync(temp, {recursive: true, force: true});
  }
}

async function mergedTree(root, head, target) {
  let output;
  try {
    output = await gitBytes(root, ["merge-tree", "--write-tree", "--name-only", "-z", head, target]);
  } catch (error) {
    if (error.code !== 1 || !error.stdout?.length) throw error;
    output = error.stdout;
  }
  const [tree, ...rest] = output.toString().split("\0");
  if (!/^[a-f0-9]{40,64}$/.test(tree)) throw new Error("Git could not prepare the shared merge");
  const end = rest.indexOf("");
  const conflicts = rest.slice(0, end < 0 ? rest.length : end).filter(Boolean);
  return {tree, conflicts: conflicts.filter(p => !generated(p))};
}
export function syncStatus(root) {
  try {
    return JSON.parse(
      readFileSync(join(root, ".research/local/sync.json"), "utf8"),
    );
  } catch {
    return { state: "local" };
  }
}
function save(root, value) {
  const prior = syncStatus(root), notice = syncNotice(value);
  // A new report commit, retry timestamp, or advice item isn't a new instruction.
  const noticeId = notice ? (syncNotice(prior) === notice ? prior.noticeId || notice : randomUUID()) : null;
  writeLocal(root, "sync.json", { ...value, notice, noticeId, at: new Date().toISOString() });
}
function writeLocal(root, name, value) {
  const dir = join(root, ".research/local");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".gitignore"), "*\n");
  const file = join(dir, name), temp = file + "." + randomUUID();
  writeFileSync(
    temp,
    JSON.stringify(value, null, 2) + "\n",
  );
  renameSync(temp, file);
}
function syncNotice(value) {
  const lines = [];
  const brief = (items = []) => items.slice(0, 5).join("; ") +
    (items.length > 5 ? `; ${items.length - 5} more in .research/local/sync.json` : "");
  if (value.state === "waiting")
    lines.push("Shared research is ready to bring into this checkout. Background sharing has left the working files and index alone. At a useful pause, run node .research/tools/sync.mjs and read the incoming changes before choosing follow-up work.");
  if (value.state === "needs-merge")
    lines.push("Shared research has a substantive conflict for the manager: " + brief(value.conflicts));
  if (value.state === "needs-review")
    lines.push("Sharing is waiting for outgoing-history review: " + brief(value.problems));
  return lines.join("\n");
}
// Adapters ask at an existing turn boundary, then acknowledge only a message
// admitted to the transcript. No timer wakes a manager just to deliver status.
export function pendingSyncNotice(root, delivered = []) {
  acknowledgeSyncNotice(root, delivered);
  const value = syncStatus(root), text = syncNotice(value);
  if (!text) return null;
  const id = value.noticeId || text; // Upgrade older clone-local status in place.
  try {
    if (JSON.parse(readFileSync(join(root, ".research/local/sync-delivery.json"), "utf8")).id === id) return null;
  } catch {}
  return {id, text};
}
export function acknowledgeSyncNotice(root, delivered) {
  const value = syncStatus(root), text = syncNotice(value), id = value.noticeId || text;
  if (!text || !delivered.includes(id)) return;
  const file = join(root, ".research/local/sync-delivery.json");
  try { if (JSON.parse(readFileSync(file, "utf8")).id === id) return; } catch {}
  writeLocal(root, "sync-delivery.json", {id});
}
export function scheduleSync(root, { force = false, background = true } = {}) {
  if (active.has(root)) return active.get(root);
  const task = run(root, force, background).finally(() => active.delete(root));
  active.set(root, task);
  return task;
}
async function run(root, force, background) {
  const prior = syncStatus(root);
  if (!force && Date.now() - Date.parse(prior.at || 0) < 60000) return prior;
  let lock,
    acquired = false;
  try {
    const text = readFileSync(join(root, ".research/LAB.md"), "utf8");
    const match =
      /^[ \t]*Sync:[ \t]*([^\s(]+)(?:[ \t]+([^\s(]+))?[^\n]*/im.exec(text);
    if (!match || match[1].toLowerCase() === "off") {
      save(root, { state: "local" });
      return syncStatus(root);
    }
    const [, remote, branch = "main"] = match;
    const automatic = !/^[ \t]*Auto sync:[ \t]*off\b/im.test(text);
    if (background && !automatic) {
      save(root, {state: "manual", automatic, remote, branch});
      return syncStatus(root);
    }
    if (
      !/^[\w.-]+$/.test(remote) ||
      !/^[\w./-]+$/.test(branch) ||
      branch.startsWith("-")
    )
      throw new Error("Invalid sync target");
    const url = await git(root, ["remote", "get-url", remote]);
    const pushUrls = (await git(root, ["remote", "get-url", "--push", "--all", remote])).split("\n");
    const approved = await git(root, [
      "config",
      "--get",
      "pe.syncApprovedUrl",
    ]).catch(() => "");
    if (approved !== url || pushUrls.length !== 1 || pushUrls[0] !== approved)
      throw new Error(
        "Sync fetch and push destinations must match the private URL approved in pe.syncApprovedUrl.",
      );
    const dir = join(root, ".research/local");
    mkdirSync(dir, { recursive: true });
    lock = join(dir, "sync.lock");
    try {
      mkdirSync(lock);
      acquired = true;
    } catch {
      // Recover a lock left by a dead local process. Unknown locks stay untouched.
      let pid;
      try {
        pid = Number(readFileSync(join(lock, "pid"), "utf8"));
      } catch {}
      if (!Number.isInteger(pid) || pid <= 0) return { state: "busy" };
      try {
        process.kill(pid, 0);
        return { state: "busy" };
      } catch (e) {
        if (e.code !== "ESRCH") return { state: "busy" };
      }
      const stale = lock + ".stale-" + process.pid;
      try {
        renameSync(lock, stale);
        rmSync(stale, { recursive: true, force: true });
        mkdirSync(lock);
        acquired = true;
      } catch {
        return { state: "busy" };
      }
    }
    writeFileSync(join(lock, "pid"), String(process.pid));
    if ((await git(root, ["branch", "--show-current"])) !== branch)
      throw new Error("Sync waits for the configured lab branch.");
    for (const name of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "rebase-merge", "rebase-apply"]) {
      const file = await git(root, ["rev-parse", "--git-path", name]);
      if (existsSync(resolve(root, file))) throw new Error("Sync waits for the current Git operation to finish.");
    }
    await git(root, ["fetch", remote, branch]);
    const target = `refs/remotes/${remote}/${branch}`;
    const head = await git(root, ["rev-parse", "HEAD"]);
    const incoming = await git(root, ["rev-parse", target]);
    const paths = (
      await git(root, ["log", "--format=", "--name-only", `${target}..HEAD`])
    )
      .split("\n")
      .filter(Boolean);
    if (paths.some((p) => !allowed(p)))
      throw new Error(
        "Unsent commits include files outside the research sync paths; review them manually.",
      );
    const [behind, ahead] = (
      await git(root, [
        "rev-list",
        "--left-right",
        "--count",
        `${target}...HEAD`,
      ])
    )
      .split(/\s+/)
      .map(Number);
    let tree = await git(root, ["rev-parse", `${behind ? incoming : head}^{tree}`]);
    if (behind && ahead) {
      const merged = await mergedTree(root, head, incoming);
      if (merged.conflicts.length) {
        save(root, {state: "needs-merge", behind, ahead, remote, branch, conflicts: merged.conflicts});
        return syncStatus(root);
      }
      tree = merged.tree;
    }
    // Render only when this clone contributes commits. Incoming-only sync keeps
    // the sender's views, even if a different engine would draw them differently.
    // This is history-based, so it holds across restarts and mixed PE versions.
    const built = ahead ? await rebuildTree(root, tree) : tree;
    let result = behind ? incoming : head;
    if (built !== tree || (behind && ahead)) {
      const parents = behind && ahead ? [head, incoming] : [result];
      result = await git(root, ["commit-tree", built, ...parents.flatMap(p => ["-p", p]),
        "-m", behind && ahead ? "Merge shared research and rebuild reports" : "Rebuild shared research reports"]);
    }
    // Check the exact outgoing graph, including the generated merge/report commit.
    // No checkout mutation or push happens on a failed check. Do not run a mutable
    // lab copy of the linter, which could have drifted or been edited by a worker.
    let advice = prior.reviewed === result ? prior.advice || [] : [];
    if (result !== incoming) {
      const checked = await checkPush(root, {head: result, base: incoming, remote, branch});
      advice = checked.advice;
      if (checked.problems.length) {
        save(root, {state: "needs-review", automatic, remote, branch, ahead,
          error: "Outgoing history failed push review.", problems: checked.problems, advice});
        return syncStatus(root);
      }
    }
    // Publishing a prepared commit needs no checkout mutation. The manager's
    // explicit command adopts it through ordinary fast-forward checks at a time
    // they choose. Background timers and UI reads cannot replace files beneath
    // a running command, change a mission mid-turn, or touch the manager's index.
    if ((await git(root, ["rev-parse", "HEAD"])) !== head ||
        (await git(root, ["branch", "--show-current"])) !== branch)
      throw new Error("The lab changed during sync; retry after the current Git operation.");
    if (!background && result !== head) await git(root, ["merge", "--ff-only", "--no-edit", result]);
    if (result !== incoming) await git(root, ["push", remote, `${result}:refs/heads/${branch}`]);
    // Report commits can be newer than this checkout without carrying any
    // research to adopt. Keep publishing their views, quietly, until the manager
    // chooses to fast-forward. Raw activity receipts are research, not views.
    const changes = background && result !== head
      ? (await git(root, ["diff", "--name-only", "-z", head, result])).split("\0").filter(Boolean) : [];
    const waiting = changes.some(p => !generated(p));
    save(root, { state: waiting ? "waiting" : "synced", ahead: 0,
      behind: waiting ? Number(await git(root, ["rev-list", "--count", `${head}..${result}`])) : 0,
      viewsPending: !waiting && changes.length > 0,
      automatic, remote, branch, reviewed: result, advice });
  } catch (e) {
    save(root, { state: "pending", error: String(e.message).slice(0, 500) });
  } finally {
    if (acquired) rmSync(lock, { recursive: true, force: true });
  }
  return syncStatus(root);
}

function isCommand() {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
}
if (isCommand()) {
  const root = record.rootOf(process.cwd());
  const status = await scheduleSync(root, {force: true, background: false});
  console.log(JSON.stringify(status, null, 2));
  if (!["synced", "local"].includes(status.state)) process.exitCode = 1;
}
