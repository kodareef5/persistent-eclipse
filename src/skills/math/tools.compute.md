### Spending compute · Field note

**Reuse by identity, not by convenience.** Two jobs can share an environment when what
determines their results agrees: the Lean toolchain and Mathlib commit, a Python
environment's locked versions, a solver's version and options. When the pins differ,
keep separate installations. When they agree, a second installation is waste.

**Make expensive work earn its keep.** A 50 GB pinned environment that several
investigations reuse is productive infrastructure. Eight rebuilds of the same
dependencies are not. A long proof search or solver run that tests a central lemma can
be worth hours; repeated setup because nobody looked for the existing environment is
not. Before a large build or download, check ENV.md and the shared compute checkout for
one that already fits.

**Record reusable environments in ENV.md**, in plain words: where each lives, what it
pins, who owns its builds, and what it is good for. For example:

    Lean workspace: .research/scratch/_compute/lean-main
      toolchain and Mathlib commit: see its lean-toolchain and lake-manifest.json
      builds: owned by the compute checkout's coderunner
      reuse: proof probes compatible with those pins
    Python: .research/scratch/_compute/venv
      sympy, z3-solver, python-flint (versions in its requirements.lock)

Write the real pins when you create the environment; the example's names are only a
shape. No tool parses this. It is for the next researcher, who should find the
workspace before building another.

**Keep evidence, not exhaust.** Retain what reproduces a result: inputs, scripts,
pins, outputs, and any certificate, under `.research/runs/` or `.research/lean/<R-id>/`.
A disposable compilation, an intermediate cache, or a failed environment build need
not be kept; its rebuild command is enough.
