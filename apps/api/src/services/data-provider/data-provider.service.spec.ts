import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';

import { DataProviderService } from './data-provider.service';

describe('DataProviderService', () => {
  let dataProviderService: DataProviderService;
  let getAssetProfile: jest.Mock;

  beforeEach(() => {
    getAssetProfile = jest.fn();

    const dataProviderInterface = {
      getAssetProfile,
      getName: () => {
        return DataSource.YAHOO;
      }
    };

    dataProviderService = new DataProviderService(
      null,
      [dataProviderInterface] as any,
      null,
      null,
      null,
      null
    );
  });

  describe('getAssetProfiles', () => {
    it('Corrects the letter case of the symbol', async () => {
      getAssetProfile.mockResolvedValue({
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Apple Inc.',
        symbol: 'AAPL'
      });

      const assetProfiles = await dataProviderService.getAssetProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'aapl' }
      ]);

      expect(
        assetProfiles[
          getAssetProfileIdentifier({
            dataSource: DataSource.YAHOO,
            symbol: 'aapl'
          })
        ].symbol
      ).toEqual('AAPL');
    });

    it('Keeps the requested symbol if the data provider resolves it to a different symbol', async () => {
      getAssetProfile.mockResolvedValue({
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Meta Platforms, Inc.',
        symbol: 'META'
      });

      const assetProfiles = await dataProviderService.getAssetProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'FB' }
      ]);

      expect(
        assetProfiles[
          getAssetProfileIdentifier({
            dataSource: DataSource.YAHOO,
            symbol: 'FB'
          })
        ].symbol
      ).toEqual('FB');
    });

    it('Keeps the requested symbol if the data provider reports no symbol', async () => {
      getAssetProfile.mockResolvedValue({
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        name: 'Apple Inc.'
      });

      const assetProfiles = await dataProviderService.getAssetProfiles([
        { dataSource: DataSource.YAHOO, symbol: 'aapl' }
      ]);

      expect(
        assetProfiles[
          getAssetProfileIdentifier({
            dataSource: DataSource.YAHOO,
            symbol: 'aapl'
          })
        ].symbol
      ).toEqual('aapl');
    });
  });
});
