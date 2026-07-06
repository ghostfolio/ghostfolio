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
import { Big } from 'big.js';

@Controller('api')
export class ApiController {
  public constructor(
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: { user: UserWithApiAccess }
  ) {}

  @Get('portfolio')
  @UseGuards(AuthGuard('api-access-token'))
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPortfolio(): Promise<ApiPortfolioResponse> {
    const { apiAccess, ...user } = this.request.user;

    const { filters } = (apiAccess.settings ?? {}) as AccessSettings;

    const { createdAt, holdings, latestActivities, markets, performance } =
      await this.portfolioService.getPortfolioOverview({
        filters,
        impersonationId: undefined,
        userCurrency: user.settings.settings.baseCurrency ?? DEFAULT_CURRENCY,
        userId: user.id
      });

    const totalValueInBaseCurrency = getSum(
      Object.values(holdings).map(({ valueInBaseCurrency }) => {
        return new Big(valueInBaseCurrency ?? 0);
      })
    ).toNumber();

    const apiPortfolioResponse: ApiPortfolioResponse = {
      createdAt,
      latestActivities,
      markets,
      performance,
      totalValueInBaseCurrency,
      alias: apiAccess.alias,
      holdings: {}
    };

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      const allocationInPercentage =
        totalValueInBaseCurrency > 0
          ? (portfolioPosition.valueInBaseCurrency ?? 0) /
            totalValueInBaseCurrency
          : 0;

      apiPortfolioResponse.holdings[symbol] = {
        allocationInPercentage,
        assetProfile: portfolioPosition.assetProfile,
        dateOfFirstActivity: portfolioPosition.dateOfFirstActivity,
        markets: portfolioPosition.markets,
        netPerformancePercentWithCurrencyEffect:
          portfolioPosition.netPerformancePercentWithCurrencyEffect,
        quantity: portfolioPosition.quantity,
        valueInBaseCurrency: portfolioPosition.valueInBaseCurrency,
        valueInPercentage: allocationInPercentage
      };
    }

    return apiPortfolioResponse;
  }
}
