---
name: pe-patch
description: Fix supported bugs at their cause, with compatible patches, regression checks, and clear PR drafts.
---

# Patch

## Tools
- `read` and search source, history, existing tests, and project policies.
- Draft unified diffs, tests, and review notes in task scratch.
- Apply changes and run focused tests yourself in a scratch copy. Coordinate heavy builds or shared setup through `pe-git-research`; `pe-coderunner` can own a substantial run matrix.
- The manager promotes final artifacts to `.research/patches/<R-id>/`.
- Never modify pinned source or submit upstream.

## Preparation
- Read the mission, `SCOPE`, contribution rules, security policy, and linked finding.
- Confirm the primitive, affected revision, evidence, counterconditions, and remaining uncertainty.
- State the violated invariant in one precise sentence.
- Identify the smallest reachable case demonstrating the violation.
- Trace relevant callers, entry points, existing guards, and downstream assumptions.
- Check prior fixes, tests, compatibility promises, and supported environments.
- Distinguish demonstrated defects from speculative impact. No severity score or exploit narrative required.

## Fix Design
Compare candidate guards before choosing one:

- **Placement:** Validate at the boundary where the invariant can be enforced reliably.
- **Coverage:** Include every relevant path without adding unrelated restrictions.
- **Ordering:** Check before unsafe effects, allocations, mutations, or irreversible operations.
- **Behavior:** Preserve valid inputs, return values, errors, and documented contracts.
- **Compatibility:** Respect existing APIs, ABI, protocols, formats, and supported platforms.
- **Cost:** Consider hot paths, allocations, complexity, concurrency, and resource limits.
- **Consistency:** Reuse established validation patterns and error handling.
- **Alternatives:** Record why simpler, earlier, later, or broader guards were rejected.

Prefer the smallest sufficient change. If a local guard leaves the same bug reachable
elsewhere, compare it with removing or replacing the unsafe design. Let the finding
justify that scope, check affected callers, and explain the compatibility cost. Keep
unrelated refactoring and speculative hardening for another task.

## Patch Construction
1. **Pin:** Record the exact source commit and affected symbols.
2. **Guard:** Draft the focused correction against that revision.
3. **Regress:** Add a focused check for the original failing case.
4. **Preserve:** Cover nearby valid inputs, boundary values, and existing behavior.
5. **Inspect:** Review the full diff for side effects, bypass paths, and accidental changes.
6. **Test:** Apply the change in scratch and run the focused checks; reserve compute for heavy jobs.
7. **Revise:** Adjust only when evidence, review, or compatibility requires it.

Keep changes easy to review. Separate test changes when useful. Never claim a patch works merely because its logic appears sound.

## Validation

Use the checks that will establish whether the fix works, within the available compute and operator scope:

- **Baseline:** Confirm the original case fails or violates the invariant on the pinned revision.
- **Patched:** Confirm the same case is handled correctly after the change.
- **Regression:** Run the new focused tests against base and patched revisions.
- **Compatibility:** Exercise nearby valid cases and relevant existing tests.
- **Boundaries:** Examine adjacent callers, error paths, state transitions, and applicable edge cases.
- **Platforms:** Check supported configurations where practical.
- **Sanitizers:** Use ASan, UBSan, or focused fuzzing when relevant, with a bounded budget.

Record exact commands, inputs, exit status, output, tool versions, and environment. Distinguish observed runs from static reasoning, inherited results, and proposed checks.

A baseline that does not reproduce needs investigation, not an invented failure. A blocked or unavailable test remains unverified. Passing targeted tests does not establish universal correctness.

## Artifacts

The manager assembles `.research/patches/<R-id>/`:

- `change.patch` — Unified diff against the pinned revision.
- `tests.patch` — Separate regression changes, if applicable.
- `validation.md` — Reproduction, testing, compatibility, and review record.
- `pr.md` — Proposed title, summary, testing statement, and maintenance notes.

`validation.md` must include:

- Finding ID, source commit SHA, and patch hash.
- Violated invariant and exact correction.
- Guard placement and rejected alternatives.
- Execution environment and exact commands.
- Baseline and patched results, clearly distinguished.
- Relevant regression and existing test outcomes.
- Unrun checks, blockers, remaining risks, and compatibility limits.
- Links to supporting findings, retained runbooks or logs, and review notes.

Keep detailed investigation in the linked research note. Artifact claims must be traceable to evidence, not reconstructed from memory.

## Independent Review
- Send the complete diff, finding, validation record, and counterconditions to `pe-challenger`.
- Challenge guard completeness, bypasses, behavioral changes, and compatibility.
- Check that tests actually distinguish the broken and corrected behavior.
- Question whether the patch treats the root cause or only one symptom.
- Record objections, revisions, unresolved concerns, and review disposition.
- Repeat review after material changes.

## Handoff
- Give `pe-reporter` the mission, supported finding, artifact paths, validation results, and challenger review.
- Prepare concise PR prose: problem, cause, correction, tests, and limitations.
- Cite `patches/<R-id>/change.patch` and relevant `REQ` logs.
- State exactly what was tested; never convert planned checks into claimed results.
- Label unvalidated work as a proposal, not a verified fix.
- Leave all submission, disclosure, and upstream contact to the operator.

## Rules
- One supported problem, one focused patch. Split independent issues.
- Keep pinned source unchanged; use task scratch for patches and tests, and the shared checkout for heavy jobs.
- Preserve existing behavior unless the finding justifies changing it.
- Do not hide incomplete coverage, failed tests, or compatibility uncertainty.
- Do not silently expand scope to fix adjacent speculative issues.
- A reviewable diff is not automatically a correct fix; passing tests are not proof of completeness.
- No push, PR, issue, email, or external submission without operator authorization.
- Deliver the smallest defensible fix, with evidence sufficient for someone else to reproduce and review it.
