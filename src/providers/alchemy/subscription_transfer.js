import "dotenv/config";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import { mainnet } from "viem/chains";

if (!process.env.ALCHEMY_WSS_URL) throw new Error("ALCHEMY_WSS_URL is not set");

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(process.env.ALCHEMY_WSS_URL)
});

client.watchEvent({
  address: "0x5d2ca7c33753d0438c826cf363ebba26f73c5d6d",
  event: parseAbiItem(
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ),
  onLogs: logs => {
    console.log(logs);
  },
  onError: error => {
    console.log(error);
  }
});
