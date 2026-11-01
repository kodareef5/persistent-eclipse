// Shared by Pi, DSH's embedded adapter, and the standalone lab command.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { createHash, randomUUID } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const sha = (text) => createHash("sha256").update(text).digest("hex");
const PUBLIC = "https://github.com/kodareef5/persistent-eclipse.git";
let defaults = { repository: PUBLIC, digests: {} };
// The tarball carries provenance hashes, not the libraries. Manifest format is
// the compatibility contract; prose may evolve independently of engine releases.
if (typeof __dirname !== "undefined") {
  const file = path.join(__dirname, "pack-defaults.json");
  if (fs.existsSync(file)) defaults = JSON.parse(fs.readFileSync(file, "utf8"));
}
function setDefaults(value) { defaults = value; }
const ids = ["common", "red", "blue", "math", "signals"];
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + "." + randomUUID();
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
function labRoot(cwd) {
  for (let d = path.resolve(cwd); ; ) {
    if (fs.existsSync(path.join(d, ".research/LAB.md"))) return d;
    const p = path.dirname(d);
    if (p === d) return;
    d = p;
  }
}
function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}
function localSetting(root) {
  try {
    return git(root, ["config", "--get", "pe.packRoot"]);
  } catch {
    return "";
  }
}
function declaredMode(cwd) {
  const root = labRoot(cwd);
  let text = "";
  try {
    text = fs.readFileSync(path.join(root, ".research/MISSION.md"), "utf8");
  } catch {}
  // Older lab missions named the discipline in their heading, before Mode existed.
  const named = /^Mode:[ \t]*(\S+)/im.exec(text)?.[1]?.toLowerCase() ||
    (/^#\s+(?:Mission:\s*)?(Red Team|Blue Team|Math Team|Signal Hunt)\b/im.exec(text)?.[1]
      ?.toLowerCase().replaceAll(" ", "-").replace("signal-hunt", "signals"));
  if (!named) return;
  const id = {
    red: "red",
    blue: "blue",
    "red-team": "red",
    "blue-team": "blue",
    "math-team": "math",
    math: "math",
    signals: "signals",
  }[named];
  if (!id)
    throw new Error(
      "Unknown mission mode " + named + "; review MISSION.md and .research/packs.json.",
    );
  return id;
}
function mode(cwd) { return declaredMode(cwd) || "blue"; }

function sourceContext(cwd, options = {}) {
  const lab = labRoot(cwd);
  let saved = {};
  const contextFile = lab && path.join(lab, ".research/local/content-source.json");
  if (!options.runtime && contextFile && fs.existsSync(contextFile)) saved = json(contextFile);
  return {
    contextFile,
    localRoot: options.localRoot || (lab && localSetting(lab)) || process.env.PE_PACK_ROOT || saved.localRoot,
    installedRoot: options.installedRoot || options.defaultLocalRoot || saved.installedRoot,
    cache: options.cache || process.env.PE_PACK_CACHE || saved.cache || path.join(os.homedir(), ".cache/persistent-eclipse/content"),
    defaults: options.defaults || saved.defaults || defaults,
  };
}

function localPack(dir, id, fallbackSource) {
  const pack = readPack(dir, id);
  let commit = null, source = fallbackSource;
  try {
    const root = git(dir, ["rev-parse", "--show-toplevel"]);
    if (!git(dir, ["status", "--porcelain", "--", "."]))
      commit = git(root, ["rev-parse", "HEAD"]);
    try { source = git(root, ["remote", "get-url", "origin"]); } catch {}
  } catch {}
  return { pack, commit, source };
}
function files(dir, prefix = "") {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => {
      const name = prefix + e.name;
      if (e.isSymbolicLink())
        throw new Error("Pack symlinks are not supported: " + name);
      if (e.isDirectory()) return files(path.join(dir, e.name), name + "/");
      if (!e.isFile())
        throw new Error("Pack resource is not a regular file: " + name);
      return [name];
    });
}
function safeName(name) {
  if (
    typeof name !== "string" ||
    !name ||
    name.includes("\\") ||
    path.posix.isAbsolute(name) ||
    name.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Invalid pack path: " + name);
  return name;
}
function readPack(dir, id) {
  const names = files(dir),
    data = Object.fromEntries(
      names.map((n) => [n, fs.readFileSync(path.join(dir, n), "utf8")]),
    );
  const manifest = JSON.parse(data["pack.json"] || "{}");
  if (
    manifest.format !== 1 ||
    manifest.id !== id ||
    !Array.isArray(manifest.dependencies) ||
    !manifest.skills ||
    typeof manifest.skills !== "object"
  )
    throw new Error("Incompatible pack manifest: " + id);
  for (const name of Object.keys(manifest.skills))
    if (!/^pe-[a-z0-9][a-z0-9-]*$/.test(name))
      throw new Error("Invalid skill name: " + name);
  for (const dep of manifest.dependencies)
    if (!ids.includes(dep)) throw new Error("Unknown dependency: " + dep);
  for (const name of [
    ...Object.values(manifest.skills),
    ...(manifest.mission ? [manifest.mission] : []),
    ...(manifest.resources || []),
  ]) {
    safeName(name);
    if (!(name in data))
      throw new Error("Missing pack resource: " + id + "/" + name);
  }
  const hashes = Object.fromEntries(names.map((n) => [n, sha(data[n])]));
  return { id, manifest, data, hashes, digest: sha(JSON.stringify(hashes)) };
}
function cachePack(cache, pack) {
  const dir = path.join(cache, "packs", pack.digest);
  if (fs.existsSync(dir)) {
    if (readPack(dir, pack.id).digest !== pack.digest)
      throw new Error("Corrupt content cache: " + dir);
    return dir;
  }
  const temp = dir + "." + randomUUID();
  fs.mkdirSync(temp, { recursive: true });
  try {
    for (const [name, text] of Object.entries(pack.data)) {
      const file = path.join(temp, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    }
    fs.renameSync(temp, dir);
  } catch (e) {
    if (!fs.existsSync(dir)) throw e;
    if (readPack(dir, pack.id).digest !== pack.digest)
      throw new Error("Corrupt content cache: " + dir);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  return dir;
}
function remotePack(cache, source, ref, id) {
  if (
    typeof source !== "string" ||
    source.startsWith("-") ||
    /[\r\n]/.test(source) ||
    !/^(https:\/\/|ssh:\/\/|file:\/\/\/|git@|\/)/.test(source)
  )
    throw new Error("Invalid pack repository");
  if (typeof ref !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/.test(ref))
    throw new Error("Invalid pack revision");
  const repo = path.join(cache, "downloads", randomUUID() + "-git"),
    dir = path.join(cache, "downloads", randomUUID());
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
  try {
    git(repo, ["init", "--bare"]);
    try {
      git(repo, ["fetch", "--depth=1", source, ref]);
    } catch {
      throw new Error(
        `Cannot fetch ${id} at ${ref}. Configure pe.packRoot or restore the locked cache; unreleased packs are not yet on public.`,
      );
    }
    const commit = git(repo, ["rev-parse", "FETCH_HEAD"]);
    let names;
    try {
      names = git(repo, [
        "ls-tree",
        "-r",
        "--name-only",
        `${commit}:packs/${id}`,
      ])
        .split("\n")
        .filter(Boolean);
    } catch {
      throw new Error(
        `Pack ${id} is absent at ${commit}. Configure a local pack root; unreleased content is not available on public.`,
      );
    }
    for (const name of names) {
      safeName(name);
      const file = path.join(dir, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        execFileSync(
          "git",
          ["-C", repo, "show", `${commit}:packs/${id}/${name}`],
          { maxBuffer: 16 * 1024 * 1024, timeout: 30000 },
        ),
      );
    }
    return { ...readPack(dir, id), commit };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
}
function relativeSource(source) {
  return typeof source === "string" && !/^(?:[a-z][a-z0-9+.-]*:|git@|\/)/i.test(source);
}

// Portable snapshots travel with the lab. Resolve against packs.json, never the
// process cwd or a machine-specific developer setting. They obey the shared pin.
function snapshotPack(lab, source, id, ref) {
  if (!lab) throw new Error("A relative pack source needs a lab with packs.json");
  const name = safeName(source.replace(/^\.\//, ""));
  const base = fs.realpathSync(path.join(lab, ".research"));
  const folder = path.join(base, name);
  function inside(file) {
    const actual = fs.realpathSync(file), relative = path.relative(base, actual);
    if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
      throw new Error("Pack snapshot escapes the lab: " + source);
    return actual;
  }
  inside(folder);
  let pinned;
  const lock = path.join(folder, "packs.lock.json");
  if (fs.existsSync(lock)) {
    const value = json(inside(lock));
    if (value.format !== 1) throw new Error("Incompatible snapshot lock: " + source);
    pinned = value.packs?.[id];
    if (!pinned || !/^[a-f0-9]{64}$/.test(pinned.digest) ||
        (pinned.commit !== null && !/^[a-f0-9]{40,64}$/.test(pinned.commit)))
      throw new Error("Invalid snapshot pin: " + id);
  }
  if (ref && ref !== pinned?.commit)
    throw new Error("Folder snapshots have no mutable refs; omit ref or name their locked commit: " + id);
  // Accept a source tree and the content-addressed snapshot earlier labs exported.
  const named = path.join(folder, "packs", id);
  const dir = fs.existsSync(named) ? named : pinned && path.join(folder, "packs", pinned.digest);
  if (!dir || !fs.existsSync(dir)) throw new Error(`Missing ${id} in pack snapshot ${source}`);
  const pack = readPack(inside(dir), id);
  if (pinned && pack.digest !== pinned.digest) throw new Error("Snapshot hash mismatch: " + id);
  return { ...pack, commit: pinned?.commit || null };
}

function sample(text, n, name) {
  const lines = text.trim().split("\n"),
    out = [];
  let seen = 0;
  const table = lines.some((l) => /^\|\s*---/.test(l));
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const row =
      /^(\| |[-*] |\d+\. )/.test(l) &&
      !(table && (/^\|\s*---/.test(l) || /^\|\s*---/.test(lines[i + 1] || "")));
    if (row) {
      seen++;
      if (seen <= n) out.push(l);
    } else if (!seen) out.push(l);
  }
  return (
    out.join("\n") +
    `\n\n*${seen > n ? "+" + (seen - n) + " more" : "More"} in \`notes/${name}\`.*`
  );
}
function compile(pack, name, file, research) {
  let body = pack.data[file];
  const notes = {};
  const used = new Set();
  body = body
    .replace(
      /\{\{(table|sample|note):([a-z0-9][a-z0-9.-]*?)(?::([1-9][0-9]*))?\}\}/g,
      (_, kind, stem, n) => {
        const filename = stem.endsWith(".mjs") ? stem : stem + ".md",
          key = file.replace(/\.md$/, "/") + filename;
        if (!(key in pack.data)) throw new Error("Missing field note: " + key);
        used.add(key);
        if (kind === "table") return pack.data[key].trim();
        notes[filename] = pack.data[key];
        return kind === "sample"
          ? sample(pack.data[key], Number(n || 3), filename)
          : "`notes/" + filename + "`";
      },
    )
    .replaceAll("{{pe_research}}", research);
  const base = file.replace(/\.md$/, "/");
  for (const key of Object.keys(pack.data))
    if (key.startsWith(base) && /\.(md|mjs)$/.test(key) && !used.has(key))
      throw new Error("Unreferenced field note: " + key);
  const description = /^description:\s*(.+)$/m.exec(body)?.[1] || name;
  return { name, description, body, notes };
}
function resolveContent(cwd, options = {}) {
  const lab = labRoot(cwd),
    config =
      lab && fs.existsSync(path.join(lab, ".research/packs.json"))
        ? json(path.join(lab, ".research/packs.json"))
        : {};
  const selected = config.mission || mode(cwd);
  if (!ids.includes(selected) || selected === "common")
    throw new Error("Invalid mission pack");
  const warnings = [], provenance = [];
  const declared = declaredMode(cwd);
  if (declared && config.mission && declared !== selected)
    warnings.push(`MISSION.md selects ${declared}, but packs.json selects ${selected}. The ${selected} catalog is active. Reconcile the selection with the operator's mission before dispatching workers; MISSION.md has not been changed.`);
  const context = sourceContext(cwd, options);
  const localRoot = context.localRoot && path.resolve(lab || cwd, context.localRoot);
  const installedRoot = context.installedRoot && path.resolve(lab || cwd, context.installedRoot);
  const cache = context.cache;
  // A package opened before kickoff needs a persistent pin too. Otherwise every
  // startup outside a lab would resolve public main again.
  const sharedLockFile = lab
    ? path.join(lab, ".research/packs.lock.json")
    : path.join(
        cache,
        "bootstrap",
        sha(
          JSON.stringify({ selected, config, localRoot: localRoot || null, installedRoot, defaults: context.defaults }),
        ) + ".json",
      );
  // A developer override belongs to this clone. Editing private packs must not
  // rewrite the shared pins other labs use. Retain its exact snapshot for offline use.
  const lockFile = lab && localRoot
    ? path.join(lab, ".research/local/packs.lock.json")
    : sharedLockFile;
  const previousFile = fs.existsSync(lockFile) ? lockFile : sharedLockFile;
  const previous =
    previousFile && fs.existsSync(previousFile)
      ? json(previousFile)
      : { format: 1, packs: {} };
  if (previous.format !== 1) throw new Error("Incompatible pack lock");
  const resolved = new Map(),
    visiting = new Set(),
    locks = {};
  function load(id) {
    if (resolved.has(id)) return;
    if (visiting.has(id)) throw new Error("Cyclic pack dependency: " + id);
    visiting.add(id);
    const spec = config.sources?.[id] || {}, pinned = previous.packs[id];
    let source = spec.repository || pinned?.source || context.defaults.repository || PUBLIC;
    let pack, commit = null, fromLocal = false;
    if (pinned && (!/^[a-f0-9]{64}$/.test(pinned.digest) ||
        (pinned.commit !== null && !/^[a-f0-9]{40,64}$/.test(pinned.commit))))
      throw new Error("Invalid pack lock: " + id);
    const local = localRoot && path.join(localRoot, id);
    const installed = installedRoot && path.join(installedRoot, id);
    if (local && fs.existsSync(local)) {
      ({pack, commit, source} = localPack(local, id, source));
      if (spec.repository) source = spec.repository;
      fromLocal = true;
    } else if (pinned && !options.update) {
      if (spec.repository && pinned.source !== spec.repository)
        throw new Error("Pack source changed; review packs update before adoption.");
      const dir = path.join(cache, "packs", pinned.digest);
      if (fs.existsSync(dir)) pack = readPack(dir, id);
      else if (installed && fs.existsSync(installed) && readPack(installed, id).digest === pinned.digest)
        pack = readPack(installed, id);
      else if (relativeSource(source)) pack = snapshotPack(lab, source, id);
      else {
        if (!pinned.commit) throw new Error(`Local pack cache missing: ${id}. Restore its source/cache or review content.cjs update; the shared pin will not be replaced automatically.`);
        pack = remotePack(cache, source, pinned.commit, id);
      }
      if (pack.digest !== pinned.digest) throw new Error("Pack hash mismatch: " + id);
      commit = pinned.commit;
      fromLocal = !!pinned.local;
    } else if (localRoot) {
      // An explicit override is never permission to substitute public content.
      throw new Error(`Configured local pack ${id} is missing at ${localRoot}; restore it or its locked cache.`);
    } else if (!options.update && installed && fs.existsSync(installed) && !spec.repository) {
      // Installed content only seeds an initial pin. Explicit updates inspect
      // the configured remote; only a developer override above stays local.
      ({pack, commit, source} = localPack(installed, id, source));
    } else {
      pack = relativeSource(source) ? snapshotPack(lab, source, id, spec.ref)
        : remotePack(cache, source, spec.ref || "main", id);
      commit = pack.commit;
    }
    // Compatible library updates are ordinary provenance for status views, not
    // instructions or warnings in the manager's prompt. Retain them offline too.
    if (!localRoot && !spec.repository && source === (context.defaults.repository || PUBLIC) &&
        context.defaults.digests?.[id] && pack.digest !== context.defaults.digests[id])
      provenance.push(`${options.preview ? "Previewing" : "Using"} compatible ${id} content from ${source} at ${commit || pack.digest}. It differs from the engine's build-time library; ${options.preview ? "adoption will pin" : "the lab is pinned to"} this exact revision.`);
    cachePack(cache, pack);
    locks[id] = { source, commit, digest: pack.digest, files: pack.hashes, local: fromLocal };
    for (const dep of pack.manifest.dependencies) load(dep);
    visiting.delete(id);
    resolved.set(id, pack);
  }
  load("common");
  load(selected);
  for (const id of config.include || []) {
    if (!ids.includes(id)) throw new Error("Unknown included pack: " + id);
    load(id);
  }
  const common = resolved.get("common"),
    research = (common.data["research.md"] || "").trim(),
    entries = [];
  // Selected mission wins logical skill aliases; explicitly included packs do not replace it.
  const order = [...resolved.values()]
    .filter((p) => p.id !== selected)
    .concat(resolved.get(selected));
  const catalog = new Map();
  for (const pack of order)
    for (const [name, file] of Object.entries(pack.manifest.skills))
      catalog.set(name, compile(pack, name, file, research));
  const fingerprint = sha(JSON.stringify(locks));
  const root = path.join(cache, "skills", fingerprint);
  for (const entry of catalog.values()) {
    const baseDir = path.join(root, entry.name);
    fs.mkdirSync(path.join(baseDir, "notes"), { recursive: true });
    for (const [name, text] of Object.entries(entry.notes)) {
      const p = path.join(baseDir, "notes", name);
      if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== text)
        fs.writeFileSync(p, text);
    }
    const filePath = path.join(baseDir, "SKILL.md"),
      document = `---\nname: ${entry.name}\ndescription: ${JSON.stringify(entry.description)}\n---\n${entry.body.replace(/^---\n[\s\S]*?\n---\n/, "")}`;
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, "utf8") !== document
    )
      fs.writeFileSync(filePath, document);
    entries.push({ ...entry, baseDir, filePath });
  }
  const lock = { format: 1, mission: selected, packs: locks };
  if (
    lockFile &&
    !options.preview &&
    (!fs.existsSync(lockFile) || JSON.stringify(previous) !== JSON.stringify(lock))
  ) {
    if (lab && localRoot) localDirectory(lab);
    atomic(lockFile, lock);
  }
  // Persist only clone-local source context, so copied tools see the manager's
  // installed source/override/cache without inheriting its process environment.
  if (lab && !options.preview) {
    localDirectory(lab);
    const saved = {format: 1, localRoot: localRoot || null, installedRoot: installedRoot || null, cache, defaults: context.defaults, provenance};
    if (!fs.existsSync(context.contextFile) || JSON.stringify(json(context.contextFile)) !== JSON.stringify(saved))
      atomic(context.contextFile, saved);
  }
  // Only guidance that describes how a lab works participates in the review
  // signal. Repository commits, banners and ordinary Muse notes do not.
  const conventions = {};
  for (const pack of resolved.values()) {
    for (const [name, digest] of Object.entries(pack.hashes)) {
      if ((pack.id === "common" && /^(?:persona\.md|skills\/(?:fleet|kickoff|sync|git-research|status-report|history)(?:\.md|\/))/.test(name)) ||
          (pack.id === selected && name === pack.manifest.mission))
        conventions[pack.id + "/" + name] = digest;
    }
  }
  return {
    localRoot,
    installedRoot,
    contextFile: context.contextFile,
    warnings,
    provenance,
    lockFile,
    sharedLockFile,
    conventions,
    mission: selected,
    defaultMission:
      resolved.get(selected).data[resolved.get(selected).manifest.mission],
    persona: (common.data["persona.md"] || "").replaceAll(
      "{{pe_research}}",
      research,
    ),
    entries,
    root,
    lock,
    fingerprint,
    meta: {
      mission: selected,
      packRevision: fingerprint,
      packs: Object.fromEntries(
        Object.entries(locks).map(([id, p]) => [
          id,
          { commit: p.commit, digest: p.digest },
        ]),
      ),
    },
  };
}
// Cache resolved bytes. Validation uses file metadata; hashing and Git happen
// only when a source, selection, or lock changes. Workers retain the returned
// immutable snapshot even when the next manager turn sees a newer one.
function createResolver(options = {}) {
  const entries = new Map();
  const stats = { resolutions: 0 };
  function stamp(file) {
    try {
      const s = fs.lstatSync(file);
      return [file, s.size, s.mtimeMs, s.ctimeMs, s.ino];
    } catch {
      return [file, null];
    }
  }
  function signature(cwd, value) {
    const lab = labRoot(cwd),
      paths = [
        path.join(lab || cwd, ".research/LAB.md"),
        path.join(lab || cwd, ".research/MISSION.md"),
        path.join(lab || cwd, ".research/packs.json"),
      ];
    // Clone-local configuration is small; remember its actual location once.
    if (value?.configFile) paths.push(value.configFile);
    if (value?.lockFile) paths.push(value.lockFile);
    if (value?.contextFile) paths.push(value.contextFile);
    if (value?.sharedLockFile) paths.push(value.sharedLockFile);
    if (value?.revisionFiles) paths.push(...value.revisionFiles);
    const local = value?.localRoot;
    if (local && fs.existsSync(local)) {
      const walk = (dir) => {
        paths.push(dir);
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p);
          else paths.push(p);
        }
      };
      walk(local);
    }
    return JSON.stringify([
      options.localRoot,
      options.defaultLocalRoot,
      options.installedRoot,
      options.defaults,
      process.env.PE_PACK_ROOT,
      process.env.PE_PACK_CACHE,
      paths.map(stamp),
    ]);
  }
  const read = (cwd) => {
    const key = labRoot(cwd) || path.resolve(cwd),
      old = entries.get(key);
    if (old && signature(key, old.value) === old.signature) {
      if (old.error && Date.now() - old.at < 30000) throw old.error;
      if (!old.error) return old.value;
    }
    try {
      stats.resolutions++;
      const value = resolveContent(key, options);
      if (value.localRoot) value.localRoot = path.resolve(key, value.localRoot);
      try {
        value.configFile = path.resolve(
          key,
          git(key, ["rev-parse", "--git-path", "config"]),
        );
      } catch {}
      // A commit can change attribution without changing a pack's bytes.
      if (value.localRoot) {
        try {
          const dir = git(value.localRoot, ["rev-parse", "--absolute-git-dir"]);
          const head = path.join(dir, "HEAD");
          const ref = /^ref: (.+)/.exec(fs.readFileSync(head, "utf8"))?.[1];
          value.revisionFiles = [head, path.join(dir, "packed-refs")];
          if (ref) value.revisionFiles.push(path.join(dir, ref));
        } catch {}
      }
      entries.set(key, { value, signature: signature(key, value) });
      return value;
    } catch (error) {
      const value = old?.value || {
        localRoot:
          options.localRoot ||
          options.defaultLocalRoot ||
          process.env.PE_PACK_ROOT,
      };
      entries.set(key, {
        value,
        error,
        at: Date.now(),
        signature: signature(key, value),
      });
      throw error;
    }
  };
  read.clear = () => entries.clear();
  read.stats = stats;
  return read;
}

function localDirectory(root) {
  const dir = path.join(root, ".research/local");
  fs.mkdirSync(dir, { recursive: true });
  const ignore = path.join(dir, ".gitignore");
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, "*\n", { flag: "wx" });
  return dir;
}

// Status views read the manager's last resolution without fetching or repinning.
function provenanceStatus(cwd) {
  const root = labRoot(cwd);
  if (!root) return [];
  try {
    const value = json(path.join(root, ".research/local/content-source.json")).provenance;
    return Array.isArray(value) ? value.filter(v => typeof v === "string") : [];
  } catch { return []; }
}

function conventionStatus(cwd, content, { acknowledge = false } = {}) {
  const root = labRoot(cwd);
  if (!root) return { state: "new", text: "" };
  const file = path.join(root, ".research/local/conventions.json");
  const current = content.conventions;
  let prior;
  try {
    const value = json(file);
    if (value.format === "pe-lab-guidance/1") prior = value.files;
  } catch {}
  const changed = Object.keys({...prior, ...current})
    .filter(name => prior?.[name] !== current[name]).sort();
  if (acknowledge) {
    localDirectory(root);
    atomic(file, { format: "pe-lab-guidance/1", files: current });
    return { state: "current", changed: [], text: "Lab guidance review recorded for this clone." };
  }
  const state = !prior ? "unreviewed" : changed.length ? "changed" : "current";
  const text = state === "current"
    ? "Lab guidance matches this clone's last acknowledged review. No opening review announcement is needed."
    : `Lab guidance ${state === "unreviewed" ? "has no acknowledged review in this clone" : "changed since this clone's last acknowledged review"}. ` +
      "Before launching the research fleet, tell the operator you will compare the relevant guidance and coordinate useful cleanup; use pe-fleet's Keeping the lab understandable section. " +
      (prior ? "Changed: " + changed.join(", ") + ". " : "") +
      "After completing the comparison and useful cleanup (with any deferred decisions recorded), run node .research/tools/content.cjs review --acknowledge. This records the comparison, not permission or a claim that every suggestion was adopted.";
  return { state, changed, text };
}
module.exports = {
  resolveContent,
  createResolver,
  labRoot,
  mode,
  readPack,
  sha,
  conventionStatus,
  provenanceStatus,
  setDefaults,
  sourceContext,
};
// The embedded DSH copy has no require.main; this branch only runs as a lab CLI.
if (typeof require.main !== "undefined" && require.main === module) {
  try {
    const [command = "list", ...args] = process.argv.slice(2),
      cwd = process.cwd();
    const root = labRoot(cwd);
    const priorFile = root && path.join(root,
      sourceContext(cwd).localRoot && fs.existsSync(path.join(root, ".research/local/packs.lock.json"))
        ? ".research/local/packs.lock.json" : ".research/packs.lock.json");
    const prior = priorFile && fs.existsSync(priorFile) ? json(priorFile) : { packs: {} };
    const data = resolveContent(cwd, {
      update: command === "update",
      preview: command === "update" && !args.includes("--apply"),
    });
    for (const warning of data.warnings) console.error("PE content: " + warning);
    if (["inspect", "verify", "update"].includes(command))
      for (const info of data.provenance) console.error("PE content: " + info);
    if (command === "review")
      console.log(JSON.stringify(conventionStatus(cwd, data, {acknowledge: args.includes("--acknowledge")}), null, 2));
    else if (command === "mission") console.log(data.defaultMission);
    else if (command === "list")
      console.log(
        data.entries.map((s) => s.name + " — " + s.description).join("\n"),
      );
    else if (command === "inspect" || command === "verify")
      console.log(JSON.stringify(data.lock, null, 2));
    else if (command === "update") {
      const before = prior;
      for (const [id, p] of Object.entries(data.lock.packs))
        for (const name of new Set([
          ...Object.keys(before.packs[id]?.files || {}),
          ...Object.keys(p.files),
        ]))
          if (before.packs[id]?.files?.[name] !== p.files[name])
            console.log(
              id +
                "/" +
                name +
                ": " +
                (before.packs[id]?.files?.[name] || "new") +
                " → " +
                (p.files[name] || "removed"),
            );
      const cache = sourceContext(cwd).cache;
      for (const [id, p] of Object.entries(data.lock.packs)) {
        const old = prior.packs[id];
        if (!old || old.digest === p.digest) continue;
        const beforeDir = path.join(cache, "packs", old.digest),
          afterDir = path.join(cache, "packs", p.digest);
        if (fs.existsSync(beforeDir))
          try {
            console.log(
              execFileSync(
                "git",
                ["diff", "--no-index", "--", beforeDir, afterDir],
                { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
              ),
            );
          } catch (e) {
            if (e.status === 1) console.log(e.stdout);
            else throw e;
          }
      }
      console.log(
        args.includes("--apply")
          ? "Adopted. New workers use this revision."
          : "Review these changed files; use update --apply to adopt.",
      );
    } else
      throw new Error(
        "Use list, inspect, verify, mission, review [--acknowledge], or update [--apply].",
      );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
