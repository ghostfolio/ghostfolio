import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import {
  ghostfolioFearAndGreedIndexDataSourceCryptocurrencies,
  ghostfolioFearAndGreedIndexSymbolCryptocurrencies,
  ghostfolioFearAndGreedIndexSymbolStocks
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier
} from '@ghostfolio/common/helper';
import {
  DataProviderHistoricalResponse,
  HistoricalDataItem,
  LookupResponse,
  MarketDataOfMarketsResponse,
  SymbolItem
} from '@ghostfolio/common/interfaces';
import { UserWithSettings } from '@ghostfolio/common/types';

import { Injectable, Logger } from '@nestjs/common';
import { format, subDays } from 'date-fns';

@Injectable()
export class SymbolService {
  private readonly logger = new Logger(SymbolService.name);

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService
  ) {}

  public async get({
    dataGatheringItem,
    includeHistoricalData,
    useIntradayData = false
  }: {
    dataGatheringItem: DataGatheringItem;
    includeHistoricalData?: number;
    useIntradayData?: boolean;
  }): Promise<SymbolItem> {
    let currency: string;
    let marketPrice: number;

    if (useIntradayData) {
      const latestMarketData = await this.marketDataService.getLatest({
        dataSource: dataGatheringItem.dataSource,
        symbol: dataGatheringItem.symbol
      });

      marketPrice = latestMarketData?.marketPrice;
    } else {
      const quotes = await this.dataProviderService.getQuotes({
        items: [dataGatheringItem]
      });

      ({ currency, marketPrice } =
        quotes[getAssetProfileIdentifier(dataGatheringItem)] ?? {});
    }

    if (dataGatheringItem.dataSource && marketPrice >= 0) {
      let historicalData: HistoricalDataItem[] = [];

      if (includeHistoricalData > 0) {
        const days = includeHistoricalData;

        const marketData = await this.marketDataService.getRange({
          assetProfileIdentifiers: [
            {
              dataSource: dataGatheringItem.dataSource,
              symbol: dataGatheringItem.symbol
            }
          ],
          dateQuery: { gte: subDays(new Date(), days) }
        });

        historicalData = marketData.map(({ date, marketPrice: value }) => {
          return {
            value,
            date: date.toISOString()
          };
        });
      }

      return {
        currency,
        historicalData,
        marketPrice,
        dataSource: dataGatheringItem.dataSource,
        symbol: dataGatheringItem.symbol
      };
    }

    return undefined;
  }

  public async getForDate({
    dataSource,
    date = new Date(),
    symbol
  }: DataGatheringItem): Promise<DataProviderHistoricalResponse> {
    const assetProfileIdentifier = getAssetProfileIdentifier({
      dataSource,
      symbol
    });

    let historicalData: {
      [assetProfileIdentifier: string]: {
        [date: string]: DataProviderHistoricalResponse;
      };
    } = {
      [assetProfileIdentifier]: {}
    };

    try {
      historicalData = await this.dataProviderService.getHistoricalRaw({
        assetProfileIdentifiers: [{ dataSource, symbol }],
        from: date,
        to: date
      });
    } catch {}

    return {
      marketPrice:
        historicalData?.[assetProfileIdentifier]?.[format(date, DATE_FORMAT)]
          ?.marketPrice
    };
  }

  public async getMarketDataOfMarkets({
    includeHistoricalData
  }: {
    includeHistoricalData: number;
  }): Promise<MarketDataOfMarketsResponse> {
    if (await this.dataProviderService.isDataProviderGhostfolioConfigured()) {
      return this.dataProviderService.getMarketDataOfMarkets({
        includeHistoricalData
      });
    }

    const [
      marketDataFearAndGreedIndexCryptocurrencies,
      marketDataFearAndGreedIndexStocks
    ] = await Promise.all([
      this.get({
        includeHistoricalData,
        dataGatheringItem: {
          dataSource: ghostfolioFearAndGreedIndexDataSourceCryptocurrencies,
          symbol: ghostfolioFearAndGreedIndexSymbolCryptocurrencies
        },
        useIntradayData: true
      }),
      this.get({
        includeHistoricalData,
        dataGatheringItem: {
          dataSource:
            this.dataProviderService.getDataSourceForFearAndGreedIndexStocks(),
          symbol: ghostfolioFearAndGreedIndexSymbolStocks
        },
        useIntradayData: true
      })
    ]);

    return {
      fearAndGreedIndex: {
        CRYPTOCURRENCIES: {
          ...marketDataFearAndGreedIndexCryptocurrencies
        },
        STOCKS: {
          ...marketDataFearAndGreedIndexStocks
        }
      }
    };
  }

  public async lookup({
    includeIndices = false,
    query,
    user
  }: {
    includeIndices?: boolean;
    query: string;
    user: UserWithSettings;
  }): Promise<LookupResponse> {
    const results: LookupResponse = { items: [] };

    if (!query) {
      return results;
    }

    try {
      const { items } = await this.dataProviderService.search({
        includeIndices,
        query,
        user
      });
      results.items = items;
      return results;
    } catch (error) {
      this.logger.error(error);

      throw error;
    }
  }
}
