import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { Granularity } from '@ghostfolio/common/types';
import { DataSource, SymbolProfile } from '@prisma/client';

export interface DataProviderInterface {
  canHandle(symbol: string): boolean;

  getAssetProfile(aSymbol: string): Promise<Partial<SymbolProfile>>;

  getHistorical(
    aSymbol: string,
    aGranularity: Granularity,
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }>; // TODO: Return only one symbol

  getMaxNumberOfSymbolsPerRequest?(): number;

  getName(): DataSource;

  getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }>;

  search(aQuery: string): Promise<{ items: LookupItem[] }>;
}
