# Build from the obstruction

A counterexample search can be a construction problem: what mechanism would make
the claim fail? Start with the dependency you distrust, then design an object
where that dependency is exposed.

For a claim built from local information, consider whether two objects could have
the same local observations but different global behavior. What information would
distinguish them? For a claim about a limiting process, consider where convergence
might cease to be uniform. For a uniqueness claim, look for a transformation that
preserves all stated conditions while changing the proposed answer. These are
starting questions, not obligations to perform every kind of search.

An almost-counterexample can be especially useful. If a candidate fails only
because of one condition, that condition may carry more of the theorem than the
proof makes apparent. Try explaining its role. It may suggest a sharper statement,
a new invariant, or a genuinely different construction that satisfies the
condition for another reason.

When computation finds a candidate, reduce it while preserving the mechanism.
Changing its scale, removing an interaction, or altering a boundary can reveal
which feature matters. The purpose is an explanation that could generate further
examples, not a catalogue of unsuccessful runs. Keep enough of the computation
for someone else to reproduce the observation.

If no candidate emerges, the obstruction may itself suggest a proof. Describe the
specific family explored and why its intended failure mechanism was blocked.
That is evidence about a route, not a conclusion about every possible object.
The unresolved structural question is often the most useful thing to hand on.
