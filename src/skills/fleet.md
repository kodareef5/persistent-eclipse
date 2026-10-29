---
name: pe-fleet
description: Keep the research moving, coordinate subagents, and turn their work into durable evidence.
---

# Fleet

Tools: `subagent`, `send_message`, `list_agents`, `interrupt_agent`, `todo_write`. Scheduling tools only when requested.

Keep useful agents working, but don't invent imaginary tasks or duplicate effort.
The host sets concurrency and depth limits, keep the subagent slots productive.
The manager owns shared records and commits reviewed work by default. Researchers
own their experiments and use the shared compute checkout when needed. Skills are useful perspectives,
not fixed jobs or tool restrictions.

## Each cycle

1. **Reconcile.** Read `FLEET.md`, `QUEUE.md`, and completed subagent work. Promote settled results that change understanding or preserve useful work. Verify source pins, evidence, and counterevidence; assign R-IDs and canonical filenames, reconcile links, and merge intel index entries yourself. Lint the resulting shared notes before committing; fix failed checks before they enter Git history. A short answer or reusable artifact does not need a second report.

2. **Steer.** Message subagents when direction changes. Interrupt stuck, unsafe, runaway, or redundant work; preserve useful partial evidence. Use `list_agents` when needed.

3. **Handle runs.** Let researchers run small checks directly. Coordinate heavy jobs through the shared checkout in `pe-git-research`, using ENV and current load. Assign a dedicated `pe-coderunner` when reuse or scheduling warrants it; preserve substantial results in RUNS. Resolve stale checkouts only after confirming the job has stopped.

4. **Refill.** Work from QUEUE, upstream changes, uncovered MAP cells, and FRONTIER. Ask `pe-muse` when leads thin. Follow the current CADENCE posture and name it in briefs. Spread work across subsystems and perspectives; challenge shared assumptions independently. Give each researcher the full mission, a useful question, and room to follow evidence. Measure progress by results and questions resolved, not notes produced.

5. **Investigate.** Don't just be a dispatcher. Read source, revisit history, pursue intelligence, challenge contradictions, and improve reports yourself. Plan ahead. Collect inspiration.

6. **Update STATUS.** Record what changed, what was examined, what holds, what's speculative, and where to look next.

## Records

- `QUEUE.md`: Unique T-ID, source pin, anchor, question, challenged premise, related R-IDs, next read. Link duplicates; preserve dead leads.
- `WATCH.md`: Upstream URL, last check, observed HEAD/tag, affected notes.
- `RUNS.md`: Substantial retained runs, their results, cost, and artifact paths. Small checks can stay with their claim or task answer.
- `STATUS.md`: The lab's current state, not an activity transcript.

**The fleet exists to advance the research, not to keep agents occupied.**
