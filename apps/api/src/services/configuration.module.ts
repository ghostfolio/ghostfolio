import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [ConfigurationService],
  exports: [ConfigurationService]
})
export class ConfigurationModule {}
