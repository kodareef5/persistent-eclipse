---
name: pe-layered-challenge
description: After pe-challenger agrees, check a complex, uncertain, or high-stakes claim with fresh reviewers before declaring it established.
---

# Layered challenge

A broad review can miss a small but important step. After pe-challenger agrees with
a complex, uncertain, or high-stakes claim, give fresh readers a few narrower
questions before announcing it. Think of a report headline, a claimed improvement
on published work, or a lemma many other notes rely on. Routine notes usually need
only the first review.
This approach draws on Djordje Puzic's "One reviewer per layer" (2026).

Choose questions that could change the verdict. For example, one reader checks a
lemma while another checks that the next lemma can actually use it. A third might
look for a precision cost missing from the runtime bound.

## Questions to try

| Angle | Code | Mathematics |
| --- | --- | --- |
| Intent | Does this solve the problem we care about? | Is this the theorem we meant to prove? |
| Tools | Do compilation, types, linters, and secret scans check out? | Do proofs, axioms, scripts, and artifact hashes check out? |
| Local reasoning | Does each function handle its edge cases and failures? | Does each lemma hold, including small parameters and awkward signs? |
| Connections | Do callers, configuration, and interfaces agree? | Are each cited result's assumptions met? Do the parameters and formal statements match the prose? |
| Cost and behavior | What happens under concurrency, retries, timeouts, or deployment? | Does the time and space bound include precision, bit length, and every parameter? |
| Meaning | Can a user reach this behavior? What is the impact? | Does the headline follow? How does it compare with the literature? |

Keep the mission in view when choosing questions. Use tools for the mechanical
checks. Give readers the remaining questions that deserve attention;
there is no need to fill every row.

For any question, look for a counterexample, check earlier attempts, and ask which
other claims depend on the answer.

## Working with reviewers

Write down the exact claim, `checked_at`, and what each part assumes and provides.
Use readers who neither wrote it nor did the first review. Another model or lab may
notice assumptions you've both missed.
Use pe-models to check both available and operator-approved choices. An approved
model can take one of these questions; it doesn't need a separate round just for
being different.

Give each reader enough context for their question, with links to the source. Ask:
"What holds? What does it assume? What can the next step rely on? What couldn't you
check?" Precise statements help more than a general vote of confidence.

When answers disagree, return to the disputed step or run a small check that could
decide it. If two readers flag the same issue, inspect it together; agreement alone
doesn't prove they are right.

## Keeping the result

Before calling the claim checked, make sure the reviewed steps hold together and
the remaining gaps don't undermine it. Keep the questions, readers and models,
answers, assumptions, and unchecked parts in
`.research/reviews/<date>-<R-id>-layers.md`. Target it from the note and add `review`
to `checks`. An incomplete review stays incomplete.

If a claim fails, record what refutes or narrows it as pe-git-research describes.
A label such as `layer:wiring` can help the lab recognize recurring mistakes.

After three rounds without settling the claim, change approach: ask another lab,
re-derive the result, or try an experiment. New research suggested by a review gets
its own task and review.
