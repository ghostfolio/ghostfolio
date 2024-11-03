import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';

@Injectable()
export class GhostfolioService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService
  ) {}

  public async lookup({
    includeIndices = false,
    query
  }: {
    includeIndices?: boolean;
    query: string;
  }): Promise<{ items: LookupItem[] }> {
    const results: { items: LookupItem[] } = { items: [] };

    if (!query) {
      return results;
    }

    try {
      let lookupItems: LookupItem[] = [];
      const promises: Promise<{ items: LookupItem[] }>[] = [];

      if (query?.length < 2) {
        return { items: lookupItems };
      }

      for (const dataProviderService of this.getDataProviderServices()) {
        promises.push(
          dataProviderService.search({
            includeIndices,
            query
          })
        );
      }

      const searchResults = await Promise.all(promises);

      searchResults.forEach(({ items }) => {
        if (items?.length > 0) {
          lookupItems = lookupItems.concat(items);
        }
      });

      const filteredItems = lookupItems
        .filter(({ currency }) => {
          // Only allow symbols with supported currency
          return currency ? true : false;
        })
        .sort(({ name: name1 }, { name: name2 }) => {
          return name1?.toLowerCase().localeCompare(name2?.toLowerCase());
        })
        .map((lookupItem) => {
          lookupItem.dataProviderInfo = this.getDataProviderInfo();
          lookupItem.dataSource = 'GHOSTFOLIO';

          return lookupItem;
        });

      results.items = filteredItems;
      return results;
    } catch (error) {
      Logger.error(error, 'GhostfolioService');

      throw error;
    }
  }

  private getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false,
      name: 'Ghostfolio Premium',
      url: 'https://ghostfol.io'
    };
  }

  private getDataProviderServices() {
    return this.configurationService
      .get('DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER')
      .map((dataSource) => {
        return this.dataProviderService.getDataProvider(DataSource[dataSource]);
      });
  }
}
