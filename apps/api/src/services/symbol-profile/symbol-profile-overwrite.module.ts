import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { SymbolProfileOverwriteService } from './symbol-profile-overwrite.service';

@Module({
  imports: [PrismaModule],
  providers: [SymbolProfileOverwriteService],
  exports: [SymbolProfileOverwriteService]
})
export class SymbolProfileOverwriteModule {}
