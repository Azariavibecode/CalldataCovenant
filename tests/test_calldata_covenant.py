import hashlib
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).parents[1]
OWNER, REPO = "AzariaFixture", "CalldataCovenant"
COMMIT, TREE = "1" * 40, "a" * 40
PATH = "/fixtures/disclosures.md"
BODY = (ROOT / PATH[1:]).read_bytes()
TARGET = "0x2222222222222222222222222222222222222222"
SENDER = "0x3333333333333333333333333333333333333333"
TX_HASH = "0x" + "4" * 64
RAW_INPUT = "0x69fe0e2d" + "0" * 62 + "19"
ABI = [{"type": "function", "name": "setFee", "inputs": [{"name": "fee", "type": "uint256"}], "outputs": [], "stateMutability": "nonpayable"}]
SOURCE = "contract Treasury { uint public fee; function setFee(uint256 next) external { fee = next; } }"


def digest(body): return hashlib.sha256(body).hexdigest()
def blob(body): return hashlib.sha1((f"blob {len(body)}\0").encode() + body).hexdigest()


def source(marker="## ALIGNED", override_digest=None):
    return json.dumps({"owner": OWNER, "repo": REPO, "commit": COMMIT, "path": PATH, "digest": override_digest or digest(BODY), "marker": marker})


def mock_github(vm, status=200):
    api = f"https://api.github.com/repos/{OWNER}/{REPO}"
    vm.mock_web((api + "/git/commits/" + COMMIT).replace(".", r"\.") + "$", {"status": 200, "body": json.dumps({"sha": COMMIT, "tree": {"sha": TREE}}).encode()})
    vm.mock_web((api + "/git/trees/" + TREE + r"\?recursive=1$").replace(".", r"\."), {"status": 200, "body": json.dumps({"truncated": False, "tree": [{"path": PATH[1:], "type": "blob", "mode": "100644", "size": len(BODY), "sha": blob(BODY)}]}).encode()})
    raw = f"https://raw.githubusercontent.com/{OWNER}/{REPO}/{COMMIT}{PATH}"
    vm.mock_web(raw.replace(".", r"\.") + "$", {"status": status, "body": BODY})


def mock_chain(vm, *, tx_hash=TX_HASH, target=TARGET, verified=True, method_id="69fe0e2d", parameter_type="uint256", abi=None, raw_input=RAW_INPUT):
    tx = {"hash": tx_hash, "status": "ok", "to": {"hash": target}, "from": {"hash": SENDER}, "raw_input": raw_input, "value": "0", "decoded_input": {"method_call": f"setFee({parameter_type} fee)", "method_id": method_id, "parameters": [{"name": "fee", "type": parameter_type, "value": "25"}]}}
    vm.mock_web(("https://eth.blockscout.com/api/v2/transactions/" + TX_HASH).replace(".", r"\.") + "$", {"status": 200, "body": json.dumps(tx).encode()})
    vm.mock_web(("https://eth.blockscout.com/api/v2/addresses/" + TARGET).replace(".", r"\.") + "$", {"status": 200, "body": json.dumps({"hash": target, "is_contract": True}).encode()})
    vm.mock_web(("https://eth.blockscout.com/api/v2/smart-contracts/" + TARGET).replace(".", r"\.") + "$", {"status": 200, "body": json.dumps({"is_verified": verified, "source_code": SOURCE, "abi": ABI if abi is None else abi}).encode()})


def verdict(name="ALIGNED", reason="FULL_DISCLOSURE", **overrides):
    item = {"capsule_id": 0, "disclosure_complete": True, "external_call": False, "funds_movement": False, "material_omission": False, "misleading": False, "parameter_change": True, "pause_control": False, "reason_code": reason, "role_change": False, "unknown_effect": False, "upgrade": False, "verdict": name}
    item.update(overrides)
    return json.dumps(item)


def deploy(vm, direct_deploy, actor):
    vm.strict_mocks = True; vm.check_pickling = True
    with vm.prank(actor): return direct_deploy("contracts/CalldataCovenant.py")


@pytest.fixture
def setup(direct_vm, direct_deploy, direct_alice):
    return direct_vm, deploy(direct_vm, direct_deploy, direct_alice), direct_alice


def register(vm, contract, actor, marker="## ALIGNED", committed_digest=None):
    with vm.prank(actor): return contract.register_capsule("fee-change", 1, TX_HASH, source(marker, committed_digest))


def ground(vm, contract):
    mock_github(vm); mock_chain(vm)
    assert contract.ground_capsule(0) == "GROUNDED"


def test_aligned_disclosure_creates_effect_ledger(setup, direct_bob):
    vm, contract, _ = setup; assert register(vm, contract, direct_bob) == 0; ground(vm, contract)
    vm.mock_llm(r"Compare one authenticated governance disclosure.*", verdict())
    assert contract.adjudicate_capsule(0) == "ALIGNED"
    capsule = json.loads(contract.get_capsule(0)); counts = json.loads(contract.get_counts())
    assert capsule["state"] == "ALIGNED" and capsule["effect_ledger"]["parameter_change"] is True
    assert counts["aligned_count"] == 1 and counts["hazard_count"] == 0


@pytest.mark.parametrize("marker,result,reason,changes", [
    ("## OMITTED", "MATERIAL_OMISSION", "MATERIAL_EFFECT_OMITTED", {"disclosure_complete": False, "material_omission": True}),
    ("## MISLEADING", "MISLEADING", "FALSE_SCOPE", {"disclosure_complete": False, "misleading": True}),
])
def test_hazard_paths(setup, direct_bob, marker, result, reason, changes):
    vm, contract, _ = setup; register(vm, contract, direct_bob, marker); ground(vm, contract)
    vm.mock_llm(r"Compare one authenticated governance disclosure.*", verdict(result, reason, **changes))
    assert contract.adjudicate_capsule(0) == result
    assert json.loads(contract.get_capsule(0))["state"] == "HAZARD_RECORDED"


def test_ambiguous_evidence_is_inconclusive(setup, direct_bob):
    vm, contract, _ = setup; register(vm, contract, direct_bob, "## AMBIGUOUS"); ground(vm, contract)
    vm.mock_llm(r"Compare one authenticated governance disclosure.*", verdict("INCONCLUSIVE", "AMBIGUOUS_DISCLOSURE", disclosure_complete=False, parameter_change=False, unknown_effect=True))
    assert contract.adjudicate_capsule(0) == "INCONCLUSIVE"
    assert json.loads(contract.get_counts())["inconclusive_count"] == 1


@pytest.mark.parametrize("failure", ["digest", "github", "tx_hash", "target", "selector", "abi", "verified"])
def test_grounding_failures_store_nothing(setup, direct_bob, failure):
    vm, contract, _ = setup; register(vm, contract, direct_bob, committed_digest="0" * 64 if failure == "digest" else None)
    mock_github(vm, status=404 if failure == "github" else 200)
    kwargs = {}
    if failure == "tx_hash": kwargs["tx_hash"] = "0x" + "5" * 64
    if failure == "target": kwargs["target"] = "0x" + "6" * 40
    if failure == "selector": kwargs["method_id"] = "ffffffff"
    if failure == "abi": kwargs["abi"] = []
    if failure == "verified": kwargs["verified"] = False
    mock_chain(vm, **kwargs)
    assert contract.ground_capsule(0) == "SOURCE_UNVERIFIED"
    assert "error" in json.loads(contract.get_ground(0))
    assert json.loads(contract.get_capsule(0))["state"] == "REGISTERED"


def test_inconsistent_positive_downgrades_and_terminal_replay(setup, direct_bob):
    vm, contract, _ = setup; register(vm, contract, direct_bob); ground(vm, contract)
    vm.mock_llm(r"Compare one authenticated governance disclosure.*", verdict(material_omission=True))
    assert contract.adjudicate_capsule(0) == "INCONCLUSIVE"
    terminal = (contract.get_capsule(0), contract.get_counts())
    assert contract.adjudicate_capsule(0) == "CAPSULE_NOT_GROUNDED"
    assert terminal == (contract.get_capsule(0), contract.get_counts())


def test_input_guards_and_deployer_has_no_privilege(setup, direct_bob):
    vm, contract, deployer = setup
    with vm.prank(direct_bob):
        assert contract.register_capsule("fee", 137, TX_HASH, source()) == "INVALID_CAPSULE"
        assert contract.register_capsule("fee", 1, "0x1234", source()) == "INVALID_CAPSULE"
    assert register(vm, contract, direct_bob) == 0
    capsule = json.loads(contract.get_capsule(0))
    assert capsule["creator"].lower() != str(deployer).lower()
    assert "owner" not in json.loads(contract.get_counts())
