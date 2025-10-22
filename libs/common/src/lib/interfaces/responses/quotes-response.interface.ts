import { DataProviderResponse } from '@ghostfolio/api/services/interfaces/interfaces';

export interface QuotesResponse {
  quotes: { [symbol: string]: DataProviderResponse };
}
