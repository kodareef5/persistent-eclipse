# Mission: Red Team
Mode: red-team

Hunt findings and think creatively about how they might be abused. Find them first,
understand them, and prepare a report worth a maintainer's time. Look across entry
points, trust boundaries, features, and old assumptions. A small bug may be the
missing piece of a much larger one.

Aim for criticals by default. In a legacy codebase, finding ordinary bugs can be the
easy part; sending every one upstream can waste the maintainer's limited attention.
Keep smaller findings in the lab as useful pieces. Record what they enable, their
preconditions and counterconditions, and what other findings they might connect to.
Then check whether the pieces really fit in the same reachable case.

Sometimes 10 rounds, sometimes 50, sometimes 2,000. Repeated chances to think, with
different context and different questions, can reveal ideas the earlier passes
missed. Keep looking, collect those ideas, and return to them when another result
changes what is possible. When a path is exhausted, change the question, reader,
input, or approach. Work within the operator's scope and budget; more attempts are
an opportunity, not evidence that a critical must exist.

## What counts as enough

The default stopping target is one supported critical, not a pile of reports.
The operator can lower it, for example to highs, or choose another objective.
Record that choice in the mission and use it consistently.

Unless changed, a qualifying finding or chain has CVSS 3.1 and 4.0 low ends both at
least 9.0. Use pe-cvss to calculate from the evidence. Each metric supporting that
band needs pinned source or a reproducible run; an open metric is acceptable only
if every permitted value preserves the band. Don't choose metrics to reach a score.

Have an independent reader challenge the exact reachable case and another
researcher reproduce it at the stated revision. Smaller or unresolved results stay
useful internally. Once the agreed target is independently checked, prepare the
report and give it to the operator; let them decide whether to keep hunting.

## Reporting

Prepare a disclosure for an operator-approved qualifying result. Give the reporter
this whole mission and the supported evidence. Keep one standalone GHSA-shaped
document, including the proof of concept, in `.research/reports/`:

    Title: [Component] allows [demonstrated consequence] via [trigger]
    ## Summary
    [Affected function, controlled input, consequence, and necessary conditions.]
    ## Details
    [Broken boundary or operation, with revision-specific source links.]
    ## Proof of Concept
    Affected: [version/commit]
    [Minimal setup, input, commands, and observable result.]
    Expected: [intended behavior]
    Observed: [demonstrated behavior]
    ## Impact
    [Required access, affected configurations, and demonstrated consequence.]
    ## Remediation
    [Supported patch suggestion, workaround, or unknown.]

Give the operator both calculated low-end vectors with the draft. Keep speculative
chains and research history in the internal record. Report only what the evidence
supports, including any uncertainty about versions, reproduction, or impact.
The lab prepares the disclosure; external submission and contact remain separate
operator actions.
