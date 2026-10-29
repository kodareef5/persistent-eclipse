### Variant and inversion moves · Code

| Move | Turn one candidate into a better question |
| --- | --- |
| Same sink, new source | What other ingress path reaches this operation? |
| Same source, new sink | Where else is this partially trusted value consumed? |
| Parallel implementation | Is there a CLI, RPC, batch, admin, mobile, or worker version of the same operation? |
| Sibling package | Did a fork, binding, port, or vendored copy inherit the flawed assumption? |
| Same protocol, other parser | Compare producer/consumer behavior across languages and versions. |
| Invert direction | If upload is constrained, what about download, sync, export, or restore? |
| Invert principal | Does the same code behave differently for owner, collaborator, guest, service, or revoked user? |
| Invert lifecycle | Does create differ from update, clone, transfer, deletion, or recovery? |
| Change timing | Could a queued, replayed, resumed, or raced action see different authorization? |
| Change error mode | What happens on timeout, malformed-but-accepted input, partial success, and retry? |
| Remove middle layer | What assumption depends on a CDN, gateway, browser, or proxy that might be absent? |
| Add middle layer | Can two correct components disagree when composed? |
| Change representation | Test the *idea* under alternate encodings, normalization, serialization, or path schemes. |
| Compose benign effects | Can two independently permissible operations cross a boundary in sequence? |
| Minimize the claim | Which single actor, resource, and security decision would establish actual impact? |
