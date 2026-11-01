### Pull requests and review residue · Code

| Public artifact | What it might tell you | Better question than “is this vulnerable?” |
| --- | --- | --- |
| Closed, unmerged security hardening PR | A protection was considered but not integrated; reasons may be sound. | Which exact threat was rejected, and does today's architecture change that reasoning? |
| PR marked “too breaking” | Compatibility blocked a stricter interpretation or authorization rule. | Which mode still accepts ambiguous or legacy inputs? |
| Review thread asking “what about X?” | A reviewer named a branch the final patch may or may not cover. | Did the code or tests resolve **that** objection? |
| A comment saying “callers must validate” | Validation was deliberately pushed out of a helper. | Enumerate callers: do they enforce the same contract? |
| “Security fix” PR with a single added test | The test reveals a decisive precondition, not necessarily the whole bug class. | Which neighboring state or representation is absent from the test? |
| Refactor PR with hundreds of unrelated changes | Equivalent behavior is hard to review when code moves and changes simultaneously. | Which new invariant was smuggled in as a supposedly mechanical edit? |
| PR to replace a native parser with a binding | Threat moves from one parser and ABI to another. | Does the wrapper keep length, ownership, and error contracts intact? |
| “Only affects Windows” or “only in CI” comment | Platform-specific runtime details alter the safety model. | What other platform or deployment reproduces the necessary condition? |
| Feature request blocked on auth design | A missing permission model can be visible before the feature ships. | Did the eventual implementation resolve or postpone the question? |
| “This is a dependency bug” closure | The vulnerable assumption may live at the package boundary. | Does the caller constrain its dependency, or trust an unsupported behavior? |
| Stale PR with an almost-finished fix | The attempted repair documents a suspected invariant. | Is the concern still real on the pinned head, or now irrelevant? |
| Backport bot PR with conflict resolutions | Mechanical application of patches can alter important context. | Was the original guard adapted to the old branch's call graph? |
| Generated-code PR with no generated diff | Commit review may not show what will run after code generation. | What does the released artifact actually contain? |
| Lockfile-only PR | Transitive versions change without a visible source diff. | Which parser, plugin, or lifecycle hook changed behavior underneath the application? |
| Security-related test marked flaky or skipped | A critical state may be hard to reproduce or low-frequency. | What condition is skipped, and does the production path still exercise it? |
| Maintainer discussion about trusted proxy headers | Security may rely on topology, not on the application alone. | Which deployment configuration is actually supported and enforced? |
| Fix to one sibling implementation | Another language binding, CLI, or worker path may remain inconsistent. | Which sibling implements the same semantic contract independently? |
| Review of unfamiliar third-party contributions | An innocuous change can have downstream release consequences. | What changed in the build or packaging boundary? [libarchive PR 1609](https://github.com/libarchive/libarchive/pull/1609), [subsequent revert PR 2101](https://github.com/libarchive/libarchive/pull/2101) |
| Issue closed as “won't fix” | The maintainer may have accepted a limited threat model. | Does that limitation still match the documented supported deployment? |
| PR fixes a symptom, not the data model | State is patched near one consumer instead of at its origin. | Which other consumer still interprets the old state? |

**Useful public places:** repository [Pull requests](https://docs.github.com/en/pull-requests) and [Issues](https://docs.github.com/en/issues), [ecosyste.ms issue/PR index](https://issues.ecosyste.ms/), downstream distro patch series on [lore.kernel.org](https://lore.kernel.org/), linked GHSA fix references. A PR thread is evidence of *discussion*, not of an exploitable present-day defect.
