---
name: pe-questions
description: Leave a question for the operator while independent research continues.
---

# Questions for the operator

Leave one useful question, the work it affects, and a proposed default when it helps.
The manager uses `pe_question` in Pi or `node .research/tools/questions.cjs submit
"question"` in DSH. Pi workers use `pe_question` too. DSH workers use
`node .research/tools/questions.cjs draft .research/scratch/T-id "question"`.
The manager's runtime promotes these question drafts into the operator inbox.
The operator can list questions and answer them through the same tool or the DSH
card. A pending question never grants permission. Continue independent work; keep
an action that needs approval pending until its answer arrives.

Answer-delivery receipts survive new sessions in this clone. Other lab clones keep
their own receipts. The files in `.research/questions/` stay with the lab and sync to its approved
private remote. They are a conversation, not a reason to stop a promising inquiry.
