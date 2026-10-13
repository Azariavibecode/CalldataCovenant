# StudioNet E2E verification

## Scope and immutable inputs

- Network: GenLayer StudioNet, chain ID `61999`
- Deployed contract: [`0xd07751C74656495058C0A63C0137F7a5C13cBc60`](https://explorer-studio.genlayer.com/address/0xd07751C74656495058C0A63C0137F7a5C13cBc60)
- Contract deployer: main wallet (deployment only; the contract has no owner/admin role)
- Test wallet A: `0x67A1A08Fc4cf7D05c859d0d3D8398a3A30B1677e`
- Test wallet B: `0x7C87B10a3d43F3b3551414401F8b26B9F662bAB5`
- Public Ethereum transaction: [`0xe045...3347`](https://eth.blockscout.com/tx/0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347)
- Frozen fixture commit: [`525c3e6`](https://github.com/Azariavibecode/CalldataCovenant/commit/525c3e6081be3cf95a0c303d711a799a4b525142)
- Fixture path: `fixtures/disclosures.md`
- Fixture SHA-256: `ade8f5fa7bccbc75daa5c158adf938f032b856124a91bbdb1dfefa9faee9916e`

The transaction is a verified USDT `transfer(address,uint256)` call (`a9059cbb`) to `0xdAC17F958D2ee523a2206206994597C13D831ec7`, recipient `0x23D6FF429f1DfE678543a9803c8964AF7e5aA396`, raw amount `2000000000`. The cases were committed before live execution. Private keys are never committed.

## Results matrix

| ID | Case | Expected | Observed | Safety property |
|---:|---|---|---|---|
| 0 | Complete disclosure | `ALIGNED` | `ALIGNED / FULL_DISCLOSURE` | Effect ledger recorded; replay did not mutate state |
| 1 | Omitted recipient/amount | `MATERIAL_OMISSION` | `GROUNDED / PENDING` after 4 `MAJORITY_DISAGREE` | Conflict did not fabricate a verdict or increment a terminal counter |
| 2 | Falsely described as read-only | `MISLEADING` | `HAZARD_RECORDED / MISLEADING / FALSE_SCOPE` | Hazard recorded; replay did not mutate state |
| 3 | Vague disclosure | `INCONCLUSIVE` | `GROUNDED / PENDING` after 4 `MAJORITY_DISAGREE` | Conflict remained non-terminal and retry-safe |
| 4 | All-zero source digest | `SOURCE_UNVERIFIED` | `REGISTERED / PENDING`, no ground persisted | Unauthenticated source cannot advance the state machine |

The two semantic conflict cases are reported as observed, not relabelled as successful classifications. Their safe non-terminal state is itself the adversarial consensus result.

## Happy path — capsule 0

1. [Register](https://explorer-studio.genlayer.com/transactions/0x4de12b3bb5a71c7c767839cc2bb9998bb3d3ff642d0293a5c909fe2800618c43) — wallet A, `MAJORITY_AGREE`.
2. [Ground](https://explorer-studio.genlayer.com/transactions/0x198ce55cbd2065cc2b0c781ab2fac5c4e33a9bcfc0c607278684fbe108625688) — wallet B, authenticated Git commit/tree/blob/raw bytes and Ethereum transaction/target/source/ABI.
3. [First adjudication](https://explorer-studio.genlayer.com/transactions/0x78da71c57fa9f1ba2271e9fc88a6b05e0f6e65eb206cb39883deb76f92c6efe5) — `MAJORITY_DISAGREE`; capsule stayed `GROUNDED`.
4. [Retry](https://explorer-studio.genlayer.com/transactions/0xcb1b4eb703c5fa75d37b035efdfefc903c6f62f72f723f4dea2ea8f5564ab0bc) — `MAJORITY_AGREE`; terminal result `ALIGNED / FULL_DISCLOSURE`.
5. [Terminal replay](https://explorer-studio.genlayer.com/transactions/0x8c6c255519d479d295a65f84d3a75be9832ba5868883626fce1994f72680e02d) — state and counters unchanged.

Readback proves `funds_movement=true` and all other effect flags false. See [`live/capsule-0.json`](live/capsule-0.json).

## Failure and adversarial paths

### Misleading disclosure — capsule 2

[Register](https://explorer-studio.genlayer.com/transactions/0x497c21c5300534ab9ceb7733f76f2fe472b0906b571565a4aa358cea54fd9), [ground](https://explorer-studio.genlayer.com/transactions/0x6c22e891a2f74049cd4126e160b852da0334bb82178882eefa04f0583f5f4246), [adjudicate](https://explorer-studio.genlayer.com/transactions/0xaad9f585162a9f792c29e6d8fd193f3f3c6684a503e34c3e3a1993c92c889c43), and [terminal replay](https://explorer-studio.genlayer.com/transactions/0x907e3349434258204ad60e9348a7a303bade85d9f6386ce1ba82ede9f952ffc1) all finalized. The false read-only claim became `HAZARD_RECORDED / MISLEADING / FALSE_SCOPE`; replay left counters unchanged. See [`live/capsule-2.json`](live/capsule-2.json).

### Invalid source digest — capsule 4

[Register](https://explorer-studio.genlayer.com/transactions/0x0521d5629eaedfbf0d1a5880734a7b9c34bac3ff059985e1319c615ea3c44679) accepted the syntactically valid descriptor. [Grounding](https://explorer-studio.genlayer.com/transactions/0xdd470c2d79dac0480202152deaffe7fbd6f6d765ba08326a8ba1ccfa18457975) returned `SOURCE_UNVERIFIED`. Readback remained `REGISTERED/PENDING`, `get_ground` returned `GROUND_NOT_FOUND`, and aligned/hazard/inconclusive counters did not change. See [`live/capsule-4-source-failure.json`](live/capsule-4-source-failure.json).

### Conflict safety — capsules 1 and 3

Capsule 1: [register](https://explorer-studio.genlayer.com/transactions/0x85ec43a9fece77ef0cda204a7b5bfe970f5d28d016e84cca2b6936632c0f95ca), [ground](https://explorer-studio.genlayer.com/transactions/0x445b3fbe3eb663a8e6e4bfe8ec9514fe95d43e14cc2776e167ac03399e3c64b4), then four finalized disagreement attempts recorded in [`live/capsule-1-conflict.json`](live/capsule-1-conflict.json).

Capsule 3: [register](https://explorer-studio.genlayer.com/transactions/0x1c3644081138d1b3a51c8ada9052c6f7123e78cc45f6470a2e9e81eca3dd933c), [ground](https://explorer-studio.genlayer.com/transactions/0x66e949ecbbbba9355b3b95e36c3b3ada2d11a126e2d5f058435fb6243876c089), then four finalized disagreement attempts recorded in [`live/capsule-3-conflict.json`](live/capsule-3-conflict.json).

In both cases every adjudication returned `MAJORITY_DISAGREE`; readback remained exactly `GROUNDED/PENDING`. No contradictory terminal fact or counter was committed.

## Reproduction

Run local deterministic/static tests with `python -m pytest -q -p no:cacheprovider`. Live runners are under `scripts/`; supply the deployed address and the two auxiliary-wallet keys through environment variables. A reviewer can also call the same public methods with their own wallet because the contract has no privileged test role.
