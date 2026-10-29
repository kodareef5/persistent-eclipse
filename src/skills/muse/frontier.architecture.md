### Architecture seam bank · Frontiers

| Architecture / shift | The fragile assumption to question |
| --- | --- |
| CDN → reverse proxy → origin | Who decides canonical path, method, scheme, host, request length, and cache key? |
| HTTP/2 or HTTP/3 → HTTP/1 translation | Does a frame/body/request mean exactly the same thing after downgrade? |
| OAuth / OIDC federation | Are issuer, audience, redirect target, session binding, and client identity independently validated? |
| SAML / XML signatures | Does the verified element equal the element from which identity is extracted? |
| Multi-tenant SaaS | Is tenant identity carried through joins, exports, analytics, queues, and search indexes? |
| GraphQL and subscriptions | Does authorization cover each resolver, nested edge, and long-lived update stream? |
| WebSocket / SSE sessions | Is a connection's authority reconsidered after role changes or token expiry? |
| Edge workers and durable state | Can replicas, caches, or eventual-consistency reads resurrect revoked permission? |
| Queue → worker | Does the worker re-evaluate authorization, or trust historical queue metadata forever? |
| Webhooks and event bridges | Are source authenticity, event type, replay, and side-effect idempotency independent? |
| Background reports and exports | Can broad service credentials expose records a requester could not fetch directly? |
| Object storage and signed URLs | Do key prefixes, expiry, method, content type, and owner have consistent meaning? |
| Upload → preview / scan / transcode | Can post-processing encounter active content or filesystem paths absent from the original ingress? |
| Archive / package extraction | Do path normalization and symlinks change the destination after checks? |
| Search / ORM / vector index | Can filter expressions reveal hidden rows, associations, rankings, or metadata? |
| Client-side routing → API | Are browser path/string assumptions reused as server authorization? |
| Native desktop app → localhost bridge | Does the local server independently authenticate callers or trust its UI? |
| Mobile deep link → privileged activity | Can external origin-controlled data invoke account-bound native operations? |
| Plugin and extension ecosystem | Are plugin permissions, provenance, tool naming, and upgrades bound to what was reviewed? |
| CI → artifact → release | Can untrusted repository events, dependencies, or build scripts influence signing and publishing? |
| Container sandbox → host helper | Which copying, logging, networking, and file paths can a sandbox task ask the host to perform? |
| API compatibility adapter | Is an old default, `null` interpretation, or fallback still accepted without its original guard? |
| Multi-region replication | Can ownership, deletion, or revocation race against stale readers or asynchronous cleanup? |
| Rate limiting / billable APIs | Is the cheaply accepted request expensive after nested parsing, fan-out, or retries? |
| Error / telemetry pipeline | Can logs, debug traces, alerts, or exceptions cross principal or secret boundaries? |
| Cryptographic wrapper | Is the intended nonce, key separation, tag, or canonical byte string preserved by every binding? |
| Config-as-code and policy-as-code | Do generated and runtime policies grant the same authority across environments? |
