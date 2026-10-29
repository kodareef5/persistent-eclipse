### The odd little bag of tricks · Frontiers

| Oddity to notice | Why it is interesting | Generating question |
| --- | --- | --- |
| Polyglot files | Two parsers can legitimately recognize different payloads in the same bytes. | Does validation classify one format and processing select another? [Mitra](https://github.com/corkami/mitra) |
| Inert-looking secondary parsers | Preview, thumbnail, transcription, and metadata extraction invoke different engines. | Can the *second* parser see structure the first deliberately ignored? |
| Duplicate keys or headers | First-wins, last-wins, reject, merge, and concatenate are all plausible behaviors. | Which value was checked, and which did the privileged consumer act on? |
| Lossy Unicode and case folding | Lowercasing, NFC/NFKC, IDNA, and filesystem case rules need not agree. | Does canonicalization change the identity *after* authorization? [PortSwigger 2025](https://portswigger.net/research/top-10-web-hacking-techniques-of-2025) |
| Signature over different bytes | Serialization can reorder fields, add defaults, or collapse equivalent strings. | Do signer and verifier commit to the same semantic object? |
| Signed versus unsigned integer conversions | A value valid in one width or language can behave differently in another. | Is the checked count still the count used by the allocator or iterator? |
| Default/null/empty ambiguity | `null`, omitted, `false`, and empty can request distinct behavior. | Does an absent policy mean deny to one layer and inherit/allow to another? |
| Archive duplicate entries | Two entries can target the same logical path in different orders. | Which file wins during extraction, scanning, hashing, and later reading? |
| Symlinks, junctions, hard links | Names do not uniquely identify filesystem objects. | What object exists at *use time* after a path was checked? |
| Alternate streams / virtual paths | Filesystems expose name forms beyond ordinary filename strings. | Can a privileged file operation affect an unexpected object? [ZDI file-delete research](https://www.zerodayinitiative.com/blog/2022/3/16/abusing-arbitrary-file-deletes-to-escalate-privilege-and-other-great-tricks) |
| Namespace collisions | Git refs, branches, package names, object keys, and tenants can overlap lexically. | Who controls resolution when two namespaces are searched in sequence? |
| Multipart versus JSON parsing | Framework, middleware, and API implementation can select different values. | Which layer resolves duplicates and mixed data types? |
| Chunking and streaming boundaries | Incremental consumers may parse partial states differently from buffered consumers. | Does a message become actionable before its integrity or length is final? |
| Preprocessing before policy | URL decode, redirect, decompression, and Unicode changes may happen in a different order. | Does a later transform invalidate an earlier approval? |
| Early responses | A request may receive an answer before its body or downstream work finishes. | Does the proxy or client still agree on the next message boundary? [HTTP/1.1 research](https://portswigger.net/research/http1-must-die) |
| Negative caches | “Not found” and “not authorized” can be cached or reused differently. | Can a temporary denial outlive policy changes or leak existence information? |
| Resource lengths as oracles | Body size, ETag length, status, error shape, and timing can depend on hidden data. | Can an inaccessible value still influence an observable output? [PortSwigger 2025](https://portswigger.net/research/top-10-web-hacking-techniques-of-2025) |
| Retry and idempotency collisions | Timeout does not prove failure; replay can duplicate an action. | Which side effect happened before the error was returned? |
| Cleanup and rollback machinery | Delete, overwrite, and restore operations can be more privileged than creation. | Can weak input influence the *undo* path rather than the normal path? |
| Generated source versus compiled artifact | Build transforms and plugins can change behavior after code review. | What executable code is absent from the repository's normal diff? [Trusting Trust](https://research.swtch.com/nih) |
| Interpreter inside “data” tooling | Query filters, log enrichment, templates, and search DSLs can become expressive. | When did a data expression gain access to a privileged runtime? |
| Regex and catastrophic cost | A tiny accepted string may consume disproportionate work. | Is resource use bounded **after** expansion or parsing, not before? |
| Time-zone and clock discontinuities | Expiry, leases, billing windows, and replay protection compare unlike clocks. | Does a leap, DST switch, or clock skew change a security decision? |
| Cross-language object shapes | Integer precision, ordering, serializer defaults, and map-key types vary. | Which object exists in one language but cannot round-trip through another? |
| Copy/paste protocol implementations | Independent SDKs often share the happy path, not corner semantics. | What conformance test would separate two “compatible” implementations? |
| State-dependent API validity | A call sequence can unlock paths no single input can reach. | Are the interesting states covered by current tests or fuzzers? [Structure-aware fuzzing](https://github.com/google/fuzzing/blob/master/docs/structure-aware-fuzzing.md) |
| Special error-path authority | Recover, reinitialize, import, migrate, and restore may run as stronger principals. | Can ordinary user input reach an administrative repair path? |
| Truncated identifiers | Logs, prefixes, display strings, and database columns may retain different lengths. | Can two logically distinct objects collapse to one name? |
| Snapshot and eventual consistency | A decision in a worker may use authority that was valid hours earlier. | What happens after a role, membership, or object owner is revoked? |
| “Read-only” tool with hidden side effects | Fetching a URL can trigger renderers, hooks, imports, or host helpers. | What privileged action occurs *during observation*? |
| Build fixture mistaken for harmless test data | A sample can be transformed or included during release assembly. | Can test material influence production code? [xz original disclosure](https://www.openwall.com/lists/oss-security/2024/03/29/4) |
| Text becomes future agent authority | Retrieval and persistent memory may elevate untrusted instructions later. | Does provenance survive into the next decision or approval? |
| Tool schema changes after approval | A host may show one schema but invoke a changing implementation. | Is consent attached to an immutable action and authority? |
| Differential behavior in debug/production | Instrumentation, flags, and compiler optimizations can affect semantics. | Is a test result proving the same behavior that is actually shipped? |
| Successful error | An error message or rejected expression can still disclose or compute. | Did failure reveal hidden state or already perform a side effect? [PortSwigger 2025](https://portswigger.net/research/top-10-web-hacking-techniques-of-2025) |

A rare trick is worth remembering because it breaks an **assumption**, not because it requires a flashy payload. No attack is established until the relevant component and trust boundary can be shown in source.
