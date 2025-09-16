import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { getSum } from '@ghostfolio/common/helper';
import { PublicPortfolioResponse } from '@ghostfolio/common/interfaces';
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
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { RedactValuesInResponseInterceptor } from '../../../interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInResponseInterceptor } from '../../../interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ConfigurationService } from '../../../services/configuration/configuration.service';
import { ExchangeRateDataService } from '../../../services/exchange-rate-data/exchange-rate-data.service';
import { AccessService } from '../../access/access.service';
import { OrderService } from '../../order/order.service';
import { PortfolioService } from '../../portfolio/portfolio.service';
import { UserService } from '../../user/user.service';

@Controller('public')
export class PublicController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly _orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Get(':accessId/portfolio')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPublicPortfolio(
    @Param('accessId') accessId
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

    const detailsPromise = this.portfolioService.getDetails({
      impersonationId: access.userId,
      userId: user.id,
      withMarkets: true
    });

    const performance1dPromise = this.portfolioService.getPerformance({
      dateRange: '1d',
      impersonationId: undefined,
      userId: user.id
    });

    const performanceMaxPromise = this.portfolioService.getPerformance({
      dateRange: 'max',
      impersonationId: undefined,
      userId: user.id
    });

    const performanceYtdPromise = this.portfolioService.getPerformance({
      dateRange: 'ytd',
      impersonationId: undefined,
      userId: user.id
    });

    const latestActivitiesPromise = this._orderService.getOrders({
      includeDrafts: false,
      take: 10,
      sortColumn: 'date',
      sortDirection: 'desc',
      userCurrency:
        this.request.user?.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY,
      userId: user.id,
      withExcludedAccountsAndActivities: false
    });

    const [
      { createdAt, holdings, markets },
      { performance: performance1d },
      { performance: performanceMax },
      { performance: performanceYtd }
    ] = await Promise.all([
      detailsPromise,
      performance1dPromise,
      performanceMaxPromise,
      performanceYtdPromise
    ]);

    const { activities } = await latestActivitiesPromise;
    const latestActivities = activities.map((a) => {
      return {
        account: a.account
          ? { name: a.account.name, currency: a.account.currency }
          : undefined,
        dataSource: a.SymbolProfile?.dataSource,
        date: a.date,
        name: a.SymbolProfile?.name ?? '',
        quantity: a.quantity,
        symbol: a.SymbolProfile?.symbol ?? '',
        type: a.type,
        unitPrice: a.unitPrice
      };
    });

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
      Object.values(holdings).map(({ currency, marketPrice, quantity }) => {
        return new Big(
          this.exchangeRateDataService.toCurrency(
            quantity * marketPrice,
            currency,
            this.request.user?.settings?.settings.baseCurrency ??
              DEFAULT_CURRENCY
          )
        );
      })
    ).toNumber();

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
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
