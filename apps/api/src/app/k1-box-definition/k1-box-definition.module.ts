import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { K1BoxDefinitionController } from './k1-box-definition.controller';
import { K1BoxDefinitionService } from './k1-box-definition.service';

@Module({
  controllers: [K1BoxDefinitionController],
  exports: [K1BoxDefinitionService],
  imports: [PrismaModule],
  providers: [K1BoxDefinitionService]
})
export class K1BoxDefinitionModule {}
