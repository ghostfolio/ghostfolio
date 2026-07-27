import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import type { Filter } from '@ghostfolio/common/interfaces';
import type { DateRange } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';

export interface AiPortfolioScope {
  abortSignal?: AbortSignal;
  dateRange: DateRange;
  filters?: Filter[];
  userCurrency: string;
  userId: string;
}

@Injectable()
export class AiPortfolioToolsService {
  private static readonly HOLDINGS_LIMIT = 25;

  public constructor(private readonly portfolioService: PortfolioService) {}

  public createTools(scope: AiPortfolioScope) {
    return {
      getPortfolioHoldings: tool({
        description:
          'Read the portfolio holdings in the active scope, ordered by allocation. Monetary values use the stated currency and percentages are percentage points.',
        inputSchema: z.object({}),
        execute: async (_input, { abortSignal }) => {
          return this.getPortfolioHoldings({
            ...scope,
            abortSignal: abortSignal ?? scope.abortSignal
          });
        }
      }),
      getPortfolioPerformance: tool({
        description:
          'Read compact portfolio performance metrics for the active date range and filters. Chart history is intentionally excluded. Percentages are percentage points.',
        inputSchema: z.object({}),
        execute: async (_input, { abortSignal }) => {
          return this.getPortfolioPerformance({
            ...scope,
            abortSignal: abortSignal ?? scope.abortSignal
          });
        }
      }),
      getPortfolioSummary: tool({
        description:
          'Read a compact portfolio snapshot for the active date range and filters. Monetary values use the stated currency and percentages are percentage points.',
        inputSchema: z.object({}),
        execute: async (_input, { abortSignal }) => {
          return this.getPortfolioSummary({
            ...scope,
            abortSignal: abortSignal ?? scope.abortSignal
          });
        }
      })
    };
  }

  public async getPortfolioHoldings({
    abortSignal,
    dateRange,
    filters,
    userCurrency,
    userId
  }: AiPortfolioScope) {
    this.throwIfAborted(abortSignal);

    const { hasErrors, holdings: holdingsMap } =
      await this.portfolioService.getDetails({
        dateRange,
        filters,
        impersonationId: undefined,
        userId
      });

    this.throwIfAborted(abortSignal);

    const holdings = Object.values(holdingsMap);

    const sortedHoldings = [...holdings].sort((a, b) => {
      return b.allocationInPercentage - a.allocationInPercentage;
    });
    const includedHoldings = sortedHoldings.slice(
      0,
      AiPortfolioToolsService.HOLDINGS_LIMIT
    );
    const omittedHoldings = sortedHoldings.slice(
      AiPortfolioToolsService.HOLDINGS_LIMIT
    );

    return {
      currency: userCurrency,
      dateRange,
      hasErrors,
      holdings: includedHoldings.map(
        ({ allocationInPercentage, assetProfile, valueInBaseCurrency }) => {
          return {
            allocationPercent: this.toPercentagePoints(allocationInPercentage),
            assetClass: assetProfile.assetClass,
            assetSubClass: assetProfile.assetSubClass,
            currency: assetProfile.currency,
            name: assetProfile.name,
            symbol: assetProfile.symbol,
            valueInBaseCurrency
          };
        }
      ),
      includedCount: includedHoldings.length,
      omittedAllocationPercent: this.toPercentagePoints(
        omittedHoldings.reduce((total, { allocationInPercentage }) => {
          return total + allocationInPercentage;
        }, 0)
      ),
      omittedCount: omittedHoldings.length,
      totalCount: sortedHoldings.length
    };
  }

  public async getPortfolioPerformance({
    abortSignal,
    dateRange,
    filters,
    userCurrency,
    userId
  }: AiPortfolioScope) {
    this.throwIfAborted(abortSignal);

    const {
      dateOfFirstActivity,
      hasErrors,
      performance: {
        currentNetWorth,
        currentValueInBaseCurrency,
        netPerformance,
        netPerformancePercentage,
        netPerformancePercentageWithCurrencyEffect,
        netPerformanceWithCurrencyEffect,
        totalInvestment,
        totalInvestmentValueWithCurrencyEffect
      }
    } = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      impersonationId: undefined,
      userId
    });

    this.throwIfAborted(abortSignal);

    return {
      currency: userCurrency,
      currentNetWorth,
      currentValueInBaseCurrency,
      dateOfFirstActivity: dateOfFirstActivity?.toISOString(),
      dateRange,
      hasErrors,
      netPerformance,
      netPerformancePercent: this.toPercentagePoints(netPerformancePercentage),
      netPerformancePercentWithCurrencyEffect: this.toPercentagePoints(
        netPerformancePercentageWithCurrencyEffect
      ),
      netPerformanceWithCurrencyEffect,
      totalInvestment,
      totalInvestmentValueWithCurrencyEffect
    };
  }

  public async getPortfolioSummary({
    abortSignal,
    dateRange,
    filters,
    userCurrency,
    userId
  }: AiPortfolioScope) {
    this.throwIfAborted(abortSignal);

    const { accounts, createdAt, hasErrors, holdings } =
      await this.portfolioService.getDetails({
        dateRange,
        filters,
        impersonationId: undefined,
        userId
      });

    this.throwIfAborted(abortSignal);

    const allocationByAssetClass = Object.values(holdings).reduce(
      (allocations, { allocationInPercentage, assetProfile }) => {
        const assetClass = assetProfile.assetClass ?? 'UNKNOWN';
        allocations[assetClass] =
          (allocations[assetClass] ?? 0) + allocationInPercentage;

        return allocations;
      },
      {} as Record<string, number>
    );

    return {
      accountsCount: Object.keys(accounts).length,
      allocationByAssetClass: Object.entries(allocationByAssetClass)
        .map(([assetClass, allocation]) => {
          return {
            allocationPercent: this.toPercentagePoints(allocation),
            assetClass
          };
        })
        .sort((a, b) => {
          return b.allocationPercent - a.allocationPercent;
        }),
      asOf: createdAt?.toISOString(),
      currency: userCurrency,
      dateRange,
      hasErrors,
      holdingsCount: Object.keys(holdings).length,
      totalValueInBaseCurrency: Object.values(holdings).reduce(
        (total, { valueInBaseCurrency }) => {
          return total + (valueInBaseCurrency ?? 0);
        },
        0
      )
    };
  }

  private toPercentagePoints(value?: number) {
    return value === undefined || value === null ? undefined : value * 100;
  }

  private throwIfAborted(abortSignal?: AbortSignal) {
    abortSignal?.throwIfAborted();
  }
}
