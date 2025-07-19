import "dotenv/config";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_WSS_URL) throw new Error("ALCHEMY_WSS_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(process.env.ALCHEMY_WSS_URL)
});

// 方法1： uniswap v3 pool swap event
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    console.log("=== Uniswap V3 Swap Event ===");
    logs.forEach(log => {
      console.log({
        poolAddress: log.address,
        sender: log.args.sender,
        recipient: log.args.recipient,
        amount0: log.args.amount0.toString(),
        amount1: log.args.amount1.toString(),
        sqrtPriceX96: log.args.sqrtPriceX96.toString(),
        liquidity: log.args.liquidity.toString(),
        tick: log.args.tick.toString(),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash
      });
    });
  },
  onError: error => {
    console.error("error:", error);
  }
});

// 方法2： specific pool swap event
const specificPoolAddress = "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"; // USDC/ETH pool

client.watchEvent({
  address: specificPoolAddress,
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    console.log("=== specific pool swap event ===");
    logs.forEach(log => {
      console.log({
        poolAddress: log.address,
        sender: log.args.sender,
        recipient: log.args.recipient,
        amount0: log.args.amount0.toString(),
        amount1: log.args.amount1.toString(),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash
      });
    });
  },
  onError: error => {
    console.error("specific pool error:", error);
  }
});

// 方法3： uniswap v2 pool swap event
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
  ),
  onLogs: logs => {
    console.log("=== Uniswap V2 Swap Event ===");
    logs.forEach(log => {
      console.log({
        poolAddress: log.address,
        sender: log.args.sender,
        to: log.args.to,
        amount0In: log.args.amount0In.toString(),
        amount1In: log.args.amount1In.toString(),
        amount0Out: log.args.amount0Out.toString(),
        amount1Out: log.args.amount1Out.toString(),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash
      });
    });
  },
  onError: error => {
    console.error("V2 error:", error);
  }
});

console.log("start listening uniswap transactions...");
console.log("press Ctrl+C to stop listening");

// graceful shutdown
process.on("SIGINT", () => {
  console.log("\nstop listening...");
  process.exit(0);
});
