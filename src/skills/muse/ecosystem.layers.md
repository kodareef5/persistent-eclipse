### Public-research layers · Ecosystem

| Layer | L1 · Notice | L2 · Connect | L3 · Invent |
| --- | --- | --- | --- |
| Advisories | Find an affected component and fixed version. | Read its actual patch and threat model. | Search for equivalent code or a missing invariant outside the fixed path. |
| Releases | Find behavior changes and newly supported modes. | Compare docs, tests, migration notes, defaults. | What new trust boundary did the feature quietly introduce? |
| Discussion | Look for repeated maintainer or user complaints. | Tie the symptom to source and configuration. | Could a reliability edge case also break security under another principal? |
| Community | Find disclosed reports and research writeups. | Extract the minimal root cause, not the payload. | Transpose it to a different stack where the same assumption exists. |
| Dependencies | Map libraries, bindings, forks, and consumers. | Compare patched and unpatched release trains. | Does the upstream fix leave a different consumer-side hole? |
| History | Look at TODOs, security fixes, reversions, regressions. | Locate the exact code era and compatibility constraints. | Which invariant kept changing because nobody owned it end to end? |
| Research trends | Read conference, academy, and specialist collections. | Cluster recurring mechanisms across products. | Where has a newly popular architecture recreated an old boundary mistake? |
| AI adoption | Notice new agents, plugins, CI assistants, MCP bridges. | Identify permissions, tool arguments, credentials, and data sources. | Can untrusted content influence a privileged action the tool itself should reject? |
| Priority | Identify popular or exposed components from public facts. | Distinguish reachability, dependents, and maintenance signals. | Where might a narrow root cause generalize without assuming every user is vulnerable? |
