import { DataProviderHistoricalResponse } from '@ghostfolio/common/interfaces';

export interface HistoricalResponse {
  historicalData: {
    [date: string]: DataProviderHistoricalResponse;
  };
}
