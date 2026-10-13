import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { privateKeyToAccount } from "viem/accounts";
import { mkdirSync, writeFileSync } from "node:fs";

for (const name of ["TEST_WALLET_A_PRIVATE_KEY", "TEST_WALLET_B_PRIVATE_KEY", "CONTRACT_ADDRESS", "ETHEREUM_TX_HASH", "DISCLOSURE_OWNER", "DISCLOSURE_REPO", "DISCLOSURE_COMMIT", "DISCLOSURE_PATH", "DISCLOSURE_MARKER"])
  if (!process.env[name]) throw new Error(`Missing ${name}`);

const accounts = [process.env.TEST_WALLET_A_PRIVATE_KEY, process.env.TEST_WALLET_B_PRIVATE_KEY]
  .map((key) => privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`));
const contract = process.env.CONTRACT_ADDRESS;
const reader = createClient({ chain: studionet });
const writer = (account) => createClient({ chain: studionet, account });
const parse = async (name, args = []) => JSON.parse(await reader.readContract({ address: contract, functionName: name, args }));
const transactions = [];

async function submit(account, functionName, args, label) {
  const hash = await writer(account).writeContract({ address: contract, functionName, args });
  console.log(`${label}_submitted: ${hash}`);
  const receipt = await reader.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 140 });
  const tx = await reader.getTransaction({ hash });
  transactions.push({ label, hash, actor: account.address, status: receipt.status_name || receipt.status, result_name: tx?.result_name || "FINALIZED", explorer_url: `https://explorer-studio.genlayer.com/transactions/${hash}` });
  return tx?.result_name || "FINALIZED";
}

const before = await parse("get_counts");
const capsuleId = BigInt(before.capsule_count);
const badSource = JSON.stringify({
  owner: process.env.DISCLOSURE_OWNER,
  repo: process.env.DISCLOSURE_REPO,
  commit: process.env.DISCLOSURE_COMMIT.toLowerCase(),
  path: process.env.DISCLOSURE_PATH,
  digest: "0".repeat(64),
  marker: process.env.DISCLOSURE_MARKER,
});
await submit(accounts[0], "register_capsule", ["invalid-source-negative-control", 1n, process.env.ETHEREUM_TX_HASH, badSource], "register_invalid_source");
const result = await submit(accounts[1], "ground_capsule", [capsuleId], "ground_invalid_source");
const capsule = await parse("get_capsule", [capsuleId]);
const ground = await parse("get_ground", [capsuleId]);
const after = await parse("get_counts");
if (result !== "MAJORITY_AGREE") throw new Error(`Unexpected consensus result: ${result}`);
if (capsule.state !== "REGISTERED" || capsule.verdict !== "PENDING") throw new Error("Invalid source advanced capsule state");
if (ground.error !== "GROUND_NOT_FOUND") throw new Error(`Failure path unexpectedly persisted ground evidence: ${JSON.stringify(ground)}`);
for (const key of ["aligned_count", "hazard_count", "inconclusive_count"])
  if (before[key] !== after[key]) throw new Error(`${key} changed during source failure`);
if (Number(after.capsule_count) !== Number(before.capsule_count) + 1) throw new Error("Capsule count did not increase exactly once");

const report = { generated_at: new Date().toISOString(), network: "StudioNet", chain_id: 61999, contract, capsule_id: Number(capsuleId), purpose: "negative control: invalid disclosure digest cannot be grounded", bad_source: JSON.parse(badSource), before, after, capsule, ground, transactions };
mkdirSync("verification/live", { recursive: true });
writeFileSync(`verification/live/capsule-${capsuleId}-source-failure.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
