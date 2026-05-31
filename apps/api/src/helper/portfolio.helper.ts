import { Type as ActivityType } from '@prisma/client';
import { Big } from 'big.js';

export function getLatestMarketPriceOnOrBefore({
  dateString,
  marketSymbolMap,
  symbol
}: {
  dateString: string;
  marketSymbolMap: { [date: string]: { [symbol: string]: Big } };
  symbol: string;
}): Big | undefined {
  let latestDate: string | undefined;
  let latestPrice: Big | undefined;

  for (const date of Object.keys(marketSymbolMap)) {
    const price = marketSymbolMap[date]?.[symbol];

    if (date <= dateString && price && (!latestDate || date > latestDate)) {
      latestDate = date;
      latestPrice = price;
    }
  }

  return latestPrice;
}

export function getFactor(activityType: ActivityType) {
  let factor: number;

  switch (activityType) {
    case 'BUY':
      factor = 1;
      break;
    case 'SELL':
      factor = -1;
      break;
    default:
      factor = 0;
      break;
  }

  return factor;
}
