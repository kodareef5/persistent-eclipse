---
name: pe-survey
description: Map a source before investigation. Identify responsibilities, actors, trust boundaries, state, and revision-specific coverage. Maintain the shared taxonomy and expose research gaps.
---

# Survey

## Tools
- `read`, `glob`, `grep`, and `rg` for source inspection.
- `bash` for read-only Git history, tree, and revision queries.
- `pe-git-research` for existing findings, negations, and relationships.
- Draft MAP changes in task scratch; the manager owns `.research/MAP.md`.
- Use small scripts, experiments, and web research where they clarify the map; coordinate heavy jobs through `pe-git-research`.

## Purpose
- Survey the entire source at low depth before deep investigation.
- Establish a common vocabulary for components, actors, boundaries, and states.
- Identify where external input, authority, ownership, or control changes hands.
- Build a seam-by-actor coverage matrix tied to an exact source revision and configuration.
- Expose unread paths, weak assumptions, and high-value questions for `pe-reader`.
- Maintain the map as source, findings, and research coverage evolve.

The survey describes **where to investigate**, not whether the source is safe. Avoid turning the first pass into a deep audit.

## Orientation
- Read the complete mission, `SCOPE`, `.research/LAB.md`, and existing research.
- Identify the source slug, pinned commit SHA, languages, frameworks, and supported platforms.
- Inspect repository structure, manifests, build configuration, documentation, and tests.
- Locate major entry points, public interfaces, background tasks, and persistent state.
- Identify optional features, generated code, dependencies, and configuration-dependent behavior.
- Review existing findings, negations, and frontier questions before inventing new work.
- For mathematical sources, load `pe-math` and use the mathematical mapping rules below.

## Source Inventory

Walk the repository broadly, then group related code by responsibility rather than directory.

### Sections
For each subsystem record:

- **Name:** Short, stable responsibility-based identifier.
- **Purpose:** What the subsystem does and what it promises.
- **Source:** Primary files, packages, symbols, and revision.
- **Entry:** Public APIs, handlers, callbacks, commands, or internal entry points.
- **Actors:** Who can invoke or influence it.
- **Trust:** Inputs and assumptions inherited from callers or dependencies.
- **State:** Data owned, cached, persisted, mutated, or shared.
- **Effects:** Filesystem, network, process, memory, privilege, or externally visible behavior.
- **Edges:** Important callers, dependencies, and adjacent sections.
- **Configuration:** Flags, features, platforms, or modes that change behavior.
- **Tests:** Existing coverage and obvious missing paths.
- **Questions:** Unresolved assumptions worth deeper reading.

Keep descriptions compact. One responsibility may span many directories; one directory may contain several responsibilities.

### Architecture
Map the useful relationships:

- External entry points → validation → internal operations → observable effects.
- Data producers → transformations → consumers.
- Authority sources → delegation → enforcement → privileged operations.
- State creation → mutation → persistence → invalidation → cleanup.
- Synchronous calls → callbacks → queues → asynchronous completion.
- Configuration and feature selection → alternate implementations.
- Error handling → fallback → retry → recovery.

Do not enumerate every function. Capture enough structure to direct a targeted source read.

## Shared Taxonomy

Define terminology once in `.research/MAP.md` and reuse it throughout the lab.

### Subsystems
- Name components by responsibility: `auth`, `parser`, `storage`, `scheduler`, `transport`, `policy`.
- Prefer names from the implementation when clear.
- Avoid aliases for the same component across different notes.
- Split sections when responsibilities or security assumptions differ meaningfully.

### Actors
Identify distinct sources of action or influence:

- `remote-unauth` — Unauthenticated remote input.
- `remote-auth` — Authenticated remote principal.
- `local-user` — Local unprivileged user or process.
- `peer` — Another service, node, or protocol participant.
- `operator` — Administrator or privileged maintainer.
- `internal` — Trusted application component or background task.
- `dependency` — External library, service, or supplied artifact.

Adapt actors to the actual system. Distinguish access, privileges, and control over inputs. Authentication alone does not establish authorization.

### Boundaries
Name seams where assumptions may change:

- `parse` — Untrusted representation becomes structured data.
- `auth` — Identity, permission, or authority is established.
- `dispatch` — Control passes between handlers, callbacks, or implementations.
- `state` — Shared, persistent, cached, or mutable state changes.
- `lifetime` — Resources are created, borrowed, released, or invalidated.
- `serialize` — Data crosses representation or protocol boundaries.
- `privilege` — An operation gains authority or reaches a protected resource.
- `resource` — Inputs consume bounded or unbounded work.
- `async` — Ordering, cancellation, retries, or concurrency change assumptions.
- `recovery` — Failure, rollback, restart, or fallback alters normal behavior.

These are starting labels, not an exhaustive ontology. Preserve project-specific terms when they are more precise.

## Seam Discovery

A seam is a place where trust, control, state, representation, or ownership changes hands.

For each candidate:

1. **Locate:** Identify the concrete source path, symbol, or interface.
2. **Connect:** Find the upstream actor and downstream operation.
3. **Assume:** State the prerequisite or invariant crossing the seam.
4. **Classify:** Assign the shared subsystem and boundary labels.
5. **Separate:** Identify actors whose reachability or privileges materially differ.
6. **Scope:** Record configuration, platform, or revision constraints.
7. **Queue:** Suggest one specific invariant or path for deeper examination.

Pay particular attention to:

- Externally reachable parsers, decoders, and request handlers.
- Authentication, authorization, privilege changes, and identity mapping.
- Filesystem paths, command execution, dynamic loading, and deserialization.
- Cross-component calls that assume validation occurred elsewhere.
- Queues, callbacks, timers, retries, and cancellation.
- Shared caches, ownership transfers, and persistence boundaries.
- Recovery paths, error fallbacks, and cleanup.
- Resource accounting, limits, and expensive operations.
- Optional features and alternate implementations with different guards.
- Historical fixes whose assumptions may no longer hold.

Do not label every call a seam. Favor meaningful changes in guarantees or control.

## Coverage Matrix

Record seam-by-actor coverage in `.research/MAP.md`.

Each matrix is scoped to:
- Source repository and pinned SHA.
- Build configuration and enabled features.
- Relevant platform or runtime.
- Mission and research scope.

Use separate matrices when configurations materially change reachable paths. Avoid multiplying every optional flag into an unusable matrix.

### Cell States
- `unread` — Path or invariant not examined.
- `reading T-id` — Assigned investigation in progress.
- `read-no-claim` — Examined without a finding; scope and ruled-out questions recorded.
- `covered-at <sha> (R-id)` — One specific actor path and invariant examined at that revision, with linked evidence.
- `n/a: <reason>` — Path genuinely unreachable or inapplicable under the stated configuration.

A covered cell is **not a safety certification**. It records what was investigated, where, and at which revision.

### Example `.research/MAP.md`

## Source
- Repository: `sources/example/`
- Revision: `1a2b3c4`
- Configuration: Default server build
- Platform: Linux

## Sections

| Section | Responsibility | Entry | State / Trust |
| --- | --- | --- | --- |
| auth | Login, sessions, refresh | `/login`, `/refresh` | Owns credentials and tokens |
| parser | Request decoding | HTTP handler | Accepts remote bytes |
| storage | Persistent records | Internal API | Trusts validated identifiers |

## Matrix

| Seam | remote-unauth | local-user | operator |
| --- | --- | --- | --- |
| request parser | unread | unread | n/a: server-only |
| token refresh | covered-at 1a2b3c4 (R-7) | reading T-12 | n/a: inaccessible |
| storage path | unread | read-no-claim | unread |
| cleanup | unread | unread | unread |

## Open Questions
- Does token refresh enforce the same invariant through internal callers?
- Can cleanup run after partial initialization?
- Does the storage path trust identifiers validated by another component?

## Next Reads
- `pe-reader`: token refresh internal caller path.
- `pe-reader`: storage path under operator authority.
- `pe-muse`: cancellation and retry assumptions in cleanup.

## Coverage Discipline
- Record the **actor, path, invariant, revision, and evidence**, not just the file visited.
- Distinguish a quick read from a completed invariant investigation.
- Use `read-no-claim` when no durable finding was produced; record meaningful exclusions in `.research/FRONTIER.md`.
- Use `covered-at` only with a linked research record.
- Never mark a cell covered because nearby code or another actor path was examined.
- Mark `n/a` only with a concrete reachability or configuration reason.
- Preserve unresolved indirect calls, dynamic dispatch, and platform variants.
- Reopen coverage when a relevant change invalidates the original evidence.
- Keep completed history through Git and linked notes; avoid silently overwriting conclusions.

## Prioritization

Seed the queue from meaningful coverage gaps, considering:

- **Reachability:** Which actors can actually reach the seam?
- **Authority:** What privilege, sensitive state, or protected resource lies beyond it?
- **Control:** How much of the input or transition can the actor influence?
- **Assumptions:** How many guarantees are inherited from other components?
- **Complexity:** How many representations, states, callbacks, or alternate paths are involved?
- **History:** Prior fixes, regressions, workarounds, and relevant upstream changes.
- **Evidence:** Existing findings, suspicious patterns, incomplete negations, or MAP gaps.
- **Cost:** How much reading is needed to test a precise invariant?

Prioritize high-consequence, reachable, poorly examined seams. Do not equate complexity or file size with risk.

A useful queue entry names:
- Exact section and seam.
- Actor and configuration.
- Source anchor.
- Invariant or concrete research question.
- Expected reading boundary.
- Related notes and prior coverage.

## Mathematics

When surveying mathematical source, load `pe-math` and replace code-specific categories with:

- **Sections:** Definitions, theorem families, constructions, proof techniques, and applications.
- **Entries:** Main statements, conjectures, cited results, and formal declarations.
- **Dependencies:** Definitions, lemmas, hypotheses, and imported results.
- **Regimes:** Parameter ranges, dimensions, domains, regularity, limiting cases, and exceptional conditions.
- **Seams:** Changes of assumptions, quantifier order, proof methods, definitions, or dependent results.
- **Actors:** Relevant mathematical cases or hypothesis regimes rather than security principals.
- **Coverage:** Exact statement and regime examined at a specific source revision.

Map the proof dependency graph in both directions:
- Which earlier results support a statement?
- Which later results depend on it?
- Where are hypotheses strengthened, weakened, or inherited?
- Which conclusions rely on an unproved or externally cited step?
- Where might a counterexample invalidate multiple downstream claims?

Keep the same revision-specific coverage states. A checked lemma does not establish an entire theorem family.

## Maintenance & Change Impact
- Revisit the map after meaningful source changes, new findings, or major research passes.
- Compare the new revision against previously covered symbols and seams.
- Identify added entry points, actors, state transitions, and configurations.
- Reopen cells when relevant guards, callers, dependencies, or assumptions change.
- Preserve unaffected coverage with its original revision and evidence.
- Add new seams without discarding old terminology or history.
- Use `pe-git-research` impact relationships to trace changes into existing findings and negations.
- Send speculative new branches to `pe-muse`; concrete invariant checks to `pe-reader`.

Do not regenerate the entire map after each commit. Update the affected structure and coverage.

## Handoff

Return:

- **Source:** Repository, SHA, configuration, and platform.
- **Sections:** Responsibility map and principal entry points.
- **Taxonomy:** Canonical subsystem, actor, and boundary labels.
- **Seams:** Concrete interfaces and assumptions worth investigating.
- **Coverage:** New, changed, unread, and reopened matrix cells.
- **Unknowns:** Dynamic paths, missing source, conditional features, and unresolved reachability.
- **Priority:** Best next reading tasks, with anchors and invariants.
- **Changes:** Proposed MAP edits and affected prior research.

The manager merges approved changes into `.research/MAP.md`, updates the queue, and preserves the revision history.

## Rules
- Survey broadly before investigating deeply.
- Name responsibilities, not just folders.
- Ground every seam in real source.
- Do not invent actors, entry points, reachability, or trust relationships.
- Keep taxonomy consistent across all source sections and notes.
- Coverage is specific to an actor, configuration, invariant, and revision.
- Never mark unknown or unexamined behavior safe.
- Do not overwrite previous coverage without preserving its evidence.
- Prefer a small useful map over exhaustive symbol inventories.
- Queue deep investigations rather than consuming the survey on one suspicious function.
- Subagents draft changes in scratch; the manager maintains the shared MAP.
- Never edit, build, or execute pinned source.

**The map should tell the next reader where to look, what assumption to test, what has already been examined, and what remains unknown.**
