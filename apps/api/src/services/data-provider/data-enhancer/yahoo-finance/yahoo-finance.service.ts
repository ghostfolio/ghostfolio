import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import {
  DEFAULT_CURRENCY,
  REPLACE_NAME_PARTS,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import { isCurrency } from '@ghostfolio/common/helper';

import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Prisma,
  SymbolProfile
} from '@prisma/client';
import { isISIN } from 'class-validator';
import { countries } from 'countries-list';
import yahooFinance from 'yahoo-finance2';
import type { Price } from 'yahoo-finance2/dist/esm/src/modules/quoteSummary-iface';

@Injectable()
export class YahooFinanceDataEnhancerService implements DataEnhancerInterface {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly cryptocurrencyService: CryptocurrencyService
  ) {}

  public convertFromYahooFinanceSymbol(aYahooFinanceSymbol: string) {
    let symbol = aYahooFinanceSymbol.replace(
      new RegExp(`-${DEFAULT_CURRENCY}$`),
      DEFAULT_CURRENCY
    );

    if (symbol.includes('=X') && !symbol.includes(DEFAULT_CURRENCY)) {
      symbol = `${DEFAULT_CURRENCY}${symbol}`;
    }

    if (symbol.includes(`${DEFAULT_CURRENCY}ZAC`)) {
      symbol = `${DEFAULT_CURRENCY}ZAc`;
    }

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
    if (
      aSymbol.includes(DEFAULT_CURRENCY) &&
      aSymbol.length > DEFAULT_CURRENCY.length
    ) {
      if (
        isCurrency(
          aSymbol.substring(0, aSymbol.length - DEFAULT_CURRENCY.length)
        )
      ) {
        return `${aSymbol}=X`;
      } else if (
        this.cryptocurrencyService.isCryptocurrency(
          aSymbol.replace(new RegExp(`-${DEFAULT_CURRENCY}$`), DEFAULT_CURRENCY)
        )
      ) {
        // Add a dash before the last three characters
        // BTCUSD  -> BTC-USD
        // DOGEUSD -> DOGE-USD
        // SOL1USD -> SOL1-USD
        return aSymbol.replace(
          new RegExp(`-?${DEFAULT_CURRENCY}$`),
          `-${DEFAULT_CURRENCY}`
        );
      }
    }

    return aSymbol;
  }

  public async enhance({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    response,
    symbol
  }: {
    requestTimeout?: number;
    response: Partial<SymbolProfile>;
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    if (response.dataSource !== 'YAHOO' && !response.isin) {
      return response;
    }

    try {
      let yahooSymbol: string;

      if (response.dataSource === 'YAHOO') {
        yahooSymbol = symbol;
      } else {
        const { quotes } = await yahooFinance.search(response.isin);
        yahooSymbol = quotes[0].symbol;
      }

      const { countries, sectors, url } =
        await this.getAssetProfile(yahooSymbol);

      if ((countries as unknown as Prisma.JsonArray)?.length > 0) {
        response.countries = countries;
      }

      if ((sectors as unknown as Prisma.JsonArray)?.length > 0) {
        response.sectors = sectors;
      }

      if (url) {
        response.url = url;
      }
    } catch (error) {
      Logger.error(error, 'YahooFinanceDataEnhancerService');
    }

    return response;
  }

  public formatName({
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
      name = name.replace('&amp;', '&');

      for (const part of REPLACE_NAME_PARTS) {
        name = name.replace(part, '');
      }

      name = name.trim();
    }

    if (quoteType === 'FUTURE') {
      // "Gold Jun 22" -> "Gold"
      name = shortName?.slice(0, -7);
    }

    return name || shortName || symbol;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {};

    try {
      let symbol = aSymbol;

      if (isISIN(symbol)) {
        try {
          const { quotes } = await yahooFinance.search(symbol);

          if (quotes.length === 1) {
            symbol = quotes[0].symbol;
          }
        } catch {}
      } else {
        symbol = this.convertToYahooFinanceSymbol(symbol);
      }

      const assetProfile = await yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryProfile', 'topHoldings']
      });

      const { assetClass, assetSubClass } = this.parseAssetClass({
        quoteType: assetProfile.price.quoteType,
        shortName: assetProfile.price.shortName
      });

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
      response.symbol = this.convertFromYahooFinanceSymbol(
        assetProfile.price.symbol
      );

      if (assetSubClass === AssetSubClass.MUTUALFUND) {
        response.sectors = [];

        for (const sectorWeighting of assetProfile.topHoldings
          ?.sectorWeightings ?? []) {
          for (const [sector, weight] of Object.entries(sectorWeighting)) {
            response.sectors.push({ weight, name: this.parseSector(sector) });
          }
        }
      } else if (
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
    } catch (error) {
      Logger.error(error, 'YahooFinanceService');
    }

    return response;
  }

  public getName() {
    return DataSource.YAHOO;
  }

  public getTestSymbol() {
    return 'AAPL';
  }

  public parseAssetClass({
    quoteType,
    shortName
  }: {
    quoteType: string;
    shortName: string;
  }): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    switch (quoteType?.toLowerCase()) {
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

        if (
          shortName?.toLowerCase()?.startsWith('gold') ||
          shortName?.toLowerCase()?.startsWith('palladium') ||
          shortName?.toLowerCase()?.startsWith('platinum') ||
          shortName?.toLowerCase()?.startsWith('silver')
        ) {
          assetSubClass = AssetSubClass.PRECIOUS_METAL;
        }

        break;
      case 'mutualfund':
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.MUTUALFUND;
        break;
    }

    return { assetClass, assetSubClass };
  }

  private parseSector(aString: string): string {
    let sector = UNKNOWN_KEY;

    switch (aString) {
      case 'basic_materials':
        sector = 'Basic Materials';
        break;
      case 'communication_services':
        sector = 'Communication Services';
        break;
      case 'consumer_cyclical':
        sector = 'Consumer Cyclical';
        break;
      case 'consumer_defensive':
        sector = 'Consumer Staples';
        break;
      case 'energy':
        sector = 'Energy';
        break;
      case 'financial_services':
        sector = 'Financial Services';
        break;
      case 'healthcare':
        sector = 'Healthcare';
        break;
      case 'industrials':
        sector = 'Industrials';
        break;
      case 'realestate':
        sector = 'Real Estate';
        break;
      case 'technology':
        sector = 'Technology';
        break;
      case 'utilities':
        sector = 'Utilities';
        break;
    }

    return sector;
  }
}
