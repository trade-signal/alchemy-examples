import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const getUniswapPoolsByToken = async (apiKey, { count = 10, token }) => {
  const query = gql`
    query ($count: Int!, $token: String!) {
      EVM(dataset: combined, network: eth) {
        Events(
          limit: { count: $count }
          orderBy: { descending: Block_Number }
          where: {
            Log: {
              SmartContract: {
                is: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
              }
              Signature: { Name: { is: "PairCreated" } }
            }
            Arguments: { includes: { Value: { Address: { in: [$token] } } } }
          }
        ) {
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
    variables: { count, token },
    requestHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (response.EVM && response.EVM.Events) {
    return response.EVM.Events;
  }

  return [];
};

const transformPools = pools => {
  return pools.map(pool => {
    return {
      token0: pool.Arguments[0].Value.address,
      token1: pool.Arguments[1].Value.address,
      pool: pool.Arguments[2].Value.address
    };
  });
};

async function main() {
  const apiKey = process.env.BITQUERY_API_KEY;
  if (!apiKey) {
    throw new Error("BITQUERY_API_KEY is not set");
  }

  const savePath = path.join(
    process.cwd(),
    "tmp",
    "bitquery_uniswap_pools_by_token.json"
  );

  if (fs.existsSync(savePath)) {
    console.log(`Removing existing file ${savePath}`);
    fs.unlinkSync(savePath);
  }

  const pools = await getUniswapPoolsByToken(apiKey, {
    count: 10,
    token: "0x82c194f52dd25f3b86a1ec17797c701fc17a7a1c"
  });

  const transformedPools = transformPools(pools);

  fs.writeFileSync(savePath, JSON.stringify(transformedPools, null, 2));
  console.log(`Saved pools to ${savePath}`);
}

main();
