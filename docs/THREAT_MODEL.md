# Threat model

| Threat | Control |
|---|---|
| Mutable or substituted disclosure | full Git commit/tree/blob identity plus recomputed SHA-256 |
| Transaction substitution | exact 32-byte transaction hash must match Blockscout response |
| Wrong target | transaction target must equal independent Blockscout address identity with `is_contract=true` |
| Fabricated decoding | raw calldata selector must equal decoded method ID; method and types must match exactly one verified ABI entry |
| Unverified target | `is_verified=true`, bounded non-empty source, and matching ABI are mandatory |
| Prompt injection | disclosure/source are labeled untrusted; exact schema and cross-field gates are enforced |
| False positive | complete disclosure, no omission, no misleading claim, no unknown effect, and `FULL_DISCLOSURE` are all mandatory |
| Validator disagreement | consensus failure leaves capsule `GROUNDED` and counters unchanged |
| Replay | only `GROUNDED` capsules may reach a terminal state |
| Deployer privilege | no owner, admin, upgrade, allowlist, or privileged method exists |

## Limitations

- The protocol assesses one top-level call, not internal-call traces or a multicall bundle.
- It does not prove the caller was authorized under live storage or that downstream effects completed.
- It does not execute, block, or cancel the Ethereum transaction.
- It proves correspondence to the authenticated disclosure section, not completeness of an entire repository.
- Local mocks are not StudioNet finality evidence.
