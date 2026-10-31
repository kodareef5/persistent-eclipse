---
name: pe-forecast
description: Think ahead, design observations that can test a direction, and learn from what actually happens. An optional ledger helps with resolvable forecasts.
---

# Forecast

What would happen if this explanation were right? If it is already happening, how
would you tell? What could you observe now that would change the next choice?
Start there. Forecasting helps the lab ground a direction while evidence is still
incomplete. A probability, a leaderboard, or a pile of predictions is not the goal.

## Find a useful test

Speculate about outcomes, mechanisms, and alternatives. Work backward to something
you could look for: a changed filing, a new dependency, practitioners independently
reporting the same problem, a constraint easing, or a promised capability appearing.
Seek observations that distinguish explanations rather than merely fit the favorite.

Try several approaches when the question deserves them. Compare with historical
attempts or a sensible baseline; check whether that comparison really fits. Collect
more evidence, reconsider the plan, and improve the next question. Confidence will
not always come easily or from one decisive test. Say what you still cannot tell.

For a useful expectation, leave enough in the existing note or task to return to:
what you expect and why, what would count against it, where to look, and when or
under what event to reconsider. A conditional argument or a few possible outcomes
can be more honest than a number. Use a numerical forecast when the question and
available evidence support one; do not manufacture a probability for every lead.

## Make the observation mean something

Distinguish the thing you care about from its proxy. Attention is not adoption;
adoption is not usefulness to this operator. A change in a count can suggest where
to investigate without answering the underlying question.

If you score a forecast, define the outcome and window before it happens. Preserve
what was knowable when you made it. Record missing observations and ambiguous
outcomes as such. When comparing methods or labs, check that their questions,
timing, and information are comparable; report missing coverage. An easy sample
or hindsight can make a poor method look convincing.

The HN example ({{note:hn-measurement}}) shows these difficulties on a cheap
observable event. Use it for inspiration when designing a test for your own
mission. There is no standing assignment to guess HN rankings or fill a daily quota.

## Learn, including from disagreement

Return to important expectations. What happened, what did you miss, and which part
of the reasoning held up? Did the evidence change your choice? Keep a failed
expectation when it teaches something; revise the explanation, not the old record.
Look at dismissed ideas too, especially a surprising success you ruled out too fast.

Keep different labs' positions and their reasons. Compare source dates, definitions,
observations, and assumptions. Investigate the hinge rather than averaging away the
split. Explain what was settled and retain any remaining disagreement. That may be
the most useful signal in the work. A score cannot do this reasoning for the lab.

## Optional tools

For repeated, resolvable numerical questions, `.research/tools/ledger.mjs` records
forecasts and resolutions and computes simple scores. {{note:ledger}} covers its
commands, comparison limits, and preserving disputed resolutions. Ordinary research
notes are enough when a ledger would add no useful information.

The HN collector {{note:hn-collect.mjs}} is a small observation example. Copy it to
`.research/tools/hn-collect.mjs` if your work needs it. Collection or scheduling follows
the operator's limits; collecting data does not mean an agent reviewed it.

## Tool copy

The runtime places the ledger in `.research/tools/`. Its shipped SHA-256 is
`{{ledger.sha256}}`. A `.shipped` file beside it is a runtime copy for comparison, not
necessarily newer; pe-fleet covers updates. Never retype the tool.

```js ledger.mjs
{{ledger.mjs}}```
