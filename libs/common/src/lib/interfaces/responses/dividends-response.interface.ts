import { IDataProviderHistoricalResponse } from '@ghostfolio/api/services/interfaces/interfaces';

export interface DividendsResponse {
  dividends: {
    [date: string]: IDataProviderHistoricalResponse;
  };
}
