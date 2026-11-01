### AI-adjacent boundary bank · Frontiers

| Surface | What makes it interesting | Generating question |
| --- | --- | --- |
| Retrieved pages and RAG | Untrusted prose enters planning context. | Can a retrieved instruction be mistaken for an authorized user request? |
| Tool response content | A nominally factual tool result can address the agent. | Is a tool's output able to change plans or permissions unrelated to its data? |
| MCP tool descriptions | Tool metadata tells the model when and how to act. | Could a newly installed or updated tool claim authority it never earned? |
| MCP token passthrough | Credential audiences and downstream identities may differ. | Are incoming tokens explicitly issued for this resource rather than another API? |
| MCP local Inspector / dev proxies | Local testing helpers sometimes wrap process execution. | Who can reach the local proxy and invoke its privileged methods? |
| Delegated service identity | The agent may have broad scopes to “help” the user. | What operation can it perform that the requesting actor could not? |
| Tool schema coercion | Natural-language choices become typed parameters. | Which parameters are treated as trusted just because they are structured? |
| Sandbox ↔ host file transfer | A safe execution area may have a privileged import/export helper. | Can the agent select host-side paths rather than only sandbox paths? |
| Code interpreter / shell tool | The model's suggestion reaches OS processes. | Which checks are independent of the model's instruction compliance? |
| Agent-readable repo instructions | A PR, README, issue, or dependency can contain role-like prose. | Can attacker-controlled project text influence a coding agent's privileged step? |
| AI in CI/CD | Event messages become agent prompts inside runners. | What untrusted event data is combined with repository write or secret permissions? |
| Long-term agent memory | Summaries and learned facts outlive a source session. | Can a one-time untrusted input be promoted into a persistent instruction? |
| Agent-to-agent delegation | One agent may summarize untrusted text for another. | Is the original trust label lost during handoff or compaction? |
| Retrieval indexing / vector filter | “Search” systems may evaluate expressions or expose metadata. | Can a model-selected filter query reach an interpreter or cross-tenant index? |
| Summarization → action | An assistant may summarize then call email, calendar, or CRM APIs. | Where is a source document promoted from evidence into authorization? |
| Dynamic tool registry | Available tools change across versions or sessions. | Is consent bound to the precise tool identity, permissions, and implementation? |
| Browser agents | Page text, pixels, links, and focus state are model input. | Can a page influence higher-privilege actions outside its browser origin? |
| OCR / transcription / multimodal input | Hidden or incidental content can be interpreted as text instructions. | Does the system preserve where an instruction came from? |
| Content filters as sole defense | Model refusals cannot enforce resource isolation. | Is the forbidden action impossible at the final API even if the model requests it? |
| Context truncation / compaction | Critical constraints may leave the active context. | Do tool-side permissions survive irrespective of context-window state? |
| Agent-side package installation | Suggested dependencies cross into build-time code. | Who vets provenance and install hooks before an agent executes them? |
| Model-generated code / queries | Generated syntax may be used as policy or executed expressions. | Does the destination parser enforce a narrower capability than the model can express? |
| Continuous agents and schedules | Authority and goals persist as external state changes. | Will a deferred action recheck scope, access, and owner intent? |
| Shared agent workspaces | Files, sessions, embeddings, and tool outputs mix. | Can one project, principal, or tenant plant data seen by another? |
| AI-derived remediation | An auto-fix may only block one visible payload. | Did the patch enforce an invariant or merely appease the current detector? |
| AI usage / inference quotas | Tasks can amplify expensive tool calls and nested model work. | Are costs and concurrency bounded per principal at the executor? |
