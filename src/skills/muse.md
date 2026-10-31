---
name: pe-muse
description: Red-team bug-hunting inspiration from source code, public research signals, architectural seams, and emerging AI systems.
---

# Red Team — Muse

A set of **questions worth asking**, not another audit workflow. Read code for assumptions, read the public ecosystem for unfinished stories, and borrow failure modes from adjacent architectures. An idea is useful when it points to a specific boundary, not merely a familiar weakness name.

Running out of ideas is not a reason to turn these tables into a checklist. You have
permission to think deeply: reconsider an edge, flex an assumption, find a detour
around a roadblock, or pull a loose thread. Pick an opening worth reasoning about;
do not march through the matrix just to produce more activity.

Use frontier-model reasoning to make connections, combine partial ideas, and work
through the difficult part. Defaulting to random fuzzing or a long script because
you have run out of ideas misses the purpose of the lab. First find a question the
experiment can distinguish. A constructed example, a different representation,
or an argument may be more revealing than a larger search. Let evidence change
your mind; creative confidence is permission to investigate, not proof of a result.

Read the mission and `pe-git-research`; the lab already owns scope, evidence, IDs, source pins, challenge, execution, and reporting. Use `pe-reader`, `pe-intel`, `pe-web`, `pe-survey`, and `pe-challenger` as the mission warrants. These tables **inspire hypotheses**; they do not certify vulnerabilities or authorize tests. Keep investigation within the lab's authorization and execution policy; public community material is a lead, not a substitute for source evidence.

For Blue Team, borrow these lenses to identify useful primitives and minimal compatible guards; use `pe-patch` for the fix. For Math Team, use `pe-math` to explore statements, hypotheses, proof dependencies, and counterexamples. The security examples here are optional inspiration, not a requirement to invent a security claim.

Three independent idea banks follow. **L1** notices a clue; **L2** connects it to a boundary; **L3** asks an original, harder question. Pick a lens, not a compulsory sequence.

Each lens below shows its first few rows. Its full table is a field note beside this skill, in `notes/`; open the one or two whose lens fits the code in front of you, not all of them. The recurring prompt: **who controls this value or state, who trusts it later, and what security decision depends on the difference?**

## 1. Code — read the trust someone assumed

Follow entry points and the decisions that shaped them: old code, rejected patches, review arguments, parsers, helpers, queues, caches, and privileged operations. Look especially for an invariant asserted in one place but relied upon somewhere else. Read successes *and* error paths; an absent check matters only when its absence can cross a real security boundary.

{{sample:code.layers}}

{{sample:code.seams}}

{{sample:code.history}}

{{sample:code.prs}}

{{sample:code.changes}}

{{sample:code.variants}}

{{sample:code.examples:2}}

## 2. Ecosystem — read the conversation around the code

Security research grows from releases, patches, old PRs, maintainers' disagreements, sibling products, dependencies, specialist communities, disclosures, and architecture changes. Prefer primary artifacts; compare revisions and dates. Community OSINT means **public technical material and discussion**, not private individuals, credentials, or off-scope recon.

{{sample:ecosystem.layers}}

{{sample:ecosystem.sources}}

{{sample:ecosystem.neighbors}}

{{sample:ecosystem.dependencies}}

{{sample:ecosystem.community}}

{{sample:ecosystem.newsletters}}

{{sample:ecosystem.signals}}

{{sample:ecosystem.searches}}

{{sample:ecosystem.examples:2}}

## 3. Frontiers — borrow the failure, change the architecture

New products rarely invent entirely new security primitives. They compose old ones across boundaries: proxy/origin, tenant/cache, callback/queue, agent/tool, sandbox/host, browser/local service, CI/release. Ask whether the *same assumption* survives when a component, principal, timing, or trust direction changes. AI-connected systems add natural-language input as a new route into conventional privileged APIs; inspect the tool and identity boundary, not just the prompt.

{{sample:frontier.layers}}

{{sample:frontier.architecture}}

{{sample:frontier.ai}}

{{sample:frontier.classics}}

{{sample:frontier.oddities}}

{{sample:frontier.resurrection}}

{{sample:frontier.crossovers}}

{{sample:frontier.examples:2}}

The layers and lenses of `pe-layered-challenge` also map unasked questions: a cell no one has read on the lab's central claims is an angle. Negations labelled `layer:` show where this lab's errors have lived; look there first.

A fresh attack idea is not a finding. Carry forward the source path, lower-trust actor, intended control, plausible violation, and the **one missing fact** that would distinguish a real bug from a false positive. Let the existing lab prove, disprove, record, and report it. Do not turn these tables into a coverage checklist or a CWE inventory.
