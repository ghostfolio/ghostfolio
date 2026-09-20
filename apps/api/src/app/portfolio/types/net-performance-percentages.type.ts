import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

export type NetPerformancePercentages = Required<
  Pick<
    HistoricalDataItem,
    | 'netPerformanceInPercentage'
    | 'netPerformanceInPercentageWithCurrencyEffect'
  >
>;
