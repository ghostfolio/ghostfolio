import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { Activity } from '@ghostfolio/common/interfaces';
import { RequestWithUser } from '@ghostfolio/common/types';

import { Type as ActivityType } from '@prisma/client';
import { Big } from 'big.js';

import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  describe('getSummary', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-07-10'));
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('returns annualizedDividendYield from the calculator snapshot', async () => {
      const activities: Activity[] = [
        {
          ...activityDummyData,
          currency: 'USD',
          date: new Date('2023-06-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: ActivityType.BUY,
          unitPrice: 50,
          unitPriceInAssetProfileCurrency: 50,
          value: 100,
          valueInBaseCurrency: 100
        },
        {
          ...activityDummyData,
          currency: 'USD',
          date: new Date('2023-06-02'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Microsoft Inc.',
            symbol: 'MSFT'
          },
          type: ActivityType.SELL,
          unitPrice: 40,
          unitPriceInAssetProfileCurrency: 40,
          value: 40,
          valueInBaseCurrency: 40
        }
      ];

      const exchangeRateDataService = {
        toCurrency: jest.fn((value: number) => value)
      };

      const orderService = {
        getOrders: jest.fn().mockResolvedValue({ activities })
      };

      const userService = {
        user: jest.fn().mockResolvedValue({
          id: userDummyData.id,
          settings: {
            settings: {
              baseCurrency: DEFAULT_CURRENCY,
              emergencyFund: 0
            }
          }
        })
      };

      const accountService = {
        getCashDetails: jest.fn().mockResolvedValue({
          balanceInBaseCurrency: 1000
        })
      };

      const impersonationService = {
        validateImpersonationId: jest.fn().mockResolvedValue(undefined)
      };

      const request = {
        user: {
          id: userDummyData.id,
          settings: { settings: { baseCurrency: DEFAULT_CURRENCY } }
        }
      } as RequestWithUser;

      const portfolioCalculator = {
        getDividendInBaseCurrency: jest.fn().mockResolvedValue(new Big(12)),
        getFeesInBaseCurrency: jest.fn().mockResolvedValue(new Big(4)),
        getInterestInBaseCurrency: jest.fn().mockResolvedValue(new Big(1)),
        getLiabilitiesInBaseCurrency: jest.fn().mockResolvedValue(new Big(6)),
        getSnapshot: jest.fn().mockResolvedValue({
          annualizedDividendYield: 0.0123,
          currentValueInBaseCurrency: new Big(500),
          totalInvestment: new Big(400)
        }),
        getStartDate: jest.fn().mockReturnValue(new Date('2023-01-01'))
      } as unknown as PortfolioCalculator;

      const service = new PortfolioService(
        {} as any,
        accountService as any,
        {} as any,
        {} as any,
        {} as any,
        exchangeRateDataService as any,
        {} as any,
        impersonationService as any,
        orderService as any,
        request,
        {} as any,
        {} as any,
        userService as any
      );

      jest.spyOn(service, 'getPerformance').mockResolvedValue({
        performance: {
          netPerformance: 20,
          netPerformancePercentage: 0.05,
          netPerformancePercentageWithCurrencyEffect: 0.05,
          netPerformanceWithCurrencyEffect: 20
        }
      } as any);

      const summary = await (service as any).getSummary({
        balanceInBaseCurrency: 1000,
        emergencyFundHoldingsValueInBaseCurrency: 0,
        filteredValueInBaseCurrency: new Big(200),
        impersonationId: userDummyData.id,
        portfolioCalculator,
        userCurrency: DEFAULT_CURRENCY,
        userId: userDummyData.id
      });

      expect(portfolioCalculator.getSnapshot).toHaveBeenCalledTimes(1);
      expect(summary).toMatchObject({
        annualizedDividendYield: 0.0123,
        cash: 1000,
        committedFunds: 60,
        dividendInBaseCurrency: 12,
        fees: 4,
        grossPerformance: 24,
        grossPerformanceWithCurrencyEffect: 24,
        interestInBaseCurrency: 1,
        liabilitiesInBaseCurrency: 6,
        totalBuy: 100,
        totalInvestment: 400,
        totalSell: 40,
        totalValueInBaseCurrency: 1494
      });
      expect(summary.activityCount).toBe(2);
      expect(summary.dateOfFirstActivity).toEqual(new Date('2023-01-01'));
    });
  });
});
