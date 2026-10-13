import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { mkdirSync, writeFileSync } from "node:fs";

const contract = process.env.CONTRACT_ADDRESS;
const capsuleId = BigInt(process.env.CAPSULE_ID);
const hashes = [process.env.REGISTER_HASH, process.env.GROUND_HASH];
if (!contract || !process.env.CAPSULE_ID || hashes.some((x) => !x)) throw new Error("Missing capture inputs");
const client = createClient({ chain: studionet });
const parse = async (name, args = []) => JSON.parse(await client.readContract({ address: contract, functionName: name, args }));
const transactions = [];
for (const [index, hash] of hashes.entries()) {
  const tx = await client.getTransaction({ hash });
  transactions.push({ label: index ? "ground_invalid_source" : "register_invalid_source", hash, result_name: tx?.result_name || "FINALIZED", explorer_url: `https://explorer-studio.genlayer.com/transactions/${hash}` });
}
const capsule = await parse("get_capsule", [capsuleId]);
const ground = await parse("get_ground", [capsuleId]);
const counts = await parse("get_counts");
if (capsule.state !== "REGISTERED" || capsule.verdict !== "PENDING" || ground.error !== "GROUND_NOT_FOUND") throw new Error("Negative-control readback mismatch");
const report = { generated_at: new Date().toISOString(), network: "StudioNet", chain_id: 61999, contract, capsule_id: Number(capsuleId), purpose: "negative control: invalid disclosure digest cannot be grounded", result: "SOURCE_UNVERIFIED; no ground persisted and capsule remains REGISTERED/PENDING", counts, capsule, ground, transactions };
mkdirSync("verification/live", { recursive: true });
writeFileSync(`verification/live/capsule-${capsuleId}-source-failure.json`, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
