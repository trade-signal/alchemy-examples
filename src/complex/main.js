import "dotenv/config";

import { getHistoricalSwapsFormBitqueryByRange } from "./historical.js";
import path from "path";
import fs from "fs";

const savePath = path.join(process.cwd(), "tmp", "swaps.json");

const main = async () => {
  const swaps = await getHistoricalSwapsFormBitqueryByRange({
    count: 1000,
    token: "0x2e2e7a1f05946ecb2b43b99e3fc2984fa7d7e3bc",
    timeRange: "1d"
  });

  console.log(`Found ${swaps.length} swaps`);

  fs.writeFileSync(savePath, JSON.stringify(swaps, null, 2));
};

main();
