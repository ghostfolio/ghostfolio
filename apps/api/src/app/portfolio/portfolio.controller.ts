import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import {
  DEFAULT_CURRENCY,
  HEADER_KEY_IMPERSONATION
} from '@ghostfolio/common/config';
import {
  PortfolioDetails,
  PortfolioDividends,
  PortfolioHoldingsResponse,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioPublicDetails,
  PortfolioReport
} from '@ghostfolio/common/interfaces';
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
  UseInterceptors,
  Version
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PortfolioPositionDetail } from './interfaces/portfolio-position-detail.interface';
import { PortfolioPositions } from './interfaces/portfolio-positions.interface';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Get('details')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getDetails(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('tags') filterByTags?: string,
    @Query('withLiabilities') withLiabilitiesParam = 'false'
  ): Promise<PortfolioDetails & { hasError: boolean }> {
    const withLiabilities = withLiabilitiesParam === 'true';

    let hasDetails = true;
    let hasError = false;
    const hasReadRestrictedAccessPermission =
      this.userService.hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      });

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = this.request.user.subscription.type === 'Premium';
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByTags
    });

    const { accounts, hasErrors, holdings, platforms, summary } =
      await this.portfolioService.getDetails({
        dateRange,
        filters,
        impersonationId,
        withLiabilities,
        userId: this.request.user.id,
        withSummary: true
      });

    if (hasErrors || hasNotDefinedValuesInObject(holdings)) {
      hasError = true;
    }

    let portfolioSummary = summary;

    if (
      hasReadRestrictedAccessPermission ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const totalInvestment = Object.values(holdings)
        .map(({ investment }) => {
          return investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(holdings)
        .filter(({ assetClass, assetSubClass }) => {
          return assetClass !== 'CASH' && assetSubClass !== 'CASH';
        })
        .map(({ valueInBaseCurrency }) => {
          return valueInBaseCurrency;
        })
        .reduce((a, b) => a + b, 0);

      for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
        portfolioPosition.investment =
          portfolioPosition.investment / totalInvestment;
        portfolioPosition.valueInPercentage =
          portfolioPosition.valueInBaseCurrency / totalValue;
      }

      for (const [name, { valueInBaseCurrency }] of Object.entries(accounts)) {
        accounts[name].valueInPercentage = valueInBaseCurrency / totalValue;
      }

      for (const [name, { valueInBaseCurrency }] of Object.entries(platforms)) {
        platforms[name].valueInPercentage = valueInBaseCurrency / totalValue;
      }
    }

    if (
      hasDetails === false ||
      hasReadRestrictedAccessPermission ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      portfolioSummary = nullifyValuesInObject(summary, [
        'cash',
        'committedFunds',
        'currentGrossPerformance',
        'currentGrossPerformanceWithCurrencyEffect',
        'currentNetPerformance',
        'currentNetPerformanceWithCurrencyEffect',
        'currentNetWorth',
        'currentValue',
        'dividendInBaseCurrency',
        'emergencyFund',
        'excludedAccountsAndActivities',
        'fees',
        'filteredValueInBaseCurrency',
        'fireWealth',
        'interest',
        'items',
        'liabilities',
        'totalBuy',
        'totalInvestment',
        'totalSell',
        'totalValueInBaseCurrency'
      ]);
    }

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      holdings[symbol] = {
        ...portfolioPosition,
        assetClass:
          hasDetails || portfolioPosition.assetClass === 'CASH'
            ? portfolioPosition.assetClass
            : undefined,
        assetSubClass:
          hasDetails || portfolioPosition.assetSubClass === 'CASH'
            ? portfolioPosition.assetSubClass
            : undefined,
        countries: hasDetails ? portfolioPosition.countries : [],
        currency: hasDetails ? portfolioPosition.currency : undefined,
        markets: hasDetails ? portfolioPosition.markets : undefined,
        marketsAdvanced: hasDetails
          ? portfolioPosition.marketsAdvanced
          : undefined,
        sectors: hasDetails ? portfolioPosition.sectors : []
      };
    }

    return {
      accounts,
      hasError,
      holdings,
      platforms,
      summary: portfolioSummary
    };
  }

  @Get('dividends')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getDividends(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('groupBy') groupBy?: GroupBy,
    @Query('range') dateRange: DateRange = 'max',
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioDividends> {
    const hasReadRestrictedAccessPermission =
      this.userService.hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      });

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByTags
    });

    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);
    const userCurrency = this.request.user.Settings.settings.baseCurrency;

    const { activities } = await this.orderService.getOrders({
      filters,
      userCurrency,
      userId: impersonationUserId || this.request.user.id,
      types: ['DIVIDEND']
    });

    let dividends = await this.portfolioService.getDividends({
      activities,
      dateRange,
      groupBy
    });

    if (
      hasReadRestrictedAccessPermission ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      const maxDividend = dividends.reduce(
        (investment, item) => Math.max(investment, item.investment),
        1
      );

      dividends = dividends.map((item) => ({
        date: item.date,
        investment: item.investment / maxDividend
      }));
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      dividends = dividends.map((item) => {
        return nullifyValuesInObject(item, ['investment']);
      });
    }

    return { dividends };
  }

  @Get('holdings')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getHoldings(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('holdingType') filterByHoldingType?: string,
    @Query('query') filterBySearchQuery?: string,
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioHoldingsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByHoldingType,
      filterBySearchQuery,
      filterByTags
    });

    const { holdings } = await this.portfolioService.getDetails({
      filters,
      impersonationId,
      userId: this.request.user.id
    });

    return { holdings: Object.values(holdings) };
  }

  @Get('investments')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getInvestments(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('groupBy') groupBy?: GroupBy,
    @Query('range') dateRange: DateRange = 'max',
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioInvestments> {
    const hasReadRestrictedAccessPermission =
      this.userService.hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      });

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByTags
    });

    let { investments, streaks } = await this.portfolioService.getInvestments({
      dateRange,
      filters,
      groupBy,
      impersonationId,
      savingsRate: this.request.user?.Settings?.settings.savingsRate
    });

    if (
      hasReadRestrictedAccessPermission ||
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

      streaks = nullifyValuesInObject(streaks, [
        'currentStreak',
        'longestStreak'
      ]);
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      investments = investments.map((item) => {
        return nullifyValuesInObject(item, ['investment']);
      });

      streaks = nullifyValuesInObject(streaks, [
        'currentStreak',
        'longestStreak'
      ]);
    }

    return { investments, streaks };
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @Version('2')
  public async getPerformanceV2(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('tags') filterByTags?: string,
    @Query('withExcludedAccounts') withExcludedAccountsParam = 'false',
    @Query('withItems') withItemsParam = 'false'
  ): Promise<PortfolioPerformanceResponse> {
    const withExcludedAccounts = withExcludedAccountsParam === 'true';
    const withItems = withItemsParam === 'true';

    const hasReadRestrictedAccessPermission =
      this.userService.hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      });

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByTags
    });

    const performanceInformation = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      impersonationId,
      withExcludedAccounts,
      withItems,
      userId: this.request.user.id
    });

    if (
      hasReadRestrictedAccessPermission ||
      this.request.user.Settings.settings.viewMode === 'ZEN' ||
      this.userService.isRestrictedView(this.request.user)
    ) {
      performanceInformation.chart = performanceInformation.chart.map(
        ({
          date,
          netPerformanceInPercentage,
          netPerformanceInPercentageWithCurrencyEffect,
          netWorth,
          totalInvestment,
          value
        }) => {
          return {
            date,
            netPerformanceInPercentage,
            netPerformanceInPercentageWithCurrencyEffect,
            netWorthInPercentage:
              performanceInformation.performance.currentNetWorth === 0
                ? 0
                : new Big(netWorth)
                    .div(performanceInformation.performance.currentNetWorth)
                    .toNumber(),
            totalInvestment:
              performanceInformation.performance.totalInvestment === 0
                ? 0
                : new Big(totalInvestment)
                    .div(performanceInformation.performance.totalInvestment)
                    .toNumber(),
            valueInPercentage:
              performanceInformation.performance.currentValue === 0
                ? 0
                : new Big(value)
                    .div(performanceInformation.performance.currentValue)
                    .toNumber()
          };
        }
      );

      performanceInformation.performance = nullifyValuesInObject(
        performanceInformation.performance,
        [
          'currentGrossPerformance',
          'currentGrossPerformanceWithCurrencyEffect',
          'currentNetPerformance',
          'currentNetPerformanceWithCurrencyEffect',
          'currentNetWorth',
          'currentValue',
          'totalInvestment'
        ]
      );
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      performanceInformation.chart = performanceInformation.chart.map(
        (item) => {
          return nullifyValuesInObject(item, ['totalInvestment', 'value']);
        }
      );
      performanceInformation.performance = nullifyValuesInObject(
        performanceInformation.performance,
        ['currentNetPerformance', 'currentNetPerformancePercent']
      );
    }

    return performanceInformation;
  }

  @Get('positions')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPositions(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('query') filterBySearchQuery?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioPositions> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterBySearchQuery,
      filterByTags
    });

    return this.portfolioService.getPositions({
      dateRange,
      filters,
      impersonationId
    });
  }

  @Get('public/:accessId')
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
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

    const { holdings } = await this.portfolioService.getDetails({
      filters: [{ id: 'EQUITY', type: 'ASSET_CLASS' }],
      impersonationId: access.userId,
      userId: user.id
    });

    const portfolioPublicDetails: PortfolioPublicDetails = {
      hasDetails,
      alias: access.alias,
      holdings: {}
    };

    const totalValue = Object.values(holdings)
      .map((portfolioPosition) => {
        return this.exchangeRateDataService.toCurrency(
          portfolioPosition.quantity * portfolioPosition.marketPrice,
          portfolioPosition.currency,
          this.request.user?.Settings?.settings.baseCurrency ?? DEFAULT_CURRENCY
        );
      })
      .reduce((a, b) => a + b, 0);

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      portfolioPublicDetails.holdings[symbol] = {
        allocationInPercentage:
          portfolioPosition.valueInBaseCurrency / totalValue,
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

    return portfolioPublicDetails;
  }

  @Get('position/:dataSource/:symbol')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPosition(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('dataSource') dataSource,
    @Param('symbol') symbol
  ): Promise<PortfolioPositionDetail> {
    const position = await this.portfolioService.getPosition(
      dataSource,
      impersonationId,
      symbol
    );

    if (position) {
      return position;
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.NOT_FOUND),
      StatusCodes.NOT_FOUND
    );
  }

  @Get('report')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getReport(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string
  ): Promise<PortfolioReport> {
    const report = await this.portfolioService.getReport(impersonationId);

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      for (const rule in report.rules) {
        if (report.rules[rule]) {
          report.rules[rule] = [];
        }
      }
    }

    return report;
  }
}
