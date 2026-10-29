### Query seeds · Ecosystem

| Lens | Public search or code-search seed | What to extract |
| --- | --- | --- |
| Security-sensitive history | `repo:OWNER/REPO "authorization"` | Relevant call paths and dates; inspect source. |
| Owner checks | `repo:OWNER/REPO "tenantId"` | Where IDs are derived versus accepted from callers. |
| Trust assertions | `repo:OWNER/REPO "trusted"` | Which code asserts a boundary, and on what basis. |
| Dangerous repair TODOs | `repo:OWNER/REPO "TODO" "validate"` | Comments near source, not proof of exploitability. |
| Workflow agents | `repo:OWNER/REPO path:.github/workflows "pull_request_target"` | Event permissions and untrusted text crossing into tools. |
| Native seams | `repo:OWNER/REPO "unsafe"` | Caller invariants and external data reaching the block. |
| Shared helper usage | `"FUNCTION_OR_SYMBOL" "PACKAGE_OR_FRAMEWORK"` | External wrappers, forks, and alternate callers. |
| Fix archaeology | `"PACKAGE" "security" "backport"` | Patch provenance and alternate stable branches. |
| Ecosystem variants | `"LIBRARY" "parser" "normalization"` | Competing parsing and validation semantics. |
| Release seams | `"FRAMEWORK" "cache" "regression"` | Changed caching contracts and error behavior. |
| Community disclosure | `"PRODUCT" "disclosed" "authorization"` | Public reports with real actor/impact conditions. |
| Agent adoption | `"FRAMEWORK" "MCP" "security" "tools"` | New delegated actions and credentials. |
| Cross-language equivalent | `"PROTOCOL" "implementation" "incompatible"` | Known parser or state differences to test locally. |
| Official spec tension | `"PROTOCOL" "MUST NOT" "compatibility"` | Where normative requirements meet legacy support. |


| PR arguments | `repo:OWNER/REPO is:pr is:closed "authorization"` | Review dissent, guard placement, and final patch fate. |
| Unmerged fixes | `repo:OWNER/REPO is:pr is:closed "security"` | Candidate defenses that did not ship; check each PR status. |
| Maintainer tradeoff | `"PROJECT" "compatibility" "security" "pull request"` | What was deliberately left less strict, and why? |
| Package graph | `"PACKAGE" "depends on" "LIBRARY"` | Direct, transitive, and reverse dependents; confirm via deps.dev. |
| Commercial neighbor | `"PRODUCT" "alternative" "self-hosted" "GitHub"` | Find an independent implementation of the same security contract. |
| Fork ancestry | `"PROJECT" "fork" "security fix"` | Locate diverged release trees and unported repairs. |
| Release-vs-source | `"PROJECT" "release tarball" "generated"` | Published archive, checksums, and generated-code discrepancies. |
| Old public discussions | `site:seclists.org "LIBRARY"` | Earlier variants, surprises, or disputed mitigations. |
| OSS disclosure conversations | `site:openwall.com/lists/oss-security "PACKAGE"` | Original report, follow-ups, affected-version disagreements. |
| Historic technical tricks | `site:archives.phrack.org "PARSER"` | Out-of-fashion technical ideas to reinterpret against modern designs. |
| Long-form conference papers | `site:usenix.org/conference/woot "TECHNOLOGY"` | Research assumptions, architecture, and untested extensions. |
| Cross-language SDKs | `"PROTOCOL" "Python" "TypeScript" "conformance"` | Normative differences between independent implementations. |
| Modern agent adaptation | `"MCP" "localhost" "auth" "issue"` | Where classic browser/local trust mistakes may resurface. |

`OWNER/REPO`, `PACKAGE`, etc. are placeholders; some strings target GitHub Code Search, others ordinary web search. Search results are **leads**, not findings. Prefer specific source commits and primary discussion over snippets or AI summaries.
