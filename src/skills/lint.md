---
name: pe-lint
description: Check the lab record's shape: ids, frontmatter, links, dependency pins, and the sections a claim needs. Run after editing notes and before a commit.
---

# Lint

## Tools
`bash` for `node .research/tools/lint-notes.mjs`; `read` the problem it names; `edit` the note.

## The linter
`.research/tools/lint-notes.mjs` checks that the record is well formed. It never judges
whether a claim is true, and a clean run is not evidence for anything.

The runtime places that file in the lab the first time the lab is opened, and never
replaces it afterwards, so a lab keeps the linter its record was built with. Do not
retype it: a hand-written copy is not the same bytes, and a digest nobody can reproduce
stops the lab. If it is missing, the placement did not happen — report that and continue
without lint. The source is below, to read, not to copy out.

Before the first use in a session, hash the copy without running it:

    shasum -a 256 .research/tools/lint-notes.mjs

It prints `{{lint.sha256}}` when the lab holds the copy this skill ships. `sha256sum`
prints the same digest where `shasum` is absent, and on Windows
`certutil -hashfile .research/tools/lint-notes.mjs SHA256` does. Never run the file to
learn its hash, because a modified script can print any hash it likes.

Any other digest means the lab is running a different linter. That is normal after an
upgrade, and it is also what a hand edit looks like, so the difference decides: the
runtime leaves the shipped bytes beside it, and

    diff .research/tools/lint-notes.mjs .research/tools/lint-notes.mjs.shipped

says which case it is. When the difference is the tool's own history — the same checks,
newer — lint with the lab's copy, name the digest you ran and the one this skill prints in
the commit message, so the record says which linter judged it, and tell the operator.
Stop and report when the difference deletes or weakens a check, or you cannot explain it;
never edit a check away to make a note pass. Deleting the copy makes the runtime place the
current one on the next open. A subagent hashes and runs it in its own scratch.

Run it after writing or editing notes, and before any commit:

    node .research/tools/lint-notes.mjs

`--dir <path>` lints another directory. It prints a summary, one line per note, then every
problem with the note it belongs to. Fix the note, never the linter: when a check is wrong,
that is feedback for the operator, not a rule to edit away.

## Canonical notes and drafts
A note in `.research/notes/` is canonical: its filename is its unpadded `R-<n>` id and
`id:` must match it.

A subagent's draft is not canonical yet. It lives in `.research/scratch/T-<id>/`, carries
`id: draft`, and links to the notes it will sit beside, so lint it in draft mode:

    node .research/tools/lint-notes.mjs --dir .research/scratch/T-17 --draft

Draft mode allows `id: draft`, skips the filename and id match, and resolves `links`
against `.research/notes`. Everything else is checked, including dependency pins, which
resolve from the lab's `.research` root rather than from the scratch directory. On
promotion the manager assigns the R-id, writes the canonical note, and lints
`.research/notes` again before the commit.

## What it checks
- the filename is an unpadded `R-<n>` id and matches `id:` (canonical mode)
- `kind` and `state` come from the fixed lists, and any `checks` from `review`, `run`, `proof`
- `labels` holds two to four `family:value` entries
- every `targets` entry sits under `sources/<source>/`, names an existing
  `vendor/<pkg>@<version>/` copy, or names an existing file of the record's own under
  `intel/`, `runs/`, `reports/`, `notes/`, `lean/`, or `patches/`; only a draft may
  target its own `scratch/`
- `checked_at` is a full 40-character source SHA, `sha256:<hash>` for a pending archive, or
  `<sha> <pkg>@<version>` for a dependency read, which requires
  `.research/vendor/<pkg>@<version>/` to exist
- `links` names only the four relations, and every target is an existing note
- `## Claim` and `## Evidence` are present, and `## Summary` is present on a finding or a
  note past about forty lines

## Advice
Advice never fails lint. Routine runs print only how many suggestions there are; run
with `--advice` to list them when tidying the record. Each points at a judgement for
the author: an R-ID mentioned in prose but not linked, a note past about two hundred
lines, a `status:` or `state:` label, a label missing from an existing LABELS.md, a
`supersedes` link and `state: superseded` that disagree, or a supported refutation whose
target is still supported. Act on it when it is right; a passing comparison can stay prose.

## Adopting a newer linter
A newer linter can require what older notes lack. Fix the record in one `lab:` commit
rather than weakening a check. In particular, promote any `scratch/` artifact a
canonical note cites into `runs/`, `reports/`, `intel/`, or `lean/`, since scratch is not
kept. Treat the advice as a reading list, not a migration you must finish first.

## Links grammar
`links: {}` when there is no relation, otherwise one or more relations, each with its own
bracketed list:

    links: {refutes: [R-31, R-42], depends_on: [R-18]}

A list holds commas of its own, so never split a relation on commas. The linter parses
whole `name: [...]` groups for that reason, and rejects text outside them.

## Dependency reads
When the load-bearing code is in a dependency rather than the pinned tree, vendor the
published files under `.research/vendor/<pkg>@<version>/` and name the pair in the note:

    checked_at: <source sha> h3@2.0.8

The linter fails on a dependency pin with no matching vendor directory, so a reader can
always reach the bytes the note was written against.

For a lab-pack import, the copy may instead live under
`intel/imported/<lab>-<pack>/research/vendor/<pkg>@<version>/`. An imported note must
target an existing file in that copy; `checked_at` keeps the original dependency pin.

## The linter source
What the runtime writes to `.research/tools/lint-notes.mjs`, kept here so the lab can be
checked by hand. Edit it only by changing this file and rebuilding.

```js lint-notes.mjs
{{lint.mjs}}```
