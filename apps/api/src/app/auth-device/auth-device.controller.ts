import { Body, Controller, Delete, Get, HttpException, Inject, Param, Put, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { AuthDeviceService } from '@ghostfolio/api/app/auth-device/auth-device.service';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { RequestWithUser } from '@ghostfolio/common/types';
import { getPermissions, hasPermission, permissions } from '@ghostfolio/common/permissions';

@Controller('auth-device')
export class AuthDeviceController {
  public constructor(
    private readonly authDeviceService: AuthDeviceService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {
  }

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

    await this.authDeviceService.deleteAuthDevice(
      {
        id_userId: {
          id,
          userId: this.request.user.id
        }
      }
    );
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  public async updateAuthDevice(@Param('id') id: string, @Body() data: AuthDeviceDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateAuthDevice
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const originalAuthDevice = await this.authDeviceService.authDevice({
      id_userId: {
        id,
        userId: this.request.user.id
      }
    });

    if (!originalAuthDevice) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.authDeviceService.updateAuthDevice(
      {
        data: {
          name: data.name
        },
        where: {
          id_userId: {
            id,
            userId: this.request.user.id
          }
        }
      }
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getAllAuthDevices(): Promise<AuthDeviceDto[]> {
    const authDevices = await this.authDeviceService.authDevices({
      orderBy: { createdAt: 'desc' },
      where: { userId: this.request.user.id }
    });

    return authDevices.map(authDevice => ({
      createdAt: authDevice.createdAt.toISOString(),
      id: authDevice.id,
      name: authDevice.name
    }));
  }
}
