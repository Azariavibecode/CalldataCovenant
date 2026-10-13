# Local verification

Command: `python -m pytest -q`

Current result: `16 passed`.

Coverage includes aligned disclosure, material omission, misleading scope, ambiguous evidence, GitHub/digest failures, wrong transaction hash, wrong target, selector mismatch, missing ABI, unverified source, inconsistent positive output, terminal replay, input guards, fixed authorities, exact decode binding, and absence of deployer privilege.

Tests call the real public contract methods with mocked web/LLM responses. They do not claim StudioNet finality.
