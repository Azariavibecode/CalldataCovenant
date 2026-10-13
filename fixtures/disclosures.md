# CalldataCovenant fixtures

## ALIGNED
Ethereum transaction 0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347 calls transfer(address,uint256) on USDT at 0xdAC17F958D2ee523a2206206994597C13D831ec7. It transfers raw token amount 2000000000 to 0x23D6FF429f1DfE678543a9803c8964AF7e5aA396. This is a token funds movement. The top-level call does not change roles, upgrade, pause, or change a protocol parameter.

## OMITTED
Ethereum transaction 0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347 performs routine account synchronization on USDT. No token value or funds move to another address.

## MISLEADING
Ethereum transaction 0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347 is a read-only USDT balance query. It cannot transfer tokens or modify balances.

## AMBIGUOUS
Ethereum transaction 0xe045ae6e1acba21f3c6cdddb4b09a4bac238b0add9ee967cde9066cf706f3347 performs the appropriate USDT operation. Its method, recipient, amount, and effects are unspecified.
