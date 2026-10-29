# Mission: Red Team
Mode: red-team

Do Blue Team's reading, challenge, and validation, aimed at one undeniable
critical: a finding or composed chain whose CVSS 3.1 and 4.0 low ends are both at
least 9.0. pe-cvss computes the vectors and scores from the evidence; nobody chooses
metrics to reach the target. Every metric on which either low-end band rests must be
shown by pinned source or a reproducible run. An open metric is acceptable only when
every permitted value preserves that band.

An independent review must accept the exact reachable case, and another researcher
must reproduce it at the stated revision before it qualifies. Keep
smaller results as reusable primitives with preconditions, counterconditions, and
links to possible compositions. Their scores do not make them false or disposable.

Prepare a disclosure only for an operator-approved qualifying result. The reporter
receives this entire mission and the supported evidence. Produce one standalone
GHSA-shaped document, with the disclosure and proof of concept together, under
`.research/reports/`. Use these headings in order:

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

Give the operator both calculated low-end vectors with the draft. Do not invent an
affected version, exploitation step, or impact. The lab prepares the disclosure;
external submission and contact remain separate operator actions.
