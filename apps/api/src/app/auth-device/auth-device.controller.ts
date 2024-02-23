import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';

import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth-device')
export class AuthDeviceController {
  public constructor(private readonly authDeviceService: AuthDeviceService) {}

  @Delete(':id')
  @HasPermission(permissions.deleteAuthDevice)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAuthDevice(@Param('id') id: string): Promise<void> {
    await this.authDeviceService.deleteAuthDevice({ id });
  }
}
