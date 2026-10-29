---
name: pe-git-research
description: Record and revisit source-linked research claims. Covers note IDs, evidence, assumptions, links, Git history, impact reviews, experiments, and handoffs. LOAD EARLY before writing notes.
---

# Git Research

The lab's memory is a set of plain Markdown notes under `.research/`. Each note makes one claim, ties it to something a reader can inspect, and keeps the evidence against it. Git preserves the history. No database or generated index is required.

Keep the record useful to the next researcher. Preserve results, reusable methods, and failed approaches that would otherwise be repeated. Routine exploration can stay in a task answer or log; it does not need a separate note. The mission decides what is worth investigating.

{{pe_research}}

## 1. Begin with the lab

Read **all** of `.research/MISSION.md`, or the verbatim mission in your brief. It sets priorities and deliverables. Also consult:

| File | Governs |
| --- | --- |
| `.research/LAB.md` | Lab policy, including whether the manager may commit |
| `.research/ENV.md` | Available compute, useful toolchains, and operator limits |
| `.research/FRONTIER.md` | Questions already explored, partial passes, and reasons to revisit |
| `.research/LABELS.md` | Optional: the lab's shared label vocabulary |
| `.research/notes/R-<id>.md` | Individual claims and their evidence |
| `.research/reviews/` | Impact reviews across source revisions |
| `.research/runs/REQ-<id>/` | Substantial experiments worth retaining, with inputs and results |
| `.research/scratch/T-<id>/` | A researcher's code, experiments, and artifacts |
| `.research/vendor/` | Published dependency source retained as evidence |

By default, every researcher can search the web, clone relevant sources, install ordinary development dependencies, write code, and run local experiments. Proceed within the mission unless the operator states a limit; missing policy is not a read-only mode. For source history, run Git **inside the source submodule** with `git -C sources/<slug> ...`. Keep the pinned checkout stable; use task scratch for changes and builds.

A note's `kind`, `state`, and any severity score answer different questions. Do not use a CVSS score, mission priority, or exploitability threshold to decide whether an observation or mathematical result deserves a record.

## 2. Shared work, one final writer

The manager and subagents are trusted collaborators. Skills suggest techniques,
not tool permissions. Anyone can investigate, write code, search, and test an idea.

**The manager owns the durable record and shared Git state.** It reconciles useful results,
allocates permanent IDs, updates shared notes, and stages and commits reviewed work
under the lab's policy. Source pins, branches, merges, and pushes stay with the manager.

**Researchers work in `.research/scratch/T-<id>/`.** Keep experiments, patches,
search receipts, and outputs there, using independent scratch copies of source.
Cloning and fetching a repository into your own scratch is routine research; it does
not change the lab's source pins or authorize worker commits.
The shared compute checkout in §7 is the coordination exception. Return artifacts
and the evidence needed to review them; a small task can finish with a concise answer.
If preparing a claim note, use `id: draft`. No worker staging, commits, or PR workflow
is needed to hand work back.

For a researcher, shared records are read-only: `.research/notes/`,
`.research/intel/` (including `INDEX.md`), and the lab-wide Markdown files. When a
skill says to write or update one, prepare the draft or proposed change in your
own task folder for the manager to merge. Do not edit another researcher's folder.
The shared compute checkout is the exception; use it as described in §7.

Finish artifact edits before sending the final result. The runtime saves the answer
and completion marker where supported; otherwise write `.done` last. The manager
promotes settled work after completion, not files still being edited.

## 3. Durable claims

When a result merits a durable note, keep one independently disputable claim per note. Use `.research/notes/R-1.md`, `.research/notes/R-2.md`, and so on. Prefer updating an existing claim over making a near-duplicate.

IDs are permanent, never recycled, and never zero-padded: `R-1`, `R-10`, `REQ-3`, `T-4`. The manager assigns them. Sort numerically (`sort -V`), not lexicographically.

### Note format

```markdown
---
id: R-42
source: app
kind: hypothesis
state: open
labels: [area:auth, risk:auth-bypass, lens:entry-point]
targets: [sources/app/src/api/routes.ts::POST /account]
links: {}
checked_at: <full 40-character source SHA>
---
# Account update may bypass authentication

## Summary
verdict: open — route-level guard not found
- src/api/routes.ts:88 registers POST /account on the public router
- src/api/routes.ts:88 has no guard attached at registration
against: the parent router may enforce authentication; not yet traced
next: trace the parent middleware and every alternate entry

## Claim
POST /account may reach the update handler without a valid session.

## Evidence
- At <source SHA>, routes.ts registers the handler at line 88.
- No authentication guard appears on that registration.

## Against
- The parent router's middleware has not been followed.

## Assumptions
- No enclosing router or proxy rejects unauthenticated requests first.
- No alternate registration changes the effective guard chain.

## Revisit when
- Route registration, parent middleware, or caller configuration changes.

## Next
- Follow the handler from external entry to the authorization decision.
```

`## Summary` is the fast read for the manager and `pe-reporter`: one-line verdict, **up to three** checkable `file:line` facts, the strongest objection, and one next question. Include it on every `kind: finding` and on notes longer than roughly forty lines. The rest of the note holds the actual argument; a summary never replaces evidence.

### Fields and evidence states

| Field | Meaning |
| --- | --- |
| `source` | Source slug corresponding to `sources/<slug>` |
| `kind` | `observation`, `hypothesis`, `finding`, `negation`, or `question` |
| `state` | `open`, `supported`, `disputed`, `refuted`, or `superseded` |
| `checks` | Optional: `[review, run, proof]`, the checks done beyond the author's argument |
| `labels` | Two to four `family:value` search hints about subject or approach; not Git tags |
| `targets` | Paths, symbols, lines, or artifacts that a reader can actually open |
| `links` | Directed relationships to other R-IDs; see §5 |
| `checked_at` | The revision or archived artifact **actually checked** |
| `imported_from` | Only on a claim a lab pack carried in: `<lab>:R-<n> sha256:<pack sha256>` |
| `reported_state` | Only with `imported_from`: the state the other lab reported; `state` is this lab's own |

An *observation* records a seen condition; a *hypothesis* offers a testable explanation; a *finding* states a conclusion supported by evidence; a *negation* records counterevidence to another conclusion; a *question* preserves an unresolved line of inquiry. The `state` describes the standing of that particular claim, not its importance. `refuted` and `superseded` are records to retain, not files to delete.

`state` is the claim's standing; `checks` says what has been done beyond the author's
argument, so a reader can find, say, every claim with a machine-checked proof, in
either list form:

```bash
rg -l -U '^checks:(.*\bproof\b|(\n +- .*)*\n +- proof$)' .research/notes
```

| Check | Meaning |
| --- | --- |
| `review` | Another researcher reconstructed or challenged the claim and it held |
| `run` | A reproducible run, computation, or reproduction supports it |
| `proof` | A machine-checked proof of the stated claim, with its axioms recorded |

The checks are kinds of evidence, not ranks; record each one that covers the claim as
written, and omit the field when there is none. The details belong in the note's
`## Validation` and its targets. A supported claim may have no checks yet; a proved
one can still be `disputed` if it formalizes the wrong statement. Keep standing out of
labels; a `status:` or `state:` label only repeats a field. A label naming an approach,
such as `review:statement-audit`, is fine.

### Labels

Labels let anyone filter the record with `rg -w`, so reuse beats invention. Use
families for subject and approach: `area:` for parts of the subject (sections of
MAP.md), `lens:` or `method:` for ways of looking, and mission families such as
`risk:` where they help. A one-off label is fine when it records a real distinction.
A lab can list its common labels in `.research/LABELS.md`, one per line with the label
in backticks; lint then advises on labels it does not list:

```markdown
- `area:interpolation` the Taylor and Hermite recovery steps
- `lens:parameter-audit` re-deriving a construction's constants and ranges
```

### One claim, durable evidence

A note holds one claim and the argument for it. Move long derivations, logs, tables,
and experiment output into `runs/REQ-<id>/` or `reports/` and target them; lint
advises splitting notes past about two hundred lines. Canonical notes cite durable
evidence only. Scratch is not kept or packed, so promote an artifact out of
`scratch/` before a note targets it; drafts may still cite their own scratch.

Use the full **40-character source commit SHA** on a new note. `checked_at` is never the superproject commit or file modification time. Advance it only after rechecking the claim against that source revision. Editing prose, relocating a path, or fetching a new checkout does **not** refresh the evidence.

For an archive not yet associated with a source commit, use `checked_at: sha256:<hash>`. For dependency evidence, see below.

### What counts as evidence

Give the reader enough to repeat the reasoning: exact source revision, path and symbol, relevant lines or excerpt, configuration, caller or execution path, and the condition observed. Say what you have not read or ruled out. A model's assertion is not independent evidence.

Every substantive conclusion should have both `## Evidence` and `## Against`. Do not hide contradictory paths or replace a once-supported conclusion with a cleaner story. Git history and negative results are part of the research.

### Targets, archives, and dependencies

Targets are **anchors**, not necessarily source files. Common forms:

| Target | Points to |
| --- | --- |
| `sources/<slug>/<path>::<symbol>` | Code or configuration in a pinned checkout |
| `intel/<file>:<lines>` | An extracted paper, specification, advisory, or web source |
| `runs/<REQ>/<file>` | A retained experiment's inputs, logs, or result |
| `lean/<R-id>/<file>::<theorem>` | A formal statement or proof artifact |
| `patches/<R-id>/<file>` | A retained patch |
| `reports/<file>` | A durable report or other supporting artifact |

Non-source paths above refer to evidence kept under `.research/`. Cite the extracted text of a paper or spec, with its lines, rather than inventing PDF line numbers. A run cites the log or artifact it produced.

If a claim depends on published dependency code, retain the relevant files at `.research/vendor/<pkg>@<version>/`, use `checked_at: <source SHA> <pkg>@<version>`, and target `vendor/<pkg>@<version>/<path>::<symbol>`. `pe-lint` rejects a dependency pin or target that has no vendor copy.

A missing or moved target requires **reconciliation**. It does not make the associated claim false, fixed, or obsolete. `pe-lint` checks that named target files exist.

### Assumptions are first-class

A target tells us where to look. An assumption tells us **what must be true for the reasoning to hold**. Write specific, checkable conditions in `## Assumptions`, especially around guards, trust boundaries, configuration defaults, caller validation, and environment guarantees.

Keep a one-off assumption in prose. Give it a separate `kind: observation` note when it warrants investigation or several claims depend on it. Then link those claims with `depends_on`. If five conclusions rely on one unverified authorization guard, record that guard once. An impact review can then find all five when the guard changes.

## 4. Know which Git history answers the question

The lab is a Git superproject; source checkouts are Git submodules. Their histories do different jobs.

```bash
# Superproject: when the lab changed a source pin
git log -- sources/<slug>

# Source submodule: what changed in the actual code
git -C sources/<slug> rev-parse HEAD
git -C sources/<slug> log -p -- <path>
git -C sources/<slug> diff <base>..<head> -- <path>
git -C sources/<slug> blame -- <path>
```

Do **not** infer source history from `git log -p sources/<slug>/<path>` at the superproject root. It may exit successfully with no output because the source file lives inside a submodule. That is not evidence that the file never changed.

## 5. Relationships between claims

Use only four directed relations in `links`:

| Relation | Meaning |
| --- | --- |
| `supports` | This note contributes supporting evidence to another |
| `refutes` | This note supplies counterevidence under stated conditions |
| `depends_on` | This conclusion requires the linked claim to hold |
| `supersedes` | This formulation replaces an older one without losing its history |

Example: `links: {refutes: [R-31], depends_on: [R-12]}`.

Links describe how notes bear on one another; **they do not transfer truth**. If you refute a claim that once defeated a hypothesis, you have reopened the hypothesis, not proved it. State the limits and conditions of a negation explicitly.

Links are stored one way. Search for incoming references with `rg -w 'R-31' .research/notes`. Also inspect prose references: older notes may mention a guard or dismissal without linking it.

When a note relies on, contradicts, or replaces another note, link it; a prose mention
alone is invisible to an impact review. Lint advises on R-IDs a note mentions but does
not link. A passing comparison can stay prose.

`kind: negation` and `refutes` are not the same thing. A negation is any recorded
negative result: counterevidence, a barrier, an impossibility within a stated model,
or a dead end. Use `refutes` only when the negation is counterevidence to **another
note in this lab**. A barrier about the source's method or a published theorem is a
negation with `depends_on` or no links. When a `refutes` holds, update the target's
`state` to `disputed` or `refuted`, or narrow the negation's scope; lint advises when a
supported refutation leaves its target supported.

### Correcting a claim

Fix wording, evidence, or a narrow error in place; Git keeps the history, so commit
it with the reason in the message. When a correction changes
**what the claim states** (a different theorem, range, or condition), write a new note
with `links: {supersedes: [R-old]}` and set the old note's `state: superseded`. Both
remain readable. Lint advises when the two sides disagree.

## 6. Five research operations

These are ways of working with ordinary shell commands and note edits, **not** registered slash commands.

### `capture <claim>` — preserve a new observation or argument

1. Check `git status --short` and the source's `git -C sources/<slug> rev-parse HEAD`.
2. Use `rg` to find existing notes on the same path, symbol, condition, or claim.
3. Read the relevant source and contrary paths. Distinguish a fact seen in code from a proposed consequence.
4. Update the matching note or write the narrowest new one, with evidence, objections, assumptions, and a next check.
5. Lint after a durable note edit: `node .research/tools/lint-notes.mjs`.

### `challenge <ID>` — try to break the recorded conclusion

Read the note **at its `checked_at` revision** and at the current source pin. Follow both supporting and contradictory paths: entry points, callers, middleware, configuration, dependency behavior, and alternate routes. Test the assumptions individually; ask which failing condition would collapse the conclusion.

When the counterargument is independently durable, record a **negation note** with `links: {refutes: [R-...]}`. Say exactly which claim it disputes and under what conditions its counterevidence stops applying. Do not rewrite away the original evidence.

### `impact <source> <old>..<new>` — revisit research after code changes

Keep two verdicts separate for **every affected note**:

| Question | Outcomes |
| --- | --- |
| Can we locate its target? | `unchanged`, `relocated`, `ambiguous`, `missing` |
| Does its recorded conclusion still hold? | `not-rechecked`, `supported`, `weakened`, `contradicted` |

Judge **the statement and state the note actually records**. For a note in `state: refuted`, `hold: supported` means that refutation still stands; `hold: contradicted` means the refutation no longer stands. Relocated code can still behave the same; unchanged code can behave differently when a caller or guard changes. Neither verdict determines the other.

Perform the review in this order:

1. Resolve `<old>` and `<new>` to full SHAs. Inspect renames and the actual changes in the submodule: `git -C sources/<slug> diff --find-renames --stat <old>..<new>`; read relevant patches, not just the stat.
2. Find directly affected targets **and assumptions**. Check guards and shared validation paths early.
3. Walk `supports`, `refutes`, `depends_on`, and `supersedes` in both directions. Search prose citations too. Start with old negations and shared assumptions: they can invalidate many apparently unrelated conclusions.
4. Look for new callers, entry points, configuration, dependencies, and code with **no existing note**.
5. Save both verdicts, the evidence for them, and the next read to `.research/reviews/<date>-<range>.md`.

A review can look like this:

```text
Source: app, <old full SHA> -> <new full SHA>

R-18  locate: unchanged; hold: contradicted
  The previous claim that this route attaches requireAuth no longer holds.
  Next: inspect parent middleware and alternate registrations.

R-31  locate: relocated; hold: not-rechecked
  The guard supporting this old conclusion moved.
  Its dependents need a fresh call-path trace.

R-57  locate: relocated; hold: supported
  Handler moved; new caller path and original invariant were rechecked.

Coverage gap
  A new background-worker caller has no associated research.
```

An impact review assesses the **record**; it is not a new source finding. Preserve historical notes. A review explains what changed, why the prior reasoning is or is not still supported, and what remains unresolved. A removed guard is a reason to investigate, not proof of a vulnerability.

If a note's `checked_at` predates `<old>`, this comparison skips history relevant to that note. Read the skipped range or disclose the coverage gap. Do not quietly treat it as fully reviewed.

### `trace <ID>` — reconstruct how a conclusion developed

Read the note's own Git history and the actual source history:

```bash
git log -p -- .research/notes/R-42.md
git -C sources/<slug> log -p -- <path>
git -C sources/<slug> blame -- <path>
```

Separate **what was established at the old pin**, **what changed**, and **what has been verified at the current pin**. Historical truth and current truth are different questions.

### `list <filter>` — search the record directly

Use `rg -w` or `grep -w` over `.research/notes/`, and `sort -V` for numeric IDs. Filter by label, target, state, relation, or text. There is no index to build or refresh.

## 7. Experiments and shared compute

Run small scripts, focused tests, and modest computational checks directly in task
scratch. No request form or specialist handoff is needed. Install normal build and
research dependencies as needed, preferring project-local or user-local environments;
coordinate changes to an environment another researcher is using.
Keep pinned inputs and enough commands and output to reproduce a meaningful result.

### Show your work in a runbook

Do not trust mental arithmetic for calculations that support a claim. Keep an
editable runbook in task scratch: a sectioned script or an existing notebook is
enough. Put explicit inputs and assumptions beside small, named steps you can rerun
individually or together. Keep decisive outputs and explain what they establish.
When an input or assumption changes, rerun the affected steps and their dependents;
make it possible to reproduce the result from a clean start.

Use exact arithmetic where practical and cross-check a simple case or independent
method. A successful program does not establish that it models the intended problem.
Prefer updating this work to scattering calculations across ephemeral shell commands
or `/tmp` scripts. Temporary files are fine for disposable outputs. When retaining a
result, the manager promotes the useful runbook, inputs, and evidence together.
No particular notebook format or additional framework is required.

### Share the machine

For work likely to compete for CPU, memory, disk, or shared build state, consult
`.research/ENV.md` and current host load. A large compile, long fuzz run, solver sweep,
or dependency build should have an owner and a bounded budget. Start with **one heavy
job at a time per lab**. The manager can arrange more capacity when the machine and
independent build directories support it; record that arrangement in ENV.md.

### A shared checkout note

The manager and every researcher use the same `.research/scratch/_compute/` slot.
Claim it with an atomic directory creation, **not** a check followed by a write:

```bash
mkdir -p .research/scratch
mkdir .research/scratch/_compute
```

- Only a successful second command grants the slot. Write `owner.md` inside it:
  task, intended job, start time, expected duration, resource budget, and process or
  session handle once launched. Keep it brief. On another shell, use its equivalent
  create-directory operation that fails when the directory exists.
- If the slot exists, read `owner.md` and continue other research. An absent note
  still means busy: its owner may be writing it. Retry in a few minutes, or tell the
  manager which job should be next in the existing QUEUE. No polling loop is needed.
- Keep the slot until the job and its child processes have stopped. Then remove
  your `owner.md` and the empty slot directory. Do not release while a background
  build is still running.
- After an interruption, the manager checks the recorded process/session before
  clearing a stale slot. Age alone does not mean the job has stopped. Never take
  another researcher's slot or clear it just to get a turn.

Use separate writable build directories even with the checkout. If repeated heavy
jobs benefit from a shared build or careful scheduling, assign one researcher with
`pe-coderunner` to own that work. Other researchers can keep testing smaller ideas.
The checkout coordinates willing collaborators; it is not a sandbox or a scheduler.

### Keep evidence proportional to the result

For a small check, commands, outcome, and limits in the task answer or claim's
`## Validation` are enough. For substantial or reusable experiments, the manager can
retain inputs and results under `.research/runs/REQ-<id>/` and link them from RUNS.
A REQ identifies retained work; it is not permission to execute. Keep useful failures
and counterexamples, not every intermediate attempt or duplicated log.

```text
## Validation
status: static-only | reproduced | contradicted | blocked
method: source-trace | local-experiment
environment: [source commit, configuration, build or artifact identity]
evidence: [checkable trace, command and output, input, or REQ-ID]
limits: [what the observation did not establish]
```

For mathematics, record the exact statement checked, toolchain, axioms, and open
obligations with `pe-math`. For security severity, use `pe-cvss`; a score does not
change the evidence state. A run result is evidence with limits, not a conclusion
by itself.

### Record reusable primitives

A useful capability or lemma may matter long before it produces a finding. Keep it as a claim, regardless of score, and add:

```text
## Primitive
controlled-by: [actor, input, parameter, or construction]
requires: [preconditions and configuration]
enables: [observable capability or result]
composes-with: [R-IDs whose preconditions it could satisfy]
counterconditions: [conditions that prevent it]
```

This makes later composition and invalidation possible without prematurely claiming an exploit or theorem.

## 8. Commit without taking ownership of other work

Use `Commits: research` unless the operator says otherwise. Record it in
`.research/LAB.md`; a missing policy has the same default.

- `Commits: research` lets the **manager** commit reviewed lab setup, reconciled `.research/` work, relevant source additions, and source pin moves without asking each time. Record each source's origin and pin; a pin move includes its impact review.
- An explicit `Commits: ask` means **ask before every commit**. Honor any other operator limit and authorization already given.

Before committing, run `git status --short` and `node .research/tools/lint-notes.mjs`. Lint must pass. The runtime provides the linter. A successful lint checks structure and existing anchors, **not whether the claim is true**.

The lab's Git log is its research log. Commit coherent results promptly, not once a
round: a result together with the runs, reports, and intel it cites, plus the record
updates it causes. Lead the subject with the R-IDs it changes and say what happened to
the claim, for example `R-14: conditional cube-root width range`,
`R-9: correct the rank model; R-8 disputed`, or `R-21 supersedes R-6: sharper constant`.
Then `git log --grep 'R-14'` finds a claim's history. A commit with no claim change
can start with `lab:`.

Commit explicit paths rather than whatever happens to be staged:

```bash
git add .research/notes/R-43.md .research/runs/REQ-7/
git commit -m 'R-43: refute R-31 at 1a2b3c4' -- .research/notes/R-43.md .research/runs/REQ-7/
```

If a permitted source pin moved, include that specific gitlink path **and its impact review**. Other changes may already be staged, including `.gitmodules` and submodule metadata. Leave unrelated paths alone; if unfamiliar staged changes remain, tell the operator.

Commit worker artifacts only after completion and review. **Subagents never stage, commit, merge, or push.** The manager can add relevant sources as part of the research. Keep pinned study checkouts stable and use scratch for changes. Pushing and external submission follow the operator's destination and authorization; local research permission does not imply publication.

## 9. Keep the exploration frontier

`.research/FRONTIER.md` tracks questions examined **per target and lens**. It is coverage history, not a certificate of safety.

```markdown
## sources/ssh/sshd.c::grace_alarm_handler
- explored at <SHA> (R-42): can logging reenter during SIGALRM?
- partial at <SHA> (R-43): are reachable wrappers async-signal-safe? Wrappers unread.
- open: do distribution patches change this path?
revisit: handler or caller changes; a new signal-handling advisory appears
```

In a math lab, key the frontier by paper section, lemma, equation, or formal
declaration instead of a source file:

```markdown
## preprint main_full_version.tex::lem:spar-marked-degree
- explored at <SHA> (R-11, R-14): does the degree bound stay uniform when k grows?
- partial at <SHA> (R-13): can the V lift be removed? Fixed-density case only.
- open: is the bound tight for the paper's own replacement forms?
revisit: a manuscript revision; new literature on growing-width counting
```

After a pass, mark its lens `explored` or `partial`, with the source commit and related R-IDs. A partial pass names what remains unread. `explored` means **that question was asked**, not that the target is safe. Reopen a lens when affected code changes after its recorded commit or new evidence gives a reason.

## 10. Worked example: the assumption that stopped holding

The following sketch uses OpenSSH's 2024 signal-handler regression to illustrate the record. **IDs and commits are fictional**; it is not a sourced vulnerability analysis.

At an older pin, `R-31` recorded a safety conclusion: the grace-timeout handler could not reach unsafe logging. At a later pin, a researcher notices a changed wrapper and records a hypothesis:

```yaml
id: R-42
source: ssh
kind: hypothesis
state: open
labels: [area:signal, risk:rce, lens:regression]
targets: [sources/ssh/sshd.c::grace_alarm_handler]
links: {}
checked_at: <full source SHA>
```

**Claim:** the SIGALRM handler may reach logging that is not async-signal-safe. **Evidence:** at the pinned revision, the handler calls a logging wrapper. **Against:** the complete call chain and build conditions have not been established. **Next:** trace every reachable wrapper and check signal safety.

The challenge is to `R-31`, the earlier **safety claim**. If the changed wrapper defeats its previously documented guard, preserve that separately:

```yaml
id: R-43
source: ssh
kind: negation
state: supported
checks: [review]
labels: [area:signal, lens:assumption]
targets: [sources/ssh/sshd.c::grace_alarm_handler]
links: {refutes: [R-31]}
checked_at: <full source SHA>
```

**Claim:** the reasoning in `R-31` no longer covers this path. **Limit:** the path matters only where the grace timeout is enabled. This may overturn the old mitigation argument. It does **not**, by itself, reproduce a vulnerability or prove `R-42`.

An `impact ssh <old>..<new>` review checks the changed target and its dependents, records `R-31`'s old conclusion as contradicted if the guard no longer holds, and marks the exploitability hypothesis as unresolved until its path is traced. `trace R-42` then compares the note history with `git -C sources/ssh log -p -- sshd.c` and blame.

The productive question is not merely *what file changed?* It is *which condition did our earlier conclusion depend on, and does that condition still hold?*

## Before handing off

Check that the record answers these questions without the author present:

1. **Which exact claim** is being made, at which revision and configuration?
2. **Where can I inspect it?** Do the paths, symbols, extracts, and logs exist?
3. **What is the strongest evidence against it?** Which assumptions remain unchecked?
4. **What does it depend on?** Are shared guards and relevant counterclaims linked?
5. **What changed?** If reviewing a pin move, are location and validity judged separately?
6. **What happens next?** Is there a concrete experiment, read, revisit trigger, or honest stopping point?

Lint durable note edits. Preserve contradictory and historical evidence. A small, falsifiable note is better than a polished conclusion nobody can reproduce.
