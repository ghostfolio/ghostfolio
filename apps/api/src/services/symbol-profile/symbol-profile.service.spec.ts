import { DataSource } from '@prisma/client';

import { SymbolProfileService } from './symbol-profile.service';

describe('SymbolProfileService', () => {
  let prismaService: { symbolProfile: { findMany: jest.Mock } };
  let symbolProfileService: SymbolProfileService;

  beforeEach(() => {
    prismaService = {
      symbolProfile: { findMany: jest.fn().mockResolvedValue([]) }
    };

    symbolProfileService = new SymbolProfileService(prismaService as any);
  });

  describe('getSymbolOfAssetProfile', () => {
    it('Keeps the symbol of the existing asset profile', async () => {
      prismaService.symbolProfile.findMany.mockResolvedValue([
        { symbol: 'AAPL' }
      ]);

      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL',
        symbolOfDataProvider: 'AAPL'
      });

      expect(symbol).toEqual('AAPL');
    });

    it('Keeps the letter case of the existing asset profile', async () => {
      prismaService.symbolProfile.findMany.mockResolvedValue([
        { symbol: 'aapl' }
      ]);

      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'AAPL',
        symbolOfDataProvider: 'AAPL'
      });

      expect(symbol).toEqual('aapl');
    });

    it('Prefers the asset profile with the same letter case', async () => {
      prismaService.symbolProfile.findMany.mockResolvedValue([
        { symbol: 'AAPL' },
        { symbol: 'aapl' }
      ]);

      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'aapl',
        symbolOfDataProvider: 'AAPL'
      });

      expect(symbol).toEqual('aapl');
    });

    it('Ignores an asset profile which a wildcard of the query matched', async () => {
      prismaService.symbolProfile.findMany.mockResolvedValue([
        { symbol: 'AAPL' }
      ]);

      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'aa_l',
        symbolOfDataProvider: 'AA_L'
      });

      expect(symbol).toEqual('AA_L');
    });

    it('Uses the symbol of the data provider if no asset profile exists', async () => {
      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'aapl',
        symbolOfDataProvider: 'AAPL'
      });

      expect(symbol).toEqual('AAPL');
    });

    it('Keeps the requested symbol if the data provider reports no symbol', async () => {
      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.YAHOO,
        symbol: 'aapl'
      });

      expect(symbol).toEqual('aapl');
    });

    it('Keeps the symbol of a custom asset profile', async () => {
      const symbol = await symbolProfileService.getSymbolOfAssetProfile({
        dataSource: DataSource.MANUAL,
        symbol: 'GF_apple',
        symbolOfDataProvider: 'GF_APPLE'
      });

      expect(symbol).toEqual('GF_apple');
      expect(prismaService.symbolProfile.findMany).not.toHaveBeenCalled();
    });
  });
});
