import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';

import { Test, TestingModule } from '@nestjs/testing';

import {
  AiPortfolioScope,
  AiPortfolioToolsService
} from './ai-portfolio-tools.service';

describe('AiPortfolioToolsService', () => {
  let portfolioService: {
    getDetails: jest.Mock;
    getPerformance: jest.Mock;
  };
  let service: AiPortfolioToolsService;

  const scope: AiPortfolioScope = {
    dateRange: 'ytd',
    filters: [{ id: 'account-1', type: 'ACCOUNT' }],
    userCurrency: 'USD',
    userId: 'user-1'
  };

  beforeEach(async () => {
    portfolioService = {
      getDetails: jest.fn(),
      getPerformance: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPortfolioToolsService,
        { provide: PortfolioService, useValue: portfolioService }
      ]
    }).compile();

    service = module.get(AiPortfolioToolsService);
  });

  it('returns only the top 25 holdings and summarizes the remainder', async () => {
    portfolioService.getDetails.mockResolvedValue({
      hasErrors: true,
      holdings: Object.fromEntries(
        Array.from({ length: 27 }, (_, index) => {
          return [
            `H${index}`,
            {
              allocationInPercentage: (27 - index) / 1000,
              assetProfile: {
                assetClass: 'EQUITY',
                assetSubClass: 'STOCK',
                currency: 'USD',
                name: `Holding ${index}`,
                symbol: `H${index}`
              },
              netPerformancePercent: 0.1,
              valueInBaseCurrency: 1000 - index
            }
          ];
        })
      )
    });

    const result = await service.getPortfolioHoldings(scope);

    expect(portfolioService.getDetails).toHaveBeenCalledWith({
      dateRange: 'ytd',
      filters: scope.filters,
      impersonationId: undefined,
      userId: 'user-1'
    });
    expect(result.holdings).toHaveLength(25);
    expect(result.holdings[0]).toEqual(
      expect.objectContaining({
        allocationPercent: 2.7,
        symbol: 'H0'
      })
    );
    expect(result.hasErrors).toBe(true);
    expect(result.holdings[0]).not.toHaveProperty('netPerformancePercent');
    expect(result.omittedCount).toBe(2);
    expect(result.omittedAllocationPercent).toBeCloseTo(0.3);
    expect(result.totalCount).toBe(27);
  });

  it('omits chart history from the compact performance result', async () => {
    portfolioService.getPerformance.mockResolvedValue({
      chart: [{ date: '2026-01-01' }],
      dateOfFirstActivity: new Date('2020-01-02T00:00:00.000Z'),
      hasErrors: false,
      performance: {
        currentNetWorth: 1250,
        currentValueInBaseCurrency: 1200,
        netPerformance: 200,
        netPerformancePercentage: 0.2,
        netPerformancePercentageWithCurrencyEffect: 0.25,
        netPerformanceWithCurrencyEffect: 250,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 950
      }
    });

    const result = await service.getPortfolioPerformance(scope);

    expect(portfolioService.getPerformance).toHaveBeenCalledWith({
      dateRange: 'ytd',
      filters: scope.filters,
      impersonationId: undefined,
      userId: 'user-1'
    });
    expect(result).toEqual({
      currency: 'USD',
      currentNetWorth: 1250,
      currentValueInBaseCurrency: 1200,
      dateOfFirstActivity: '2020-01-02T00:00:00.000Z',
      dateRange: 'ytd',
      hasErrors: false,
      netPerformance: 200,
      netPerformancePercent: 20,
      netPerformancePercentWithCurrencyEffect: 25,
      netPerformanceWithCurrencyEffect: 250,
      totalInvestment: 1000,
      totalInvestmentValueWithCurrencyEffect: 950
    });
    expect(result).not.toHaveProperty('chart');
  });

  it('returns a small explicit summary for the fixed scope', async () => {
    portfolioService.getDetails.mockResolvedValue({
      accounts: { 'account-1': {} },
      createdAt: new Date('2026-07-27T12:00:00.000Z'),
      hasErrors: false,
      holdings: {
        A: {
          allocationInPercentage: 0.6,
          assetProfile: { assetClass: 'EQUITY' },
          valueInBaseCurrency: 600
        },
        B: {
          allocationInPercentage: 0.4,
          assetProfile: { assetClass: 'FIXED_INCOME' },
          valueInBaseCurrency: 400
        }
      }
    });

    const result = await service.getPortfolioSummary(scope);

    expect(portfolioService.getDetails).toHaveBeenCalledWith({
      dateRange: 'ytd',
      filters: scope.filters,
      impersonationId: undefined,
      userId: 'user-1'
    });
    expect(result).toEqual({
      accountsCount: 1,
      allocationByAssetClass: [
        { allocationPercent: 60, assetClass: 'EQUITY' },
        { allocationPercent: 40, assetClass: 'FIXED_INCOME' }
      ],
      asOf: '2026-07-27T12:00:00.000Z',
      currency: 'USD',
      dateRange: 'ytd',
      hasErrors: false,
      holdingsCount: 2,
      totalValueInBaseCurrency: 1000
    });
  });

  it('propagates an already-aborted tool execution signal', async () => {
    const abortController = new AbortController();
    abortController.abort(new Error('request aborted'));
    const execute = service.createTools(scope).getPortfolioSummary.execute;

    await expect(
      execute(
        {},
        {
          abortSignal: abortController.signal,
          messages: [],
          toolCallId: 'tool-call-1'
        }
      )
    ).rejects.toThrow('request aborted');
    expect(portfolioService.getDetails).not.toHaveBeenCalled();
  });

  it('checks for cancellation again after portfolio calculation', async () => {
    const abortController = new AbortController();
    portfolioService.getPerformance.mockImplementation(async () => {
      abortController.abort(new Error('request aborted during calculation'));

      return {
        dateOfFirstActivity: undefined,
        hasErrors: false,
        performance: {}
      };
    });

    await expect(
      service.getPortfolioPerformance({
        ...scope,
        abortSignal: abortController.signal
      })
    ).rejects.toThrow('request aborted during calculation');
  });
});
