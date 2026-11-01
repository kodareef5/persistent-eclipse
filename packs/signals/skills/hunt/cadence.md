# Commitments, plans, and the manager's next decision

The operator sets the service. PE's manager chooses and steers the work. The desk's
library supplies research guidance, examples, and collectors; it does not start managers,
allocate worker slots, or terminate investigations at a reporting boundary.

## Expectations, intentions, and actual work

| Layer | Existing PE record or capability | What it answers |
| --- | --- | --- |
| Operator expectations | SCOPE / CADENCE | What is promised, for whom, when, at what priority and budget? What time is protected for investigation? |
| Manager intentions | QUEUE / FLEET / STATUS | What was planned, what changed, and what should happen next? |
| Execution | Live worker list, completion notices, artifacts, collector observations | What is actually running, blocked, finished, or ready for review? |
| External conditions | WATCH | Which event or source change deserves another look, and when was it last checked successfully? |

The manager reconciles these using `pe-fleet`. A task board describes intent; a
live worker list and returned artifacts establish current execution. A row marked
“active” is not proof that a worker survived an interruption. After resuming, inspect
actual workers and partial results before relaunching anything. Preserve useful
work, update stale assignments, and explain changed priorities in STATUS. When a
record has both a current overview and dated history, refresh the overview or label
it historical; appending an event does not update an old last-success table.

[Example CADENCE](cadence.example.md) expresses expectations in ordinary prose.
It is not an executable prompt format. Keep it short enough to inform briefs;
SCOPE owns recurring report paths, sections, and review requirements. In shared
labs, use PE's lab-local QUEUE, FLEET, and CADENCE records.

## A conditional plan, not another scheduler

Add a next trigger and intended action to QUEUE when that makes the plan clearer.
Keep the question, evidence anchors, dependencies, and completion criteria PE
already expects. The following rows illustrate a four-slot analyst desk; the IDs
and times are examples, not reserved identifiers or universal deadlines.

| Task / question | Plan state | Next trigger | Manager's intended next action |
| --- | --- | --- | --- |
| T-42: Is the processing constraint real? | Working | Worker result | Read the evidence; decide whether independent challenge is useful |
| T-43: Do earnings change existing exposures? | Working | Worker result | Update the watchlist and briefing inputs |
| T-44: What defeats the beneficiary thesis? | Working | Worker result | Compare objections with the current thesis |
| T-45: Which suppliers depend on this facility? | Ready | Next free slot, if still useful | Launch a bounded relationship investigation |
| T-46: Closing report | Planned | Before 15:40 America/New_York on the selected trading day | Reassess capacity and prepare the agreed 16:15 handoff |
| T-47: Revisit financing assumptions | Waiting | New filing received | Check what changed before reopening the thesis |

Here three workers are active and one slot is free **only if the live list confirms
it**. The manager can start T-45 now, reserve capacity as the report approaches, or
revise either decision when evidence changes. A trigger asks for attention; it
does not automatically launch a worker or preempt another assignment. Tonight's
deep-research block and next weekend's sector review can stay in CADENCE until they
need concrete tasks. No task row is required for every future thought.

Use the harness's existing task list for immediate steps and PE's records for
commitments that must survive a session. In Pi, `pe_list_agents` and completion
notices expose workers; other harnesses use their equivalent fleet tools. Do not
poll to wait or treat an available slot as a reason to invent work.

The same convention applies in any PE lab: a cyber manager might review after a prover
returns; a math manager might revisit a theorem after a lemma or counterexample;
a Signal Hunt manager might reopen a thesis after a filing. A generic plan viewer or
new wake-up capability belongs in PE if ordinary records become cumbersome.

## Reports coexist with investigations

Before a service window, assess what can honestly be delivered and preserve the
restart point of displaced work. A short briefing links to the developing sector
map or argument dossier. Those artifacts can continue across many report windows;
their structure and milestones follow the investigation.

The manager checks the promised report's destination, nonempty content, required
sections, evidence, and coverage before marking it ready. Keep three statements
separate: work finished, artifact reviewed and ready, and delivered or acknowledged
through an authorized channel. A file on disk proves none of the latter by itself.
Record the path, cutoff, review result, and any known handoff in STATUS or the
existing delivery record. Do not infer delivery or send anything without authority.

When a report is late, a check fails, or capacity is insufficient, make the missed
commitment visible with its cause and next decision. Give the operator a qualified
partial report or a revised expectation through the agreed channel. Keep failed
attempt time separate from last success; a recovered feed cannot erase a gap.

## Wake-ups belong to the harness or host

An inactive manager cannot read a Markdown deadline. Unattended commitments require
a configured wake-up and a way to notice when it fails. PE's goal continuations,
fleet checks, and housekeeping help an active lab keep moving; they are not a
calendar scheduler and do not guarantee a report at a particular time. Use scheduling
tools only when the operator requests them, as `pe-fleet` directs.

A wake-up should ask the manager to reconcile commitments, actual workers, and new
evidence. It should use the existing manager where supported, or resume with the
durable record, while avoiding competing managers. It should not choose subagents,
write the report brief, or kill useful research because a clock interval ended.
Verify the actual adapter's continuation and overlap behavior before promising
unattended delivery; PE does not supply such an adapter.

The optional HN collector only records observations and coverage. It does not
manage researchers or fulfill a report.
