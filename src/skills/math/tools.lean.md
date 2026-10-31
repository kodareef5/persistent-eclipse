### Working in Lean and Mathlib · Field note

**Search before proving.** Mathlib probably has pieces of what you need. Look first:
`exact?`, `apply?`, and `rw?` inside a proof; `#check` and `#print` for a name you
suspect; Loogle (loogle.lean-lang.org) to search by type or constant; Mathlib's
documentation search. A lemma you find is one you don't have to maintain.

**Keep the workshop warm.** Rebuilding Mathlib for every claim wastes hours. Keep one
pinned workspace per Lean toolchain and Mathlib commit, record it in ENV.md, and put
compatible proof probes in it as separate files. Start a new project only when the pins
must differ, as when you audit someone else's formalization at its own pins.

- `lake exe cache get` downloads Mathlib's prebuilt `.olean` files instead of compiling
  them. Mathlib's own cache lives per user (`~/.cache/mathlib`, or `MATHLIB_CACHE_DIR`),
  not per checkout, so a second project at the same Mathlib commit reuses it.
- `lake exe cache get Mathlib.Algebra.Group.Basic`, or a file path, folder, or glob,
  fetches just those files and their transitive imports.
- After a `lake update`, or any change to `lake-manifest.json`, run `cache get` again
  before building, or Lake compiles Mathlib from source.
- If something goes mysteriously wrong, `lake clean` or `rm -rf .lake`, then
  `lake exe cache get` again. `cache get!` forces a fresh download.

**Build the slice, not the universe.** Check the file you changed before building the
whole project:

    lake env lean MyProof.lean        check one file against the project's dependencies
    lake build MyProject.MyProof      build one module and what it imports

A full `lake build` of a large formalization belongs to the shared compute checkout
(pe-git-research), with one owner for the build.

**Use Lean interactively when it pays.** The command line is the default. When a proof
needs many rounds of trying tactics against the same goal, a REPL
(leanprover-community/repl) or a Python interface such as LeanDojo or Pantograph saves
re-elaborating the file each time. Set one up only when the iteration count justifies
it, and keep it in the shared workspace.

**Ask what Lean actually proved.** A green build means the kernel accepted *some*
statement. Before calling a result kernel-checked:

- Read the theorem's exact statement: its quantifiers, domains, and hypotheses, and
  whether the hypotheses can all hold at once.
- `#print axioms theThm` lists what the proof rests on. `propext`, `Classical.choice`,
  and `Quot.sound` are standard. `sorryAx` means a gap. `Lean.ofReduceBool` or
  `Lean.trustCompiler` means `native_decide`, which trusts the compiler, not the kernel.
  Any other axiom is the author's own assumption; name it in the note.
- Search the dependency chain for `sorry`, `admit`, `axiom`, and `opaque` declarations
  standing in for real definitions.
- Map the formal statement to the human one. Definitions can quietly differ: a
  complexity bound over a different cost model, a weaker rate, a finite instead of
  asymptotic statement.

**Pin it.** Record `lean-toolchain`, `lake-manifest.json` (it pins Mathlib's commit),
and the exact declaration name in the claim note, so another lab can rerun the check.
