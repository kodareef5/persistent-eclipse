import hashlib, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
S = ROOT / 'src' / 'skills'
research = (ROOT / 'src' / 'research.md').read_text().strip()
persona = (ROOT / 'src' / 'persona.md').read_text().rstrip('\n').replace('{{pe_research}}', research)
LAB = ['git-research','survey','reader','muse','coderunner','migrator','challenger','intel','cvss','lint','dead-end','reporter','status-report','fleet','patch','math','web','export','sync','layered-challenge','history','models','model-notes','hunt','osint','forecast','judge']
MISSIONS = ['blue-team', 'red-team', 'math-team', 'signals']
mission = {m: (ROOT / 'src' / 'missions' / (m + '.md')).read_text().rstrip('\n') + '\n' for m in MISSIONS}

code = (ROOT / 'src' / 'cvss.mjs').read_text().rstrip() + '\n'
lint = (ROOT / 'src' / 'lint-notes.mjs').read_text().rstrip() + '\n'
pack = (ROOT / 'src' / 'pack.mjs').read_text().rstrip() + '\n'
history = (ROOT / 'src' / 'history.mjs').read_text().rstrip() + '\n'
status = (ROOT / 'src' / 'status-report.mjs').read_text().rstrip() + '\n'
ledger = (ROOT / 'src' / 'ledger.mjs').read_text().rstrip() + '\n'
# A skill's tables and field notes live in src/skills/<name>/, one Markdown file each.
# {{table:<file>}} inlines a file whole. {{sample:<file>}} (or {{sample:<file>:<n>}})
# inlines its heading and first three (or n) rows, and ships the whole file as
# notes/<file>.md beside the skill, to read on demand. {{note:<file>}} ships it and names
# the path. Every slot needs a file and every file a slot.
SLOT = re.compile(r'\{\{(table|sample|note):([a-z0-9][a-z0-9.-]*?)(?::([1-9][0-9]*))?\}\}')
ROW = re.compile(r'^(\| |- |\* |[0-9]+\. )')
def sample(text, n, path):
    lines, out, rows, seen = text.strip().split('\n'), [], 0, 0
    table = any(l.startswith('| --- ') or l.startswith('|---') for l in lines)
    for i, line in enumerate(lines):
        row = ROW.match(line) and not (table and (line.startswith('| --- ') or (i + 1 < len(lines) and lines[i + 1].startswith('| --- '))))
        if row:
            seen += 1
            if seen <= n: out.append(line)
        elif not seen: out.append(line)
    more = seen - min(seen, n)
    return '\n'.join(out) + (f'\n\n*+{more} more in `{path}`.*' if more else f'\n\n*More in `{path}`.*')
NOTES = {}
def tables(name, text):
    folder, used, notes = S / name, set(), {}
    def fill(m):
        kind, file, n = m.group(1), m.group(2), int(m.group(3) or 3)
        path = folder / (file if kind == 'note' and file.endswith('.mjs') else file + '.md')
        if not path.is_file(): raise SystemExit(f'{name}: missing {kind} {path}')
        used.add(path.name)
        if kind == 'table': return path.read_text().strip()
        notes[path.name] = path.read_text().rstrip() + '\n'
        return sample(path.read_text(), n, f'notes/{path.name}') if kind == 'sample' else f'`notes/{path.name}`'
    text = SLOT.sub(fill, text)
    unused = sorted(p.name for p in folder.iterdir() if p.suffix in ('.md', '.mjs') and p.name not in used) if folder.is_dir() else []
    if unused: raise SystemExit(f'{name}: unused tables or notes {", ".join(unused)}')
    NOTES['pe-' + name if name != 'git-research' else 'pe-git-research'] = notes
    return text

def skill(name):
    text = tables(name, S.joinpath(name + '.md').read_text()).replace('{{pe_research}}', research)
    for m in MISSIONS:
        text = text.replace('{{mission:' + m + '}}', mission[m])
    return (text.replace('{{cvss.mjs}}', code).replace('{{cvss.sha256}}', hashlib.sha256(code.encode()).hexdigest())
                .replace('{{lint.mjs}}', lint).replace('{{lint.sha256}}', hashlib.sha256(lint.encode()).hexdigest())
                .replace('{{pack.mjs}}', pack).replace('{{pack.sha256}}', hashlib.sha256(pack.encode()).hexdigest())
                .replace('{{history.mjs}}', history).replace('{{history.sha256}}', hashlib.sha256(history.encode()).hexdigest())
                .replace('{{status-report.mjs}}', status).replace('{{status-report.sha256}}', hashlib.sha256(status.encode()).hexdigest())
                .replace('{{ledger.mjs}}', ledger).replace('{{ledger.sha256}}', hashlib.sha256(ledger.encode()).hexdigest()))

def block(text, indent):
    pad = ' ' * indent
    return '\n'.join((pad + line).rstrip() for line in text.split('\n'))

def desc(name):
    text = S.joinpath(name + '.md').read_text()
    block = text.split('---', 2)[1]
    for line in block.strip().split('\n'):
        if line.startswith('description:'):
            return line.split(':', 1)[1].strip()
    raise SystemExit('missing description in ' + name)

out = []
w = out.append
w('# Persistent Eclipse. Because day breaks.')
w('')
w('- insert:')
# host-level lab-aware provider carrying the library
w('    - id: pe-skills')
w("      name: '@deepseek-ai/dsh-skill-filesystem'")
w('      config:')
w('        providerName: persistent-eclipse-host')
w('        includeDefaultRoots: false')
w('        watch: false')
w('        # The default mission, for a lab that has not recorded its own MISSION.md.')
w('        mission: |')
w(block(mission['blue-team'].rstrip('\n'), 10))
w('        # Lab task skills, served to any agent working inside a lab.')
w('        skills:')
for name in LAB:
    pe = 'pe-'+name if name!='git-research' else 'pe-git-research'
    w(f'          {pe}:')
    w(f'            description: {json.dumps(desc(name))}')
    w('            content: |')
    w(block(skill(name).rstrip('\n'), 14))
    if NOTES.get(pe):
        w('            # Field notes, written beside the skill and read on demand.')
        w('            notes:')
        for file, body in sorted(NOTES[pe].items()):
            w(f'              {file}: |')
            w(block(body.rstrip('\n'), 16))
w('        # Manager-only setup skill, registered in the mode scope by pe-kickoff.')
w('        kickoff: |')
w(block(skill('kickoff').rstrip('\n'), 10))
w('        # Serve the library only when the working directory is inside a lab.')
w('        customSkillDirs: !!js |')
prov = r'''(() => {
  const fs = process.getBuiltinModule('node:fs'), path = process.getBuiltinModule('node:path')
  const lib = () => [...loader.entries()].find(e => e.options.id === 'pe-skills')?.options.config.skills ?? {}
  HISTORY_HOOK
  RETRY_HOOK
  SUPERVISE_HOOK
  const inLab = cwd => { for (let d = path.resolve(cwd || '.'); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) return true; if (d === path.dirname(d)) return false } }
  // A skill's field notes, written once to a folder named by their hash; the skill tool
  // tells the model to resolve notes/<file>.md against it.
  const notesBase = (name, s) => {
    if (!s.notes || !Object.keys(s.notes).length) return {}
    const os = process.getBuiltinModule('node:os'), crypto = process.getBuiltinModule('node:crypto')
    const dir = path.join(os.tmpdir(), 'persistent-eclipse-notes-' + crypto.createHash('sha256').update(JSON.stringify(s.notes)).digest('hex').slice(0, 12), name)
    try {
      for (const [file, body] of Object.entries(s.notes)) {
        const target = path.join(dir, 'notes', path.basename(file))
        if (!fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body) }
      }
      return { resourceBase: { kind: 'directory', path: dir } }
    } catch { return {} }
  }
  const meta = (name, s) => ({ name, description: s.description, invocation: { modelInvocable: true, userInvocable: true }, provider: 'persistent-eclipse', source: 'runtime', rank: 450, locator: name })
  skills.registerProvider(() => ({
    name: 'persistent-eclipse',
    list: async o => inLab(o.cwd) ? Object.entries(lib()).map(([n, s]) => meta(n, s)) : [],
    get: async (c, o) => {
      const s = inLab(o.cwd) && lib()[c.name]
      return s ? { ...meta(c.name, s), content: s.content, ...notesBase(c.name, s) } : undefined
    },
  }))
  return []
})()'''
w(block(prov.replace('HISTORY_HOOK', (ROOT / 'src' / 'history-dsh.js').read_text())
            .replace('RETRY_HOOK', (ROOT / 'src' / 'retry-dsh.js').read_text())
            .replace('SUPERVISE_HOOK', (ROOT / 'src' / 'supervise-dsh.js').read_text()), 14))
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
    w('              prefix: |-')
    w(block(persona, 16))
    # preset-scoped kickoff registration, reads the host library's kickoff body
    w('          - id: pe-kickoff')
    w("            name: '@deepseek-ai/dsh-skill-filesystem'")
    w('            config:')
    w('              providerName: persistent-eclipse-kickoff')
    w('              includeDefaultRoots: false')
    w('              watch: false')
    w('              customSkillDirs: !!js |')
    kick = r'''(() => {
      const fs = process.getBuiltinModule('node:fs'), path = process.getBuiltinModule('node:path')
      const host = () => [...loader.entries()].find(e => e.options.id === 'pe-skills')?.options.config
      ctx.effect(() => ctx.get('systemPrompt').variable('pe_mission', o => {
        if (o.agent) {
          const cwd = ctx.get('workingDirectory').get(o.agent.session)
          for (let d = path.resolve(cwd); ; d = path.dirname(d)) {
            if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) {
              const file = path.join(d, '.research', 'MISSION.md')
              if (fs.existsSync(file)) {
                const mission = fs.readFileSync(file, 'utf8')
                if (!mission.trim()) throw new Error('Persistent Eclipse MISSION.md is empty')
                return mission
              }
              break
            }
            if (d === path.dirname(d)) break
          }
        }
        const mission = host()?.mission
        if (!mission) throw new Error('Persistent Eclipse default mission is missing')
        return mission
      }))
      const body = host()?.kickoff
      if (body) skills.register({ name: 'pe-kickoff', description: KICKOFF_DESC, source: 'runtime', content: body })
      return []
    })()'''
    w(block(kick.replace('KICKOFF_DESC', json.dumps(desc('kickoff'))), 18))
    w('          - id: pe-skills-gate')
    w("            name: '@deepseek-ai/dsh-skill-filesystem'")
    w('            config:')
    w('              providerName: persistent-eclipse-gate-dirs')
    w('              includeDefaultRoots: false')
    w('              watch: false')
    w('              customSkillDirs: !!js |')
    gate = r'''(() => {
      const fs = process.getBuiltinModule('node:fs'), path = process.getBuiltinModule('node:path'), crypto = process.getBuiltinModule('node:crypto')
      const lab = cwd => { for (let d = path.resolve(cwd || '.'); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) return d; if (d === path.dirname(d)) return undefined } }
      const tools = () => {
        const skillset = [...loader.entries()].find(e => e.options.id === 'pe-skills')?.options.config.skills ?? {}
        const pick = (skill, tool) => new RegExp('```js ' + tool + '\\n([\\s\\S]*?)^```', 'm').exec(skillset[skill]?.content ?? '')?.[1]
        return [['lint-notes.mjs', pick('pe-lint', 'lint-notes.mjs')], ['cvss.mjs', pick('pe-cvss', 'cvss.mjs')], ['pack.mjs', pick('pe-export', 'pack.mjs')], ['history.mjs', pick('pe-history', 'history.mjs')], ['status-report.mjs', pick('pe-status-report', 'status-report.mjs')], ['ledger.mjs', pick('pe-forecast', 'ledger.mjs')]]
      }
      const sha = text => crypto.createHash('sha256').update(text).digest('hex')
      let shipped
      const place = root => {
        shipped ??= tools()
        const dir = path.join(root, '.research', 'tools')
        for (const [name, body] of shipped) {
          if (body === undefined) continue
          const file = path.join(dir, name)
          try {
            if (!fs.existsSync(file)) {
              fs.mkdirSync(dir, { recursive: true })
              fs.writeFileSync(file, body)
            } else if (sha(fs.readFileSync(file, 'utf8')) !== sha(body)) {
              const ref = file + '.shipped' // Never overwrite so the operator can diff
              if (!fs.existsSync(ref) || sha(fs.readFileSync(ref, 'utf8')) !== sha(body)) fs.writeFileSync(ref, body)
            }
          } catch { /* a read-only lab is the operator's call, not a reason to break the catalog */ }
        }
      }
      skills.registerProvider(() => ({
        name: 'persistent-eclipse-gate',
        list: async o => { const root = lab(o.cwd); if (root !== undefined) place(root); return { candidates: [], complete: root !== undefined } },
        get: async () => undefined,
      }))
      return []
    })()'''
    w(block(gate, 18))
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

preset('persistent-eclipse', 'Persistent Eclipse',
       'A persistent research lab. Blue Team by default; Red Team, Math Team, or a Signal Hunt desk when the operator asks.', 10)
(ROOT / 'cordis.patch.yml').write_text('\n'.join(out) + '\n')
# DSH web's browser half: src/dsh-client.js with src/cells.mjs inlined, wrapped in DSH's module loader.
cells = '\n'.join(l[7:] if l.startswith('export ') else l for l in (ROOT / 'src' / 'cells.mjs').read_text().splitlines() if not l.startswith('//'))
client = (ROOT / 'src' / 'dsh-client.js').read_text().replace('CELLS\n', cells.strip() + '\n')
(ROOT / 'dsh-client.js').write_text('// Generated from src/dsh-client.js and src/cells.mjs by src/build.py. Do not edit.\n'
  'window.__ModuleLoader__.load({\n  id: "persistent-eclipse",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n'
  '    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n'
  + '\n'.join(('    ' + l).rstrip() for l in client.rstrip().split('\n')) + '\n    return module.exports;\n  }\n});\n')
print('wrote', len(out), 'lines')
