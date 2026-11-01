### Ongoing reading: newsletters and live research feeds · Ecosystem

| Source | Rhythm / emphasis | Read it for | Turn a story into this question |
| --- | --- | --- | --- |
| [tl;dr sec](https://tldrsec.com/t/Newsletter) | Weekly; curated AppSec, cloud, tools, research, agent security. | Underappreciated technical papers and tools. | Which linked *primary source* documents a reusable failure mechanism? |
| [CloudSecList](https://cloudseclist.com/) | Weekly; cloud-native plus AI intersection. | Cloud IAM, infrastructure changes, design pitfalls. | Which new cloud feature changes an old permission or isolation boundary? |
| [Intigriti Bug Bytes](https://www.intigriti.com/researchers/blog/bug-bytes) | Monthly; bug-bounty writeups, research, tool releases. | Practical, disclosed cases with strange preconditions. | What was the one nonobvious transition that made the bug work? |
| [Risky Bulletin](https://risky.biz/newsletters/) | Frequent; incidents, vulnerabilities, research, policy. | Early signals and incident threads to follow to original disclosures. | What architectural mistake does the incident imply, and which detail remains unverified? |
| [SANS @RISK](https://www.sans.org/newsletters) | Weekly; new flaws and attack vectors. | Technical summaries of recent classes. | What other component implements the same vulnerable rule? |
| [SANS NewsBites](https://www.sans.org/newsletters/newsbites) | Semiweekly; expert-annotated news. | Context and disagreement about high-profile incidents. | What would an experienced maintainer say limits this claim? |
| [Vulnerable U](https://www.vulnu.com/t/newsletter) | Weekly; practitioner roundup. | Interesting incident oddities and new research links. | What is unusual about the object, workflow, or environment in this story? |
| [Last Week in AWS](https://www.lastweekinaws.com/newsletter/) | Weekly; AWS feature, service, and product shifts. | Non-security release changes that move auth, networking, and metadata assumptions. | What security property could change even though the announcement isn't about security? |
| [Krebs on Security](https://krebsonsecurity.com/) | Investigative stories as published. | Supply-chain, account, operational, and identity narratives. | Which product assumption failed before the incident became visible? |
| [The Record](https://therecord.media/) | Ongoing cyber reporting. | Attribution context, incident timelines, and vendor responses. | What technical source or advisory can confirm the asserted mechanism? |
| [ZDI RSS](https://www.zerodayinitiative.com/rss/) | Advisory and research feeds. | Public vulnerability patterns and unusual vendor software. | Which reported primitive has a parallel in an open component? |
| [oss-security archive](https://www.openwall.com/lists/oss-security/) | Disclosures and follow-up threads as published. | Precise version ranges, maintainer correction, variant discussions. | Did follow-up replies materially narrow or expand the original claim? |
| [SecLists / RSS](https://seclists.org/) | Ongoing public mailing-list mirrors. | Niche vulnerabilities and older technical context. | Is an old edge case still alive in a compatibility layer? |
| [GitHub Security Lab](https://securitylab.github.com/research/) | Research articles as published. | CodeQL, source-based bugs, framework-level variants. | Which helper or source/sink is missing from current tools? |
| [PortSwigger research archive](https://portswigger.net/research) | Individual papers and annual technique rankings. | New interpretations of old web/protocol interactions. | Which one of the paper's original assumptions exists in the target's architecture? |
| [Project Zero research](https://projectzero.google/) | Technical posts and RCA case studies. | Root causes, exploit constraints, failed mitigations. | Why did nearby fixes fail to eliminate the class? |

Cadence is a guide, not a promise; publication schedules and links can change. **Don't ingest a headline as a finding**: follow the original advisory, patch, issue, or researcher writeup before carrying an idea into the lab.
