import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PlatformsResponse } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';

import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('platforms')
export class PlatformsController {
  public constructor(private readonly platformService: PlatformService) {}

  @Get()
  @HasPermission(permissions.readPlatforms)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms(): Promise<PlatformsResponse> {
    const platforms = await this.platformService.getPlatforms({
      orderBy: { name: 'asc' }
    });

    return { platforms };
  }
}
