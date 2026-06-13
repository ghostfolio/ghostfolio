import { getSectorName } from '@ghostfolio/api/helper/sector.helper';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { AssetProfileDelistedError } from '@ghostfolio/api/services/data-provider/errors/asset-profile-delisted.error';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import {
  DEFAULT_CURRENCY,
  REPLACE_NAME_PARTS
} from '@ghostfolio/common/config';
import { isCurrencySymbol } from '@ghostfolio/common/helper';
import { SectorName } from '@ghostfolio/common/types';

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
import YahooFinance from 'yahoo-finance2';
import type { Price } from 'yahoo-finance2/esm/src/modules/quoteSummary-iface';

@Injectable()
export class YahooFinanceDataEnhancerService implements DataEnhancerInterface {
  private static sectorsMapping: Record<string, SectorName> = {
    basic_materials: 'Basic Materials',
    communication_services: 'Communication Services',
    consumer_cyclical: 'Consumer Cyclical',
    consumer_defensive: 'Consumer Defensive',
    energy: 'Energy',
    financial_services: 'Financial Services',
    healthcare: 'Healthcare',
    industrials: 'Industrials',
    realestate: 'Real Estate',
    technology: 'Technology',
    utilities: 'Utilities'
  };

  private readonly logger = new Logger(YahooFinanceDataEnhancerService.name);

  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey']
  });

  public constructor(
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
    if (isCurrencySymbol(aSymbol)) {
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

    return aSymbol;
  }

  public async enhance({
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
        const { quotes } = await this.yahooFinance.search(response.isin);
        yahooSymbol = quotes[0].symbol as string;
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
      this.logger.error(error);
    }

    return response;
  }

  public formatName({
    longName,
    quoteType,
    shortName,
    symbol
  }: {
    longName?: Price['longName'];
    quoteType?: Price['quoteType'];
    shortName?: Price['shortName'];
    symbol?: Price['symbol'];
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
    let response: Partial<SymbolProfile> = {};

    try {
      let symbol = aSymbol;

      if (isISIN(symbol)) {
        try {
          const { quotes } = await this.yahooFinance.search(symbol);

          if (quotes?.[0]?.symbol) {
            symbol = quotes[0].symbol as string;
          }
        } catch {}
      } else if (symbol?.endsWith(`-${DEFAULT_CURRENCY}`)) {
        throw new Error(`${symbol} is not valid`);
      } else {
        symbol = this.convertToYahooFinanceSymbol(symbol);
      }

      const assetProfile = await this.yahooFinance.quoteSummary(symbol, {
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

      if (['ETF', 'MUTUALFUND'].includes(assetSubClass)) {
        response.holdings =
          assetProfile.topHoldings?.holdings
            ?.filter(({ holdingName }) => {
              return !holdingName?.includes('ETF');
            })
            ?.map(({ holdingName, holdingPercent }) => {
              return {
                name: this.formatName({ longName: holdingName }),
                weight: holdingPercent
              };
            }) ?? [];

        response.sectors = (assetProfile.topHoldings?.sectorWeightings ?? [])
          .flatMap((sectorWeighting) => {
            return Object.entries(sectorWeighting).map(([sector, weight]) => {
              return {
                name: getSectorName({
                  aliases: YahooFinanceDataEnhancerService.sectorsMapping,
                  name: sector
                }),
                weight: weight as number
              };
            });
          })
          .filter(({ weight }) => {
            return weight > 0;
          });
      } else if (
        assetSubClass === 'STOCK' &&
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
      response = undefined;

      if (error.message === `Quote not found for symbol: ${aSymbol}`) {
        throw new AssetProfileDelistedError(
          `No data found, ${aSymbol} (${this.getName()}) may be delisted`
        );
      } else {
        this.logger.error(error);
      }
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
        assetClass = AssetClass.LIQUIDITY;
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
}
