# Cyber reporting: evidence, challenge, and advisory format

Read this for security findings, including findings delivered as patches. The
mission still chooses the artifact. Apply the evidence and review checks below to
security work; use the GHSA structure and output template only for an advisory.
For a patch PR, combine these checks with pe-patch rather than attaching an
unrequested advisory. Operator requirements for disclosure and delivery still apply.

## Evidence Intake
For security findings, establish the following.

- **Primitive:** Exact operation, broken invariant, missing guard, or trust-boundary failure.
- **Trigger:** Minimum input, actor, state, and conditions needed to reach it.
- **Source:** Repository, affected version or commit SHA, file, symbol, and line references.
- **Behavior:** What the code permits versus what should happen.
- **Reproduction:** Actual commands, inputs, observations, and retained experiment results.
- **Impact:** Demonstrated consequence, required access, affected configurations, and limits.
- **Counterevidence:** Existing guards, unreachable paths, conflicting tests, or failed reproductions.
- **Remediation:** Supported fix, workaround, or explicitly unknown correction.
- **Review:** Challenger objections, unresolved questions, and validation coverage.

Classify claims before writing:

- `verified` — Directly supported by source evidence or completed checks, within their stated scope.
- `reproduced` — Observed in a recorded execution against the identified revision.
- `inferred` — Reasoned consequence supported by evidence but not directly demonstrated.
- `unverified` — Missing, incomplete, or contradictory evidence.

Do not promote an inference into an observation. A source-level demonstration is not automatically an executed PoC.

## GHSA Format

Use this structure for security advisories. Keep each section short, specific, and independently understandable.

**Title:** `[Component] allows [security consequence] via [trigger]`

### Summary
- One or two sentences.
- Name the vulnerable component or function, attacker-controlled input, consequence, and essential preconditions.
- State the actual security boundary crossed, not a generic weakness category.
- Avoid unsupported claims about exploitability, prevalence, or affected users.

### Details
- Explain the broken invariant, missing validation, or unsafe operation.
- Link the exact vulnerable source at the affected revision.
- Identify how the input reaches the operation and why existing guards fail.
- Include the decisive code relationship, not a lengthy code walkthrough.
- Distinguish a reachable defect from a hypothetical path.

### Proof of Concept
- **Affected:** Exact version, commit, and relevant configuration.
- **Steps:** Minimal setup, input or action, and observable result.
- **Expected:** The correct safe behavior.
- **Observed:** The actual unsafe behavior, with supporting evidence.
- **Verification:** Reproduced, statically established, or unverified.

Rules:
- Use the smallest supported reproduction; prefer deterministic, local evidence.
- Preserve exact commands and inputs when available.
- Never invent a setup, payload, output, log, crash, or successful test.
- Do not present suggested reproduction steps as executed results.
- If execution was not performed, write `[unverified: not executed]` and describe the source-level evidence instead.
- A failed or blocked reproduction must remain visible in the internal validation record.
- Do not claim an affected release when only a commit was examined.

### Impact
- Identify the security consequence and the asset or boundary affected.
- State required attacker access, permissions, configuration, and prerequisites.
- Separate demonstrated impact from plausible downstream consequences.
- Explain limitations that materially narrow exposure.
- Do not inflate impact with hypothetical exploit chains.
- Omit CVSS, CWE, severity, and affected-version ranges unless supported and required by the mission.

### Remediation
- Describe the smallest compatible guard or correction.
- Reference a validated patch or workaround when available.
- Distinguish proposed fixes from tested fixes.
- State compatibility implications or remaining gaps when material.
- Write `Unknown` if no defensible correction is established.

## Writing Rules
- Lead with the defect, not the research history.
- Prefer exact functions, conditions, and consequences over vulnerability jargon.
- One issue per advisory; split independent primitives.
- Keep prose terse. Every sentence should add evidence, a condition, or a consequence.
- Use precise verbs: *accepts, bypasses, reaches, reads, writes, allocates, returns*.
- Avoid *could potentially, appears vulnerable, severe risk,* and unsupported certainty.
- Don't repeat the Summary in Details or the Details in Impact.
- Preserve meaningful uncertainty without weakening supported facts.
- Cite immutable commit links where possible; never invent URLs.
- Use version ranges only when introduction and correction boundaries are established.
- Keep internal IDs, agent names, scratch paths, and lab methodology out of the public draft.
- Make the advisory understandable without access to the lab.
- No decorative introductions, research diary, speculative chains, or filler.

## Internal Evidence Index

Maintain an accompanying internal record, separate from the advisory:

- Finding ID and source revision.
- Claim-to-evidence links for each advisory section.
- Reproduction request IDs, commands, artifacts, and observed results.
- Versions examined and version-range uncertainty.
- Inferences, counterconditions, and unverified assertions.
- Patch and regression evidence, if available.
- Challenger review, objections, and resolution.
- Mission acceptance criteria and their completion status.

The public advisory stays portable. The internal index preserves traceability.

## Review
Before marking a draft ready:

1. **Trace:** Every factual claim resolves to supporting evidence.
2. **Scope:** Affected revision, actor, input, and conditions are correct.
3. **Reproduce:** PoC claims match actual recorded observations.
4. **Challenge:** `pe-challenger` independently reviews the primitive, reachability, impact, and report.
5. **Validate:** Complete the checks required by the mission at the stated revision.
6. **Revise:** Resolve or disclose meaningful contradictions and review objections.
7. **Trim:** Remove unsupported adjectives, repeated explanations, and unnecessary detail.
8. **Approve:** Mark ready only when evidence, review, and acceptance criteria permit it.

A complete-looking document is not necessarily a validated advisory. Label incomplete work `draft` and preserve the blockers.

## Handoff
- Manager promotes the advisory to `.research/reports/<R-id>.md`.
- Include the internal evidence index and current verification status.
- Report readiness, unresolved claims, blocked checks, and unmet criteria.
- Preserve challenger feedback and validation references.
- Never submit, publish, email, open an issue, or contact upstream.
- The lab prepares the advisory; the operator controls disclosure.

## Output Template

**Title:** [Component] allows [security consequence] via [trigger]

### Summary
[Function/file] trusts [attacker-controlled input], allowing [specific security consequence] under [conditions].

### Details
[Broken boundary, missing check, or vulnerable operation. Explain the reachable path and link the exact source revision.]

### Proof of Concept

**Affected:** [Version/commit]

1. [Minimal setup]
2. [Minimal input/action]
3. [Observable result]

**Expected:** [Safe behavior]

**Observed:** [Unsafe behavior and evidence]

### Impact
[Required attacker access, affected configurations, demonstrated consequence, and material limitations.]

### Remediation
[Smallest compatible fix, tested workaround, or Unknown.]

## Final Rules
- Report what the evidence establishes, not what the finding might become.
- No invented reproduction, impact, version ranges, tests, novelty, or fixes.
- Never hide contradictory evidence or failed validation.
- Do not substitute static reasoning for an executed result.
- No arbitrary severity threshold; the mission defines report eligibility.
- A strong advisory is short because the evidence is precise, not because the important qualifications were removed.
- Deliver the mission's report with enough evidence for its intended reader to check it.
