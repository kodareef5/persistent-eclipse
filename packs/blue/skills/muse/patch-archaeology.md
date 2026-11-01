# Read the repair as an argument

A patch contains an implicit claim about how the failure happened. Find that
claim before extending the patch. Which invariant does the change restore? At
what boundary is it restored, and which callers still have to preserve it?

Read the changed path beside a neighboring path that reaches the same sensitive
operation. Differences may reveal a missing assumption: one caller normalizes
input, one holds a lock, one owns the buffer, another borrows it. The useful
comparison is about the mechanism. A nearby line with similar syntax is only a
lead until its data and lifetime are understood.

History can explain why an awkward branch exists. Follow the introduction of the
behavior and the circumstances its authors were accommodating. A compatibility
workaround may encode a requirement absent from the current documentation. A
later cleanup may preserve the code while losing that explanation. Keep the
source revision and the reasoning connected so another reader can assess the
interpretation.

Consider an alternative repair at another boundary. Validation at entry, a
stronger internal representation, and a final guard can have different failure
modes. Ask which prevents invalid states from being created, which limits their
spread, and which merely catches the observed manifestation. Sometimes a modest
local fix is the right repair; sometimes the comparison reveals an architectural
opportunity worth investigating separately.

A valuable contribution is a causal account and a discriminating example: a case
where plausible repairs behave differently for an understandable reason. Preserve
uncertainty about unexamined callers. Let the finding generate a focused question
instead of turning resemblance into a demand for a repository-wide sweep.
