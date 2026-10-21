import { PlatformModule } from '@ghostfolio/api/services/platform/platform.module';

import { Module } from '@nestjs/common';

import { PlatformController } from './platform.controller';
import { PlatformsController } from './platforms.controller';

@Module({
  controllers: [PlatformController, PlatformsController],
  imports: [PlatformModule]
})
export class PlatformsModule {}
