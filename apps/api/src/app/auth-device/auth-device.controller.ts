import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import { Controller, Delete, Inject, Param, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth-device')
export class AuthDeviceController {
  public constructor(
    private readonly authDeviceService: AuthDeviceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HasPermission(permissions.deleteAuthDevice)
  public async deleteAuthDevice(@Param('id') id: string): Promise<void> {
    await this.authDeviceService.deleteAuthDevice({ id });
  }
}
