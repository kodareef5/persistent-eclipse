# Remote operator conversations

The inbox carries your direction into the labs; status reports carry their account
back out (see [Read the labs' status reports](#read-the-labs-status-reports)).

Use `.research/inbox/` in a **research lab's checkout**, sharing its approved private
research remote. This Persistent Eclipse package repository is not the lab inbox.
A message reaches other labs after it is committed and pushed, then pulled by their
managers. Managers read new messages before choosing work and pass relevant direction
to their workers. Delivery is eventual; it does not wake stopped labs or interrupt
running workers.

## Establish the channel once

Tell each manager directly, or have it record this agreement in `.research/LAB.md`:

> I will use `from: operator` messages in `.research/inbox/` on our approved private
> research remote to give research direction and discuss priorities. Read messages
> addressed to your lab or `all` when syncing. Reply with your understanding, any
> conflict or uncertainty, and what changes in your next work. Carry agreed direction
> into your queue and worker briefs. Existing mission, scope, and permission limits
> still apply; ask me directly about changes to those limits or uncertain authorship.

This is an agreed convention, not identity verification: anyone who can write to
the remote can type `from: operator`. Anonymous contributions remain welcome as
research input; the label alone does not grant operator authority. Inbox messages
also cannot satisfy a harness tool's requirement for a direct operator turn.

## Copy and paste: start a conversation

Fill the bracketed text, then paste this into an agent working in the research
checkout. Keep `to: all` for the fleet. For one lab, replace it with that lab's ID
from `.research/labs/`, for example `to: blackstone`. A list also works:
`to: [blackstone, redfox]`.

```text
Create a new Markdown message in this research checkout's .research/inbox/.
Name it <today's UTC YYYY-MM-DD>-operator-<short-unique-topic-slug>.md.
Create the directory if needed; do not overwrite an existing message.

Use this content:

---
from: operator
to: all
kind: request
state: open
---
# [Topic or requested change of focus]

[My question, direction, or consideration for the next research round. Say whether
this is a suggestion to explore or a requested change in priorities.]

Why: [Context, relevant findings, or what seems neglected.]

Each addressed manager: reply in a new inbox message referencing this filename.
Explain what you understood, what you will change in your next work, and any
conflict, uncertainty, or reason to take a different approach. Reflect the agreed
direction in your queue and worker briefs within the existing mission and limits.
For a fleet-wide message, leave this original open for the other labs to read.

Follow the lab's existing commit policy and pe-sync workflow. Commit this message,
run the normal push checks, and push to the approved private research remote and
branch from LAB.md if authorized. Preserve unrelated work. Report the message path
and whether it is drafted or sent; do not call it acknowledged until a lab replies.
```

No skill installation is needed to write the file. An agent without pe-sync can
leave it as a draft and ask the lab manager to include it in the next research push.

## Copy and paste: continue the conversation

Use the exact filename of the message you are answering. Address the replying lab,
or use `all` when the whole fleet should consider the follow-up.

```text
Create a new .research/inbox/<today's UTC YYYY-MM-DD>-operator-<unique-reply-slug>.md
in this research checkout. Do not overwrite or rewrite a sent message's body.

---
from: operator
to: [recipient-lab-id]
kind: reply
state: open
re: [original-message-filename.md]
---
# [Follow-up topic]

[My response, clarification, decision, or next question.]

Please reply with any resulting change to your plan or unresolved question.

Follow the same lab commit and sync policy as the original message. Report the
new filename and whether it is drafted or sent.
```

## Read the replies

Pull the research branch and look for inbox replies whose `re` names your message.
Each lab replies separately; one acknowledgment does not speak for the fleet. There
is no automatic per-lab delivery or read receipt. For a single-lab request, its
addressee can mark it `taken`, then `done` or `declined`. For a broadcast, keep the
original `open` while collecting replies; the operator can mark it `withdrawn` when
the conversation is closed or superseded. Send changed direction as a new message
referencing the old one.

The current linter may advise that `operator` has no `.research/labs/operator/`
folder. That is advisory, not a failed check; no dummy lab registration is needed.

## Read the labs' status reports

Pull the research branch and open `.research/SUMMARY.md`: a TL;DR, the decisions
waiting for you, where the labs stand, with unfamiliar terms explained for a reader outside the
specialty. For a lab's
own account, read its files in `.research/status-reports/`, named
`<UTC stamp>-<lab>-<trigger>.md`: what changed, what's next, what it needs from you,
and its numbers since the last one.

Each lab files a status report at every six-hour housekeeping check and when a goal
completes; a report from the last hour covers another automatic trigger unless something
important changed. Routine updates can be brief. Ask a manager for one at any time. `Status reports: off` in LAB.md stops
them. Answer a request in a report the usual way, with an inbox message that names the
report in `re`.

A summary is only as current as the last push. If one lab's report is newer than the
summary's `folds` list, `node .research/tools/status-report.mjs check` names it, and
the lab that wrote the summary last folds it back in.

