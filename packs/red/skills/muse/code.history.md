### Repository archaeology · Code

| L1 · Clue in history | L2 · What the change reveals | L3 · Question worth chasing |
| --- | --- | --- |
| First introduction of a sensitive function | The original callers, threat model, and tests may differ from today's. | Which new caller relies on an assumption that was true only at introduction? |
| `git blame` points to an innocuous refactor | The visible line is newer than the underlying security decision. | Follow its earlier names: when was that decision actually introduced? |
| A guard appears, disappears, then returns | A compatibility or performance dispute may have outweighed a safety invariant. | What runtime regime still uses the rejected behavior? |
| A reverted security or correctness patch | Reviewers may have found breakage without replacing the intended protection. | Was the invariant repaired elsewhere, or was the fix merely undone? |
| A feature removed from the UI | Backend handlers and serialized legacy state often survive. | Is there a reachable path to the retired capability after migration/import? |
| A formerly internal API becomes public | It may inherit an internal caller's authorization assumptions. | What should the public boundary check independently now? |
| A one-off migration becomes reusable | Temporary elevated permissions and bypass flags can outlive the migration. | Who can trigger the helper after its original one-time use? |
| A security change is backported selectively | Old branches can require different fixes despite identical patch titles. | Which *supported* revision preserved the old behavior? |
| An old test is deleted as flaky | Flakiness sometimes hides timing, ownership, or state-dependent invariants. | Did the test become unnecessary, or did its only evidence disappear? |
| Config defaults change without an API change | The same method may now mean something different in a fresh installation. | Do upgraded and new deployments make the same security decision? |
| A compatibility parser remains after a rewrite | Old encodings and new encodings may land on the same privileged operation. | Which parser approves, and which parser executes? |
| A new caching or batching optimization | A formerly per-principal check may be hoisted, memoized, or reused. | What exactly keys the decision being reused? |
| A warning comment survives but the API changes | Maintainers may remember a hazard that newer callers no longer understand. | Is the comment describing an unproven fear or an active invariant? |
| A bug was fixed by filtering one string | The patch may remove an example rather than the behavior class. | What representation change makes the exact filter irrelevant? |
| A dependency was upgraded to resolve a crash | The new version can change parsing, defaults, or exceptional behavior. | Which caller's validation was written for the old dependency contract? |
| Source moves into generated or vendored files | Review focus can shift away from actual executed code. | Are generated outputs and checked-in sources semantically aligned? |
| Build/release script changes without application changes | Execution and artifact content can diverge from source control. | Do release archives, install scripts, and built outputs match the reviewed tree? [xz disclosure](https://www.openwall.com/lists/oss-security/2024/03/29/4) |
| Unusual binary fixture, sample, or corpus enters history | Test data can influence packaging or build rules, not just tests. | Is it inert test material in the *actual* release? [xz follow-up](https://openwall.com/lists/oss-security/2024/03/30/43) |
| A low-severity bug recurs across multiple releases | Repeated local fixes may conceal a shared architectural cause. | What is the one assertion each patch hoped would remain true? |
| An anomaly predates the first public report | Earlier maintenance may reveal the root cause or affected range. | Where does the behavior first become reachable, not merely first documented? |
