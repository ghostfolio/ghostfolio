import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { parseDate } from '@ghostfolio/common/helper';
import {
  Filter,
  PortfolioChart,
  PortfolioDetails,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPublicDetails,
  PortfolioReport,
  PortfolioSummary
} from '@ghostfolio/common/interfaces';
import { InvestmentItem } from '@ghostfolio/common/interfaces/investment-item.interface';
import type {
  DateRange,
  GroupBy,
  RequestWithUser
} from '@ghostfolio/common/types';
import {
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ViewMode } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PortfolioPositionDetail } from './interfaces/portfolio-position-detail.interface';
import { PortfolioPositions } from './interfaces/portfolio-positions.interface';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  private baseCurrency: string;

  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
  }

  @Get('chart')
  @UseGuards(AuthGuard('jwt'))
  public async getChart(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range
  ): Promise<PortfolioChart> {
    const historicalDataContainer = await this.portfolioService.getChart(
      impersonationId,
      range
    );

    let chartData = historicalDataContainer.items;

    let hasError = false;

    chartData.forEach((chartDataItem) => {
      if (hasNotDefinedValuesInObject(chartDataItem)) {
        hasError = true;
      }
    });

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      let maxValue = 0;

      chartData.forEach((portfolioItem) => {
        if (portfolioItem.value > maxValue) {
          maxValue = portfolioItem.value;
        }
      });

      chartData = chartData.map((historicalDataItem) => {
        return {
          ...historicalDataItem,
          marketPrice: Number((historicalDataItem.value / maxValue).toFixed(2))
        };
      });
    }

    return {
      hasError,
      chart: chartData,
      isAllTimeHigh: historicalDataContainer.isAllTimeHigh,
      isAllTimeLow: historicalDataContainer.isAllTimeLow
    };
  }

  @Get('details')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getDetails(
    @Headers('impersonation-id') impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('range') range?: DateRange,
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioDetails & { hasError: boolean }> {
    let hasError = false;

    const accountIds = filterByAccounts?.split(',') ?? [];
    const assetClasses = filterByAssetClasses?.split(',') ?? [];
    const tagIds = filterByTags?.split(',') ?? [];

    const filters: Filter[] = [
      ...accountIds.map((accountId) => {
        return <Filter>{
          id: accountId,
          type: 'ACCOUNT'
        };
      }),
      ...assetClasses.map((assetClass) => {
        return <Filter>{
          id: assetClass,
          type: 'ASSET_CLASS'
        };
      }),
      ...tagIds.map((tagId) => {
        return <Filter>{
          id: tagId,
          type: 'TAG'
        };
      })
    ];

    const { accounts, holdings, hasErrors } =
      await this.portfolioService.getDetails(
        impersonationId,
        this.request.user.id,
        range,
        filters
      );

    if (hasErrors || hasNotDefinedValuesInObject(holdings)) {
      hasError = true;
    }

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const totalInvestment = Object.values(holdings)
        .map((portfolioPosition) => {
          return portfolioPosition.investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(holdings)
        .map((portfolioPosition) => {
          return this.exchangeRateDataService.toCurrency(
            portfolioPosition.quantity * portfolioPosition.marketPrice,
            portfolioPosition.currency,
            this.request.user.Settings.currency
          );
        })
        .reduce((a, b) => a + b, 0);

      for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
        portfolioPosition.grossPerformance = null;
        portfolioPosition.investment =
          portfolioPosition.investment / totalInvestment;
        portfolioPosition.netPerformance = null;
        portfolioPosition.quantity = null;
        portfolioPosition.value = portfolioPosition.value / totalValue;
      }

      for (const [name, { current, original }] of Object.entries(accounts)) {
        accounts[name].current = current / totalValue;
        accounts[name].original = original / totalInvestment;
      }
    }

    let hasDetails = true;
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = this.request.user.subscription.type === 'Premium';
    }

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      holdings[symbol] = {
        ...portfolioPosition,
        assetClass: hasDetails ? portfolioPosition.assetClass : undefined,
        assetSubClass: hasDetails ? portfolioPosition.assetSubClass : undefined,
        countries: hasDetails ? portfolioPosition.countries : [],
        currency: hasDetails ? portfolioPosition.currency : undefined,
        markets: hasDetails ? portfolioPosition.markets : undefined,
        sectors: hasDetails ? portfolioPosition.sectors : []
      };
    }

    return {
      accounts,
      hasError,
      holdings
    };
  }

  @Get('investments')
  @UseGuards(AuthGuard('jwt'))
  public async getInvestments(
    @Headers('impersonation-id') impersonationId: string,
    @Query('groupBy') groupBy?: GroupBy
  ): Promise<PortfolioInvestments> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let investments: InvestmentItem[];

    if (groupBy === 'month') {
      investments = await this.portfolioService.getInvestments(
        impersonationId,
        'month'
      );
    } else {
      investments = await this.portfolioService.getInvestments(impersonationId);
    }

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const maxInvestment = investments.reduce(
        (investment, item) => Math.max(investment, item.investment),
        1
      );

      investments = investments.map((item) => ({
        date: item.date,
        investment: item.investment / maxInvestment
      }));
    }

    return { firstOrderDate: parseDate(investments[0]?.date), investments };
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPerformance(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range
  ): Promise<PortfolioPerformanceResponse> {
    const performanceInformation = await this.portfolioService.getPerformance(
      impersonationId,
      range
    );

    if (
      impersonationId ||
      this.request.user.Settings.viewMode === ViewMode.ZEN ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      performanceInformation.performance = nullifyValuesInObject(
        performanceInformation.performance,
        ['currentGrossPerformance', 'currentValue']
      );
    }

    return performanceInformation;
  }

  @Get('positions')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPositions(
    @Headers('impersonation-id') impersonationId: string,
    @Query('range') range
  ): Promise<PortfolioPositions> {
    const result = await this.portfolioService.getPositions(
      impersonationId,
      range
    );

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      result.positions = result.positions.map((position) => {
        return nullifyValuesInObject(position, [
          'grossPerformance',
          'investment',
          'netPerformance',
          'quantity'
        ]);
      });
    }

    return result;
  }

  @Get('public/:accessId')
  public async getPublic(
    @Param('accessId') accessId
  ): Promise<PortfolioPublicDetails> {
    const access = await this.accessService.access({ id: accessId });
    const user = await this.userService.user({
      id: access.userId
    });

    if (!access) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    let hasDetails = true;
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = user.subscription.type === 'Premium';
    }

    const { holdings } = await this.portfolioService.getDetails(
      access.userId,
      access.userId,
      'max',
      [{ id: 'EQUITY', type: 'ASSET_CLASS' }]
    );

    const portfolioPublicDetails: PortfolioPublicDetails = {
      hasDetails,
      holdings: {}
    };

    const totalValue = Object.values(holdings)
      .map((portfolioPosition) => {
        return this.exchangeRateDataService.toCurrency(
          portfolioPosition.quantity * portfolioPosition.marketPrice,
          portfolioPosition.currency,
          this.request.user?.Settings?.currency ?? this.baseCurrency
        );
      })
      .reduce((a, b) => a + b, 0);

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      portfolioPublicDetails.holdings[symbol] = {
        allocationCurrent: portfolioPosition.value / totalValue,
        countries: hasDetails ? portfolioPosition.countries : [],
        currency: hasDetails ? portfolioPosition.currency : undefined,
        markets: hasDetails ? portfolioPosition.markets : undefined,
        name: portfolioPosition.name,
        netPerformancePercent: portfolioPosition.netPerformancePercent,
        sectors: hasDetails ? portfolioPosition.sectors : [],
        symbol: portfolioPosition.symbol,
        url: portfolioPosition.url,
        value: portfolioPosition.value / totalValue
      };
    }

    return portfolioPublicDetails;
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  public async getSummary(
    @Headers('impersonation-id') impersonationId
  ): Promise<PortfolioSummary> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    let summary = await this.portfolioService.getSummary(impersonationId);

    if (
      impersonationId ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      summary = nullifyValuesInObject(summary, [
        'cash',
        'committedFunds',
        'currentGrossPerformance',
        'currentNetPerformance',
        'currentValue',
        'dividend',
        'emergencyFund',
        'fees',
        'items',
        'netWorth',
        'totalBuy',
        'totalSell'
      ]);
    }

    return summary;
  }

  @Get('position/:dataSource/:symbol')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @UseGuards(AuthGuard('jwt'))
  public async getPosition(
    @Headers('impersonation-id') impersonationId: string,
    @Param('dataSource') dataSource,
    @Param('symbol') symbol
  ): Promise<PortfolioPositionDetail> {
    let position = await this.portfolioService.getPosition(
      dataSource,
      impersonationId,
      symbol
    );

    if (position) {
      if (
        impersonationId ||
        this.userService.isRestrictedView(this.request.user)
      ) {
        position = nullifyValuesInObject(position, [
          'grossPerformance',
          'investment',
          'netPerformance',
          'orders',
          'quantity',
          'value'
        ]);
      }

      return position;
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }

  @Get('report')
  @UseGuards(AuthGuard('jwt'))
  public async getReport(
    @Headers('impersonation-id') impersonationId: string
  ): Promise<PortfolioReport> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return await this.portfolioService.getReport(impersonationId);
  }
}
