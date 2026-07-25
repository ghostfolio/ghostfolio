import { EventsModule } from '@ghostfolio/api/events/events.module';
import { getRedisConnectionOptions } from '@ghostfolio/api/helper/redis.helper';
import { BullBoardAuthMiddleware } from '@ghostfolio/api/middlewares/bull-board-auth.middleware';
import { HtmlTemplateMiddleware } from '@ghostfolio/api/middlewares/html-template.middleware';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CronModule } from '@ghostfolio/api/services/cron/cron.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';
import {
  BULL_BOARD_ROUTE,
  THROTTLE_DEFAULT_LIMIT,
  THROTTLE_DEFAULT_TTL
} from '@ghostfolio/common/config';

import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { join } from 'node:path';

import { AccessModule } from './access/access.module';
import { AccountModule } from './account/account.module';
import { ActivitiesModule } from './activities/activities.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AssetModule } from './asset/asset.module';
import { AuthDeviceModule } from './auth-device/auth-device.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './endpoints/ai/ai.module';
import { ApiKeysModule } from './endpoints/api-keys/api-keys.module';
import { AssetProfilesModule } from './endpoints/asset-profiles/asset-profiles.module';
import { AssetsModule } from './endpoints/assets/assets.module';
import { BenchmarksModule } from './endpoints/benchmarks/benchmarks.module';
import { GhostfolioModule } from './endpoints/data-providers/ghostfolio/ghostfolio.module';
import { MarketDataModule } from './endpoints/market-data/market-data.module';
import { PlatformsModule } from './endpoints/platforms/platforms.module';
import { PublicModule } from './endpoints/public/public.module';
import { SitemapModule } from './endpoints/sitemap/sitemap.module';
import { TagsModule } from './endpoints/tags/tags.module';
import { WatchlistModule } from './endpoints/watchlist/watchlist.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { ExportModule } from './export/export.module';
import { HealthModule } from './health/health.module';
import { ImportModule } from './import/import.module';
import { InfoModule } from './info/info.module';
import { LogoModule } from './logo/logo.module';
import { PlatformModule } from './platform/platform.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SymbolModule } from './symbol/symbol.module';
import { UserModule } from './user/user.module';

@Module({
  controllers: [AppController],
  imports: [
    AdminModule,
    AccessModule,
    AccountModule,
    ActivitiesModule,
    AiModule,
    ApiKeysModule,
    AssetProfilesModule,
    AssetModule,
    AssetsModule,
    AuthDeviceModule,
    AuthModule,
    BenchmarksModule,
    BullBoardModule.forRoot({
      adapter: ExpressAdapter,
      boardOptions: {
        uiConfig: {
          boardLogo: {
            height: 0,
            path: '',
            width: 0
          },
          boardTitle: 'Job Queues',
          favIcon: {
            alternative: '/assets/favicon-32x32.png',
            default: '/assets/favicon-32x32.png'
          }
        }
      },
      middleware: BullBoardAuthMiddleware,
      route: BULL_BOARD_ROUTE
    }),
    BullModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (configurationService: ConfigurationService) => {
        return {
          redis: getRedisConnectionOptions(configurationService)
        };
      }
    }),
    CacheModule,
    ConfigModule.forRoot(),
    ConfigurationModule,
    CronModule,
    DataGatheringQueueModule,
    DataProviderModule,
    EventEmitterModule.forRoot(),
    EventsModule,
    ExchangeRateModule,
    ExchangeRateDataModule,
    ExportModule,
    GhostfolioModule,
    HealthModule,
    ImportModule,
    InfoModule,
    LogoModule,
    MarketDataModule,
    PlatformModule,
    PlatformsModule,
    PortfolioModule,
    PortfolioSnapshotQueueModule,
    PrismaModule,
    PropertyModule,
    PublicModule,
    RedisCacheModule,
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      exclude: [
        `${BULL_BOARD_ROUTE}/*wildcard`,
        '/.well-known/*wildcard',
        '/api/*wildcard',
        '/sitemap.xml'
      ],
      rootPath: join(__dirname, '..', 'client')
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client', '.well-known'),
      serveRoot: '/.well-known'
    }),
    SitemapModule,
    SubscriptionModule,
    SymbolModule,
    TagsModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (configurationService: ConfigurationService) => {
        const isRateLimitingEnabled = configurationService.get(
          'ENABLE_FEATURE_RATE_LIMITING'
        );

        return {
          errorMessage: getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
          skipIf: () => {
            return !isRateLimitingEnabled;
          },
          storage: isRateLimitingEnabled
            ? new ThrottlerStorageRedisService({
                ...getRedisConnectionOptions(configurationService),
                // Reject commands immediately while Redis is unavailable
                enableOfflineQueue: false,
                maxRetriesPerRequest: 1
              })
            : undefined,
          throttlers: [
            {
              limit: THROTTLE_DEFAULT_LIMIT,
              ttl: THROTTLE_DEFAULT_TTL
            }
          ]
        };
      }
    }),
    UserModule,
    WatchlistModule
  ],
  providers: [I18nService]
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer.apply(HtmlTemplateMiddleware).forRoutes('*wildcard');
  }
}
