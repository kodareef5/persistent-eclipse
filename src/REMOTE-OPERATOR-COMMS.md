# Keeping in touch with a lab

Give the manager a difficult question and room to investigate. Use plain words to
steer it. Put lasting directions in `.research/MISSION.md` or LAB.md so they survive
a long conversation. A paused or restored goal needs an explicit resume.

## Questions and feedback

Agents can leave questions without stopping independent research. Pi's footer and
DSH's PE card show how many await an answer.

In Pi, use `/pe-questions`, then `/pe-questions Q-id your answer`.
In DSH, answer in the card. From the lab directory you can also run:

```sh
node .research/tools/questions.cjs list
node .research/tools/questions.cjs answer Q-id "your answer"
```

Answers arrive between turns and remain in `.research/questions/`. Silence is not
permission. Workers can ask from their task area; the manager brings the question
into the shared record. An answer is delivered once in each lab clone.

## The research report

Use pe-status-report for useful Markdown contributions in `.research/updates/`.
Managers can edit, combine, or archive them; Git keeps the history. A short feedback
line can still go in FEEDBACK.md. `.research/REPORT.md` combines these inputs and
open questions. `/pe-report` in Pi and Report in DSH show the live preview.

Commit reviewed inputs; private sync combines labs' contributions and rebuilds the
report and activity charts for the remote. Routine refreshes only append receipts
and update local previews. Bad or newer-format entries remain listed for attention
without hiding good data. Model accounting uses versioned batches per lab; research
notes stay Markdown. No Git hooks are installed.

For a manual build, run `node .research/tools/history.mjs report --write` and
`node .research/tools/record.cjs build`, then include the generated files with
their inputs. `/pe-usage [lab]` and DSH's Activity view show current accounting.

This replaces the need to maintain SUMMARY.md and dated operator reports alongside
one another. Existing reports remain linked. A short contribution can point to a
long proof or experiment; there is no artifact size limit.

## Sharing privately

Each lab uses its own approved private Git remote. Record the destination in LAB.md:

```text
Sync: origin main
```

After checking the remote's privacy, approve its exact URL in that clone:

```sh
git config pe.syncApprovedUrl "$(git remote get-url origin)"
```

The manager commits reviewed research. Background sync combines committed inputs,
commits rebuilt views, and pushes; `node .research/tools/sync.mjs` runs it now.
Drafts and staged work stay untouched. Lab status shows pending work and research
conflicts for the manager to reconcile. Sync never force-pushes. `Sync: off`, or
no remote, keeps work local.

Transcripts, scratch, credentials, and caches stay local. Cross-lab requests go in
`.research/inbox/`. Research findings and feedback do not automatically go to the
Persistent Eclipse source repository or become public.

## Changing the installation

Reload Pi or restart DSH after updating the package. Let active workers finish
first; Pi reload stops them and leaves recovery notes in their scratch folders.
Use `/pe-version` to check the loaded installation. Keep a prior tested revision
and your settings backup when trying an experimental version.

An older lab starts with a guidance-review notice. Its manager compares the named
conventions before dispatching researchers, coordinates useful cleanup, then
acknowledges the review. Restarts don't repeat it unless relevant guidance changes.
LAB.md keeps its name; no automatic migration rewrites your mission or source pins.

Sharing policy is visible in the Pi footer and DSH card. `Sync: origin main` plus
an approved private URL allows background publication of reviewed commits.
It leaves working files and the index alone; the manager runs
`node .research/tools/sync.mjs` at a useful pause to adopt incoming changes.
`Auto sync: off` makes publication manager initiated too. Both paths
check outgoing history before publication; `needs-review` names what to fix.
Unshared citations are advice and don't block sharing.
