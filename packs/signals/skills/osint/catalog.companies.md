# Companies, markets, and government

Filings, prices, contracts, regulation, and hiring. See the shared
[baseline and maintenance conventions](catalog.md). Most entries are US sources;
look for local equivalents before generalizing to a global field.

| Source | Access | Good for | Limits |
| --- | --- | --- | --- |
| SEC EDGAR submissions | `https://data.sec.gov/submissions/CIK<10 digits>.json` | Every filing a company has made, with form type and date | User-Agent with organization/name and contact email; maximum 10 requests/second across machines ([SEC access guidance](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)); baseline observed 2026-10-31 |
| SEC ticker to CIK | `https://www.sec.gov/files/company_tickers.json` | Mapping tickers to the CIK the other routes need | Current tickers only |
| SEC XBRL facts | `https://data.sec.gov/api/xbrl/companyfacts/CIK<10 digits>.json`; `/api/xbrl/frames/us-gaap/<tag>/USD/CY2024Q1.json` | Reported numbers per company; one number across all companies for a period | Companies tag inconsistently; check the tag against the filing |
| SEC latest filings | `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&output=atom` | 8-Ks and other forms as they arrive | Atom feed; a poll misses nothing only if it runs often |
| SEC full-text search | `curl -G https://efts.sec.gov/LATEST/search-index --data-urlencode 'q="<phrase>"' -d forms=10-K -d dateRange=custom -d startdt=... -d enddt=...` | Every filer that names a supplier, customer, technology, or risk | Unencoded quotes in the URL return 400; results without a date range start with old filings |
| FRED | `https://fred.stlouisfed.org/graph/fredgraph.csv?id=<series>` | Economic and commodity series as CSV, no key (e.g. `DCOILWTICO` for WTI oil) | The JSON API needs a free key |
| EIA | `https://api.eia.gov/v2/` | US energy production, inventories, prices | Needs a free key (403 without one) |
| CFTC Commitments of Traders | `https://publicreporting.cftc.gov/resource/6dca-aqww.json` | Weekly futures positioning by trader category | Weekly, published with a lag; Socrata query syntax |
| US Treasury Fiscal Data | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/...` | Debt, receipts, outlays, auction data | Use `curl -g` because of the bracketed parameters |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=<q>` | Proposed and final rules, notices, comment deadlines | Use `curl -g`; full text is linked, not inline |
| Regulations.gov | `https://api.regulations.gov/v4/` | Dockets and public comments | Needs a key (403 without one) |
| USAspending | `https://api.usaspending.gov/api/v2/` | Federal contracts and grants by recipient, agency, and amount | Award ceilings are not money spent; search endpoints take POST |
| GLEIF | `https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=<name>` | Legal entities and parent and child relationships worldwide | Use `curl -g`; relationship data is self-reported |
| USPTO Patent Public Search | `https://ppubs.uspto.gov/pubwebapp/` in a browser | US patents and published applications | Browser search; PatentsView access failed in the baseline environment (UPDATES) |
| Google Patents | `https://patents.google.com/?q=<terms>` in a browser | Patents worldwide, with citations and family links | No API; for reading, not collecting |
| USPTO trademarks | `https://tmsearch.uspto.gov/` in a browser | Trademark applications, which name products before launch | Browser only |
| openFDA | `https://api.fda.gov/device/510k.json`, `/drug/event.json`, `/drug/enforcement.json` | Device clearances, adverse events, recalls | 1000 requests a day per IP without a key |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/studies?query.term=<q>` | Trial registrations and status changes | Sponsors update records late and unevenly |
| Greenhouse job boards | `https://boards-api.greenhouse.io/v1/boards/<board>/jobs` | Open roles for companies using Greenhouse | The board name is in the company's careers URL; one snapshot says little |
| Lever job boards | `https://api.lever.co/v0/postings/<company>?mode=json` | Same, for Lever | As above |
| Ashby job boards | `https://api.ashbyhq.com/posting-api/job-board/<org>` | Same, for Ashby | As above |

## Specialist relationship routes

From the Round 2 fieldbook; see [review provenance](fieldbook.md).

| Source | Investigative opening | What not to conclude |
| --- | --- | --- |
| [OCCRP Aleph](https://aleph.occrp.org/) and [documentation](https://docs.aleph.occrp.org/about/) | Search public-interest document collections and pivot over entities, companies, contracts and original records. | Different corpora have different permissions and completeness; an inferred link isn't a verified transaction. |
| [OpenSanctions](https://www.opensanctions.org/docs/) | Verify named counterparties, candidate aliases, public-interest records and watchlist changes. | Fuzzy entity matches aren't established identity; licensing limits use and redistribution. |
| [SAM.gov](https://sam.gov/) | Follow federal contracting opportunities and registrations; map procurement priorities before awards. | Solicitations are intentions, not awards. Public API access and rate limits vary. |
| [Federal Procurement Data System](https://www.fpds.gov/) | Historical contract actions and relationships; understand changes in a contractor's governmental exposure. | Reporting corrections and entity identifiers require careful reconciliation. |
| [ProPublica Nonprofit Explorer](https://projects.propublica.org/nonprofits/) and [API](https://projects.propublica.org/nonprofits/api) | Monitor Form 990 financials, grants and organizational relationships. | Filings arrive late; revenue/grants aren't current-quarter performance. |
| [OpenCorporates](https://opencorporates.com/) | Cross-jurisdiction corporate registries and identifier discovery. | Registry coverage and reuse permissions vary; names alone are poor join keys. |
| [BamSEC filing comparison](https://help.bamsec.com/hc/en-us/articles/45647034214163-Compare-Filings) | Find subtle added/removed sentences in consecutive 10-K/10-Q disclosures and tables. | A change in wording is a hypothesis trigger, not necessarily changed risk. Commercial access. |
| [FEC bulk data](https://www.fec.gov/data/browse-data/?tab=bulk-data) | Track public election finance patterns and relationships using official records. | Attribution/causality and lawful activity need care; avoid irrelevant private-person dossiers. |

Try official contracting → named supplier → filing disclosure → product plans.
Mark which links are direct evidence and which are interpretations. For physical
constraints see [trade and industry](catalog.trade.md); for regulatory timing see
[law and policy](catalog.law.md). The mismatch can matter more than the headline.
