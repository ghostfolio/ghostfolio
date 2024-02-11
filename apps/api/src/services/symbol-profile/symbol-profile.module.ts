import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { SymbolProfileService } from './symbol-profile.service';

@Module({
  imports: [PrismaModule],
  providers: [SymbolProfileService],
  exports: [SymbolProfileService]
})
export class SymbolProfileModule {}
