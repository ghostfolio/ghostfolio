import { DataProviderResponse } from '@ghostfolio/common/interfaces';

export interface QuotesResponse {
  quotes: { [symbol: string]: DataProviderResponse };
}
