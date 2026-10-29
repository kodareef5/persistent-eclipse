### Related projects and commercial neighbors · Ecosystem

| Relationship to the target | Where to look | Transferable question |
| --- | --- | --- |
| Direct competitor | A differently implemented product with the same promise. | What security invariant must **both** solve, and which design avoids it entirely? |
| Open-core / enterprise counterpart | Public OSS code, edition flags, premium plugin interfaces, docs. | What crosses from unprivileged community code into paid administrative capability? |
| Historically related fork | [Valkey](https://github.com/valkey-io/valkey) and [Redis](https://github.com/redis/redis) are a concrete fork lineage. | How do diverging changes alter protocol, persistence, and client assumptions? Not an allegation about either project. |
| Specification siblings | [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) and [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). | Does the same normative requirement have identical failure and auth semantics across languages? |
| Reverse-proxy alternatives | [Envoy](https://github.com/envoyproxy/envoy), [Traefik](https://github.com/traefik/traefik), [Caddy](https://github.com/caddyserver/caddy). | Which forwarded-header, routing, URL, or protocol rule differs among peers? |
| Auth-provider alternatives | [Keycloak](https://github.com/keycloak/keycloak), [ZITADEL](https://github.com/zitadel/zitadel). | How is tenant scoping, audience, session invalidation, and delegated identity represented differently? |
| Hosted service versus self-host edition | Deployment manifests, SaaS docs, image entrypoints, upgrade guidance. | What assumption is provided by the cloud edge but absent in self-hosting? |
| Backend library versus language wrapper | Native library plus Python/Ruby/JS bindings. | Can a safe public API call a native entry with a weaker lifetime or length contract? |
| CLI versus HTTP/API server | Shared business helpers reached through different front doors. | Do CLI privileges inadvertently flow into server-exposed helpers? |
| Official SDK versus third-party SDK | Client construction, retry logic, signing, pagination, OAuth renewal. | Does the third-party binding reimplement validation or trust tokens differently? |
| Plugin/extension marketplace | Public extension repos, examples, loaders, permissions, update metadata. | Who actually controls executable code loaded into the trusted host? |
| Vendor appliance versus upstream OSS | Firmware, distro patches, vendor forks, packaged third-party components. | Which upstream fix or build option was lost in the shipped variant? |
| Container image versus source repository | Dockerfile, image entrypoint, installed system packages, bundled binaries. | Is the deployed execution graph the one a source reviewer expects? |
| Cloud operator versus emulator | Local test environments, emulators, compatibility shims. | Is a security decision simulated locally but implemented differently in production? |
| Replacement project after license split | Migration/compatibility docs and import/export adapters. | Which old behavior is explicitly preserved even when the security architecture changed? |
| Shared protocol, distinct transport | HTTP, WebSocket, SSE, stdio, message bus, RPC variants. | Are identity, framing, and errors invariant under transport swaps? |
| Same component in a different business product | Search [source symbol](https://github.com/features/code-search) or [ecosystem dependents](https://deps.dev/). | Does the host product trust a helper more than the original library intended? |
| Merchant integrations and paid connectors | Billing, CRM, identity, messaging, payments, admin exports. | Which connector acts with service-wide power on user-controlled records? |
| Reference implementation versus rewrite | Specs, compliance suites, migration notes, deprecation logs. | What edge behavior was copied intentionally, and what assumption was accidentally omitted? |
| Public competitor's security fix | Fix diff, postmortem, tests, release notes. | Can the *mechanism* transfer to another implementation without sharing code? |

Related does **not** mean vulnerable. Cross-project comparison is especially useful for discovering *missing questions*, not asserting parity of bugs.
