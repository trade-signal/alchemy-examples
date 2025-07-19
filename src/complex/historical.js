import { gql, request } from "graphql-request";
import { timeRangeToBlockRange } from "./date.js";

export async function getHistoricalSwapsFormBitquery({
  count = 20,
  since = null,
  till = null,
  token = null,
  wallet = null
}) {
  const whereConditions = [];

  if (since && till) {
    whereConditions.push(
      `Block: { Time: { since: "${since}", till: "${till}" } }`
    );
  }

  if (token) {
    whereConditions.push(
      `Trade: { Currency: { SmartContract: { is: "${token}" } } }`
    );
  }
  if (wallet) {
    whereConditions.push(`Transaction: { From: { is: "${wallet}" } }`);
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
      Authorization: `Bearer ${process.env.BITQUERY_API_KEY}`
    }
  });

  if (response.EVM && response.EVM.DEXTradeByTokens) {
    return response.EVM.DEXTradeByTokens;
  }

  return [];
}

export async function getHistoricalSwapsFormBitqueryByRange({
  count = 20,
  token = null,
  wallet = null,
  timeRange = null
}) {
  const { since, till } = timeRangeToBlockRange(timeRange);

  const swaps = await getHistoricalSwapsFormBitquery({
    count,
    since,
    till,
    token,
    wallet
  });

  return swaps;
}
