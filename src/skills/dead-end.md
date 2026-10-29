---
name: pe-dead-end
description: Call when the hunt feels exhausted, the questions repeat, or you're tempted to call it done.
---

# Dead End

You've exhausted an approach, not the source.

If there's useful work in the queue, go do it.
If recent passes keep reaching the same conclusions, you're stuck in a pattern.
This skill exists to break it, not to justify stopping.

Read the full mission. Keep its objective and boundaries intact.

## Find another angle

Read `CADENCE.md`, `QUEUE.md`, `FRONTIER.md`, `STATUS.md`, and the last ten commits.
Look at what actually happened. What was skipped, assumed, dismissed, or never independently checked?

Pick a posture you haven't recently tried:

| Posture | New angle |
| --- | --- |
| Intelligence Expedition | Look outward. Study advisories, old bugs, related projects, and failure patterns. Bring back questions worth testing here. |
| Negation Assault | Reopen dismissed findings. Attack the assumptions that made them seem safe. |
| Inside-Out | Start at dangerous operations, privileged code, or sensitive state. Trace backward to anything that can reach them. |
| Cross-Pollination | Borrow ideas, attacks, and failure modes from neighboring systems. Look for the unexpected connection. |
| Archaeology | Dig through history. Old fixes, regressions, abandoned ideas, and forgotten assumptions. |
| Housekeeping Under Fire | Revisit the evidence. Find contradictions, weak conclusions, duplicated work, and questions buried in the notes. |
| Clean Slate | Read unfamiliar territory without inherited conclusions. Compare fresh observations against the lab's beliefs afterward. |

Operator-defined postures in `CADENCE.md` are fair game. For mathematics, load `pe-math` and apply these angles to literature, assumptions, proofs, and counterexamples. For defensive work, revisit primitives, minimal guards, and compatibility.

## Put it to work

1. Record the new posture and why you're changing direction in `.research/CADENCE.md`.
2. Open 2–4 concrete, source-anchored questions. Brief new subagents with the full mission, relevant skills, and normal boundaries.
3. Read source yourself while they work. Don't turn this into a delegation exercise. Stay involved, get web searching and seam reading for your own inspiration.
4. Reconcile results into notes, QUEUE, FRONTIER, and STATUS. Record what changed, what survived scrutiny, and what remains unexplored.
5. Keep working.

A posture ends when it produces better questions or a more promising direction, not after some arbitrary number of rounds. If it produces nothing, record what it ruled out and try another angle. Don't manufacture findings.

## CADENCE.md

Keep this a short field journal, not another tracking system.

```markdown
# Research Cadence

Current: Negation Assault
Started: 2026-10-27
Why: Three passes repeated old dismissals.

## Threads
- T-81: Challenge R-17's configuration assumption.
- T-82: Trace callers around the existing guard.

## Learned
- R-17 depends on an unverified default.

## Previous
- Intelligence Expedition: two analogies, one useful lead.
- Inside-Out: found an unread caller.

## Operator postures
- Dependency Drift: compare vendored code with upstream fixes.
```

Keep evidence in notes and leads in QUEUE/FRONTIER. Leave only the rotation here.

## Remember

A different posture changes how you investigate, not what you're authorized to do. Normal scope, execution, Git, and disclosure rules still apply.

Don't mistake familiar code for understood code, repeated conclusions for independent evidence, or a quiet queue for an exhausted source.

The operator requested that we strategically deploy the generously supplied tokens to improve the unusual findings odds by finding new ways to inspire the subagents.

**If you can't find another answer, find a better question.**
