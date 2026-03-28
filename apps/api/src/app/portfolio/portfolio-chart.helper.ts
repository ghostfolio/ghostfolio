import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { eachYearOfInterval, endOfYear, format, max, min } from 'date-fns';

export async function getPerformanceByYear({
  end,
  portfolioCalculator,
  start
}: {
  end: Date;
  portfolioCalculator: PortfolioCalculator;
  start: Date;
}): Promise<HistoricalDataItem[]> {
  const chartByYear: HistoricalDataItem[] = [];

  for (const yearDate of eachYearOfInterval({ start, end })) {
    const intervalStart = max([yearDate, start]);
    const intervalEnd = min([endOfYear(yearDate), end]);

    const { chart } = await portfolioCalculator.getPerformance({
      end: intervalEnd,
      start: intervalStart
    });

    if (chart.length > 0) {
      chartByYear.push({
        ...chart.at(-1),
        date: format(yearDate, DATE_FORMAT)
      });
    }
  }

  return chartByYear;
}
