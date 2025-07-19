import "dotenv/config";

import { getHistoricalSwapsFormBitqueryByRange } from "./historical.js";
import path from "path";
import fs from "fs";

const savePath = path.join(process.cwd(), "tmp", "swaps.json");

const main = async () => {
  const swaps = await getHistoricalSwapsFormBitqueryByRange({
    timeRange: "5m"
  });

  fs.writeFileSync(savePath, JSON.stringify(swaps, null, 2));
};

main();
