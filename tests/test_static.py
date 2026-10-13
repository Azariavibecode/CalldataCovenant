from pathlib import Path


SOURCE = (Path(__file__).parents[1] / "contracts" / "CalldataCovenant.py").read_text()


def test_fixed_authorities_and_commitments_present():
    for item in ["https://api.github.com/repos/", "https://raw.githubusercontent.com/", "https://eth.blockscout.com/api/v2/transactions/", "https://eth.blockscout.com/api/v2/addresses/", "https://eth.blockscout.com/api/v2/smart-contracts/", "_blob_sha1(raw.body)", "hashlib.sha256(raw.body)"]:
        assert item in SOURCE


def test_transaction_decode_binding_and_positive_gate_present():
    for item in ['raw_input[2:10] != method_id', 'str(tx.get("hash", "")).lower() != tx_hash', 'types == parameter_types', 'result["disclosure_complete"]', 'not result["material_omission"]', 'not result["misleading"]', 'not result["unknown_effect"]']:
        assert item in SOURCE


def test_architecture_is_effect_ledger_not_observation_slots():
    assert "effect_ledger" in SOURCE and "register_capsule" in SOURCE and "ground_capsule" in SOURCE
    for forbidden in ["seal_drill", "observations: TreeMap", "RUNBOOK_OBSERVED"]:
        assert forbidden not in SOURCE
