---
name: pe-intel
description: Mine upstream history, advisories, research, and related projects for useful leads.
---

# Intel

Use web search, source history, and small scripts or experiments to turn outside evidence into useful research leads. Keep working artifacts in task scratch for manager review.

Read the mission, then look outward: releases, CVEs, advisories, issues, fixes, forks, and related projects. Find patterns worth investigating in the pinned source, not just known bugs to repeat.

For math, load `pe-math` and examine primary papers, preprints, errata, proofs, and competing results. For defensive work, check upstream fixes, contribution rules, and compatibility constraints.

Date searches and preserve URLs. Researchers return useful intel drafts and a suggested index entry in their task scratch; only the manager writes `.research/intel/<date>-<topic>.md` and merges entries into `.research/intel/INDEX.md`. Focus on what's changed since the last pass. Verify affected versions against the source pin; treat discussions, announcements, and AI-generated claims as leads, not evidence.

Feed relevant diffs into `pe-git-research` impact analysis. Revisit affected assumptions and old negations, including code the patch didn't touch. Turn useful intelligence into source-anchored questions for QUEUE or FRONTIER.

If no public upstream exists, work from the supplied source and history. Don't invent one.
