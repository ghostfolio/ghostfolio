import { DataProviderHistoricalResponse } from '@ghostfolio/common/interfaces/responses/data-provider-response.interface';

export interface DividendsResponse {
  dividends: {
    [date: string]: DataProviderHistoricalResponse;
  };
}
