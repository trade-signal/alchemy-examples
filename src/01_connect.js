import "dotenv/config";

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_RPC_URL) throw new Error("ALCHEMY_RPC_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ALCHEMY_RPC_URL)
});

const block = await client.getBlockNumber();
console.log(block);
