### Dependency, distribution, and supply-chain lenses · Ecosystem

| L1 · Trace | L2 · Difference to notice | L3 · Strange question | Source shelf |
| --- | --- | --- | --- |
| Direct dependency | Why the app imports it and which entrypoints are used. | Does the app actually reach the vulnerable function or only carry its version? | [deps.dev](https://deps.dev/) |
| Transitive dependency | A risky package enters through multiple parents or feature groups. | Does one parent supply the guard that another omits? | [Open Source Insights documentation](https://docs.deps.dev/) |
| Reverse dependents | A small library underpins many unrelated products. | Which integration uses it in the least expected privilege context? | [packages.ecosyste.ms](https://packages.ecosyste.ms/) |
| Dependency version swap | Minor upgrades change parsers, exceptions, and defaults. | Which old caller contract was never revisited? | [deps.dev](https://deps.dev/) |
| Public/private registry preference | Same logical name may resolve from more than one registry. | Is the resolution policy unambiguous in every CI and production installer? | [Dependency confusion research](https://medium.com/@alex.birsan/dependency-confusion-how-i-hacked-into-apple-microsoft-and-dozens-of-other-companies-4a5d60fec610) |
| Install-time script | Code executes when building or installing rather than when imported. | Does the team's code review include the package's installation lifecycle? | [OpenSSF Package Analysis](https://github.com/ossf/package-analysis) |
| Vendored library copy | Upstream patch and local fork can drift silently. | Which bug was fixed in upstream but reappears in an edited copy? | [GitHub code search](https://github.com/features/code-search) |
| Registry archive versus Git tag | Published files may include extra or missing generated code. | What was *shipped*, not merely committed? | [xz original disclosure](https://openwall.com/lists/oss-security/2024/03/29/4) |
| Platform-specific optional dependency | Installed only on one OS, CPU, feature, or container image. | Does the rarely used path have an entirely different input contract? | [deps.dev](https://deps.dev/) |
| Package maintainer transfer | Publisher identity or release tooling changes without code changes. | What evidence ties the new artifact to the expected source and maintainer? | [OpenSSF malicious packages](https://github.com/ossf/malicious-packages) |
| Malicious package report | An observed ecosystem tactic has an attributable artifact. | Which *trust assumption* failed, beyond the package name itself? | [OpenSSF malicious packages](https://github.com/ossf/malicious-packages) |
| Lockfile and resolver behavior | Same manifest can resolve different graph under differing tooling. | Which dependency is actually installed in the deployment under review? | [Open Source Insights](https://deps.dev/) |
| Container base image | OS libraries and loaders differ from application lockfiles. | Does a patched app still ship an affected native library or helper? | [OSV](https://osv.dev/) |
| Copy of reference crypto code | Algorithms may match but parameters, key IDs, and bytes differ. | Did a wrapper preserve domain separation and exact signed representation? | [GitHub Security Lab archive](https://securitylab.github.com/research-archive/) |
| Code generator/runtime pair | Generated clients may be built with different version or template. | Do the generated objects enforce the server's updated protocol assumptions? | [MCP SDK siblings](https://github.com/modelcontextprotocol) |
| Dependency test corpus | Tests may exercise only tiny grammar slices or happy states. | What input shape is valid but never reaches the interesting code? | [Google structure-aware fuzzing](https://github.com/google/fuzzing/blob/master/docs/structure-aware-fuzzing.md) |
| Advisory version ranges | Multiple ecosystems describe affected ranges differently. | Which exact pinned commit was fixed and what *call path* was affected? | [OSV data](https://google.github.io/osv.dev/data/) |
| Release CI signing and publishing | Source, build job, provenance record, and registry upload have different principals. | Which one can replace the artifact after review? | [OpenSSF Package Analysis](https://github.com/ossf/package-analysis) |
| Popularity / blast radius | One small dependency can reach many applications through a framework. | Does an unusual downstream use turn a modest defect into a stronger boundary crossing? | [ecosyste.ms](https://packages.ecosyste.ms/) |
| Dependency issue or stalled fix | Upstream maintainer knows an edge but chose not to change semantics. | Does the application unknowingly assume the behavior was repaired? | [ecosyste.ms issues](https://issues.ecosyste.ms/) |

A dependency advisory is a lead. The dependency's **reachability, configuration, affected revision, and actual caller semantics** decide whether it matters.
