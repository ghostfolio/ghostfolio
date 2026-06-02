import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { AssetProfilesController } from './asset-profiles.controller';
import { AssetProfilesService } from './asset-profiles.service';

@Module({
  controllers: [AssetProfilesController],
  imports: [SymbolProfileModule, TransformDataSourceInRequestModule],
  providers: [AssetProfilesService]
})
export class AssetProfilesModule {}
