import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { SubscriptionService } from '@ghostfolio/api/app/subscription/subscription.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  PROPERTY_COUNTRIES_OF_SUBSCRIBERS,
  PROPERTY_DEMO_USER_ID,
  PROPERTY_DOCKER_HUB_PULLS,
  PROPERTY_GITHUB_CONTRIBUTORS,
  PROPERTY_GITHUB_STARGAZERS,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_SLACK_COMMUNITY_USERS,
  PROPERTY_UPTIME,
  ghostfolioFearAndGreedIndexDataSourceStocks
} from '@ghostfolio/common/config';
import { encodeDataSource } from '@ghostfolio/common/helper';
import { InfoItem, Statistics } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { subDays } from 'date-fns';

@Injectable()
export class InfoService {
  private static CACHE_KEY_STATISTICS = 'STATISTICS';

  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly jwtService: JwtService,
    private readonly propertyService: PropertyService,
    private readonly redisCacheService: RedisCacheService,
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService
  ) {}

  public async get(): Promise<InfoItem> {
    const info: Partial<InfoItem> = {};
    let isReadOnlyMode: boolean;

    const globalPermissions: string[] = [];

    if (this.configurationService.get('ENABLE_FEATURE_AUTH_GOOGLE')) {
      globalPermissions.push(permissions.enableAuthGoogle);
    }

    if (this.configurationService.get('ENABLE_FEATURE_AUTH_OIDC')) {
      globalPermissions.push(permissions.enableAuthOidc);
    }

    if (this.configurationService.get('ENABLE_FEATURE_AUTH_TOKEN')) {
      globalPermissions.push(permissions.enableAuthToken);
    }

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
        info.fearAndGreedDataSource = encodeDataSource(
          ghostfolioFearAndGreedIndexDataSourceStocks
        );
      } else {
        info.fearAndGreedDataSource =
          ghostfolioFearAndGreedIndexDataSourceStocks;
      }

      globalPermissions.push(permissions.enableFearAndGreedIndex);
    }

    if (this.configurationService.get('ENABLE_FEATURE_READ_ONLY_MODE')) {
      isReadOnlyMode = await this.propertyService.getByKey<boolean>(
        PROPERTY_IS_READ_ONLY_MODE
      );
    }

    if (this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      globalPermissions.push(permissions.enableStatistics);
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      globalPermissions.push(permissions.enableSubscription);

      info.countriesOfSubscribers =
        (await this.propertyService.getByKey<string[]>(
          PROPERTY_COUNTRIES_OF_SUBSCRIBERS
        )) ?? [];
    }

    if (this.configurationService.get('ENABLE_FEATURE_SYSTEM_MESSAGE')) {
      globalPermissions.push(permissions.enableSystemMessage);
    }

    const [
      benchmarks,
      demoAuthToken,
      isUserSignupEnabled,
      statistics,
      subscriptionOffer
    ] = await Promise.all([
      this.benchmarkService.getBenchmarkAssetProfiles(),
      this.getDemoAuthToken(),
      this.propertyService.isUserSignupEnabled(),
      this.getStatistics(),
      this.subscriptionService.getSubscriptionOffer({ key: 'default' })
    ]);

    if (isUserSignupEnabled) {
      globalPermissions.push(permissions.createUserAccount);
    }

    return {
      ...info,
      benchmarks,
      demoAuthToken,
      globalPermissions,
      isReadOnlyMode,
      statistics,
      subscriptionOffer,
      baseCurrency: DEFAULT_CURRENCY,
      currencies: this.exchangeRateDataService.getCurrencies()
    };
  }

  private async countActiveUsers(aDays: number) {
    return this.userService.count({
      where: {
        AND: [
          {
            NOT: {
              analytics: null
            }
          },
          {
            analytics: {
              lastRequestAt: {
                gt: subDays(new Date(), aDays)
              }
            }
          }
        ]
      }
    });
  }

  private async countNewUsers(aDays: number) {
    return this.userService.count({
      where: {
        AND: [
          {
            NOT: {
              analytics: null
            }
          },
          {
            createdAt: {
              gt: subDays(new Date(), aDays)
            }
          }
        ]
      }
    });
  }

  private async getDemoAuthToken() {
    const demoUserId = await this.propertyService.getByKey<string>(
      PROPERTY_DEMO_USER_ID
    );

    if (demoUserId) {
      return this.jwtService.sign({
        id: demoUserId
      });
    }

    return undefined;
  }

  private async getStatistics() {
    if (!this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      return undefined;
    }

    let statistics: Statistics;

    try {
      statistics = JSON.parse(
        await this.redisCacheService.get(InfoService.CACHE_KEY_STATISTICS)
      );

      if (statistics) {
        return statistics;
      }
    } catch {}

    const [
      activeUsers1d,
      activeUsers30d,
      newUsers30d,
      dockerHubPulls,
      gitHubContributors,
      gitHubStargazers,
      slackCommunityUsers,
      uptime
    ] = await Promise.all([
      this.countActiveUsers(1),
      this.countActiveUsers(30),
      this.countNewUsers(30),
      this.propertyService.getByKey<string>(PROPERTY_DOCKER_HUB_PULLS),
      this.propertyService.getByKey<string>(PROPERTY_GITHUB_CONTRIBUTORS),
      this.propertyService.getByKey<string>(PROPERTY_GITHUB_STARGAZERS),
      this.propertyService.getByKey<string>(PROPERTY_SLACK_COMMUNITY_USERS),
      this.propertyService.getByKey<string>(PROPERTY_UPTIME)
    ]);

    statistics = {
      activeUsers1d,
      activeUsers30d,
      newUsers30d,
      dockerHubPulls: dockerHubPulls
        ? Number.parseInt(dockerHubPulls, 10)
        : undefined,
      gitHubContributors: gitHubContributors
        ? Number.parseInt(gitHubContributors, 10)
        : undefined,
      gitHubStargazers: gitHubStargazers
        ? Number.parseInt(gitHubStargazers, 10)
        : undefined,
      slackCommunityUsers: slackCommunityUsers
        ? Number.parseInt(slackCommunityUsers, 10)
        : undefined,
      uptime: uptime ? Number.parseFloat(uptime) : undefined
    };

    await this.redisCacheService.set(
      InfoService.CACHE_KEY_STATISTICS,
      JSON.stringify(statistics)
    );

    return statistics;
  }
}
