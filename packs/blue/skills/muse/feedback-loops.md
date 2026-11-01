# When the remedy changes the failure

A defensive mechanism participates in the system it protects. Retries create
traffic, health checks consume capacity, queues change latency, and automated
recovery changes what operators can observe. Ask how the response affects the
condition that triggered it.

Draw a small causal loop around one symptom. Increased latency might trigger more
retries, which create more work, which further increases latency. A backoff can
weaken that loop, but its reset condition matters: ordinary progress might erase
the very history needed to suppress repeated intervention. Inspect the sequence
of state changes, not just the delay values in isolation.

A neighboring discipline can suggest questions about delay, amplification, and
measurement. Which observation is a leading signal, which arrives late, and which
is produced by the intervention itself? A healthy average may hide oscillation.
Two individually reasonable controllers may compete when they share a resource.
The analogy becomes useful when it identifies a concrete observable or a changed
condition worth exploring.

Construct a scenario where the mechanism is partly successful. One worker keeps
making progress while another waits; a service recovers while a stale failure
signal remains; capacity becomes available between scheduled inspections. These
boundary situations can reveal interactions a pure failure fixture misses.

The resulting artifact might be a short event trace with an explanation of the
loop, or a substantial simulation if that is needed. Keep the question visible:
what stabilizes the useful behavior, what merely hides the symptom, and what new
failure could the proposed remedy introduce? The next investigation should follow
that distinction rather than repeatedly measuring the same steady state.
