import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { InfoItem } from '@ghostfolio/common/interfaces';
import { Subscription } from '@ghostfolio/common/interfaces/subscription.interface';
import { permissions } from '@ghostfolio/common/permissions';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bent from 'bent';
import { subDays } from 'date-fns';

@Injectable()
export class InfoService {
  private static DEMO_USER_ID = '9b112b4d-3b7d-4bad-9bdd-3b0f7b4dac2f';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService
  ) {}

  public async get(): Promise<InfoItem> {
    const info: Partial<InfoItem> = {};
    const platforms = await this.prismaService.platform.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });

    const globalPermissions: string[] = [];

    if (this.configurationService.get('ENABLE_FEATURE_BLOG')) {
      globalPermissions.push(permissions.enableBlog);
    }

    if (this.configurationService.get('ENABLE_FEATURE_IMPORT')) {
      globalPermissions.push(permissions.enableImport);
    }

    if (this.configurationService.get('ENABLE_FEATURE_SOCIAL_LOGIN')) {
      globalPermissions.push(permissions.enableSocialLogin);
    }

    if (this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      globalPermissions.push(permissions.enableStatistics);
    }

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      globalPermissions.push(permissions.enableSubscription);

      info.stripePublicKey = this.configurationService.get('STRIPE_PUBLIC_KEY');
    }

    return {
      ...info,
      globalPermissions,
      platforms,
      currencies: this.exchangeRateDataService.getCurrencies(),
      demoAuthToken: this.getDemoAuthToken(),
      lastDataGathering: await this.getLastDataGathering(),
      statistics: await this.getStatistics(),
      subscriptions: await this.getSubscriptions()
    };
  }

  private async countActiveUsers(aDays: number) {
    return await this.prismaService.user.count({
      orderBy: {
        Analytics: {
          updatedAt: 'desc'
        }
      },
      where: {
        AND: [
          {
            NOT: {
              Analytics: null
            }
          },
          {
            Analytics: {
              updatedAt: {
                gt: subDays(new Date(), aDays)
              }
            }
          }
        ]
      }
    });
  }

  private async countGitHubContributors(): Promise<number> {
    try {
      const get = bent(
        `https://api.github.com/repos/ghostfolio/ghostfolio/contributors`,
        'GET',
        'json',
        200,
        {
          'User-Agent': 'request'
        }
      );

      const contributors = await get();
      return contributors?.length;
    } catch (error) {
      console.error(error);

      return undefined;
    }
  }

  private async countGitHubStargazers(): Promise<number> {
    try {
      const get = bent(
        `https://api.github.com/repos/ghostfolio/ghostfolio`,
        'GET',
        'json',
        200,
        {
          'User-Agent': 'request'
        }
      );

      const { stargazers_count } = await get();
      return stargazers_count;
    } catch (error) {
      console.error(error);

      return undefined;
    }
  }

  private getDemoAuthToken() {
    return this.jwtService.sign({
      id: InfoService.DEMO_USER_ID
    });
  }

  private async getLastDataGathering() {
    const lastDataGathering =
      await this.dataGatheringService.getLastDataGathering();

    return lastDataGathering ?? null;
  }

  private async getStatistics() {
    if (!this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      return undefined;
    }

    const activeUsers1d = await this.countActiveUsers(1);
    const activeUsers30d = await this.countActiveUsers(30);
    const gitHubContributors = await this.countGitHubContributors();
    const gitHubStargazers = await this.countGitHubStargazers();

    return {
      activeUsers1d,
      activeUsers30d,
      gitHubContributors,
      gitHubStargazers
    };
  }

  private async getSubscriptions(): Promise<Subscription[]> {
    if (!this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      return undefined;
    }

    const stripeConfig = await this.prismaService.property.findUnique({
      where: { key: 'STRIPE_CONFIG' }
    });

    if (stripeConfig) {
      return [JSON.parse(stripeConfig.value)];
    }

    return [];
  }
}
