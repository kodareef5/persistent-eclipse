### Architectural layers · Frontiers

| Layer | L1 · Notice | L2 · Connect | L3 · Transpose |
| --- | --- | --- | --- |
| Component boundary | Identify two components handling one input. | Compare their assumptions, identities, and representations. | What new meaning appears only when they are chained? |
| Protocol boundary | Find an upgrade, downgrade, adapter, proxy, or translation. | Compare framing, canonicalization, and error semantics. | Can a message be valid to one peer and dangerous to another? |
| Principal boundary | Map user, tenant, service, device, agent, and operator. | Follow who delegates to whom and with which credentials. | Can a low-trust principal induce an action by a stronger one? |
| Storage boundary | Compare cache, database, object store, index, export. | Identify key, ACL, retention, and serialization mismatch. | Is deleted or private information still exposed by a derivative? |
| Time boundary | Find scheduler, retry, callback, eventual consistency. | Compare validation and later use states. | Can permission or ownership change between them? |
| Execution boundary | Find sandbox, process, container, host, CI runner. | Identify the host-side functions that cross it. | Does a safe sandbox expose a trusted file or tool transfer escape hatch? |
| Human/agent boundary | List untrusted prompts, retrieved content, and callable tools. | Map credentials and the final API guard. | Does natural language become an unintended capability? |
| Device/browser boundary | Inspect extension, webview, localhost server, deep link. | Compare origin policy, IPC auth, and native privileges. | What changes when remote pages can influence local processes? |
| Release boundary | Trace dev, build, signing, registry, install, update. | Compare artifact provenance and authority at each hop. | Which build-time input quietly becomes production execution? |
| Research boundary | Find a known published mechanism. | Remove product-specific details, keep the invariant. | Where is that invariant newly fragile because the architecture changed? |
