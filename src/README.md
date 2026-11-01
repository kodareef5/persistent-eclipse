# Working on Persistent Eclipse

`extension.ts` runs Pi. `cordis.patch.yml` runs DSH. Both use the same content
resolver; missions and libraries live in `packs/`, outside the engine package.

Edit the source, then build and check:

```sh
python3 src/build.py
src/check.sh "$(npm root -g)/@deepseek-ai/dsh/lib/bin.js"
```

The build writes `cordis.patch.yml`, `src/dsh-client.bundle.js`, and the small
`src/pack-defaults.json` hash list. Don't edit those by hand. The tests use temporary labs and mock providers, not your research.

GitHub builds source and pack changes automatically. Only the main README, this
README, remote-operation guide, and banner skip that build. Runtime prose and
mission packs still count as source. Run tests locally; optional hosted tests are
manual: `gh workflow run test.yml`.

## Content

A lab selects `red`, `blue`, `math`, or `signals` in `.research/packs.json`:

```json
{"mission":"math"}
```

Common skills accompany the selected mission. `pe-muse` opens that mission's
inspiration library. Field notes are read on demand. Keep the research outlook
and personal model notes in the operator's voice.

An installed Git checkout can supply the initial packs. Once recorded, the shared
pin governs ordinary loads, even after an engine upgrade. The copied lab CLI uses
the same source and cache as the manager. Missing revisions fetch from the pinned
repository; cached revisions work offline.

For development, set `git config pe.packRoot /path/to/packs` in the lab or use
`PE_PACK_ROOT`. This intentional override follows local edits between turns.
Pi's Git installer retains packs. DSH's Git installer and npm tarballs follow the
engine-only package file list: private/unreleased installs need a local override
or explicit `sources` in `packs.json`. For example:

```json
{"mission":"math","sources":{"common":{"repository":"/path/to/content-repo","ref":"<commit>"},"math":{"repository":"/path/to/content-repo","ref":"<commit>"}}}
```

Peers without access to unpublished packs can use a reviewed folder committed
with the lab. Copy the required packs under `.research/vendor/pe-content/packs/`,
then set each source's `repository` to `vendor/pe-content` (relative to
`.research/packs.json`). An exported `packs.lock.json` with `packs/<digest>/`
also works. Shared pins and preview/apply work the same way; a cold clone needs
no network or machine-specific cache script.

Fresh engine-only installs fetch compatible defaults from public PE and pin the
resolved commits. `/pe-version` and the DSH card show when those libraries differ
from the engine's build-time content. Content can evolve between engine releases; existing
pins change only through a reviewed update. An incompatible manifest or missing
pack gives recovery directions. Private development still uses an explicit local
override or private source; unreleased packs aren't available on public.
A mission/catalog disagreement produces a notice without editing MISSION.md.

`packs.lock.json` pins shared revisions. A developer content override keeps its
resolved hashes in ignored `local/packs.lock.json`, without churning shared pins.
From the lab:

```sh
node .research/tools/content.cjs inspect
node .research/tools/content.cjs verify
node .research/tools/content.cjs update
node .research/tools/content.cjs update --apply
```

`update` (also `update --preview`) checks the configured remote, even when the
installation includes older packs. An explicit developer override stays local.
Review the diff; only `update --apply` changes the pin. Existing MISSION.md text
stays yours; running workers retain the content they started with.

## Lab layouts

These are examples to keep current when conventions change, not a list of files
every lab must create. Keep LAB.md's name stable: runtimes use it to find the lab.

A single lab:

```text
sources/                      pinned study sources
.research/
  LAB.md                      charter, permissions, and “Working here” directions
  MISSION.md                  the operator's research objective and prose
  SOURCES.md                  source origins and pins
  packs.json / packs.lock.json
  STATUS.md / QUEUE.md         current understanding and useful next work
  notes/ / runs/               durable claims and experimental evidence
  updates/ / FEEDBACK.md       contributions and brief tool feedback
  REPORT.md                   generated operator view, committed with its inputs
  activity/README.md          generated accounting, charts, and per-lab detail
  questions/                  operator questions and answers
  tools/                      runtime-supplied helpers; preserve local changes
  scratch/ / local/            local work and transcripts; not shared
```

Labs sharing a private research repository keep the shared record above, with
coordination separated where it helps:

```text
.research/
  labs/
    maple/                    HOST.md, QUEUE.md, FLEET.md, CADENCE.md as needed
    cedar/                    the other manager's working records
  inbox/                      cross-lab requests and coordination
  activity/                   shareable accounting receipts
  updates/                    dated Markdown contributions from all labs
  REPORT.md                   generated from the combined record
```

The manager owns the lab's conventions. After a relevant pack change, when taking
over an older lab, or when collaborating labs interpret the layout differently,
compare the existing record with pe-kickoff and pe-sync and plan a focused cleanup.
The startup notice identifies changed guidance or a missing review baseline.
Announce that review before launching the fleet, then handle or coordinate
the useful changes. Acknowledge completion only after the comparison; pe-fleet
links a short migration note. `content.cjs review --acknowledge` remembers the comparison
in this clone. Unchanged guidance needs no repeated opening announcement.
Coordinate changes with other managers and affected writers. Preserve the mission's
meaning and voice, operator permissions, source pins, evidence, and useful local
choices. Update links and the “Working here” directions, check the changed paths,
and commit the cleanup separately from research findings. Git records what was
adopted; a short note can name the reviewed pack revision when useful. A different
layout alone is no reason to rewrite a functioning lab.

## During research

Pi: `/pe-report`, `/pe-usage`, `/pe-questions`, `/pe-version`, and `/goal`.
DSH: open the Persistent Eclipse card under the composer.

Activity builds itself from runtime receipts: tokens, cache rates, separate
reported/estimated costs, models and effort, worker timelines, conversation length,
and measured turn durations. `.research/activity/README.md` and its SVGs are the
Git view; `/pe-usage [lab]` and DSH's Activity view show live data. Background scans
append immutable `pe-activity-receipts/1` batches and update local previews.
Commit reviewed inputs and receipts; approved background sync combines and shares
them from a temporary snapshot, leaving the checkout and index alone. The manager
gets one notice at a turn boundary for incoming research and runs
`node .research/tools/sync.mjs` at a useful pause to adopt it. Report-only changes
count as synced. Receiving alone never re-renders another engine version's pages.
Credentials and unexplained large artifacts block publication as `needs-review`;
unshared citations remain advice in status views. Notices never wake an idle
manager or repeat at every tool step; delivery is remembered in this clone.
Drafts stay local and research conflicts
belong to the manager. `Auto sync: off` in LAB.md makes sharing manager initiated too.
Bad entries and newer formats are listed without blocking good data. Missing older timing stays unknown.
No hooks, extra model calls, or researcher bookkeeping.

`Fleet check: 5m` and `Progress check: 20m` in LAB.md control quiet checks; `off`
disables either. Checks encourage useful work and inspect missing progress.
They never stop a worker or resume a paused goal. Age alone isn't failure.
`Idle review: off` disables Pi's optional reviewer. `Housekeeping: 6h` sets upkeep.

Keep feedback and research in the lab. The engine repository is for engine and
pack changes. [Remote operation](REMOTE-OPERATOR-COMMS.md) covers sharing.
