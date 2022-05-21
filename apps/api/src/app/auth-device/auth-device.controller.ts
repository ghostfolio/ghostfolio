import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
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
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

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
        this.request.user.permissions,
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
