---
name: pe-fleet
description: Help researchers work together, keep useful results, and find the next good question.
---

# Fleet

Tools: `subagent`, `send_message`, `list_agents`, `interrupt_agent`, `todo_write`.
Use scheduling tools only when requested.

Give people useful questions and room to follow them. Keep available slots busy
while promising questions remain: another angle, a source read, an experiment,
or a challenge to an old assumption. Let compute and useful work set the pace;
an empty slot doesn't need a made-up task.
The manager keeps shared records and commits reviewed work. Researchers own their
experiments and use the shared compute checkout when needed.

Workers inherit your model unless the harness supports a switch and the operator
has approved the exact alternative. Check the recorded routes and limits before
each model or effort change, including the default effort on a changed model;
pe-models covers approvals, accidental use, and ways to mix voices. Give each
researcher a useful question; the most expensive voice needn't have the last word.

When a provider is down or out of credit, Pi and DSH retry in the same session
with longer pauses, up to 30 minutes between attempts. Let the worker keep its
assignment; stop its turn to cancel. `Retry: off` in LAB.md leaves retries to the
runtime's usual policy. This lasts while the harness is running.

## Stay in charge, and delegate

You run the lab; researchers do most of the investigating. Your time goes to choosing
questions, writing briefs, reading results, steering, and keeping the record. A free
slot with a promising question waiting is lost work, so launch first, then pick up
your own reading.

- Usually delegate longer investigations: a review, an experiment, a literature pass,
  or a proof attempt, including reviewing another lab's claim. Keep room for your
  own useful digging.
- Before a long stretch of your own work, check the slots. Fill the free ones with
  distinct questions; don't park the lab behind your own task.
- Do small things yourself: read a result, check a claim's statement, run a quick
  probe, reconcile the record.
- When a researcher returns, read it and decide: keep, challenge, or follow up. Each
  answer usually suggests the next brief.

## Keeping things moving

Read QUEUE, FLEET, and finished work. With a lab remote, pull and read what other labs
found before choosing new work, and push your commits (pe-sync).

Keep results that change what we know or that someone can reuse. Check the evidence
and source pins, assign R-IDs, and update links and the intel index. Run lint before
committing; fix useful findings such as broken links or missing evidence. If a check
doesn't fit, say why and carry on. A short answer needn't become another report.

Steer researchers when a result changes the question. A message waits until the
researcher's current command returns; to reach one stuck in a long command, interrupt
its turn first (Pi: `pe_send_message` with `interrupt`; DSH: `interrupt_agent`, then
`send_message`). Stop stuck or duplicate work and keep useful partial results. Give a reviewer a review to finish; new ideas can
become separate tasks. If three review rounds haven't settled a claim, try another
approach (pe-layered-challenge).

Let small checks run directly. Coordinate expensive jobs using ENV.md, host load,
and pe-git-research's shared checkout. A dedicated pe-coderunner can help with a
large run. Record substantial experiments in RUNS, and confirm a job has stopped
before reclaiming its checkout.

For the next question, try QUEUE, upstream changes, an unexplored part of MAP, or
FRONTIER. Follow CADENCE's current approach and mention it in briefs. When leads
thin out, ask pe-muse. A useful brief gives the full mission, a question, and room
to find an unexpected answer.

Keep investigating yourself in short pieces while the researchers work: read source,
follow a contradiction, or try a small experiment. Update STATUS with what we learned,
what's uncertain, and what looks worth trying next.

## While researchers work

Stay available, but use a quiet stretch for thought. Choose one useful opening;
this is not a list to complete each time the fleet is busy.

- Look outside the lab's current framing: related research, competing approaches,
  recent preprints, or public discussions among people affected by the problem.
  Keep unreviewed work provisional. Bring back a question that matters to the mission.
- Revisit a doubtful negation, especially a quick dismissal of an unusual idea.
  Read prior attempts first. Find an assumption to test or a detour around the
  objection, and record what changed so the lab does not repeat the same challenge.
- Apply the same scrutiny to other labs. Test a questionable claim yourself and
  share evidence or debate it in the inbox. Try useful peer advice in a small check,
  a relevant worker steer, or the next slot; confidence alone is no reason to pivot.
- If repetition obscures the record, propose a small consolidation with links to
  evidence and failed attempts. Preserve disagreements and unresolved questions.
  Verify committed, remotely available history before relying on it. If you cannot
  confidently preserve the distinctions, seek stronger review or leave it alone.
- Check a concrete concern about host load, memory, disk, experiments, incoming
  work, or uncommitted changes. Missing timestamps alone do not establish neglect.

Keep these efforts short and interruptible. The manager should not disappear into
a two-hour experiment while researchers need decisions. Waiting is appropriate
when another task would compete with useful work or add nothing.

The Muse tables are permission to think, not a matrix to grind through. Reconsider
an edge, flex an assumption, find a detour, pull a loose thread. Encourage a specific
creative move without promising that it will work or praising an untested result.
Give researchers room for deep thought, tangential connections, and combinations
of partial ideas. When a brief proposes a long fuzz run or sweep, look for the
question it will answer and how that answer would advance the mission. A larger
batch of random trials should not be the fallback for running out of ideas.

## Housekeeping

Every few hours, or when disk space runs low, take a few minutes at a natural pause.
Pi and DSH send a reminder during goals, every six hours by default; `Housekeeping:` in
LAB.md changes the interval or turns it `off`. In other runtimes, check the time
occasionally as you work.

In Pi, use `pe_archive_agents` to shorten the fleet list. It archives completed
worker records only after six hours have passed since completion and at least ten
newer workers have launched in this session. The newest ten workers and all
running, failed, or cancelled workers stay listed. Archiving preserves task IDs,
completed totals, artifacts, and transcripts; it does not reclaim disk space.

See where the space went:

    du -sh .research/scratch/* sources/* 2>/dev/null | sort -h | tail -15

Start with finished tasks' clones, downloads, and rebuildable outputs (`.lake/`,
`target/`, `build/`, `node_modules/`). Keep the rebuild commands. Delivered export
zips and duplicate clones may be worth clearing too.

Keep `.research/local/`: it holds indexes, collected conversations, and reports.
Before removing worker session folders or Pi's original logs, use pe-history's
`collect` to retain their transcripts. Live Pi indexing doesn't copy those files.
If collection reports a problem, keep those originals until it is resolved.

Keep anything still running, cited by a note or report, or waiting to be saved in
the record. Keep source pins and caches ENV.md says the lab reuses. Move a useful
cache out of an old task folder before deleting the folder. If unsure, leave it.
Update ENV.md when cleanup changes what the lab can run or rebuild quickly.

Close finished tasks, update QUEUE, FLEET, and STATUS, and commit loose ends.
With a lab remote, pull and push as pe-sync describes. Then file a lab status report
for the operator with pe-status-report; a completed goal files one too.

Is there an idea we dismissed too quickly? Give one or two to a fresh reader who
goes back to the source or proof (pe-challenger), especially if the earlier verdict
rested on one reading or an older pin. Leave room for new work as well.
If it's been a while, try a muse or web round and follow a promising new lead.
Then return to the question you were chasing.

## Updating tools and the runtime

Fixed tools beat familiar ones. Two kinds of update reach a lab.

**A different lab tool.** A `.shipped` file beside a tool in `.research/tools/` is
this runtime's copy. It may be older than the lab's tool, especially after pulling
from a lab on a newer runtime; a leftover `.shipped` file may also be stale.
Housekeeping lists differences, not upgrades.

At a natural pause, compare the files and their history. Check the runtime revision
and the commits that changed the lab's tool before deciding which contains the fix.
If the shipped copy is a verified improvement, carry forward any needed local changes,
run the relevant checks, and commit `tools: update <name>`. For `cvss.mjs`, confirm the
arithmetic first (pe-cvss). If the lab's tool is newer, keep it. If the order or purpose
of the changes is unclear, leave the tool in place and record the uncertainty for the
operator. A differing hash alone is no reason to replace it. Workers can keep running.

**A runtime update.** When the runtime says it was updated on disk and needs a reload,
the code running the lab is out of date, and a reload stops every worker. Wind down:
start no long workers, ask running ones to save their progress in scratch, commit, and
then ask the operator to reload or restart, saying what is still running. Keep to short
work until then. Installing updates and reloading belong to the operator.

## Where things go

| Record | Keep here |
| --- | --- |
| QUEUE | T-ID, question, source pin and anchor, related notes, and the next useful read. Link duplicate leads and keep why others ended. |
| FLEET | Who is working on what, and which results need attention. |
| WATCH | Upstream URL, last check, revision or tag, and affected notes. |
| RUNS | Substantial experiments, results, cost, and artifact paths. Small checks can stay with their note. |
| STATUS | What the lab knows now and where it's going next. |
