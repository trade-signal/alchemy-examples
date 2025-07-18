import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const getDEXTradesOptimized = async (
  apiKey,
  {
    count = 20,
    since = null,
    till = null,
    tokenAddress = null,
    walletAddress = null
  }
) => {
  // 构建 where 条件
  let whereConditions = [];

  if (since && till) {
    whereConditions.push(
      `Block: { Time: { since: "${since}", till: "${till}" } }`
    );
  }

  if (tokenAddress) {
    whereConditions.push(
      `Currency: { SmartContract: { is: "${tokenAddress}" } }`
    );
  }

  if (walletAddress) {
    whereConditions.push(`Transaction: { From: { is: "${walletAddress}" } }`);
  }

  const whereClause =
    whereConditions.length > 0 ? whereConditions.join(", ") : "";

  // 优化版本：只返回必要字段
  const query = gql`
    query ($count: Int!) {
      EVM(dataset: combined, network: eth) {
        DEXTradeByTokens(
          limit: { count: $count }
          ${whereClause ? `where: { ${whereClause} }` : ""}
        ) {
          Block {
            Time
            Number
          }
          Trade {
            Amount
            AmountInUSD
            Buyer
            Price
            PriceInUSD
            Seller
            Success
            Dex {
              ProtocolName
            }
            Currency {
              Symbol
              SmartContract
            }
            Side {
              Amount
              AmountInUSD
              Currency {
                Symbol
                SmartContract
              }
              Type
            }
          }
          Transaction {
            Hash
            From
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

  if (response.EVM && response.EVM.DEXTradeByTokens) {
    return response.EVM.DEXTradeByTokens;
  }

  return [];
};

const savePath = path.join(
  process.cwd(),
  "tmp",
  "bitquery_dex_trades_optimized.json"
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

  const oneHourAgo = dayjs().subtract(1, "hour").toISOString();
  const now = dayjs().toISOString();

  const trades = await getDEXTradesOptimized(apiKey, {
    count: 20, // 减少数量
    since: oneHourAgo,
    till: now
  });

  fs.writeFileSync(savePath, JSON.stringify(trades, null, 2));
  console.log(`Saved ${trades.length} optimized DEX trades to ${savePath}`);
}

main();
