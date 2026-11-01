"""Build only runtime wiring. Research content stays in packs/."""
import json, pathlib, hashlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
# Hashes identify this build's default content without putting pack prose into
# the engine. Compatible library revisions can advance independently of a build.
digests = json.loads(subprocess.check_output(['node', '-e', "const c=require('./src/content.cjs'); console.log(JSON.stringify(Object.fromEntries(['common','red','blue','math','signals'].map(id=>[id,c.readPack('packs/'+id,id).digest]))))"], cwd=ROOT))
DEFAULTS = {"format": 1, "repository": "https://github.com/kodareef5/persistent-eclipse.git", "digests": digests}
(ROOT/'src/pack-defaults.json').write_text(json.dumps(DEFAULTS, indent=2)+'\n')
CONTENT_KEY = "persistent-eclipse.content." + hashlib.sha256((ROOT/"src/content.cjs").read_bytes()).hexdigest()[:16]
out = []
w = out.append
def block(text, indent):
    return '\n'.join((' ' * indent + line).rstrip() for line in text.split('\n'))
def embedded(name):
    return "(() => { const module = {exports:{}}; const require = process.getBuiltinModule;\n" + (ROOT/'src'/name).read_text() + ("\nmodule.exports.setDefaults(" + json.dumps(DEFAULTS) + ");" if name == "content.cjs" else "") + "\nreturn module.exports; })()"
TOOLS = ['lint-notes.mjs','cvss.mjs','pack.mjs','history.mjs','activity.mjs','status-report.mjs','ledger.mjs','content.cjs','questions.cjs','record.cjs','sync.mjs','pack-defaults.json','push-check.mjs']
w('# Persistent Eclipse. Because day breaks. Content resolves from local or pinned remote packs.')
w('- insert:')
w('    - id: pe-skills')
w("      name: '@deepseek-ai/dsh-skill-filesystem'")
w('      config:')
w('        providerName: persistent-eclipse-host')
w('        includeDefaultRoots: false')
w('        watch: false')
w('        customSkillDirs: !!js |')
prov = r'''(() => {
  const fs = process.getBuiltinModule("node:fs"),
    path = process.getBuiltinModule("node:path");
  const contentRuntime = CONTENT_RUNTIME;
  globalThis[Symbol.for(CONTENT_KEY)] = contentRuntime;
  const supervision = SUPERVISION_RUNTIME;
  const questions = QUESTIONS_RUNTIME;
  const record = RECORD_RUNTIME;
  const engineTools = ENGINE_TOOLS;
  const tools = TOOLS_RUNTIME;
  const resolvedContent = contentRuntime.createResolver({
    runtime: true,
    get localRoot() { return [...loader.entries()].find((e) => e.options.id === "pe-skills")?.options.config.packRoot; },
    get installedRoot() { return globalThis[Symbol.for("persistent-eclipse.packRoot")]; },
  });
  const snapshots = new WeakMap();
  const content = (cwd, session) => {
    session ||= ctx.get("agents")?.currentInitiator()?.session;
    if (session?.header.origin === "subagent" && snapshots.has(session))
      return snapshots.get(session);
    const value = resolvedContent(cwd || process.cwd());
    if (session?.header.origin === "subagent") snapshots.set(session, value);
    return value;
  };
  const lib = (cwd) =>
    Object.fromEntries(
      content(cwd).entries.map((e) => [e.name, { ...e, content: e.body }]),
    );
  const inLab = (cwd) => !!contentRuntime.labRoot(cwd || process.cwd());
  const place = (cwd) => {
    const lab = contentRuntime.labRoot(cwd || process.cwd());
    if (!lab) return;
    tools.place(lab, engineTools);
  };
  const meta = (name, s) => ({
    name,
    description: s.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: "persistent-eclipse",
    source: "runtime",
    rank: 450,
    locator: name,
  });
  skills.registerProvider(() => ({
    name: "persistent-eclipse",
    list: async (o) => {
      if (!inLab(o.cwd)) return { candidates: [], complete: false };
      place(o.cwd);
      return {
        candidates: Object.entries(lib(o.cwd))
          .filter(([n]) => n !== "pe-kickoff")
          .map(([n, s]) => meta(n, s)),
        complete: true,
      };
    },
    get: async (c, o) => {
      if (!inLab(o.cwd)) return;
      const s = lib(o.cwd)[c.name];
      return s
        ? {
            ...meta(c.name, s),
            content: s.body,
            resourceBase: { kind: "directory", path: s.baseDir },
          }
        : undefined;
    },
  }));
  HISTORY_HOOK;
  RETRY_HOOK;
  SUPERVISE_HOOK;
  return [];
})();'''
prov=prov.replace('CONTENT_KEY',json.dumps(CONTENT_KEY)).replace('CONTENT_RUNTIME',embedded('content.cjs')).replace('SUPERVISION_RUNTIME',embedded('supervision.cjs')).replace('QUESTIONS_RUNTIME',embedded('questions.cjs')).replace('RECORD_RUNTIME',embedded('record.cjs')).replace('TOOLS_RUNTIME',embedded('tools.cjs')).replace('ENGINE_TOOLS',json.dumps({n:(ROOT/'src'/n).read_text() for n in TOOLS}))
prov=prov.replace('HISTORY_HOOK',(ROOT/'src/history-dsh.js').read_text()).replace('RETRY_HOOK',(ROOT/'src/retry-dsh.js').read_text()).replace('SUPERVISE_HOOK',(ROOT/'src/supervise-dsh.js').read_text())
w(block(prov,10))
def preset(preset_id, name, description, order):
    w(f'    - id: preset-{preset_id}')
    w("      name: '@deepseek-ai/dsh-agent-preset'")
    w('      config:')
    w(f'        id: {preset_id}')
    w(f'        name: {json.dumps(name)}')
    w(f'        description: {json.dumps(description)}')
    w(f'        order: {order}')
    w('        plugins:')
    w('          - id: persona')
    w("            name: '@deepseek-ai/dsh-persona'")
    w('            config:')
    w('              prefix: "{{pe_persona}}"')
    w('          - id: pe-kickoff')
    w("            name: '@deepseek-ai/dsh-skill-filesystem'")
    w('            config:')
    w('              providerName: persistent-eclipse-kickoff')
    w('              includeDefaultRoots: false')
    w('              watch: false')
    w('              customSkillDirs: !!js |')
    kick = r'''(() => {
  const fs = process.getBuiltinModule("node:fs"),
    path = process.getBuiltinModule("node:path");
  // The host provider initializes one resolver module for both presets.
  const runtime = globalThis[Symbol.for(CONTENT_KEY)];
  if (!runtime) throw new Error("Persistent Eclipse content provider has not initialized");
  const resolvedContent = runtime.createResolver({
    runtime: true,
    get localRoot() { return [...loader.entries()].find((e) => e.options.id === "pe-skills")?.options.config.packRoot; },
    get installedRoot() { return globalThis[Symbol.for("persistent-eclipse.packRoot")]; },
  });
  const content = (cwd) => resolvedContent(cwd || process.cwd());
  const cwd = (o) =>
    o.agent ? ctx.get("workingDirectory").get(o.agent.session) : process.cwd();
  const mission = (o) => {
    const dir = cwd(o),
      root = runtime.labRoot(dir),
      file = root && path.join(root, ".research/MISSION.md");
    if (file && fs.existsSync(file)) {
      const text = fs.readFileSync(file, "utf8");
      if (!text.trim())
        throw new Error("Persistent Eclipse MISSION.md is empty");
      return text;
    }
    return content(dir).defaultMission;
  };
  ctx.effect(() => ctx.get("systemPrompt").variable("pe_mission", mission));
  ctx.effect(() =>
    ctx
      .get("systemPrompt")
      .variable("pe_persona", (o) =>
        content(cwd(o)).persona.replace("{{pe_mission}}", () => mission(o)) +
        (o.agent?.session.header.origin === "subagent" ? "" : "\n\n" + runtime.conventionStatus(cwd(o), content(cwd(o))).text) + "\n" + content(cwd(o)).warnings.join("\n"),
      ),
  );
  skills.registerProvider(() => ({
    name: "persistent-eclipse-kickoff-content",
    list: async () => [
      {
        name: "pe-kickoff",
        description: "Set up or continue a research lab.",
        invocation: { modelInvocable: true, userInvocable: true },
        provider: "persistent-eclipse-kickoff-content",
        source: "runtime",
        rank: 450,
        locator: "pe-kickoff",
      },
    ],
    get: async (c, o) => {
      if (c.name !== "pe-kickoff") return;
      const s = content(o.cwd).entries.find((s) => s.name === "pe-kickoff");
      return {
        ...s,
        provider: "persistent-eclipse-kickoff-content",
        source: "runtime",
        rank: 450,
        locator: "pe-kickoff",
        invocation: { modelInvocable: true, userInvocable: true },
        content: s.body,
        resourceBase: { kind: "directory", path: s.baseDir },
      };
    },
  }));
  return [];
})();'''
    w(block(kick.replace('CONTENT_KEY',json.dumps(CONTENT_KEY)),18))
    # tools
    tools = [
     ("agent-instructions","'@deepseek-ai/dsh-agent-instructions'", ['config:', '  maxBytes: 65536']),
     ("time-context","'@deepseek-ai/dsh-time-context'", None),
     ("tool-bash","'@deepseek-ai/dsh-tool-bash'", ["disabled: !!js process.platform === 'win32'"]),
     ("tool-pwsh","'@deepseek-ai/dsh-tool-pwsh'", ["disabled: !!js process.platform !== 'win32'"]),
     ("tool-fs","'@deepseek-ai/dsh-tool-fs'", None),
     ("tool-fs-search","'@deepseek-ai/dsh-tool-fs-search'", ['config:', '  sampleOverCapGlobResults: false']),
     ("tool-jobs","'@deepseek-ai/dsh-tool-jobs'", None),
     ("tool-web","'@deepseek-ai/dsh-tool-web'", ['config:', '  fetch: true']),
     ("tool-schedule","'@deepseek-ai/dsh-tool-schedule'", None),
     ("tool-skill","'@deepseek-ai/dsh-tool-skill'", None),
     ("command-goal","'@deepseek-ai/dsh-command-goal'", None),
     ("tool-goal","'@deepseek-ai/dsh-tool-goal'", None),
     ("tool-ask-user","'@deepseek-ai/dsh-tool-ask-user'", None),
     ("tool-todo","'@deepseek-ai/dsh-tool-todo'", ['config:', '  allowParallelInProgress: true']),
    ]
    for tid, tname, extra in tools:
        w(f'          - id: {tid}')
        w(f'            name: {tname}')
        for line in (extra or []):
            w('            ' + line)
    # compaction group
    w('          - id: compaction')
    w('            name: cordis:group')
    w('            group: true')
    w('            isolate:')
    w('              compaction: true')
    w('            config:')
    w('              - id: compaction-basic')
    w("                name: '@deepseek-ai/dsh-compaction-basic'")
    w('              - id: command-compact')
    w("                name: '@deepseek-ai/dsh-command-compact'")
    # delegation group -> standard workers
    w('          - id: delegation')
    w('            name: cordis:group')
    w('            group: true')
    w('            isolate:')
    w('              workflowEngine: true')
    w('            config:')
    w('              - id: tool-subagent-control')
    w("                name: '@deepseek-ai/dsh-tool-subagent-control'")
    w('              - id: tool-subagent')
    w("                name: '@deepseek-ai/dsh-tool-subagent'")
    w('                config:')
    w('                  provider: spawn')
    w('                  toolName: subagent')
    w('                  agentPreset: standard')
    w('                  modelSelectionSettings: true')

preset('persistent-eclipse','Persistent Eclipse','A persistent research lab. Select a mission and keep looking.',10)
(ROOT/'cordis.patch.yml').write_text('\n'.join(out)+'\n')
# DSH web's browser half: src/dsh-client.js with src/cells.mjs inlined, wrapped in DSH's module loader.
cells = '\n'.join(l[7:] if l.startswith('export ') else l for l in (ROOT / 'src' / 'cells.mjs').read_text().splitlines() if not l.startswith('//'))
client = (ROOT / 'src' / 'dsh-client.js').read_text().replace('CELLS\n', cells.strip() + '\n')
(ROOT / 'src' / 'dsh-client.bundle.js').write_text('// Generated from src/dsh-client.js and src/cells.mjs by src/build.py. Do not edit.\n'
  'window.__ModuleLoader__.load({\n  id: "persistent-eclipse",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n'
  '    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n'
  + '\n'.join(('    ' + l).rstrip() for l in client.rstrip().split('\n')) + '\n    return module.exports;\n  }\n});\n')
print('wrote', len(out), 'lines')
