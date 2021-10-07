import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InfoController } from './info.controller';
import { InfoService } from './info.service';

@Module({
  imports: [
    DataProviderModule,
    ExchangeRateDataModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30 days' }
    })
  ],
  controllers: [InfoController],
  providers: [
    ConfigurationService,
    DataGatheringService,
    InfoService,
    PrismaService
  ]
})
export class InfoModule {}
