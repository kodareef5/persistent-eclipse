# Give the idea somewhere to go

Pick the question that makes you curious. These are openings, not a round to finish.

## Change the view

| Starting point | A different view | What to check |
| --- | --- | --- |
| A recurrence | A generating function or linear operator | Does the change preserve initial conditions and convergence? |
| Many local constraints | A graph, incidence structure, or constraint system | What information disappears when the objects become vertices? |
| A geometric configuration | Coordinates, a dual configuration, or an invariant | Which features are artifacts of the coordinates? |
| An existential claim | A randomized construction or an explicit algorithm | Is the probability positive, and is the construction actually computable? |
| A bound | An optimization problem and its dual | Is there a gap between feasible witnesses and the desired optimum? |
| A counting problem | An involution, bijection, or group action | Are fixed points and stabilizers accounted for? |
| A rigid identity | A deformation with a free parameter | What survives differentiation, a limit, or specialization? |
| An infinite object | Finite approximations with a compactness argument | Which uniform estimate allows passage to the limit? |
| A deterministic process | A potential, martingale, or energy | Is monotonicity true, conditional, or merely observed? |
| A hard classification | An obstruction or a useful partial order | Can the obstruction distinguish cases the old classification conflated? |

Try one translation on a tiny example before translating the whole paper. The
translation itself may expose the assumption we have been carrying unnoticed.

## When a proof keeps failing

Where is the first unjustified step? Give it a name and isolate it as a smaller
statement. Sometimes the proof needs a lemma; sometimes that statement is false
and the intended theorem needs another route. Keep those possibilities separate.

Try reversing the proof. If the conclusion fails, what structure must exist?
Can that structure be counted, ordered, compressed, or shown to contradict one
specific hypothesis? A contrapositive may expose a witness that a direct proof hides.

Look for an extremal counterexample and ask what makes it extremal. Could a local
replacement improve it? Does minimality give a stronger property than the original
assumptions? If no minimum exists, does an infimum or a limiting sequence help?

Prove a deliberately weaker statement. Track exactly where it becomes easier.
Then strengthen just that part. A toy model is useful when it reveals a mechanism,
not when it quietly removes the difficult feature and declares victory.

Search for a historical proof of a neighboring theorem. Read the argument, not
only the theorem's name. Which move made progress possible? Could that move apply
here even when the named theorem cannot?

## Experiments that teach us something

Write down what each possible result would mean before running the script. Try
small exhaustive cases, structured families, extreme parameters, and adversarial
examples. Random sampling and exhaustive enumeration answer different questions.

Use exact arithmetic when the claim concerns exact equality. For numerical work,
record precision, conditioning, tolerances, and a second way to calculate the same
quantity. A numerical pattern can suggest a conjecture; it does not settle it.

When a search finds nothing, keep the searched domain and exclusions beside the
result. Can symmetry shrink the next search without discarding witnesses? Can a
solver produce a certificate that a smaller independent checker can verify?

When a construction almost works, study the residue. Is the error concentrated
at a boundary, a parity class, a singularity, or one exceptional family? The failed
construction may be telling us the right invariant.

Leave the next researcher something alive: the surprising example, the precise
obstruction, the alternative representation, or the next experiment that could
change your mind. There is no need to manufacture a discovery. There is room to
keep looking carefully.
