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

  getDividends({
    from,
    granularity,
    symbol,
    to
  }: {
    from: Date;
    granularity: Granularity;
    symbol: string;
    to: Date;
  }): Promise<{ [date: string]: IDataProviderHistoricalResponse }>;

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

  getQuotes({
    requestTimeout,
    symbols
  }: {
    requestTimeout?: number;
    symbols: string[];
  }): Promise<{ [symbol: string]: IDataProviderResponse }>;

  getTestSymbol(): string;

  search({
    includeIndices,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }): Promise<{ items: LookupItem[] }>;
}
