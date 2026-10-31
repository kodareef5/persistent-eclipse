# Investigative plays: non-obvious moves for an ambitious Signals lab

These are inspiration patterns, **not required workflows**. A researcher should be able to read one, pick a few sources, try a hypothesis, and either uncover a new line of investigation or dismiss it quickly. The best play usually follows an *inconsistency across independently produced records*; the weakest merely correlates two noisy metrics. Preserve observation date and dataset vintage when timing is important.

## A. Hunt in the space before conventional news

### 1. First-contact intelligence: follow activity before anyone writes the story

**Signal.** A sudden cluster of issues, test failures, standards discussions, specialized conference abstracts, or new procurement notices precedes mainstream awareness.

**Move.** Start at the original activity stream—not the popular feed. For technology use [GH Archive](https://www.gharchive.org/), release feeds, IETF drafts and maintainer discussions; for industry use [Federal Register public inspection](https://www.archives.gov/federal-register/public-inspection), [SAM.gov](https://sam.gov/), [Data Is Plural](https://www.data-is-plural.com/archive/) and specialty trade papers. Observe the denominator (all new items, including ignored ones), not just success cases. Take small timestamped snapshots, annotate which item characteristics seemed predictive, and later review misses.

For a regulatory lead, follow public inspection → published version → effective
date → implementation → exposed organizations. Compare the versions and look for
where the expected consequence stalls. The disclosure-to-impact gap can be the
research question, not merely a chance to repeat a headline earlier.

**Critical challenge.** Are you simply seeing more activity because data availability or scraping improved? Is the item novel, or a re-post?

**Good output.** A dated early lead with original source, why the desk cares, strongest ordinary explanation, concrete trigger for escalation, and later outcome. Not “10 trending things.”

### 2. Negative-space search: what *didn't* happen?

**Signal.** A company repeatedly promises a timeline; promised approvals, standards votes, hiring cohorts, shipment milestones or disclosures fail to arrive.

**Move.** Extract **explicit** forward-looking commitments from filings, earnings remarks, product roadmaps or trial registry dates. Keep the useful expectations in the existing research record; no separate ledger is required. Compare actual subsequent primary records via [SEC](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), [ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api), [EPO](https://www.epo.org/en/searching-for-patents/data/web-services/ops), or standards trackers. Treat missing data as *unknown* unless the underlying reporting duty ensures the event would be recorded.

**Critical challenge.** Was the original milestone nonbinding? Could the event be private, delayed in publication, or under a different entity name?

**Good output.** “Expected X by date Y based on source Z; as of A, examined B/C and found no public confirmation; here are three interpretations and next checks.” Not “they failed.”

### 3. Change archaeology: differences in the story the organization tells

**Signal.** A newly added risk factor, deleted capability, revised pricing condition, or changed job description.

**Move.** Redline official versions with [BamSEC Compare Filings](https://help.bamsec.com/hc/en-us/articles/45647034214163-Compare-Filings), [changedetection.io](https://changedetection.io/), [Wayback](https://web.archive.org/), or [Common Crawl](https://index.commoncrawl.org/). Separate textual changes from economic changes. For high-stakes findings, preserve the source HTML/PDF and capture trail with [Hunchly](https://hunch.ly/) or a local evidence snapshot.

**Critical challenge.** Boilerplate updates, legal review, localization and A/B tests produce many false signals. Compare peers and filing-template changes.

**Good output.** Before/after quote with precise locations, possible interpretations, corroboration needed, and why this particular diff alters a standing thesis.

### 4. Specialist communities as sensors, not authorities

**Signal.** Tiny expert groups repeatedly surface a phenomenon before it enters journals, regulatory records, or corporate disclosures.

**Move.** Map a small ecosystem of *public topic-specific* issue trackers, public conference talks, niche newsletters and professional forums. Record the **kind of unique evidence** each source produces; identify repeat syndication. Compare insights with official releases, filings or datasets; never equate “a respected poster says” with verification. Feed productive sources back to the shared catalog.

**Critical challenge.** Selection bias, coordinated promotion, anecdotes without base rates.

**Good output.** “This community reliably provides original technical reproductions but its market forecasts are poor.” Source usefulness may be dimension-specific.

## B. Reconstruct ecosystems and chains of dependency

### 5. The second-order beneficiary (and loser) map

**Signal.** A change in one product, policy, technology or commodity affects more parties than the headline company.

**Move.** Create a limited chain: upstream inputs → producers → processors → logistics → buyers → substitutes → regulators. Try an example like rare earths: use [USGS mineral data](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries), [USITC](https://www.usitc.gov/applications/dataweb/about), [PortWatch](https://portwatch.imf.org/), company filings and [Panjiva](https://www.spglobal.com/market-intelligence/en/solutions/products/panjiva-supply-chain-intelligence) if licensed. Ask who gains from a bottleneck, who bears its cost, and where prices/capacity constrain the narrative.

**Critical challenge.** A supplier relationship may be tiny or diversified; disclosed exposure != cash-flow materiality.

**Good output.** A *sourced* dependency graph with unknown links marked, 2–3 plausible beneficiaries, and the observation that would disprove each.

### 6. Corporate relationship triangulation

**Signal.** Similar names, overlapping addresses, shared officers, award notices or vendor changes suggest a corporate relationship.

**Move.** Generate candidate joins with [OpenRefine](https://openrefine.org/docs/manual/reconciling) or [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz). Verify with **registered IDs**, primary corporate records, public contract numbers, source documents, or [OpenSanctions](https://www.opensanctions.org/docs/) where appropriate. Model confirmed edges with [FollowTheMoney](https://followthemoney.tech/docs/) or a small PE table. Use [OCCRP Aleph](https://docs.aleph.occrp.org/about/) when a legitimate public-interest investigation actually needs multi-corpus discovery.

**Critical challenge.** Common names, stale beneficial-ownership records, subsidiaries and unrelated individuals sharing attributes. Do not infer wrongdoing from a relationship or database inclusion.

**Good output.** A relationship the next researcher can check: source, identity, relevant dates, and what remains uncertain or disputed. A small table is enough when it serves the question.

### 7. Procurement as a leading rather than trailing indicator

**Signal.** Contract solicitations for an unfamiliar component, infrastructure build or policy project appear months before revenue reports.

**Move.** Link [SAM.gov](https://sam.gov/) opportunities to later [USASpending](https://api.usaspending.gov/) obligations, actual corporate reporting, supplier announcements and delivery milestones. Follow *unsuccessful* tenders as well as wins. The relevant question is whether announced public spending becomes real procurement that changes company prospects.

**Critical challenge.** Unfunded proposals, multiple awardees, ceiling amounts, cancelled solicitations, long recognition cycles.

**Good output.** Procurement funnel with candidate contracts, disposition, expected beneficiaries, historical success rate and changes to thesis.

### 8. A patent is a map of intentions, not a product announcement

**Signal.** An assignee shifts from one technical problem to an adjacent one or new entrants converge on a capability.

**Move.** Track patent families, applicants, priority dates, assignee normalization and citations with [EPO OPS](https://www.epo.org/en/searching-for-patents/data/web-services/ops) and [Lens](https://docs.api.lens.org/). Connect to papers via [OpenAlex](https://docs.openalex.org/) and hiring/product evidence. Ask where a technology is being *investigated*, which companies have capabilities, and what is conspicuously absent.

**Critical challenge.** Filing publication delay, defensive patenting, office backlog, post-filing ownership changes, weak patent-count proxies.

**Good output.** A patent-to-paper-to-product map with time lag and alternative explanations; useful without claiming the assignee will commercialize.

### 9. The source-network as a research asset

**Signal.** A particularly good lead repeatedly originates from a less famous source or an unexpected combination of sources.

**Move.** Trace where the claim first appeared and distinguish original evidence from copies. Credit *origination*, *verification*, *context*, and *contradiction* separately. Use [Media Cloud](https://www.mediacloud.org/media-cloud-search) for broad coverage comparisons and a local citation trail to detect syndication. Over time, notice which sources improve the investigation, including those that supply contrary evidence or a useful question slowly. Raw article volume is a poor guide.

**Critical challenge.** A source might be early but unreliable; early discovery is only one dimension.

**Good output.** A short source-method proposal: use case, unique signal, known distortions, example win, example miss, suggested follow-up interval.

## C. Challenge narratives against mechanisms and measurable implications

### 10. Consensus decomposition: what must be true for the market story to work?

**Signal.** Everyone repeats a company/sector thesis, while the supporting assumptions are rarely inspected.

**Move.** Reconstruct the thesis from [filings](https://www.sec.gov/search-filings/edgar-application-programming-interfaces), transcripts ([Quartr](https://quartr.com/products/quartr-api) if licensed), industry balance sheets, consumer evidence and alternative analysts. Write down a small causal chain with dependencies: volume → pricing → margin → cash generation → valuation. Ask which input is contested and what source might settle it.

**Critical challenge.** A correct business forecast does not automatically imply mispriced securities. Analyst consensus estimates may be unavailable or licensed.

**Good output.** Current belief, most vulnerable assumption, evidence that would swing the assessment, and conditional thesis variants.

### 11. Rate versus volume: the denominator attack

**Signal.** “Complaints doubled,” “incidents exploded,” or “usage tripled.”

**Move.** Identify the denominator and measurement process: devices sold, hospital procedures, active software installations, press sample, shipments or regulatory submissions. Use [openFDA](https://open.fda.gov/apis/), [USITC](https://www.usitc.gov/applications/dataweb/about) or other primary sources only if they supply appropriate population data. Draw the alternative data-generating mechanisms.

**Critical challenge.** Reporting systems can change; exposure is often unobserved. Even an adjusted rate may suffer selection bias.

**Good output.** Three plausible interpretations plus whether a reliable rate can actually be estimated. Explicit “cannot infer incidence” is often the right result.

### 12. Reverse forecasting: start from a surprising future and trace the preconditions

**Signal.** An emerging field offers many scenarios but no disciplined way to choose where to research next.

**Move.** Define a hypothetical outcome (e.g., a new industrial processing technique reaches economic scale in three years). Backcast through necessary conditions: energy, equipment, financing, permits, substitutes, early customers. Use [USGS](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries), [EPO](https://www.epo.org/en/searching-for-patents/data/web-services/ops), public permitting and filings. Look for observable *signposts* that could appear earlier than the end state.

**Critical challenge.** Reverse planning can turn an imaginative scenario into a falsely inevitable one. Look for another route and a blocker that could defeat the scenario.

**Good output.** Multiple pathways with earliest discriminating indicators and explicit review triggers.

### 13. Competing explanations with asymmetric evidence

**Signal.** Three agents agree because they were fed the same press article or because the first explanation anchors the group.

**Move.** Give researchers *different evidence categories*, not merely different opinions: primary data, historical analogs, opposing literature, implementation artifacts. For an independent check, ask for a first assessment before sharing the preferred answer. Use the [CIA tradecraft primer](https://www.cia.gov/resources/csi/static/Tradecraft-Primer-apr09.pdf) as inspiration for assumptions checks and competing hypotheses; the [RAND/UCLA approach](https://www.rand.org/pubs/monograph_reports/MR1269.html) as inspiration for explicit disagreement. Preserve rival explanations even when one temporarily leads.

**Critical challenge.** Artificial model diversity does not ensure independent information. Majority vote is not an oracle.

**Good output.** A hinge: the one disputed fact/assumption that would actually change priority, plus cheapest credible way to learn it.

### 14. Forecast what resolves, not what sounds quantifiable

**Signal.** A desk wants to become better at deciding which early developments matter.

**Move.** Define small, *resolution-safe* claims: “the agency publishes a final order by date X”; “this public submission reaches front page under documented observation method within 24 hours.” Use dated probabilities, a baseline, outcomes and honest question selection. [ForecastBench](https://forecastingresearch.org/research/forecastbench) offers a professional example of future-released questions and repeatable evaluation.

**Critical challenge.** Hindsight leakage, cherry-picked resolved questions, threshold gaming, ambiguous resolution, correlations between predictions.

**Good output.** Forecast score against baseline **plus** qualitative review of early, unscored but valuable discoveries. No single score captures all research value.

## D. Domain-specific crossover plays

### 15. Regulatory divergence: approval isn't adoption

**Signal.** A medical or technology headline is celebrated as though it guarantees industry uptake.

**Move.** Connect trial status ([ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api)) to U.S. authorization ([Drugs@FDA](https://www.fda.gov/drugs/drug-approvals-and-databases/about-drugsfda)), European status ([EMA](https://www.ema.europa.eu/en/medicines/download-medicine-data)), reimbursement ([CMS](https://www.cms.gov/medicare-coverage-database/)), and publicly evidenced prescribing/manufacturing adoption. The *gaps between milestones* often create the more important research questions.

**Critical challenge.** Different indications, payers, patient populations and administrative calendars. A rejection by one payer may not generalize.

**Good output.** Milestone map and conditional adoption forecast, with the blocking step named and evidence grade preserved.

### 16. Legal precedent watch: monitor your own citations

**Signal.** The desk relies heavily on a small set of precedent and procedural assumptions over months.

**Move.** Maintain a list of relied-upon authorities with official citation, jurisdiction and issue proposition. Recheck subsequent treatment with [CourtListener](https://free.law/projects/courtlistener/) and official dockets; follow policy changes via [Federal Register](https://www.federalregister.gov/developers/documentation/api/v1). Flag contradictory authority and applicability changes. Use attorney review for procedural deadlines and formal advice.

**Critical challenge.** Search results can miss sealed dockets, jurisdictional distinctions and controlling subsequent events; a new case needn't overturn an old one.

**Good output.** An *adverse-authority delta* explaining precisely which proposition is weakened and what action the attorney needs to review.

### 17. Editorial whitespace: useful questions without existing answers

**Signal.** A topic attracts conversation but existing search results and competitor coverage repeat the same shallow explanation.

**Move.** Triangulate underlying public questions, [Google Search Console](https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics) for an authorized property, [Ahrefs](https://docs.ahrefs.com/en/api/docs/introduction) / [Semrush](https://developer.semrush.com/api/v3/seo/overview/) if available, specialist issue trackers and competing original sources. Use [SparkToro](https://sparktoro.com/support/faq/what-sparktoro-covers) to locate where the audience gathers. Identify the original evidence or demonstration only *this desk* could offer.

**Critical challenge.** Search volume estimates and social chatter can exaggerate demand; editorial merit != guaranteed traffic.

**Good output.** Reader problem, novelty, specific original reporting move, credible distribution path, expected shelf-life, and an explicit reason not to publish.

### 18. Geospatial discrepancy: the observable world versus the official claim

**Signal.** An official timeline for a port, facility, fire, or infrastructure project conflicts with remote observations.

**Move.** Compare dated imagery from [Copernicus](https://dataspace.copernicus.eu/), [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), local public notices, permit records and public shipping estimates. Cross-check time zones, geo-alignment and imagery quality; use independently sourced location references. Study [Bellingcat's single-image geolocation case](https://www.bellingcat.com/resources/case-studies/2014/07/18/identifying-the-location-of-the-mh17-linked-missile-launcher-from-one-photograph/) as a model for *showing the visual steps*, not just asserting a coordinate.

**Critical challenge.** Clouds, seasonal construction, imagery resolution, sensors and reporting lags. Avoid sensitive-person tracking or private-site targeting.

**Good output.** Before/after evidence board, clear visual landmarks, uncertain observations marked, and modest conclusions supported by the sensing modality.

### 19. Citation laundering: find the original source hiding behind a hundred summaries

**Signal.** Multiple outlets report a startling statistic, all sourced to each other.

**Move.** Trace the first visible publication, find its underlying dataset/methodology, identify which transformations changed the interpretation, and calculate whether the headline survives the original denominator. Use [Our World in Data](https://ourworldindata.org/faqs) as a style reference for explaining origins and revisions; use [Data Is Plural](https://www.data-is-plural.com/archive/) to locate alternative original datasets.

**Critical challenge.** The original may be genuinely inaccessible; quote chains may be independent but numerically similar. Don't call something fabricated without checking.

**Good output.** Source lineage with an explicit “original not obtained” state; corrected statistic only where reproducible.

### 20. Structured surprise review: learn from what the desk missed

**Signal.** After weeks of work, the radar has plausible leads but no evidence that its selection improves.

**Move.** Retain small random or stratified samples of *dismissed* events, matched by topic/source/time. At fixed horizons compare selected vs nonselected outcomes, ask which source led, which heuristics failed, and whether it mattered to the operator. Use appropriate denominators; evaluation artifacts need not become a new PE management schema.

**Critical challenge.** Hindsight, changing definitions of success, promotion effort causing the outcome, and source selection bias.

**Good output.** What surprised the desk, what the miss teaches, and a source or method change worth trying. Keep the counterexamples, not just the wins.

### 21. Positive deviance: investigate what goes surprisingly *right*

**Signal.** Two hospitals, factories, local agencies or software teams have roughly comparable budgets and circumstances yet achieve very different outcomes.

**Move.** Use matched comparisons to find unusual high performers before looking for failures. The [GIJN article on positive-deviant investigations](https://gijn.org/?p=3125108) discusses this approach as a way to expose otherwise invisible systemic factors. Compare inputs, constraints, data definitions and historical trajectories; look for a plausible practice or structural factor worth further verification. This can uncover SEO distribution strategies, risk controls, scientific methods and procurement efficiencies that ordinary exception hunting misses.

**Critical challenge.** Outcome measurement bias, regression to the mean, unobserved case mix, cherry-picked exemplars. Ask whether the apparently exceptional result survives a stronger matched baseline.

**Good output.** A specific *advantage hypothesis* and a cheap independent check, not a hero story that substitutes admiration for causal evidence.

---

## A useful test of a new play

When a play teaches something transferable, keep the source route, a useful example, its limits, and any failed or ambiguous attempt you have. A promising untested idea may travel too; label it honestly. Propose it as pe-osint's source notes describe. No fixed number of trials or promotion checklist is required.
