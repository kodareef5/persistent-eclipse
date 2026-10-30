// Usage: node .research/tools/lint-notes.mjs [--dir DIR] [--draft] [--advice] [--push] [--strict]
// node lint-notes.mjs --sha prints the sha256 of this file, to check a copy is exact.
// node lint-notes.mjs --qualify <lab> [--write] renames this lab's R-<n> and REQ-<n> to
// R-<lab>-<n> and REQ-<lab>-<n> before it joins a shared lab; without --write it only reports.
// --push also checks what a push would send: credentials, large files, and note targets
// that were never committed.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
if (argv.includes("--sha")) {
  const self = readFileSync(process.argv[1], "utf8").replace(/\s+$/, "") + "\n";
  console.log(createHash("sha256").update(self).digest("hex"));
  process.exit(0);
}
const draft = argv.includes("--draft");
const pushing = argv.includes("--push");
// Advice is editorial; routine lint shows only its count, --advice shows each item.
const showAdvice = argv.includes("--advice");
// --strict fails on advice too, for anyone who wants the conventions enforced.
const strict = argv.includes("--strict");
const dirFlag = argv.indexOf("--dir");
const dir = dirFlag >= 0 ? argv[dirFlag + 1] : ".research/notes";
if (dir === undefined || dir.startsWith("--")) {
  console.error("usage: node lint-notes.mjs [--dir DIR] [--draft] [--advice] [--push] [--strict]");
  process.exit(2);
}

function researchRoot(start) {
  let at = resolve(start);
  for (;;) {
    if (basename(at) === ".research") return at;
    if (existsSync(join(at, ".research"))) return join(at, ".research");
    const up = dirname(at);
    if (up === at) return undefined;
    at = up;
  }
}
const research = researchRoot(dir);
const canonical = research === undefined ? dir : join(research, "notes");

const KINDS = new Set(["observation", "hypothesis", "finding", "negation", "question"]);
const STATES = new Set(["open", "supported", "disputed", "refuted", "superseded"]);
const RELATIONS = new Set(["supports", "refutes", "depends_on", "supersedes"]);
// A lab id names one lab among those sharing a record: R-mac-23 is lab mac's note 23.
const LAB_RE = /^[a-z][a-z0-9]{1,11}$/;
const ID_RE = /^R-(?:([a-z][a-z0-9]{1,11})-)?[1-9][0-9]*$/;
const SHA_RE = /^[0-9a-f]{40}$/;
// `checked_at: <source sha> <pkg>@<version>` names a dependency read at that pin
const DEP_RE = /^([0-9a-f]{40}) ([a-z0-9][a-z0-9._-]*)@([0-9][^\s]*)$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
// `imported_from: <lab>:R-<n> sha256:<pack hash>` names the claim a lab pack carried in
const IMPORTED_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*:R-(?:[a-z][a-z0-9]{1,11}-)?[1-9][0-9]* sha256:[0-9a-f]{64}$/;
const LABEL_RE = /^[A-Za-z][A-Za-z0-9-]*:[A-Za-z0-9._-]+$/;
// Optional record of checks beyond the author's argument, in any combination: an
// independent review, a reproducible run, a machine-checked proof of the stated claim.
const CHECKS = new Set(["review", "run", "proof"]);
// Families that can only restate a field. A family such as review: may name an approach.
const STATUS_FAMILIES = new Set(["state", "status", "checks", "verified"]);
const LONG_NOTE = 200;
// An R-id in prose, but not another lab's id such as `newmath:R-5`.
const MENTION_RE = /(?<![\w:-])R-(?:[a-z][a-z0-9]{1,11}-)?[1-9][0-9]*\b/g;

// A lab shared through a remote keeps a folder per member lab under .research/labs/.
// Unnamed and named ids live side by side: R-17 keeps its address after the lab that
// wrote it takes a name, and R-mac-18 can follow it. A prefix only keeps two writers
// from inventing the same new id.
// Messages between labs, one file each: .research/inbox/<date>-<from>-<slug>.md
const MESSAGE_RE = /^([0-9]{4}-[0-9]{2}-[0-9]{2})-([a-z][a-z0-9]{1,11})-[a-z0-9][a-z0-9-]*\.md$/;
const MESSAGE_KINDS = new Set(["hello", "request", "claim", "offer", "result", "opinion", "question", "reply"]);
const MESSAGE_STATES = new Set(["open", "taken", "done", "declined", "withdrawn"]);
// The same patterns pack.mjs warns on before an export.
const SECRETS = [/sk-or-v1-[A-Za-z0-9]{20,}/, /\bsk-[A-Za-z0-9_-]{32,}/, /\bgh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"refresh_token"\s*:\s*"[^"]{8,}/, /\bBearer [A-Za-z0-9._~+\/-]{24,}/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/];
const LARGE = 5 * 2 ** 20;

const members = research === undefined || !existsSync(join(research, "labs")) ? []
  : readdirSync(join(research, "labs"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && LAB_RE.test(d.name)).map((d) => d.name);

const qualifyFlag = argv.indexOf("--qualify");
if (qualifyFlag >= 0) {
  qualify(argv[qualifyFlag + 1], argv.includes("--write"));
  process.exit(process.exitCode ?? 0);
}

// Rename unqualified notes and runs to this lab's ids, and rewrite the prose and records
// that cite them. Evidence keeps its bytes: hashed outputs, receipts, and code that
// mention an old id are listed for the author to judge, not edited.
function qualify(lab, write) {
  if (!LAB_RE.test(lab ?? "")) {
    console.error("usage: node lint-notes.mjs --qualify <lab> [--write]; a lab id is 2-12 lowercase letters and digits, starting with a letter");
    process.exit(2);
  }
  if (research === undefined) {
    console.error("qualify: no .research directory here");
    process.exit(2);
  }
  const renames = [], map = new Map();
  const listed = (sub) => existsSync(join(research, sub)) ? readdirSync(join(research, sub)) : [];
  for (const file of listed("notes")) {
    const m = /^R-([1-9][0-9]*)\.md$/.exec(file);
    if (m === null) continue;
    map.set(`R-${m[1]}`, `R-${lab}-${m[1]}`);
    renames.push([join("notes", file), join("notes", `R-${lab}-${m[1]}.md`)]);
  }
  for (const name of listed("runs")) {
    const m = /^REQ-([1-9][0-9]*)$/.exec(name);
    if (m === null || !statSync(join(research, "runs", name)).isDirectory()) continue;
    map.set(`REQ-${m[1]}`, `REQ-${lab}-${m[1]}`);
    renames.push([join("runs", name), join("runs", `REQ-${lab}-${m[1]}`)]);
  }
  // A proof project lives under its note's id, lean/<R-id>/.
  for (const name of listed("lean")) {
    if (!/^R-[1-9][0-9]*$/.test(name) || !map.has(name) || !statSync(join(research, "lean", name)).isDirectory()) continue;
    renames.push([join("lean", name), join("lean", map.get(name))]);
  }
  if (renames.length === 0) {
    console.log("nothing to qualify: no R-<n> notes or REQ-<n> runs");
    return;
  }
  for (const [, to] of renames)
    if (existsSync(join(research, to))) {
      console.error(`qualify: ${to} already exists; resolve it by hand first`);
      process.exit(1);
    }
  // Not inside a longer name: a file such as R-5-update.md keeps its name, and so does
  // every path to it.
  const OLD_RE = /(?<![\w:-])(R|REQ)-([1-9][0-9]*)(?![\w-])/g;
  const swap = (text) => text.replace(OLD_RE, (whole) => map.get(whole) ?? whole);
  // The record's own prose: top-level files, notes, reports, reviews, intel notes, inbox,
  // lab folders, and each run's or proof's README. Anything deeper is evidence.
  // Never read: scratch and caches. Read only for the digests they quote: receipts,
  // exports, and imported packs, which are never rewritten.
  const SKIP = new Set(["scratch", "local", "activity", "tools", "vendor", ".lake", "node_modules", ".git"]);
  const QUOTE_ONLY = new Set(["exports", "imported", "receipts"]);
  const prose = (rel) => {
    const parts = rel.split("/");
    if (!rel.endsWith(".md")) return false;
    if (parts.length === 1) return true;
    if (["notes", "reports", "reviews", "labs", "inbox"].includes(parts[0])) return true;
    if (parts[0] === "intel") return parts.length === 2;
    if (["runs", "lean"].includes(parts[0])) return parts.length === 3 && parts[2] === "README.md";
    return false;
  };
  const files = [], quoted = new Set();
  const walk = (rel, candidate) => {
    for (const entry of readdirSync(join(research, rel), { withFileTypes: true })) {
      const path = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) walk(path, candidate && !QUOTE_ONLY.has(entry.name));
        continue;
      }
      if (!entry.isFile() || statSync(join(research, path)).size > 4 * 2 ** 20) continue;
      const bytes = readFileSync(join(research, path));
      if (bytes.subarray(0, 8192).includes(0)) continue;
      const text = bytes.toString("utf8");
      for (const m of text.matchAll(/\b[0-9a-f]{64}\b/g)) quoted.add(m[0]);
      if (candidate) files.push([path, bytes, text]);
    }
  };
  walk("", true);
  // Bytes the record vouches for keep them: a file whose sha256 the record quotes, and the
  // targets of a note checked at an archive hash. Notes themselves must carry the new ids.
  const pinned = new Set();
  for (const [path, , text] of files) {
    const fm = path.startsWith("notes/") ? frontmatter(text) : undefined;
    if (fm !== undefined && SHA256_RE.test(fm.checked_at ?? ""))
      for (const target of listField(fm.targets) ?? []) pinned.add(target.split("::")[0].replace(/:\d+(?:-\d+)?$/, ""));
  }
  const edits = [], left = [];
  for (const [path, bytes, text] of files) {
    const hits = [...new Set((text.match(OLD_RE) ?? []).filter((t) => map.has(t)))];
    if (hits.length === 0) continue;
    const vouched = !path.startsWith("notes/") && (pinned.has(path) || quoted.has(createHash("sha256").update(bytes).digest("hex")));
    if (prose(path) && !vouched) edits.push([path, swap(text), hits.length]);
    else left.push([path, hits]);
  }
  const counted = (dir) => renames.filter(([from]) => from.startsWith(dir)).length;
  console.log(`qualify as "${lab}": ${counted("notes")} note(s), ${counted("runs")} run(s), ${counted("lean")} proof project(s)`);
  for (const [from, to] of renames) console.log(`  ${from} -> ${to}`);
  console.log(`rewrite ${edits.length} file(s) of prose and records:`);
  for (const [path, , n] of edits) console.log(`  ${path} (${n} id${n === 1 ? "" : "s"})`);
  if (left.length > 0) {
    console.log(`left as written, ${left.length} file(s) of evidence or hashed bytes; fix by hand any path a script needs:`);
    for (const [path, hits] of left) console.log(`  ${path}: ${hits.join(", ")}`);
  }
  if (!write) {
    console.log("\n--write applies this. Then add .research/labs/" + lab + "/, lint, and commit the renames together.");
    return;
  }
  for (const [path, text] of edits) writeFileSync(join(research, path), text);
  for (const [from, to] of renames) renameSync(join(research, from), join(research, to));
  console.log(`\napplied. Next: add .research/labs/${lab}/, lint, and commit the renames together.`);
}

const problems = [];
const warn = (id, msg) => problems.push(`${id}: ${msg}`);
// Advice is printed but does not fail lint: a judgement call for the author.
const advice = [];
const advise = (id, msg) => advice.push(`${id}: ${msg}`);

// The lab's label vocabulary: every `family:value` written in backticks in LABELS.md.
const labelsFile = research === undefined ? undefined : join(research, "LABELS.md");
const vocabulary = labelsFile !== undefined && existsSync(labelsFile)
  ? new Set([...readFileSync(labelsFile, "utf8").matchAll(/`([A-Za-z][A-Za-z0-9-]*:[A-Za-z0-9._-]+)`/g)].map((m) => m[1]))
  : undefined;

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return undefined;
  const out = {};
  let open;
  for (const line of m[1].split("\n")) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item !== null && open !== undefined) {
      (out[open] ??= []).push(item[1].trim());
      continue;
    }
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    open = kv[2].trim() === "" ? kv[1] : undefined;
    if (open === undefined) out[kv[1]] = kv[2].trim();
    else delete out[kv[1]];
  }
  return out;
}

function listField(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const inner = /^\[(.*)\]$/.exec((value ?? "").trim());
  if (inner === null) return undefined;
  return inner[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const targetPath = (target) => target.split("::")[0].replace(/:\d+(?:-\d+)?$/, "");

const files = (existsSync(dir) ? readdirSync(dir) : [])
  .filter((f) => f.endsWith(".md"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const notes = new Map();
const cited = []; // [note id, target, path under .research] for the push check
for (const file of files) {
  const id = basename(file, ".md");
  const text = readFileSync(join(dir, file), "utf8");
  const fm = frontmatter(text);
  if (fm === undefined) {
    warn(id, "missing frontmatter block");
    continue;
  }
  notes.set(id, { fm, text, lines: text.split("\n").length });

  if (draft) {
    if (fm.id !== "draft") warn(id, "a draft must carry id: draft; the manager assigns the R-id on promotion");
  } else {
    if (!ID_RE.test(id)) warn(id, "filename is not an unpadded R-<n> or R-<lab>-<n> id");
    else if (members.length > 0) {
      const lab = ID_RE.exec(id)[1];
      if (lab !== undefined && !members.includes(lab)) advise(id, `lab "${lab}" has no .research/labs/${lab}/ folder yet`);
    }
    if (fm.id !== id) warn(id, `frontmatter id "${fm.id}" does not match the filename`);
  }
  if (!KINDS.has(fm.kind)) warn(id, `kind "${fm.kind}" is not ${[...KINDS].join("|")}`);
  if (!STATES.has(fm.state)) warn(id, `state "${fm.state}" is not ${[...STATES].join("|")}`);
  if (fm.checks !== undefined) {
    const checks = listField(fm.checks);
    if (checks === undefined) warn(id, "checks must be a [review, run, proof] list");
    else for (const check of checks) if (!CHECKS.has(check)) warn(id, `check "${check}" is not ${[...CHECKS].join("|")}`);
  }
  if (!fm.source) warn(id, "missing source slug");

  const labels = listField(fm.labels);
  // Labels are search hints, so their shape is a convention: advice, never a failure.
  if (labels === undefined) advise(id, "labels is not a [family:value, ...] list; labels help others find the note");
  else {
    if (labels.length < 2 || labels.length > 4) advise(id, `labels has ${labels.length} entries; two to four search best`);
    for (const label of labels) {
      if (!LABEL_RE.test(label)) advise(id, `label "${label}" is not family:value`);
      else if (STATUS_FAMILIES.has(label.split(":")[0].toLowerCase()))
        advise(id, `label "${label}" repeats what state or checks record; labels carry subject or approach`);
      else if (vocabulary !== undefined && !vocabulary.has(label))
        advise(id, `label "${label}" is not in .research/LABELS.md; reuse a listed label where one fits`);
    }
  }

  const targets = listField(fm.targets);
  if (targets === undefined) warn(id, "targets must be a [anchors] list");
  else if (targets.length === 0) warn(id, "targets is empty");
  else
    for (const target of targets) {
      const path = targetPath(target);
      const dep = /^vendor\/([^/]+)\//.exec(path);
      if (dep !== null) {
        cited.push([id, target, path]);
        if (research === undefined) warn(id, `target "${target}" needs a .research root to verify the vendor copy`);
        else if (!existsSync(join(research, "vendor", dep[1])))
          warn(id, `target "${target}" names vendor/${dep[1]}/, which does not exist`);
      } else if (path.startsWith("sources/")) {
        const slug = path.split("/")[1];
        if (research !== undefined && existsSync(join(dirname(research), "sources", slug))
          && !existsSync(join(dirname(research), path)))
          warn(id, `target "${target}" names a file that is not in sources/${slug}/`);
      } else if (path.startsWith("scratch/") && !draft) {
        warn(id, `target "${target}" is in scratch/, which the lab does not keep; promote the artifact to runs/, reports/, intel/, or lean/ and target it there`);
      } else if (/^(intel|runs|reports|reviews|notes|scratch|vendor|lean|patches)\//.test(path)) {
        cited.push([id, target, path]);
        if (research === undefined) warn(id, `target "${target}" needs a .research root`);
        else if (!existsSync(join(research, path)))
          warn(id, `target "${target}" names a file that is not in .research/`);
      } else {
        warn(id, `target "${target}" is not sources/<slug>/..., .research/<intel|runs|reports|reviews|notes|scratch|lean|patches>/..., or vendor/<pkg>@<version>/...`);
      }
    }

  if (fm.imported_from !== undefined || fm.reported_state !== undefined) {
    if (!IMPORTED_RE.test(fm.imported_from ?? "")) warn(id, "imported_from must be <lab>:<R-id> sha256:<pack sha256>");
    if (!STATES.has(fm.reported_state)) warn(id, `reported_state "${fm.reported_state}" is not ${[...STATES].join("|")}`);
  }

  if (!fm.checked_at) warn(id, "missing checked_at");
  else if (SHA_RE.test(fm.checked_at)) {
    // the source commit
  } else if (SHA256_RE.test(fm.checked_at)) {
    // a pending archive
  } else {
    const dep = DEP_RE.exec(fm.checked_at);
    if (dep === null) warn(id, `checked_at "${fm.checked_at}" is not <sha> or <sha> <pkg>@<version> or sha256:<hash>`);
    else if (research === undefined) warn(id, "a dependency pin needs a .research root to verify the vendor copy");
    else if (!existsSync(join(research, "vendor", `${dep[2]}@${dep[3]}`))) {
      // A pack keeps its dependency bytes under its own tree. The rewritten target
      // must actually reach that package; an imported_from label alone is not enough.
      const archived = IMPORTED_RE.test(fm.imported_from ?? "") && (targets ?? []).some((target) => {
        const path = targetPath(target), imported = /^intel\/imported\/[^/]+\/research\/vendor\/([^/]+)\//.exec(path);
        return imported?.[1] === `${dep[2]}@${dep[3]}` && existsSync(join(research, path));
      });
      if (!archived) warn(id, `checked_at names ${dep[2]}@${dep[3]} but vendor/${dep[2]}@${dep[3]}/ is missing locally and from the imported targets`);
    }
  }

  if (!/^## Claim$/m.test(text)) warn(id, "missing ## Claim");
  if (!/^## Evidence$/m.test(text)) warn(id, "missing ## Evidence");
  if ((fm.kind === "finding" || notes.get(id).lines > 40) && !/^## Summary$/m.test(text))
    advise(id, "long note or finding without ## Summary; a summary lets a reader triage it");
  if (notes.get(id).lines > LONG_NOTE)
    advise(id, `${notes.get(id).lines} lines; keep one claim here and move derivations and logs to runs/ or reports/`);
}


// Links: `{refutes: [R-2, R-3], depends_on: [R-4]}`
const known = new Set(notes.keys());
if (draft && existsSync(canonical))
  for (const file of readdirSync(canonical))
    if (file.endsWith(".md")) known.add(basename(file, ".md"));

const relations = new Map(); // id -> { relation: [R-id, ...] }
for (const [id, { fm }] of notes) {
  const raw = (fm.links ?? "{}").trim();
  relations.set(id, {});
  if (/^\{\s*\}$/.test(raw)) continue;
  const braced = /^\{(.*)\}$/.exec(raw);
  if (braced === null) {
    warn(id, `links "${raw}" is not a {relation: [R-id, ...]} map`);
    continue;
  }
  const body = braced[1];
  const seen = new Set();
  for (const m of body.matchAll(/([A-Za-z_][A-Za-z0-9_]*):\s*\[([^\]]*)\]/g)) {
    seen.add(m[1]);
    if (!RELATIONS.has(m[1])) warn(id, `unknown relation "${m[1]}"`);
    const targets = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    relations.get(id)[m[1]] = targets;
    if (targets.length === 0) warn(id, `relation "${m[1]}" has no targets`);
    for (const target of targets) {
      if (!ID_RE.test(target)) warn(id, `link target "${target}" is not an R-<n> or R-<lab>-<n> id`);
      else if (!known.has(target)) warn(id, `link target ${target} does not exist`);
    }
  }
  const residue = body.replace(/([A-Za-z_][A-Za-z0-9_]*):\s*\[[^\]]*\]/g, "").replace(/[,\s]/g, "");
  if (residue !== "") warn(id, `links "${raw}" has text outside a relation list`);
  if (seen.size === 0) warn(id, `links "${raw}" names no relation`);
}

// Corrections that change a claim leave the old note in place as superseded.
const superseded = new Set();
for (const [id, rel] of relations) {
  for (const old of rel.supersedes ?? []) {
    superseded.add(old);
    const target = notes.get(old);
    if (target !== undefined && target.fm.state !== "superseded")
      advise(id, `supersedes ${old}, which is still ${target.fm.state}; mark it superseded unless this note only partly replaces it`);
  }
  for (const other of rel.refutes ?? []) {
    const target = notes.get(other);
    if (notes.get(id).fm.state === "supported" && target !== undefined && ["open", "supported"].includes(target.fm.state))
      advise(other, `${id} refutes it while it is still ${target.fm.state}; mark it disputed or refuted, or narrow ${id}'s scope`);
  }
  // Prose that cites another note without a link is invisible to impact reviews.
  const linked = new Set(Object.values(rel).flat());
  const body = notes.get(id).text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const unlinked = [...new Set(body.match(MENTION_RE) ?? [])].filter((r) => r !== id && !linked.has(r) && known.has(r));
  if (unlinked.length > 0)
    advise(id, `mentions ${unlinked.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(", ")} without a link; link any it relies on, contradicts, or replaces`);
}
if (!draft)
  for (const [id, { fm }] of notes)
    if (fm.state === "superseded" && !superseded.has(id)) advise(id, "state: superseded, but no note links supersedes to it");

// The inbox: a count of what is open, and advice on messages that may not route. Routing
// helps a message reach its reader; it never decides whether a contribution counts.
const git = (...args) => execFileSync("git", args, { cwd: dirname(research), encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], maxBuffer: 1 << 30 });
let here;
try { here = research === undefined ? undefined : git("config", "--get", "pe.lab").trim() || undefined; } catch { here = undefined; }
const inbox = research === undefined ? undefined : join(research, "inbox");
let open = 0, mine = 0;
if (!draft && inbox !== undefined && existsSync(inbox)) {
  const today = new Date().toISOString().slice(0, 10);
  for (const file of readdirSync(inbox).filter((f) => f.endsWith(".md")).sort()) {
    const at = `inbox/${file}`, name = MESSAGE_RE.exec(file);
    const fm = frontmatter(readFileSync(join(inbox, file), "utf8"));
    if (name === null) advise(at, "name is not <yyyy-mm-dd>-<from lab>-<slug>.md");
    if (fm === undefined) { advise(at, "missing frontmatter block"); continue; }
    if (name !== null && fm.from !== name[2]) advise(at, `from "${fm.from}" does not match the name's lab "${name[2]}"`);
    const to = listField(fm.to) ?? (fm.to ? [fm.to] : []);
    if (to.length === 0) advise(at, "to names no lab; use a lab id, a list of them, or all");
    for (const lab of [fm.from, ...to])
      if (lab !== undefined && lab !== "all" && !members.includes(lab)) advise(at, `lab "${lab}" has no .research/labs/${lab}/ folder`);
    if (!MESSAGE_KINDS.has(fm.kind)) advise(at, `kind "${fm.kind}" is not ${[...MESSAGE_KINDS].join("|")}`);
    if (!MESSAGE_STATES.has(fm.state)) advise(at, `state "${fm.state}" is not ${[...MESSAGE_STATES].join("|")}`);
    if (fm.kind === "reply" && !(listField(fm.re) ?? []).length) advise(at, "a reply names what it answers in re");
    if (fm.until !== undefined && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fm.until)) advise(at, `until "${fm.until}" is not a yyyy-mm-dd date`);
    if (fm.kind === "claim" && fm.state === "open" && fm.until !== undefined && fm.until < today)
      advise(at, `claim expired on ${fm.until}; mark it done or withdrawn, or extend it`);
    if (fm.state === "open") {
      open++;
      if (here !== undefined && fm.from !== here && (to.includes(here) || to.includes("all"))) mine++;
    }
  }
}

// What a push would send: every object the lab branch on the lab remote lacks, from every
// outgoing commit, since history travels too. Other labs check out exactly this.
if (pushing && research !== undefined) {
  const policy = existsSync(join(research, "LAB.md")) ? readFileSync(join(research, "LAB.md"), "utf8") : "";
  // The Sync line alone: `[ \t]` never reads the next line of LAB.md as the branch.
  const sync = /^[ \t]*Sync:[ \t]*([^\s(]+)(?:[ \t]+([^\s(]+))?/m.exec(policy);
  const remote = sync !== null && sync[1].toLowerCase() !== "off" ? sync[1] : "origin", branch = sync?.[2] ?? "main";
  let head;
  try { head = git("rev-parse", "--verify", "HEAD").trim(); } catch { warn("push", "no commit to check; commit first"); }
  if (head !== undefined) {
    let base = [];
    try { git("rev-parse", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`); base = ["--not", `refs/remotes/${remote}/${branch}`]; }
    catch { /* nothing fetched from the lab branch yet: all of history is outgoing */ }
    let destination;
    try { destination = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{push}").trim(); } catch { destination = undefined; }
    if (destination === undefined) advise("push", `git push has no default destination here; push explicitly to ${remote} ${branch}, or set the upstream to ${remote}/${branch}`);
    else if (destination !== `${remote}/${branch}`) warn("push", `git push would go to ${destination}, but the lab shares ${remote}/${branch}; push explicitly to ${remote} ${branch}, or set the upstream`);

    const prefix = git("rev-parse", "--show-prefix").trim();
    const current = new Map(); // repository path -> blob at HEAD
    for (const row of git("ls-tree", "-r", "--full-tree", "-z", "HEAD").split("\0").filter(Boolean)) {
      const tab = row.indexOf("\t"), [, type, object] = row.slice(0, tab).split(" ");
      if (type === "blob") current.set(row.slice(tab + 1), object);
    }
    const paths = new Map(); // outgoing object -> a path it was committed at
    for (const line of git("rev-list", "--objects", "HEAD", ...base).split("\n")) {
      const space = line.indexOf(" ");
      if (space > 0 && !paths.has(line.slice(0, space))) paths.set(line.slice(0, space), line.slice(space + 1));
    }
    const kinds = paths.size === 0 ? "" : execFileSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
      { cwd: dirname(research), input: [...paths.keys()].join("\n") + "\n", encoding: "utf8", maxBuffer: 1 << 30 });
    const allowed = existsSync(join(research, "LARGE.md"))
      ? new Set([...readFileSync(join(research, "LARGE.md"), "utf8").matchAll(/`([^`]+)`/g)].map((m) => m[1])) : new Set();
    const where = (object, path) => current.get(path) === object ? path : `${path} (in an outgoing commit, no longer at HEAD)`;
    const text = [];
    for (const row of kinds.split("\n").filter(Boolean)) {
      const [object, type, size] = row.split(" ");
      if (type !== "blob") continue;
      const path = paths.get(object), bytes = Number(size);
      if (bytes > LARGE && !allowed.has(path))
        warn(where(object, path), `${(bytes / 2 ** 20).toFixed(1)} MiB; reference it by origin, size, and sha256 as pe-export does, or list it in .research/LARGE.md with the reason`);
      else if (bytes <= LARGE) text.push(object);
    }
    if (text.length > 0) {
      const out = execFileSync("git", ["cat-file", "--batch"], { cwd: dirname(research), input: text.join("\n") + "\n", maxBuffer: 1 << 30 });
      let at = 0;
      for (const object of text) {
        const nl = out.indexOf(10, at), head = out.subarray(at, nl).toString().split(" ");
        const size = Number(head[2]), body = out.subarray(nl + 1, nl + 1 + size);
        at = nl + 1 + size + 1;
        if (body.subarray(0, 8192).includes(0)) continue;
        body.toString("utf8").split("\n").forEach((line, i) => {
          if (SECRETS.some((re) => re.test(line)))
            warn(`${where(object, paths.get(object))}:${i + 1}`, "looks like a credential; remove it, and rewrite any unpushed commit that carries it, before pushing");
        });
      }
    }
    for (const [id, target, path] of cited)
      if (!current.has(`${prefix}.research/${path}`) && existsSync(join(research, path)))
        warn(id, `target "${target}" is not committed, so other labs cannot open it`);
  }
}

const byKind = {};
const byState = {};
const byCheck = {};
for (const { fm } of notes.values()) {
  const kind = fm.kind ?? "-", state = fm.state ?? "-";
  byKind[kind] = (byKind[kind] ?? 0) + 1;
  byState[state] = (byState[state] ?? 0) + 1;
  const checks = listField(fm.checks) ?? [];
  for (const check of checks.length ? checks : ["unrecorded"]) byCheck[check] = (byCheck[check] ?? 0) + 1;
}
const tally = (counts) =>
  Object.entries(counts)
    .sort()
    .map(([k, n]) => `${k}=${n}`)
    .join(" ");
console.log(`${notes.size} notes: ${tally(byKind)}`);
console.log(`states: ${tally(byState)}`);
console.log(`checks: ${tally(byCheck)}`);
if (open > 0 || mine > 0) console.log(`inbox: ${open} open${here === undefined ? "" : `, ${mine} to ${here}`}`);
const width = Math.max(5, ...[...notes.keys()].map((id) => id.length));
for (const [id, { fm }] of notes) {
  const shown = Array.isArray(fm.labels) ? fm.labels.join(", ") : (fm.labels ?? "");
  console.log(`  ${id.padEnd(width)} ${String(fm.kind ?? "-").padEnd(11)} ${String(fm.state ?? "-").padEnd(10)} ${shown}`);
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log("\nno problems");
}

if (strict && advice.length > 0) process.exitCode = 1;
if (advice.length > 0 && (showAdvice || strict)) {
  console.log(`\n${advice.length} advice (does not fail lint):`);
  for (const line of advice) console.log(`  - ${line}`);
} else if (advice.length > 0) {
  console.log(`${advice.length} optional suggestion(s); --advice lists them`);
}
