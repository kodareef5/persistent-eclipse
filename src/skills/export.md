---
name: pe-export
description: Pack this lab's record into a zip another lab imports with pe-migrator. Use when the operator asks to export, hand off, or share the lab's work.
---

# Export

A lab pack (`pe-lab-pack/1`) carries one lab's record to another, new or existing.
The receiver keeps attribution and treats imported claims as reported. Nothing merges back.

## What travels
- Include the authored record: notes, reports, intel notes and index, reviews, runs,
  Lean sources, patches, helpers, intake provenance, and context files.
- Replace downloadable or rebuildable bulky bytes with references when their origin
  is known: origin, size, sha256, and summary. This includes page images rebuildable
  from a PDF; name the PDF, pages, and rendering command. Keep cited text extracts whole.
- Exclude scratch, source checkouts, caches, old exports, and runtime-shipped tools.
  Sources travel as pins. List unpromoted drafts as open work in the README.

## Pack
An operator request to export authorizes creating a local pack. Read SCOPE.md and
resolve any conflict with its confidentiality restrictions. Sending or publishing
the pack is a separate action.

1. Write `.research/exports/<name>/README.md`: purpose, findings by R-ID and state,
   disputes, open work, source pins, and what the receiver should check first.
2. Optionally run `node .research/tools/pack.mjs plan <name>` for an inventory.
   In `exports/<name>/plan.json`, set `action: reference` with an `origin` (URL,
   rebuild command, or source pin) and `summary`. `reference_candidate` is only a
   suggestion; large authored files still travel whole. Without a complete reference,
   the bytes are included. Use `omit` only for requested reductions. Rerunning plan
   preserves choices; build reads the current files and computes their hashes.
3. Run `node .research/tools/pack.mjs build <name>`, then
   `node .research/tools/pack.mjs verify .research/exports/<name>.pe-pack.zip`.
   Credential matches are warnings with file and line, not a guarantee of secret
   detection. Review them before sharing; research may quote test credentials.
   If redaction is needed, package a staging copy. Do not rename or edit original
   evidence to satisfy export. pe-lint can check note structure; report existing problems.
4. Give the operator the path, size, sha256, and included/referenced/omitted counts.

## The packer
The runtime places `.research/tools/pack.mjs` like the linter. Before first use in a
session, hash it without running it: `shasum -a 256 .research/tools/pack.mjs`.
The shipped digest is `{{pack.sha256}}`. With another digest, compare it with
`.research/tools/pack.mjs.shipped` as pe-lint describes. Never retype the tool.

```js pack.mjs
{{pack.mjs}}```
