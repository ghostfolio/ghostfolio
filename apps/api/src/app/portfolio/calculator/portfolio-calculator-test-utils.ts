import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { parseDate } from '@ghostfolio/common/helper';
import {
  Activity,
  ExportResponse,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const activityDummyData = {
  accountId: undefined,
  accountUserId: undefined,
  comment: undefined,
  createdAt: new Date(),
  currency: undefined,
  exchangeRate: null,
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

/**
 * Loads the activities of an export file in test/import/ok for the portfolio
 * calculator. The user currency of the file is the base currency of the test.
 *
 * The activity currency must be the asset profile currency. The helper does
 * not convert the fee to the base currency and does not load the tags.
 */
export function loadActivitiesFromExportFile(fileName: string): {
  activities: Activity[];
  userCurrency: string;
} {
  const exportResponse = loadExportFile(
    join(__dirname, '../../../../../../test/import/ok', fileName)
  );

  const activities: Activity[] = exportResponse.activities.map((activity) => {
    return {
      ...activityDummyData,
      ...activity,
      assetProfile: {
        ...assetProfileDummyData,
        currency: activity.currency,
        dataSource: activity.dataSource,
        name: activity.symbol,
        symbol: activity.symbol
      },
      date: parseDate(activity.date),
      feeInAssetProfileCurrency: activity.fee,
      feeInBaseCurrency: activity.fee,
      tags: [],
      unitPriceInAssetProfileCurrency: activity.unitPrice
    };
  });

  return { activities, userCurrency: exportResponse.user.settings.currency };
}

export function loadExportFile(filePath: string): ExportResponse {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
