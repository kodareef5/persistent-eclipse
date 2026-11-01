# Software and technology

What developers build, adopt, report, and standardize. See the shared
[catalog conventions](catalog.md) and [material capability updates](catalog.updates.md).

| Source | Access | Good for | Limits |
| --- | --- | --- | --- |
| GitHub repositories | `gh api repos/<owner>/<repo>`, `/releases`, `/contributors` | Stars, pushes, releases, who works on what | Stargazer identity lists have restricted access; use aggregate history for historical interest, not adoption |
| GitHub star history | `gh api repos/<owner>/<repo>/stargazers/history` | Historical star activity without identities | Weekly/daily granularity; see [semantics and verification limits](catalog.updates.md) |
| GitHub issues | `gh api -X GET search/issues -f q='"<phrase>" is:issue created:>YYYY-MM-DD'` | The same problem across unrelated repos; reaction-sorted demand (`-f sort='reactions-+1'`) | Search caps at 1000 results per query; narrow by date |
| GitHub advisories | `gh api /advisories` | Newly published vulnerabilities with severity and affected packages | Reviewed advisories only by default |
| deps.dev | `https://api.deps.dev/v3/systems/<npm\|pypi\|cargo\|maven\|go>/packages/<pkg>`; `/v3alpha/.../versions/<v>:dependents` | Versions, licenses, and how many packages depend on a version | Dependents are in the alpha API and may move |
| npm downloads | `https://api.npmjs.org/downloads/point/last-week/<pkg>`, `/range/last-month/<pkg>` | Adoption curves, daily | CI and mirrors inflate counts; compare shapes, not totals |
| PyPI | `https://pypi.org/pypi/<pkg>/json`; `https://pypistats.org/api/packages/<pkg>/recent` | Release history; recent downloads | pypistats is a third-party service and lags by a day |
| crates.io | `https://crates.io/api/v1/crates/<crate>` | Rust crate versions and downloads | Refuses requests without a User-Agent (403) |
| Hugging Face | `https://huggingface.co/api/models?sort=trendingScore&limit=50` | Models gaining attention, by likes and downloads | Trending reflects a short window; check again a week later |
| arXiv | `https://export.arxiv.org/api/query?search_query=cat:<cat>&sortBy=submittedDate&sortOrder=descending` | New preprints by category | Atom XML; the API asks for a few seconds between requests |
| IETF datatracker | `https://datatracker.ietf.org/doc/recent`; `/api/v1/doc/document/?format=json&type=draft` | Drafts and their state on the way to RFC | Most drafts expire; state changes matter more than submissions |
| W3C | `https://www.w3.org/TR/` | Web standards and their maturity levels | Slow moving; browser positions say more about timing |
| Chrome Platform Status | `https://chromestatus.com/api/v0/features` | Browser features, intents to ship, milestones | The JSON starts with `)]}'`, which you must strip before parsing |
| NVD | `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=...&pubEndDate=...` | New CVEs with scores and references | Unkeyed requests are tightly rate-limited; analysis can lag publication by days |
| OSV | `curl -X POST https://api.osv.dev/v1/query -d '{"package":{"name":"<pkg>","ecosystem":"npm"}}'` | Known vulnerabilities for a package, across ecosystems | Query per package; no feed of new entries through this route |
| Stack Overflow | See [attention](catalog.attention.md) | Questions by tag; unanswered problems | As there |

## Historical activity and independent risk signals

From the Round 2 fieldbook; see [review provenance](fieldbook.md).

| Source | Investigative opening | Limit |
| --- | --- | --- |
| [GH Archive](https://www.gharchive.org/) | Query historical public GitHub events by hour, patterns and repositories. | Public event firehose is incomplete for some user goals; noisy volume and automated accounts. |
| [Software Heritage](https://www.softwareheritage.org/) | Retrieve preserved source revisions, even after a repo moves or disappears. | Archival time is not development time. |
| [CISA Known Exploited Vulnerabilities catalog](https://github.com/CISAgov/kev-data) | Verify whether a listed vulnerability has known exploitation in the wild, independently of hype. | Inclusion is one criterion; exclusion isn't proof of safety. |
| [FIRST EPSS](https://www.first.org/epss) | Compare published exploitation-likelihood estimates for CVEs as a triage input. | A forecast score is neither proof of exploitation nor a business impact metric. |
| [OpenSSF Scorecard](https://openssf.org/projects/scorecard/) | Study open-source project practices and risk signals across maintainers and dependencies. | Metric/check failures ≠ demonstrated security vulnerability. |
| [CNCF Landscape](https://landscape.cncf.io/) | Discover adjacent projects, providers, standards, and niche ecosystems to widen competitive/research coverage. | Catalog membership isn't validation or growth. |
