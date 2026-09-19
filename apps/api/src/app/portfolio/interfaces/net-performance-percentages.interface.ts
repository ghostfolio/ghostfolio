import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

export interface NetPerformancePercentages extends Pick<
  HistoricalDataItem,
  'netPerformanceInPercentage' | 'netPerformanceInPercentageWithCurrencyEffect'
> {}
