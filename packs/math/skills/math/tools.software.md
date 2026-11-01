### Choosing mathematical software · Field note

Pick the smallest engine that can answer the question in front of you. Don't start
Lean when a Python calculation or a SAT solver settles the immediate step, and don't
grind a big search when the task is to audit a formal statement: then open Lean first.

| Problem | First choice | Escalate when |
| --- | --- | --- |
| Algebraic identities, simplification | SymPy | assumptions get subtle, or the identity has to be proved |
| Finite counterexamples, logical constraints | Z3, cvc5, a SAT solver | a solver's answer needs an independent check |
| Number theory, advanced algebra | SageMath, PARI/GP, FLINT | a formal theorem or certified result is required |
| Numerical exploration | NumPy, SciPy, mpmath | floating-point error could change the conclusion |
| Rigorous numerical bounds | Arb, via FLINT or python-flint | a general statement needs proof, not an enclosure |
| Formal verification | Lean 4 with Mathlib | the exact statement matters; start here to audit a formalization |

These are starting points, not stages to march through. A twenty-line experiment can
find a counterexample a week of formalization would not.

**Let computation discover; let certificates establish.** Each engine's evidence goes
only so far:

- A numerical run, however large, covers the cases it ran, at the precision it ran.
- A solver's `unsat` is as trustworthy as the encoding and the solver; prefer one that
  emits a proof certificate (DRAT for SAT, for instance) and check it with a separate
  checker when the result carries weight.
- An interval enclosure from Arb is a proof about the computed quantity, not the
  theorem it suggests.
- A Lean proof establishes its formal statement under its axioms, which is not
  automatically the human theorem (see `tools.lean.md`).

Record which engine produced each result, its version, and its exact input, and label
the note's `checks` by what was actually done: `run` for computation, `proof` only for
a kernel-checked statement. Promote evidence deliberately; a fluent computation is not
a proof, and an exhaustive search of small cases is not a theorem about all cases.
