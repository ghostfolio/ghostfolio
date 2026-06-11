import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { AssetProfilesController } from './asset-profiles.controller';
import { AssetProfilesService } from './asset-profiles.service';

@Module({
  controllers: [AssetProfilesController],
  imports: [SymbolProfileModule],
  providers: [AssetProfilesService]
})
export class AssetProfilesModule {}
