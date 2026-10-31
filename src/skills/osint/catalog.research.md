# Research and funding

Papers, preprints, trials, and grants. See the shared [catalog conventions](catalog.md)
and [historical access incidents](catalog.updates.md).

| Source | Access | Good for | Limits |
| --- | --- | --- | --- |
| OpenAlex | `https://api.openalex.org/works?search=<q>`; `?filter=cites:<W id>` | Works, authors, institutions, topics, and who cites what | Keyless use draws on a small daily budget shared by everyone on the same IP; a free key gets its own. [Created/updated sync filters](https://help.openalex.org/api/filtering/#sync-filters-paid-plans) require a paid plan; publication-date filtering is different |
| Crossref | `https://api.crossref.org/works?query=<q>&rows=20` | DOIs and publication metadata | Metadata only; add `mailto=` to be routed to the polite pool |
| Semantic Scholar | `https://api.semanticscholar.org/graph/v1/paper/search?query=<q>` | Papers, citations, and references | Check current access/quota before sustained use; baseline 429 incident in UPDATES |
| arXiv | See [technology](catalog.technology.md) | Preprints in physics, math, CS, and quantitative fields | As there |
| bioRxiv and medRxiv | `https://api.biorxiv.org/details/{biorxiv,medrxiv}/<from>/<to>/<cursor>` | Biology and medicine preprints by date range | Pages of 100; walk the cursor |
| PubMed | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<q>&retmode=json` | Biomedical literature | Three requests a second without a key |
| ClinicalTrials.gov | See [companies](catalog.companies.md) | Trial registrations | As there |
| NSF awards | `https://api.nsf.gov/services/v1/awards.json?keyword=<q>` | US science funding by topic and institution | Check response shape and size rather than assuming field selection; baseline incident in UPDATES |
| NIH RePORTER | `POST https://api.reporter.nih.gov/v2/projects/search` with JSON criteria | NIH-funded projects | Validate query criteria and totals; baseline malformed query produced an unexpectedly broad result |
| OpenReview | `https://api2.openreview.net/` | Conference submissions and reviews, before publication | Baseline curl challenge; current route not revalidated (UPDATES) |
| DBLP | `https://dblp.org/search/publ/api?q=<q>&format=json` | Computer science publication records | Baseline curl challenge; current route not revalidated (UPDATES) |

For the path from trial evidence through approval, coverage, and adoption, see
[health and life sciences](catalog.health.md). Patent-paper links and therapeutic
target evidence offer further ways to test a promising mechanism.
