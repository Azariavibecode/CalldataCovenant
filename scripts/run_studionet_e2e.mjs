import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { privateKeyToAccount } from "viem/accounts";
import { mkdirSync, writeFileSync } from "node:fs";

const required = ["TEST_WALLET_A_PRIVATE_KEY", "TEST_WALLET_B_PRIVATE_KEY", "CONTRACT_ADDRESS", "ETHEREUM_TX_HASH", "DISCLOSURE_OWNER", "DISCLOSURE_REPO", "DISCLOSURE_COMMIT", "DISCLOSURE_PATH", "DISCLOSURE_DIGEST", "DISCLOSURE_MARKER", "EXPECTED_VERDICT"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const accounts = [process.env.TEST_WALLET_A_PRIVATE_KEY, process.env.TEST_WALLET_B_PRIVATE_KEY].map((key) => privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`));
if (accounts[0].address.toLowerCase() === accounts[1].address.toLowerCase()) throw new Error("Auxiliary wallets must differ");
const contract = process.env.CONTRACT_ADDRESS;
const reader = createClient({ chain: studionet });
const writer = (account) => createClient({ chain: studionet, account });
const transactions = [];
const parse = async (name, args = []) => JSON.parse(await reader.readContract({ address: contract, functionName: name, args }));

async function submit(account, functionName, args, label, allowDisagree = false) {
  let hash;
  for (let rpcAttempt = 1; rpcAttempt <= 5; rpcAttempt += 1) {
    try { hash = await writer(account).writeContract({ address: contract, functionName, args }); break; }
    catch (error) { if (rpcAttempt === 5) throw error; await new Promise((resolve) => setTimeout(resolve, 5000)); }
  }
  console.log(`${label}_submitted: ${hash}`);
  const receipt = await reader.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 140 });
  let tx;
  for (let rpcAttempt = 1; rpcAttempt <= 5; rpcAttempt += 1) {
    try { tx = await reader.getTransaction({ hash }); break; }
    catch (error) { if (rpcAttempt === 5) throw error; await new Promise((resolve) => setTimeout(resolve, 5000)); }
  }
  const result = tx?.result_name || "FINALIZED";
  if (!allowDisagree && result !== "MAJORITY_AGREE" && result !== "FINALIZED") throw new Error(`${label}: ${result}`);
  transactions.push({ label, hash, actor: account.address, status: receipt.status_name || receipt.status, result_name: result, explorer_url: `https://explorer-studio.genlayer.com/transactions/${hash}` });
  return result;
}

const source = JSON.stringify({ owner: process.env.DISCLOSURE_OWNER, repo: process.env.DISCLOSURE_REPO, commit: process.env.DISCLOSURE_COMMIT.toLowerCase(), path: process.env.DISCLOSURE_PATH, digest: process.env.DISCLOSURE_DIGEST.toLowerCase(), marker: process.env.DISCLOSURE_MARKER });
const before = await parse("get_counts");
const capsuleId = BigInt(before.capsule_count);
await submit(accounts[0], "register_capsule", ["public-governance-call", 1n, process.env.ETHEREUM_TX_HASH, source], "register_capsule");
await submit(accounts[1], "ground_capsule", [capsuleId], "ground_capsule");
const ground = await parse("get_ground", [capsuleId]);
if (ground.status !== "GROUNDED") throw new Error("Ground readback failed");
let capsule;
for (let attempt = 1; attempt <= 4; attempt += 1) {
  const result = await submit(accounts[attempt % 2], "adjudicate_capsule", [capsuleId], `adjudicate_${attempt}`, true);
  capsule = await parse("get_capsule", [capsuleId]);
  if (result === "MAJORITY_AGREE" && ["ALIGNED", "HAZARD_RECORDED", "INCONCLUSIVE"].includes(capsule.state)) break;
  if (capsule.state !== "GROUNDED") throw new Error(`Unsafe state after ${result}`);
}
if (capsule?.verdict !== process.env.EXPECTED_VERDICT) throw new Error(`Expected ${process.env.EXPECTED_VERDICT}, got ${capsule?.verdict}`);
const terminalBefore = JSON.stringify({ capsule, counts: await parse("get_counts") });
await submit(accounts[1], "adjudicate_capsule", [capsuleId], "terminal_replay");
const terminalAfter = JSON.stringify({ capsule: await parse("get_capsule", [capsuleId]), counts: await parse("get_counts") });
if (terminalBefore !== terminalAfter) throw new Error("Terminal replay mutated state");
const report = { generated_at: new Date().toISOString(), network: "StudioNet", chain_id: 61999, contract, contract_explorer_url: `https://explorer-studio.genlayer.com/address/${contract}`, ethereum_tx_hash: process.env.ETHEREUM_TX_HASH, wallets: { auxiliary_a: accounts[0].address, auxiliary_b: accounts[1].address }, source: JSON.parse(source), before, after: await parse("get_counts"), ground: { ...ground, verified_source: `[omitted ${ground.verified_source.length} chars]` }, capsule: await parse("get_capsule", [capsuleId]), transactions };
mkdirSync("verification/live", { recursive: true });
writeFileSync(`verification/live/capsule-${capsuleId}.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
