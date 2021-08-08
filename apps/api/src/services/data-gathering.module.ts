import { Module } from '@nestjs/common';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [ConfigurationModule, DataProviderModule, PrismaModule],
  providers: [DataGatheringService],
  exports: [DataGatheringService]
})
export class DataGatheringModule {}
