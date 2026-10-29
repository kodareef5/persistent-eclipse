### Source collections and what to mine · Ecosystem

| Collection | Material worth reading | Good question to carry into code |
| --- | --- | --- |
| [GitHub Advisory Database](https://github.com/github/advisory-database) | GHSA records, affected versions, references, fix commits. | What *behavioral invariant* changed in the patch? |
| [OSV.dev data](https://google.github.io/osv.dev/data/) | Cross-ecosystem advisories, commit/version ranges, recent modifications. | Do sibling packages have different affected ranges or fixes? |
| [Google security-research](https://github.com/google/security-research) | Public advisories, patches, root-cause material, associated PoCs. | Which named primitive recurs in another subsystem? |
| [Project Zero RCA template](https://googleprojectzero.github.io/0days-in-the-wild/0day-RCAs/template.html) | Root cause, introducing/fixing commits, variants, exploit flows. | What *introduced* the assumption and where else might it live? |
| [OSS-Fuzz](https://github.com/google/oss-fuzz) | Fuzzer/project coverage, harnesses, fixed bug writeups. | Which API, mode, or state is underrepresented by current harnesses? |
| [Trail of Bits skills](https://github.com/trailofbits/skills) | Source context, differential review, variants, sharp edges, agentic CI. | Which reading lens applies to this architecture? |
| [Trail of Bits Testing Handbook](https://github.com/trailofbits/testing-handbook) | Fuzzing, CodeQL, Semgrep, cryptographic and native-code testing. | Which assumption is amenable to local property or differential testing? |
| [GitHub Security Lab / CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/) | Data-flow models, variant analysis, framework-specific findings. | Which source or sink is invisible to generic rules? |
| [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill) | Trust-boundary-first prompts and domain-specific threat lenses. | Who loses control of what, rather than which CWE name matches? |
| [PortSwigger technique archive](https://portswigger.net/research/top-10-web-hacking-techniques) | Annual judged collections and full nominated research. | What surprising parser, cache, or browser behavior could transfer? |
| [PortSwigger 2025 selections](https://portswigger.net/research/top-10-web-hacking-techniques-of-2025) | Parser differences, Unicode normalization, ORM leakage, cache chains. | Which “safe” abstraction conceals a composition flaw? |
| [HackerOne Hacktivity](https://hackerone.com/hacktivity) | Disclosed public bug-bounty reports and real preconditions. | Which decisive step turns an ordinary bug into cross-principal impact? |
| [oss-security archive](https://www.openwall.com/lists/oss-security/) | Public disclosures, patch links, maintainer follow-ups. | Were adjacent components fixed differently or not discussed? |
| [Assetnote Wordlists](https://wordlists.assetnote.io/) | Technology-specific endpoint and content naming conventions. | What hidden-but-intended route types or version families exist in *source*? |
| [Nuclei template collection](https://github.com/projectdiscovery/nuclei-templates) | Community pattern descriptions and public template history. | What assumptions do detection templates make about environment or versions? |
| [GitHub Code Search](https://github.com/features/code-search) | Cross-repo symbols, library usage, copied code and comments. | Who embeds this risky helper, and how is it called? |
| [MITRE ATLAS data](https://github.com/mitre-atlas/atlas-data) | AI attack cases and tactics; latest release is versioned. | Which AI-specific entry reaches a conventional privileged operation? |
| [OWASP Agentic Security](https://genai.owasp.org/initiatives/agentic-security-initiative/) | Agentic application risks, MCP guidance, emerging controls. | Where do agent instructions, tools, and identities cross trust domains? |
| [MCP security best practices](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx) | Token audiences, consent, confused deputy, local/remote trust. | Is authorization enforced on the *resource server* and exact action? |
| [Trail of Bits agentic-actions-auditor](https://github.com/trailofbits/skills/blob/main/plugins/agentic-actions-auditor/skills/agentic-actions-auditor/SKILL.md) | AI agent steps in CI, untrusted PR/issue data, inherited privileges. | Does event content become instructions to an agent with repo secrets or write access? |
| [OWASP Q3 2026 AI exploit roundup](https://genai.owasp.org/2026/10/08/genai-and-agentic-ai-exploit-roundup-q3-2026/) | Incident/disclosure summaries for AI apps and connected tools. | Which transitions are documented and which are analyst inference? |
