# Building Persistent Eclipse

Edit `src/` and push to main. The `build` workflow runs `python3 src/build.py`,
tests the result in Pi, and commits the regenerated `cordis.patch.yml`
back to main. A push that hand-edits the generated file so it no longer matches
`src/` fails instead of being overwritten. `gh workflow run build.yml` runs it on demand.
It runs on GitHub's ubuntu-latest. A repo variable `PE_RUNNER` can name a self-hosted
runner for pushes and manual runs; pull requests always stay on ubuntu-latest.

To check locally, including DSH, which CI cannot reach:
``` src/check.sh "$(npm root -g)/@deepseek-ai/dsh/lib/bin.js" ```
Use an installed DSH, or a checkout's `apps/cli/lib/bin.js` built from current DSH; an
older fork can lack subagent settings the bundle uses.

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

Multipart skills keep their master in `src/skills/<name>.md` and named tables and field
notes in `src/skills/<name>/<file>.md`; every slot needs a file and every file a slot.
Skills stay short and the libraries stay complete:

- `{{sample:<file>}}` shows a table's heading and first three rows (`:<n>` for another
  count), then `+N more in notes/<file>.md`. Put the best rows first.
- `{{note:<file>}}` names a prose field note, such as pe-math's Lean and software notes.
- `{{table:<file>}}` still inlines a file whole, for text every reader needs.

Sampled and named files ship as `notes/<file>.md` beside the skill. Pi writes them next
to each SKILL.md and names the folder when it pastes a skill into a worker's prompt; DSH
writes them to a folder named by their hash and serves it as the skill's resource base,
which DSH's skill tool tells the model to resolve against. Muse's 24 tables and math's
nine are samples now. Edit these sources and run `python3 src/build.py`.

## Missions

Four mission texts live in `src/missions/`; kickoff writes the chosen one to a lab's
MISSION.md verbatim. Blue Team is the default, Red Team hunts for a critical, Math Team
studies mathematics, and Signal Hunt (`Mode: signals`) runs a standing research desk
on a field. Pi gives a worker its mission's guide skill along with pe-git-research:
pe-patch for Blue, pe-math for Math, pe-hunt for Signal Hunt.

Signal Hunt came from the `pe-signals` package. Its skills are pe-hunt (running the
desk), pe-osint (sources and pivots), pe-forecast, and pe-judge; its scopes, desks,
cadence, record mapping, plays, and resource catalog are pe-hunt's and pe-osint's
field notes. The forecast ledger, `src/ledger.mjs`, is placed in every lab like the
other tools. The HN collector and its measurement note are pe-forecast notes; the
collector is copied in when a research question calls for it, and the note
illustrates measurement limits, not a required forecasting program.
`src/test-signals.mjs` covers both tools and the lead-note example. A lab built on
the package keeps working: its MISSION.md still names `signals/` files, which its
submodule still has.

## Signals fieldbook

The operator's Round 2 research pack is integrated as on-demand notes, not extra
system instructions. Start at [the fieldbook](skills/osint/fieldbook.md) for tools,
21 investigative plays, published research examples, expert feeds, and how far
they were checked. [Catalogs](skills/osint/catalog.md) include specialist trade, health,
law, editorial, and geospatial sources. [Desk sketches](skills/hunt/desks.specialist.md)
and [fictional output specimens](skills/hunt/output.specimens.md) sit beside pe-hunt.
The existing build ships these files beside their skills; nothing installs a
collector or starts a scheduled job. API access is not implied by a documentation
check, and product descriptions are not independent evaluations.

The pack is *PE Signals — Field Research, Round Two* (2026-10-31),
`pe-signals-research-round2.zip`, nine Markdown documents, SHA-256
`ee89ee23a5438804952e3702f8087bcf9abb6ab9ec036090660ef7bac03447e0`. Its atlas is merged
into the subject catalogs; its package migration proposals and blanket promotion and
test requirements were left out.

## Runtimes

- DSH loads `cordis.patch.yml` (`package.json` `dsh.bundle`).
- Pi loads `extension.ts`, which reads `cordis.patch.yml` (`pi install <this repo>`).

DSH holds goal rounds until a manager's workers settle, so a stuck worker would leave
its manager waiting in silence. `src/supervise-dsh.js`, embedded in the bundle's host
hook, gives DSH the same two quiet checks as Pi during an armed goal: the fifteen-minute
fleet check (two free slots under `Workers:`, or a worker past about 67 minutes, named
as red) and the six-hour housekeeping check, whose clock is the last reminder in the
session or the goal's creation. Checks wait while the manager works, spend no goal
round, carry no operator authority, and stop no worker. `src/test-supervise-dsh.mjs`
exercises them against real DSH goals and subagents. Pi's footer, idle reviewer, and
`pe_send_message` interrupt remain Pi-only; DSH managers interrupt with `interrupt_agent`.

Installed as a DSH package (`dsh plugin --profile web add`, with `persistent-eclipse`
in the profile's bundles), PE also shows a pill under DSH web's composer, beside its turn
and token stats: `Persistent Eclipse`, one dot cell per subagent slot, and completions.
Slots are DSH's own parallelism limit (Settings → Subagent, `maxActiveSubagents`). Cells
use `src/cells.mjs`, so ages and colors match Pi's footer; the gap travels while the
manager works. Clicking opens a card with each researcher's age, then the lab's disk use,
sync remote (size, commits to pull and push), and inbox, measured on the host by
`src/lab-status.mjs`, which Pi's footer shares. `src/dsh-client.js` is the browser source;
`build.py` inlines the cells and writes `dsh-client.js` in DSH's module-loader format.
`dsh-host.js` serves the card's `/persistent-eclipse/lab` route behind DSH's browser
authentication, and `dsh-ui.patch.yml` adds the plugin entry only for the installed
package, so `cordis.patch.yml` still works as a plain patch layer. The pill appears in
sessions running the Persistent Eclipse preset; DSH's terminal UI and Pi are unaffected.

Pi checks its package at startup, hourly, and on `/pe-version`. It compares SHA-256
hashes of `extension.ts`, `cordis.patch.yml`, `package.json`, and the imported history,
retry, integrity, and footer-cell modules with their installed Git commit. It fetches the package's
`origin/main` to distinguish an available update from local or divergent commits.
Changed files, unavailable verification, and updates show a notification and a short
footer notice. An installation updated while Pi is running requests a reload; it
does not claim the already-loaded code has updated. `/pe-version` includes commit IDs
and combined runtime fingerprints. The check never installs or repairs anything.

This detects drift, not malicious tampering with the checker, local Git, or upstream.
It does not verify dependencies, extracted skill caches, or tools copied into labs.
A copied package without its own Git metadata is unverified; an unreachable remote
leaves freshness unknown. Notifications do not block research or grant agents
permission to edit the installation. Stronger authenticity would need a trusted
verifier outside the plugin and signed releases or separately trusted hashes.

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

Pi supervises the manager with few, quiet checks during an armed goal. None of them
spends a goal round or interrupts a turn, and none stops a worker. The fleet check,
housekeeping, and idle reactions appear in the chat log under their own labels.

- **Fleet check.** A manager idle for fifteen minutes with workers running gets a
  brief check when at least two slots are free or a worker passes about 67 minutes
  (its footer cell red). It lists each worker's age and current activity with its own
  timer, and names each red worker to look at. Each check the manager waits through
  doubles the next interval, to 30 minutes and then hourly; a worker launch or
  completion, or the operator speaking, returns it to fifteen. Manager activity resets
  the timer; paused, blocked, completed, and restored-but-disarmed goals receive none.
- **Housekeeping.** Every six hours, a sanity check: come up for air, tidy, and
  reevaluate the question. Its clock lives in the session (the last reminder, or the
  session's first goal), so reloads, restarts, and resumes don't push it back. It
  arrives between turns, or takes the next idle check while the manager waits on workers.

Housekeeping and a completed goal also ask for a lab status report (pe-status-report).
The manager can write a routine update directly; substantial reviews can go to one
worker on the manager's model and effort. Reports explain the findings to a reader
outside the specialty, with a short TL;DR and explanations where needed. Each goes in
`.research/status-reports/`; `.research/SUMMARY.md` incorporates reports across labs.
Update the parts that changed rather than rewriting it every time. The manager commits
the report and summary together and pushes; a report is filed only once committed.

`src/status-report.mjs`, placed in labs like the other tools, keeps the numbers out of the
model's hands. `stats` prints each report's Numbers block since the lab's last report:
commits by lab identity, note state changes, new artifacts, inbox traffic, disk, the sync
remote, and history.mjs's own row for the lab. Record counts use one pinned commit;
uncommitted changes are excluded and flagged. Receipts and disk are measured live.
Receipts carry no time, so each report records `totals:` and the next subtracts. `check` names any lab's newest report the
summary misses, for the lab that wrote it last. It doesn't depend on a lab's lint copy,
and once one lab commits it, every lab sharing the record can run it. In DSH, the
completed goal's request arrives as an automation task.

`pe_send_message` with `interrupt` stops a worker's current command or reply and
delivers the message in the same session and scratch; a plain steer waits for the
current command. `pe-git-research` asks for bounded runs and the manager's go-ahead
for anything over an hour.

When the manager finishes a reply during an armed goal with workers still running,
Pi can ask for a fresh-context idle review. It inherits the manager's model and
effort, uses no tools or worker slot, and reads the full mission and limits plus
the objective, latest reply, worker state, short record excerpts, and recent
reactions. It returns at most 280 characters of advice, or `WAIT`, which stays silent.
The prompt in `src/idle-review.md` offers research, negation review, peer challenge,
cautious consolidation, upkeep, and creative reframing as optional lenses. Its
encouragement examples are inspiration, not a rotating script.

Reviews are at least fifteen minutes apart, including after reloads. They use one
request with a 90-second timeout and a 16,000-token output limit, since reasoning
counts against it; provider reasoning budgets follow the inherited effort. No retry or
model fallback is added. If the
manager has moved on, the reaction arrives as a steer after its current tool call. The
operator speaking, goal changes, model changes, reloads, and shutdown discard it.
Oversized input is skipped with a notice. A cut-off, overlong (past 600 characters), or
repeated reaction is skipped, and its transcript records why. In a shared lab the review
reads this clone's queue, fleet, and cadence from `labs/<pe.lab>/`, names each file it
read, and leaves out files that don't exist. Reviews spend no goal round;
they are advice, not operator instructions. `Idle review: off` in LAB.md disables
them. Local transcripts live under `.research/local/idle-reviews/`; pe-history
counts their reported usage under the `idle-review` role.

Workers get guidance for short, relevant work while background experiments run.
An in-flight command or reply is not an idle event; completed workers return their
results. Workers do not start their own automatic reviewers.

Pi's `pe_archive_agents` hides completed workers from `pe_list_agents` once they
finished over six hours ago and at least ten newer workers have launched in the
session. It preserves the completed count, task IDs, and all files. This is fleet
list cleanup; disk cleanup remains a separate housekeeping task.

Pi's footer gives each worker slot a cell: a dim ⣀ when free, and for a running worker
a full braille stack whose color ramps smoothly through light yellow, blue, green,
orange, red, and dark red, about 16.7 minutes each, and blinks dark red from 100
minutes. While the manager works on a turn, one two-dot gap travels the whole row on a
shared clock: up and around each running cell from its bottom-left, across each free
cell's two dots, then a short rest before it starts again. Between turns the footer
stands still, as Kimi Code's does: the terminal owns text selection in Pi's regular
mode, and any redraw can drop a selection in progress. A still footer refreshes once a
minute and writes only when its text changes; the news ticker plays every three
minutes during turns and at most every ten between them. `src/cells.mjs` holds the
cells; `node src/preview-cells.mjs [--fast] [--still]` previews them in a terminal.
The fleet list and fleet checks name red and blinking workers for the manager, which
cannot see the footer, and ask it to inspect them; age alone is not failure.
