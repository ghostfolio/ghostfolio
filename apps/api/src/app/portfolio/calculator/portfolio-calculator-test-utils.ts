import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  ExportResponse,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { readFileSync } from 'node:fs';

export const activityDummyData = {
  accountId: undefined,
  accountUserId: undefined,
  comment: undefined,
  createdAt: new Date(),
  currency: undefined,
  fee: undefined,
  feeInAssetProfileCurrency: undefined,
  feeInBaseCurrency: undefined,
  id: undefined,
  symbolProfileId: undefined,
  unitPrice: undefined,
  unitPriceInAssetProfileCurrency: undefined,
  updatedAt: new Date(),
  userId: undefined,
  value: undefined,
  valueInBaseCurrency: undefined
};

export const assetProfileDummyData = {
  activitiesCount: undefined,
  assetClass: undefined,
  assetSubClass: undefined,
  countries: [],
  createdAt: undefined,
  holdings: [],
  id: undefined,
  isActive: true,
  sectors: [],
  updatedAt: undefined
};

export const userDummyData = {
  id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
};

/**
 * Returns the last chart item of getPerformance() for each date range
 */
export async function getPerformanceByDateRange({
  dateRanges,
  portfolioCalculator
}: {
  dateRanges: DateRange[];
  portfolioCalculator: PortfolioCalculator;
}): Promise<{ [dateRange: string]: HistoricalDataItem }> {
  const performanceByDateRange: { [dateRange: string]: HistoricalDataItem } =
    {};

  for (const dateRange of dateRanges) {
    const { endDate, startDate } = getIntervalFromDateRange({ dateRange });

    const { chart } = await portfolioCalculator.getPerformance({
      end: endDate,
      start: startDate
    });

    performanceByDateRange[dateRange] = chart.at(-1);
  }

  return performanceByDateRange;
}

export function loadExportFile(filePath: string): ExportResponse {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
