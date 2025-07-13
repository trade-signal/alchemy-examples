import "dotenv/config";
import fs from "fs";
import dayjs from "dayjs";
import path from "path";
import axios from "axios";
import { toHex, hexToNumber } from "viem";

if (!process.env.ALCHEMY_RPC_URL) throw new Error("ALCHEMY_RPC_URL is not set");

const request = axios.create({
  baseURL: process.env.ALCHEMY_RPC_URL,
  headers: {
    accept: "application/json",
    "Content-Type": "application/json"
  }
});

request.interceptors.response.use(response => {
  if (response.data.id === 1 && !response.data.error) {
    return response.data.result;
  }
  const error = response.data.error;
  throw new Error(
    `Invalid response: ${error?.data || error?.message || "Unknown error"}`
  );
});

const formatTime = timestamp =>
  dayjs.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");

const getLatestBlockNumber = async () => {
  const response = await request.post("/", {
    id: 1,
    jsonrpc: "2.0",
    method: "eth_blockNumber",
    params: []
  });
  return hexToNumber(response);
};

const getBlockTimestamp = async blockNumber => {
  const response = await request.post("/", {
    id: 1,
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: [blockNumber, false]
  });

  if (!response || !response.timestamp) {
    return null;
  }

  return hexToNumber(response.timestamp);
};

// 二分查找找到最接近目标时间戳的区块
const findBlockByTimestamp = async (targetTimestamp, startBlock, endBlock) => {
  let left = startBlock;
  let right = endBlock;
  let closestBlock = startBlock;

  // get start block timestamp
  const startTimestamp = await getBlockTimestamp(toHex(startBlock));
  if (!startTimestamp) {
    throw new Error(`failed to get block ${startBlock} timestamp`);
  }

  let closestDiff = Math.abs(targetTimestamp - startTimestamp);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midTimestamp = await getBlockTimestamp(toHex(mid));

    if (!midTimestamp) {
      // if failed to get timestamp, move right
      left = mid + 1;
      continue;
    }

    const diff = Math.abs(targetTimestamp - midTimestamp);

    if (diff < closestDiff) {
      closestDiff = diff;
      closestBlock = mid;
    }

    if (midTimestamp < targetTimestamp) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return closestBlock;
};

// 使用二分查找找到时间范围对应的区块范围
const findBlockRangeByTimeRange = async (startTime, endTime) => {
  const currentBlock = await getLatestBlockNumber();
  console.log(`current block: ${currentBlock}`);

  // estimate start block (assume 12 seconds per block)
  const blocksPerSecond = 1 / 12;
  const timeDiff = endTime - startTime;
  const estimatedBlocks = Math.ceil(timeDiff * blocksPerSecond);
  const estimatedStartBlock = Math.max(0, currentBlock - estimatedBlocks * 2); // expand search range

  console.log(`estimated start block: ${estimatedStartBlock}`);

  // find start block by timestamp
  const startBlock = await findBlockByTimestamp(
    startTime,
    estimatedStartBlock,
    currentBlock
  );
  console.log(
    `found start block: ${startBlock} for time: ${formatTime(startTime)}`
  );

  return { startBlock, endBlock: currentBlock };
};

const getAssetTransfersByTimeRange = async ({
  address,
  startTime,
  endTime,
  maxCount = 1000,
  order = "desc"
}) => {
  console.log(
    `\ntime range: ${formatTime(startTime)} - ${formatTime(endTime)}`
  );

  // find exact block range by timestamp
  const { startBlock, endBlock } = await findBlockRangeByTimeRange(
    startTime,
    endTime
  );

  console.log(`exact block range: ${startBlock} - ${endBlock}`);

  // query buy operations (toAddress)
  const buyParams = {
    fromBlock: toHex(startBlock),
    toBlock: toHex(endBlock),
    toAddress: address,
    category: ["external", "internal", "erc20", "erc721", "erc1155"],
    maxCount: toHex(maxCount),
    order: order
  };

  console.log("query buy operations...");
  const buyResponse = await request.post(
    "/",
    JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [buyParams]
    })
  );

  console.log(`buy operations: ${buyResponse?.transfers?.length || 0}`);

  // query sell operations (fromAddress)
  const sellParams = {
    fromBlock: `0x${startBlock.toString(16)}`,
    toBlock: `0x${endBlock.toString(16)}`,
    fromAddress: address,
    category: ["external", "internal", "erc20", "erc721", "erc1155"],
    maxCount: `0x${maxCount.toString(16)}`,
    order: order
  };

  console.log("query sell operations...");
  const sellResponse = await request.post(
    "/",
    JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [sellParams]
    })
  );

  console.log(`sell operations: ${sellResponse?.transfers?.length || 0}`);

  // merge and filter transfers
  const allTransfers = [];
  let buyFilteredCount = 0;
  let sellFilteredCount = 0;

  // 处理买入记录
  if (buyResponse && buyResponse.transfers) {
    console.log("process buy operations...");
    for (const transfer of buyResponse.transfers) {
      const blockTimestamp = await getBlockTimestamp(transfer.blockNum);

      if (
        blockTimestamp &&
        blockTimestamp >= startTime &&
        blockTimestamp <= endTime
      ) {
        allTransfers.push({
          ...transfer,
          timestamp: blockTimestamp,
          date: formatTime(blockTimestamp),
          type: "buy" // mark as buy
        });
        buyFilteredCount++;
      }
    }
  }

  // 处理卖出记录
  if (sellResponse && sellResponse.transfers) {
    console.log("process sell operations...");
    for (const transfer of sellResponse.transfers) {
      const blockTimestamp = await getBlockTimestamp(transfer.blockNum);

      if (
        blockTimestamp &&
        blockTimestamp >= startTime &&
        blockTimestamp <= endTime
      ) {
        allTransfers.push({
          ...transfer,
          timestamp: blockTimestamp,
          date: formatTime(blockTimestamp),
          type: "sell" // mark as sell
        });
        sellFilteredCount++;
      }
    }
  }

  console.log(
    `after time filter: buy ${buyFilteredCount} operations, sell ${sellFilteredCount} operations`
  );

  // sort by timestamp
  allTransfers.sort((a, b) => {
    if (order === "desc") {
      return b.timestamp - a.timestamp;
    } else {
      return a.timestamp - b.timestamp;
    }
  });

  return {
    transfers: allTransfers,
    totalCount: allTransfers.length,
    buyCount: allTransfers.filter(t => t.type === "buy").length,
    sellCount: allTransfers.filter(t => t.type === "sell").length,
    searchInfo: {
      startBlock,
      endBlock,
      buyRawCount: buyResponse?.transfers?.length || 0,
      sellRawCount: sellResponse?.transfers?.length || 0
    }
  };
};

// get last 24 hours transfers
async function getLast24HoursTransfers(address) {
  const now = dayjs().unix();
  const twentyFourHoursAgo = now - 24 * 60 * 60;

  console.log(`\nget last 24 hours transfers...`);
  console.log(`start time: ${formatTime(twentyFourHoursAgo)}`);
  console.log(`end time: ${formatTime(now)}`);

  return await getAssetTransfersByTimeRange({
    address,
    startTime: twentyFourHoursAgo,
    endTime: now,
    order: "desc"
  });
}

async function main() {
  const savePath = path.join(process.cwd(), "tmp", "transaction_history.json");

  try {
    const response = await getLast24HoursTransfers(
      "0x6982508145454ce325ddbe47a25d4ec3d2311933"
    );

    fs.writeFileSync(savePath, JSON.stringify(response, null, 2));
    console.log(`\ndata saved to: ${savePath}`);
  } catch (error) {
    console.error("execution failed:", error.message);
  }
}

main();
