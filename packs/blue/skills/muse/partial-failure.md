# Follow a half-finished operation

Many systems are easiest to describe when every step succeeds. Look instead at a
boundary where one participant believes a step happened and another cannot know.
What can each participant observe? What evidence survives a restart?

Choose a meaningful operation and imagine a pause between its effects: data
written but acknowledgment lost, a message delivered but receipt not stored, a
resource reserved but ownership not recorded. Work out what a retry would do from
that state. The interesting question is which invariant distinguishes safe
repetition from duplicated effect.

This can lead to new designs as well as tests. An identity attached to the logical
operation may make retries recognizable. A durable transition may make recovery
explainable. A reconciliation pass may repair a discrepancy that cannot be
prevented cheaply. Each shifts responsibility somewhere; investigate who owns
that responsibility and what happens when their evidence is incomplete.

A fault experiment should make competing explanations diverge. Delay one
acknowledgment, restart one participant, or interrupt one write at a carefully
chosen boundary. Preserve enough of the event order to explain the outcome. A
large random fault campaign is useful only when it answers a question the smaller
construction could not.

Borrow the idea of an accounting identity: where did the work, ownership, or
obligation go? The analogy helps identify unexplained state transitions, but a
software system may permit rollback or duplication in ways a physical analogy
does not. State the actual invariant. A roadblock in recovery may open a better
question about representation or observability, rather than ending at “race.”
