import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { permissions } from '@ghostfolio/common/permissions';

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Platform } from '@prisma/client';

@Controller('platforms')
export class PlatformsController {
  public constructor(private readonly platformService: PlatformService) {}

  @Get()
  @HasPermission(permissions.readPlatforms)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms(): Promise<Platform[]> {
    return this.platformService.getPlatforms();
  }
}
