import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';

import { Module } from '@nestjs/common';

import { AssetProfilesModule } from '../endpoints/asset-profiles/asset-profiles.module';
import { AssetController } from './asset.controller';

@Module({
  controllers: [AssetController],
  imports: [
    AssetProfilesModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ]
})
export class AssetModule {}
