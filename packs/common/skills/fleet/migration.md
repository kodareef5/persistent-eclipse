# When an older lab meets the pack-based engine

Start by telling the operator what you are reviewing. Keep the research fleet
paused where the changes affect its work; independent maintenance can continue.
Read the lab's own directions first. Preserve MISSION.md, permissions, source
pins, and the decisions behind local conventions.

The changes worth comparing:

- **Libraries:** common guidance now accompanies one discipline's pack.
  `packs.json` selects the sources; `packs.lock.json` pins what the lab reads.
  `content.cjs inspect` shows the active source. Preview an update before applying
  it. `pe.packRoot` is a developer override for this clone, not a shared source.
- **Reports:** a short line can still go in FEEDBACK.md. A larger contribution can
  be a small Markdown file under `updates/`. REPORT.md collects those contributions
  and links existing reports. Keep useful old records and replace duplicate
  reporting instructions by meaning; no wholesale conversion is needed.
- **Sharing:** approved background sync combines committed research and builds
  the shared pages without changing the checkout or index. At a useful pause,
  `node .research/tools/sync.mjs` adopts incoming work. `Auto sync: off` leaves
  publication to that command. Real research conflicts stay with the manager;
  generated pages can be rebuilt. Keep the operator's existing sharing policy.
- **Helpers:** untouched shipped tools upgrade together. Edited or unrecognized
  copies get a `.shipped` comparison. Compare those before using a new helper that
  imports an older one; preserve useful adaptations. No need to audit every tool
  from scratch when it matches a known shipment.
- **Activity:** immutable receipts feed the tables and charts. Use
  `history.mjs report` for current accounting. `status-report.mjs` remains for
  replaying old reports; its totals are a different basis. Don't subtract one
  basis from the other or turn absent peer data into zero.

For a peer without access to an unpublished library, share a reviewed snapshot
inside the lab repository. With `.research/vendor/pe-content/packs/common/` and
`packs/math/` present, the portable selection is:

```json
{"mission":"math","sources":{"common":{"repository":"vendor/pe-content"},"math":{"repository":"vendor/pe-content"}}}
```

Paths are relative to `.research/packs.json`. A snapshot containing its own
`packs.lock.json` and `packs/<digest>/` also works and keeps its upstream revision.
Ordinary loads obey the shared pin; a changed snapshot needs a reviewed
`content.cjs update --apply`. Verify it from an empty cache before asking a peer
to depend on it. No cache-filling script or private credentials are needed.

Search accounting now links old selected-call IDs to the complete attempt set
using the original receipt hash. Retain the old receipts. Where raw receipts are
available, the current reader publishes the identity evidence for peers; it never
guesses from equal token counts. Update readers before comparing mixed-era totals.
Missing identity evidence still limits what can be reconciled.

Loose `intel/search-*.json` files deserve a decision, not automatic staging or
deletion. Keep cited source evidence at its existing address. For uncited raw
receipts, use `history.mjs collect`, confirm the retained copy and accounting, then
keep the raw material in `local/` if it needn't travel. Share sanitized activity
receipts with ordinary commits. A search query alone needn't become an intel note.

Leave a compact summary of what changed, what stays, and anything deferred to a
peer. Keep useful reproducers and evidence needed to judge the findings. Raw TAP
output, repeated logs, and copied scratch usually belong in `local/`; link them
from the summary while the review is live. A substantial proof, dataset, or other
irreplaceable artifact deserves its room.

After the comparison and useful cleanup are finished, or remaining decisions
are recorded and coordinated, run `content.cjs review --acknowledge`. That records
a completed review. Starting a review, assigning workers, or opening this note
isn't completion; leave the notice pending while the review is underway.
