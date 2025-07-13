import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const query = gql`
  query ($address: String!, $since: DateTime!, $till: DateTime!, $limit: Int!) {
    EVM(dataset: combined, network: eth) {
      Transfers(
        where: {
          any: [
            { Transfer: { Sender: { is: $address } } }
            { Transfer: { Receiver: { is: $address } } }
          ]
          Transfer: {
            Currency: { Native: false, Fungible: true }
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

const apiKey = process.env.BITQUERY_API_KEY;
if (!apiKey) {
  throw new Error("BITQUERY_API_KEY is not set");
}

const savePath = path.join(
  process.cwd(),
  "tmp",
  "bitquery_erc20_transfers.json"
);

// 获取近24小时的时间范围
const now = dayjs();
const since = now.subtract(24, "hours");
const till = now;

if (fs.existsSync(savePath)) {
  console.log(`Removing existing file ${savePath}`);
  fs.unlinkSync(savePath);
}

const response = await request({
  url: "https://streaming.bitquery.io/graphql",
  document: query,
  variables: {
    address: "0x5bd0e4415eab41a5ee5d4fe2d95a84cf086cec79",
    since: since.utc().toISOString(),
    till: till.utc().toISOString(),
    limit: 100
  },
  requestHeaders: {
    Authorization: `Bearer ${apiKey}`
  }
});

fs.writeFileSync(savePath, JSON.stringify(response, null, 2));

console.log(`Saved to ${savePath}`);
