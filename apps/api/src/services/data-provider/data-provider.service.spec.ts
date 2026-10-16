import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';

import { DataSource } from '@prisma/client';

import { DataProviderService } from './data-provider.service';

/**
 * Gives the service with some of the data providers in the order of the
 * module, so that EOD_HISTORICAL_DATA comes before MANUAL and YAHOO
 */
function createDataProviderService(dataProviderMapping?: {
  [dataProviderName: string]: string;
}) {
  const dataProviderInterfaces = [
    DataSource.EOD_HISTORICAL_DATA,
    DataSource.FINANCIAL_MODELING_PREP,
    DataSource.MANUAL,
    DataSource.YAHOO
  ].map((dataSource) => {
    return {
      getName: () => {
        return dataSource;
      }
    } as DataProviderInterface;
  });

  return new DataProviderService(
    {} as ConfigurationService,
    dataProviderInterfaces,
    {} as MarketDataService,
    {} as PrismaService,
    {
      getByKey: jest.fn().mockResolvedValue(dataProviderMapping)
    } as unknown as PropertyService,
    {} as RedisCacheService
  );
}

describe('DataProviderService', () => {
  describe('getDataProvider', () => {
    it('gives the data provider of the data source without a mapping', async () => {
      const dataProviderService = createDataProviderService();

      await dataProviderService.onModuleInit();

      expect(
        dataProviderService.getDataProvider(DataSource.YAHOO).getName()
      ).toBe(DataSource.YAHOO);
    });

    it('gives the mapped data provider of a data source with a mapping', async () => {
      const dataProviderService = createDataProviderService({
        [DataSource.YAHOO]: DataSource.FINANCIAL_MODELING_PREP
      });

      await dataProviderService.onModuleInit();

      expect(
        dataProviderService.getDataProvider(DataSource.YAHOO).getName()
      ).toBe(DataSource.FINANCIAL_MODELING_PREP);
    });

    it('gives the data provider of the data source if the mapping of another data source comes first', async () => {
      const dataProviderService = createDataProviderService({
        [DataSource.EOD_HISTORICAL_DATA]: DataSource.FINANCIAL_MODELING_PREP
      });

      await dataProviderService.onModuleInit();

      expect(
        dataProviderService.getDataProvider(DataSource.MANUAL).getName()
      ).toBe(DataSource.MANUAL);

      expect(
        dataProviderService.getDataProvider(DataSource.YAHOO).getName()
      ).toBe(DataSource.YAHOO);
    });

    it('gives the data provider of the data source if the mapped data provider does not exist', async () => {
      const dataProviderService = createDataProviderService({
        [DataSource.YAHOO]: 'UNKNOWN'
      });

      await dataProviderService.onModuleInit();

      expect(
        dataProviderService.getDataProvider(DataSource.YAHOO).getName()
      ).toBe(DataSource.YAHOO);
    });

    it('throws an error if no data provider has been found', async () => {
      const dataProviderService = createDataProviderService();

      await dataProviderService.onModuleInit();

      expect(() => {
        return dataProviderService.getDataProvider(DataSource.COINGECKO);
      }).toThrow('No data provider has been found.');
    });
  });
});
