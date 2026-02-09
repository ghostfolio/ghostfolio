import { ImportService } from './import.service';

describe('ImportService', () => {
  let importService: ImportService;

  let exchangeRateDataServiceMock: { toCurrencyAtDate: jest.Mock };
  let dataProviderServiceMock: {
    getDataSourceForImport: jest.Mock;
    getDataSources: jest.Mock;
    getAssetProfiles: jest.Mock;
  };
  let orderServiceMock: { getOrders: jest.Mock };
  let accountServiceMock: { getAccounts: jest.Mock };
  let tagServiceMock: { getTagsForUser: jest.Mock };
  let configurationServiceMock: { get: jest.Mock };

  beforeEach(() => {
    exchangeRateDataServiceMock = {
      toCurrencyAtDate: jest.fn()
    };

    dataProviderServiceMock = {
      getDataSourceForImport: jest.fn().mockReturnValue('YAHOO'),
      getDataSources: jest.fn().mockResolvedValue(['MANUAL', 'YAHOO']),
      getAssetProfiles: jest.fn()
    };

    orderServiceMock = {
      getOrders: jest.fn().mockResolvedValue({ activities: [], count: 0 })
    };

    accountServiceMock = {
      getAccounts: jest.fn().mockResolvedValue([])
    };

    tagServiceMock = {
      getTagsForUser: jest.fn().mockResolvedValue([])
    };

    configurationServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENABLE_FEATURE_SUBSCRIPTION') {
          return false;
        }

        if (key === 'MAX_ACTIVITIES_TO_IMPORT') {
          return Number.MAX_SAFE_INTEGER;
        }

        return undefined;
      })
    };

    importService = new ImportService(
      accountServiceMock as any,
      null,
      configurationServiceMock as any,
      null,
      dataProviderServiceMock as any,
      exchangeRateDataServiceMock as any,
      null,
      orderServiceMock as any,
      null,
      null,
      null,
      tagServiceMock as any
    );
  });

  describe('import', () => {
    it('should include valueInBaseCurrency for a dry-run FEE activity', async () => {
      const expectedValueInBaseCurrency = 15;

      exchangeRateDataServiceMock.toCurrencyAtDate.mockResolvedValue(
        expectedValueInBaseCurrency
      );

      const activities = await importService.import({
        isDryRun: true,
        maxActivitiesToImport: Number.MAX_SAFE_INTEGER,
        accountsWithBalancesDto: [],
        activitiesDto: [
          {
            currency: 'USD',
            dataSource: 'MANUAL',
            date: '2024-01-15T00:00:00.000Z',
            fee: 0,
            quantity: 1,
            symbol: 'Account Opening Fee',
            type: 'FEE',
            unitPrice: 15
          } as any
        ],
        assetProfilesWithMarketDataDto: [],
        tagsDto: [],
        user: {
          id: 'test-user-id',
          settings: { settings: { baseCurrency: 'USD' } }
        } as any
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].valueInBaseCurrency).toBe(
        expectedValueInBaseCurrency
      );
      expect(activities[0].value).toBe(15);
      expect(exchangeRateDataServiceMock.toCurrencyAtDate).toHaveBeenCalledWith(
        15,
        'USD',
        'USD',
        expect.any(Date)
      );
    });

    it('should convert valueInBaseCurrency using the correct currencies', async () => {
      exchangeRateDataServiceMock.toCurrencyAtDate.mockResolvedValue(1350.5);

      dataProviderServiceMock.getAssetProfiles.mockResolvedValue({
        MSFT: {
          currency: 'USD',
          dataSource: 'YAHOO',
          name: 'Microsoft Corporation',
          symbol: 'MSFT'
        }
      });

      const activities = await importService.import({
        isDryRun: true,
        maxActivitiesToImport: Number.MAX_SAFE_INTEGER,
        accountsWithBalancesDto: [],
        activitiesDto: [
          {
            currency: 'USD',
            dataSource: 'YAHOO',
            date: '2024-01-15T00:00:00.000Z',
            fee: 19,
            quantity: 5,
            symbol: 'MSFT',
            type: 'BUY',
            unitPrice: 298.58
          } as any
        ],
        assetProfilesWithMarketDataDto: [],
        tagsDto: [],
        user: {
          id: 'test-user-id',
          settings: { settings: { baseCurrency: 'EUR' } }
        } as any
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].valueInBaseCurrency).toBe(1350.5);
      expect(activities[0].value).toBeCloseTo(1492.9);
      expect(exchangeRateDataServiceMock.toCurrencyAtDate).toHaveBeenCalledWith(
        expect.closeTo(1492.9),
        'USD',
        'EUR',
        expect.any(Date)
      );
    });

    it('should fall back to asset profile currency when activity currency is not set', async () => {
      exchangeRateDataServiceMock.toCurrencyAtDate.mockResolvedValue(450);

      dataProviderServiceMock.getAssetProfiles.mockResolvedValue({
        AAPL: {
          currency: 'EUR',
          dataSource: 'YAHOO',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        }
      });

      const activities = await importService.import({
        isDryRun: true,
        maxActivitiesToImport: Number.MAX_SAFE_INTEGER,
        accountsWithBalancesDto: [],
        activitiesDto: [
          {
            currency: undefined,
            dataSource: 'YAHOO',
            date: '2024-06-01T00:00:00.000Z',
            fee: 0,
            quantity: 2,
            symbol: 'AAPL',
            type: 'BUY',
            unitPrice: 250
          } as any
        ],
        assetProfilesWithMarketDataDto: [],
        tagsDto: [],
        user: {
          id: 'test-user-id',
          settings: { settings: { baseCurrency: 'CHF' } }
        } as any
      });

      expect(activities).toHaveLength(1);
      expect(activities[0].valueInBaseCurrency).toBe(450);

      // Should fall back to asset profile currency (EUR) when activity currency is undefined
      expect(exchangeRateDataServiceMock.toCurrencyAtDate).toHaveBeenCalledWith(
        500,
        'EUR',
        'CHF',
        expect.any(Date)
      );
    });
  });
});
