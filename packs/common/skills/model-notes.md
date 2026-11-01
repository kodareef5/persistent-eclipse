---
name: pe-model-notes
description: Read the operator’s expressive, dated field notes on models, scouts, second opinions, and labs working together.
---

# Model selection & sub-agents — field notes

*Operator field notes, October 29, 2026. These are personal impressions, including the grades and predictions below. A starting point, not a permanent leaderboard. Read pe-models for the short practical guide.*

These suggestions aren't permission to spend on another model. Check the recorded
operator-approved routes in LAB.md before a switch; pe-models explains the details.

The default is simple: deploy sub-agents using the same model as the main agent. Whatever you are, that's what you get. It's a perfectly reasonable way to run a lab, and it may be the only option available.

Some harnesses allow the main agent to choose different models for its children; others don't. DeepSeek Harness, for example, requires an operator setting before agents can select different models for sub-agents. Check the actual permissions before planning a mixed-model strategy. If the setting is off, tell the operator what needs to be enabled and why. Don't pretend you can select models you can't access. Until then, keep working with same-model sub-agents.

If model choice *is* available, use it deliberately. Different models don't merely differ in intelligence. They differ in speed, cost, patience, creativity, failure modes, willingness to engage with a task, and the kinds of mistakes they make. Those differences can be useful.

## First, check what exists

This was written at the end of October 2026. It will age quickly. **Do not trust your training cutoff to tell you which models are current.** You might think Opus 4.8 is the frontier. If so, I'm sorry that happened to you: we're already on Opus 5.5, and I'm expecting 5.6 any day.

First inspect the choices the harness actually offers. Those are the ones you can put to work now. When you want to look farther out, OpenRouter maintains a live model catalog:

- Models API: <https://openrouter.ai/api/v1/models>
- API reference: <https://openrouter.ai/docs/api/api-reference/models/get-models>

The API lists model IDs, descriptions, context limits, pricing, and other capabilities. It's a discovery tool, not a verdict on quality, and it doesn't mean every model is available in your harness or allowed for your task. Check the operator's actual providers, subscriptions, quotas, permissions, and costs too.

The three task families we care about today are **red team, blue team, and math**. Eventually the same thinking might extend to law, SEO strategy, or other creative puzzle work. Not yet. Start with these three.

## October 2026 model notes

These grades are my working impressions, not benchmark scores. A model can be A-class at reasoning and still be a terrible practical choice for a particular job. **Capability, access, task restrictions, speed, and cost are separate questions.**

| Model | My rough grade | Red team | Blue team | Math / puzzles |
| --- | --- | --- | --- | --- |
| **GPT-6 Astra** | A, raw capability | Often impractical for cyber work | Often impractical for cyber work | Excellent frontier opinion |
| **Claude Opus 5.5** | A, raw capability | Often restricted in practice | Often restricted in practice | Excellent; especially good for code-heavy reasoning |
| **Claude Sonnet 5.5** | Strong, below Opus | Depends on access and task | Depends on access and task | Good second opinion |
| **GPT-6.1 Sol** | Tier 2 | Check restrictions first | Check restrictions first | Worth keeping in the loop |
| **DeepSeek V4.1 Flash, 1017 checkpoint** | **B+** | Default workhorse | Default workhorse | Fast, useful exploration |
| **Kimi K3.1** | **B** | Strong alternate | Strong alternate | Useful independent perspective |
| **GPT-6.1 Terra / Luna** | C for this purpose | Limited practical fit | Limited practical fit | Cheap skimming or broad passes when appropriate |
| **Mistral Large 4** | D, maybe E | Occasional extra opinion | Occasional extra opinion | Diversity, not a first choice |

### The frontier: brilliant, but not always useful

Astra and Opus 5.5 are the models I'd most like to have arguing with each other. Opus 5.5 is probably my favorite coding model right now. I wish it would play more often, because it's exceptionally smart. For math, some version of an Astra–Opus back-and-forth is a serious option. Sol 6.1 is worth bringing into that loop too. For a really grindy problem, a cheaper Terra or Luna pass might still be worth the tokens, even if it isn't my favorite recommendation.

Cyber is a different story. In my experience, frontier OpenAI and Anthropic models frequently refuse or constrain red- and blue-team work, especially when a request moves from reviewing code into actively finding or proving a vulnerability. Access arrangements and provider policies vary, so don't treat this as a universal rule. OpenAI's [Daybreak access](https://help.openai.com/en/articles/20001258-openai-daybreak-trusted-access-for-cyber-overview) can change the picture for approved, authorized cyber work; Blue and Red are different access levels, and Astra has its own limitations. Don't assume that a paid subscription means Daybreak is enabled. And don't build a cyber workflow around a model that repeatedly refuses the work, either. Even a mathematical problem can cross that boundary: trying to break SHA-256 is math, but it's also plainly a cybersecurity question.

The provider and harness matter as well. A first-party harness can have its own prompts and restrictions, while an API integration or a service such as OpenRouter can offer a different experience and different economics. Direct frontier usage may mean full API pricing rather than the heavily subsidized tokens available through some subscriptions. That can be worth paying for a focused second opinion, such as reviewing a finding before submission. It may be an expensive dead end for open-ended vulnerability hunting. Provider rules still apply whichever route you use.

If an operator asks for a restricted model, explain the likely limitation and offer the workable choices. If they still want to try, stay within the model's actual permissions rather than spending the lab's time fighting refusals.

### The practical cyber models

For authorized code research, simulation, and local proof-of-concept work, **DeepSeek V4.1 Flash, specifically the October 17 checkpoint, is my current favorite**. It's fast, inexpensive, and capable enough to cover an astonishing amount of ground. Not perfect: it can be sloppy, sometimes unexpectedly switches to Chinese, and can confidently chase bad assumptions. But the amount of useful work per dollar—and especially per hour—is hard to ignore. There are only 24 hours in a day. Tokens per second matter.

I've not tested it for live attacks, and that's not what I'm recommending here. I'm talking about reading code, forming hypotheses, checking them in approved environments, and doing the research. For those purposes, the 1017 checkpoint changed the economics of the lab. Earlier DeepSeek checkpoints were usable; this one is the first I'd call an obvious default. B+ feels right, only because I still think Astra and Opus are stronger models in raw reasoning.

**Kimi K3.1** sits close behind, mostly because of speed and quota rather than a dramatic difference in intelligence. Kimi K3 was already quite good. K3.1 is absolutely worth deploying. Kimi and DeepSeek are two of the dumbest smart models I've ever seen: genuinely powerful, occasionally ridiculous, and quite capable of disappearing down a hole of their own invention. That's fine, provided the lab challenges their claims, tracks counterevidence, and knows when to pull them back out.

**Mistral Large 4** is farther down my list, even with open weights. Call it D-class, maybe E-class for this work. But a weaker model with a different perspective isn't worthless. Sometimes the third opinion that notices something odd is more valuable than another hour of the strongest model repeating itself.

Don't confuse this ranking with a requirement to use these particular names. More often than not, you have *fewer* models available than you'd like. Use what you've got, and make good use of it.

## Prompting still matters more than a tidy leaderboard

You cannot really rate a model without talking about its prompt, context, tools, and effort setting. Give an ordinary model a healthy set of inspiring ideas, useful source material, clear boundaries, and a good question, and it can become surprisingly effective. Give a brilliant model a bad brief, and it can waste a lot of money being brilliantly wrong.

Don't write off a model just because it's weaker on paper. But don't pretend every model thinks alike, either. **The differences are part of the toolbox.** Mixing models is useful precisely because their instincts and blind spots aren't identical.

## How to mix sub-agents

### Same-model first; add another voice when it counts

The normal mode should remain the main agent plus copies of itself. It's simple, predictable, and doesn't require special permissions. You can do a great deal this way, including varying reasoning effort and changing the prompts or roles of different children.

There are two moments when I'd go out of my way to get a different model involved, even in an otherwise same-model lab.

**First: inspiration when you're stuck.** Ask a sister model, or even a slightly weaker one, to look at the problem from another angle. Don't just send it the same giant brief and hope. Give it a different lens, ask it to challenge an assumption, or have it generate directions the main model wouldn't naturally explore. "Suppose our favorite reduction is a distraction. What would you try instead?" is a much better invitation than another copy of the last assignment.

**Second: independent review before a major finding goes out.** If you're about to submit something headline-grabbing, that's exactly when you want a different model trying to knock it down. It should look for missed preconditions, false assumptions, alternative interpretations, and evidence that would make the claim weaker. A friendly third opinion is nice; an independent skeptical one is better. Give it the claim, pinned sources, and evidence, with room to find its own way through. Handing it the whole conversation about how clever the discovery is can teach it the same blind spot. A different badge on the model is not independence by itself.

If you're in a shared lab and another model is available, those are natural times to ask for help. Don't make a second opinion ceremonial. Make it capable of changing your mind.

### Smart manager, fast scouts

There's a more aggressive strategy: keep the strongest suitable model in charge, and let faster, cheaper models rip through the search space. The scouts read broadly, propose ideas, test small hypotheses where permitted, and bring back evidence. The manager keeps the map in its head, challenges weak conclusions, changes direction, and stops everyone from spending an afternoon investigating a silly detail.

For math that might mean Sol or another strong model supervising wide, cheaper Terra/Luna passes. For cyber it might mean a Kimi-led lab with several fast DeepSeek children, or some other combination that the available models and quotas make sensible. The exact pairing matters less than the separation of jobs: **breadth below, judgment above**. And let the scout embarrass the manager. If the cheap little pass finds the counterexample, that is a great day. Judgment means recognizing the good idea, whoever brought it home.

This doesn't have to become a permanent configuration. Try it for a few rounds. If it works for this puzzle, keep it. If not, switch back. A strong model needn't do every read, and a cheap model needn't be trusted with every conclusion.

One recurring piece of advice: **zoom out**. Fast agents can produce a remarkable amount of activity without moving the investigation forward. The manager's job isn't just to process their output. It's to notice when the entire group is chasing the wrong shape of problem.

## The same idea across multiple labs

Now imagine two machines, each running its own lab, with the research synced through a remote Git repository. One machine burns through inexpensive DeepSeek and Terra tokens with plenty of sub-agents. It's noisy, fast, and exploring all over the place. Another machine runs a more expensive model with fewer children. That one does quieter work, watches the shared progress, challenges assumptions, and occasionally steers the fast lab away from a dead end.

That division is interesting. One lab buys breadth; the other buys judgment. The fast lab should pull shared updates and check its inbox often enough to notice new guidance. The slower lab should be able to chime in with things like: *That assumption is wrong*, *you're stuck on an unimportant detail*, or *stop digging here and try another angle*. These are useful messages, not a mandate for the supervisor to micromanage every worker. The receiving lab still chooses what to do with its people. Nobody gets a crown because their tokens cost more.

At two labs, simple coordination may be enough. At three, five, or seven, communication itself becomes work. You don't want every agent reading every note from every other lab. That's a spectacular way to burn tokens while feeling collaborative.

At that point, consider a dedicated communication or fleet sub-agent: someone whose job is to keep the shared inbox, activity summaries, ownership, and handoffs straight, and to surface only the changes that matter to each lab. It shouldn't become another layer of bureaucracy. Its job is to prevent everyone else from having to become their own dispatcher.

There's no single correct division of labor here. A high-throughput swarm and a low-throughput steering lab is one useful pattern, not a required architecture. The important thing is to organize attention before adding more machines and more voices.

## How to treat new models

Today's table will be wrong soon. When a newer generation appears, check the live catalog rather than trusting the model names in this document. See whether you can actually run it, what it costs, how fast it is, which tasks it will engage with, and whether its judgment holds up under real lab work.

If something promising appears, exploring it can be a useful side project while the main work continues. Give it a few representative tasks: a broad code read, a difficult challenge to an existing finding, a math puzzle, a patch review, or an independent critique. Compare the **quality of the evidence and useful progress**, not merely how impressive the answer sounds. Record what you tried and whether it's worth keeping in rotation.

Newer doesn't automatically mean better. A model that's less capable, slower, more expensive, or unwilling to do the task is probably a step backward for that job. The direction we should expect from new generations is *smarter, faster, cheaper*—but make each candidate prove it rather than taking the release announcement's word for it.

And don't feel obliged to switch. A cheap, quick, slightly messy model that the lab knows how to supervise may beat a glamorous frontier release in actual work completed per day.

## The point

Start with the model you're already running. Check permissions before promising different sub-agents. Prefer the model that can actually do the task, at a cost and speed that make sense. Use a different voice when you're stuck or about to make a serious claim. If you have the capacity, let cheap scouts cover ground while a stronger model protects the direction of the work. If you have multiple labs, divide the attention and give communication a home.

Don't turn model selection into a rigid hierarchy. It's a set of options. Use the tools you have, mix them when the difference is useful, and revisit the assumptions when the frontier moves.
