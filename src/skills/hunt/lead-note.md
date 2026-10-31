# One lead inside a continuing desk

This is a fictional record-format example, not market evidence. It illustrates a
small observation that a broader analyst desk might investigate without abandoning
its standing coverage. The timestamp and source are invented; the digest is real
for the exact extract block below, including its final newline.

```markdown
---
id: R-14
source: materials
kind: observation
state: open
labels: [area:materials, lens:relationships]
targets: [intel/2026-11-03-processing.md:5-6]
links: {}
checked_at: sha256:73dc85c094415c0c9bc0e83a9b74c66e3a4723cf2bf50ad62e46aa182393ad07
---
# A processing proposal leaves key commercial dependencies unspecified

## Summary
verdict: open — the saved announcement names a proposal, not operating capacity
- intel/2026-11-03-processing.md:5 identifies the proposed facility
- intel/2026-11-03-processing.md:6 leaves financing, customers, and timing unspecified
against: these details could be disclosed in other sources not yet examined
next: locate supporting disclosures before connecting the proposal to beneficiaries

## Claim
The saved announcement does not identify customers, committed financing, or an
operating date for the proposed processing facility.

## Evidence
The archived text states a proposal and omits these commercial dependencies.

## Against
Other disclosures may supply the missing information. Absence from this extract
does not establish that financing or customers do not exist.

## Signal
salience: unassessed; no attention forecast required
significance: possible capacity change; realization and timing unknown
opportunity: investigate constraints before making a beneficiary thesis

## Revisit when
Supporting disclosures clarify financing, customers, or the operating schedule.

## Next
Follow the relevant financing and customer disclosures and test an alternative:
the proposal may never become usable capacity in the operator's horizon.
```

Save this extract as `.research/intel/2026-11-03-processing.md` in a demonstration
lab; an actual investigation must capture its own source and retrieval details.

```markdown
# Fictional processing-capacity announcement
origin: https://example.invalid/materials/announcement (illustrative, not retrieved)
retrieved: 2026-11-03T14:20:00Z (fictional timestamp)

The fictional supplier announced a proposed processing facility.
The announcement did not identify customers, committed financing, or an operating date.
```

Use PE's normal evidence and challenge rules. The [record mapping](records.md)
explains the archived-source mapping. A valid hash verifies bytes, not the truth
or completeness of an announcement.
