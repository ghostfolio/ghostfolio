import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Controller,
  Delete,
  HttpException,
  Inject,
  Param,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

@Controller('auth-device')
export class AuthDeviceController {
  public constructor(
    private readonly authDeviceService: AuthDeviceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @HasPermission(permissions.deleteAuthDevice)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAuthDevice(@Param('id') id: string): Promise<void> {
    const originalAuthDevice = await this.authDeviceService.authDevice({
      id,
      userId: this.request.user.id
    });

    if (!originalAuthDevice) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.authDeviceService.deleteAuthDevice({ id });
  }
}
