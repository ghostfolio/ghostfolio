import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '@ghostfolio/api/services/interfaces/interfaces';
import { baseCurrency } from '@ghostfolio/common/config';
import { DATE_FORMAT, isCurrency } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import Big from 'big.js';
import { countries } from 'countries-list';
import { addDays, format, isSameDay } from 'date-fns';
import yahooFinance from 'yahoo-finance2';
import type { Price } from 'yahoo-finance2/dist/esm/src/modules/quoteSummary-iface';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  public constructor(
    private readonly cryptocurrencyService: CryptocurrencyService
  ) {}

  public canHandle(symbol: string) {
    return true;
  }

  public convertFromYahooFinanceSymbol(aYahooFinanceSymbol: string) {
    const symbol = aYahooFinanceSymbol.replace(
      new RegExp(`-${baseCurrency}$`),
      baseCurrency
    );
    return symbol.replace('=X', '');
  }

  /**
   * Converts a symbol to a Yahoo Finance symbol
   *
   * Currency:        USDCHF  -> USDCHF=X
   * Cryptocurrency:  BTCUSD  -> BTC-USD
   *                  DOGEUSD -> DOGE-USD
   */
  public convertToYahooFinanceSymbol(aSymbol: string) {
    if (aSymbol.includes(baseCurrency) && aSymbol.length >= 6) {
      if (isCurrency(aSymbol.substring(0, aSymbol.length - 3))) {
        return `${aSymbol}=X`;
      } else if (
        this.cryptocurrencyService.isCryptocurrency(
          aSymbol.replace(new RegExp(`-${baseCurrency}$`), baseCurrency)
        )
      ) {
        // Add a dash before the last three characters
        // BTCUSD  -> BTC-USD
        // DOGEUSD -> DOGE-USD
        // SOL1USD -> SOL1-USD
        return aSymbol.replace(
          new RegExp(`-?${baseCurrency}$`),
          `-${baseCurrency}`
        );
      }
    }

    return aSymbol;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {};

    try {
      const symbol = this.convertToYahooFinanceSymbol(aSymbol);
      const assetProfile = await yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryProfile']
      });

      const { assetClass, assetSubClass } = this.parseAssetClass(
        assetProfile.price
      );

      response.assetClass = assetClass;
      response.assetSubClass = assetSubClass;
      response.currency = assetProfile.price.currency;
      response.dataSource = this.getName();
      response.name = this.formatName({
        longName: assetProfile.price.longName,
        quoteType: assetProfile.price.quoteType,
        shortName: assetProfile.price.shortName,
        symbol: assetProfile.price.symbol
      });
      response.symbol = aSymbol;

      if (
        assetSubClass === AssetSubClass.STOCK &&
        assetProfile.summaryProfile?.country
      ) {
        // Add country if asset is stock and country available

        try {
          const [code] = Object.entries(countries).find(([, country]) => {
            return country.name === assetProfile.summaryProfile?.country;
          });

          if (code) {
            response.countries = [{ code, weight: 1 }];
          }
        } catch {}

        if (assetProfile.summaryProfile?.sector) {
          response.sectors = [
            { name: assetProfile.summaryProfile?.sector, weight: 1 }
          ];
        }
      }

      const url = assetProfile.summaryProfile?.website;
      if (url) {
        response.url = url;
      }
    } catch {}

    return response;
  }

  public async getHistorical(
    aSymbol: string,
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    const yahooFinanceSymbol = this.convertToYahooFinanceSymbol(aSymbol);

    try {
      const historicalResult = await yahooFinance.historical(
        yahooFinanceSymbol,
        {
          interval: '1d',
          period1: format(from, DATE_FORMAT),
          period2: format(to, DATE_FORMAT)
        }
      );

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      // Convert symbol back
      const symbol = this.convertFromYahooFinanceSymbol(yahooFinanceSymbol);

      response[symbol] = {};

      for (const historicalItem of historicalResult) {
        let marketPrice = historicalItem.close;

        if (symbol === 'USDGBp') {
          // Convert GPB to GBp (pence)
          marketPrice = new Big(marketPrice).mul(100).toNumber();
        }

        response[symbol][format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice,
          performance: historicalItem.open - historicalItem.close
        };
      }

      return response;
    } catch (error) {
      Logger.warn(
        `Skipping yahooFinance2.getHistorical("${aSymbol}"): [${error.name}] ${error.message}`,
        'YahooFinanceService'
      );

      return {};
    }
  }

  public getName(): DataSource {
    return DataSource.YAHOO;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }
    const yahooFinanceSymbols = aSymbols.map((symbol) =>
      this.convertToYahooFinanceSymbol(symbol)
    );

    try {
      const response: { [symbol: string]: IDataProviderResponse } = {};

      const quotes = await yahooFinance.quote(yahooFinanceSymbols);

      for (const quote of quotes) {
        // Convert symbols back
        const symbol = this.convertFromYahooFinanceSymbol(quote.symbol);

        response[symbol] = {
          currency: quote.currency,
          dataSource: this.getName(),
          marketState:
            quote.marketState === 'REGULAR' ||
            this.cryptocurrencyService.isCryptocurrency(symbol)
              ? MarketState.open
              : MarketState.closed,
          marketPrice: quote.regularMarketPrice || 0
        };

        if (symbol === 'USDGBP' && yahooFinanceSymbols.includes('USDGBp=X')) {
          // Convert GPB to GBp (pence)
          response['USDGBp'] = {
            ...response[symbol],
            currency: 'GBp',
            marketPrice: new Big(response[symbol].marketPrice)
              .mul(100)
              .toNumber()
          };
        }
      }

      return response;
    } catch (error) {
      Logger.error(error, 'YahooFinanceService');

      return {};
    }
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const items: LookupItem[] = [];

    try {
      const searchResult = await yahooFinance.search(aQuery);

      const quotes = searchResult.quotes
        .filter((quote) => {
          // Filter out undefined symbols
          return quote.symbol;
        })
        .filter(({ quoteType, symbol }) => {
          return (
            (quoteType === 'CRYPTOCURRENCY' &&
              this.cryptocurrencyService.isCryptocurrency(
                symbol.replace(new RegExp(`-${baseCurrency}$`), baseCurrency)
              )) ||
            ['EQUITY', 'ETF', 'FUTURE', 'MUTUALFUND'].includes(quoteType)
          );
        })
        .filter(({ quoteType, symbol }) => {
          if (quoteType === 'CRYPTOCURRENCY') {
            // Only allow cryptocurrencies in base currency to avoid having redundancy in the database.
            // Transactions need to be converted manually to the base currency before
            return symbol.includes(baseCurrency);
          } else if (quoteType === 'FUTURE') {
            // Allow GC=F, but not MGC=F
            return symbol.length === 4;
          }

          return true;
        });

      const marketData = await yahooFinance.quote(
        quotes.map(({ symbol }) => {
          return symbol;
        })
      );

      for (const marketDataItem of marketData) {
        const quote = quotes.find((currentQuote) => {
          return currentQuote.symbol === marketDataItem.symbol;
        });

        const symbol = this.convertFromYahooFinanceSymbol(
          marketDataItem.symbol
        );

        items.push({
          symbol,
          currency: marketDataItem.currency,
          dataSource: this.getName(),
          name: this.formatName({
            longName: quote.longname,
            quoteType: quote.quoteType,
            shortName: quote.shortname,
            symbol: quote.symbol
          })
        });
      }
    } catch (error) {
      Logger.error(error, 'YahooFinanceService');
    }

    return { items };
  }

  private formatName({
    longName,
    quoteType,
    shortName,
    symbol
  }: {
    longName: Price['longName'];
    quoteType: Price['quoteType'];
    shortName: Price['shortName'];
    symbol: Price['symbol'];
  }) {
    let name = longName;

    if (name) {
      name = name.replace('iShares ETF (CH) - ', '');
      name = name.replace('iShares III Public Limited Company - ', '');
      name = name.replace('iShares VI Public Limited Company - ', '');
      name = name.replace('iShares VII PLC - ', '');
      name = name.replace('Multi Units Luxembourg - ', '');
      name = name.replace('VanEck ETFs N.V. - ', '');
      name = name.replace('Vaneck Vectors Ucits Etfs Plc - ', '');
      name = name.replace('Vanguard Funds Public Limited Company - ', '');
      name = name.replace('Vanguard Index Funds - ', '');
      name = name.replace('Xtrackers (IE) Plc - ', '');
    }

    if (quoteType === 'FUTURE') {
      // "Gold Jun 22" -> "Gold"
      name = shortName?.slice(0, -6);
    }

    return name || shortName || symbol;
  }

  private parseAssetClass(aPrice: Price): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    switch (aPrice?.quoteType?.toLowerCase()) {
      case 'cryptocurrency':
        assetClass = AssetClass.CASH;
        assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        break;
      case 'equity':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.STOCK;
        break;
      case 'etf':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.ETF;
        break;
      case 'future':
        assetClass = AssetClass.COMMODITY;
        assetSubClass = AssetSubClass.COMMODITY;
        break;
      case 'mutualfund':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.MUTUALFUND;
        break;
    }

    return { assetClass, assetSubClass };
  }
}
