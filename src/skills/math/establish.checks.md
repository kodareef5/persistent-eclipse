### Formal and computational checks · Establish

| Question | Minimal useful check or request |
| --- | --- |
| Is the theorem the right one? | Compare paper statement, definitions, binders, types, hypotheses, and Lean declaration. |
| Are dependencies pinned? | Record source SHA, `lean-toolchain`, Lake config, lock/dependency revisions, input hashes. |
| Did the project build? | Run the relevant `lake build` target and retain its output; coordinate heavy builds. A build alone is not proof. |
| Are there holes? | Inspect use of `sorry` / `admit` and `sorryAx`, including dependencies. |
| Which axioms remain? | Request `#print axioms Fully.Qualified.theorem`; distinguish standard kernel bases, custom axioms, and native evaluation. |
| Can it be rechecked separately? | Use `lean4checker --fresh` or `lake check` if supported by the pinned tools; absence means unchecked. |
| Does a submitted proof match a challenge? | Where available, use `lake comparator` with a trusted statement and axiom allowlist. |
| Is a computation exact? | Prefer rational/integer/symbolic certificates; record algorithms, inputs, and proof obligations. |
| Is a numerical conclusion sound? | Specify precision, conditioning, tolerance, units, error bounds, and convergence tests. |
| Is an enumeration complete? | State the finite universe, pruning assumptions, symmetry reductions, and coverage. |
| Can another researcher rerun the check? | Keep the question, pinned inputs, runnable steps, relevant output, budget, and interpretation together. |
| What remains open? | State the missing lemma, untested regime, correspondence gap, or unperformed check; use lab evidence states. |
