---
name: pe-muse
description: Red-team bug-hunting inspiration from source code, public research signals, architectural seams, and emerging AI systems.
---

# Red Team — Muse

A set of **questions worth asking**, not another audit workflow. Read code for assumptions, read the public ecosystem for unfinished stories, and borrow failure modes from adjacent architectures. An idea is useful when it points to a specific boundary, not merely a familiar weakness name.

Read the mission and `pe-git-research`; the lab already owns scope, evidence, IDs, source pins, challenge, execution, and reporting. Use `pe-reader`, `pe-intel`, `pe-web`, `pe-survey`, and `pe-challenger` as the mission warrants. These tables **inspire hypotheses**; they do not certify vulnerabilities or authorize tests. Keep investigation within the lab's authorization and execution policy; public community material is a lead, not a substitute for source evidence.

For Blue Team, borrow these lenses to identify useful primitives and minimal compatible guards; use `pe-patch` for the fix. For Math Team, use `pe-math` to explore statements, hypotheses, proof dependencies, and counterexamples. The security examples here are optional inspiration, not a requirement to invent a security claim.

Three independent idea banks follow. **L1** notices a clue; **L2** connects it to a boundary; **L3** asks an original, harder question. Pick a lens, not a compulsory sequence. The recurring prompt: **who controls this value or state, who trusts it later, and what security decision depends on the difference?**

## 1. Code — read the trust someone assumed

Follow entry points and the decisions that shaped them: old code, rejected patches, review arguments, parsers, helpers, queues, caches, and privileged operations. Look especially for an invariant asserted in one place but relied upon somewhere else. Read successes *and* error paths; an absent check matters only when its absence can cross a real security boundary.

{{table:code.layers}}

{{table:code.seams}}

{{table:code.history}}

{{table:code.prs}}

{{table:code.changes}}

{{table:code.variants}}

{{table:code.examples}}

## 2. Ecosystem — read the conversation around the code

Security research grows from releases, patches, old PRs, maintainers' disagreements, sibling products, dependencies, specialist communities, disclosures, and architecture changes. Prefer primary artifacts; compare revisions and dates. Community OSINT means **public technical material and discussion**, not private individuals, credentials, or off-scope recon.

{{table:ecosystem.layers}}

{{table:ecosystem.sources}}

{{table:ecosystem.neighbors}}

{{table:ecosystem.dependencies}}

{{table:ecosystem.community}}

{{table:ecosystem.newsletters}}

{{table:ecosystem.signals}}

{{table:ecosystem.searches}}

{{table:ecosystem.examples}}

## 3. Frontiers — borrow the failure, change the architecture

New products rarely invent entirely new security primitives. They compose old ones across boundaries: proxy/origin, tenant/cache, callback/queue, agent/tool, sandbox/host, browser/local service, CI/release. Ask whether the *same assumption* survives when a component, principal, timing, or trust direction changes. AI-connected systems add natural-language input as a new route into conventional privileged APIs; inspect the tool and identity boundary, not just the prompt.

{{table:frontier.layers}}

{{table:frontier.architecture}}

{{table:frontier.ai}}

{{table:frontier.classics}}

{{table:frontier.oddities}}

{{table:frontier.resurrection}}

{{table:frontier.crossovers}}

{{table:frontier.examples}}

A fresh attack idea is not a finding. Carry forward the source path, lower-trust actor, intended control, plausible violation, and the **one missing fact** that would distinguish a real bug from a false positive. Let the existing lab prove, disprove, record, and report it. Do not turn these tables into a coverage checklist or a CWE inventory.
