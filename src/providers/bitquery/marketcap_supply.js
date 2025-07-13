import "dotenv/config";
import { gql, request } from "graphql-request";

const getTokenSupply = async (apiKey, { address }) => {
  const query = gql`
    query ($address: String!) {
      EVM(network: eth, dataset: combined) {
        Transfers(
          where: {
            Transfer: {
              Currency: { SmartContract: { is: $address } }
              Success: true
            }
          }
        ) {
          minted: sum(
            of: Transfer_Amount
            if: {
              Transfer: {
                Sender: { is: "0x0000000000000000000000000000000000000000" }
              }
            }
          )
          burned: sum(
            of: Transfer_Amount
            if: {
              Transfer: {
                Receiver: { is: "0x0000000000000000000000000000000000000000" }
              }
            }
          )
        }
      }
    }
  `;

  const response = await request({
    url: "https://streaming.bitquery.io/graphql",
    document: query,
    variables: {
      address
    },
    requestHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (response.EVM && response.EVM.Transfers) {
    const { minted, burned } = response.EVM.Transfers[0];
    return { address, minted, burned };
  }

  return { address, minted: 0, burned: 0 };
};

const getTokenMarketcap = async (apiKey, { address }) => {
  const query = gql`
    query ($address: String!) {
      EVM(dataset: combined) {
        Transfers(
          limit: { count: 1 }
          where: {
            Call: { Create: true }
            Transfer: {
              Currency: { SmartContract: { is: $address } }
              Sender: { is: "0x0000000000000000000000000000000000000000" }
            }
          }
        ) {
          Transfer {
            Amount
            Sender
            Receiver
          }
          joinDEXTradeByTokens(
            limit: { count: 1 }
            join: inner
            Trade_Currency_SmartContract: Transfer_Currency_SmartContract
          ) {
            Trade {
              Price(maximum: Block_Time)
              PriceInUSD
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
      address
    },
    requestHeaders: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (response.EVM && response.EVM.Transfers) {
    return response.EVM.Transfers;
  }

  return 0;
};

async function main() {
  const apiKey = process.env.BITQUERY_API_KEY;
  if (!apiKey) {
    throw new Error("BITQUERY_API_KEY is not set");
  }

  // const tokenSupply = await getTokenSupply(apiKey, {
  //   address: "0xf4d7c00e85d4df0604d7ac7a8d4fdf0b262f1df8"
  // });
  // console.log(
  //   `address: ${tokenSupply.address}, minted: ${tokenSupply.minted}, burned: ${tokenSupply.burned}`
  // );

  const tokenMarketcap = await getTokenMarketcap(apiKey, {
    address: "0xe5b6fcc9177ac6c2846f5e0c11a84c28023d0965"
  });
  console.log(JSON.stringify(tokenMarketcap, null, 2));
}

main();
