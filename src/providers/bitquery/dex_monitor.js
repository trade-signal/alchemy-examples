import "dotenv/config";
import { gql, request } from "graphql-request";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import path from "path";
import fs from "fs";

dayjs.extend(utc);

const getDEXTrades = async (
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
          TransactionStatus {
            Success
          }
          Log {
            Signature {
              Name
              Signature
            }
            SmartContract
          }
          Receipt {
            ContractAddress
          }
          Fee {
            Burnt
            BurntInUSD
            EffectiveGasPrice
            EffectiveGasPriceInUSD
            GasRefund
            MinerReward
            MinerRewardInUSD
            PriorityFeePerGas
            PriorityFeePerGasInUSD
            Savings
            SavingsInUSD
            SenderFee
            SenderFeeInUSD
          }
          Call {
            From
            Gas
            GasUsed
            InternalCalls
            Signature {
              Name
              Signature
            }
            To
            Value
          }
          Trade {
            Amount
            AmountInUSD
            Buyer
            Price
            PriceInUSD
            Seller
            Sender
            Success
            URIs
            Fees {
              Amount
              AmountInUSD
              Payer
              Recipient
            }
            Dex {
              ProtocolName
              ProtocolFamily
            }
            Currency {
              Name
              Symbol
              SmartContract
            }
            Side {
              Amount
              AmountInUSD
              Buyer
              Currency {
                Name
                Symbol
                SmartContract
              }
              Ids
              OrderId
              Seller
              Type
              URIs
            }
          }
          Transaction {
            Hash
            From
            To
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

const savePath = path.join(process.cwd(), "tmp", "bitquery_dex_trades.json");

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

  const trades = await getDEXTrades(apiKey, {
    count: 50,
    since: oneHourAgo,
    till: now
    // tokenAddress: "0x6a1b2ae3a55b5661b40d86c2bf805f7dadb16978", // 可选：指定token
    // walletAddress: "0x...", // 可选：指定钱包
  });

  fs.writeFileSync(savePath, JSON.stringify(trades, null, 2));
  console.log(`Saved ${trades.length} DEX trades to ${savePath}`);
}

main();
