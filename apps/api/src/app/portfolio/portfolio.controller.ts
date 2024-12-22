
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { PerformanceLoggingInterceptor } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  HEADER_KEY_IMPERSONATION,
  UNKNOWN_KEY
} from '@ghostfolio/common/config';
import {
  LookupItem,
  PortfolioDetails,
  PortfolioDividends,
  PortfolioHoldingsResponse,
  PortfolioInvestments,
  PortfolioPerformanceResponse,
  PortfolioReportResponse
} from '@ghostfolio/common/interfaces';
import {
  hasReadRestrictedAccessPermission,
  isRestrictedView,
  permissions
} from '@ghostfolio/common/permissions';
import type {
  DateRange,
  GroupBy,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  Version
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PortfolioHoldingDetail } from './interfaces/portfolio-holding-detail.interface';
import { PortfolioService } from './portfolio.service';
import { UpdateHoldingTagsDto } from './update-holding-tags.dto';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly impersonationService: ImpersonationService,
    private readonly orderService: OrderService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('details')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getDetails(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string,
    @Query('withMarkets') withMarketsParam = 'false'
  ): Promise<PortfolioDetails & { hasError: boolean }> {
    const withMarkets = withMarketsParam === 'true';

    let hasDetails = true;
    let hasError = false;

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = this.request.user.subscription.type === 'Premium';
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const {
      accounts,
      hasErrors,
      holdings,
      markets,
      marketsAdvanced,
      platforms,
      summary
    } = await this.portfolioService.getDetails({
      dateRange,
      filters,
      impersonationId,
      withMarkets,
      userId: this.request.user.id,
      withSummary: true
    });

    if (hasErrors || hasNotDefinedValuesInObject(holdings)) {
      hasError = true;
    }

    let portfolioSummary = summary;

    if (
      hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      }) ||
      isRestrictedView(this.request.user)
    ) {
      const totalInvestment = Object.values(holdings)
        .map(({ investment }) => {
          return investment;
        })
        .reduce((a, b) => a + b, 0);

      const totalValue = Object.values(holdings)
        .filter(({ assetClass, assetSubClass }) => {
          return (
            assetClass !== AssetClass.LIQUIDITY &&
            assetSubClass !== AssetSubClass.CASH
          );
        })
        .map(({ valueInBaseCurrency }) => {
          return valueInBaseCurrency;
        })
        .reduce((a, b) => {
          return a + b;
        }, 0);

      for (const [, portfolioPosition] of Object.entries(holdings)) {
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
      hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      }) ||
      isRestrictedView(this.request.user)
    ) {
      Object.values(markets ?? {}).forEach((market) => {
        delete market.valueInBaseCurrency;
      });
      Object.values(marketsAdvanced ?? {}).forEach((market) => {
        delete market.valueInBaseCurrency;
      });

      portfolioSummary = nullifyValuesInObject(summary, [
        'cash',
        'committedFunds',
        'currentNetWorth',
        'currentValueInBaseCurrency',
        'dividendInBaseCurrency',
        'emergencyFund',
        'excludedAccountsAndActivities',
        'fees',
        'filteredValueInBaseCurrency',
        'fireWealth',
        'grossPerformance',
        'grossPerformanceWithCurrencyEffect',
        'interest',
        'items',
        'liabilities',
        'netPerformance',
        'netPerformanceWithCurrencyEffect',
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
          hasDetails || portfolioPosition.assetClass === AssetClass.LIQUIDITY
            ? portfolioPosition.assetClass
            : undefined,
        assetSubClass:
          hasDetails || portfolioPosition.assetSubClass === AssetSubClass.CASH
            ? portfolioPosition.assetSubClass
            : undefined,
        countries: hasDetails ? portfolioPosition.countries : [],
        currency: hasDetails ? portfolioPosition.currency : undefined,
        holdings: hasDetails ? portfolioPosition.holdings : [],
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
      markets: hasDetails
        ? markets
        : {
            [UNKNOWN_KEY]: {
              id: UNKNOWN_KEY,
              valueInPercentage: 1
            },
            developedMarkets: {
              id: 'developedMarkets',
              valueInPercentage: 0
            },
            emergingMarkets: {
              id: 'emergingMarkets',
              valueInPercentage: 0
            },
            otherMarkets: {
              id: 'otherMarkets',
              valueInPercentage: 0
            }
          },
      marketsAdvanced: hasDetails
        ? marketsAdvanced
        : {
            [UNKNOWN_KEY]: {
              id: UNKNOWN_KEY,
              valueInPercentage: 0
            },
            asiaPacific: {
              id: 'asiaPacific',
              valueInPercentage: 0
            },
            emergingMarkets: {
              id: 'emergingMarkets',
              valueInPercentage: 0
            },
            europe: {
              id: 'europe',
              valueInPercentage: 0
            },
            japan: {
              id: 'japan',
              valueInPercentage: 0
            },
            northAmerica: {
              id: 'northAmerica',
              valueInPercentage: 0
            },
            otherMarkets: {
              id: 'otherMarkets',
              valueInPercentage: 0
            }
          },
      summary: portfolioSummary
    };
  }

  @Get('dividends')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getDividends(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('groupBy') groupBy?: GroupBy,
    @Query('range') dateRange: DateRange = 'max',
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioDividends> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const impersonationUserId =
      await this.impersonationService.validateImpersonationId(impersonationId);
    const userCurrency = this.request.user.Settings.settings.baseCurrency;

    const { endDate, startDate } = getIntervalFromDateRange(dateRange);

    const { activities } = await this.orderService.getOrders({
      endDate,
      filters,
      startDate,
      userCurrency,
      userId: impersonationUserId || this.request.user.id,
      types: ['DIVIDEND']
    });

    let dividends = await this.portfolioService.getDividends({
      activities,
      groupBy
    });

    if (
      hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      }) ||
      isRestrictedView(this.request.user)
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
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getHoldings(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('holdingType') filterByHoldingType?: string,
    @Query('query') filterBySearchQuery?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioHoldingsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterByHoldingType,
      filterBySearchQuery,
      filterBySymbol,
      filterByTags
    });

    const { holdings } = await this.portfolioService.getDetails({
      dateRange,
      filters,
      impersonationId,
      userId: this.request.user.id
    });

    return { holdings: Object.values(holdings) };
  }

  @Get('lookup')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async lookupSymbol(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('query') filterBySearchQuery?: string
  ): Promise<{ items: LookupItem[] }> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterBySearchQuery
    });

    return {
      items: await this.portfolioService.getLookup({
        filters,
        impersonationId,
        userId: this.request.user.id
      })
    };
  }

  @Get('investments')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getInvestments(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('groupBy') groupBy?: GroupBy,
    @Query('range') dateRange: DateRange = 'max',
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string
  ): Promise<PortfolioInvestments> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
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
      hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      }) ||
      isRestrictedView(this.request.user)
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
  @UseInterceptors(PerformanceLoggingInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @Version('2')
  public async getPerformanceV2(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Query('accounts') filterByAccounts?: string,
    @Query('assetClasses') filterByAssetClasses?: string,
    @Query('dataSource') filterByDataSource?: string,
    @Query('range') dateRange: DateRange = 'max',
    @Query('symbol') filterBySymbol?: string,
    @Query('tags') filterByTags?: string,
    @Query('withExcludedAccounts') withExcludedAccountsParam = 'false'
  ): Promise<PortfolioPerformanceResponse> {
    const withExcludedAccounts = withExcludedAccountsParam === 'true';

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts,
      filterByAssetClasses,
      filterByDataSource,
      filterBySymbol,
      filterByTags
    });

    const performanceInformation = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      impersonationId,
      withExcludedAccounts,
      userId: this.request.user.id
    });

    if (
      hasReadRestrictedAccessPermission({
        impersonationId,
        user: this.request.user
      }) ||
      isRestrictedView(this.request.user) ||
      this.request.user.Settings.settings.viewMode === 'ZEN'
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
              performanceInformation.performance.currentValueInBaseCurrency ===
              0
                ? 0
                : new Big(value)
                    .div(
                      performanceInformation.performance
                        .currentValueInBaseCurrency
                    )
                    .toNumber()
          };
        }
      );

      performanceInformation.performance = nullifyValuesInObject(
        performanceInformation.performance,
        [
          'currentNetWorth',
          'currentValueInBaseCurrency',
          'grossPerformance',
          'grossPerformanceWithCurrencyEffect',
          'netPerformance',
          'netPerformanceWithCurrencyEffect',
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
        ['netPerformance']
      );
    }

    return performanceInformation;
  }

  @Get('position/:dataSource/:symbol')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPosition(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<PortfolioHoldingDetail> {
    const holding = await this.portfolioService.getPosition(
      dataSource,
      impersonationId,
      symbol
    );

    if (!holding) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return holding;
  }

  @Get('report')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getReport(
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string
  ): Promise<PortfolioReportResponse> {
    const report = await this.portfolioService.getReport(impersonationId);

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === 'Basic'
    ) {
      for (const rule in report.rules) {
        report.rules[rule] = null;
      }

      report.statistics = {
        rulesActiveCount: 0,
        rulesFulfilledCount: 0
      };
    }

    return report;
  }

  @HasPermission(permissions.updateOrder)
  @Put('position/:dataSource/:symbol/tags')
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateHoldingTags(
    @Body() data: UpdateHoldingTagsDto,
    @Headers(HEADER_KEY_IMPERSONATION.toLowerCase()) impersonationId: string,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const holding = await this.portfolioService.getPosition(
      dataSource,
      impersonationId,
      symbol
    );

    if (!holding) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    await this.portfolioService.updateTags({
      dataSource,
      impersonationId,
      symbol,
      tags: data.tags,
      userId: this.request.user.id
    });
  }
}
