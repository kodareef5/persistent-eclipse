---
name: pe-kickoff
description: Make a workspace into a lab, add sources, import archives, and set or amend the lab's mission. Run before you use the other skills.
---

# Kickoff

## Tools
`bash` for `git init`, `git submodule add`, and `shasum`; `edit` for `.research/` files; `read` to build the source map.

This runs before `.research/LAB.md` exists, so it is the one task that is meaningful
before there is a lab to keep. It is also where the mission texts live, so load it
again whenever the operator changes the lab's objective.

## The mission
Write `.research/MISSION.md` from the texts at the end of this skill, byte for byte.
Blue Team is the default. Use Red Team when the operator asks for a critical hunt or a
disclosure, and Math Team when the subject is mathematics rather than code. An existing
`MISSION.md` is the lab's authority, including the operator's edits: keep it.

The operator can change the mission at any time, in plain words. Amend the file to say
what they asked, record the change in STATUS, and reconcile QUEUE and draft reports.
- Blue and Red do the same work. Red is Blue with a hunt for a critical and a disclosure
  deliverable, so moving between them swaps the objective, acceptance criteria, and
  deliverable sections and keeps the record, map, and queue.
- A narrower change edits only what it names. "Highs are reportable too" changes Red's
  acceptance criteria; it does not rewrite the rest.
- Math Team treats a body of mathematics the way the others treat code. A code lab
  turned into a math lab, or back, does not fit one record: say so, and suggest a
  separate lab rather than rewriting the mission.

The other `pe-*` skills do not exist yet. A `skill` call for any of them returns
`unknown or no longer available` until this step has written `.research/LAB.md`. That is
the lab gate working, not a broken install: do not search the filesystem, read the mode
source, or retry the name. Write the lab first, then load them.

## The setup checklist
Open a `todo_write` list on the first step and keep it current: inspect the workspace,
carry forward the operator's scope and authorization, create the record, pin sources,
fill SOURCES and STATUS, commit, then intel and survey. Tick items as they land.
The list is how an autonomous round shows its own progress, and it is the only setup
instruction this lab needs.

Initialize:
1. Inspect `pwd`, `git status --short`, `git rev-parse --show-toplevel`,
   `.gitmodules`, and `.research/` to tell an empty directory, a superproject, an
   already-managed lab, or an unrelated repository apart. Never treat a source repo as
   expendable or adopt one with uncommitted changes.
2. In an empty workspace, `git init` if needed and create the lab:

       sources/
       .research/LAB.md        charter, trusted collaboration, and commit policy
       .research/MISSION.md    complete objective, criteria, and deliverable; verbatim
       .research/SCOPE.md       authorization, channel, in/out of scope, disclosure
       .research/SOURCES.md    each source, its origin, and its pin
       .research/STATUS.md     what is known now
       .research/QUEUE.md      open tasks, from T-1
       .research/MAP.md        sections, taxonomy, coverage matrix
       .research/LABELS.md     optional shared label vocabulary
       .research/FRONTIER.md   lenses per area
       .research/CADENCE.md    posture and rotations, written on first use
       .research/ENV.md        what the lab can build and run, and its limits
       .research/RUNS.md       substantial experiments and their results
       .research/runs/         retained inputs and results for substantial runs
       .research/tools/        cvss.mjs, lint-notes.mjs, and pack.mjs, placed by the runtime
       .research/vendor/       dependency source at <pkg>@<version>, for a cited read
       .research/FLEET.md      live subagents and their tasks
       .research/WATCH.md      upstream watch list
       .research/FEEDBACK.md    lab and tooling friction, for the operator
       .research/intel/         dated public intel, readable by every subagent
       .research/intel/INDEX.md one line per intel note, read first by subagents
       .research/reports/       prepared mission deliverables, for the operator
       .research/exports/       lab packs for another lab, with their plans
       .research/patches/       durable patches and validation (blue team)
       .research/lean/          durable proof projects and scripts (math)
       .research/notes/
       .research/.gitignore    scratch/, tools/*.shipped, exports/*.zip, and lean/**/.lake/

   The charter holds the source inventory, threat-model questions, scope and
   authority, origin, phase, and what still needs operator approval. A lab with one
   source, or none yet, is valid.
3. Start with permission to do the research. Write these defaults into LAB.md
   unless the operator has said otherwise:

       Commits: research
       Execution: local

   `Commits: research` lets the manager commit reviewed lab setup, results, and
   source additions or pin moves without asking each time. Researchers return
   their work for the manager to review and commit.

   `Execution: local` means all agents can search the web, clone relevant sources,
   install ordinary build and research dependencies, write code, and run local
   experiments. Prefer project-local or user-local dependencies. Small checks run
   directly; heavy jobs share the compute checkout in pe-git-research. Record
   available compute, toolchains, and meaningful limits in ENV.md.

   There is no sandbox prerequisite or per-command approval exchange. Ask for
   missing information only when it changes the task, such as an unclear subject
   or an unusual resource cost. Continue independent work while an answer is pending.
   Preserve explicit operator limits, including `Commits: ask` or execution limits;
   missing policy uses the defaults above. Never turn absent instructions into
   an `Execution: off` or read-only lab.

   When asked to adopt these defaults in an existing lab, reconcile old workflow
   wording in LAB, ENV, and MISSION. Preserve the objective, evidence, and any
   specific operator limits the request did not change.
   Before the first commit, check `git config user.name` and `git config user.email`. If
   either is empty, set the lab's own identity rather than stalling:
   `git config user.name "Persistent Eclipse"` and
   `git config user.email "persistent-eclipse@model-effort"`.
4. Acquire sources relevant to the requested research, as below. Record their pins.

Add a remote source:
- Choose a clear slug and verify that the repository matches the subject and the
  `.gitmodules` entry is free, then `git submodule add <url> sources/<slug>`.
  Record the commit from `git -C sources/<slug> rev-parse HEAD`, the URL, branch, date, and
  the release tag in `.research/SOURCES.md`. The add stages `.gitmodules` and a
  gitlink, which is the study pin. Commit them with the SOURCES.md row under the
  default research policy, unless the operator has chosen a different policy:

      git commit -m 'source: add <slug> at <short sha>' -- .gitmodules sources/<slug> .research/SOURCES.md

  Install the normal dependencies needed for the investigation. Coordinate expensive
  setup through the same compute checkout as other heavy work. Researchers may clone
  additional related repositories into task scratch; the manager registers useful
  durable sources in the lab.

Import a private archive:
- Record the file's SHA-256, name, date, and stated version. Check extraction paths
  for traversal and symlinks. Extract without executing anything. A ZIP is not a
  submodule: prepare a local Git repository from the extracted source, preserving the
  original bytes, and commit and add it as a submodule under the lab's commit policy.
  If an explicit policy defers that commit, mark it `pending-submodule` and cite
  `sha256:<archive hash>` wherever a commit is asked for. Warn when a
  submodule URL resolves only to a local path; it is not portable until mirrored.

Start from a lab pack:
- A `.pe-pack.zip` is another lab's record, not source; never extract it by hand. Set
  up this lab first: the runtime places `.research/tools/pack.mjs` once LAB.md exists,
  so if it is not there yet, finish setup and verify the pack on the next turn. Then
  `node .research/tools/pack.mjs verify <zip>` prints the pack's mission and source
  pins. For the requested import, add relevant sources at those pins and import with
  pe-migrator. The new lab uses the research defaults above or the operator's explicit
  choices; a pack does not import execution or commit restrictions.

Record in ENV.md the build tools present, the disk and memory to rely on, and what
you confirmed you can build or run. A worker reaches only what you can.

## Scope before research
Record the requested subject and bounds in `.research/SCOPE.md`, state your working
understanding, and begin. A clear research request does not need a second approval.
Capture the subject and intended audience, what is in and out of scope, any
safe-harbor terms, the disclosure terms, the source's
`SECURITY.md` if it has one, and who authorized this work. This file tells the lab
where a finished report would go; the lab prepares it, the operator sends it. A subagent
reads SCOPE.md before it investigates, so keep it current. For mathematics, name the
papers, exact claims, regimes, literature bounds, and intended research artifacts;
do not invent a bounty program or disclosure terms. Preserve manuscript bytes and
line-numbered extracts as pe-math describes. For blue team, record contribution and
security channel policies and the intended patch base.

## Orient, then begin
Orient enough to ask useful questions, then begin. A perfect map is not a prerequisite
for an informative experiment.

1. Use pe-intel for relevant prior work. Public advisories, CVEs, releases, and
   `SECURITY.md` set priorities and known boundaries. Its notes under `.research/intel/` are
   readable by every subagent and seed the queue.
   For math, use primary literature, errata, and proof artifacts instead; load pe-math
   for the statement and regime map before applying the shared survey workflow.
2. Use pe-survey to sketch the relevant sections and questions in `.research/MAP.md`.
   A short `.research/LABELS.md` with an `area:` label per MAP section helps notes
   share labels from the start.
3. Start with a few concrete questions drawn from the mission, prior work, and gaps
   in the map. Investigate yourself while researchers pursue distinct angles; add
   structure as the work needs it.

## Mission texts
Write one of these to `.research/MISSION.md` exactly as it stands inside the fence.

### Blue Team (default)
```markdown
{{mission:blue-team}}```

### Red Team
```markdown
{{mission:red-team}}```

### Math Team
```markdown
{{mission:math-team}}```
