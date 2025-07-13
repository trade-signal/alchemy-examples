import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const getEthTransfers = async (
  apiKey,
  { address, since, till, limit = 100 }
) => {
  const query = gql`
    query (
      $address: String!
      $since: DateTime!
      $till: DateTime!
      $limit: Int!
    ) {
      EVM(dataset: combined, network: eth) {
        Transfers(
          where: {
            Transfer: {
              Currency: {
                Native: false
                Fungible: true
                SmartContract: { is: $address }
              }
              Amount: { gt: "0" }
            }
            Block: { Time: { since: $since, till: $till } }
          }
          orderBy: { descending: Block_Number }
          limit: { count: $limit }
        ) {
          Transaction {
            Time
            Hash
          }
          Transfer {
            Amount
            Sender
            Receiver
            Currency {
              Symbol
              Name
            }
          }
        }
      }
    }
  `;

  const response = await request({
    url: "https://streaming.bitquery.io/graphql",
    document: query,
    variables: {
      address,
      since: since.utc().toISOString(),
      till: till.utc().toISOString(),
      limit
    },
    requestHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (response.EVM && response.EVM.Transfers) {
    return response.EVM.Transfers;
  }

  return [];
};

const savePath = path.join(process.cwd(), "tmp", "bitquery_eth_transfers.json");

async function main() {
  const apiKey = process.env.BITQUERY_API_KEY;
  if (!apiKey) {
    throw new Error("BITQUERY_API_KEY is not set");
  }

  if (fs.existsSync(savePath)) {
    console.log(`Removing existing file ${savePath}`);
    fs.unlinkSync(savePath);
  }

  const eth_transfers = await getEthTransfers(apiKey, {
    address: "0xf4d7c00e85d4df0604d7ac7a8d4fdf0b262f1df8",
    since: dayjs().subtract(24, "hours"),
    till: dayjs(),
    limit: 1000
  });

  fs.writeFileSync(savePath, JSON.stringify(eth_transfers, null, 2));

  console.log(`Saved to ${savePath}, size: ${eth_transfers.length}`);
}

main();
