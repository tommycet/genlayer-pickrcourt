import { createClient, createAccount, chains } from "genlayer-js";

export const STUDIONET_CHAIN = chains.studionet;

export const DEMO_KEY = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356" as `0x${string}`;
export const demoAccount = createAccount(DEMO_KEY);

export const CONTRACT_ADDRESS = "0x5A8a47F42D2f39cF4C42234FBF24B33428A30Dc7" as `0x${string}`;
export const client = createClient({ chain: STUDIONET_CHAIN as any });
export const IS_DEPLOYED = CONTRACT_ADDRESS !== ("0x0000000000000000000000000000000000000000" as `0x${string}`);

export async function getStats(): Promise<{ total: number; title: string }> {
  const r: any = await client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_stats", args: [] });
  const p = typeof r === "string" ? JSON.parse(r) : r;
  return { total: Number(p.total), title: p.title };
}

export async function getRecent(limit = 10, offset = 0): Promise<any[]> {
  const r: any = await client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_recent", args: [BigInt(limit), BigInt(offset)] });
  return typeof r === "string" ? JSON.parse(r) : r;
}

export async function getResult(id: number): Promise<any> {
  const r: any = await client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_result", args: [BigInt(id)] });
  return typeof r === "string" ? JSON.parse(r) : r;
}

export async function submit(payload: any): Promise<string> {
  const txHash = await client.writeContract({
    account: demoAccount,
    address: CONTRACT_ADDRESS,
    functionName: "submit",
    args: [JSON.stringify(payload)],
    value: BigInt(0),
  });
  return txHash as string;
}

export async function waitForNewResult(currentTotal: number, timeoutMs = 180000): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await getStats();
    if (s.total > currentTotal) return s.total;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return currentTotal + 1;
}
