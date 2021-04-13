import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { convertFromYahooSymbol } from 'apps/api/src/services/data-provider/yahoo-finance/yahoo-finance.service';
import * as bent from 'bent';

import { DataProviderService } from '../../services/data-provider.service';
import { LookupItem } from './interfaces/lookup-item.interface';
import { SymbolItem } from './interfaces/symbol-item.interface';

@Injectable()
export class SymbolService {
  public constructor(
    private readonly dataProviderService: DataProviderService
  ) {}

  public async get(aSymbol: string): Promise<SymbolItem> {
    const response = await this.dataProviderService.get([aSymbol]);
    const { currency, marketPrice } = response[aSymbol];

    return {
      marketPrice,
      currency: <Currency>(<unknown>currency)
    };
  }

  public async lookup(aQuery: string): Promise<LookupItem[]> {
    const get = bent(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${aQuery}&lang=en-US&region=US&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=false&enableEnhancedTrivialQuery=true`,
      'GET',
      'json',
      200
    );

    try {
      const { quotes } = await get();

      return quotes
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
    } catch (error) {
      console.error(error);

      throw error;
    }
  }
}
