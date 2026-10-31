# Specialist desks: life sciences, industrial systems, and open technology

These sketches extend the four [existing desks](desks.md). They show good shapes
for research depth when the operator leaves direction open. Take the sources and
unusual questions that help; they are not extra missions, staffing defaults, or
report contracts. The operator’s scope, allowed
models and resources, and delivery expectations control the actual service.
Dates, quantities, and cadences below are illustrative. No first or next tool is
required; build only what makes the investigation more effective.

## Life Sciences & Healthcare — therapy, evidence and adoption desk

**The promise.** Understand an emerging treatment category from discovery through trials, regulatory decisions, payer coverage and actual adoption. This is a standing *scientific and commercial intelligence* capability, not personal medical advice.

**Day one.** Map a therapeutic area: mechanism hypotheses, competitors, active trials, endpoints, treatment standards, key published studies and expected regulatory milestones. Establish explicit differences between a scientific signal, clinical benefit, regulatory approval and payment coverage.

**As it matures.** A trial's interim result begins a new specialty. Researchers inspect trial design and endpoint changes, search related mechanisms and failed predecessors, monitor competing pipelines and track whether reimbursement or manufacturing could bottleneck launch. An unrelated payer policy change can become more important than the original headline.

| Dimension | Suggested shape |
| --- | --- |
| Coverage | Active trials and protocols, evidence hierarchy, product labels, safety/regulatory notices, payer policy |
| Fast cadence | New-result and safety alert; weekly pipeline milestone update |
| Slow cadence | Monthly target/mechanism landscape; quarterly comparative effectiveness and adoption review |
| Vocabulary | Mechanism, indication, comparator, endpoint, trial phase, enrollment, label, payer, adoption, evidence class |
| Source palette | [ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api), [FDA](https://open.fda.gov/apis/), [EMA](https://www.ema.europa.eu/en/medicines/download-medicine-data), [CMS](https://www.cms.gov/medicare-coverage-database/), [Open Targets](https://platform.opentargets.org/), [OpenAlex](https://docs.openalex.org/) |
| Immediate deliverables | Evidence-aware pipeline radar, upcoming results, important label/coverage deltas |
| Deep artifacts | Treatment landscape, endpoint comparison, opposing hypotheses, approval-to-adoption map |
| Possible small tool | Registry change snapshots and links to published primary results |
| Other useful tools | Patent-paper-therapy mapping and payer coverage timeline |
| Useful feedback | Accuracy of dated milestones, corrected efficacy interpretations, source lag accounting, important contradictions found |

**Challenge.** Neither adverse-event counts nor preclinical association alone establishes a patient-level effect. Regulatory and professional medical review is necessary for high-stakes interpretations.


## Industrial / Supply-chain Intelligence — map materials to markets

**The promise.** Watch bottlenecks, commodity dependencies, infrastructure, logistics and industrial policy—and connect them to the actual businesses that benefit or suffer.

**Day one.** Choose a sector, critical input, or industrial region. Build a sparse process map (mining → processing → conversion → components → manufacturing → end customers), then annotate which edges are documented. Track major official data releases, industrial policy and environmental/permit milestones.

**As it matures.** A port disruption, tariff proposal, chemical processing constraint or new capacity announcement becomes an opportunity to reopen a preexisting network. Deep work might explore whether a particular processing facility can really substitute for another and whether reported tonnage is usable product—not merely ore. Keep at least one bearish explanation and one substitute technology alive.

| Dimension | Suggested shape |
| --- | --- |
| Coverage | Core commodities, trade flows, key capacities, major projects, policy changes, constraints, substitutes |
| Fast cadence | Material disruptions and policy alerts; weekly headline-versus-data check |
| Slow cadence | Monthly capacity map, quarterly producer/consumer scenario review |
| Vocabulary | Ore, refine, yield, capacity, utilization, bottleneck, substitution, lead time, delivered value |
| Source palette | [USGS](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries), [USITC](https://www.usitc.gov/applications/dataweb/about), [IMF PortWatch](https://portwatch.imf.org/), [Global Trade Alert](https://globaltradealert.org/data-access), [Copernicus](https://dataspace.copernicus.eu/), [Panjiva](https://www.spglobal.com/market-intelligence/en/solutions/products/panjiva-supply-chain-intelligence) if licensed |
| Immediate deliverables | Chokepoint watch, one-page event impact chain, contested causal links |
| Deep artifacts | Physical flow map, entity relation map, capacity scenarios, source vintage table |
| Possible small tool | Official tariff/trade release watch and commodity/port snapshot comparison |
| Other useful tools | Facility imagery checks, robust supply chain graph, actual-vs-announced capacity tracker |
| Useful feedback | Early recognition of actual bottlenecks, explained false alarms, material changes to sector scenarios |

**Challenge.** Correlation of vessel movement, prices and outages is not causation. Coverage gaps and vintage changes can mimic dramatic shifts.


## Open Technology — monitor capabilities before the category has a name

**The promise.** Help a technical analyst, developer tool maker or strategic investor understand rapidly evolving technologies, standards, adoption and neglected user needs.

**Day one.** Track major repositories, protocols, relevant changelogs, focused developer communities, dependency graphs, issues and emerging research. Establish a low-noise daily reading digest that surfaces **unexpected architectural changes** and their practical consequences.

**As it matures.** A group of unrelated products converges on similar features. The desk investigates shared dependencies, academic precedents, older failed designs, project funding, maintainers' stated objectives and actual adoption. A promising topic may lead to an independent code experiment, competitive roadmap, or long technical paper while the daily watch continues.

| Dimension | Suggested shape |
| --- | --- |
| Coverage | Releases, APIs, standards, dependency ecosystems, research, maintainer discussions, user constraints |
| Fast cadence | Daily capability radar; alerts for meaningful upstream changes |
| Slow cadence | Weekly architecture review; monthly ecosystem/standards map; ongoing deep experiments |
| Vocabulary | Capability, constraint, interface, dependency, standard, adoption, migration, reproducibility, research precedent |
| Source palette | [GH Archive](https://www.gharchive.org/), [Software Heritage](https://www.softwareheritage.org/), [deps.dev](https://docs.deps.dev/), [IETF](https://datatracker.ietf.org/), [OpenAlex](https://docs.openalex.org/), specialized public trackers |
| Immediate deliverables | Technical signal brief identifying what changed and why it matters |
| Deep artifacts | Versioned architecture comparison, market ecosystem map, verified experiment, prior-art record |
| Possible small tool | Release/issue watcher with source SHA and new-vs-discussed distinction |
| Other useful tools | Dependency influence map, API/diff tracker, historical source archive, standards milestone watch |
| Useful feedback | Precision of breaking-change alerts, useful experiments, discovery of neglected design constraints |

**Challenge.** GitHub stars, social hype and release counts are weak proxies for sustainable value. A prototype is not production adoption.
