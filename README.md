# CalldataCovenant

CalldataCovenant is a contract-only GenLayer protocol that checks whether a governance disclosure materially and accurately describes one exact finalized Ethereum contract call.

The contract authenticates a commit-pinned disclosure, retrieves the exact transaction from Ethereum Blockscout, binds its raw selector to Blockscout's decoded input, and verifies the decoded method and parameter types against the exact target's verified ABI. Validators classify the semantic effects. Deterministic code enforces the positive gate and stores an effect ledger.

## Architecture

```text
REGISTERED capsule
  → atomic transaction + target + ABI + disclosure grounding
  → GROUNDED effect candidate
  → bounded semantic adjudication
  → ALIGNED | HAZARD_RECORDED | INCONCLUSIVE
```

This is not an observation-slot registry, runbook audit, challenge court, authorization permit, escrow, or proposal executor. There is no seal phase or canonical namespace head. Each capsule represents one immutable transaction/disclosure comparison.

## Effect ledger

- funds movement
- role change
- upgrade
- pause control
- parameter change
- external call
- unknown effect

`ALIGNED` requires a complete disclosure, no material omission, no misleading claim, no unknown effect, and `FULL_DISCLOSURE`. Any malformed or inconsistent positive output becomes `INCONCLUSIVE`.

## Public methods

```text
register_capsule(label, chain_id, tx_hash, disclosure_source_json)
ground_capsule(capsule_id)
adjudicate_capsule(capsule_id)
get_capsule(capsule_id)
get_ground(capsule_id)
get_counts()
```

The first release supports Ethereum mainnet only and constructs fixed GitHub and Ethereum Blockscout origins.

## Roles

- Main wallet deploys only and receives no owner/admin power.
- Auxiliary wallet A registers test capsules.
- Auxiliary wallet B grounds and adjudicates them.
- Any steward can reproduce a capsule using public sources and their own wallet.

## Verification

```bash
python -m pytest -q
npm run e2e:studionet
```

Current local result: `16 passed`. Target runtime: GenLayer `0.2.16`. No frontend is included.

See [architecture](docs/ARCHITECTURE.md), [threat model](docs/THREAT_MODEL.md), [detailed StudioNet E2E evidence](verification/STUDIONET_E2E.md), [local verification](verification/local-verification.md), and [test-resource manifest](verification/test-resource-manifest.md).
