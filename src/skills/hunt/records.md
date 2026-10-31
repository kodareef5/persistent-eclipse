# A desk's work in PE's records

PE owns notes, worker/task ownership, Git, and the research lifecycle. This note maps
a Signal Hunt desk onto those records. Read it at setup or when needed; the [desk stories](desks.md) and
[scope configurations](starting.md) describe what the work can become.

## Translate the subject

A codebase becomes a field, portfolio, audience, matter, or body of treatments.
Subsystems become sectors, topics, propositions, or prerequisites. Source revisions
become pinned artifacts or dated extracts. Dependencies become factual or analytical
assumptions. An impact review asks which conclusions no longer hold after a source
or assumption changes. Preserve PE's evidence discipline through that translation.

| Existing record | Signal-specific use |
| --- | --- |
| SCOPE | Beneficiary, coverage, permitted inputs, capacity, report windows, priorities |
| MAP / FRONTIER | Field relationships; questions examined and unexamined, evidence version, reasons to return |
| SOURCES | Source slugs, access, pins or snapshot policy, useful roles and limits |
| notes / intel | Inspectable claims and dated source evidence |
| QUEUE | Bounded investigations with question, owner, evidence, dependencies, next trigger/action, and completion criterion |
| FLEET | Assignments and results awaiting review, reconciled against actual workers |
| WATCH | Ongoing checks: source, reason, trigger, owner, last attempt/success, next check, gaps |
| CADENCE | Operator's service windows, protected research time, budget and interruption priorities |
| RUNS / runs | Actual collector/execution arrangements and retained inputs/output |
| STATUS / RADAR / reports | Current assessment, priorities, and useful deliverables |

These are Markdown conventions, not new runtime schemas. In shared labs, use PE's
lab-local QUEUE, FLEET, and CADENCE paths. Keep research task completion, a claim's evidence
state, and monitoring freshness separate. A finished memo may remain conditional;
a supported claim may need monitoring without an active worker.

## Evidence

Follow PE's manager/worker rules when preparing and reconciling artifacts; do not
repeat them in each scope. Use ordinary PE note kinds and states. A feed/site slug in SOURCES can name an
archived-source note's `source`. Save cited extracts under `intel/` with URL or
permitted origin, retrieval time, relevant source dates, and enough context to
check the claim. Reference the actual archived artifact in `targets`, and use
`checked_at: sha256:<digest>` when evidence has no source commit. See the
[complete illustrative note](lead-note.md).

PE lint verifies structure and existence, not the digest or truth. To check an
extract, compare `shasum -a 256 <extract-path>` with the note's `checked_at`; a
mismatch needs investigation, not an automatic hash refresh. Preserve the old
extract and save a new version when the source changes. For multiple artifacts,
state which one the digest identifies and retain the other evidence anchors.
No additional verification service is needed for this check.

Preserve event time, publication/effective dates where relevant, retrieval time,
and last successful monitoring check. A catalog edit or Git timestamp does not
refresh any of those. Research due dates are separate from verified external
milestones and deadlines. Use timestamps with offsets or UTC and name the timezone
for recurring schedules.

## Cadence is part of the service; execution makes it real

SCOPE and CADENCE establish service expectations and protected research time.
The manager reconciles them with QUEUE, FLEET, actual workers, and source watches,
using PE's fleet guidance. [Cadence and conditional plans](cadence.md) explains
when to revisit decisions, how to expose missed commitments, and the boundary
between that judgment and a host/harness wake-up. PE installs no scheduler
and provides no manager launcher. The HN collector only gathers observations.

Recurring reports have stable windows, destinations, and headings in SCOPE. Deep
work can produce evolving relationship maps, thesis collections, argument dossiers,
calculations, or other artifacts suited to the question, with evidence and review
criteria agreed in the task. Workers draft in scratch; the manager promotes reviewed
work into the appropriate PE record. Reports link to those artifacts. `<report-id>`
in scope examples means a manager-chosen unique identifier (such as UTC timestamp
plus topic); it does not depend on an execution service.

For forecasting scopes, pe-forecast owns the ledger procedure. In shared labs use
stable `--lab` IDs and `.research/*.tsv merge=union eol=lf` in `.gitattributes`, as
required for independent appends. A union merge preserves rows, not agreement. Keep
resolution evidence linked to each lab's note; differing outcomes or known times need
researcher review. pe-forecast explains how to retain the disagreement and, if useful,
score a separately reviewed set. Forecast timestamps still depend on trustworthy
research history; merging rows does not prove when they were conceived.
