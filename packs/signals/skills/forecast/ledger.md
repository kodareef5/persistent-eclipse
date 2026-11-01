# Optional forecast ledger

Run `node .research/tools/ledger.mjs <command>` from the lab root. The script's
header documents flags and columns. Use this when repeated numerical forecasts
help answer a research question; the tool does not choose the lab's agenda.

## Record and compare

Workers draft with `add --file .research/scratch/T-<id>/forecasts.tsv --by <identity>`
and the question's flags. The manager reviews and imports with `merge <draft-path>`.
Use stable identities for independent forecasters and `--lab <lab>` for shared F-IDs.
The key groups one question: lowercase letters, digits, and `: . _ / -`, for example
`gh:owner/repo:stars1k-2027-01`. Record its meaning, evidence, and resolution rule in
a note. A revision appends a row with the same key. Preserve earlier expectations.

`base` is the comparison probability you actually had when forecasting; use `-`
when none is defensible. Explain the reference class and the reason for your estimate
in the note. No arbitrary confidence threshold makes an estimate well grounded.

`merge` keeps equal independent forecasts when their `by` identities differ, and
deduplicates exact content on repeated import, ignoring reassigned F-IDs. It cannot
recover forecasts an older merge dropped; reimport the drafts if available.

## Resolve with evidence

Use `resolve --key K --outcome 1|0|void --known WHEN --evidence TEXT`. Point the
evidence to a saved extract or note with the lab's identity, source dates, outcome
rule, and reasoning. `known` is when the outcome became visible, not when you noticed
it. UTC timestamps avoid ambiguity; a date alone means the start of that day, except
in `closes`, where it means the end. A forecast at or after `known` is late.

Each local key is resolved once. Shared labs can independently append resolutions;
keep those rows and their evidence. `check` exposes differing outcomes or known
times. `score` excludes the disputed question rather than choosing by file order.
Agreement on outcome and known time counts once even if evidence or review times
differ; agreement alone does not establish truth.

Investigate a discrepancy through ordinary notes and the inbox. Preserve who argued
what, the evidence each used, and the evaluation of their reasoning. Explain a
settled result or why different conclusions remain reasonable. Do not erase the
original resolutions or declare consensus just to get a number.

If a reviewed numerical comparison is useful, use the existing `--resolutions`
option to write the reviewed outcomes to a separate file under `.research/reviews/`:
`resolve --resolutions <file> --key K ... --evidence <review-note>`, then
`score --resolutions <file>`. The review note links the original positions and says
why this outcome is used. Label the report as using that reviewed set and show its
coverage; unreviewed and disputed questions stay visible in the original ledger.
This is optional, not a second record every desk must maintain.

## Read scores carefully

`score` prints Brier scores (mean squared probability error; lower is better) for
first and last eligible forecasts per key. Against recorded baselines it reports
skill as `1 - yours / base`. Read the underlying questions and misses before drawing
conclusions; easy questions, small samples, and selection can dominate the numbers.

- `--group by` or `--group via` reports each identity or source's own sample. It does
  not match samples or establish that one method is better. Use comparable questions
  and windows for such a claim, and report differences in coverage.
- `--committed` optionally uses the later of the stated time and first appearance
  on this clone's first-parent Git history. Commit timing is a rough audit aid, not
  proof of when an idea occurred; imported work may have earlier history elsewhere.
- Calibration bins compare stated probabilities with observed outcomes. Sparse or
  unrepresentative bins give little confidence.

`check` validates the record and reports edits/removals against Git history. It
cannot validate the research. Preserve corrections and their reasons in the notes.

## HN illustration

Keys `hn:<story id>:front<hours>` ask whether a story reaches the first 30 IDs of the
collector's topstories list within that window. This measures observed attention.

- `hn-resolve --runs <dir>` resolves observed hits, with `known` conservatively set
  to the preceding poll (or submission time). Unseen hits may be missed between polls.
  A negative resolves after the window; a gap over `--gap` minutes (default 60)
  instead makes it void. This sampling rule is a limitation, not complete visibility.
- `hn-base --runs <dir>` uses stories first seen within an hour of submission and
  complete windows; `--age 60 --points 5` narrows the comparison to stories with at
  least five points around an hour old. Inspect how well that class fits the question.
- `hn-misses --runs <dir>` lists observed front-page stories without a forecast,
  among those first seen young. It cannot recover what the collector never saw.

The collector and these commands are available examples. Use them only when they
serve the mission, and change the approach when they stop teaching you anything.
