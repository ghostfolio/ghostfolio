import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { TagModule } from '@ghostfolio/api/services/tag/tag.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InfoController } from './info.controller';
import { InfoService } from './info.service';

@Module({
  controllers: [InfoController],
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    }),
    PrismaModule,
    PropertyModule,
    RedisCacheModule,
    SymbolProfileModule,
    TagModule
  ],
  providers: [InfoService]
})
export class InfoModule {}
