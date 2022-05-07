import { join } from 'path';

import { AuthDeviceModule } from '@ghostfolio/api/app/auth-device/auth-device.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { CronService } from '@ghostfolio/api/services/cron.service';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { TwitterBotModule } from '@ghostfolio/api/services/twitter-bot/twitter-bot.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AccessModule } from './access/access.module';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { InfoModule } from './info/info.module';
import { OrderModule } from './order/order.module';
import { PortfolioModule } from './portfolio/portfolio.module';
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
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10)
      }
    }),
    CacheModule,
    ConfigModule.forRoot(),
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ExportModule,
    ImportModule,
    InfoModule,
    OrderModule,
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
export class AppModule {}
