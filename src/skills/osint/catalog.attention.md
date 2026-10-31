# Attention and change

Where people are paying attention, and where pages change. See the shared
[baseline and maintenance conventions](catalog.md). Historical access incidents
are recorded separately in [UPDATES](catalog.updates.md).

| Source | Access | Good for | Limits |
| --- | --- | --- | --- |
| Hacker News, official API | `https://hacker-news.firebaseio.com/v0/{topstories,newstories,item/<id>}.json` | The front page in rank order (first 30 of `topstories`), any item's score and comments | One request per item; no search. The front page includes job ads, which aren't stories. `hn-collect.mjs` uses it only for the front page |
| Hacker News, Algolia index | `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i>N` | Every story in a time window with points and comments in one request; search by text, `tags=show_hn`, `ask_hn` | At most 1000 hits per query; points can trail the live site by minutes |
| Lobsters | `https://lobste.rs/newest.json`, `/hottest.json`, `/rss` | A smaller, more technical crowd than HN, with tags | 25 stories per page |
| Reddit | Official developer access; verify current requirements | Subreddit new and rising posts | Baseline access incident in UPDATES; obtain permitted access before relying on collection |
| Mastodon | `https://<instance>/api/v1/timelines/tag/<tag>` | Hashtag timelines on a given instance, no key | Each instance sees only its own federation; check several |
| Bluesky | Published API routes; verify access for the selected service | Post search | Public search failed in the baseline environment; see UPDATES |
| Stack Exchange | `https://api.stackexchange.com/2.3/questions?site=stackoverflow&tagged=<tag>&sort=creation`; `/questions/unanswered?sort=votes` | New questions by tag; popular problems with no answer | Responses are gzipped (`curl --compressed`); 300 requests a day per IP without a key |
| Wikipedia pageviews | `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/<Article>/daily/<YYYYMMDD>/<YYYYMMDD>`, `/top/en.wikipedia/all-access/<Y>/<M>/<D>` | Public curiosity about a topic, daily; the day's most-read articles | Daily granularity, available the next day; set a descriptive User-Agent |
| GDELT DOC 2.0 | `https://api.gdeltproject.org/api/v2/doc/doc?query=<q>&mode=artlist&format=json`; `mode=timelinevol` | News coverage volume and article lists across many countries and languages | Baseline observed 2026-10-31: space requests at least five seconds apart; that host still saw refusals. Historical operating guidance, not a guaranteed allowance; recheck access and preserve gaps |
| Google Trends | [Browser](https://trends.google.com/trends/) or [official API alpha](https://developers.google.com/search/apis/trends), approval required | Relative search interest; the alpha documents consistent scaling across requests | Limited alpha access, not generally available. UI normalization differs; neither route reports raw search counts. See [review](catalog.updates.md) |
| Wayback Machine CDX | `https://web.archive.org/cdx/search/cdx?url=<url>&output=json&fl=timestamp,digest&collapse=digest` | Every capture where a page actually changed | Coverage is uneven; small sites may have few captures |
| changedetection.io | Self-hosted, `github.com/dgtlmoon/changedetection.io` | Watching specific pages for changes, with diffs | Runs as a service the operator installs; PE doesn't |
| RSSHub | Self-hosted or public instance, `docs.rsshub.app` | Feeds for sites that have none | Public instances rate-limit and break; self-host for anything regular |
| GitHub search and events | `gh api -X GET search/issues -f q=...`, `search/repositories`, `/events` | New repos, issues across all of GitHub, reaction-sorted issues | Search allows 30 requests a minute when authenticated; events can lag by minutes to hours |
| Certificate transparency | `https://crt.sh/?q=%25.<domain>&output=json&exclude=expired` | Hostnames certified for a domain, often before launch | Slow; large domains time out. Wildcard certificates hide the hostnames |
