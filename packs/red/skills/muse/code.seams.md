### Trust-boundary seams · Code

| Seam | Source clue | Generating question |
| --- | --- | --- |
| Actor versus object | IDs from request bodies, routes, jobs | Is access checked against the *resolved object*, not merely the caller's role? |
| Tenant versus shared cache | Cache keys omit account, policy, or locale | Can a response computed for one principal be reused for another? |
| OAuth audience | Token checked for signature and expiry | Is the token issued for this exact resource, tenant, and operation? |
| Identity propagation | `userId` copied into async jobs, webhook contexts | Is the original actor still valid when the worker executes? |
| Parser versus validator | Decode, normalize, or coerce after approval | Can two consumers disagree on paths, headers, types, or duplicate fields? |
| Signature versus meaning | Signed object parsed twice or transformed | Does the verifier authorize the *same* object the business logic acts upon? |
| URL versus destination | Redirect, DNS, or proxy resolution after URL check | Which resolved host and address will actually be contacted? |
| Path versus filesystem | Join, canonicalize, symlink, unzip, rename | Does the effective filesystem target stay inside the intended root? |
| Upload versus derivative | Thumbnail, preview, OCR, conversion, transcoding | Is a supposedly inert upload parsed again with stronger privileges? |
| Input versus interpreter | Query-builder, template, `eval`, `exec`, shell glue | Where does data become a program or a privileged expression? |
| Structured versus raw | Header/string construction, CSV, XML, JSON, YAML | Is escaping performed for the *next* parser, not the previous one? |
| Proxy versus origin | Route, content length, hostname, scheme | Do intermediaries and origin agree on the request's identity and boundaries? |
| Cache key versus content | Path, query, header, status, `Vary` | Which content variants collapse into one reusable cache entry? |
| Sync versus async | Background queue, retry, fan-out, webhook | Did authorization bind to the enqueue event rather than the eventual action? |
| Retry versus uniqueness | Idempotency keys, dedup tables, partial writes | Can a failure or duplicate cause a one-time operation to happen twice? |
| Revocation versus persistence | Tokens, sessions, signed URLs, persistent jobs | Which retained capability still functions after its owner loses access? |
| Quota versus resource | Expansion loops, decompression, nested structures | Does a small accepted input consume unbounded shared work? |
| Status versus side effect | Error handlers, aborts, transaction boundaries | Can the action succeed before the request is reported as failed? |
| Validation versus mutable state | File swapped, object updated, cache refreshed | Can the subject change between inspection and use? |
| Confused helper | Admin CLI exposed via web, daemon, local bridge | Does a weakly authenticated interface wrap a privileged helper? |
| Secrets versus telemetry | Error bodies, logs, traces, task outputs | Can sensitive values cross into a lower-trust audience through diagnostics? |
| Ownership versus lifetime | Callbacks, async closures, reference counting | Can a still-reachable object outlive the validity of its data or policy? |
| Safe wrapper versus native | FFI, extensions, codecs, database drivers | Does the wrapper's input contract survive its native-language boundary? |
| Isolation versus restore | Export/import, backup, snapshot, migration | Does rebuilding state bypass the checks used for normal writes? |
| Package versus execution | Install hooks, builds, plugins, updates | Which supposedly passive input is actually executed at install or load time? |
| Browser versus local host | Webviews, deep links, localhost RPC, extensions | Is the caller authenticated where the privileged local action is received? |
| Search versus visibility | ORM joins, filters, ranking, full-text indexes | Can an authorized query reveal facts about inaccessible records? |
| Internal versus external flags | `debug`, `internal`, `trusted`, forwarded headers | Who can make the application believe a request is internal? |
