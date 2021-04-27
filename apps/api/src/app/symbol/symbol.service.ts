import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { convertFromYahooSymbol } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import * as bent from 'bent';

import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly ghostfolioScraperApiService: GhostfolioScraperApiService
  ) {}

  public async get(aSymbol: string): Promise<SymbolItem> {
    const response = await this.dataProviderService.get([aSymbol]);
    const { currency, marketPrice } = response[aSymbol];

    return {
      marketPrice,
      currency: <Currency>(<unknown>currency)
    };
  }

  public async lookup(aQuery = ''): Promise<LookupItem[]> {
    const query = aQuery.toLowerCase();
    const results: LookupItem[] = [];

    if (!query) {
      return results;
    }

    const get = bent(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&lang=en-US&region=US&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=false&enableEnhancedTrivialQuery=true`,
      'GET',
      'json',
      200
    );

    // Add custom symbols
    const scraperConfigurations = await this.ghostfolioScraperApiService.getScraperConfigurations();
    scraperConfigurations.forEach((scraperConfiguration) => {
      if (scraperConfiguration.name.toLowerCase().startsWith(query)) {
        results.push({
          name: scraperConfiguration.name,
          symbol: scraperConfiguration.symbol
        });
      }
    });

    try {
      const { quotes } = await get();

      const searchResult = quotes
        .filter(({ isYahooFinance }) => {
          return isYahooFinance;
        })
        .filter(({ quoteType }) => {
          return (
            quoteType === 'CRYPTOCURRENCY' ||
            quoteType === 'EQUITY' ||
            quoteType === 'ETF'
          );
        })
        .filter(({ quoteType, symbol }) => {
          if (quoteType === 'CRYPTOCURRENCY') {
            // Only allow cryptocurrencies in USD
            return symbol.includes('USD');
          }

          return true;
        })
        .map(({ longname, shortname, symbol }) => {
          return {
            name: longname || shortname,
            symbol: convertFromYahooSymbol(symbol)
          };
        });

      return results.concat(searchResult);
    } catch (error) {
      console.error(error);

      throw error;
    }
  }
}
