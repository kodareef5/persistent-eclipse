Most routes need only `curl -sL --fail`. Save downloads in task scratch; the manager
can promote reusable sources into intel.

| Route | Good for | Try |
| --- | --- | --- |
| Known URL | a page, PDF, or file already named | `curl -sL --fail -A 'Mozilla/5.0' -o .research/scratch/T-<id>/<name> <url>` |
| GitHub | repos, releases, issues, code | `gh search repos <terms>`, `gh search issues <terms>`, `gh api repos/<owner>/<repo>/releases` |
| DuckDuckGo HTML | general web | `curl -s 'https://html.duckduckgo.com/html/?q=<terms>'` |
| Wikipedia | background, names, dates | `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=<terms>` |
| arXiv | preprints | `http://export.arxiv.org/api/query?search_query=all:<terms>&max_results=10` |
| OpenAlex | papers, authors, citations | `https://api.openalex.org/works?search=<terms>` |
| Crossref | DOIs and publication metadata | `https://api.crossref.org/works?query=<terms>&rows=10` |
| Semantic Scholar | papers and references | `https://api.semanticscholar.org/graph/v1/paper/search?query=<terms>` |
| Package registries | versions, maintainers, advisories | `registry.npmjs.org/<pkg>`, `pypi.org/pypi/<pkg>/json`, `crates.io/api/v1/crates/<crate>` |
| Wayback Machine | dead or blocked pages | `https://archive.org/wayback/available?url=<url>` |
