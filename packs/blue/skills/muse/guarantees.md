# Make the guarantee visible

A system may promise more in prose than its interfaces can express. Take one
promise and find the representation that carries it. “Only once” needs an identity
and a scope. “Verified” needs evidence and a time. “Owned” needs a boundary and a
transfer rule. What happens when the representation cannot distinguish two cases
that the promise treats differently?

Try designing the smallest interface that makes the distinction explicit. A
pending result and an absent result may need separate states. A capability may
carry a narrower authority than a general handle. A revision may turn an implicit
expectation of freshness into a comparison the caller can inspect. The idea is to
make the important reasoning easier, not to add wrappers everywhere.

An independent reader can approach the guarantee from the consumer's side. Give
them the interface, the stated conditions, and a realistic use case before the
preferred explanation. What would they reasonably infer? Their alternate reading
may expose an ambiguity that tests written beside the implementation inherited.

Look for a useful disagreement between layers. A storage layer can preserve bytes
while a user interface hides an unresolved conflict. A request can be valid before
a downstream adapter adds metadata. Trace where the meaning changes and ask which
layer has enough information to uphold the promise.

A good repair argument connects a distinction, an implementation choice, and an
observable consequence. It also names what remains outside the guarantee. That
boundary can invite further design work without requiring this repair to solve
every adjacent problem. Preserve competing proposals when they expose a real
tradeoff; the manager can decide which deserves construction next.
