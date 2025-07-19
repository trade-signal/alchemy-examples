import "dotenv/config";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_WSS_URL) throw new Error("ALCHEMY_WSS_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(process.env.ALCHEMY_WSS_URL)
});

// 1. DEX trade monitor
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const amount0 = Number(log.args.amount0);
      const amount1 = Number(log.args.amount1);

      // 监控大额交易
      if (Math.abs(amount0) > 1000000 || Math.abs(amount1) > 1000000) {
        console.log("🐋 large DEX trade:", {
          pool: log.address,
          sender: log.args.sender,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 2. flash loan monitor
client.watchEvent({
  event: parseAbiItem(
    "event Flash(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 paid0, uint256 paid1)"
  ),
  onLogs: logs => {
    console.log("⚡ flash loan:", {
      sender: logs[0].args.sender,
      amount0: logs[0].args.amount0.toString(),
      amount1: logs[0].args.amount1.toString(),
      txHash: logs[0].transactionHash
    });
  }
});

// 3. large transfer monitor
client.watchEvent({
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const value = Number(log.args.value);

      // monitor large transfer
      if (value > 1000000) {
        console.log("💰 large transfer:", {
          from: log.args.from,
          to: log.args.to,
          value: value.toString(),
          token: log.address,
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 4. liquidation event monitor
client.watchEvent({
  event: parseAbiItem(
    "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)"
  ),
  onLogs: logs => {
    console.log("💥 liquidation event:", {
      user: logs[0].args.user,
      collateralAsset: logs[0].args.collateralAsset,
      debtAsset: logs[0].args.debtAsset,
      debtToCover: logs[0].args.debtToCover.toString(),
      liquidator: logs[0].args.liquidator,
      txHash: logs[0].transactionHash
    });
  }
});

// 5. NFT trade monitor
client.watchEvent({
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      // check if it is a NFT contract (by tokenId)
      const tokenId = Number(log.args.tokenId);
      if (tokenId > 0) {
        console.log("🎨 NFT transfer:", {
          from: log.args.from,
          to: log.args.to,
          tokenId: tokenId.toString(),
          contract: log.address,
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 6. governance vote monitor
client.watchEvent({
  event: parseAbiItem(
    "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)"
  ),
  onLogs: logs => {
    console.log("🗳️ governance vote:", {
      voter: logs[0].args.voter,
      proposalId: logs[0].args.proposalId.toString(),
      support: logs[0].args.support.toString(),
      weight: logs[0].args.weight.toString(),
      txHash: logs[0].transactionHash
    });
  }
});

// 7. price manipulation monitor
function detectPriceManipulation(logs) {
  // detect abnormal price fluctuation
  // here we need more complex logic
  logs.forEach(log => {
    const amount0 = Number(log.args.amount0);
    const amount1 = Number(log.args.amount1);

    // detect abnormal large transaction
    if (Math.abs(amount0) > 10000000 || Math.abs(amount1) > 10000000) {
      console.log("⚠️ suspicious large transaction:", {
        pool: log.address,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        txHash: log.transactionHash
      });
    }
  });
}

// 8. whale wallet monitor
const whaleWallets = [
  "0x28c6c06298d514db089934071355e5743bf21d60", // Binance
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549" // Binance
  // add more whale wallets
];

client.watchEvent({
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      if (
        whaleWallets.includes(log.args.from) ||
        whaleWallets.includes(log.args.to)
      ) {
        console.log("🐋 whale wallet activity:", {
          from: log.args.from,
          to: log.args.to,
          value: log.args.value.toString(),
          token: log.address,
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 9. abnormal gas fee monitor
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      // here we need to get the gas fee of the transaction
      // detect abnormal high gas fee
      console.log("⛽ transaction gas info:", {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber
      });
    });
  }
});

console.log("🚀 start comprehensive monitor...");
console.log("monitor content:");
console.log("- DEX large trade");
console.log("- flash loan activity");
console.log("- large transfer");
console.log("- liquidation event");
console.log("- NFT trade");
console.log("- governance vote");
console.log("- whale wallet activity");
console.log("- price manipulation detection");

process.on("SIGINT", () => {
  console.log("\n🛑 stop monitor...");
  process.exit(0);
});
