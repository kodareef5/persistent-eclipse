---
name: pe-status-report
description: Report to the operator. File this lab's status report on its recent work and numbers, and refresh the executive summary across all labs. At housekeeping, when a goal completes, or when asked.
---

# Lab status report

The inbox brings direction into the labs; status reports tell the operator what the
labs learned, what remains uncertain, and what needs a decision.

- `.research/status-reports/<UTC stamp>-<lab>-<trigger>.md`: each lab's dated account,
  kept once committed. Triggers are `housekeeping`, `goal`, and `asked`.
- `.research/SUMMARY.md`: the current account across labs, readable in two minutes.
- `STATUS.md`: the researchers' working state. Keep it separate from the operator's page.

## When and who

Report at housekeeping, when a goal completes, or when asked. A report filed within
the last hour covers another automatic trigger unless something important changed.
`Status reports: off` in LAB.md disables automatic reports.

If little changed, the manager can write a short report directly: what changed (or
nothing new), what's next, anything needed from the operator, and the Numbers block.
Don't launch a worker just to fill a template. For a substantial review, delegate to
one worker on your own model and effort, with the full mission, current objective,
last report, and commit reviewed. The worker drafts in scratch; the manager reviews
and commits. Don't draft the same report in parallel.

Pull first if sync is on. Read the previous report and the work since its `head`:
changed notes, their evidence, and relevant queue or inbox entries. Distinguish a new
result from another review of an old one. For a completed goal, say how the result
meets its objective and what limitations remain.

## Write for the operator

Assume an educated reader outside the specialty. Lead with a short TL;DR: what we
know now, what changed, what we need. Use short bullets with the claim first and links
after it. Explain the idea before using notation. Keep conditions and uncertainty
explicit; readable prose must not make the evidence stronger than it is.

Explain unfamiliar terms where they occur, or add a short glossary if that reads
better. Omit empty sections. A routine report can be a few sentences plus its numbers;
a substantial one should stay under about 70 lines, linking evidence for the rest.

## Count from the record

    node .research/tools/status-report.mjs stats

Paste the output under **Numbers**, including its hidden `<!-- totals: … -->` line.
The next report subtracts those totals. Don't invent missing numbers or rewrite the
counts. Set the report's `head` to the commit printed by the tool.

Notes, inbox, and commit counts use that committed snapshot; unfinished changes are
excluded and flagged. If a result belongs in this report, commit it before counting.
Receipts and disk are measured at report time. The tool reports unavailable values
as `unknown`. Add at most two sentences explaining a number when useful.

A compact report looks like this; replace the example with the lab's actual evidence:

```markdown
---
lab: redfox
trigger: housekeeping
at: 2026-10-31T18:20Z
previous: 2026-10-31T1215Z-redfox-housekeeping.md
head: 4e1c2d9
goal: Determine whether templates can read outside their allowed folder.
---
# redfox · 2026-10-31 18:20 UTC

**TL;DR:** A crafted template read a file outside its allowed folder in our test.
We still need an independent reproduction. Nothing is needed from the operator yet.

- **Changed:** A nine-line example reaches the test file under the non-default
  configuration recorded in R-redfox-31; the default configuration blocked it.
- **Next:** A fresh reader checks the example and the affected versions (T-415).

## Numbers
(the stats output, unchanged)
```

Use `date -u +%Y-%m-%dT%H%MZ` for the filename's stamp. An unnamed lab uses `lab`.
For a first report, omit `previous`.

## Keep the summary current

Start with the existing SUMMARY.md. Read reports after each lab's entry in `folds`,
including this new report. Check the underlying note for claims that drive a decision.
Keep disagreements visible, with evidence from both sides.

Change the sections where the evidence or decisions changed. If the account still
holds, a brief no-change update and refreshed metadata are enough; don't rewrite the
whole page for each routine report. Keep it under about 90 lines.

Use this frontmatter, listing each lab's latest included report:

```yaml
---
updated: 2026-10-31T18:40Z
by: redfox
folds: [2026-10-31T1820Z-redfox-housekeeping.md, 2026-10-31T1605Z-blackstone-goal.md]
---
```

The body starts with **The question:** one plain sentence about the mission, then a
TL;DR. Include the operator's pending decisions, where each lab stands, and any
important disagreement or next step. Name the lab and evidence behind claims. A lab
without a report can have a line from its queue, marked `no report yet`. Explain only
the specialist terms the page actually needs.

## File and sync

Review the report and summary against the evidence. If a worker drafted them, use its
files rather than commissioning another draft. Pull again before filing; include any
reports that arrived while drafting. Commit the dated report and summary together,
including `.research/tools/status-report.mjs` the first time, then lint and push as
pe-sync describes. Without a remote, the commit files the report.

If an untracked tool blocks a pull, compare it with the incoming copy and preserve
any needed changes before replacing it; different runtime versions may ship different
bytes. See pe-fleet for tool updates.

After pushing, pull and check:

    node .research/tools/status-report.mjs check

This names any lab's newest report missing from `folds` and exits 1 if any are missing.
If you wrote the summary last, incorporate those reports and push the correction.

Two labs may update SUMMARY.md concurrently. If a push or rebase conflicts, start
from the remote's summary and incorporate your report, preserving other labs' results
and disagreements. Don't choose one entire version and discard the other. Run the
coverage check even after a clean merge. It checks which reports are listed, not
whether their contents were summarized accurately; that remains the writer's job.

## Tool copy

The runtime places the tool in `.research/tools/`; commit it with the first report
so other labs can run it. It only reads. Its shipped SHA-256 is
`{{status-report.sha256}}`. A `.shipped` file is a runtime copy for comparison,
not necessarily a newer version. Follow pe-fleet before adopting it. Never retype it.

```js status-report.mjs
{{status-report.mjs}}```
