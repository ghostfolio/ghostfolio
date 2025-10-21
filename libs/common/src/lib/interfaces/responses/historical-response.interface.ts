import { DataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';

export interface HistoricalResponse {
  historicalData: {
    [date: string]: DataProviderHistoricalResponse;
  };
}
