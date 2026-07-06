import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { getSum } from '@ghostfolio/common/helper';
import {
  AccessSettings,
  ApiPortfolioResponse
} from '@ghostfolio/common/interfaces';
import type { UserWithApiAccess } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  Inject,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Type as ActivityType } from '@prisma/client';
import { Big } from 'big.js';

@Controller('api')
export class ApiController {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: { user: UserWithApiAccess }
  ) {}

  @Get('portfolio')
  @UseGuards(AuthGuard('api-access-token'))
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPortfolio(): Promise<ApiPortfolioResponse> {
    const { apiAccess, ...user } = this.request.user;

    const { filters } = (apiAccess.settings ?? {}) as AccessSettings;

    const [
      { createdAt, holdings, markets },
      { performance: performance1d },
      { performance: performanceMax },
      { performance: performanceYtd }
    ] = await Promise.all([
      this.portfolioService.getDetails({
        filters,
        impersonationId: apiAccess.userId,
        userId: user.id,
        withMarkets: true
      }),
      ...['1d', 'max', 'ytd'].map((dateRange) => {
        return this.portfolioService.getPerformance({
          dateRange,
          filters,
          impersonationId: undefined,
          userId: user.id
        });
      })
    ]);

    const { activities } = await this.activitiesService.getActivities({
      filters,
      sortColumn: 'date',
      sortDirection: 'desc',
      take: 10,
      types: [ActivityType.BUY, ActivityType.SELL],
      userCurrency: user.settings.settings.baseCurrency ?? DEFAULT_CURRENCY,
      userId: user.id,
      withExcludedAccountsAndActivities: false
    });

    const latestActivities = activities.map(
      ({
        currency,
        date,
        fee,
        quantity,
        SymbolProfile,
        type,
        unitPrice,
        value,
        valueInBaseCurrency
      }) => {
        return {
          currency,
          date,
          fee,
          quantity,
          SymbolProfile,
          type,
          unitPrice,
          value,
          valueInBaseCurrency
        };
      }
    );

    const totalValueInBaseCurrency = getSum(
      Object.values(holdings).map(({ valueInBaseCurrency }) => {
        return new Big(valueInBaseCurrency ?? 0);
      })
    ).toNumber();

    const apiPortfolioResponse: ApiPortfolioResponse = {
      createdAt,
      latestActivities,
      markets,
      totalValueInBaseCurrency,
      alias: apiAccess.alias,
      holdings: {},
      performance: {
        '1d': {
          relativeChange:
            performance1d.netPerformancePercentageWithCurrencyEffect
        },
        max: {
          relativeChange:
            performanceMax.netPerformancePercentageWithCurrencyEffect
        },
        ytd: {
          relativeChange:
            performanceYtd.netPerformancePercentageWithCurrencyEffect
        }
      }
    };

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      apiPortfolioResponse.holdings[symbol] = {
        allocationInPercentage:
          portfolioPosition.valueInBaseCurrency / totalValueInBaseCurrency,
        assetProfile: portfolioPosition.assetProfile,
        dateOfFirstActivity: portfolioPosition.dateOfFirstActivity,
        markets: portfolioPosition.markets,
        netPerformancePercentWithCurrencyEffect:
          portfolioPosition.netPerformancePercentWithCurrencyEffect,
        quantity: portfolioPosition.quantity,
        valueInBaseCurrency: portfolioPosition.valueInBaseCurrency,
        valueInPercentage:
          portfolioPosition.valueInBaseCurrency / totalValueInBaseCurrency
      };
    }

    return apiPortfolioResponse;
  }
}
