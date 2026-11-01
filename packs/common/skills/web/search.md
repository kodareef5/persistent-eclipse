Prefer raw results and read them yourself; a summary written by another model adds
cost, refusals, and one more voice between you and the source. Use the first route
that works here, in this order:

| Order | Route | Needs | Cost per search (Oct 2026) |
| --- | --- | --- | --- |
| 1 | Host search tool: `pe_web_search` in Pi, `web_search` elsewhere | Pi: OpenRouter key | Pi: about $0.0012 (Parallel fast), $0.0071 when it falls back to Exa fast |
| 2 | Parallel Search API | `PARALLEL_API_KEY` | about $0.001–0.005 |
| 3 | Exa Search API | `EXA_API_KEY` | about $0.007 |
| 4 | Brave or Tavily Search API | `BRAVE_API_KEY` or `TAVILY_API_KEY` | see the provider |
| 5 | Keyless routes in the table below | network access | free |

Routes 2–4 return raw results directly. Check that the variable is set with
`[ -n "$EXA_API_KEY" ]` without printing it, and refer to it only by name:

    curl -s https://api.parallel.ai/v1/search -H "x-api-key: $PARALLEL_API_KEY" -H 'content-type: application/json' -d '{"objective":"<question>","search_queries":["<terms>"],"mode":"fast"}'
    curl -s https://api.exa.ai/search -H "x-api-key: $EXA_API_KEY" -H 'content-type: application/json' -d '{"query":"<terms>","numResults":8,"contents":{"highlights":true}}'
    curl -s 'https://api.search.brave.com/res/v1/web/search?q=<terms>&count=10' -H "X-Subscription-Token: $BRAVE_API_KEY"
    curl -s https://api.tavily.com/search -H "Authorization: Bearer $TAVILY_API_KEY" -H 'content-type: application/json' -d '{"query":"<terms>","max_results":8}'

What was tried for Pi's search, and why it works the way it does (October 2026):

| Strategy | Result |
| --- | --- |
| OpenRouter web plugin, Parallel fast, tiny reply | Chosen. 8 excerpts of about 1.4k characters, $0.0012. The search always runs. |
| OpenRouter web plugin, Exa fast | Fallback. Similar excerpts, often with publication dates in the text, $0.0071. |
| OpenRouter `openrouter:web_search` server tool | Rejected for now. The model decides whether to search, and a small one often doesn't; nothing comes back. |
| A model writes a sourced answer from the results | Dropped. GPT-5.2 cost several cents a search, a summary hides the excerpts, and frontier models may refuse security queries. |

Known gotchas:
- OpenRouter marks the web plugin deprecated in favor of the server tool, with no
  removal date yet. If plugin searches start failing, check the server tool again.
- Excerpts come back as `url_citation` annotations. Pi discards the model's reply,
  which is capped at 16 tokens with thinking off.
- An exhausted key or credit (401, 402, 403) fails every engine alike; Pi stops there
  and says so. Other failures fall through to Exa.
- Search costs land on the operator's OpenRouter key even when the model is free.
- Parallel `turbo` is faster but English and Japanese only.
- Prices and engine names change. Re-check https://openrouter.ai/docs before
  relying on these numbers, and update this table when a route changes.
