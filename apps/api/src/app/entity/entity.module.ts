import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';

@Module({
  controllers: [EntityController],
  exports: [EntityService],
  imports: [PrismaModule],
  providers: [EntityService]
})
export class EntityModule {}
