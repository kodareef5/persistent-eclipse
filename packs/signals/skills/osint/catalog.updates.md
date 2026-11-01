# Meaningful resource knowledge

Only material discoveries and corrections belong here. See [conventions](catalog.md).
These are library lessons, not a diary of every request or a lab's research findings.

## 2026-10-31 · github-stars · documented capability and limited live check

GitHub documents `GET /repos/{owner}/{repo}/stargazers/history` separately from
restricted stargazer identity lists. It returns weekly buckets with daily counts;
time boundaries are not guaranteed to be UTC. This can supply historical attention
context without reconstructing identities or relying solely on local count snapshots.
It does not establish adoption or provide an intraday observation history.
[Official API documentation](https://docs.github.com/en/rest/activity/starring#get-repository-star-history).

An unauthenticated request for the public PE repository returned HTTP 200 and one
zero-count week on 2026-10-31, from one local development host; that establishes
access from that host only. Pagination and nonzero histories were not
tested. Compare semantics and time windows before substituting it for another series.
The former “snapshot counts is the only route” guidance is corrected in technology
and OSINT. Use ongoing snapshots only when the research needs their particular
observation times or the historical route is unsuitable.

## 2026-10-31 · Round 2 fieldbook · documentation and published methods

[Google's official Trends documentation](https://developers.google.com/search/apis/trends)
describes a limited-access alpha with consistent scaling across requests. The old
browser-only row now names that route and its access restriction. No alpha access
was obtained and no Trends API request was tested.

[OpenAlex's filter documentation](https://help.openalex.org/api/filtering/#sync-filters-paid-plans)
distinguishes paid created/updated sync filters from publication-date filters.
The research catalog now makes that distinction before a lab designs a collector.
No API plan or key was exercised.

The [Federal Register public-inspection page](https://www.archives.gov/federal-register/public-inspection)
confirms prepublication availability. The law catalog treats this as an early
observation route, keeping publication, legal effect, and practical impact separate.
The [GFW documentation](https://globalfishingwatch.org/dataset-and-code-fishing-activity/)
explains changing receiver coverage and modeled apparent activity; its
[API documentation](https://globalfishingwatch.org/our-apis/documentation/)
limits access to noncommercial use. Source notes retain those limits.

The [fieldbook review record](fieldbook.md) identifies the supplied archive,
checked official/product documentation, and published cases. Other imported entries
are supplied research leads, not blanket revalidation. The reading did not test
paid tools, data endpoints, or reproduce the investigations.

## Baseline incidents · historical observations, not new checks

The original v0.1 catalog described these results from one development connection,
generally unauthenticated. Per-request receipts and precise environment details
were not retained, so these observations are not reproducible validation claims.

| Resource | Recorded incident | Research implication |
| --- | --- | --- |
| Reddit | Public `.json` and `.rss` requests returned 403 | Check permitted access; do not infer universal API-only access from this result |
| Bluesky | Public search returned 403 | Validate the documented route and auth requirements in the current environment |
| GDELT | Repeated refusals despite spacing requests | Treat access gaps explicitly; test a permitted alternative source |
| Semantic Scholar | 429 without a key | Check quotas/access before sustained collection |
| OpenReview / DBLP / GIJN | Browser or bot challenges | Check documented routes or use a permitted browser read |
| PatentsView | Connection failed from the check host | Do not treat a failed connection as proof the service is unavailable |
| NSF | Requested field trimming did not reduce returned fields | Inspect actual payload size; do not assume the parameter was honored |
| NIH RePORTER | A malformed criteria object returned a broad result set | Validate query semantics and result counts before drawing conclusions |

The live status of these routes has not been revalidated in this revision. Sources
may be valuable despite an access incident, and a reachable API may still be a
poor match for the investigation.
