import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import {
  DataProviderInfo,
  LookupResponse
} from '@ghostfolio/common/interfaces';
import { Granularity } from '@ghostfolio/common/types';

import { DataSource, SymbolProfile } from '@prisma/client';

export interface DataProviderInterface {
  canHandle(symbol: string): boolean;

  getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>>;

  getDataProviderInfo(): DataProviderInfo;

  getDividends({
    from,
    granularity,
    requestTimeout,
    symbol,
    to
  }: GetDividendsParams): Promise<{
    [date: string]: IDataProviderHistoricalResponse;
  }>;

  getHistorical({
    from,
    granularity,
    requestTimeout,
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }>; // TODO: Return only one symbol

  getMaxNumberOfSymbolsPerRequest?(): number;

  getName(): DataSource;

  getQuotes({
    requestTimeout,
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }>;

  getTestSymbol(): string;

  search({ includeIndices, query }: GetSearchParams): Promise<LookupResponse>;
}

export interface GetDividendsParams {
  from: Date;
  granularity?: Granularity;
  requestTimeout?: number;
  symbol: string;
  to: Date;
}

export interface GetHistoricalParams {
  from: Date;
  granularity?: Granularity;
  requestTimeout?: number;
  symbol: string;
  to: Date;
}

export interface GetQuotesParams {
  requestTimeout?: number;
  symbols: string[];
}

export interface GetSearchParams {
  includeIndices?: boolean;
  query: string;
}
