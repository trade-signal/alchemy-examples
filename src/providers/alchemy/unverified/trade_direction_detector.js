import "dotenv/config";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_WSS_URL) throw new Error("ALCHEMY_WSS_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(process.env.ALCHEMY_WSS_URL)
});

// 1. uniswap v3 trade direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const amount0 = Number(log.args.amount0);
      const amount1 = Number(log.args.amount1);

      let direction = "";
      if (amount0 > 0 && amount1 < 0) {
        direction = "sell token0, buy token1";
      } else if (amount0 < 0 && amount1 > 0) {
        direction = "buy token0, sell token1";
      }

      console.log("🔄 v3 trade direction:", {
        direction,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        sender: log.args.sender,
        pool: log.address,
        txHash: log.transactionHash
      });
    });
  }
});

// 2. uniswap v2 trade direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const amount0In = Number(log.args.amount0In);
      const amount1In = Number(log.args.amount1In);
      const amount0Out = Number(log.args.amount0Out);
      const amount1Out = Number(log.args.amount1Out);

      let direction = "";
      if (amount0In > 0 && amount0Out === 0) {
        direction = "buy token0";
      } else if (amount1In > 0 && amount1Out === 0) {
        direction = "buy token1";
      } else if (amount0In === 0 && amount0Out > 0) {
        direction = "sell token0";
      } else if (amount1In === 0 && amount1Out > 0) {
        direction = "sell token1";
      }

      console.log("🔄 v2 trade direction:", {
        direction,
        amount0In: amount0In.toString(),
        amount1In: amount1In.toString(),
        amount0Out: amount0Out.toString(),
        amount1Out: amount1Out.toString(),
        sender: log.args.sender,
        pool: log.address,
        txHash: log.transactionHash
      });
    });
  }
});

// 3. token transfer direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const from = log.args.from;
      const to = log.args.to;
      const value = Number(log.args.value);

      // exclude zero address (mint and burn)
      if (
        from !== "0x0000000000000000000000000000000000000000" &&
        to !== "0x0000000000000000000000000000000000000000"
      ) {
        console.log("💰 token transfer:", {
          from,
          to,
          value: value.toString(),
          token: log.address,
          direction: "transfer",
          txHash: log.transactionHash
        });
      } else if (from === "0x0000000000000000000000000000000000000000") {
        console.log("🪙 token mint:", {
          to,
          value: value.toString(),
          token: log.address,
          direction: "mint",
          txHash: log.transactionHash
        });
      } else if (to === "0x0000000000000000000000000000000000000000") {
        console.log("🔥 token burn:", {
          from,
          value: value.toString(),
          token: log.address,
          direction: "burn",
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 4. NFT transfer direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const from = log.args.from;
      const to = log.args.to;
      const tokenId = Number(log.args.tokenId);

      if (tokenId > 0) {
        // check if it is a NFT contract (by tokenId)
        let direction = "";
        if (from === "0x0000000000000000000000000000000000000000") {
          direction = "NFT mint";
        } else if (to === "0x0000000000000000000000000000000000000000") {
          direction = "NFT burn";
        } else {
          direction = "NFT transfer";
        }

        console.log("🎨 NFT activity:", {
          direction,
          from,
          to,
          tokenId: tokenId.toString(),
          contract: log.address,
          txHash: log.transactionHash
        });
      }
    });
  }
});

// 5. flash loan direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Flash(address indexed sender, address indexed recipient, uint256 amount0, uint256 amount1, uint256 paid0, uint256 paid1)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      const amount0 = Number(log.args.amount0);
      const amount1 = Number(log.args.amount1);
      const paid0 = Number(log.args.paid0);
      const paid1 = Number(log.args.paid1);

      console.log("⚡ flash loan:", {
        sender: log.args.sender,
        borrowed0: amount0.toString(),
        borrowed1: amount1.toString(),
        repaid0: paid0.toString(),
        repaid1: paid1.toString(),
        profit0: (paid0 - amount0).toString(),
        profit1: (paid1 - amount1).toString(),
        direction: "flash loan arbitrage",
        txHash: log.transactionHash
      });
    });
  }
});

// 6. liquidation direction detection
client.watchEvent({
  event: parseAbiItem(
    "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      console.log("💥 liquidation:", {
        user: log.args.user,
        liquidator: log.args.liquidator,
        collateralAsset: log.args.collateralAsset,
        debtAsset: log.args.debtAsset,
        debtToCover: log.args.debtToCover.toString(),
        liquidatedCollateralAmount:
          log.args.liquidatedCollateralAmount.toString(),
        direction: "liquidation",
        txHash: log.transactionHash
      });
    });
  }
});

// 7. borrow direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Borrow(address indexed reserve, address indexed user, address indexed onBehalfOf, uint256 amount, uint256 borrowRateMode, uint256 borrowRate, uint16 referral)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      console.log("🏦 borrow:", {
        user: log.args.user,
        reserve: log.args.reserve,
        amount: log.args.amount.toString(),
        borrowRate: log.args.borrowRate.toString(),
        direction: "borrow",
        txHash: log.transactionHash
      });
    });
  }
});

// 8. deposit direction detection
client.watchEvent({
  event: parseAbiItem(
    "event Deposit(address indexed reserve, address indexed user, address indexed onBehalfOf, uint256 amount, uint16 referral)"
  ),
  onLogs: logs => {
    logs.forEach(log => {
      console.log("💰 deposit:", {
        user: log.args.user,
        reserve: log.args.reserve,
        amount: log.args.amount.toString(),
        direction: "deposit",
        txHash: log.transactionHash
      });
    });
  }
});

console.log("🎯 start trade direction detection...");
console.log("detection content:");
console.log("- DEX trade direction (V2/V3)");
console.log("- token transfer direction");
console.log("- NFT transfer direction");
console.log("- flash loan direction");
console.log("- liquidation direction");
console.log("- borrow direction");

process.on("SIGINT", () => {
  console.log("\n🛑 stop detection...");
  process.exit(0);
});
