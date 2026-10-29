import hashlib, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
S = ROOT / 'src' / 'skills'
research = (ROOT / 'src' / 'research.md').read_text().strip()
persona = (ROOT / 'src' / 'persona.md').read_text().rstrip('\n').replace('{{pe_research}}', research)
LAB = ['git-research','survey','reader','muse','coderunner','migrator','challenger','intel','cvss','lint','dead-end','reporter','fleet','patch','math','web','export']
MISSIONS = ['blue-team', 'red-team', 'math-team']
mission = {m: (ROOT / 'src' / 'missions' / (m + '.md')).read_text().rstrip('\n') + '\n' for m in MISSIONS}

code = (ROOT / 'src' / 'cvss.mjs').read_text().rstrip() + '\n'
lint = (ROOT / 'src' / 'lint-notes.mjs').read_text().rstrip() + '\n'
pack = (ROOT / 'src' / 'pack.mjs').read_text().rstrip() + '\n'
# A skill's tables live in src/skills/<name>/, one Markdown file each, and fill its
# {{table:<file>}} slots. Every slot needs a file and every file a slot.
TABLE = re.compile(r'\{\{table:([a-z0-9][a-z0-9.-]*)\}\}')
def tables(name, text):
    folder, used = S / name, set()
    def fill(m):
        path = folder / (m.group(1) + '.md')
        if not path.is_file(): raise SystemExit(f'{name}: missing table {path}')
        used.add(path.name)
        return path.read_text().strip()
    text = TABLE.sub(fill, text)
    unused = sorted(p.name for p in folder.glob('*.md') if p.name not in used) if folder.is_dir() else []
    if unused: raise SystemExit(f'{name}: unused tables {", ".join(unused)}')
    return text

def skill(name):
    text = tables(name, S.joinpath(name + '.md').read_text()).replace('{{pe_research}}', research)
    for m in MISSIONS:
        text = text.replace('{{mission:' + m + '}}', mission[m])
    return (text.replace('{{cvss.mjs}}', code).replace('{{cvss.sha256}}', hashlib.sha256(code.encode()).hexdigest())
                .replace('{{lint.mjs}}', lint).replace('{{lint.sha256}}', hashlib.sha256(lint.encode()).hexdigest())
                .replace('{{pack.mjs}}', pack).replace('{{pack.sha256}}', hashlib.sha256(pack.encode()).hexdigest()))

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
w('        # Manager-only setup skill, registered in the mode scope by pe-kickoff.')
w('        kickoff: |')
w(block(skill('kickoff').rstrip('\n'), 10))
w('        # Serve the library only when the working directory is inside a lab.')
w('        customSkillDirs: !!js |')
prov = r'''(() => {
  const fs = process.getBuiltinModule('node:fs'), path = process.getBuiltinModule('node:path')
  const lib = () => [...loader.entries()].find(e => e.options.id === 'pe-skills')?.options.config.skills ?? {}
  const inLab = cwd => { for (let d = path.resolve(cwd || '.'); ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, '.research', 'LAB.md'))) return true; if (d === path.dirname(d)) return false } }
  const meta = (name, s) => ({ name, description: s.description, invocation: { modelInvocable: true, userInvocable: true }, provider: 'persistent-eclipse', source: 'runtime', rank: 450, locator: name })
  skills.registerProvider(() => ({
    name: 'persistent-eclipse',
    list: async o => inLab(o.cwd) ? Object.entries(lib()).map(([n, s]) => meta(n, s)) : [],
    get: async (c, o) => {
      const s = inLab(o.cwd) && lib()[c.name]
      return s ? { ...meta(c.name, s), content: s.content } : undefined
    },
  }))
  return []
})()'''
w(block(prov, 14))
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
        const pick = (skill, tool) => new RegExp('```js ' + tool + '\\n([\\s\\S]*?)```').exec(skillset[skill]?.content ?? '')?.[1]
        return [['lint-notes.mjs', pick('pe-lint', 'lint-notes.mjs')], ['cvss.mjs', pick('pe-cvss', 'cvss.mjs')], ['pack.mjs', pick('pe-export', 'pack.mjs')]]
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
       'A persistent research lab. Blue Team by default; Red Team or Math Team when the operator asks.', 10)
(ROOT / 'cordis.patch.yml').write_text('\n'.join(out) + '\n')
print('wrote', len(out), 'lines')
