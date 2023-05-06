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
        /*etag: false // Disable etag header to fix PWA
        setHeaders: (res, path) => {
          if (path.includes('ngsw.json')) {
            // Disable cache (https://stackoverflow.com/questions/22632593/how-to-disable-webpage-caching-in-expressjs-nodejs/39775595)
            // https://gertjans.home.xs4all.nl/javascript/cache-control.html#no-cache
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        }*/
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
