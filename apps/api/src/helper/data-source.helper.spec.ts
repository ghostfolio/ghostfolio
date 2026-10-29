import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { DataSource } from '@prisma/client';

import {
  encodeDataSource,
  isValidEncodedDataSource,
  transformDataSourceInRequest,
  transformDataSourceInResponse
} from './data-source.helper';

function createConfigurationService({
  isSubscriptionEnabled
}: {
  isSubscriptionEnabled: boolean;
}) {
  const configuration: Record<string, unknown> = {
    DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER: [DataSource.YAHOO],
    ENABLE_FEATURE_SUBSCRIPTION: isSubscriptionEnabled
  };

  return {
    get: jest.fn((key: string) => {
      return configuration[key];
    })
  } as unknown as ConfigurationService;
}

describe('DataSourceHelper', () => {
  describe('isValidEncodedDataSource', () => {
    it('Accepts an encoded data source', () => {
      expect(isValidEncodedDataSource(encodeDataSource(DataSource.YAHOO))).toBe(
        true
      );
    });

    it('Refuses a data source which is not encoded', () => {
      expect(isValidEncodedDataSource(DataSource.YAHOO)).toBe(false);
    });

    it('Refuses an unknown encoded data source', () => {
      expect(isValidEncodedDataSource('ffffffff')).toBe(false);
    });
  });

  describe('transformDataSourceInRequest', () => {
    const configurationService = createConfigurationService({
      isSubscriptionEnabled: true
    });

    it('Decodes an encoded data source', () => {
      expect(
        transformDataSourceInRequest({
          configurationService,
          dataSource: encodeDataSource(DataSource.COINGECKO)
        })
      ).toBe(DataSource.COINGECKO);
    });

    it('Resolves the mask of the data source of the Ghostfolio data provider', () => {
      expect(
        transformDataSourceInRequest({
          configurationService,
          dataSource: DataSource.GHOSTFOLIO
        })
      ).toBe(DataSource.YAHOO);
    });

    it('Keeps a data source which is not encoded', () => {
      expect(
        transformDataSourceInRequest({
          configurationService,
          dataSource: DataSource.COINGECKO
        })
      ).toBe(DataSource.COINGECKO);
    });

    it('Keeps an absent data source', () => {
      expect(
        transformDataSourceInRequest({
          configurationService,
          dataSource: undefined
        })
      ).toBeUndefined();
    });

    it('Decodes an encoded data source if the subscription is not enabled', () => {
      expect(
        transformDataSourceInRequest({
          configurationService: createConfigurationService({
            isSubscriptionEnabled: false
          }),
          dataSource: encodeDataSource(DataSource.COINGECKO)
        })
      ).toBe(DataSource.COINGECKO);
    });

    it('Keeps the data source GHOSTFOLIO if the subscription is not enabled', () => {
      expect(
        transformDataSourceInRequest({
          configurationService: createConfigurationService({
            isSubscriptionEnabled: false
          }),
          dataSource: DataSource.GHOSTFOLIO
        })
      ).toBe(DataSource.GHOSTFOLIO);
    });
  });

  describe('transformDataSourceInResponse', () => {
    it('Encodes the data source if the subscription is enabled', () => {
      expect(
        transformDataSourceInResponse({
          configurationService: createConfigurationService({
            isSubscriptionEnabled: true
          }),
          dataSource: DataSource.YAHOO
        })
      ).toBe(encodeDataSource(DataSource.YAHOO));
    });

    it('Keeps the data sources GHOSTFOLIO and MANUAL if the subscription is enabled', () => {
      const configurationService = createConfigurationService({
        isSubscriptionEnabled: true
      });

      for (const dataSource of [DataSource.GHOSTFOLIO, DataSource.MANUAL]) {
        expect(
          transformDataSourceInResponse({ configurationService, dataSource })
        ).toBe(dataSource);
      }
    });

    it('Keeps the data source if the subscription is not enabled', () => {
      expect(
        transformDataSourceInResponse({
          configurationService: createConfigurationService({
            isSubscriptionEnabled: false
          }),
          dataSource: DataSource.YAHOO
        })
      ).toBe(DataSource.YAHOO);
    });
  });
});
