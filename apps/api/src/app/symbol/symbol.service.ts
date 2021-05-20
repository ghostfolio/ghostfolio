import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { convertFromYahooSymbol } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { Injectable } from '@nestjs/common';
import { Currency, DataSource } from '@prisma/client';

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
    const { currency, dataSource, marketPrice } = response[aSymbol];

    return {
      dataSource,
      marketPrice,
      currency: <Currency>(<unknown>currency)
    };
  }

  public async lookup(aQuery: string): Promise<{ items: LookupItem[] }> {
    const results: { items: LookupItem[] } = { items: [] };

    if (!aQuery) {
      return results;
    }

    try {
      const { items } = await this.dataProviderService.search(aQuery);
      results.items = items;

      // Add custom symbols
      const scraperConfigurations = await this.ghostfolioScraperApiService.getScraperConfigurations();
      scraperConfigurations.forEach((scraperConfiguration) => {
        if (scraperConfiguration.name.toLowerCase().startsWith(aQuery)) {
          results.items.push({
            dataSource: DataSource.GHOSTFOLIO,
            name: scraperConfiguration.name,
            symbol: scraperConfiguration.symbol
          });
        }
      });

      return results;
    } catch (error) {
      console.error(error);

      throw error;
    }
  }
}
