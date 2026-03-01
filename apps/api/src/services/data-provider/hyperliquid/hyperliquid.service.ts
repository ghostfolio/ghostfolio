import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetAssetProfileParams,
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderHistoricalResponse,
  DataProviderInfo,
  DataProviderResponse,
  LookupItem,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import { addDays, format, isSameDay } from 'date-fns';

interface HyperliquidMetaResponse {
  universe: {
    isDelisted?: boolean;
    name: string;
  }[];
}

interface HyperliquidSpotMetaResponse {
  tokens: {
    fullName: string | null;
    index: number;
    name: string;
  }[];
  universe: {
    name: string;
    tokens: number[];
  }[];
}

interface HyperliquidCandleItem {
  c: string;
  t: number;
}

interface SpotSymbolMapItem {
  name: string;
  pairId: string;
  symbol: string;
}

interface HyperliquidCatalog {
  perpSymbols: Set<string>;
  spotSymbols: Map<string, SpotSymbolMapItem>;
}

@Injectable()
export class HyperliquidService implements DataProviderInterface {
  private static readonly API_URL = 'https://api.hyperliquid.xyz/info';
  private static readonly CATALOG_TTL_MS = 5 * 60 * 1000;
  private catalogCache?: { expiresAt: number; value: HyperliquidCatalog };
  private catalogPromise?: Promise<HyperliquidCatalog>;

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    const { perpSymbols, spotSymbols } = await this.getCatalog();
    const upperCaseSymbol = symbol.toUpperCase();

    if (perpSymbols.has(upperCaseSymbol)) {
      return {
        assetClass: AssetClass.LIQUIDITY,
        assetSubClass: AssetSubClass.CRYPTOCURRENCY,
        currency: DEFAULT_CURRENCY,
        dataSource: this.getName(),
        name: `${upperCaseSymbol} Perpetual`,
        symbol: upperCaseSymbol
      };
    }

    const spotSymbol = spotSymbols.get(upperCaseSymbol);
    if (spotSymbol) {
      return {
        assetClass: AssetClass.LIQUIDITY,
        assetSubClass: AssetSubClass.CRYPTOCURRENCY,
        currency: DEFAULT_CURRENCY,
        dataSource: this.getName(),
        name: spotSymbol.name,
        symbol: spotSymbol.symbol
      };
    }

    return undefined;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.HYPERLIQUID,
      isPremium: false,
      name: 'Hyperliquid',
      url: 'https://hyperliquid.xyz'
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    granularity = 'day',
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: DataProviderHistoricalResponse };
  }> {
    const result: {
      [symbol: string]: { [date: string]: DataProviderHistoricalResponse };
    } = {
      [symbol]: {}
    };

    try {
      const normalizedSymbol = symbol.toUpperCase();
      const { perpSymbols, spotSymbols } = await this.getCatalog();
      const spot = spotSymbols.get(normalizedSymbol);
      const coin = perpSymbols.has(normalizedSymbol)
        ? normalizedSymbol
        : spot?.pairId;

      if (!coin) {
        return {};
      }

      if (isSameDay(from, to)) {
        to = addDays(to, 1);
      }

      const interval = granularity === 'month' ? '1M' : '1d';
      const candles = await this.postInfo<HyperliquidCandleItem[]>({
        payload: {
          req: {
            coin,
            endTime: to.getTime(),
            interval,
            startTime: from.getTime()
          },
          type: 'candleSnapshot'
        },
        requestTimeout
      });

      for (const candle of candles ?? []) {
        const marketPrice = Number.parseFloat(candle.c);

        if (Number.isFinite(marketPrice)) {
          result[symbol][format(new Date(candle.t), DATE_FORMAT)] = {
            marketPrice
          };
        }
      }
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }

    return result;
  }

  public getName(): DataSource {
    return DataSource.HYPERLIQUID;
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 200;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: DataProviderResponse }> {
    const response: { [symbol: string]: DataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const { perpSymbols, spotSymbols } = await this.getCatalog();
      const mids = await this.postInfo<Record<string, string>>({
        payload: { type: 'allMids' },
        requestTimeout
      });

      for (const symbol of symbols) {
        const normalizedSymbol = symbol.toUpperCase();
        const spot = spotSymbols.get(normalizedSymbol);
        const marketSymbol = perpSymbols.has(normalizedSymbol)
          ? normalizedSymbol
          : spot?.pairId;
        const marketPrice = this.parseNumericValue(mids?.[marketSymbol]);

        if (!marketSymbol || marketPrice === undefined) {
          continue;
        }

        response[symbol] = {
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          marketPrice,
          marketState: 'open'
        };
      }
    } catch (error) {
      Logger.error(error, 'HyperliquidService');
    }

    return response;
  }

  public getTestSymbol() {
    return 'BTC';
  }

  public async search({ query }: GetSearchParams): Promise<LookupResponse> {
    const normalizedQuery = query?.trim()?.toUpperCase() ?? '';
    const items: LookupItem[] = [];

    if (!normalizedQuery) {
      return { items };
    }

    try {
      const { perpSymbols, spotSymbols } = await this.getCatalog();

      for (const perpSymbol of perpSymbols) {
        const name = `${perpSymbol} Perpetual`;

        if (
          !perpSymbol.includes(normalizedQuery) &&
          !name.toUpperCase().includes(normalizedQuery)
        ) {
          continue;
        }

        items.push({
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: AssetSubClass.CRYPTOCURRENCY,
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          name,
          symbol: perpSymbol
        });
      }

      for (const spotSymbol of spotSymbols.values()) {
        if (
          !spotSymbol.symbol.includes(normalizedQuery) &&
          !spotSymbol.name.toUpperCase().includes(normalizedQuery)
        ) {
          continue;
        }

        items.push({
          assetClass: AssetClass.LIQUIDITY,
          assetSubClass: AssetSubClass.CRYPTOCURRENCY,
          currency: DEFAULT_CURRENCY,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          name: spotSymbol.name,
          symbol: spotSymbol.symbol
        });
      }

      items.sort(({ name: name1 }, { name: name2 }) => {
        return name1.toLowerCase().localeCompare(name2.toLowerCase());
      });
    } catch (error) {
      Logger.error(error, 'HyperliquidService');
    }

    return { items };
  }

  private async getCatalog() {
    const now = Date.now();

    if (this.catalogCache && this.catalogCache.expiresAt > now) {
      return this.catalogCache.value;
    }

    if (this.catalogPromise) {
      return this.catalogPromise;
    }

    this.catalogPromise = this.loadCatalog();

    try {
      const catalog = await this.catalogPromise;
      this.catalogCache = {
        expiresAt: now + HyperliquidService.CATALOG_TTL_MS,
        value: catalog
      };

      return catalog;
    } finally {
      this.catalogPromise = undefined;
    }
  }

  private async loadCatalog(): Promise<HyperliquidCatalog> {
    const requestTimeout = this.configurationService.get('REQUEST_TIMEOUT');
    const [meta, spotMeta] = await Promise.all([
      this.postInfo<HyperliquidMetaResponse>({
        payload: { type: 'meta' },
        requestTimeout
      }),
      this.postInfo<HyperliquidSpotMetaResponse>({
        payload: { type: 'spotMeta' },
        requestTimeout
      })
    ]);

    const perpSymbols = new Set<string>();
    const spotSymbols = new Map<string, SpotSymbolMapItem>();

    for (const universeItem of meta?.universe ?? []) {
      if (!universeItem?.name || universeItem.isDelisted) {
        continue;
      }

      perpSymbols.add(universeItem.name.toUpperCase());
    }

    const tokenByIndex = new Map(
      spotMeta?.tokens?.map((token) => {
        return [token.index, token];
      })
    );

    for (const universeItem of spotMeta?.universe ?? []) {
      if (!universeItem?.name || universeItem.tokens.length < 2) {
        continue;
      }

      const baseToken = tokenByIndex.get(universeItem.tokens[0]);
      const quoteToken = tokenByIndex.get(universeItem.tokens[1]);

      if (!baseToken?.name || !quoteToken?.name) {
        continue;
      }

      const canonicalSymbol =
        `${baseToken.name}/${quoteToken.name}`.toUpperCase();
      const name = `${baseToken.fullName ?? baseToken.name} / ${
        quoteToken.fullName ?? quoteToken.name
      }`;

      spotSymbols.set(canonicalSymbol, {
        name,
        pairId: universeItem.name,
        symbol: canonicalSymbol
      });
    }

    return { perpSymbols, spotSymbols };
  }

  private parseNumericValue(value?: string) {
    const numericValue = Number.parseFloat(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    return undefined;
  }

  private async postInfo<T>({
    payload,
    requestTimeout
  }: {
    payload: unknown;
    requestTimeout: number;
  }): Promise<T> {
    const response = await fetch(HyperliquidService.API_URL, {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      signal: AbortSignal.timeout(requestTimeout)
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data?.type === 'error') {
      throw new Error(data?.message ?? 'Hyperliquid API error');
    }

    return data as T;
  }
}
