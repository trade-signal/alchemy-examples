import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const getUniswapV2Pools = async (apiKey, { count = 10 }) => {
  const query = gql`
    query ($count: Int!) {
      EVM(dataset: combined, network: eth) {
        Events(
          orderBy: { descending: Block_Number }
          limit: { count: $count }
          where: {
            Log: {
              SmartContract: {
                is: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
              }
              Signature: { Name: { is: "PairCreated" } }
            }
          }
        ) {
          Log {
            Signature {
              Name
              Parsed
              Signature
            }
            SmartContract
          }
          Transaction {
            Hash
          }
          Block {
            Date
            Number
          }
          Arguments {
            Type
            Value {
              ... on EVM_ABI_Address_Value_Arg {
                address
              }
            }
          }
        }
      }
    }
  `;

  const response = await request({
    url: "https://streaming.bitquery.io/graphql",
    document: query,
    variables: { count },
    requestHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (response.EVM && response.EVM.Events) {
    return response.EVM.Events;
  }

  return [];
};

const savePath = path.join(
  process.cwd(),
  "tmp",
  "bitquery_uniswap_v2_pools.json"
);

async function main() {
  const apiKey = process.env.BITQUERY_API_KEY;
  if (!apiKey) {
    throw new Error("BITQUERY_API_KEY is not set");
  }

  if (fs.existsSync(savePath)) {
    console.log(`Removing existing file ${savePath}`);
    fs.unlinkSync(savePath);
  }

  const pools = await getUniswapV2Pools(apiKey, { count: 100 });

  fs.writeFileSync(savePath, JSON.stringify(pools, null, 2));

  console.log(`Saved to ${savePath}`);
}

main();
