# How a defense learns

Begin with the promised behavior. What must stay true, for whom, and across which
transitions? A reassuring name such as “validated” or “atomic” is a place to start
reading, not the end of the investigation.

## Follow a repair through its life

Read the failing case, the patch, and the test together. What did the test actually
observe? Find a sibling input, another caller, and an exceptional path. Does the
repair protect the invariant in each, or only recognize the original specimen?

Go backward through history. Was the same check removed, moved, duplicated, or
weakened before? Was it compensating for a guarantee another component stopped
providing? Read surrounding changes and rejected designs when they are available.
Commit messages are leads; the behavior needs its own evidence.

Go forward too. Follow-up fixes can reveal an assumption missing from the first
repair. Build the smallest history of the guarantee: what was promised, what
broke, what changed, and what remains uncertain.

## Put pressure on a premise

| Assumption | Useful disturbance | Evidence to seek |
| --- | --- | --- |
| One writer owns the state | Two legitimate writers overlap | Lost updates, ownership checks, and serialization boundaries |
| A retry repeats the same operation | The first attempt partly succeeded | Idempotency keys, durable receipts, and duplicate effects |
| A process finishes a transaction | It exits between any two writes | Recovery rules and a recognizable incomplete state |
| A cache agrees with its source | A reader sees an old revision | Version checks and whether stale data can cross a trust boundary |
| Events arrive in order | Delay, reorder, or replay them | Causality, sequence validation, and reconciliation behavior |
| Time advances predictably | Clocks disagree or move backward | Monotonic time for intervals and explicit lease assumptions |
| A repair is deployed everywhere | Old and new components coexist | Protocol compatibility and rollback behavior |
| Errors are harmless | Error handling itself fails | Resource cleanup, preserved evidence, and safe recovery |
| A format has one interpretation | Two supported parsers disagree | Canonicalization boundaries and which interpretation authorizes work |
| Independent redundancy is enough | Replicas share one dependency | Common-mode failures and whether diversity is real |

Choose disturbances relevant to the actual system. A good experiment has an
observable invariant and a small explanation of why its result matters.

## Borrow a useful question

Control theory asks what a feedback loop does when its observation arrives late.
Try that question on retries, autoscaling, queues, and automated remediation.
Does the response damp the original problem or amplify it?

Civil engineering follows the load through joints and supports. Follow a system's
guarantee through adapters, callers, and recovery code. A strong component cannot
repair a missing connection between components.

Safety engineering distinguishes a barrier from a warning and examines how two
barriers can fail together. Ask whether supposedly separate checks share a parser,
configuration, administrator, or stale source of truth.

Distributed systems make uncertainty explicit. After a timeout, do we know the
operation failed, or only that the response is missing? Keep that distinction in
both the implementation and the operator's view.

These analogies suggest tests. Write down where they stop matching before using
them to justify a design.

## Make the next regression harder

Describe the family of failures before choosing the test. Can a property test,
small state-machine model, fault injection, or differential check cover more of
that family than one recorded input? Keep a deterministic reproducer as well.

Test the defense's failure path and its rollback. Check that diagnostics expose
what an operator needs without publishing secrets. Preserve the original failure
and dissenting review even after the fix works.

A passing test closes its tested case. Ask what new evidence would challenge the
larger claim. Give a fresh reviewer the invariant and implementation before the
reassuring verdict. Keep looking where another representation or another sequence
of events could teach us something.
