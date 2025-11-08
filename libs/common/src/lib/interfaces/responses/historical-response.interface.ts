import { DataProviderHistoricalResponse } from '@ghostfolio/common/interfaces/responses/data-provider-response.interface';

export interface HistoricalResponse {
  historicalData: {
    [date: string]: DataProviderHistoricalResponse;
  };
}
