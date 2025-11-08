import { DataProviderResponse } from '@ghostfolio/common/interfaces/responses/data-provider-response.interface';

export interface QuotesResponse {
  quotes: { [symbol: string]: DataProviderResponse };
}
