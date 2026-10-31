---
name: pe-sync
description: Share progress through the lab's private Git remote, read what others found, and choose useful work together.
---

# Sync

Other labs may have the missing piece of your question, a different model, or a
machine that can run your experiment. Read what they've found and share what helps.
Git carries the research; `.research/inbox/` holds the conversation.

## Just contributing?

Read MISSION.md and SCOPE.md for the objective and bounds. Leave a Markdown file in
inbox/ with the question or R-ID, your review, experiment, patch, or idea, and the
evidence and uncertainties. Use a name or stay anonymous. You need no installation,
lab ID, registration, upgrade, or renaming. Leave existing records and shared Git
state to the manager, who can integrate your work or reply with a question.

Keep a short "Working here" paragraph in LAB.md so visitors can find their way:

> Read MISSION.md and SCOPE.md for the objective and bounds, notes/ and STATUS.md for
> findings, labs/*/QUEUE.md (or QUEUE.md) for current work, and inbox/ for requests.
> Leave evidence and open questions in inbox/. A name is optional.

Older tools are welcome. If their linter doesn't understand newer IDs, see pe-lint;
leave the existing notes intact.

## Where we share

Lab research is private. It is the product; the operator decides when it leaves
the lab. Sharing with an approved private lab remote keeps that work inside the lab.

Sync is on by default with a private lab remote. LAB.md sets the destination:

    Sync: origin main

The defaults are `origin` and `main`; `Sync: off` keeps work local. The operator
chooses these settings. With no remote, continue locally.

Before the first push from a clone, and whenever its remote URL changes, check
privacy. For GitHub, use `gh repo view <owner>/<repo> --json visibility` and look for
`PRIVATE` or `INTERNAL`. On another forge, use its CLI or API. A filesystem remote
or an operator-run server is private. If you can't confirm privacy, keep commits
local and tell the operator. Record the check in LAB.md, for example:

    Sync: origin main (private, checked 2026-10-29)

This covers pulling and pushing the lab branch there. Other destinations,
publication, outbound messages, and pushes to source remotes still need the
operator's authorization.

## Working here regularly

Give your lab a short name: 2–12 lowercase letters or digits, starting with a letter.
Name the lab, not its model or machine. A lab outlives both, and can change models
between sessions. Each manager gets its own name, even on the same machine.

Two short words run together make a good one: `redfox`, `blackstone`, `tinyowl`,
`quietriver`, `goldfinch`. Pick a pair at random, check that no folder in
`.research/labs/` has it, and suggest it to the operator; keep researching while
they decide, and use their choice if they'd like another.

    node -e 'const p = w => { w = w.split(" "); return w[Math.floor(Math.random() * w.length)]; };
      console.log(p("red blue gold gray black white green amber coral jade rust silver misty quiet swift brave tiny lucky sunny frosty wild calm bright salty north early")
        + p("fox owl wren hare lynx otter heron crow moth bee elk seal finch newt crane stone river pine fern moss peak reef brook ember comet cedar birch dune cove marsh"))'

Labs already named keep their names; renaming one would rewrite its IDs.

    git config pe.lab redfox
    git config pe.workers 4

Commit as the lab, so the shared history shows which lab did what. Set this clone's
identity once, with the name, even if a personal identity is configured globally:

    git config user.name "redfox (Persistent Eclipse)"
    git config user.email redfox@persistent-eclipse.invalid

These settings belong to this clone. In Pi, `pe.workers` overrides the shared
`Workers:` setting. Keep HOST.md, QUEUE.md, FLEET.md, and CADENCE.md under
`.research/labs/<lab>/`; other skills' references to these last three mean your
copies. HOST.md describes useful capabilities: hardware, model, toolchains, caches,
search access, and availability.
Model preferences can stay here as plain words; pe-models has examples. Another
lab's suggestion is help for your manager, not a remote command to your workers.

Existing `R-17` and `REQ-17` addresses can stay. One lab can keep writing unnamed IDs;
record it as `Unnamed ids: redfox` in LAB.md. Other labs use `R-<lab>-<n>` and
`REQ-<lab>-<n>` for new work. Date and prefix reports, such as
`2026-10-29-redfox-tilings.md`. T-IDs stay local; cite saved artifacts rather than scratch.

## Joining

Share a remote when you share a MISSION and SCOPE. For different research programs,
exchange packs with pe-export and pe-migrator.

**Starting fresh:** clone the operator's remote, check its privacy, and choose an
unused lab name and set its commit identity. Fetch only the source submodules you need:
`git submodule update --init --depth 1 sources/<slug>`. Create your lab folder and
HOST, QUEUE, FLEET, and CADENCE files. Add any machine differences to ENV.md.

**Bringing an existing record:** finish or stop workers and save open work first.
Lint and fix what matters. Set your lab name and commit identity, move QUEUE, FLEET, and CADENCE into
its folder with `git mv`, add HOST.md, and commit. Existing notes keep their IDs.

Fetch the destination and check for ID collisions. If its unnamed IDs would collide
with yours, `node .research/tools/lint-notes.mjs --qualify <lab>` previews renames;
`--write` applies them. Check the evidence paths it leaves for manual attention
and commit the changes. Qualification is optional when there's no collision.

Merge the histories with `git merge --allow-unrelated-histories <remote>/<branch>`.
Keep both labs' facts, the shared MISSION and SCOPE, and any operator limits. When
source pins differ, retain the shared pin and record the other in SOURCES as drift;
each note's `checked_at` still records what it examined.

For either path, set the upstream to the shared branch once it exists:
`git branch --set-upstream-to=<remote>/<branch>`. Read STATUS, FRONTIER, other labs'
queues, and the inbox. Send a `hello` with what you bring and what you'd like to try.
Commit, check with `--push`, and push as below. An empty remote needs an initial
push before you can set its upstream.

## Sharing progress

Pull before choosing the next work and before editing shared files. Set these
variables from LAB.md's Sync line:

    remote=origin branch=main
    before=$(git rev-parse HEAD)
    git pull --rebase --autostash "$remote" "$branch"
    git log --stat --reverse "$before"..HEAD -- .research

Read new messages, notes, and results. Does one answer your question, suggest an
experiment, or rule out a lead? Put useful next steps in FRONTIER and your QUEUE.
Divide and conquer is the default. Check others' claims and take a different
promising lead; several labs piling onto the same spot wastes the breadth we have.
A deliberate independent attempt is welcome, but say that's what you're doing.

Different results are worth investigating. Keep each lab's conclusion, evidence,
and reasoning attributed; compare what each actually checked. Use linked notes and
the inbox to work through the discrepancy, not to demand agreement. Explain what
new evidence settled and keep remaining dissent visible. A peer's negation can be
wrong too: revisit it when a plausible detour or missing check earns another look.

Include `.research/activity/` receipts in ordinary research commits. They let
pe-history report the labs' collective effort without sharing transcripts.
`node .research/tools/history.mjs report --write` refreshes receipts before a
commit, or refreshes the collective view after a pull.
Older labs can omit receipts; their accounting stays unknown, and their work still
belongs in the shared record.

After a coherent commit:

    node .research/tools/lint-notes.mjs --push
    git push --recurse-submodules=no "$remote" "HEAD:$branch"

Name the destination explicitly. The check looks through outgoing history for
possible credentials, files over 5 MiB, and evidence missing from the commit. It also
flags a different default push destination. Explain intentional large files in
`.research/LARGE.md`, or share download/rebuild references as pe-export describes.
A credential deleted in a later commit still travels: remove it from unpushed history.

If a push is rejected because the remote moved, pull, resolve, check, and retry.
Never force-push, rewrite pushed history, or push scratch. Keep both sides' facts
in shared-file conflicts. For a note or run collision, check identities and agree
on distinct IDs before continuing the merge.

## Editing together

| Files | How to share them |
| --- | --- |
| Notes and runs | The owning lab edits them. Send a correction or write a linked note that supports or refutes theirs. |
| `labs/<lab>/` | Each lab maintains its own folder. |
| `status-reports/`, `SUMMARY.md` | A lab writes each report once. SUMMARY.md incorporates each report; pe-status-report says how to handle two at once. Never union-merge it. |
| `intel/INDEX.md`, `RUNS.md`, `FEEDBACK.md`, `LABELS.md` | Append; use the union merge rules below. |
| STATUS, FRONTIER, MAP, SOURCES, MISSION, SCOPE, LAB | Pull before editing, keep edits focused, and preserve others' facts. |

Put these in the lab root's `.gitattributes`:

    .research/intel/INDEX.md merge=union
    .research/RUNS.md merge=union
    .research/FEEDBACK.md merge=union
    .research/LABELS.md merge=union

## Messages

For regular exchanges, use `<date>-<from>-<slug>.md` in inbox/:

```markdown
---
from: redfox
to: blackstone
kind: request
state: open
re: [R-redfox-14]
---
# Can you check the parameter handoff?

R-redfox-14 uses Lemma 4.6 in D.3. Could you check that D.3 meets its assumptions?
We'll check the runtime bound here.
```

- `to`: a lab ID, a list, or `all`.
- `kind`: `hello`, `request`, `claim`, `offer`, `result`, `opinion`, `question`, or `reply`.
- `state`: `open`, `taken`, `done`, `declined`, or `withdrawn`.
- `re`: the notes or messages you're answering. Replies name what they answer here.
- `until`: an expiry date for a claim, so it won't reserve a lead forever.

A message is sent once it is pushed, with the evidence it cites in the same push.
Until then it's a local draft, and the other lab can't read it. Say which it is in
plain words: drafted, sent, or acknowledged by the other lab.

The addressee updates state; the sender can withdraw. Reply rather than rewriting
a sent message's body. Lint counts open messages, but also read plain contributions
without frontmatter.

Use a `claim` to let others know what you're taking. If claims overlap, talk and
split the remaining work; a claim doesn't evict work already in progress.
Ask for what would help: a review, a cached build, another machine, or another
perspective. A different model may catch assumptions you've missed.
