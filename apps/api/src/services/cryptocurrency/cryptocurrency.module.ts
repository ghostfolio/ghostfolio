import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { CryptocurrencyService } from './cryptocurrency.service';

@Module({
  exports: [CryptocurrencyService],
  imports: [PropertyModule],
  providers: [CryptocurrencyService]
})
export class CryptocurrencyModule {}
