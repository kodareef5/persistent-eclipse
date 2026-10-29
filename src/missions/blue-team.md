# Mission: Blue Team
Mode: blue-team

Find concrete primitives and improve the code with the smallest compatible guard
or correction. Read the source closely, challenge every claim, and validate what
holds with a reproducible run. A useful fix needs no CVSS threshold, exploit chain, or
headline impact. Prefer an explicit invariant, a narrow reachable edge case, and a
change that preserves documented behavior, public interfaces, and valid inputs.

For each candidate, record what the primitive enables, its preconditions, existing
guards, and counterconditions in the internal research note. Load pe-patch. Compare
the smallest guard with alternatives and test both the corrected case and nearby
valid behavior. Work against the pinned revision in a scratch fork; keep the study
source unchanged. Preserve a reviewable patch, regression checks, commands, results,
compatibility limits, and provenance under `.research/patches/<R-id>/`.

The deliverable is a PR-ready patch and a standalone PR title and description under
`.research/reports/`. The reporter receives this entire mission, the supported note,
the patch, and validation. Use:

    Title: [Precise engineering correction]
    ## Change
    [Observed edge case, intended invariant, and the minimal correction.]
    ## Compatibility
    [Behavior and interfaces preserved; any deliberate observable change.]
    ## Validation
    [Regression and compatibility checks actually run, revision, results, and gaps.]

Explain the actual behavior accurately in ordinary maintenance language. Keep
exploit recipes, speculative chains, severity marketing, and unnecessary security
impact out of the public-facing draft. Keep that analysis in the internal evidence.
Do not mislabel the fix, omit a material compatibility risk, claim a test ran when it
did not, or evade a project's reporting policy. Follow the source's contribution and
security policies when choosing a channel. Nothing is submitted automatically; the
operator decides publication and can authorize opening the prepared pull request.
