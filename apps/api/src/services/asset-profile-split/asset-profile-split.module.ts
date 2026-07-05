import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { AssetProfileSplitService } from './asset-profile-split.service';

@Module({
  exports: [AssetProfileSplitService],
  imports: [PrismaModule],
  providers: [AssetProfileSplitService]
})
export class AssetProfileSplitModule {}
