import { scopes } from '@ghostfolio/common/scopes';

import { PortfolioController } from './portfolio.controller';

describe('Portfolio cash value visibility', () => {
  it.each([false, true])(
    'protects cash amounts when value access is %s',
    async (canReadValues) => {
      const result = {
        chart: [],
        performance: {
          currentNetWorth: 380,
          currentValueInBaseCurrency: 0,
          totalCashInBaseCurrency: 380,
          netPerformance: 0,
          netPerformanceWithCurrencyEffect: 0,
          totalInvestment: 0
        }
      };
      const controller = new PortfolioController(
        null,
        { buildFiltersFromQueryParams: () => [] } as never,
        { get: () => false } as never,
        { getPerformance: async () => result } as never,
        { user: { settings: { settings: {} } } } as never
      );
      const response = await controller.getPerformanceV2(
        {
          userId: 'cash-visibility-test',
          scopes: canReadValues
            ? [scopes.portfolioRead, scopes.portfolioReadValues]
            : [scopes.portfolioRead]
        } as never,
        { range: 'max' } as never
      );
      expect(response.performance.totalCashInBaseCurrency).toBe(
        canReadValues ? 380 : null
      );
      expect(response.performance.currentNetWorth).toBe(
        canReadValues ? 380 : null
      );
    }
  );
});
