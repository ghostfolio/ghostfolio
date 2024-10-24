import { DataProviderInfo } from '@ghostfolio/common/interfaces';
import { Granularity } from '@ghostfolio/common/types';

import { DataSource, SymbolProfile } from '@prisma/client';

import { LookupItem } from '../../../app/symbol/interfaces/lookup-item.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';

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
    symbol,
    to
  }: GetDividendsParams): Promise<
    Record<string, IDataProviderHistoricalResponse>
  >;

  getHistorical({
    from,
    granularity,
    requestTimeout,
    symbol,
    to
  }: GetHistoricalParams): Promise<
    Record<string, Record<string, IDataProviderHistoricalResponse>>
  >; // TODO: Return only one symbol

  getMaxNumberOfSymbolsPerRequest?(): number;

  getName(): DataSource;

  getQuotes({
    requestTimeout,
    symbols
  }: GetQuotesParams): Promise<Record<string, IDataProviderResponse>>;

  getTestSymbol(): string;

  search({
    includeIndices,
    query
  }: GetSearchParams): Promise<{ items: LookupItem[] }>;
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
