---
name: pe-osint
description: Where to look and how to follow a lead through public sources. Lenses, worked pivots with commands, checking provenance, and the boundaries of the work.
---

# OSINT

This skill covers where activity leaves public traces and how to follow one trace to
the next until something checkable explains it. A Signal Hunt works both from a
target, digging into one lead, and from a field, asking what in it is changing.

Pick a lens that fits the lead, not every lens. Keep the trail: each hop, what it
showed, and where you saved it, so another researcher can retrace every hop.
Sources and their limits are in the resource catalog ({{note:catalog}}), which owns
the baseline and maintenance conventions, with entries for attention
{{note:catalog.attention}}, catalogs {{note:catalog.catalogs}}, companies
{{note:catalog.companies}}, research {{note:catalog.research}}, and technology
{{note:catalog.technology}}, and a log of material updates {{note:catalog.updates}}.
For larger investigations, read pe-hunt's investigation plays (`notes/plays.md`):
constraints and beneficiaries, scientific developments and their surrounding systems,
audience categories, procedural positions, and conditional planning. Use source
intelligence ({{note:sources}}) to preserve what the desk learns about where useful
ideas come from. Load the guide that fits the work.

## Professional fieldbook

For a deeper route, start at {{note:fieldbook}}. It links evidence-preservation and
entity tools, case studies, and specialist sources, and notes how far each was checked.
Choose a useful move; these are examples to think with, not assignments.

| Need | Open |
| --- | --- |
| Preserve pages, reconcile identities, query records, or study an intelligence platform | {{note:fieldbook.tools}} |
| Follow disclosure gaps, second-order effects, positive outliers, or competing explanations | {{note:fieldbook.plays}} |
| Learn from Bellingcat, ICIJ, PitchBook, SemiAnalysis, and other published work | {{note:fieldbook.examples}} |
| Find expert interpretation, investigative craft, and official reading rooms | {{note:fieldbook.feeds}} |

Specialist source notes: trade and industry {{note:catalog.trade}}, health and
life sciences {{note:catalog.health}}, law and policy {{note:catalog.law}},
audiences and editorial research {{note:catalog.editorial}}, and geospatial
observations {{note:catalog.geospatial}}.

## Lenses

### Activity before commentary · `lens:activity`

Things happen in trackers, registries, and drafts before anyone writes them up.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| HN `/newest`, Lobsters `/newest.json` | What practitioners are about to discuss | The linked artifact itself | A submission is not interest; most die at one point |
| New issues on widely used repos, by reactions | Pain shared by many users before any blog post | Distinct reporters, versions, and reproductions | One loud user, or one user with many accounts |
| Changelogs and release notes of tools SCOPE uses | Breaking changes, new defaults, new capabilities | The tag and the diff | A rename of an old feature sold as new |
| Standards work: IETF datatracker, W3C, Chrome Platform Status | What protocols and browsers will do in six to eighteen months | Draft state and implementer positions | Drafts that never ship |
| Category listings on arXiv, bioRxiv | Methods a year or two before products | Released code, an independent replication | The abstract claims more than the tables |
| Unanswered Stack Overflow questions with high votes | Problems people have that nobody has solved in public | View counts and duplicates over time | Old questions about dead versions |

### Change over time · `lens:change`

What an organization says now, compared with what it said before.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| Wayback CDX for one page, collapsed by digest | Exactly when wording changed | The two captures on either side | Template or cookie-banner changes |
| A docs repo's history: `git log -p -- docs/` | Features quietly dropped, limits quietly added | The commit and its PR discussion | Typo fixes and reorganizations |
| Pricing and terms pages | A shift in business model or target customer | Dated captures | Regional pages and A/B tests |
| Job boards snapshotted weekly | Teams forming, growing, or disappearing | The saved postings, diffed by title | Reposts of the same opening |
| Registry metadata: maintainers, repo URL, license | Ownership changes and relicensing | Registry JSON at each version | Mirrors and forks with the same name |
| 10-K risk factors, year against year | New worries that management now admits in writing | The two sections side by side | Lawyers reshuffling boilerplate |

### Relationships · `lens:relationships`

Who depends on whom, so a change in one place can be traced to everyone it reaches.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| deps.dev dependents of a package version | Who a breaking change or a vulnerability reaches | Direct versus indirect counts, and specific dependents | Indirect counts inflated by a few huge trees |
| Customers and suppliers named in filings | Concentration and exposure | The filing text and the exhibit | A name in a list of examples |
| GLEIF parent and child records | Corporate structure behind a brand | LEI relationship records | Out-of-date relationships |
| OpenAlex co-authorship and affiliations | Labs and companies moving into a field | The papers, not the counts | Name collisions between authors |
| USAspending awards | Government customers and how much they pay | Award records with dates and amounts | Ceiling values read as money spent |

### Negative space · `lens:absence`

What should be there and isn't.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| Roadmap promises past their dates | A slip, a pivot, or trouble | The archived promise, the missing release | Roadmaps that were never commitments |
| Issues closed "won't fix" with many reactions | Unmet demand that someone else could serve | Reaction counts and duplicate issues | Requests that conflict with the project's purpose |
| A product that stops appearing in filings or earnings remarks | Something being wound down | Consecutive filings compared | A reorganized segment |
| A fast-moving project with docs that don't move | A gap a tutorial or tool could fill | Docs history against code history | Docs that live somewhere else |
| An expected filing or announcement that doesn't come | A delay worth asking about | The calendar it should have followed | A deadline that was never required |

### Leading indicators · `lens:indicators`

Activity that tends to come before an outcome. None of them proves the outcome.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| A role new to a company's job board | Product direction | Posting text and team names | Speculative or evergreen postings |
| New hostnames in certificate transparency (crt.sh) | Launches and environments before announcement | Issue dates; whether the host resolves | Staging hosts, wildcards, vendor domains |
| Trademark applications | Product names | The goods and services description | Defensive filings |
| Patents and grants | Research direction years out | Claims, assignee, citations | A patent is not a product |
| Proposed rules in the Federal Register | Regulation that is coming, and who commented | Docket and comment period | Proposals that stall |
| FDA 510(k) clearances, ClinicalTrials.gov changes | Device launches, drug pipelines | Record dates and status history | A registration is not a result |
| npm and PyPI download series | Adoption before discussion | Weekly series over months | CI pipelines inflating counts |

### Attention gaps · `lens:attention`

A large implication with little coverage.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| Activity (issues, downloads, filings) against coverage (GDELT, news search) | Developments the press hasn't found | Both series over the same window | Coverage that exists in another language |
| Wikipedia pageview spikes without news | Public curiosity ahead of the press | Daily views, the edit history | Bots and Main Page features |
| The exact error message, searched | No good answer exists yet | The top results, read | An answer behind a different phrasing |
| A topic's HN `/newest` against its front page | What practitioners post that doesn't rise | Counts over weeks | Weekend and time-zone effects |

### Narrative checks · `lens:narrative`

Whether the story matches its sources.

| Look at | It can show | Ground it with | Common misread |
| --- | --- | --- | --- |
| The primary source a story cites | Coverage that overstates or misreads | The quoted passage, in context | Context the reporter had and you don't |
| A cluster of articles on one event | One press release rewritten many times | Earliest timestamp and shared phrasing | Real independent reporting that happens to agree |
| A company's claim against its filings | Marketing that the filings don't support | The filed numbers | Different definitions of the same metric |
| A benchmark's setup | A win that comes from the setup | The config and the hardware | Someone else's rerun on different hardware |

### Analogies and transfer · `lens:analogy`

How similar things went before, and what is moving between fields.

- A previous cycle: how long did the last comparable tool take from first HN post to
  wide use? The answer is a base rate for pe-forecast.
- A technique that just crossed from one field to another, visible in OpenAlex as a
  concept appearing in a new venue.
- A rule adopted in one jurisdiction that others tend to follow.
- A tooling pattern from one stack, such as games, finance, or embedded, arriving in
  another.

## Worked pivots

Each starts from a lead and ends at something checkable. These command patterns
are inherited from the catalog baseline, not revalidated by an edit to this skill.
Replace placeholders and date windows for the actual investigation. Follow catalog
conventions when a failure or new capability yields a reusable lesson.

**A new project on HN, to adoption.**

    gh api repos/<owner>/<repo> --jq '{stars: .stargazers_count, created: .created_at, pushed: .pushed_at}'
    # npm only; for PyPI use https://pypistats.org/api/packages/<pkg>/recent
    curl -s https://api.npmjs.org/downloads/range/last-month/<pkg>
    curl -s 'https://api.deps.dev/v3alpha/systems/npm/packages/<pkg>/versions/<version>:dependents'

For historical attention, also try `gh api repos/<owner>/<repo>/stargazers/history`.
This aggregate route is separate from restricted identity lists; see the
documented semantics and live-check limits ({{note:catalog.updates}}). Use snapshots
when their observation times matter. Downloads and dependents offer other clues
to use; none of these counts alone establishes adoption.

**A complaint in one repo, to how widespread it is.**

    gh api -X GET search/issues -f q='"<distinctive phrase>" is:issue created:>2026-10-01' --jq '.items[] | [.created_at, .repository_url, .title] | @tsv'
    gh api -X GET search/issues -f q='repo:<owner>/<repo> is:issue is:open' -f sort='reactions-+1' -f order=desc --jq '.items[] | [.reactions["+1"], .title] | @tsv'

Distinct repositories reporting the same symptom are the signal. Many comments on
one issue are mostly one community.

**A company, to its counterparties.** SEC requires a User-Agent with contact details.

    curl -s -A "<name> <email>" https://data.sec.gov/submissions/CIK<10-digit cik>.json | jq '.filings.recent | [.form, .filingDate, .primaryDocument] | transpose | .[:20]'
    curl -s -A "<name> <email>" -G https://efts.sec.gov/LATEST/search-index --data-urlencode 'q="<supplier name>"' \
      -d forms=10-K -d dateRange=custom -d startdt=2026-01-01 -d enddt=2026-10-31 | jq -r '.hits.hits[]._source | [.file_date, .display_names[0]] | @tsv'

Full-text search finds every filer that names a supplier or customer, which is how
one company's news becomes a lead about another.

**A domain, to what it is about to launch.**

    curl -s 'https://crt.sh/?q=%25.<domain>&output=json&exclude=expired' | jq -r '.[] | [.not_before, .name_value] | @tsv' | sort -u | tail -20
    curl -s 'https://web.archive.org/cdx/search/cdx?url=<domain>/pricing&output=json&fl=timestamp,digest&collapse=digest'

The first shows recently certified hostnames; the second lists only the captures
where the page actually changed. crt.sh is slow and sometimes times out on large
domains; retry once and move on.

**A paper, to who is following it and who is paying.**

    curl -s 'https://api.openalex.org/works?filter=cites:<W id>&sort=publication_date:desc&per-page=25' | jq -r '.results[] | [.publication_date, .title] | @tsv'
    curl -s 'https://api.nsf.gov/services/v1/awards.json?keyword=<term>&rpp=25' | jq -r '.response.award[] | [.startDate, .awardeeName, .title] | @tsv'

OpenAlex now meters keyless use from a shared daily budget per IP; ask the operator
for a key if the lab leans on it.

**A company's hiring, over time.**

    curl -s https://boards-api.greenhouse.io/v1/boards/<board>/jobs | jq '[.jobs[] | {title, updated_at, location: .location.name}]' > .research/scratch/T-<id>/<board>-$(date -u +%F).json

Lever (`api.lever.co/v0/postings/<company>?mode=json`) and Ashby
(`api.ashbyhq.com/posting-api/job-board/<org>`) work the same way. One snapshot says
little. A weekly series, diffed by title and team, shows direction; the manager keeps
it under a REQ in `runs/`.

## Checking a lead

Before a lead goes on the radar:

- **Provenance.** Who first published this, where, and when? Follow quotes and links
  back to the earliest copy you can find.
- **Dates.** Separate when something happened, when it was published, and when you
  saw it. Forecasts and resolutions depend on the difference.
- **Independence.** Five articles from one press release are one source. Two
  issue reporters on the same team are one report. Count origins, not mentions.
- **Primary over secondary.** The filing over the article about it, the diff over
  the changelog, the paper's table over its abstract.
- **A saved copy.** Extract what you rely on into `.research/intel/` with its URL and
  retrieval time.
- **The boring explanation.** A scheduled release, a seasonal pattern, a redesign, a
  bot. Rule it out or say it remains.

## Boundaries

Public discovery studies organizations, projects, markets, and public work. It does
not investigate private individuals. A desk may separately analyze operator-authorized
portfolio, analytics, accounting, or matter records within SCOPE's explicit access
and handling boundaries. Keep that material and its derived private conclusions
in the approved workspace, not in public catalogs or transferable method examples.

- People appear only in public professional roles, such as maintainer, author,
  executive, or filer, and only as far as a lead needs. No home addresses, family,
  private accounts, or personal histories.
- Public sources for discovery; use private inputs only as authorized above. No
  leaked or stolen material, breach data, or documents that
  someone wasn't entitled to publish, even when they are easy to find.
- No logging in under false names, getting around paywalls, rate limits, or access
  controls, or scraping against a site's terms. Use documented routes and current
  limits; include the required identifying headers where applicable.
- No contacting people, posting, or commenting. Those are operator actions.
- For market discovery, use public or properly licensed sources and authorized
  mandate inputs. Do not solicit or use improperly disclosed company information.

If a lead can only be confirmed by crossing one of these lines, record it as
unconfirmed and say what would confirm it within them.
