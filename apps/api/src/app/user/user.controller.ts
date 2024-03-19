import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { User, UserSettings } from '@ghostfolio/common/interfaces';
import {
  hasPermission,
  hasRole,
  permissions
} from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { User as UserModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { size } from 'lodash';

import { UserItem } from './interfaces/user-item.interface';
import { UpdateUserSettingDto } from './update-user-setting.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  public constructor(
    private readonly jwtService: JwtService,
    private readonly propertyService: PropertyService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete(':id')
  @HasPermission(permissions.deleteUser)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteUser(@Param('id') id: string): Promise<UserModel> {
    if (id === this.request.user.id) {
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUser(
    @Headers('accept-language') acceptLanguage: string
  ): Promise<User> {
    if (hasRole(this.request.user, 'INACTIVE')) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
        StatusCodes.TOO_MANY_REQUESTS
      );
    }

    return this.userService.getUser(
      this.request.user,
      acceptLanguage?.split(',')?.[0]
    );
  }

  @Post()
  public async signupUser(): Promise<UserItem> {
    const isUserSignupEnabled =
      await this.propertyService.isUserSignupEnabled();

    if (!isUserSignupEnabled) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const hasAdmin = await this.userService.hasAdmin();

    const { accessToken, id, role } = await this.userService.createUser({
      data: { role: hasAdmin ? 'USER' : 'ADMIN' }
    });

    return {
      accessToken,
      role,
      authToken: this.jwtService.sign({
        id
      })
    };
  }

  @Put('setting')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateUserSetting(@Body() data: UpdateUserSettingDto) {
    if (
      size(data) === 1 &&
      (data.benchmark || data.dateRange) &&
      this.request.user.role === 'DEMO'
    ) {
      // Allow benchmark or date range change for demo user
    } else if (
      !hasPermission(
        this.request.user.permissions,
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

    for (const key in userSettings) {
      if (userSettings[key] === false || userSettings[key] === null) {
        delete userSettings[key];
      }
    }

    return this.userService.updateUserSetting({
      userSettings,
      userId: this.request.user.id
    });
  }
}
