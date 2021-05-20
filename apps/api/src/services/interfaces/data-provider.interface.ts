import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { Granularity } from '@ghostfolio/common/types';

import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from './interfaces';

export interface DataProviderInterface {
  get(aSymbols: string[]): Promise<{ [symbol: string]: IDataProviderResponse }>;

  getHistorical(
    aSymbols: string[],
    aGranularity: Granularity,
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }>;

  search(aSymbol: string): Promise<{ items: LookupItem[] }>;
}
