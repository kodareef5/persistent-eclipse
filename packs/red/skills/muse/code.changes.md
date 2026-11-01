### Diff and history lenses · Code

| Change to notice | What may have moved | Uncomfortable question |
| --- | --- | --- |
| A new guard | A previously accepted shape is now rejected. | Does another entry still accept that shape? |
| A deleted check | Ownership of validation moved to a caller. | Which callers were not upgraded? |
| A refactor | Equivalent-looking call graphs are not always equivalent. | Were exceptions, defaults, and order of checks preserved? |
| A compatibility mode | Legacy parsing and new parsing coexist. | Which mode does each boundary actually use? |
| A new feature flag | Enforcement may differ in rollout states. | Is disabled, unset, or fallback more permissive? |
| A helper extraction | A safe wrapper becomes reusable. | Can it now be called outside the original permission check? |
| A new async path | A state snapshot replaces a live decision. | What changes between scheduling and execution? |
| A new cache | Authorization and freshness become key-design questions. | Was the old principal-specific behavior preserved? |
| A new import/export | Another path can write or reconstruct state. | Does it honor the original object's constraints? |
| A sanitizer patch | One escaping context was repaired. | Where else is the same value decoded or rendered? |
| A new exception handler | A failed operation may preserve partial state. | What was committed or emitted before rollback? |
| A backport | Similar-looking fixes land on different code trees. | Does the older architecture require a different guard? |
| An API migration | Auth, error, and URL semantics may change. | Which adapter pretends old and new APIs mean the same thing? |
| A test added for an edge case | The team learned about an invariant. | What adjacent input or lifecycle branch is absent from the test? |
| A revised comment or TODO | Assumptions were disputed or postponed. | Does the implementation still depend on the old assumption? |
