import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  EnhancedSymbolProfile,
  MarketSentiment,
  MarketSentimentAlignment,
  MarketSentimentSource,
  MarketSentimentSourceName,
  MarketSentimentTrend
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { AssetClass, DataSource } from '@prisma/client';
import { createHash } from 'node:crypto';

type AdanosSource = 'news' | 'polymarket' | 'reddit' | 'x';

type AdanosCompareRow = {
  bullish_pct?: number | null;
  buzz_score?: number | null;
  company_name?: string | null;
  market_count?: number | null;
  mentions?: number | null;
  ticker: string;
  trade_count?: number | null;
  trend?: string | null;
  unique_posts?: number | null;
  unique_tweets?: number | null;
};

type SupportedWatchlistItem = Pick<
  EnhancedSymbolProfile,
  'assetClass' | 'dataSource' | 'name' | 'symbol'
>;

const ADANOS_API_BASE_URL = 'https://api.adanos.org';
const ADANOS_COMPARE_LOOKBACK_DAYS = 7;
const ADANOS_MAX_TICKERS_PER_REQUEST = 10;
const SUPPORTED_SOURCES: AdanosSource[] = ['reddit', 'x', 'news', 'polymarket'];
const SOURCE_ORDER: MarketSentimentSourceName[] = [
  'REDDIT',
  'X',
  'NEWS',
  'POLYMARKET'
];

@Injectable()
export class MarketSentimentService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  public canHandle() {
    return !!this.configurationService.get('API_KEY_ADANOS');
  }

  public async getHoldingMarketSentiment(
    assetProfile?: SupportedWatchlistItem
  ): Promise<MarketSentiment> {
    if (!assetProfile) {
      return undefined;
    }

    const [item] = await this.getWatchlistMarketSentiment([assetProfile]);

    return item?.marketSentiment;
  }

  public async getWatchlistMarketSentiment(items: SupportedWatchlistItem[]) {
    if (!this.canHandle()) {
      return [];
    }

    const supportedItems = items.filter(
      (item): item is SupportedWatchlistItem => {
        return !!item && this.isSupportedAsset(item);
      }
    );

    if (supportedItems.length === 0) {
      return [];
    }

    const tickers = [...new Set(supportedItems.map(({ symbol }) => symbol))];
    const rowsBySource = await Promise.all(
      SUPPORTED_SOURCES.map(async (source) => {
        return [
          source,
          await this.fetchRowsForSource(source, tickers)
        ] as const;
      })
    );

    const sentimentBySymbol = new Map<string, MarketSentiment>();

    for (const item of supportedItems) {
      const sourceMetrics: MarketSentimentSource[] = [];

      for (const [source, rows] of rowsBySource) {
        const row = rows.find(({ ticker }) => {
          return ticker === item.symbol;
        });

        const metric = this.mapRowToSourceMetric({ row, source });

        if (metric) {
          sourceMetrics.push(metric);
        }
      }

      const marketSentiment = this.aggregateSourceMetrics(sourceMetrics);

      if (marketSentiment) {
        sentimentBySymbol.set(item.symbol, marketSentiment);
      }
    }

    return supportedItems
      .map(({ dataSource, name, symbol }) => {
        return {
          dataSource,
          marketSentiment: sentimentBySymbol.get(symbol),
          name,
          symbol
        };
      })
      .filter(({ marketSentiment }) => {
        return !!marketSentiment;
      });
  }

  private aggregateSourceMetrics(sourceMetrics: MarketSentimentSource[]) {
    if (sourceMetrics.length === 0) {
      return undefined;
    }

    const orderedSourceMetrics = [...sourceMetrics].sort((a, b) => {
      return SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source);
    });

    const buzzValues = orderedSourceMetrics.map(({ buzzScore }) => {
      return buzzScore;
    });
    const bullishValues = orderedSourceMetrics
      .map(({ bullishPct }) => bullishPct)
      .filter((value): value is number => {
        return typeof value === 'number';
      });
    const trends = orderedSourceMetrics
      .map(({ trend }) => trend)
      .filter((trend): trend is Exclude<MarketSentimentTrend, 'MIXED'> => {
        return !!trend;
      });

    return {
      averageBullishPct:
        bullishValues.length > 0
          ? this.round(
              bullishValues.reduce((sum, value) => sum + value, 0) /
                bullishValues.length
            )
          : undefined,
      averageBuzzScore: this.round(
        buzzValues.reduce((sum, value) => sum + value, 0) / buzzValues.length
      ),
      coverage: orderedSourceMetrics.length,
      sourceAlignment: this.resolveSourceAlignment(bullishValues),
      sourceMetrics: orderedSourceMetrics,
      trend: this.resolveTrend(trends)
    } satisfies MarketSentiment;
  }

  private async fetchRowsForSource(source: AdanosSource, tickers: string[]) {
    const rows: AdanosCompareRow[] = [];

    for (
      let index = 0;
      index < tickers.length;
      index += ADANOS_MAX_TICKERS_PER_REQUEST
    ) {
      const chunk = tickers.slice(
        index,
        index + ADANOS_MAX_TICKERS_PER_REQUEST
      );
      rows.push(...(await this.fetchRowsForSourceChunk(source, chunk)));
    }

    return rows;
  }

  private async fetchRowsForSourceChunk(
    source: AdanosSource,
    tickers: string[]
  ): Promise<AdanosCompareRow[]> {
    if (tickers.length === 0) {
      return [];
    }

    const cacheKey = this.getCacheKey({ source, tickers });
    const cached = await this.redisCacheService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as AdanosCompareRow[];
      } catch {}
    }

    const url = new URL(`${ADANOS_API_BASE_URL}/${source}/stocks/v1/compare`);
    url.searchParams.set('days', ADANOS_COMPARE_LOOKBACK_DAYS.toString());
    url.searchParams.set('tickers', tickers.join(','));

    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': this.configurationService.get('API_KEY_ADANOS')
        },
        signal: AbortSignal.timeout(
          this.configurationService.get('REQUEST_TIMEOUT')
        )
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      const rows = this.normalizeRows(payload);

      await this.redisCacheService.set(
        cacheKey,
        JSON.stringify(rows),
        this.configurationService.get('CACHE_MARKET_SENTIMENT_TTL')
      );

      return rows;
    } catch (error) {
      Logger.warn(
        `Adanos ${source} sentiment request failed for ${tickers.join(',')}: ${error}`,
        'MarketSentimentService'
      );

      return [];
    }
  }

  private getCacheKey({
    source,
    tickers
  }: {
    source: AdanosSource;
    tickers: string[];
  }) {
    const tickersHash = createHash('sha256')
      .update(JSON.stringify([...tickers].sort()))
      .digest('hex');

    return `market-sentiment-${source}-${ADANOS_COMPARE_LOOKBACK_DAYS}-${tickersHash}`;
  }

  private isSupportedAsset({
    assetClass,
    dataSource,
    symbol
  }: SupportedWatchlistItem) {
    return (
      assetClass === AssetClass.EQUITY &&
      dataSource === DataSource.YAHOO &&
      /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)
    );
  }

  private mapRowToSourceMetric({
    row,
    source
  }: {
    row?: AdanosCompareRow;
    source: AdanosSource;
  }): MarketSentimentSource {
    if (!row) {
      return undefined;
    }

    const activityCount = Math.max(
      0,
      Number(
        row.mentions ??
          row.trade_count ??
          row.unique_tweets ??
          row.unique_posts ??
          row.market_count ??
          0
      )
    );
    const buzzScore = this.round(Number(row.buzz_score ?? 0));

    if (activityCount <= 0 && buzzScore <= 0) {
      return undefined;
    }

    return {
      activityCount,
      bullishPct:
        typeof row.bullish_pct === 'number'
          ? this.round(row.bullish_pct)
          : undefined,
      buzzScore,
      source: this.toSourceName(source),
      trend: this.toTrend(row.trend)
    };
  }

  private normalizeRows(payload: unknown): AdanosCompareRow[] {
    if (Array.isArray(payload)) {
      return payload as AdanosCompareRow[];
    }

    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { stocks?: unknown[] }).stocks)
    ) {
      return (payload as { stocks: AdanosCompareRow[] }).stocks;
    }

    return [];
  }

  private resolveSourceAlignment(
    bullishValues: number[]
  ): MarketSentimentAlignment {
    if (bullishValues.length <= 1) {
      return 'SINGLE_SOURCE';
    }

    const min = Math.min(...bullishValues);
    const max = Math.max(...bullishValues);
    const hasBullishSignal = bullishValues.some((value) => value >= 55);
    const hasBearishSignal = bullishValues.some((value) => value <= 45);

    if (hasBullishSignal && hasBearishSignal && max - min >= 15) {
      return 'DIVERGENT';
    }

    if (max - min <= 10) {
      return 'ALIGNED';
    }

    return 'MIXED';
  }

  private resolveTrend(
    trends: Exclude<MarketSentimentTrend, 'MIXED'>[]
  ): MarketSentimentTrend {
    if (trends.length === 0) {
      return 'MIXED';
    }

    return trends.every((trend) => trend === trends[0]) ? trends[0] : 'MIXED';
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }

  private toSourceName(source: AdanosSource): MarketSentimentSourceName {
    switch (source) {
      case 'news':
        return 'NEWS';
      case 'polymarket':
        return 'POLYMARKET';
      case 'reddit':
        return 'REDDIT';
      case 'x':
        return 'X';
    }
  }

  private toTrend(
    trend?: string | null
  ): Exclude<MarketSentimentTrend, 'MIXED'> {
    switch ((trend ?? '').toLowerCase()) {
      case 'falling':
        return 'FALLING';
      case 'rising':
        return 'RISING';
      default:
        return 'STABLE';
    }
  }
}
