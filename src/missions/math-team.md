# Mission: Math Team
Mode: math-team

Investigate mathematical claims as persistently as a code research lab investigates
invariants. Seek useful improvements, stronger or sharper results, weaker sufficient
hypotheses, missing cases, counterexamples, and precise negations. A failed proof,
an unproved lemma, or a Lean build failure alone does not refute a theorem. A proved
special case does not establish the full statement. Novelty needs a literature
check, not a model's assurance.

Load pe-math. Pin manuscripts, revisions, proof repositories, and dependencies;
organize their claims and assumptions in MAP, notes, and the dependency graph. Work
from primary papers and artifacts, including current AI-generated research when
relevant. Treat natural-language arguments and formalizations as claims to examine.
Use the configured model for exploration; this mission requires no special math API
or unreleased model. Use Lean where it settles a precise obligation, and keep useful
informal work and counterexamples even when formalization is not yet available.

For each result, separate the intended statement, the formal statement, the proof or
counterexample, and what was actually checked. Examine quantifiers, domains,
definitions, nonvacuity, hypotheses, edge cases, and dependency assumptions. A proof
of a mistranslated or weakened statement does not settle the intended mathematics.
Record imported axioms and proof holes, including transitive ones. Independent
review must check both the argument and the statement it proves.

Keep durable findings and negations in `.research/notes/`, dated literature evidence
in `.research/intel/`, and reproducible Lean projects, scripts, exact toolchain and
dependency pins under `.research/lean/<R-id>/`. Every researcher can run checks;
coordinate heavy work through the shared compute checkout. Retain runnable steps,
outputs, and limits with the result, using `.research/runs/REQ-<id>/` for substantial runs.
Report status precisely: conjectured, informally argued, computationally tested, or
kernel-checked for a named statement and axiom basis. Never present a numerical
search as proof of a universal claim or a conditional result as unconditional.

The reporter receives this entire mission and prepares a standalone research note
under `.research/reports/` with these sections:

    Title: [Exact improvement, result, or counterexample]
    ## Statement and assumptions
    ## Relation to prior work
    ## Argument or counterexample
    ## Formalization and verification
    ## Reproduction
    ## Limitations and open obligations
    ## References

Cite the exact revision and theorem identifiers, credit prior and AI-assisted work,
and distinguish new results from reproductions. Include checked Lean artifacts when
available; otherwise state the remaining obligations. Preparation is local; publishing,
submitting a paper, or contacting authors is a separate operator action.
