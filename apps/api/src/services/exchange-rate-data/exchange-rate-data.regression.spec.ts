import { ExchangeRateDataService } from './exchange-rate-data.service';

describe('ExchangeRateDataService regression #4299', () => {
  let service: ExchangeRateDataService;
  let mockDataProviderService: any;
  let mockMarketDataService: any;
  let mockPrismaService: any;
  let mockPropertyService: any;

  beforeEach(() => {
    mockDataProviderService = {
      getDataSourceForExchangeRates: jest.fn().mockReturnValue('YAHOO'),
      getHistorical: jest.fn().mockResolvedValue({}),
      getQuotes: jest.fn().mockResolvedValue({})
    };
    mockMarketDataService = {
      get: jest.fn().mockResolvedValue(null),
      getRange: jest.fn().mockResolvedValue([])
    };
    mockPrismaService = {
      account: { findMany: jest.fn().mockResolvedValue([]) },
      symbolProfile: { findMany: jest.fn().mockResolvedValue([]) }
    };
    mockPropertyService = {
      getByKey: jest.fn().mockResolvedValue([])
    };

    service = new ExchangeRateDataService(
      mockDataProviderService,
      mockMarketDataService,
      mockPrismaService,
      mockPropertyService
    );

    // Ensure empty exchange rates to trigger missing-rate path
    (service as any).exchangeRates = {};
    (service as any).derivedCurrencyFactors = {};
  });

  it('toCurrency returns finite value when exchange rate is missing (CAD->USD)', () => {
    const result = service.toCurrency(100, 'CAD', 'USD');
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(100);
    expect(result).not.toBeNaN();
  });

  it('toCurrency handles missing indirect rates without NaN', () => {
    (service as any).exchangeRates = {
      'USDEUR': 0.9
      // CADUSD missing, CAD->USD via USD should be missing
    };
    const result = service.toCurrency(100, 'CAD', 'USD');
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(100);
  });

  it('toCurrencyAtDate returns finite fallback when market data missing', async () => {
    const pastDate = new Date('2025-01-15');
    const result = await service.toCurrencyAtDate(100, 'CAD', 'USD', pastDate);
    expect(Number.isFinite(result as number)).toBe(true);
    expect(result).toBe(100);
    expect(result).not.toBeUndefined();
  });

  it('toCurrencyAtDate returns finite for EUR->CAD missing rate', async () => {
    const pastDate = new Date('2025-02-01');
    mockMarketDataService.get.mockResolvedValue(null);
    const result = await service.toCurrencyAtDate(250, 'EUR', 'CAD', pastDate);
    expect(Number.isFinite(result as number)).toBe(true);
    expect(result).toBe(250);
  });

  it('toCurrencyAtDate returns 0 for zero amount even with missing rate', async () => {
    const result = await service.toCurrencyAtDate(0, 'CAD', 'USD', new Date('2025-01-01'));
    expect(result).toBe(0);
  });

  it('toCurrency returns 0 for zero amount even with missing rate', () => {
    const result = service.toCurrency(0, 'CAD', 'USD');
    expect(result).toBe(0);
  });
});
