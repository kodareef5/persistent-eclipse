---
name: pe-status-report
description: Keep a readable operator report from useful lab updates, feedback, and questions.
---

# Keep the operator in the picture

Add the useful change, with its evidence. You don't need to retell the investigation
or rewrite the other labs' reports. Workers leave drafts in their task folders;
the manager reviews, edits, combines, or declines them.

A contribution can be a Markdown file in `.research/updates/`, named for its date,
lab, and subject. For example, `2026-11-01-maple-new-representation.md`:

```markdown
---
lab: maple
date: 2026-11-01
---
## [New observation] suggests [another route]

[Reasoning] connects them through [mechanism]. The unresolved step is [question];
[alternative] would avoid [obstruction]. [Evidence](../notes/R-maple-12.md).
```

The metadata is optional. These are simple single-line fields, not a format for
the investigation itself. A brief feedback line can still go in FEEDBACK.md;
it appears in the report too. There is no need for a file per worker answer.

Lead a substantive update with what a person needs to understand: what is now
possible, which assumptions it depends on, and what stands between it and the
broader goal. Say that in plain language before task IDs or specialist notation.
A promising conditional construction and an established result should be easy to
distinguish. This is a useful opening when the picture changes, not a paragraph to
repeat after every worker. Link proofs, detailed costs, and experiments below it.

The manager can edit a contribution directly. When a newer account makes an older
one redundant, link to the earlier evidence and mark the older file `status: archived`
in its frontmatter. `status: proposed` keeps an unendorsed idea visibly tentative.
Explain useful corrections and preserve dissent. Git keeps the previous wording;
there are no review commands or decision chains to maintain.

## The combined report

`.research/REPORT.md` is assembled from the shared updates, FEEDBACK.md, and open
operator questions. `/pe-report` in Pi and Report in DSH show a live preview without
rewriting the committed page. Commit reviewed contributions and their evidence;
ordinary private sync combines peers' inputs, rebuilds the pages, and commits the
generated changes before pushing. It doesn't include your uncommitted drafts.

Only when sharing without the sync helper, build the remote page explicitly:

```sh
node .research/tools/record.cjs build
```

In that manual workflow, include the page with its inputs. With ordinary sync,
commit the inputs only: do not render, stage, or make a separate commit for REPORT.md
or the activity pages. Sync owns those outputs; a stale local page is not a task. Sync can regenerate conflicting views; disagreements in the contributions
remain the manager's to reconcile. Unreadable entries are listed for attention
while the rest of the report remains available. No Git hooks are installed.

Use this page for the operator view instead of maintaining SUMMARY.md and another
set of dated status reports. Older reports stay linked; they need no rewrite.
STATUS is a current orientation, not a stack of "Earlier snapshot" sections. When
old detail obscures that view, move it intact to a dated file under reports/ and
leave a link. Preserve evidence paths and peer-owned work; coordinate shared-page
cleanup rather than having every lab reorganize it. Consolidate redundant updates
and mark superseded ones archived so REPORT stays useful. Do this when it helps,
not as a new ceremony before each research task.
Keep a working queue where it helps coordination, and link useful evidence rather
than copying an update through QUEUE, FLEET, STATUS, and the report.

A proof, trace, dataset, or reproduction may need a substantial file of its own.
Give it that room and link it. At housekeeping or goal completion, add what changed
if there is something useful to tell the operator. Questions needing an answer use
pe-questions; independent research continues while the answer is pending.

{{note:examples}}
