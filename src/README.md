# Building Persistent Eclipse

Edit `src/` and push to main. The `build` workflow runs `python3 src/build.py`,
tests the result in Pi, and commits the regenerated `cordis.patch.yml`
back to main. A push that hand-edits the generated file so it no longer matches
`src/` fails instead of being overwritten. `gh workflow run build.yml` runs it on demand.
It runs on GitHub's ubuntu-latest. A repo variable `PE_RUNNER` can name a self-hosted
runner for pushes and manual runs; pull requests always stay on ubuntu-latest.

To check locally, including DSH, which CI cannot reach:
``` src/check.sh /path/to/dsh/apps/cli/lib/bin.js ```

`src/research.md` holds the shared research outlook. The builder expands
`{{pe_research}}` in the manager persona and `pe-git-research`, so the same wording
reaches the manager and researchers in every runtime.
Keep the outlook's wording during routine prose cleanups; it carries the lab's voice.

`src/skills/model-notes.md` preserves the operator's dated, personal model notes.
Keep their voice and examples. `models.md` is the short practical companion; model
grades never become runtime routing rules. Both are skills read on demand.

Model approval is checked at each selection by the instructions in `models.md`
and Pi's worker tool descriptions, including effort-only changes and defaults.
Pi validates configured access and supported efforts in code; it does not enforce
the approvals recorded in LAB.md. That is deliberate: capable models
follow clear guidance, so `pe_subagent`'s description states the rule and a launch on
a different route reminds the manager to stop it if it isn't approved. Keep it guidance. DSH additionally enforces its operator-configured
provider/model allowlist at launch, including for explicit effort-only selections.
That allowlist does not express effort limits; those remain an instruction check.

Multipart skills keep their master in `src/skills/<name>.md` and named tables in
`src/skills/<name>/<table>.md`. A `{{table:<table>}}` slot expands at build time;
every slot needs a file and every table needs a slot. Math has nine tables; muse
has 24 across Code, Ecosystem, and Frontiers. Edit these sources and run
`python3 src/build.py`; the existing builder embeds the complete skills in the
YAML used by DSH and Pi. No separate renderer is needed.

## Runtimes

- DSH loads `cordis.patch.yml` (`package.json` `dsh.bundle`).
- Pi loads `extension.ts`, which reads `cordis.patch.yml` (`pi install <this repo>`).

Pi's `pe_web_search` returns raw search results: titles, URLs, and excerpts that the
agent reads itself. It uses the operator's OpenRouter key and the web plugin with
Parallel fast, falling back to Exa fast. `deepseek/deepseek-v4.1-flash-1017`, with
thinking disabled, only carries the request; its 16-token reply is discarded. Each
search saves its sources, attempts, and usage in a receipt. `src/skills/web/search.md`
records the routes evaluated, the preference order, and known gotchas; update it when
a route changes.
Failed searches keep receipts too. History counts each attempt's reported usage
once, including empty searches before a fallback; missing usage stays unknown.
The receipt's top-level `usage` describes the selected attempt for compatibility.

During an armed Pi goal, a manager idle for fifteen minutes with workers still running
and at least two free slots gets a brief fleet check. It includes worker ages and last
activity; the manager may investigate, delegate, or keep waiting. Like worker notices,
checks use no goal rounds, so a lab waiting on long experiments doesn't exhaust its cap.
They never stop workers automatically. Each check the manager waits through doubles
the next interval, to 30 minutes and then hourly; a worker launch or completion, or
the operator speaking, returns it to fifteen. Manager activity resets the timer;
paused, blocked, completed, and restored-but-disarmed goals receive no checks.

Pi's `pe_archive_agents` hides completed workers from `pe_list_agents` once they
finished over six hours ago and at least ten newer workers have launched in the
session. It preserves the completed count, task IDs, and all files. This is fleet
list cleanup; disk cleanup remains a separate housekeeping task.
