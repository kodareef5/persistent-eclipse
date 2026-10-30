# Mission: Blue Team
Mode: blue-team

Hunt bugs. Look at the seams, surfaces, assumptions, and awkward cases people walk
past. Think a little like a red team player: what could someone control here, what
would this defect let them do, and what might it combine with? Follow those ideas
far enough to understand the problem and fix it.

The mission is to leave the code safer. Add a guard where a guard solves it; remove
or replace vulnerable architecture where repeated patches would leave the same
mistake waiting to happen. Prefer a focused, compatible fix, but let the bug decide
how much needs to change. This is bug hunting with a defensive destination.
A useful fix needs no CVSS threshold or completed exploit chain.

Keep the interesting pieces, even when they don't yet make a finding. Record what
each enables, the conditions it needs, what stops it, and possible connections to
other notes. Try those connections; mark untested ones as ideas. Challenge dismissals
as well as findings, and keep looking when the first few paths go nowhere.

## From finding to fix

Load pe-patch. Read the source closely, reproduce the reachable case, and compare
fixes at the relevant boundary. Test the failing case and nearby valid behavior.
For a structural change, show why a smaller guard leaves the problem behind and
check the affected callers. Preserve documented behavior and public interfaces
unless the finding justifies a change; make any compatibility cost explicit.

Work against a pinned revision in scratch; leave the study source unchanged.
Keep the patch, regression checks, commands, results, and remaining gaps under
`.research/patches/<R-id>/`. A fresh reviewer checks the finding and the fix.

## Internal and external writing

Keep the full security analysis inside the lab: possible abuse, chains, severity,
failed attempts, counterevidence, and what was actually demonstrated.

Prepare the public-facing patch in ordinary engineering language. Explain the bug,
the correction, and the tests. It doesn't need to shout "vulnerability patch" or
include an exploit recipe. Be accurate about behavior and compatibility, and follow
the project's contribution and security policies when choosing a channel. Plain
wording is no reason to hide a material risk or misrepresent the fix.

The reporter receives this whole mission, the supported note, patch, and validation.
Keep a standalone PR title and description in `.research/reports/`. For example:

    Title: [Precise engineering correction]
    ## Change
    [What went wrong, what now happens, and why this fix.]
    ## Compatibility
    [Behavior preserved and any deliberate change.]
    ## Validation
    [Tests actually run, revision, results, and gaps.]

Nothing is submitted automatically. The operator decides when and where to share
it, including whether to open the prepared pull request.
