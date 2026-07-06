import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { getSum } from '@ghostfolio/common/helper';
import {
  AccessSettings,
  PublicPortfolioResponse
} from '@ghostfolio/common/interfaces';

import {
  Controller,
  Get,
  HttpException,
  Param,
  UseInterceptors
} from '@nestjs/common';
import { AccessType, AssetClass, AssetSubClass } from '@prisma/client';
import { Big } from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Controller('public')
export class PublicController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioService: PortfolioService,
    private readonly userService: UserService
  ) {}

  @Get(':accessId/portfolio')
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getPublicPortfolio(
    @Param('accessId') accessId: string
  ): Promise<PublicPortfolioResponse> {
    const access = await this.accessService.access({
      granteeUserId: null,
      id: accessId,
      type: AccessType.PUBLIC
    });

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
      hasDetails = user.subscription.type === SubscriptionType.Premium;
    }

    const { filters } = (access.settings ?? {}) as AccessSettings;

    const { createdAt, holdings, latestActivities, markets, performance } =
      await this.portfolioService.getPortfolioOverview({
        filters,
        impersonationId: access.userId,
        userCurrency: user.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY,
        userId: user.id
      });

    Object.values(markets ?? {}).forEach((market) => {
      delete market.valueInBaseCurrency;
    });

    const publicPortfolioResponse: PublicPortfolioResponse = {
      createdAt,
      hasDetails,
      markets,
      performance,
      alias: access.alias,
      holdings: {},
      // Experimental
      latestActivities: this.configurationService.get(
        'ENABLE_FEATURE_SUBSCRIPTION'
      )
        ? []
        : latestActivities
    };

    const totalValue = getSum(
      Object.values(holdings).map(({ assetProfile, marketPrice, quantity }) => {
        return new Big(
          this.exchangeRateDataService.toCurrency(
            quantity * marketPrice,
            assetProfile.currency,
            user.settings?.settings.baseCurrency ?? DEFAULT_CURRENCY
          )
        );
      })
    ).toNumber();

    for (const [symbol, portfolioPosition] of Object.entries(holdings)) {
      publicPortfolioResponse.holdings[symbol] = {
        allocationInPercentage:
          portfolioPosition.valueInBaseCurrency / totalValue,
        assetProfile: {
          ...portfolioPosition.assetProfile,
          assetClass:
            hasDetails ||
            portfolioPosition.assetProfile.assetClass === AssetClass.LIQUIDITY
              ? portfolioPosition.assetProfile.assetClass
              : undefined,
          assetClassLabel:
            hasDetails ||
            portfolioPosition.assetProfile.assetClass === AssetClass.LIQUIDITY
              ? portfolioPosition.assetProfile.assetClassLabel
              : undefined,
          assetSubClass:
            hasDetails ||
            portfolioPosition.assetProfile.assetSubClass === AssetSubClass.CASH
              ? portfolioPosition.assetProfile.assetSubClass
              : undefined,
          assetSubClassLabel:
            hasDetails ||
            portfolioPosition.assetProfile.assetSubClass === AssetSubClass.CASH
              ? portfolioPosition.assetProfile.assetSubClassLabel
              : undefined,
          holdings: portfolioPosition.assetProfile.holdings?.map(
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
        dateOfFirstActivity: portfolioPosition.dateOfFirstActivity,
        markets: hasDetails ? portfolioPosition.markets : undefined,
        netPerformancePercentWithCurrencyEffect:
          portfolioPosition.netPerformancePercentWithCurrencyEffect,
        valueInPercentage: portfolioPosition.valueInBaseCurrency / totalValue
      };
    }

    return publicPortfolioResponse;
  }
}
