# Building Persistent Eclipse

After edits: ``` src/check.sh /path/to/dsh/apps/cli/lib/bin.js ```
Commit the regenerated `cordis.patch.yml`.

`src/research.md` holds the shared research outlook. The builder expands
`{{pe_research}}` in the manager persona and `pe-git-research`, so the same wording
reaches the manager and researchers in both runtimes.
Keep the outlook's wording during routine prose cleanups; it carries the lab's voice.

`src/skills/model-notes.md` preserves the operator's dated, personal model notes.
Keep their voice and examples. `models.md` is the short practical companion; model
grades never become runtime routing rules. Both are skills read on demand.

Multipart skills keep their master in `src/skills/<name>.md` and named tables in
`src/skills/<name>/<table>.md`. A `{{table:<table>}}` slot expands at build time;
every slot needs a file and every table needs a slot. Math has nine tables; muse
has 24 across Code, Ecosystem, and Frontiers. Edit these sources and run
`python3 src/build.py`; the existing builder embeds the complete skills in the
portable YAML used by both DSH and Pi. No separate renderer is needed.
