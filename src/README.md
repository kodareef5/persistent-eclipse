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

Multipart skills keep their master in `src/skills/<name>.md` and named tables in
`src/skills/<name>/<table>.md`. A `{{table:<table>}}` slot expands at build time;
every slot needs a file and every table needs a slot. Math has nine tables; muse
has 24 across Code, Ecosystem, and Frontiers. Edit these sources and run
`python3 src/build.py`; the existing builder embeds the complete skills in the
YAML used by DSH and Pi. No separate renderer is needed.

## Runtimes

- DSH loads `cordis.patch.yml` (`package.json` `dsh.bundle`).
- Pi loads `extension.ts`, which reads `cordis.patch.yml` (`pi install <this repo>`).
