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
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { RequestWithUser } from '@ghostfolio/common/types';
import {
  getPermissions,
  hasPermission,
  permissions
} from '@ghostfolio/common/permissions';

@Controller('auth-device')
export class AuthDeviceController {
  public constructor(
    private readonly authDeviceService: AuthDeviceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteAuthDevice(@Param('id') id: string): Promise<void> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.deleteAuthDevice
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.authDeviceService.deleteAuthDevice({ id });
  }
}
