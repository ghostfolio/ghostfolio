import { BenchmarkModule } from '@ghostfolio/api/app/benchmark/benchmark.module';
import { PlatformModule } from '@ghostfolio/api/app/platform/platform.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { CurrencyModule } from '@ghostfolio/api/services/currency/currency.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { DataGatheringModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InfoController } from './info.controller';
import { InfoService } from './info.service';

@Module({
  controllers: [InfoController],
  imports: [
    BenchmarkModule,
    ConfigurationModule,
    CurrencyModule,
    DataGatheringModule,
    DataProviderModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    PlatformModule,
    PropertyModule,
    RedisCacheModule,
    SymbolProfileModule,
    TransformDataSourceInResponseModule,
    UserModule
  ],
  providers: [InfoService]
})
export class InfoModule {}
