// Usage: node .research/tools/pack.mjs plan <name>
//        node .research/tools/pack.mjs build <name>
//        node .research/tools/pack.mjs verify <pack.zip> [--extract DIR]
// node pack.mjs --sha prints the sha256 of this file, to check a copy is exact.
//
// A lab pack (pe-lab-pack/1) carries one lab's record to another lab as a migration
// source. Optional `plan` lists files and preserves the manager's packaging choices.
// References need an origin and summary; otherwise their bytes travel too. `build`
// writes .research/exports/<name>.pe-pack.zip. `verify` checks a pack before anyone
// reads it, and can extract it. Nothing here runs code from a source or a pack.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

export const FORMAT = "pe-lab-pack/1";
const PLAN_FORMAT = "pe-lab-pack-plan/1";
// Exclude runtime output, not authored helpers or another import's provenance.
const SKIP_ROOT = new Set(["scratch", "exports", "local"]);
const SKIP = new Set([".lake", ".git", ".DS_Store"]);
const SHIPPED = /^tools\/(?:lint-notes|cvss|pack|history)\.mjs(?:\.shipped)?$/;
// Suggestions only: size and extension cannot tell us whether bytes are replaceable.
const BINARY = /\.(pdf|png|jpe?g|gif|webp|svg|zip|gz|tgz|tar|bz2|xz|7z|bin|so|dylib|dll|exe|wasm|mp4|mov|olean)$/i;
const LARGE = 1024 * 1024;
const SECRETS = [/sk-or-v1-[A-Za-z0-9]{20,}/, /\bsk-[A-Za-z0-9_-]{32,}/, /\bgh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"refresh_token"\s*:\s*"[^"]{8,}/, /\bBearer [A-Za-z0-9._~+\/-]{24,}/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/];
// Windows reserves device names even with an extension (for example, NUL.txt).
const WINDOWS_DEVICE = /^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i;
const safeName = (name) => typeof name === "string" && !/[\\:<>"|?*\x00-\x1f\x7f]/.test(name)
  && name.split("/").every((part) => part && !/[. ]$/.test(part) && !WINDOWS_DEVICE.test(part));

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (message) => { console.error(message); process.exit(1); };

function researchRoot(start = ".") {
  for (let at = resolve(start); ; at = dirname(at)) {
    if (existsSync(join(at, ".research", "LAB.md"))) return join(at, ".research");
    if (dirname(at) === at) fail("pack: not inside a lab (no .research/LAB.md above this directory)");
  }
}

function walk(research, dir = research, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name) || (dir === research && SKIP_ROOT.has(name))) continue;
    const full = join(dir, name), path = full.slice(research.length + 1).split(sep).join("/");
    if (SHIPPED.test(path)) continue;
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) { console.error(`warning: ${path}: symbolic link left out`); continue; }
    if (stat.isDirectory()) walk(research, full, out);
    else if (stat.isFile()) out.push(path);
  }
  return out;
}

const git = (cwd, args) => { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

function sources(lab) {
  const file = join(lab, ".gitmodules");
  if (!existsSync(file)) return [];
  const found = [];
  for (const block of readFileSync(file, "utf8").split(/^\[submodule /m).slice(1)) {
    const path = block.match(/^\s*path\s*=\s*(.+)$/m)?.[1].trim(), url = block.match(/^\s*url\s*=\s*(.+)$/m)?.[1].trim();
    if (!path?.startsWith("sources/")) continue;
    found.push({ slug: path.slice("sources/".length), url: url ?? null, sha: git(lab, ["rev-parse", `HEAD:${path}`]) ?? git(join(lab, path), ["rev-parse", "HEAD"]) });
  }
  return found;
}

function exportDir(research, name) {
  const dir = join(research, "exports", name);
  mkdirSync(dir, { recursive: true });
  const ignore = join(research, "exports", ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*.zip\n", { flag: "wx" });
  return dir;
}

function readPlan(dir) {
  const file = join(dir, "plan.json");
  if (!existsSync(file)) return { format: PLAN_FORMAT, files: [] };
  const p = JSON.parse(readFileSync(file, "utf8"));
  if (p.format !== PLAN_FORMAT || !Array.isArray(p.files)) fail("pack: unrecognized plan format");
  return p;
}

function plan(name) {
  const research = researchRoot(), lab = dirname(research), dir = exportDir(research, name);
  const previous = readPlan(dir), choices = new Map(previous.files.map((f) => [f.path, f]));
  const files = walk(research).map((path) => {
    const bytes = lstatSync(join(research, path)).size;
    const { action = "include", origin, summary } = choices.get(path) ?? {};
    return { path, bytes, action, origin, summary, ...(BINARY.test(path) || bytes > LARGE ? { reference_candidate: true } : {}) };
  });
  const out = join(dir, "plan.json");
  writeFileSync(out, JSON.stringify({ format: PLAN_FORMAT, name, created: previous.created ?? new Date().toISOString(), files }, null, 2) + "\n");
  const count = (a) => files.filter((f) => f.action === a).length;
  console.log(`wrote ${out.slice(lab.length + 1)}: ${count("include")} include, ${count("reference")} reference`);
  console.log(`Choices kept. To replace bytes with a reference, set action, origin, and summary. Write ${join("exports", name, "README.md")}, then build.`);
}

function build(name) {
  const research = researchRoot(), lab = dirname(research);
  const dir = exportDir(research, name);
  if (!existsSync(join(dir, "README.md"))) fail(`pack: write ${join(".research", "exports", name, "README.md")} first: what the lab knows, its status, and open work`);
  const p = readPlan(dir), choices = new Map(p.files.map((f) => [f.path, f]));
  const problems = [];
  const included = [], referenced = [], omitted = [];
  for (const path of walk(research)) {
    const f = choices.get(path) ?? { action: "include" };
    if (!safeName(path)) { problems.push(`${path}: unsafe archive path`); continue; }
    const bytes = readFileSync(join(research, path));
    const record = { path, bytes: bytes.length, sha256: sha256(bytes) };
    if (f.action === "reference" && f.origin?.trim() && f.summary?.trim()) {
      referenced.push({ ...record, origin: f.origin, summary: f.summary });
    } else if (f.action === "include" || f.action === "reference") {
      if (f.action === "reference") console.error(`warning: ${path}: incomplete reference; included the bytes`);
      included.push({ ...record, bytesData: bytes });
    } else if (f.action === "omit") {
      omitted.push({ ...record, reason: f.summary || "omitted by export plan" });
    } else problems.push(`${path}: action must be include, reference, or omit`);
  }
  if (problems.length) fail(`pack: not built\n${problems.map((x) => `- ${x}`).join("\n")}`);
  // A first build needs no plan command. Retain its time so rebuilding stays deterministic.
  if (!p.created) {
    p.created = new Date().toISOString();
    writeFileSync(join(dir, "plan.json"), JSON.stringify({ ...p, name }, null, 2) + "\n");
  }
  const mission = existsSync(join(research, "MISSION.md")) ? readFileSync(join(research, "MISSION.md"), "utf8").match(/^Mode: (.+)$/m)?.[1] ?? null : null;
  const slug = basename(lab).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "lab";
  const manifest = { format: FORMAT, name, created: p.created, lab: slug, commit: git(lab, ["rev-parse", "HEAD"]), mission, sources: sources(lab),
    included: included.map(({ bytesData, ...f }) => f), referenced, omitted,
    counts: { included: included.length, referenced: referenced.length, omitted: omitted.length } };
  const entries = [["manifest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n")], ["README.md", readFileSync(join(dir, "README.md"))],
    ...included.map((f) => [`research/${f.path}`, f.bytesData])];
  checkNames(entries.map(([name]) => ({ name })));
  // Advisory: research can quote test credentials. Scan every payload, never print the value.
  for (const [path, bytes] of entries) bytes.toString("utf8").split("\n").forEach((line, i) => {
    if (SECRETS.some((re) => re.test(line))) console.error(`warning: ${path}:${i + 1}: looks like a credential; review the export before sharing`);
  });
  const out = join(research, "exports", `${name}.pe-pack.zip`);
  const zip = writeZip(entries);
  writeFileSync(out, zip);
  console.log(`wrote ${out.slice(lab.length + 1)} (${zip.length} bytes, sha256 ${sha256(zip)})`);
  console.log(`${included.length} included, ${referenced.length} referenced, ${omitted.length} omitted`);
}

function checkNames(entries) {
  const portable = new Set();
  for (const e of entries) {
    if (!safeName(e.name)) fail(`pack: unsafe entry name ${JSON.stringify(e.name)}`);
    if (e.symlink) fail(`pack: ${e.name} is a symbolic link`);
    const key = e.name.normalize("NFC").toLowerCase();
    if (portable.has(key)) fail(`pack: conflicting entry name ${JSON.stringify(e.name)}`);
    portable.add(key);
  }
  for (const name of portable) {
    const parts = name.split("/");
    while (parts.length > 1) {
      parts.pop();
      if (portable.has(parts.join("/"))) fail(`pack: file/directory conflict at ${name}`);
    }
  }
}

function verify(file, extract) {
  const entries = readZip(readFileSync(file));
  const names = new Map(entries.map((e) => [e.name, e]));
  if (names.size !== entries.length) fail("pack: duplicate entry names");
  checkNames(entries);
  const manifestEntry = names.get("manifest.json");
  if (!manifestEntry || !names.has("README.md")) fail("pack: manifest.json and README.md are required");
  // Read and checksum every payload, including README, before creating any output.
  const data = new Map(entries.map((e) => [e.name, e.data()]));
  const manifest = JSON.parse(data.get("manifest.json").toString("utf8"));
  if (manifest.format !== FORMAT) fail(`pack: format ${manifest.format} is not ${FORMAT}`);
  const expected = new Set(["manifest.json", "README.md"]);
  for (const f of manifest.included ?? []) {
    const e = names.get(`research/${f.path}`);
    expected.add(`research/${f.path}`);
    if (!e) fail(`pack: ${f.path} is listed but missing`);
    if (e.size !== f.bytes) fail(`pack: ${f.path} size does not match the manifest`);
    if (sha256(data.get(e.name)) !== f.sha256) fail(`pack: ${f.path} hash does not match the manifest`);
  }
  for (const name of names.keys()) if (!expected.has(name)) fail(`pack: ${name} is not listed in the manifest`);
  for (const f of manifest.referenced ?? []) if (!f.origin || !f.sha256) fail(`pack: reference ${f.path} lacks an origin or hash`);
  if (extract) {
    const to = resolve(extract);
    if (existsSync(to) && readdirSync(to).length) fail(`pack: ${extract} exists and is not empty`);
    for (const e of entries) {
      const target = resolve(to, e.name);
      if (!target.startsWith(to + sep)) fail(`pack: ${e.name} escapes the extract directory`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, data.get(e.name), { flag: "wx" });
    }
  }
  const c = manifest.counts ?? {};
  console.log(`ok ${manifest.name} from ${manifest.lab} (${manifest.mission ?? "no mission"}): ${c.included} included, ${c.referenced} referenced, ${c.omitted} omitted`);
  for (const s of manifest.sources ?? []) console.log(`source ${s.slug} ${s.url ?? "(no url)"} ${s.sha ?? "(no pin)"}`);
  if (extract) console.log(`extracted to ${extract}`);
}

// A minimal zip: deflate or store, fixed timestamps so unchanged inputs give the same bytes.
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { if (zlib.crc32) return zlib.crc32(buf); let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const DOS_TIME = 0, DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01 00:00

export function writeZip(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = Buffer.from(name, "utf8"), deflated = zlib.deflateRawSync(data);
    const [method, body] = deflated.length < data.length ? [8, deflated] : [0, data];
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(method, 8);
    header.writeUInt16LE(DOS_TIME, 10); header.writeUInt16LE(DOS_DATE, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(body.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(nameBytes.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(0x0314, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(DOS_TIME, 12); dir.writeUInt16LE(DOS_DATE, 14); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nameBytes.length, 28); dir.writeUInt32LE((0o100644 << 16) >>> 0, 38); dir.writeUInt32LE(offset, 42);
    local.push(header, nameBytes, body);
    central.push(dir, nameBytes);
    offset += header.length + nameBytes.length + body.length;
    if (offset > 0xffffffff) fail("pack: over 4 GiB; ask the operator which files to reduce");
  }
  const centralBytes = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBytes, end]);
}

export function readZip(zip) {
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) fail("pack: not a zip file");
  const count = zip.readUInt16LE(end + 10), entries = [];
  let at = zip.readUInt32LE(end + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) fail("pack: damaged central directory");
    const method = zip.readUInt16LE(at + 10), crc = zip.readUInt32LE(at + 16), compressed = zip.readUInt32LE(at + 20), size = zip.readUInt32LE(at + 24);
    const nameLength = zip.readUInt16LE(at + 28), extraLength = zip.readUInt16LE(at + 30), commentLength = zip.readUInt16LE(at + 32);
    const mode = zip.readUInt32LE(at + 38) >>> 16, local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (zip.readUInt32LE(local) !== 0x04034b50) fail(`pack: damaged entry ${name}`);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + compressed);
    const data = () => {
      if (method !== 0 && method !== 8) fail(`pack: ${name} uses an unsupported compression method`);
      let out;
      try { out = method === 0 ? raw : zlib.inflateRawSync(raw, { maxOutputLength: Math.max(size, 1) }); } catch { fail(`pack: ${name} is damaged`); }
      if (out.length !== size || crc32(out) !== crc) fail(`pack: ${name} is damaged`);
      return out;
    };
    entries.push({ name, size, symlink: (mode & 0o170000) === 0o120000, data });
  }
  return entries;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, arg, ...rest] = process.argv.slice(2);
  if (command === "--sha") {
    console.log(sha256(readFileSync(process.argv[1], "utf8").replace(/\s+$/, "") + "\n"));
  } else if (command === "plan" && /^[a-z0-9][a-z0-9.-]*$/.test(arg ?? "") && safeName(arg)) plan(arg);
  else if (command === "build" && /^[a-z0-9][a-z0-9.-]*$/.test(arg ?? "") && safeName(arg)) build(arg);
  else if (command === "verify" && arg) verify(arg, rest[0] === "--extract" ? rest[1] ?? fail("pack: --extract needs a directory") : undefined);
  else fail("usage: node pack.mjs plan <name> | build <name> | verify <pack.zip> [--extract DIR]\n<name> is lowercase letters, digits, dots, and hyphens; no trailing dot or Windows device name");
}
