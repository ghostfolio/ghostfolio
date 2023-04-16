import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';

@Injectable()
export class YahooFinanceDataEnhancerService implements DataEnhancerInterface {
  public constructor(
    private readonly yahooFinanceService: YahooFinanceService
  ) {}

  public async enhance({
    response,
    symbol
  }: {
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
        const { items } = await this.yahooFinanceService.search(response.isin);
        yahooSymbol = items[0].symbol;
      }

      const assetProfile = await this.yahooFinanceService.getAssetProfile(
        yahooSymbol
      );

      if (assetProfile.countries) {
        response.countries = assetProfile.countries;
      }

      if (assetProfile.sectors) {
        response.sectors = assetProfile.sectors;
      }

      if (assetProfile.url) {
        response.url = assetProfile.url;
      }
    } catch (error) {
      Logger.error(error, 'YahooFinanceDataEnhancerService');
    }

    return response;
  }

  public getName() {
    return DataSource.YAHOO;
  }
}
