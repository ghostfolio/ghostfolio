import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { AssetProfilesController } from './asset-profiles.controller';
import { AssetProfilesService } from './asset-profiles.service';

@Module({
  controllers: [AssetProfilesController],
  imports: [
    ActivitiesModule,
    ApiModule,
    BenchmarkModule,
    ExchangeRateDataModule,
    PrismaModule,
    SymbolProfileModule
  ],
  providers: [AssetProfilesService]
})
export class AssetProfilesModule {}
