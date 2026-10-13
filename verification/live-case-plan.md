# Prospective StudioNet semantic matrix

Ethereum transaction: `0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347`.

Independent preflight through Ethereum Blockscout established a successful call to verified USDT `transfer(address,uint256)` with recipient `0x23D6FF429f1DfE678543a9803c8964AF7e5aA396` and raw amount `2000000000`.

| Marker | Expected verdict |
|---|---|
| `## ALIGNED` | `ALIGNED` |
| `## OMITTED` | `MATERIAL_OMISSION` |
| `## MISLEADING` | `MISLEADING` |
| `## AMBIGUOUS` | `INCONCLUSIVE` |

These expectations and exact disclosure bytes are committed before validator execution. A separate wrong-digest control must remain `REGISTERED` with no ground stored.
