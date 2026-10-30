---
name: pe-history
description: Show lab activity and model usage, or preserve the workspace and conversations in a private archive.
---

# History

Let the tools keep the receipts. No extra bookkeeping is needed from researchers.

```sh
node .research/tools/history.mjs report
node .research/tools/history.mjs report --write
node .research/tools/history.mjs report --json
node .research/tools/history.mjs collect
node .research/tools/history.mjs archive ../my-discovery.pe-archive
node .research/tools/history.mjs verify ../my-discovery.pe-archive
```

`report` prints Markdown. `--write` refreshes `.research/local/ACTIVITY.md`;
`--json` provides the same facts for other tools. `collect` backfills available
Pi manager and worker sessions from this machine. A lab ID is optional.

Pi indexes its existing session files in `.research/local/index/`; live work
doesn't make another transcript copy. `collect` retains those conversations in
`.research/local/sessions/` before you remove originals or clear worker scratch.
DSH retains header/event snapshots there because its native store isn't portable
JSONL. Existing retained copies stay available.

Automatic report scans and Git queries run in a background worker, at most once
every five minutes. Pi also waits for a final background refresh when a session
shuts down. Set `History: off` in LAB.md to stop
automatic capture and refresh. Existing records stay available. Pi's
`--no-session` also disables PE's manager-session capture.

The local folder ignores itself in Git. It stays out of pe-export and ordinary
lab sharing. Transcripts stay on this machine unless you deliberately share them.

## Shared effort

Each report combines this machine's records with the usage receipts received from
other labs. It shows collective totals, a small table by lab, and model/effort
detail. Findings and Git history describe the shared record; conversation links
and tool counts describe the transcripts retained here.

The runtime writes immutable batches of new receipts under `.research/activity/`;
completed batches aren't rewritten. A small identity file tracks the lab's name.
Older receipt files remain readable. Include these
with the next ordinary research commit and sync. They carry model names, effort,
token counts, and opaque identities for counting each call once. They contain no
prompts, answers, tool arguments, or local paths. No extra commit or push is made.
`Sync: off` keeps new receipts local to the report.

`pe.lab` supplies the familiar label. Unnamed labs get a small automatic identity;
no registration is needed. Older records with no reliable origin stay unattributed.
Known labs without receipts show “not shared”, never zero effort. The latest
receipt time tells you how current each lab's accounting is; a pull can only bring
what its peers have committed and pushed. Forks and copied receipts count once.
Older contributors can keep working without upgrading.

Counts come from Git, note frontmatter, and runtime records. They describe work,
not its quality. Effort is a model setting; reasoning tokens are part of output.
Partial totals and price estimates are labeled. Unlogged requests cannot be
recovered from prose or guessed from message length. There is no automatic commit,
network request, or LLM call to make a report.

## Keep the investigation

`archive` creates a new folder outside the lab, verifies file hashes, and returns
its path and manifest hash. It includes workspace files, Git bundles, staged and
unstaged patches, collected sessions, readable conversations, and an activity
report. Use pe-export when you want the smaller research handoff instead.

Capture at a quiet moment. This is a file-by-file snapshot, not a frozen filesystem.
The manifest lists omissions and any changes noticed while copying. Common
dependency caches are omitted; `--include-caches` retains them. Git bundles retain
refs and reachable commits, not reflogs or unreachable objects. Symlinks are recorded
without following them. Add external attachments or inputs explicitly with
`--include /path/to/input` (repeat as needed). Inline attachments already travel
with their messages. Arbitrary paths in tool output are not followed.

The archive's README explains restoration. Pi gets native JSONL session copies;
DSH gets header/event snapshots for inspection or a version-aware importer.
Resuming still needs compatible tools. Processes and provider state aren't saved.

Keep the full archive private until reviewed: transcripts and ignored workspace
files can contain private material. Prepare a separate copy for publication.
To compress an inspected archive, run `tar -czf ../lab-archive.tar.gz .` inside it.
Creating an archive doesn't publish anything.

## Tool copy

The runtime places the standalone tool in `.research/tools/`. Its shipped SHA-256
is `{{history.sha256}}`. If the lab's copy differs, compare with `.shipped` as
pe-lint describes; don't overwrite a customized tool blindly.

```js history.mjs
{{history.mjs}}```
