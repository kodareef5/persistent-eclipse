---
name: pe-models
description: Check operator-approved models before choosing another voice or effort for a researcher.
---

# Choosing a voice

Start with the model you're running. Copies of yourself can do plenty of good
work. Another voice is useful when it brings something different: a fresh idea,
a fast read, or a serious attempt to knock down your favorite claim.

The operator's pe-model-notes has the longer, opinionated version: models that
fly, models that wander off, and why speed matters when there are only 24 hours
in a day. Keep those dated impressions in mind; let today's work change them.

## What can we use here?

Use your current provider and model by default. Before using anything else, you
need both working harness support and the operator's agreement to that exact
provider/model route. You can suggest a choice and explain why; wait for agreement
before running it. A configured key, enabled setting, catalog entry, or these field
notes alone doesn't grant permission.

Record the agreed routes under **Model permissions** in `.research/LAB.md`, with
who approved them, when, and any limits on tasks, spending, or effort. In a shared
lab, say which lab each approval covers. If nothing else is approved, write
“Additional models: none approved.” Re-read this list at selection time before every
launch that changes provider, model, or effort, including reviews, experiments,
and fallback choices. Check the exact route and effective effort against the
recorded task, spending, and effort limits. An omitted effort on a changed model
uses that model's default; it must still fit those limits. If that default is
unclear, select an explicit supported effort within the approval. Check exact IDs;
don't guess from a similar name or borrow another lab's approval. If the list is
missing or unclear, keep using your own model and ask the operator. Existing clear
approval stands within its recorded scope; it doesn't need to be requested again.

Inspect the tools the harness actually exposes. In Pi, `pe_list_models` lists
providers, then models and supported efforts. `pe_subagent` accepts optional
`provider`, `model`, and `reasoning_effort`. Omit them to inherit. On a changed
model, an omitted effort uses Pi's default for that model. Explicit unsupported
efforts are returned as an error, with the choices that work.

In DeepSeek Harness, use `list_subagent_models` when offered. Model selection
depends on the operator's subagent model-selection setting and allowed routes.
If the tool has no selection fields, keep using inherited workers. Mention the
setting once when another model would help; don't keep asking. A setting change
may need a fresh session. Model choice and agent preset are separate options.

Use exact provider and model IDs. A configured credential doesn't establish
quota or access for every task. If a launch fails, say what failed and choose a
workable next step; don't quietly pretend a substitute was the requested model.
Operator preferences about providers, spending, and effort still apply.

If you accidentally use an unapproved route, stop its workers and pending retries
as soon as you notice. Record the event in `.research/STATUS.md`: the actual route,
task, time, what ran, and any recorded usage; mark unknown usage as unknown. Tell
the operator plainly, and include a short reminder in each round summary until
they acknowledge it. Record that acknowledgement, then stop the reminders.
Acknowledging the mistake does not approve future use. Keep that route stopped
and continue the goal with your own model or an already-approved choice.

For wider discovery, the OpenRouter catalog at
https://openrouter.ai/api/v1/models lists candidates, prices, and capabilities.
It doesn't grant access in this harness. Check when exploring a new option;
the lab doesn't need a fresh leaderboard before every assignment.

## A few ways to use the choice

- **A fresh angle:** “We've spent three rounds assuming this reduction is
  necessary. Find a route that avoids it. Keep any useful failed attempts.”
- **A broad scout:** “Read these three components. Bring back two promising
  seams, the source anchors, and a small experiment we could try next.”
- **A skeptical reader:** “Check this claim from the pinned source and evidence.
  Find the smallest missing precondition that would change the result.”

Match effort to the question as well as the model. A quick pass may be plenty
for orientation; a disputed proof step may deserve a slower read. Effort names
belong to their providers, not a universal scale. Use the choices discovery
returns rather than transferring a setting from an unrelated model.

For a big finding, another model can take one of the existing pe-challenger or
pe-layered-challenge questions. Give it the evidence and room to reason afresh,
without the whole conversation celebrating the answer. Same-model review still
helps when that's what's available; describe it honestly. Agreement is a reason
to inspect the evidence, not a vote that makes the claim true.

Try a strong manager with fast scouts when breadth would help. Leave the scouts
room to surprise you, and keep investigating yourself. If everybody is busy but
nothing is getting clearer, zoom out before opening more slots.

## Across labs

Use HOST.md to describe what this lab can offer and any useful preferences:
“Fast code reads here; ask blackstone for a long solver run or a different model's
review.” No extra registration is needed. An unnamed lab can do this too.

Ask through the existing inbox. A steering lab offers evidence and suggestions;
the receiving manager chooses how to redirect its workers. Read changes relevant
to your question rather than every other lab's whole record. If handoffs start
getting lost, a temporary researcher can summarize the inbox and link the few
updates that matter. Stop that assignment when it stops helping.

When trying a new model, give it a few real questions while the main work keeps
moving. Keep a short observation beside the task or in HOST.md:
“Found the missing precondition quickly; needed help making a reliable test.”
Link the result when useful. pe-history already records model, effort, and usage;
tokens and finding counts aren't a quality score. Keep what works, and change
your mind when something better shows up.
