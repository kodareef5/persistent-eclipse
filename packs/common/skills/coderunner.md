---
name: pe-coderunner
description: Coordinate costly builds, long experiments, fuzzing, and shared run matrices. Reuse setup, respect available compute, and return reproducible results.
---

# Code Runner

Every researcher can write and execute code. Use this skill when a substantial job
benefits from one owner: a large build, a solver sweep, a fuzz campaign, or several
experiments sharing an expensive setup. Small checks need no handoff.

Read the question, mission, source pin, and `.research/ENV.md`. Use the available
tools and your judgment to get a useful result. Follow `pe-git-research` for the
shared compute checkout, Git ownership, and evidence the manager will retain.

## Plan around the machine

Establish what the experiment should distinguish and the smallest useful first run.
Estimate CPU, memory, disk, and duration against current load. Start with bounded
parallelism and a time or iteration limit; reduce the job when it would swamp the
host. Check out the shared compute slot before heavy setup or execution.

When other researchers need the same build, collect their questions and reuse the
setup. Adapt commands and inputs as you learn within the agreed question and budget.
A change of revision, toolchain, or configuration changes the experiment: record it.
Keep the manager informed of a costly expansion or a job that blocks other work.

## Prepare and run

- Keep pinned sources stable. Extract the revision into task scratch, or copy a
  lab-owned proof project with its inputs and dependency pins. Build and edit there.
- Check that the copy includes required submodules, generated inputs, and assets.
  A missing dependency is an environment problem, not evidence against the claim.
- Use task-local dependencies and writable caches. A reusable build is useful when
  source, toolchain, dependencies, and flags match; record those identities.
- Establish a baseline, try the proposed change or input, and compare observations.
  Investigate surprises while keeping the question and resource budget in view.
- Save commands, decisive output, exit status, and small reproducing inputs. Keep
  bulky disposable builds out of Git. Stop before exhaustion, and release the
  checkout after the job and child processes have stopped.

## Interpret the result

For a **reproduction**, distinguish target behavior from a harness defect or setup
failure. A clean run answers the tested case, not every possible variant.

For a **patch**, compare the same failing case before and after the change, then
check nearby valid behavior and relevant existing tests. Preserve the reviewable diff.

For **fuzzing or sanitizers**, keep seeds, flags, duration, and minimized triggers.
Separate crashes, timeouts, resource exhaustion, and diagnostics. Extend a campaign
when its yield and available compute justify it, within the operator's limits.

For **mathematics**, use `pe-math`: retain the exact statement, inputs, precision,
seeds, and toolchain. For Lean, inspect the checked declaration and its axioms and
proof holes as well as the build result. Numerical evidence is not a universal proof.

## Return something reusable

Give the manager the result, artifact paths, exact commands and inputs, and limits.
Report what reproduced, what contradicted the expectation, and what remains blocked
or untested. Useful failures belong beside successes; do not invent missing output.

A compact `result.md` is enough when it contains the evidence. The manager promotes
substantial runs to `.research/runs/REQ-<id>/` and links them to the claim or patch.
There is no mandatory request-and-approval exchange for each command or iteration.
