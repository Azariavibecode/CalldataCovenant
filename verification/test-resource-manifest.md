# Test resource manifest

## Disclosure fixtures

`fixtures/disclosures.md` contains prospectively labeled ALIGNED, OMITTED, MISLEADING, and AMBIGUOUS sections. Before live execution, freeze its public commit, raw-byte SHA-256, marker and expected verdict.

## Transaction authority

- fixed origin: `https://eth.blockscout.com`
- exact Ethereum transaction hash and successful status
- exact sender, target, raw input, value, decoded method ID and parameters
- independent exact-address contract identity
- verified target source and ABI

## Required live controls

- one aligned public call;
- one material omission or misleading disclosure;
- one ambiguous/inconclusive disclosure;
- wrong committed disclosure digest leaving capsule `REGISTERED`;
- terminal replay;
- validator disagreement/retry when observed naturally.

Expected semantic results must be committed before validators observe each case. Raw transaction hashes, actors, consensus result, source commitments, digests, state and counters belong in `verification/STUDIONET_E2E.md` and machine-readable JSON.
