import dayjs from "dayjs";

const getNow = () => {
  return dayjs().toISOString();
};

const getNowMinus = (value, unit) => {
  return dayjs().subtract(value, unit).toISOString();
};

// 5m、1h、24h、7d
export const timeRangeToBlockRange = timeRange => {
  try {
    const suffix = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (suffix) {
      case "m":
        return {
          since: getNowMinus(value, "minutes"),
          till: getNow()
        };
      case "h":
        return {
          since: getNowMinus(value, "hours"),
          till: getNow()
        };
      case "d":
        return {
          since: getNowMinus(value, "days"),
          till: getNow()
        };
      case "w":
        return {
          since: getNowMinus(value, "weeks"),
          till: getNow()
        };
      default:
        throw new Error(`Invalid time range: ${timeRange}`);
    }
  } catch (error) {
    throw new Error(`Invalid time range: ${timeRange}, ${error}`);
  }
};
