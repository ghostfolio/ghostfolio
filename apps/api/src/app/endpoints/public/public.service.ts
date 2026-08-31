import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { getSum, isCashPosition } from '@ghostfolio/common/helper';
import {
  AccessSettings,
  PublicPortfolioResponse
} from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { Type as ActivityType } from '@prisma/client';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class PublicService {
  public constructor(
    private readonly accessService: AccessService,
    private readonly activitiesService: ActivitiesService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioService: PortfolioService,
    private readonly userService: UserService
  ) {}

  public async getPublicPortfolio(
    accessId: string
  ): Promise<PublicPortfolioResponse> {
    const access = await this.accessService.access({
      id: accessId,
      type: 'PUBLIC'
    });

    if (!access || this.accessService.isExpired(access)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    await this.accessService.updateLastUsedAt(access);

    let hasDetails = true;

    const user = await this.userService.user({
      id: access.userId
    });

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      hasDetails = user?.subscription?.type === SubscriptionType.Premium;
    }

    const { filters } = (access.settings ?? {}) as AccessSettings;

    const [
      { createdAt, holdings, markets },
      { performance: performance1d },
      { performance: performanceMax },
      { performance: performanceYtd }
    ] = await Promise.all([
      this.portfolioService.getDetails({
        filters,
        userId: user.id,
        withMarkets: true
      }),
      ...['1d', 'max', 'ytd'].map((dateRange) => {
        return this.portfolioService.getPerformance({
          dateRange,
          filters,
          userId: user.id
        });
      })
    ]);

    // Experimental
    let latestActivities: PublicPortfolioResponse['latestActivities'] = [];

    if (!this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      const { activities } = await this.activitiesService.getActivities({
        filters,
        sortColumn: 'date',
        sortDirection: 'desc',
        take: 10,
        types: [ActivityType.BUY, ActivityType.SELL],
        userCurrency: user?.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY,
        userId: user.id,
        withExcludedAccountsAndActivities: false
      });

      latestActivities = activities.map(
        ({
          assetProfile,
          currency,
          date,
          fee,
          quantity,
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
            type,
            unitPrice,
            value,
            valueInBaseCurrency,
            assetProfile: {
              currency: assetProfile.currency,
              dataSource: assetProfile.dataSource,
              name: assetProfile.name,
              symbol: assetProfile.symbol
            }
          };
        }
      );
    }

    Object.values(markets ?? {}).forEach((market) => {
      delete market.valueInBaseCurrency;
    });

    const publicPortfolioResponse: PublicPortfolioResponse = {
      createdAt,
      hasDetails,
      latestActivities,
      markets,
      alias: access.alias,
      holdings: [],
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
      holdings.map(({ assetProfile, marketPrice, quantity }) => {
        return new Big(
          this.exchangeRateDataService.toCurrency(
            quantity * marketPrice,
            assetProfile.currency,
            user?.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY
          )
        );
      })
    ).toNumber();

    for (const holding of holdings) {
      publicPortfolioResponse.holdings.push({
        allocationInPercentage: holding.valueInBaseCurrency / totalValue,
        assetProfile: {
          ...holding.assetProfile,
          assetClass:
            hasDetails || isCashPosition(holding.assetProfile)
              ? holding.assetProfile.assetClass
              : undefined,
          assetClassLabel:
            hasDetails || isCashPosition(holding.assetProfile)
              ? holding.assetProfile.assetClassLabel
              : undefined,
          assetSubClass:
            hasDetails || isCashPosition(holding.assetProfile)
              ? holding.assetProfile.assetSubClass
              : undefined,
          assetSubClassLabel:
            hasDetails || isCashPosition(holding.assetProfile)
              ? holding.assetProfile.assetSubClassLabel
              : undefined,
          holdings: holding.assetProfile.holdings?.map(
            ({ allocationInPercentage, name }) => {
              return { allocationInPercentage, name };
            }
          ),
          ...(hasDetails
            ? {}
            : {
                countries: [],
                currency: undefined,
                holdings: [],
                sectors: []
              })
        },
        dateOfFirstActivity: holding.dateOfFirstActivity,
        markets: hasDetails ? holding.markets : undefined,
        netPerformancePercentWithCurrencyEffect:
          holding.netPerformancePercentWithCurrencyEffect,
        valueInPercentage: holding.valueInBaseCurrency / totalValue
      });
    }

    return publicPortfolioResponse;
  }
}
