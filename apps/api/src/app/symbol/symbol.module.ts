import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { SymbolController } from './symbol.controller';
import { SymbolService } from './symbol.service';

@Module({
  imports: [ConfigurationModule, DataProviderModule, PrismaModule],
  controllers: [SymbolController],
  providers: [SymbolService]
})
export class SymbolModule {}
