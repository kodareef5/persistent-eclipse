---
name: pe-math
description: Investigate mathematical statements, improvements, and counterexamples; preserve precise claims, assumptions, Lean artifacts, and reproducible checks.
---

# Mathematics

Try an idea, see what it teaches you, and let that suggest the next one. A useful
result may be a proof, counterexample, sharper theorem, connection, or a clear account
of where an approach breaks. These tables are places to look when you want another
angle; follow the question wherever it gets interesting.

Read the mission and `pe-git-research`. Use the lab's note kinds, R-IDs, evidence states, links, source pins, review, and promotion; mathematics needs no CVSS. Use `pe-intel`, `pe-survey`, `pe-muse`, `pe-reader`, and `pe-challenger` where useful. Their code-oriented examples are lenses, not a reason to manufacture security claims.

## Field notes

When choosing mathematical software, setting up Lean and Mathlib, or planning expensive
computation, read the field note first. Prefer an existing environment and a focused
check to a new build.

- {{note:tools.software}}: the smallest engine that answers the question, and how far
  each one's evidence goes.
- {{note:tools.lean}}: search Mathlib before proving, keep one warm workspace, build the
  slice, and ask what Lean actually proved.
- {{note:tools.compute}}: reuse environments by identity, and spend compute on
  verification that matters.

The tables below show their first rows; each full table is a note in `notes/` too.

Read sources, try arguments, write Lean, and run computations in scratch. Any researcher can check an idea; coordinate costly builds, solver searches, and dependency setup through `pe-git-research`. A draft is not a checked result. These three concepts are independent idea banks, not required phases. Each table's **L1** offers a quick opening, **L2** a structural probe, and **L3** a deeper research question; choose freely.

For calculations supporting the argument, use the editable runbook described in
`pe-git-research`. Check arithmetic and algebra rather than trusting a fluent mental
derivation. Keep assumptions, runnable steps, and outputs together, with exact
arithmetic or a simple independent check where practical. The runbook shows what
was computed; the argument still has to connect that computation to the claim.

## 1. Explore — open the problem

Pin the original statement and revision before varying it. Ask what changes with the objects, hypotheses, parameters, and representation; search primary papers, errata, alternate formulations, and prior improvements. Keep distinct conjectures distinct. The most useful question is often the smallest missing implication or construction.

{{sample:explore.layers}}

{{sample:explore.moves}}

{{sample:explore.regimes}}

## 2. Challenge — push against the claim

Try to refute the statement **as written**, not an easier variant. For a universal claim, seek a witness satisfying every hypothesis; for a proof, isolate the load-bearing lemma and trace it both forward and backward. Failed tactics, absent witnesses in a bounded search, and genuine counterexamples are different outcomes. A fresh reviewer can attack the claim without inheriting the author's argument.

{{sample:challenge.layers}}

{{sample:challenge.attacks}}

{{sample:challenge.repairs}}

## 3. Establish — decide what holds

Keep the **intended theorem** explicit: domains, definitions, quantifier order, parameter dependencies, hypotheses, and conclusion. In the existing claim note, anchor the source (page/theorem or `file::declaration`), contribution (proof, improvement, weaker hypothesis, missing case, counterexample, or negation), and dependent R-IDs. If formalized, retain the Lean declaration, statement correspondence, axioms, and unresolved obligations. Do not substitute a formally provable but weaker statement.

Pin manuscript/proof versions. For non-repository PDFs, retain original bytes where permitted, URL, date, SHA-256, and a line-numbered extract in `intel/`; cite page and theorem numbers. Use the source SHA or `sha256:<hash>` as required by `pe-git-research`, retaining old formulations when sources change. Check priority against primary work before calling something novel.

For durable formal work, the manager keeps source, statement-to-declaration mapping, `lean-toolchain`, Lake/dependency pins, and experiment inputs under `.research/lean/<R-id>/`. That is one proof artifact per claim, not one environment per claim: compatible proofs share a pinned, prebuilt workspace (`notes/tools.lean.md`). Retain substantial runbooks and results there or under `.research/runs/REQ-<id>/`. Run focused checks directly; use the compute checkout for heavy work and a dedicated `pe-coderunner` when shared setup warrants it. A missing environment leaves a check open; do not imply it ran.

{{sample:establish.layers}}

{{sample:establish.evidence}}

{{sample:establish.checks}}

The mission's status words map onto a note's fields: *conjectured* is `kind: hypothesis` with `state: open`; *informally argued* has no `checks`, or `checks: [review]` once another researcher has reconstructed it; *computationally tested* adds `run` and covers only the cases computed; *kernel-checked* adds `proof` for the named statement and axiom basis.

A kernel-checked theorem establishes its **formal proposition under its axiom basis**, not automatically the intended human theorem. Separately inspect proof holes, unusual axioms, and correspondence. Finite computation is not a universal proof; an exactly verified counterexample can refute one. Keep these limits in the lab's existing Validation field, and seek independent challenge before reporting a final result. A result that is complex, uncertain, or high-stakes also passes `pe-layered-challenge` before the lab declares it.
