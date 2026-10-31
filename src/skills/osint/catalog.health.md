# Medical, biotech, reimbursement and science

Source routes from the operator-supplied Round 2 fieldbook. These are documented
leads, not a claim that every API was tested. See [provenance](fieldbook.md) and
[catalog conventions](catalog.md); use the original documentation before collection.

| Source | Investigative opening | Limit |
| --- | --- | --- |
| [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/api) | Follow protocol changes, endpoints, enrollment, completion and posted results. | Registry updates can lag; registration is not evidence of success. |
| [Drugs@FDA](https://www.fda.gov/drugs/drug-approvals-and-databases/about-drugsfda) | Trace approval letters, labels, reviews and approval chronology. | FDA approval isn't insurer reimbursement or clinical adoption. |
| [openFDA](https://open.fda.gov/apis/) | Query public drug, device, enforcement and adverse-event records for hypothesis generation. | Adverse-event counts **cannot estimate incidence or causal risk** due under/overreporting and denominator problems. |
| [EMA medicine data downloads](https://www.ema.europa.eu/en/medicines/download-medicine-data) | Compare European authorizations, refusals, withdrawals, status and pipeline to U.S. events. | Regulatory scope and effective dates differ; not all approvals are directly comparable. |
| [CMS Medicare Coverage Database](https://www.cms.gov/medicare-coverage-database/) | Watch national/local coverage determinations and reimbursement rules that can determine adoption after approval. | Coverage varies by geography and payer; draft decisions aren't effective policies. |
| [Open Targets Platform](https://platform.opentargets.org/) | Connect genetic evidence, targets, diseases, drugs and pathways to generate and challenge biomedical theses. | Target association is not therapy effectiveness; evidence types have different strengths. |
| [PubMed E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) | Retrieve linked studies, related publications, corrections and longitudinal clinical literature. | Publication/citation counts don't establish scientific consensus. |
| [OpenAlex API](https://docs.openalex.org/) | Map research topics, institutions, funders, citation networks and related works. | Coverage, indexing lag, author ambiguity; [created/updated sync filters require a paid plan](https://help.openalex.org/api/filtering/#sync-filters-paid-plans); publication-date filters are different. |
| [Lens API](https://docs.api.lens.org/) | Connect scholarly articles to patent families, assignees and technology classifications. | Access is licensed; patent citations and ownership changes need legal-status review. |
| [EPO Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | Track patent families, assignee trajectories, legal events and filings for competitive scouting. | Applications may be unpublished for long periods; patents ≠ commercial product. |
| [FDA device databases](https://www.fda.gov/medical-devices/device-advice-comprehensive-regulatory-assistance/medical-device-databases) | Compare clearances, recalls and manufacturer submissions. | A recall is a concrete signal but cannot infer population-level safety without denominators. |

### Investigation seeds

A new therapy can look excellent on trial headlines yet face an unresolved endpoint, manufacturing constraints, payer coverage, uptake friction or competing mechanism. Build the chain **discovery → trial → approval → coverage → adoption** and challenge each jump independently.
