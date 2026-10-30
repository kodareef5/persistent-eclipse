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
has approved the exact alternative. Check the recorded list before each switch;
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

Steer researchers when a result changes the question. Stop stuck or duplicate work
and keep useful partial results. Give a reviewer a review to finish; new ideas can
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

## Housekeeping

Every few hours, or when disk space runs low, take a few minutes at a natural pause.
Pi sends a reminder during goals, every six hours by default; `Housekeeping:` in
LAB.md changes the interval or turns it `off`. In other runtimes, check the time
occasionally as you work.

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
With a lab remote, pull and push as pe-sync describes.

Is there an idea we dismissed too quickly? Give one or two to a fresh reader who
goes back to the source or proof (pe-challenger), especially if the earlier verdict
rested on one reading or an older pin. Leave room for new work as well.
If it's been a while, try a muse or web round and follow a promising new lead.
Then return to the question you were chasing.

## Where things go

| Record | Keep here |
| --- | --- |
| QUEUE | T-ID, question, source pin and anchor, related notes, and the next useful read. Link duplicate leads and keep why others ended. |
| FLEET | Who is working on what, and which results need attention. |
| WATCH | Upstream URL, last check, revision or tag, and affected notes. |
| RUNS | Substantial experiments, results, cost, and artifact paths. Small checks can stay with their note. |
| STATUS | What the lab knows now and where it's going next. |
