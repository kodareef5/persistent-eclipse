# Examples of excellence: how serious investigators turn raw material into trusted work

These are **documented real examples**, not imagined agent success stories. Each is included for a *transferable research behavior*. None is a claim that a small AI lab can duplicate the original team's resources or human judgment. The PE applications below are our interpretations, not claims of endorsement or independent replication. Read the original work when applying a method. See [the fieldbook](fieldbook.md) for how far these were checked.

## 1. Bellingcat — locating an image when the image appears to contain almost nothing

**Original:** [Identifying the Location of the MH17-Linked Missile Launcher From One Photograph](https://www.bellingcat.com/resources/case-studies/2014/07/18/identifying-the-location-of-the-mh17-linked-missile-launcher-from-one-photograph/) (July 2014).

**What makes it excellent.** Investigators did not stop at the caption or social post claiming a location. They combined observable visual details, mapping references and independently verifiable geographic constraints to identify a location. The article makes the *steps of inference inspectable*. Visible store lettering led
to a chain name; a court document supplied an address; road videos and distinctive
buildings let the researcher check the map match. That is a useful cross-domain
pivot: a legal record can resolve a visual question. An opponent can challenge a building, road layout or matching landmark rather than having to trust the investigator.

**Try in PE.** For a difficult inference, try an evidence trail or a small diagram: artifact → distinctive feature → alternative candidates → tested matches → remaining uncertainty. The generalizable method is not “use satellite images”; it's “convert tiny features into externally checkable constraints.”

**Limits.** A plausible-looking map match can be coincidental. Modern geospatial investigations need timestamps, source authenticity, map-vintage checking and independently confirmed locations. Don't use public-source methods for invasive private-person tracking.

**What good looks like:** a reader can independently retrace the location claim, see which observations are direct and which are inferred, and understand the strongest remaining alternative.

## 2. ICIJ — *The Implant Files*: changing the question from anecdotes to a global system

**Original:** [About the Implant Files](https://www.icij.org/investigations/implant-files/about-the-implant-files-investigation/) and [how machine learning helped search the records](https://www.icij.org/investigations/implant-files/algorithms-analysis-and-adverse-events-how-icij-used-machine-learning-to-help-find-medical-device-issues/) (2018).

**What makes it excellent.** More than 250 journalists in 36 countries investigated medical-device testing, approval and monitoring; the collaboration analyzed over 8 million device-related records. The important intelligence product was not one bad implant story: it was a **mapped regulatory and reporting system**, tested with local cases and public data, allowing comparisons that individual national investigations would have missed.

**Try in PE.** An initial signal can justify a *new specialty* without ending the desk's broad awareness. Build an evidence taxonomy (device → regulator → adverse-event report → recall → affected population → historical policy) and let specialists develop depth. Large unstructured collections can be searched algorithmically, but the narrative still depends on source verification and context.

**Limits.** Reports to medical-device regulators don't by themselves measure event incidence or establish causality. Preserving the denominator warning is part of the investigation, not a caveat appended at the end.

**What good looks like:** the report explains the regulatory mechanism, geographic differences, specific evidence and what the numbers **cannot** prove.

## 3. OCCRP — *Dubai Unlocked*: reconciling a leak against external records

**Original:** [Dubai Unlocked project](https://www.occrp.org/en/project/dubai-unlocked) and [explanatory methodology/FAQ](https://www.occrp.org/en/project/dubai-unlocked/what-is-dubai-unlocked-everything-you-need-to-know) (2024).

**What makes it excellent.** A cross-border investigation started from property ownership information, then investigated public-interest cases through independently sourced identities, records and corroboration with a broad reporting consortium. The project explains its data provenance and limits instead of treating a leaked name as established guilt.

**Try in PE.** Separate **candidate matching**, **relationship verification**, **public-interest significance** and **publication decision**. Each is a distinct research question. Make every significant entity edge traceable to its source. For cross-border business research, normalize IDs/jurisdictions before joining data.

**Limits.** Study the published corroboration method; this is not an instruction to obtain the underlying leaked records. Shared names, assets, business links or ownership alone do not imply misconduct. Preserve the lab’s access and publication boundaries.

**What good looks like:** a well-qualified, traceable finding that survives a skeptical check of the entity identity and data collection limitations.

## 4. ICIJ — *Panama Papers*: converting an impossible corpus into navigable questions

**Original:** [Panama Papers — about the investigation](https://www.icij.org/investigations/panama-papers/about-the-investigation/) and [Offshore Leaks Database](https://offshoreleaks.icij.org/).

**What makes it excellent.** The work was a distributed document/entity research operation: indexing large records, correlating names and organizations, giving reporters a way to locate relevant source documents, and then doing independent investigations. The public entity graph is useful, but the published project makes clear why presence in an offshore dataset isn't proof of crime.

**Try in PE.** For unusually large collections, build *search and relationship infrastructure around questions*, not a generic warehouse. Keep the original document linked to each extracted fact, with the extractor's uncertainty.

**Limits.** Study the published methodology. This example does not authorize acquiring leaked datasets or changing the lab’s access boundaries. Source restrictions, confidentiality, jurisdiction and mistaken identity remain material.

**What good looks like:** a narrow public claim with traceable supporting material, despite an enormous underlying corpus.

## 5. ProPublica — *Dollars for Docs*: usable public data with explicit scope

**Original:** [About the Dollars for Docs Data](https://www.propublica.org/article/about-the-dollars-for-docs-data).

**What makes it excellent.** ProPublica normalized official payment disclosure data into a queryable resource, explained which payments and professions were included or excluded, documented the covered period and displayed individual payments alongside aggregate summaries. Readers can examine the records behind an observation.

**Try in PE.** A recurring professional desk should distinguish a **research-backed data product** from a prose report. High-quality outputs include a data dictionary, inclusion rules, as-of date, original sources and easy paths to reproduce comparisons. When money is involved, normalizing identifiers is often harder than visualizing totals.

**Limits.** Payments are not proof of improper behavior or causation. Old data requires date flags; a useful database can be misused when its limits are hidden.

**What good looks like:** a trustworthy, reusable tool accompanied by methodology and clear exclusions, not merely a provocative headline.

## 6. Techmeme — professional editorial filtering in a world of infinite submissions

**Original:** [About Techmeme](https://www.techmeme.com/about).

**What makes it excellent.** It combines algorithmic discovery with editorial judgment to produce a concise linked view of technology news and the range of coverage around important stories. The output is *a prioritized picture of attention with context*—not a raw feed and not endless auto-written articles.

**Try in PE.** Keep the main briefing short. For each story, identify the primary event, original reporters, corroboration or countercoverage, why it matters to this specific operator, and whether urgency is real. Separate attention ranking from opportunity ranking. An obscure story may be more useful than the lead story.

**Limits.** Editorial selection is not a ground truth for importance. A Signals desk should also study stories Techmeme and others miss, and avoid reproducing a publication's whole content.

**What good looks like:** a reader can scan in minutes, follow source trails, and immediately decide where deeper attention belongs.

## 7. PitchBook — documented research operations that constantly improve existing profiles

**Original:** [PitchBook's research process](https://pitchbook.com/help/pitchbooks-research-process).

**What makes it excellent.** PitchBook documents the long loop: detect an entity/event; determine whether it's in scope; research and corroborate; publish or update its profile; continue checking and correcting over time. The process combines crawling, human research, quality assurance and user feedback. Its operational unit is often an **updated knowledge object**, not a new report.

**Try in PE.** Keep a persistent company/actor dossier with claim provenance and revision history. Tell the manager to prioritize corrections and changed claims over re-generating complete biographies. A user correction should be research input, not unquestioned fact. Data/QA workflows are often the best place for small specialist agents.

**Limits.** PitchBook's licensed data and primary contact practices aren't automatically available to PE; read the *method* without assuming entitlement to its content.

**What good looks like:** a record becomes *more accurate and useful* every month, and the desk can say specifically what changed and why.

## 8. ForecastBench — scoring long-horizon judgment without hindsight leakage

**Original:** [ForecastBench](https://forecastingresearch.org/research/forecastbench) and [benchmark paper](https://forecastingresearch.org/research/forecastbench-a-dynamic-benchmark-of-ai-forecasting-capabilities).

**What makes it excellent.** It uses repeatedly refreshed questions about outcomes not yet known at forecast time, evaluates later resolution, and compares systems against human benchmarks. This avoids the central trap of backtesting a model on questions whose answers were already latent in its training or retrieval context.

**Try in PE.** Record question as-of, resolution criteria, evidence cutoff, confidence and later outcome. Compare forecasts with straightforward baselines and include misses. It is one way to test a specific judgment against future evidence. Use it when that test informs the mission; it is not a required lab benchmark.

**Limits.** Forecasting is one axis of capability. An important idea that never becomes popular may still be a great editorial or strategic lead. Do not collapse all Signals quality into a Brier score.

**What good looks like:** immutable pre-event predictions, transparent resolution, meaningful baseline and a calibration/accuracy history.

## 9. Global Fishing Watch — massive inference at scale *with model caveats intact*

**Original:** [Apparent Fishing Activity: data, code and limitations](https://globalfishingwatch.org/dataset-and-code-fishing-activity/).

**What makes it excellent.** Vessel broadcast data and expert-labeled traces support modeled **apparent** fishing activity, with explanations about collection mechanisms, coverage bias, classifier limitations, and version changes. The public-facing data product is powerful precisely because readers can see what it is measuring and why it might be wrong.

**Try in PE.** If the lab infers real-world events from telemetry, label them as **observed signal / model estimate / independently confirmed event**. Preserve model versions and source coverage when explaining changes. A sudden trend might be an increased receiver population, not more underlying activity.

**Limits.** Noncommercial licensing applies to the published dataset/services. Movement observations alone don't prove legal violations or identities; don't treat non-transmission as misconduct.

**What good looks like:** maps and datasets that are useful for investigations yet explicitly prevent overclaiming what the sensors know.

## 10. Data Is Plural — source discovery as an editorial discipline

**Original:** [Data Is Plural archive](https://www.data-is-plural.com/archive/) and [public newsletter archive](https://github.com/data-is-plural/newsletter-archive).

**What makes it excellent.** The editorial product is not a story about one thing. It's a steady stream of surprising, specific datasets from wildly different domains, with enough context to make a researcher recognize an unusual new angle. The archive also allows past selections to remain discoverable.

**Try in PE.** A worker can investigate better sources and puzzles alongside the desk’s ongoing questions; a permanent discovery subteam is unnecessary. Keep the catalog selective and explain why the new data affordance is special. This is an excellent model for Signals’ source learning.

**Limits.** Curation is an idea source, not a reliability certificate. Verify a dataset's methodology, coverage, license and endpoints before making consequential claims.

**What good looks like:** a short finding that immediately invites a serious research question you would not have thought to ask.

## 11. Our World in Data — source and transformation honesty

**Original:** [Our World in Data FAQ and source methodology](https://ourworldindata.org/faqs).

**What makes it excellent.** A research visualization becomes more valuable when it exposes original sources, definitions, revisions and how metrics are transformed. The reader can understand whether two apparently comparable numbers actually use the same unit and population.

**Try in PE.** Every important chart or metric in a report should answer: original source? observation period? processing rule? population? revisions? meaningful uncertainty? If one is unknown, the chart should say so, not imply it is definitive.

**Limits.** Clear provenance doesn't make observational correlations causal. Avoid moving from descriptive trend to recommendation without naming assumptions.

**What good looks like:** a chart that an analyst can inspect, reuse with appropriate attribution and challenge intelligently.

## 12. CourtListener / RECAP — a standing legal research service, not a one-off search

**Original:** [CourtListener project](https://free.law/projects/courtlistener/) and [PACER](https://pacer.uscourts.gov/).

**What makes it excellent.** A useful legal intelligence service combines searchable legal records with ongoing docket developments and alerts. Its fundamental unit is **a changing matter and its authoritative record**, not an isolated keyword result. Public aggregation improves discoverability, while official source checks remain essential.

**Try in PE.** A legal desk should keep its matter map current, detect docket/precedent changes, surface adverse developments, and revisit *its own earlier propositions* when authorities change. Tie every risk alert to the affected proposition and a reviewer action.

**Limits.** Third-party docket coverage can be incomplete; calendars and deadlines require counsel checking the applicable official docket and court rules. Don't infer no filing from absence in RECAP.

**What good looks like:** a concise, actionable status delta with source, jurisdiction, affected argument, adverse evidence and explicit verification status.

## 13. SemiAnalysis — a whole industry explained from the physical stack upward

**Original:** [How SemiAnalysis researches](https://semianalysis.com/about/), [Core Research methodology](https://semianalysis.com/core-research/), and an illustrative [2026 Intel Panther Lake teardown](https://newsletter.semianalysis.com/p/intel-panther-lake-teardown).

**What makes it excellent.** A technical claim is not accepted merely because a manufacturer announced it. The research practice combines physical teardown and process analysis, supply-chain capacity and costs, models of downstream economics, and comparison with public company claims. The work can operate at *multiple time scales*: time-sensitive commentary, weekly research, specialist deep dives and maintained datasets.

**Try in PE.** This is probably the **closest professional analogy** to the market-intelligence desk in this project. Follow the product through components, equipment, capacity, costs, companies, buyers, and what would invalidate the forecast. Maintain a small stable industry model while events change around it. Deep specialists should improve the day-to-day briefing, not replace it.

**Limits.** Physical reverse engineering and industry interviews require skills, equipment and access a lightweight agent lab may not possess. Paid models and articles cannot be silently ingested or redistributed. An apparently rigorous model still rests on uncertain industry inputs.

**What good looks like:** original technical evidence and credible assumptions constrain a financial/strategic judgment; the reader can see exactly what new fact changed the model.

## 14. The Information Pro — turning editorial beats into maintained intelligence databases

**Original:** [The Information Pro product description](https://www.theinformation.com/pro).

**What makes it excellent.** Its public product page describes journalism combined with proprietary research databases. We have not evaluated the subscriber tools. The transferable idea is to maintain useful records alongside reports.

**Try in PE.** A media, editorial or financial research desk can develop *living entities and opportunity catalogs* alongside briefings. A reader should be able to open a company/topic and see the current assessment, evidence revision, strongest disagreement, and relevant new stories.

**Limits.** This is a model of a research product, not permission to reuse licensed reporting or their proprietary data. Every automated answer must remain grounded in the underlying licensed or public sources that the operator may use.

**What good looks like:** a brief is an entry point into a maintained research corpus, and corrections propagate to future outputs.

---

## The common standard behind these examples

A great investigation doesn't need to be glamorous. It needs:

1. **A meaningful question:** what changed, why could this matter, whose decision would improve?
2. **An original trail:** primary or near-primary evidence, not a chain of repeating summaries.
3. **A reproducible inference:** inputs, transformations, important alternative explanations and precision limits.
4. **A delivered consequence:** what the analyst should read, investigate, reconsider, or not conclude.
5. **Something useful to keep:** a corrected record, documented miss, better source route, reusable method or next discriminating question.

For PE, the gold standard is a desk that can link a short morning recommendation to a serious research artifact, that artifact to original evidence, and the next morning's correction to the exact new observation that warranted it.
