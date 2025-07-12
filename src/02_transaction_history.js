import "dotenv/config";
import fs from "fs";
import path from "path";
import axios from "axios";
import { toHex } from "viem";

if (!process.env.ALCHEMY_RPC_URL) throw new Error("ALCHEMY_RPC_URL is not set");

const savePath = path.join(process.cwd(), "tmp", "transaction_history.json");

const request = axios.create({
  baseURL: process.env.ALCHEMY_RPC_URL,
  headers: {
    accept: "application/json",
    "Content-Type": "application/json"
  }
});

request.interceptors.response.use(response => {
  if (response.data.id === 1) {
    return response.data.result;
  }
  return null;
});

const getAssetTransfers = async ({
  address,
  maxCount = 100,
  pageKey = "0x0"
}) => {
  const params = {
    fromBlock: "0x0",
    toBlock: "latest",
    fromAddress: "0x0000000000000000000000000000000000000000",
    toAddress: address,
    // category: ["external", "internal", "erc20", "erc721", "erc1155"],
    category: ["erc20", "erc721", "erc1155"],
    pageKey: pageKey,
    maxCount: toHex(maxCount)
  };

  if (pageKey == "0x0" || toHex(pageKey) == "0x0") {
    delete params.pageKey;
  }

  const response = await request.post(
    "/",
    JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [params]
    })
  );
  return response;
};

async function main() {
  const response = await getAssetTransfers({
    address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    maxCount: 1000
  });
  if (!response) {
    console.error("Failed to get asset transfers");
    return;
  }

  fs.writeFileSync(savePath, JSON.stringify(response, null, 2));

  console.log(`Saved to ${savePath}`);
}

main();
