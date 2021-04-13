import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';

import { CronService } from '../services/cron.service';
import { DataGatheringService } from '../services/data-gathering.service';
import { DataProviderService } from '../services/data-provider.service';
import { AlphaVantageService } from '../services/data-provider/alpha-vantage/alpha-vantage.service';
import { RakutenRapidApiService } from '../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '../services/exchange-rate-data.service';
import { PrismaService } from '../services/prisma.service';
import { AccessModule } from './access/access.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ExperimentalModule } from './experimental/experimental.module';
import { InfoModule } from './info/info.module';
import { OrderModule } from './order/order.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { RedisCacheModule } from './redis-cache/redis-cache.module';
import { SymbolModule } from './symbol/symbol.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AdminModule,
    AccessModule,
    AuthModule,
    CacheModule,
    ConfigModule.forRoot(),
    ExperimentalModule,
    InfoModule,
    OrderModule,
    PortfolioModule,
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
    SymbolModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [
    AlphaVantageService,
    CronService,
    DataGatheringService,
    DataProviderService,
    ExchangeRateDataService,
    PrismaService,
    RakutenRapidApiService,
    YahooFinanceService
  ]
})
export class AppModule {}
