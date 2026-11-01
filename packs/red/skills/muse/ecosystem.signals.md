### OSINT signals without cargo-culting the rumor · Ecosystem

| Public signal | Why it is interesting | What would ground it |
| --- | --- | --- |
| Security fix with a small, vague changelog | Root cause may be clearer in code than prose. | Fixed and parent commits, release tags, regression test. |
| New authentication-related tests | Someone recently tightened an expected invariant. | Test assertions and all alternate handlers. |
| A bug fix backported unevenly | Different branches may not share the same implementation. | Compare *each* supported branch, not commit hashes alone. |
| A fork lagging upstream | Patches, defaults, or build flags may diverge. | Actual fork revision and its exposure or use. |
| Repeated “works only behind proxy” discussion | The threat model may depend on deployment topology. | Config, trusted headers, route enforcement. |
| A documentation warning | Maintainers may be describing a real footgun. | Find which API behavior the warning refers to. |
| A changed default | The secure behavior may be opt-in in older deployments. | Versioned config, default constructor, migration path. |
| Removed “experimental” label | A feature is entering wider or less reviewed environments. | Public release and any new privilege-bearing integrations. |
| Frequent auth or serializer refactors | Security assumptions may have moved between layers. | Before/after call graph and error-path equivalence. |
| A regression reported only in one language binding | Shared protocol may be implemented differently. | Language-specific parser and cross-language conformance tests. |
| A maintainer disputes exploitability | Environment or actor assumptions may be disputed. | Their concrete counterargument and a source-backed reachability map. |
| Public discussion of high CPU or memory usage | Resource cost may cross a multi-user boundary. | Reachable input, shared resource, actual limits. |
| Package copied into multiple ecosystems | A single parser family can produce variants. | Vendored revisions, ported logic, usage contracts. |
| A “works around” patch rather than invariant fix | The symptom may have been filtered, not removed. | What input equivalence class the filter excludes. |
| Unfinished TODO near a guard | Deferred logic may be an intentional limitation. | Caller responsibility, tests, current release behavior. |
| A new webhook, queue, or import path | The same action is now reachable indirectly. | Origin authentication and final action authorization. |
| AI coding agent newly added to CI | Natural-language PR text may reach privileged tools. | Trigger, prompt construction, token perms, sandbox settings. |
| MCP server or plugin grows more tools | Delegation surface and scope are changing. | Tool schemas, auth, host helpers, permission gates. |
| An apparent zero-click claim online | High attention can hide unclear preconditions. | Primary disclosure, affected revision, counterevidence. |
| High-severity report with no clear affected principal | Some issues are reliability or self-impact only. | Independent principal, violated control, source-visible result. |
