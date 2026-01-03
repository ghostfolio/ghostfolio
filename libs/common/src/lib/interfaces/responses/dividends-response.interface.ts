import { DataProviderHistoricalResponse } from '@ghostfolio/common/interfaces';

export interface DividendsResponse {
  dividends: {
    [date: string]: DataProviderHistoricalResponse;
  };
}
