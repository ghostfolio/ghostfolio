import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScope } from '@ghostfolio/api/decorators/requires-scope.decorator';
import {
  hasNotDefinedValuesInObject,
  nullifyValuesInObject
} from '@ghostfolio/api/helper/object.helper';
import { convertValuesToPercentages } from '@ghostfolio/api/helper/portfolio.helper';
import { PerformanceLoggingInterceptor } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInRequestInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { isCashPosition } from '@ghostfolio/common/helper';
import {
  PortfolioDetails,
  PortfolioDividendsResponse,
  PortfolioHoldingResponse,
  PortfolioHoldingsResponse,
  PortfolioInvestmentsResponse,
  PortfolioPerformanceResponse,
  PortfolioReportResponse
} from '@ghostfolio/common/interfaces';
import { isRestrictedView, permissions } from '@ghostfolio/common/permissions';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Put,
  Query,
  UseInterceptors,
  Version
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DataSource } from '@prisma/client';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { GetDetailsDto } from './get-details.dto';
import { GetDividendsDto } from './get-dividends.dto';
import { GetHoldingsDto } from './get-holdings.dto';
import { GetInvestmentsDto } from './get-investments.dto';
import { GetPerformanceDto } from './get-performance.dto';
import { PortfolioService } from './portfolio.service';
import { UpdateHoldingTagsDto } from './update-holding-tags.dto';

@Controller('portfolio')
export class PortfolioController {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly portfolioService: PortfolioService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get('details')
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getDetails(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext,
    @Query()
    {
      accounts: filterByAccounts,
      assetClasses: filterByAssetClasses,
      dataSource: filterByDataSource,
      range,
      symbol: filterBySymbol,
      tags: filterByTags,
      withMarkets
    }: GetDetailsDto
  ): Promise<PortfolioDetails & { hasError: boolean }> {
    let hasDetails = true;
    let hasError = false;

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails =
        this.request.user.subscription?.type === SubscriptionType.Premium;
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
      createdAt,
      hasErrors,
      holdings,
      markets,
      marketsAdvanced,
      platforms,
      summary
    } = await this.portfolioService.getDetails({
      filters,
      userId,
      withMarkets,
      dateRange: range,
      withSummary: true
    });

    if (hasErrors || hasNotDefinedValuesInObject(holdings)) {
      hasError = true;
    }

    let portfolioSummary = summary;

    if (
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
      isRestrictedView(this.request.user)
    ) {
      convertValuesToPercentages({ accounts, holdings, platforms });
    }

    if (
      hasDetails === false ||
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
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
        'interestInBaseCurrency',
        'items',
        'liabilities',
        'liabilitiesInBaseCurrency',
        'netPerformance',
        'netPerformanceWithCurrencyEffect',
        'totalAssetsInBaseCurrency',
        'totalBuy',
        'totalCashInBaseCurrency',
        'totalInvestment',
        'totalInvestmentValueWithCurrencyEffect',
        'totalSell',
        'totalValueInBaseCurrency'
      ]);
    }

    for (const [index, portfolioPosition] of holdings.entries()) {
      holdings[index] = {
        ...portfolioPosition,
        assetProfile: {
          ...portfolioPosition.assetProfile,
          assetClass:
            hasDetails || isCashPosition(portfolioPosition.assetProfile)
              ? portfolioPosition.assetProfile.assetClass
              : undefined,
          assetClassLabel:
            hasDetails || isCashPosition(portfolioPosition.assetProfile)
              ? portfolioPosition.assetProfile.assetClassLabel
              : undefined,
          assetSubClass:
            hasDetails || isCashPosition(portfolioPosition.assetProfile)
              ? portfolioPosition.assetProfile.assetSubClass
              : undefined,
          assetSubClassLabel:
            hasDetails || isCashPosition(portfolioPosition.assetProfile)
              ? portfolioPosition.assetProfile.assetSubClassLabel
              : undefined,
          ...(hasDetails
            ? {}
            : {
                countries: [],
                currency: undefined,
                holdings: [],
                sectors: []
              })
        },
        markets: hasDetails ? portfolioPosition.markets : undefined,
        marketsAdvanced: hasDetails
          ? portfolioPosition.marketsAdvanced
          : undefined
      };
    }

    return {
      accounts,
      createdAt,
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
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getDividends(
    @Impersonation()
    { scopes: impersonationScopes, userId, userSettings }: ImpersonationContext,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource,
      groupBy,
      range,
      symbol,
      tags
    }: GetDividendsDto
  ): Promise<PortfolioDividendsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    const userCurrency = userSettings.baseCurrency;

    const { endDate, startDate } = getIntervalFromDateRange({
      dateRange: range
    });

    const { activities } = await this.activitiesService.getActivities({
      endDate,
      filters,
      startDate,
      userCurrency,
      userId,
      types: ['DIVIDEND']
    });

    let dividends = this.portfolioService.getDividends({
      activities,
      groupBy
    });

    if (
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
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
      this.request.user.subscription?.type === SubscriptionType.Basic
    ) {
      dividends = dividends.map((item) => {
        return nullifyValuesInObject(item, ['investment']);
      });
    }

    return { dividends };
  }

  @Get('holding/:dataSource/:symbol')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @RequiresScope(scopes.portfolioRead)
  public async getHolding(
    @Impersonation() { userId }: ImpersonationContext,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<PortfolioHoldingResponse> {
    const holding = await this.portfolioService.getHolding({
      dataSource,
      symbol,
      userId
    });

    if (!holding) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    return holding;
  }

  @Get('holdings')
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getHoldings(
    @Impersonation() { userId }: ImpersonationContext,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource,
      holdingType,
      query,
      range,
      symbol,
      tags
    }: GetHoldingsDto
  ): Promise<PortfolioHoldingsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterByHoldingType: holdingType,
      filterBySearchQuery: query,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    return this.portfolioService.getHoldings({
      filters,
      userId,
      dateRange: range
    });
  }

  @Get('investments')
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async getInvestments(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource,
      groupBy,
      range,
      symbol,
      tags
    }: GetInvestmentsDto
  ): Promise<PortfolioInvestmentsResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    let { investments, savingsRate, streaks } =
      await this.portfolioService.getInvestments({
        filters,
        groupBy,
        userId,
        dateRange: range
      });

    if (
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
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

      savingsRate = null;
    }

    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription?.type === SubscriptionType.Basic
    ) {
      investments = investments.map((item) => {
        return nullifyValuesInObject(item, ['investment']);
      });

      streaks = nullifyValuesInObject(streaks, [
        'currentStreak',
        'longestStreak'
      ]);
    }

    return { investments, savingsRate, streaks };
  }

  @Get('performance')
  @RequiresScope(scopes.portfolioRead)
  @UseInterceptors(PerformanceLoggingInterceptor)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  @Version('2')
  public async getPerformanceV2(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext,
    @Query()
    {
      accounts,
      assetClasses,
      dataSource,
      range,
      symbol,
      tags,
      withExcludedAccounts
    }: GetPerformanceDto
  ): Promise<PortfolioPerformanceResponse> {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accounts,
      filterByAssetClasses: assetClasses,
      filterByDataSource: dataSource,
      filterBySymbol: symbol,
      filterByTags: tags
    });

    const performanceInformation = await this.portfolioService.getPerformance({
      filters,
      userId,
      withExcludedAccounts,
      dateRange: range
    });

    if (
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
      isRestrictedView(this.request.user) ||
      this.request.user.settings.settings.viewMode === 'ZEN'
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
      this.request.user.subscription?.type === SubscriptionType.Basic
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

  @Get('report')
  @RequiresScope(scopes.portfolioRead)
  public async getReport(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext
  ): Promise<PortfolioReportResponse> {
    const report = await this.portfolioService.getReport({ userId });

    if (
      !hasScope(impersonationScopes, scopes.portfolioReadValues) ||
      isRestrictedView(this.request.user) ||
      (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
        this.request.user.subscription?.type === SubscriptionType.Basic)
    ) {
      for (const category of report.xRay.categories) {
        category.rules = null;
      }

      report.xRay.statistics = {
        rulesActiveCount: 0,
        rulesFulfilledCount: 0
      };
    }

    return report;
  }

  @HasPermission(permissions.updateActivity)
  @Put('holding/:dataSource/:symbol/tags')
  @RequiresScope(scopes.activityUpdate)
  @UseInterceptors(TransformDataSourceInRequestInterceptor)
  public async updateHoldingTags(
    @Body() data: UpdateHoldingTagsDto,
    @Impersonation() { userId }: ImpersonationContext,
    @Param('dataSource') dataSource: DataSource,
    @Param('symbol') symbol: string
  ): Promise<void> {
    const holding = await this.portfolioService.getHolding({
      dataSource,
      symbol,
      userId
    });

    if (!holding) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    await this.portfolioService.updateTags({
      dataSource,
      symbol,
      userId,
      tags: data.tags
    });
  }
}
