import "dotenv/config";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_WSS_URL) throw new Error("ALCHEMY_WSS_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(process.env.ALCHEMY_WSS_URL)
});

client.watchEvent({
  // uniswap v3 factory
  address: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    console.log(logs);
  }
});
