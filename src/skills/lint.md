---
name: pe-lint
description: Find broken references, missing evidence, and awkward note formatting. Use the findings to help the next reader.
---

# Lint

Run the checker after editing notes and before committing:

    node .research/tools/lint-notes.mjs

It checks the record's shape and references. A clean run says nothing about whether
a claim is true. Fix findings that matter; when a convention doesn't fit, explain
why in FEEDBACK and keep working. Leave the checker intact so others can reproduce
its findings.

## Options

| Option | Use it for |
| --- | --- |
| `--dir <path>` | Check notes in another directory. |
| `--draft` | Check a worker's draft before the manager gives it an R-ID. |
| `--advice` | Show suggestions usually hidden behind a count. |
| `--push` | Check outgoing history and whether cited evidence will travel. |
| `--strict` | Fail on advice too, if you want conventions enforced. |

Labels, summaries, long notes, inbox formatting, and missing lab folders are advice.
So are possible inconsistencies: a supported refutation of a still-supported note,
for example. Read the evidence and decide what needs changing.

## Which copy am I running?

The runtime places the checker in `.research/tools/` and preserves existing copies.
If it's missing, report the placement problem and continue without lint. Use the
provided file rather than retyping the embedded source below.

Before first use in a session, hash it externally:

    shasum -a 256 .research/tools/lint-notes.mjs

The shipped digest is `{{lint.sha256}}`. `sha256sum` also works; on Windows use
`certutil -hashfile .research/tools/lint-notes.mjs SHA256`. Don't ask an unknown
script for its own hash by running it.

A different digest may just mean an older version. Compare it with the shipped copy:

    diff .research/tools/lint-notes.mjs .research/tools/lint-notes.mjs.shipped

For a known older version, record both digests in the commit message and let the
operator know. You can keep using it or adopt the shipped version. Removing the old
copy lets the runtime place the current one on the next open. If the differences
are unexplained or remove useful checks, report them and set that copy aside.
Researchers can continue with other checks while this is resolved.

An old linter may reject `R-redfox-3`. That is a tool limitation; leave other labs'
notes alone. Use a compatible copy or the checks you can run. Adopting a newer
linter doesn't require cleaning up every older note first.

## Notes and drafts

Canonical notes live in `.research/notes/`. Their filename and `id:` agree:
`R-17.md` has `id: R-17`; `R-redfox-17.md` has `id: R-redfox-17`. Both forms can coexist.

A worker's draft stays in its task scratch and uses `id: draft`:

    node .research/tools/lint-notes.mjs --dir .research/scratch/T-17 --draft

Draft mode resolves links against canonical notes and checks dependencies from the
lab's `.research` root. The manager assigns an R-ID when keeping the finished note
and runs lint on the shared notes again.

When joining would cause an ID collision, `--qualify <lab>` previews renames of
unnamed notes, runs, and proof folders, plus edits to their references. `--write`
applies them. Inspect the evidence and script paths it leaves for you to handle;
otherwise existing addresses can stay as they are.

## What the checker looks for

- A matching filename and `id:`, recognized `kind`, `state`, and optional `checks`.
- `## Claim` and `## Evidence` sections, so readers can find both.
- Existing link targets and recognized relations: `supports`, `refutes`, `depends_on`,
  and `supersedes`.
- Evidence paths under sources, vendor, or the record's intel, runs, reports, reviews,
  notes, lean, and patches folders. Only drafts may cite scratch.
- A `checked_at` source SHA, archive hash, or source SHA plus dependency version.

For example, keep a relationship explicit:

    links: {refutes: [R-31, R-42], depends_on: [R-18]}

Use `links: {}` when there is none. Each relation has its own bracketed list; commas
inside those lists aren't separators between relations.

A canonical note's evidence needs a lasting home. Move useful scratch artifacts to
runs/, reports/, intel/, or lean/ before citing them in the shared record.

For a dependency read, keep its published files under `vendor/<pkg>@<version>/` and
record the source revision and dependency, for example:

    checked_at: <40-character source sha> h3@2.0.8

An archive uses `sha256:<hash>`. For a lab-pack import, a dependency may instead live
under `intel/imported/<lab>-<pack>/research/vendor/<pkg>@<version>/`; target that copy
and retain the original dependency pin.

## Before sharing

`--push` checks every outgoing commit for possible credentials and files over 5 MiB,
and checks that locally available evidence is committed. Record intentional large
files in `.research/LARGE.md` with a reason, or use references as pe-export describes.
Resolve genuine credential leaks and missing evidence before pushing; a deleted
credential may still be in outgoing history.

The inbox summary counts structured open messages and those addressed to your
`pe.lab` ID. Plain contributions count as research too, even when the checker can't
route them; read the inbox as well as its counts.

## Embedded source

The runtime writes these bytes to the lab. To change the shipped checker, edit
`src/lint-notes.mjs` in the package and rebuild.

```js lint-notes.mjs
{{lint.mjs}}```
