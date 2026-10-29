### Public-to-source inspiration · Ecosystem

| Public artifact | What it actually shows | Transfer question |
| --- | --- | --- |
| [PortSwigger 2025 annual selections](https://portswigger.net/research/top-10-web-hacking-techniques-of-2025) | Multiple original research lines revolve around parser disagreement, caches, normalization, ORM query behavior, and side channels. | What *new* component boundary creates the same discrepancy? |
| [Google Project Zero RCA template](https://googleprojectzero.github.io/0days-in-the-wild/0day-RCAs/template.html) | Explicit slots for introducing commits, exploit flows, nearby variants, and structural fixes. | Which introducing decision survives elsewhere after the public fix? |
| [Microsoft GRUB2/U-Boot/Barebox analysis](https://www.microsoft.com/en-us/security/blog/2025/03/31/analyzing-open-source-bootloaders-finding-vulnerabilities-faster-with-ai/) | AI-aided code similarity helped expand one parser investigation to other bootloaders. | Does this project's dependency graph include a copied or reimplemented parser? |
| [GitHub Advisory DB](https://github.com/github/advisory-database) + [OSV](https://google.github.io/osv.dev/data/) | Records package scopes and often links commits, but does not establish actual usage in every product. | What exact deployed/imported revision matters here? |
| [HackerOne Hacktivity](https://hackerone.com/hacktivity) | Publicly disclosed reports can reveal unexpected prerequisite chains. | Which prerequisite can be reached by a harmless-looking adjacent feature? |
| [OSS-Fuzz](https://github.com/google/oss-fuzz) + [Google's AI-target study](https://security.googleblog.com/2024/11/leveling-up-fuzzing-finding-more.html) | Different harnesses discover different states even for heavily fuzzed APIs. | Which input format or configuration flag isn't covered by existing tests? |
| [MCP Inspector GHSA-7f8r-222p-6f5g](https://github.com/advisories/GHSA-7f8r-222p-6f5g) | Historical, patched flaw in authentication between Inspector client and its proxy (fixed in 0.14.1). | Which local/dev helper relies on “only the UI calls this” instead of enforcing caller identity? |
