# Professional toolbench: what an investigator reaches for, and why

A tool isn't a strategy. The useful question is **what new investigative move does it unlock?** These are selections, not a mandate to install all of them. `Open` = free/open source or publicly accessible; `Key` = registration/credentials; `Paid` = commercial; `Mixed` = open and paid options.

## Collect, watch, and preserve

| Tool | Access | The useful move | Pitfall / PE fit |
| --- | --- | --- | --- |
| [Hunchly](https://hunch.ly/) | Paid | Automatically preserve page captures, URLs, timestamps, hashes, and a browser research trail for defensible investigations. | Useful when an adversarial claim might be removed; storing an extracted Markdown summary is not equivalent to an original capture. |
| [changedetection.io](https://changedetection.io/) | Mixed | Compare *selected page elements*, added/removed text, or a rendered page across time. | An A/B test or cookie banner can create a misleading diff; collector runs apart from PE manager. Already in initial Signals catalogs; listed here for the contrast with forensic capture. |
| [Trafilatura](https://trafilatura.readthedocs.io/) | Open | Extract article bodies, metadata, dates, links and comments from HTML, avoiding navigation clutter. | Extractor can lose qualifiers, tables or footnotes. Keep raw HTML if a claim matters. |
| [Crawl4AI](https://docs.crawl4ai.com/) | Mixed | Crawl rendered and JavaScript-driven websites into Markdown or structured extraction, using browser control when necessary. | Bigger operational surface than RSS/API. Respect site policies; start with official feeds. |
| [Apify Actors](https://docs.apify.com/actors) | Paid / limited free | Reuse prebuilt or custom hosted scrapers with structured input/output and independent scheduling. | Third-party actor quality and access rules vary. Useful as **collection**, not a second PE orchestrator. |
| [Diffbot Knowledge Graph](https://www.diffbot.com/products/knowledge-graph) | Paid | Query machine-extracted entities and news relationships across the public web. | A fused graph assertion needs a path back to its original source; don't equate extraction with verification. |
| [Common Crawl Index](https://index.commoncrawl.org/) | Open | Recover historical or broader web captures when a site's archive is incomplete; search URL patterns. | Coverage and crawl timing uneven; use columnar index for large studies rather than hammering public index endpoints. |
| [Software Heritage](https://www.softwareheritage.org/) | Open | Recover preserved source snapshots, visits, and historic code when a repository moved, disappeared, or was rewritten. | Archive visit date is not creation date. Excellent for technical archeology and primary-source preservation. |
| [DocumentCloud](https://www.documentcloud.org/) | Mixed | Search, annotate, organize, and publish source document collections with references. | Sensitive uploads need explicit workspace permissions. Consider it when reports depend on PDFs, filings, or FOIA responses. |
| [Data Is Plural archive + feeds](https://github.com/data-is-plural/newsletter-archive) | Open | Discover neglected *datasets*, not just stories, from a searchable Markdown archive and feeds. | An idea source; dataset age, licensing, and coverage must still be checked. |

## Normalize messy information into durable evidence

| Tool | Access | The useful move | Pitfall / PE fit |
| --- | --- | --- | --- |
| [DuckDB](https://duckdb.org/docs/data/parquet) | Open | Query local and HTTPS Parquet/CSV directly with SQL; compare millions of public records without maintaining a database service. | Define vintage and denominator; a convenient query can still answer the wrong question. |
| [sqlite-utils](https://github.com/simonw/sqlite-utils) | Open | Turn JSONL, CSV and scraped records into searchable SQLite tables and full-text indexes using a CLI. | Useful for a small lab; use stable source IDs and idempotent upserts. |
| [Datasette](https://datasette.io/) | Open | Browse, filter, cross-examine and optionally share a local structured evidence set through an interactive view. | Serve privately for client/regulated research. A database view isn't a verified conclusion. |
| [OpenRefine reconciliation](https://openrefine.org/docs/manual/reconciling) | Open | Match inconsistent names and identifiers across independent public datasets, reviewing ambiguous matches. | Human/agent review of near-matches is essential; do not let a fuzzy match create a false corporate edge. |
| [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz) | Open | Candidate generation for alias/typo/entity matching, clustering near-duplicate names and headlines. | Similarity != identity. Use stable identifiers and counterevidence before merging. |
| [FollowTheMoney](https://followthemoney.tech/docs/) | Open | Represent companies, contracts, people, documents, events and their sourced relationships in a consistent graph. | A **library for a real graph need**, not a reason to replace PE's notes with a database. Statement entities preserve per-value provenance. |
| [OCCRP Aleph](https://docs.aleph.occrp.org/about/) | Mixed | Search huge heterogeneous document corpora; pivot names, contracts, documents, and timelines across collections. | Powerful but operationally heavy. Use when an investigation truly spans many documents/datasets. |
| [NetworkX](https://networkx.org/documentation/stable/) | Open | Analyze supplied relationship edges for hubs, bridges, communities and paths. | Graph degree can reflect dataset coverage, not real-world power or influence. |
| [Gephi](https://gephi.org/desktop/) | Open | Visually interrogate networks, spot surprising bridges and isolate suspicious or important clusters. | Layout geometry doesn't prove causation or relationship strength. |
| [Hunchly + DuckDB + Datasette](https://datasette.io/) | Composite | Preserve pages, normalize extracted claims, and expose a reviewable local evidence index. | An optional combination when the investigation needs both captured pages and a searchable evidence index; start with the piece you need. |

## Specialist intelligence platforms — study their capabilities even if you don't buy them

| Platform | Access | The professional job it excels at | What PE could imitate without copying the platform |
| --- | --- | --- | --- |
| [AlphaSense](https://www.alpha-sense.com/solutions/market-intelligence-platform/) | Paid | Cross-search company filings, research, earnings, news and expert transcripts; trace answers to original passages. | Source-anchored company dossiers, standardized thesis revisions, and targeted alerting. Proprietary transcripts aren't permission to redistribute. |
| [S&P Capital IQ Pro](https://www.spglobal.com/market-intelligence/en/solutions/products/sp-capital-iq-pro) | Paid | Fundamentals, estimate revisions, ownership, peers, transactions, sector data and investment workbooks. | Benchmark a thesis against **consensus** and comparables, not just its own narrative. |
| [PitchBook](https://pitchbook.com/help/pitchbooks-research-process) | Paid | Verify private companies, deals, investors, capital raises and competitive ecosystems with human+machine research. | Discovery → scope check → verify → update entity profile is a very good reusable research pattern. |
| [Quartr API](https://quartr.com/products/quartr-api) | Paid | Live and historical earnings audio/transcripts, reports, slides, structured company/event IDs. | Keep a dated event+company+claim trail; compare promised milestones against later commentary. |
| [BamSEC Compare Filings](https://help.bamsec.com/hc/en-us/articles/45647034214163-Compare-Filings) | Paid | Redline consecutive SEC filings, including text and tables. | Watch *disclosure changes*, not simply filing headlines. |
| [Panjiva](https://www.spglobal.com/market-intelligence/en/solutions/products/panjiva-supply-chain-intelligence) | Paid | Shipment-level trading relationships, products, ports and supply-chain connections. | Start from a supply-chain question; identify relevant entities and independently corroborate flows. |
| [Wappalyzer API](https://www.wappalyzer.com/docs/api/v2/lookup/) | Paid | Current or historical website tech-stack footprint, including cached vs live lookup. | Use deployment changes as a **lead** about adoption or migration, not a verified contractual relationship. |
| [Ahrefs API v3](https://docs.ahrefs.com/en/api/docs/introduction) | Paid | Search demand, SERP competitors, backlinks, content and brand visibility. | Compare topic opportunity with site capability and actual audience intent. |
| [Semrush API](https://developer.semrush.com/api/v3/seo/overview/) | Paid | Keyword, domain, backlink and competitive search data. | Investigate topic clusters, competitor gaps, and a publication's ability to compete. |
| [SparkToro](https://sparktoro.com/support/faq/what-sparktoro-covers) | Paid / limited access | Discover media, podcasts, creators and websites an audience tends to follow. | Source discovery from **audience behavior**, rather than assuming popular topics are relevant. |
| [OpenSanctions](https://www.opensanctions.org/docs/) | Mixed; commercial license | Structured entity matching, sanctions and public-interest relationship data with bulk exports and deltas. | Carefully scoped counterparties/ownership research; a database match is a candidate, not an accusation. |
| [EPO Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | Key / paid for volume | Patent families, bibliographic records, legal events, and full text using documented API routes. | Follow technology pathways through applications, ownership and legal status instead of treating counts as innovation. |
| [Lens Patent + Scholarly API](https://docs.api.lens.org/) | Key / licensed | Link patents to scholarly works and search by assignee, technology and research citation. | Build a patent-to-publication discovery trail for scientific scouting. |
| [Open Targets Platform](https://platform.opentargets.org/) | Open | Target–disease evidence, genetics, drugs and therapeutic relationships; API and downloads. | Evidence-ranked biomedical hypothesis development, while preserving different evidence classes. |
| [CourtListener / RECAP](https://free.law/projects/courtlistener/) | Mixed / open access | Court opinions, PACER-derived dockets and alerting; APIs and bulk research routes. | Follow docket **changes and subsequent treatment**, not just keyword matches. |

## A small pragmatic stack (not a system design)

If the desk is resource-limited: **official feeds/APIs → time-stamped raw snapshots → sqlite-utils/DuckDB → optional Trafilatura → PE evidence notes**. Add changedetection for sites without feeds; add Hunchly for high-stakes web evidence; add OpenRefine for messy entities; add graph software only when an actual relationship problem emerges. This is about collection and analysis, not subagent scheduling.

For licensed intelligence platforms, **study the product's workflow even if no subscription is available**. Many of their best lessons are epistemic: normalizing identifiers, preserving revisions, linking claims to the filing, comparing consensus, and retaining adverse evidence.
