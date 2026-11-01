### Old ideas, new habitats · Frontiers

| Older mechanism | New architecture where it may reappear | The inventive question |
| --- | --- | --- |
| File polyglots | AI file ingestion, media OCR, document preview, model datasets. | Will the classifier, safety scanner, and tool each consume the same bytes as the same format? |
| DNS rebinding | Desktop agent localhost bridges and browser-to-native helpers. | Does a trusted local interface verify the requesting principal, not just the destination address? |
| Compiler / build trust | AI-generated code, auto-fix CI, package release assistants. | Does the reviewed patch uniquely determine the executable artifact? |
| Dependency confusion | Private model adapters, internal agent plugins, registry federation. | Is package/tool identity namespaced to a verified publisher and registry? |
| HTTP desynchronization | Edge workers, HTTP/2 or HTTP/3 ingress downgraded for legacy origins. | Where does translation reintroduce ambiguous message boundaries? |
| Web cache poisoning | RAG caches, embedding results, shared search indexes, CDN rewrites. | Which private inputs influence an output without influencing its cache key? |
| Shell environment injection | Agent-run shell tools, deployment runners, task sandboxes. | What lower-trust text is promoted into environment or command semantics? |
| Logging-as-interpreter | Telemetry enrichment, analytics pipelines, templated trace viewers. | Can diagnostic data trigger a fetch, evaluation, or action in a stronger service? |
| Parser differentials | MCP tool arguments, OpenAPI adapters, SDK codegen, JSON schema coercion. | Does validation authorize the same typed object that reaches the final sink? |
| TOCTOU and revocation | Scheduled jobs, deferred agent plans, async approvals. | Is permission checked when suggested, when queued, or when actually executed? |
| Weak file-delete primitive | Artifact cleanup, model workspace reset, backup/restore daemons. | Can deletion change a privileged component's future assumptions? |
| XS-Leaks and side channels | Search-based agents, private vector stores, cross-tenant ranking. | Can sizes, counts, scores, or error differences reveal forbidden results? |
| State-machine exploitation | OAuth refresh, resumable uploads, long-running WebSockets, workflows. | Does a valid sequence of operations bypass a per-request invariant? |
| Native memory hazards | Image/audio/video libraries behind high-level AI wrappers. | Which untrusted inputs hit old codecs through a newly popular service? |
| Trusted proxy confusion | Service mesh, zero-trust edge, container sidecars, agent gateways. | Which layer provides identity, and does the origin know that identity is authentic? |
| Artifact/source mismatch | Docker images, browser extensions, signed desktop auto-updaters. | Does the binary distributed to users correspond to the source and policies reviewed? |
| Compatibility bypass | “Works with old clients” adapters for SDKs, APIs, and protocols. | Which exception remains enabled in an environment that no longer needs it? |
| Clock and lease edge cases | Agent schedules, temporary credentials, durable objects, distributed caches. | Can stale authorization survive outside its intended validity period? |
| Weird machine / accidental computation | Template DSLs, query expressions, LLM tools, reactive workflows. | When can a supposedly declarative input unexpectedly drive computation? |
| Partial-success side effects | Retry queues, webhook connectors, high-cost model calls. | Can a failed user-visible action still consume privilege, quota, or money? |

**Exercise for a muse, not a task list:** take one old mechanism, strip away the original vendor and payload, keep the violated invariant, then look for a modern component pair that could disagree about that invariant. Historical analogy is a hypothesis, never evidence.
