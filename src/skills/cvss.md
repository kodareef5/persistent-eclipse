---
name: pe-cvss
description: Score security findings in CVSS 3.1 and 4.0 from evidence with the reliable lab calculator.
---

# CVSS

Use `read` for evidence, `edit` for `## Severity`, and `bash` for `.research/tools/cvss.mjs`.

Build both base vectors from declared evidence only.
Let the calculator do the arithmetic. Rescore when evidence changes.
Severity is calculated and delivered for approval.

## Calculator

Verify the calculator once per session, before running it:

    shasum -a 256 .research/tools/cvss.mjs

Expected: `{{cvss.sha256}}`. If missing, stop. If changed, compare against `.research/tools/cvss.mjs.shipped`; use only if the arithmetic is verified unchanged, and tell the operator. Never run a script to verify its own hash.

    node .research/tools/cvss.mjs 'CVSS:3.1/AV:N/AC:L|H/PR:N/UI:N/S:U/C:H/I:H/A:H'

Use every base metric, in order:

    CVSS:3.1/AV:_/AC:_/PR:_/UI:_/S:_/C:_/I:_/A:_
    CVSS:4.0/AV:_/AC:_/AT:_/PR:_/UI:_/VC:_/VI:_/VA:_/SC:_/SI:_/SA:_

`L|H` means unresolved. The calculator evaluates both and returns the range, canonical vectors, undecided metrics, and metrics supporting the low-end severity band. Report the low-end vector without `|` externally. Base metrics only; record exploit maturity and fixes separately.

## Metrics

| 3.1 | 4.0 | Values | Meaning |
| --- | --- | --- | --- |
| AV | AV | N A L P | Network, adjacent, local, physical. A URL/socket is N; LAN/Bluetooth A; file/process L; device contact P. |
| AC | AC | L H | Attack complexity. H requires defeating a mitigation or learning a secret. |
| — | AT | N P | 4.0 deployment prerequisites, e.g. non-default configuration or timing with normal traffic. |
| PR | PR | N L H | Attacker's existing privileges on the vulnerable system. |
| UI | UI | 3.1 N R; 4.0 N P A | Other-user interaction. 4.0 P is passive; A requires active participation. |
| S | — | U C | 3.1 scope changes only across a distinct security authority, e.g. sandbox to host. |
| C I A | VC VI VA | H L N | Vulnerable-system impact: high, low, none. H means total or comparably serious loss. |
| — | SC SI SA | H L N | 4.0 subsequent-system impact. N unless evidence identifies that system and impact. |

Common cases:

- Repeatable crash or hang: `A:H` / `VA:H`; C/I remain N absent other effects.
- Out-of-bounds read: confidentiality impact; H requires evidence of secrets exposed or controllable access to them.
- Out-of-bounds write or type confusion: `I:L` until stronger control is shown. Demonstrated code execution can support `C:H/I:H/A:H`.
- Path traversal: file reads affect C; writes affect I.

## Evidence

Each metric needs one basis:

- `shown` — pinned `file:line` or REQ demonstrates it.
- `argued` — supported by code reasoning, not exercised.
- `open` — unresolved; use `|` and name the decisive read or run.

## Record

Add to the finding or subagent draft:

    ## Severity
    cvss31: <canonical vector>
    score31: <calculator score/range and band>
    cvss40: <canonical vector>
    score40: <calculator score/range and band>
    rests-on: <union of calculator lists>
    basis:
    - <metric:value> <shown|argued|open>, <evidence or next check>
    outside: <attributed vendor/NVD score and URL, or none>

Combine basis lines when metrics share evidence, e.g. `C:H VC:H`. subagents return their draft and calculator output.

## Example

Fictional R-50, after REQ-41 reproduced an import vulnerability:

    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U|C/C:H/I:H/A:H
    score: 9.8 to 10.0, Critical
    undecided: S; band unchanged
    rests on: AV, AC, PR, UI

    CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N|H/SI:N|H/SA:N
    score: 9.3 to 9.9, Critical
    undecided: SC, SI; band unchanged
    rests on: AV, PR, UI, VC, VI

Recorded as:

    ## Severity
    cvss31: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U|C/C:H/I:H/A:H
    score31: 9.8 to 10.0, Critical
    cvss40: CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N|H/SI:N|H/SA:N
    score40: 9.3 to 9.9, Critical
    rests-on: AV, AC, PR, UI, VC, VI
    basis:
    - AV:N shown, public import listener at server.ts:88, 1a2b3c4
    - AC:L AT:N shown, REQ-41 succeeded 20/20 on default config
    - PR:N shown, REQ-41 used no session cookie
    - UI:N shown, REQ-41 needed no other user
    - C:H I:H A:H VC:H VI:H VA:H shown, REQ-41 executed `id` as service user
    - S:U|C SC:N|H SI:N|H open, possible cross-tenant queue access; inspect queue/acl.ts
    - SA:N argued, worker has no scheduler handle
    outside: none

Both scores remain Critical despite unresolved scope. The mission, not the score, decides whether the finding qualifies.

## Calculator source

```js cvss.mjs
{{cvss.mjs}}```
