import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { LogoController } from './logo.controller';
import { LogoService } from './logo.service';

@Module({
  controllers: [LogoController],
  imports: [ConfigurationModule, SymbolProfileModule],
  providers: [LogoService]
})
export class LogoModule {}
