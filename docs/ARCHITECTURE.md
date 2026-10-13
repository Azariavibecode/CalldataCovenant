# Architecture

## Proof obligation

Establish whether one exact disclosure materially and accurately covers the effects visible in one exact finalized Ethereum call, its decoded input, and the verified source/ABI of its exact target.

## Falsifiers

- transaction hash, sender, target, selector or input differs;
- target is not a contract or source is unverified;
- selector prefix and decoded method ID differ;
- decoded method/parameter types do not match exactly one ABI function;
- disclosure omits or misstates a material effect;
- call semantics remain unknown.

## Lifecycle

`REGISTERED` contains locators and commitments only. `ground_capsule` performs one atomic strict-equality acquisition and moves to `GROUNDED` only after every deterministic identity/decode check passes. `adjudicate_capsule` is the sole semantic consensus boundary. Terminal capsules cannot be adjudicated again.

## Deterministic enforcement

Validators return a bounded effect vector and findings. Code validates exact keys/types, object ID, verdict/reason pair, and all positive prerequisites before mutating counters. AI never executes calls or assigns permissions.
