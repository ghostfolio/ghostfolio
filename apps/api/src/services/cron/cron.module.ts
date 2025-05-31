import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { DataGatheringModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { TwitterBotModule } from '@ghostfolio/api/services/twitter-bot/twitter-bot.module';

import { Module } from '@nestjs/common';

import { CronService } from './cron.service';

@Module({
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    ExchangeRateDataModule,
    PropertyModule,
    TwitterBotModule,
    UserModule
  ],
  providers: [CronService]
})
export class CronModule {}
