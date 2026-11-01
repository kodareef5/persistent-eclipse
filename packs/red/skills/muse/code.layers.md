### Source-reading layers · Code

| Layer | L1 · Notice | L2 · Connect | L3 · Invent |
| --- | --- | --- | --- |
| Entry | Find endpoints, message handlers, parsers, hooks. | Name the caller and the downstream privilege. | Can an overlooked entry reach the same action with fewer checks? |
| Identity | Locate session, token, actor, tenant, and service identities. | Trace how identity changes between layers. | Can one principal's authority accidentally ride on another's identity? |
| Data | Find values that become queries, paths, URLs, commands, templates. | Follow transformations, validation, and final consumption. | Does another representation change the meaning after validation? |
| State | Mark creation, update, retry, reset, import, migration, deletion. | Compare guards between each lifecycle operation. | Which transition bypasses the invariant enforced during creation? |
| Time | Spot caches, callbacks, background work, deferred jobs. | Compare state when checked with state when used. | Can an expired, replaced, or revoked decision remain useful? |
| Delegation | Find wrappers, plugins, helper services, generated code. | Follow who supplies arguments and credentials. | Does the helper perform a stronger action than its caller may authorize? |
| Boundaries | Draw only boundaries that actually exist in source. | Compare enforcement on both sides. | Does a different component interpret the same input differently? |
| Error | Read short-circuits, exceptions, fallbacks, partial commits. | Ask which checks and side effects still occur. | Is an error path a second, less-guarded implementation? |
| Memory | Trace lengths, ownership, lifetime, aliasing, FFI. | Compare contract across caller, parser, allocator. | Which uncommon valid state defeats an unstated size or lifetime assumption? |
| Fixes | Locate old guards, newer guards, and tests. | Ask what root cause the patch actually removes. | Which sibling path or later feature preserved the old invariant violation? |
