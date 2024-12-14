import { AdminModule } from '@ghostfolio/api/app/admin/admin.module';
import { MarketDataModule as MarketDataServiceModule } from '@ghostfolio/api/services/market-data/market-data.module';

import { Module } from '@nestjs/common';

import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  imports: [AdminModule, MarketDataServiceModule]
})
export class MarketDataModule {}
