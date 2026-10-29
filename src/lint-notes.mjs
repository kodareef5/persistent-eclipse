// Usage: node .research/tools/lint-notes.mjs [--dir DIR] [--draft] [--advice]
// node lint-notes.mjs --sha prints the sha256 of this file, to check a copy is exact.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
if (argv.includes("--sha")) {
  const self = readFileSync(process.argv[1], "utf8").replace(/\s+$/, "") + "\n";
  console.log(createHash("sha256").update(self).digest("hex"));
  process.exit(0);
}
const draft = argv.includes("--draft");
// Advice is editorial; routine lint shows only its count, --advice shows each item.
const showAdvice = argv.includes("--advice");
const dirFlag = argv.indexOf("--dir");
const dir = dirFlag >= 0 ? argv[dirFlag + 1] : ".research/notes";
if (dir === undefined || dir.startsWith("--")) {
  console.error("usage: node lint-notes.mjs [--dir DIR] [--draft] [--advice]");
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
const ID_RE = /^R-[1-9][0-9]*$/;
const SHA_RE = /^[0-9a-f]{40}$/;
// `checked_at: <source sha> <pkg>@<version>` names a dependency read at that pin
const DEP_RE = /^([0-9a-f]{40}) ([a-z0-9][a-z0-9._-]*)@([0-9][^\s]*)$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
// `imported_from: <lab>:R-<n> sha256:<pack hash>` names the claim a lab pack carried in
const IMPORTED_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*:R-[1-9][0-9]* sha256:[0-9a-f]{64}$/;
const LABEL_RE = /^[A-Za-z][A-Za-z0-9-]*:[A-Za-z0-9._-]+$/;
// Optional record of checks beyond the author's argument, in any combination: an
// independent review, a reproducible run, a machine-checked proof of the stated claim.
const CHECKS = new Set(["review", "run", "proof"]);
// Families that can only restate a field. A family such as review: may name an approach.
const STATUS_FAMILIES = new Set(["state", "status", "checks", "verified"]);
const LONG_NOTE = 200;
// An R-id in prose, but not another lab's id such as `newmath:R-5`.
const MENTION_RE = /(?<![\w:-])R-[1-9][0-9]*\b/g;

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
    if (!ID_RE.test(id)) warn(id, "filename is not an unpadded R-<n> id");
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
  if (labels === undefined) warn(id, "labels must be a [family:value, ...] list");
  else {
    if (labels.length < 2 || labels.length > 4) warn(id, `labels has ${labels.length} entries, expected 2-4`);
    for (const label of labels) {
      if (!LABEL_RE.test(label)) warn(id, `label "${label}" is not family:value`);
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
      } else if (/^(intel|runs|reports|notes|scratch|vendor|lean|patches)\//.test(path)) {
        if (research === undefined) warn(id, `target "${target}" needs a .research root`);
        else if (!existsSync(join(research, path)))
          warn(id, `target "${target}" names a file that is not in .research/`);
      } else {
        warn(id, `target "${target}" is not sources/<slug>/..., .research/<intel|runs|reports|notes|scratch|lean|patches>/..., or vendor/<pkg>@<version>/...`);
      }
    }

  if (fm.imported_from !== undefined || fm.reported_state !== undefined) {
    if (!IMPORTED_RE.test(fm.imported_from ?? "")) warn(id, "imported_from must be <lab>:R-<n> sha256:<pack sha256>");
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
    warn(id, "long note or finding without ## Summary");
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
      if (!ID_RE.test(target)) warn(id, `link target "${target}" is not an R-<n> id`);
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
for (const [id, { fm }] of notes) {
  const shown = Array.isArray(fm.labels) ? fm.labels.join(", ") : (fm.labels ?? "");
  console.log(`  ${id.padEnd(5)} ${String(fm.kind ?? "-").padEnd(11)} ${String(fm.state ?? "-").padEnd(10)} ${shown}`);
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exitCode = 1;
} else {
  console.log("\nno problems");
}

if (advice.length > 0 && showAdvice) {
  console.log(`\n${advice.length} advice (does not fail lint):`);
  for (const line of advice) console.log(`  - ${line}`);
} else if (advice.length > 0) {
  console.log(`${advice.length} optional suggestion(s); --advice lists them`);
}
