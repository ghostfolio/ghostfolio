import { PlatformModule } from '@ghostfolio/api/app/platform/platform.module';

import { Module } from '@nestjs/common';

import { PlatformsController } from './platforms.controller';

@Module({
  controllers: [PlatformsController],
  imports: [PlatformModule]
})
export class PlatformsModule {}
