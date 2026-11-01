# Repairs and resilience

Read the patch before reading its reassuring summary. Which invariant did it restore, and which callers still depend on the old behavior? Trace the patch’s ancestors, rejected alternatives, regression tests, and later repairs. A fix that blocks one specimen may leave the same failure under another representation.

Look for variants across sibling implementations, exception paths, migrations, partial deployments, retries, and stale caches. Ask what happens halfway through the operation, or when the repair itself fails. Construct the smallest reproducible failure and a test that would have caught it.

Borrow from fault-tolerant systems: redundancy can repeat a common-mode failure. Borrow from control theory: a stabilizing feedback loop can amplify a delayed signal. Borrow from civil engineering: the load path matters more than the strongest component in isolation. Make the correspondence precise before importing a solution.

Try changing one premise: perfect clocks, ordered messages, durable writes, a single owner, independent failures. Which guarantee survives? Find the smallest compatible guard and the observations that would show it is working.

Regression prevention is more than adding the original example. Identify the family of inputs or transitions, test its boundary, and explain why the repaired invariant covers it. Keep failed defenses and their assumptions visible.
