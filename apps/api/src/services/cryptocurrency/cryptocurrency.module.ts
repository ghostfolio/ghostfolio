import { Module } from '@nestjs/common';

import { CryptocurrencyService } from './cryptocurrency.service';

@Module({
  providers: [CryptocurrencyService],
  exports: [CryptocurrencyService]
})
export class CryptocurrencyModule {}
