import { join } from 'path';

import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { CronService } from '@ghostfolio/api/services/cron.service';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { TwitterBotModule } from '@ghostfolio/api/services/twitter-bot/twitter-bot.module';
import { BullModule } from '@nestjs/bull';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AccessModule } from './access/access.module';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthDeviceModule } from './auth-device/auth-device.module';
import { AuthModule } from './auth/auth.module';
import { BenchmarkModule } from './benchmark/benchmark.module';
import { CacheModule } from './cache/cache.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { ExportModule } from './export/export.module';
import { FrontendMiddleware } from './frontend.middleware';
import { HealthModule } from './health/health.module';
import { ImportModule } from './import/import.module';
import { InfoModule } from './info/info.module';
import { LogoModule } from './logo/logo.module';
import { OrderModule } from './order/order.module';
import { PlatformModule } from './platform/platform.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { SymbolModule } from './symbol/symbol.module';
import { UserModule } from './user/user.module';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';
import { StatusCodes } from 'http-status-codes';

@Module({
  imports: [
    AdminModule,
    AccessModule,
    AccountModule,
    AuthDeviceModule,
    AuthModule,
    BenchmarkModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD
      }
    }),
    CacheModule,
    ConfigModule.forRoot(),
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateModule,
    ExchangeRateDataModule,
    ExportModule,
    HealthModule,
    ImportModule,
    InfoModule,
    LogoModule,
    OrderModule,
    PlatformModule,
    PortfolioModule,
    PrismaModule,
    RedisCacheModule,
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      serveStaticOptions: {
        setHeaders: (res) => {
          if (res.req?.path === '/') {
            let languageCode = DEFAULT_LANGUAGE_CODE;

            try {
              const code = res.req.headers['accept-language']
                .split(',')[0]
                .split('-')[0];

              if (SUPPORTED_LANGUAGE_CODES.includes(code)) {
                languageCode = code;
              }
            } catch {}

            res.set('Location', `/${languageCode}`);
            res.statusCode = StatusCodes.MOVED_PERMANENTLY;
          }
        }
      },
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api*']
    }),
    SubscriptionModule,
    SymbolModule,
    TwitterBotModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [CronService]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FrontendMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
