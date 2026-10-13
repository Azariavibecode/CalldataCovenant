import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { mkdirSync, writeFileSync } from "node:fs";

const contract = "0xd07751C74656495058C0A63C0137F7a5C13cBc60";
const client = createClient({ chain: studionet });
const cases = [
  { id: 1n, name: "omitted", expected: "MATERIAL_OMISSION", hashes: [
    ["register", "0x85ec43a9fece77ef0cda204a7b5bfe970f5d28d016e84cca2b6936632c0f95ca"],
    ["ground", "0x445b3fbe3eb663a8e6e4bfe8ec9514fe95d43e14cc2776e167ac03399e3c64b4"],
    ["adjudicate_1", "0xd39706cd5c545c23ebfc475978c04024dd977c9217c87fe6e7871164f75e7b14"],
    ["adjudicate_2", "0x74bab13d0c6832e245483f945038bb49c89931bccd96bf428329158171d2ded7"],
    ["adjudicate_3", "0x2f3739260486f034bd105bc8bfc960250eaae0e77718d2a7ad6131319db9459b"],
    ["adjudicate_4", "0x831d5c91240ee1cc71a69bae61a14e6fbf0e63f79cba4c1d2fcd6a45de53cae5"],
  ]},
  { id: 3n, name: "ambiguous", expected: "INCONCLUSIVE", hashes: [
    ["register", "0x1c3644081138d1b3a51c8ada9052c6f7123e78cc45f6470a2e9e81eca3dd933c"],
    ["ground", "0x66e949ecbbbba9355b3b95e36c3b3ada2d11a126e2d5f058435fb6243876c089"],
    ["adjudicate_1", "0x43517d53a4dc281fb9ed9284de71972b4422afbc904df68f1a4ec0eebcc982da"],
    ["adjudicate_2", "0xd06a8965966d321e67022e94c0fe0eec79c44afddc2ca8cbe1ae9958c02d7019"],
    ["adjudicate_3", "0xcd8c5dad73861895d735637b6db40434502e7e291ec4eed408e0e7c871bbc1e0"],
    ["adjudicate_4", "0x476f10ca0dcf2cadeafedf67635d2d1e1d82dd31965e88f191fbcfc1278eb81a"],
  ]},
];
mkdirSync("verification/live", { recursive: true });
for (const item of cases) {
  const transactions = [];
  for (const [label, hash] of item.hashes) {
    const tx = await client.getTransaction({ hash });
    transactions.push({ label, hash, result_name: tx?.result_name || "FINALIZED", explorer_url: `https://explorer-studio.genlayer.com/transactions/${hash}` });
  }
  const capsule = JSON.parse(await client.readContract({ address: contract, functionName: "get_capsule", args: [item.id] }));
  const ground = JSON.parse(await client.readContract({ address: contract, functionName: "get_ground", args: [item.id] }));
  const report = { generated_at: new Date().toISOString(), network: "StudioNet", chain_id: 61999, contract, capsule_id: Number(item.id), case: item.name, expected_terminal_verdict: item.expected, observed_result: "CONFLICT_SAFE_PENDING", explanation: "All adjudication attempts finalized MAJORITY_DISAGREE; state remained GROUNDED/PENDING and no terminal counter was incremented.", capsule, ground: { ...ground, verified_source: `[omitted ${ground.verified_source?.length || 0} chars]` }, transactions };
  if (capsule.state !== "GROUNDED" || capsule.verdict !== "PENDING" || transactions.slice(2).some((tx) => tx.result_name !== "MAJORITY_DISAGREE")) throw new Error(`Conflict capture mismatch for ${item.name}`);
  writeFileSync(`verification/live/capsule-${item.id}-conflict.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(`${item.name}: conflict-safe state verified`);
}
