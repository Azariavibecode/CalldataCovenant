import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { privateKeyToAccount } from "viem/accounts";
import { mkdirSync, writeFileSync } from "node:fs";

for (const name of ["TEST_WALLET_A_PRIVATE_KEY", "TEST_WALLET_B_PRIVATE_KEY", "CONTRACT_ADDRESS", "CAPSULE_ID", "EXPECTED_VERDICT"])
  if (!process.env[name]) throw new Error(`Missing ${name}`);
const accounts = [process.env.TEST_WALLET_A_PRIVATE_KEY, process.env.TEST_WALLET_B_PRIVATE_KEY].map((key) => privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`));
const address = process.env.CONTRACT_ADDRESS;
const capsuleId = BigInt(process.env.CAPSULE_ID);
const reader = createClient({ chain: studionet });
const writer = (account) => createClient({ chain: studionet, account });
const parse = async (name, args = []) => JSON.parse(await reader.readContract({ address, functionName: name, args }));
const transactions = [];
async function submit(account, label) {
  let hash;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try { hash = await writer(account).writeContract({ address, functionName: "adjudicate_capsule", args: [capsuleId] }); break; }
    catch (error) { if (attempt === 5) throw error; await new Promise((resolve) => setTimeout(resolve, 5000)); }
  }
  console.log(`${label}_submitted: ${hash}`);
  const receipt = await reader.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 140 });
  let tx;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try { tx = await reader.getTransaction({ hash }); break; }
    catch (error) { if (attempt === 5) throw error; await new Promise((resolve) => setTimeout(resolve, 5000)); }
  }
  const result = tx?.result_name || "FINALIZED";
  transactions.push({ label, hash, actor: account.address, status: receipt.status_name || receipt.status, result_name: result, explorer_url: `https://explorer-studio.genlayer.com/transactions/${hash}` });
  return result;
}
const before = { capsule: await parse("get_capsule", [capsuleId]), counts: await parse("get_counts") };
if (before.capsule.state !== "GROUNDED") throw new Error(`Capsule ${capsuleId} is ${before.capsule.state}`);
let capsule;
for (let attempt = 1; attempt <= 8; attempt += 1) {
  const result = await submit(accounts[attempt % 2], `adjudicate_resume_${attempt}`);
  capsule = await parse("get_capsule", [capsuleId]);
  if (result === "MAJORITY_AGREE" && capsule.state !== "GROUNDED") break;
  if (capsule.state !== "GROUNDED") throw new Error(`Unsafe state after ${result}`);
}
if (capsule?.verdict !== process.env.EXPECTED_VERDICT) throw new Error(`Expected ${process.env.EXPECTED_VERDICT}, got ${capsule?.verdict}`);
const terminalBefore = JSON.stringify({ capsule, counts: await parse("get_counts") });
await submit(accounts[1], "terminal_replay");
const after = { capsule: await parse("get_capsule", [capsuleId]), counts: await parse("get_counts") };
if (terminalBefore !== JSON.stringify(after)) throw new Error("Terminal replay mutated state");
const report = { generated_at: new Date().toISOString(), network: "StudioNet", contract: address, resumed_capsule_id: Number(capsuleId), before, after, transactions };
mkdirSync("verification/live", { recursive: true });
writeFileSync(`verification/live/capsule-${capsuleId}-resume.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
