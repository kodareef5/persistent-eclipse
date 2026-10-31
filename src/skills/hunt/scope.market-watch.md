# Scope: Market watch

Serve an analyst with broad market awareness, a maintained watchlist, and deep
company/sector research. Find developments the market narrative has not absorbed.
Draw on it when drafting `.research/SCOPE.md`; keep what fits the operator's request
and fill in what they actually asked for.

## Field

*(edit: markets/sectors to cover broadly; initial watchlist, positions/exposures,
and specialties; known exclusions and coverage gaps)*

## For

*(edit: research beneficiary, investment mandate, time horizon, liquidity needs,
loss tolerance, and relevant constraints)*. The lab researches and recommends;
execution remains with the operator.

## What counts

- Salience: will the development appear in the company's filings, an earnings call,
  or mainstream financial coverage by a stated date?
- Significance: does it change revenue, costs, capacity, or risk in a way that shows
  up in later filings?
- Opportunity: a thesis that differs from the prevailing view. Each one states what
  the market seems to believe, what the lab thinks differs, what has to happen for
  the lab to be right, what would prove it wrong, and the dated signposts in between.

Getting a company's future right isn't the same as finding a mispricing. The market
may already expect it. Say which one a thesis claims.

## Sources

| Slug | What | Route |
| --- | --- | --- |
| `edgar` | Filings for the companies in the field | EDGAR submissions, daily; the 8-K atom feed each fast round |
| `edgar-fts` | Other filers naming these companies | EDGAR full-text search, weekly |
| `jobs` | The companies' job boards | Greenhouse, Lever, or Ashby, weekly snapshots in REQ-2 |
| `fred` | Commodity and macro series *(edit: series IDs)* | FRED CSV, daily |
| `fedreg` | Rules and notices affecting the field | Federal Register API, daily |
| `patents` | New patents and applications from the companies | Patent Public Search, monthly, by hand |

Public discovery sources plus explicitly authorized operator positions, licensed
data, and diligence from permitted labs. Check received research rather than
inheriting its conclusions. Keep private mandate information in the approved lab.
Out: leaks, improperly disclosed company information, and unlicensed data.

## Optional forecasts

- `edgar:<ticker>:<event>-<period>`: a specific disclosure by a date, such as a new
  customer named, a segment reported separately, or a guidance range crossing a
  level.
- `fred:<series>:<above|below>-<level>-<date>`: commodity and macro thresholds that
  a thesis depends on.
- No forecasts of share prices. Prices are reported beside theses, not scored.

## Judging

Use pe-judge selectively when comparing consequential theses or alternatives.
Test plausible competing scenarios; there is no required judge panel or count.
Each thesis on the radar carries observable signposts. Use forecasts when
they have a defensible probability and resolution rule; otherwise use watch
conditions with a next-check date and an owner.

## Deliverables

Source-linked thesis briefs and dated confidence updates: what is observed, what
it may imply, what appears expected already, the strongest opposing explanation,
assumptions, and evidence that would reverse the view. Separate confidence in the
business assessment from confidence in mispricing. A useful negative result can
retire an attractive thesis; more pitches or more confident prose are not progress.

## Cadence and budget

A small desk might promise a morning report and one deep-research block. A global
team can cover several sessions. These are starting windows; agree actual handoff
times, timezone, exchange calendar, holidays, and escalation thresholds.

| Window | Service | Protected investigation |
| --- | --- | --- |
| Before the bell | Overnight changes, exposures, today's catalysts | Carry unresolved questions forward |
| Trading session | Material-event alerts | Continue diligence unless the interruption threshold is crossed |
| After close | Expectations versus events, changed confidence, misses | Turn surprises into research questions |
| Evening | Quarterlies, competitor economics, management claims, other labs' diligence | Build or challenge theses and relationship maps |
| Weekend | Sector synthesis and coming week's priorities | Multi-week supply-chain, regulatory, or historical research |

- Report windows, timezone, markets/calendar, and escalation threshold: *(edit)*.
- Workers/models, operating hours, and spend: *(edit)*.
- Protected deep-research and source-improvement time: *(edit)*.
- What gets deferred during urgent news, and when it resumes: *(edit)*.

## Vocabulary and first project

Sector, company, position, exposure, catalyst, consensus, thesis, counterthesis,
constraint, signpost. Begin with disclosure collection for a bounded watchlist;
compare relevant sections over time before expanding coverage. A rare-earth
processing specialty should keep the wider market watch intact. Investigate a new
medication's clinical, manufacturing, reimbursement, and demand links separately.
These are research directions, not asserted investment theses.

Use company sources (pe-osint's `notes/catalog.companies.md`) and [investigation plays](plays.md).
Review analyst usefulness, material misses, overturned assumptions, and leads that
earned deeper work. Evaluate breadth alongside specialty quality.

## Report contract

Starting contract: one source-linked morning desk report before the selected
market opens, covering the previous report cutoff through the current cutoff.
Set the exact handoff time above. Save to
`.research/reports/market/<YYYY-MM-DD>/<report-id>-morning.md`.
Use these headings; identify cutoff, timezone, and coverage gaps beneath the title:

```markdown
# Morning desk report
## Material changes and exposures
## Today's catalysts and signposts
## Research advanced and thesis changes
## Contrary evidence and unresolved questions
## Recommended attention and next checks
```

Intraday alerts keep only affected exposures, evidence, and implications. Closing
briefs compare expectations with outcomes; weekend briefs summarize the week's
changes and next priorities. Set their own short sections and handoff windows in
SCOPE. Save them as `<report-id>-alert.md`, `-close.md`, or `-weekly.md` in the dated
folder, with actual cutoffs and links to underlying work. Do not overwrite earlier
reports or count an unreviewed draft as a fulfilled handoff.

## Sustained investigation artifacts

An evening research block advances an investigation; it does not owe a miniature
morning report. A six-week processing study might produce a supply-chain map,
company theses, source dossiers, financial comparisons, and an independent dissent.
Choose the shape, evidence requirements, reviewer, and next checkpoint for the
question. Keep reviewed artifacts under `.research/reports/investigations/<topic>/`
and link to them from briefings; source extracts and claim notes stay in PE's
ordinary record. Review changed assumptions and competing theories at checkpoints,
without requiring the investigation to finish at a daily report boundary.

A thesis should distinguish confidence in the business from confidence in
mispricing, expose contrary evidence, and state what would reverse it. The work can
remain extensive and conditional while the operator receives a concise daily view.

## Authorization

Research only. No trades, no orders, no contact with companies or their employees.
Anything the operator does with a thesis is the operator's decision.
