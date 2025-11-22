import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { getSum } from '@ghostfolio/common/helper';
import {
  AccessSettings,
  Filter,
  PublicPortfolioResponse
} from '@ghostfolio/common/interfaces';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Type as ActivityType, AssetSubClass } from '@prisma/client';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Controller('public')
export class PublicController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Get(':accessId/portfolio')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPublicPortfolio(
    @Param('accessId') accessId: string
  ): Promise<PublicPortfolioResponse> {
    const access = await this.accessService.access({ id: accessId });

    if (!access) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    let hasDetails = true;

    const user = await this.userService.user({
      id: access.userId
    });

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = user.subscription.type === 'Premium';
    }

    // Get filter configuration from access settings
    const { filter: accessFilter } = (access.settings ?? {}) as AccessSettings;

    // Convert access filter to portfolio filters
    const portfolioFilters: Filter[] = [];

    if (accessFilter) {
      // Add account filters
      if (accessFilter.accountIds?.length > 0) {
        portfolioFilters.push(
          ...accessFilter.accountIds.map((accountId) => ({
            id: accountId,
            type: 'ACCOUNT' as const
          }))
        );
      }

      // Add asset class filters
      if (accessFilter.assetClasses?.length > 0) {
        portfolioFilters.push(
          ...accessFilter.assetClasses.map((assetClass) => ({
            id: assetClass,
            type: 'ASSET_CLASS' as const
          }))
        );
      }

      // Add holding filters (symbol + dataSource)
      // Each holding needs both DATA_SOURCE and SYMBOL filters
      if (accessFilter.holdings?.length > 0) {
        for (const { dataSource, symbol } of accessFilter.holdings) {
          portfolioFilters.push(
            {
              id: dataSource,
              type: 'DATA_SOURCE' as const
            },
            {
              id: symbol,
              type: 'SYMBOL' as const
            }
          );
        }
      }

      // Add tag filters
      if (accessFilter.tagIds?.length > 0) {
        portfolioFilters.push(
          ...accessFilter.tagIds.map((tagId) => ({
            id: tagId,
            type: 'TAG' as const
          }))
        );
      }
    }

    const [
      { createdAt, holdings, markets },
      { performance: performance1d },
      { performance: performanceMax },
      { performance: performanceYtd }
    ] = await Promise.all([
      this.portfolioService.getDetails({
        filters: portfolioFilters.length > 0 ? portfolioFilters : undefined,
        impersonationId: access.userId,
        userId: user.id,
        withMarkets: true
      }),
      ...['1d', 'max', 'ytd'].map((dateRange) => {
        return this.portfolioService.getPerformance({
          dateRange,
          filters: portfolioFilters.length > 0 ? portfolioFilters : undefined,
          impersonationId: undefined,
          userId: user.id
        });
      })
    ]);

    const baseCurrency =
      user.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY;
    const filteredHoldings = Object.fromEntries(
      Object.entries(holdings).filter(([, holding]) => {
        // Remove only cash holdings that match the base currency
        const isCash = holding.assetSubClass === AssetSubClass.CASH;
        const isBaseCurrency = holding.symbol === baseCurrency;
        return !(isCash && isBaseCurrency);
      })
    );

    // Use filters for activities, but exclude DATA_SOURCE/SYMBOL filters
    // if there are multiple holdings (the service can't handle multiple symbol filters)
    const hasMultipleHoldingFilters = accessFilter?.holdings?.length > 1;

    const activityFilters = portfolioFilters.filter((filter) => {
      // Always include ACCOUNT, ASSET_CLASS, TAG filters
      if (
        filter.type === 'ACCOUNT' ||
        filter.type === 'ASSET_CLASS' ||
        filter.type === 'TAG'
      ) {
        return true;
      }

      // Include DATA_SOURCE and SYMBOL only if there's a single holding filter
      if (
        !hasMultipleHoldingFilters &&
        (filter.type === 'DATA_SOURCE' || filter.type === 'SYMBOL')
      ) {
        return true;
      }

      return false;
    });

    const { activities } = await this.orderService.getOrders({
      filters: activityFilters.length > 0 ? activityFilters : undefined,
      includeDrafts: false,
      sortColumn: 'date',
      sortDirection: 'desc',
      take: 10,
      types: [ActivityType.BUY, ActivityType.SELL],
      userCurrency: user.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY,
      userId: user.id,
      withExcludedAccountsAndActivities: false
    });

    // Experimental
    const latestActivities = this.configurationService.get(
      'ENABLE_FEATURE_SUBSCRIPTION'
    )
      ? []
      : activities.map(
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

    Object.values(markets ?? {}).forEach((market) => {
      delete market.valueInBaseCurrency;
    });

    const publicPortfolioResponse: PublicPortfolioResponse = {
      createdAt,
      hasDetails,
      latestActivities,
      markets,
      alias: access.alias,
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

    const totalValue = getSum(
      Object.values(filteredHoldings).map(
        ({ currency, marketPrice, quantity }) => {
          return new Big(
            this.exchangeRateDataService.toCurrency(
              quantity * marketPrice,
              currency,
              this.request.user?.settings?.settings.baseCurrency ??
                DEFAULT_CURRENCY
            )
          );
        }
      )
    ).toNumber();

    for (const [symbol, portfolioPosition] of Object.entries(
      filteredHoldings
    )) {
      publicPortfolioResponse.holdings[symbol] = {
        allocationInPercentage:
          portfolioPosition.valueInBaseCurrency / totalValue,
        assetClass: hasDetails ? portfolioPosition.assetClass : undefined,
        countries: hasDetails ? portfolioPosition.countries : [],
        currency: hasDetails ? portfolioPosition.currency : undefined,
        dataSource: portfolioPosition.dataSource,
        dateOfFirstActivity: portfolioPosition.dateOfFirstActivity,
        markets: hasDetails ? portfolioPosition.markets : undefined,
        name: portfolioPosition.name,
        netPerformancePercentWithCurrencyEffect:
          portfolioPosition.netPerformancePercentWithCurrencyEffect,
        sectors: hasDetails ? portfolioPosition.sectors : [],
        symbol: portfolioPosition.symbol,
        url: portfolioPosition.url,
        valueInPercentage: portfolioPosition.valueInBaseCurrency / totalValue
      };
    }

    return publicPortfolioResponse;
  }
}
