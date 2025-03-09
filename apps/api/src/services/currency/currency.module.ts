import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { CurrencyService } from '@ghostfolio/api/services/currency/currency.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

@Module({
  exports: [CurrencyService],
  imports: [ConfigurationModule, PrismaModule, PropertyModule],
  providers: [CurrencyService]
})
export class CurrencyModule {}
