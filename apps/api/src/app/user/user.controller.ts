import { User } from '@ghostfolio/common/interfaces';
import {
  getPermissions,
  hasPermission,
  permissions
} from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { User as UserModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { UserItem } from './interfaces/user-item.interface';
import { UserSettingsParams } from './interfaces/user-settings-params.interface';
import { UserSettings } from './interfaces/user-settings.interface';
import { UpdateUserSettingDto } from './update-user-setting.dto';
import { UpdateUserSettingsDto } from './update-user-settings.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  public constructor(
    private jwtService: JwtService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  public async deleteUser(@Param('id') id: string): Promise<UserModel> {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.deleteUser
      ) ||
      id === this.request.user.id
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.userService.deleteUser({
      id
    });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  public async getUser(@Param('id') id: string): Promise<User> {
    return this.userService.getUser(this.request.user);
  }

  @Post()
  public async signupUser(): Promise<UserItem> {
    const { accessToken, id } = await this.userService.createUser({
      provider: Provider.ANONYMOUS
    });

    return {
      accessToken,
      authToken: this.jwtService.sign({
        id
      })
    };
  }

  @Put('setting')
  @UseGuards(AuthGuard('jwt'))
  public async updateUserSetting(@Body() data: UpdateUserSettingDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateUserSettings
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const userSettings: UserSettings = {
      ...(<UserSettings>this.request.user.Settings.settings),
      ...data
    };

    return await this.userService.updateUserSetting({
      userSettings,
      userId: this.request.user.id
    });
  }

  @Put('settings')
  @UseGuards(AuthGuard('jwt'))
  public async updateUserSettings(@Body() data: UpdateUserSettingsDto) {
    if (
      !hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateUserSettings
      )
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const userSettings: UserSettingsParams = {
      currency: data.baseCurrency,
      userId: this.request.user.id
    };

    if (
      hasPermission(
        getPermissions(this.request.user.role),
        permissions.updateViewMode
      )
    ) {
      userSettings.viewMode = data.viewMode;
    }

    return await this.userService.updateUserSettings(userSettings);
  }
}
