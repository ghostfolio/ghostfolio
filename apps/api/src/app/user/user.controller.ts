import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  AccessTokenResponse,
  User,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
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
import { merge, size } from 'lodash';

import { DeleteOwnUserDto } from './delete-own-user.dto';
import { UserItem } from './interfaces/user-item.interface';
import { UpdateOwnAccessTokenDto } from './update-own-access-token.dto';
import { UpdateUserSettingDto } from './update-user-setting.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    @Inject(REQUEST) private readonly request: RequestWithUser,
    private readonly userService: UserService
  ) {}

  @Delete()
  @HasPermission(permissions.deleteOwnUser)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteOwnUser(
    @Body() data: DeleteOwnUserDto
  ): Promise<UserModel> {
    const user = await this.validateAccessToken(
      data.accessToken,
      this.request.user.id
    );

    return this.userService.deleteUser({
      id: user.id
    });
  }

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

  @HasPermission(permissions.accessAdminControl)
  @Post(':id/access-token')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateUserAccessToken(
    @Param('id') id: string
  ): Promise<AccessTokenResponse> {
    return this.rotateUserAccessToken(id);
  }

  @HasPermission(permissions.updateOwnAccessToken)
  @Post('access-token')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateOwnAccessToken(
    @Body() data: UpdateOwnAccessTokenDto
  ): Promise<AccessTokenResponse> {
    const user = await this.validateAccessToken(
      data.accessToken,
      this.request.user.id
    );

    return this.rotateUserAccessToken(user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getUser(
    @Headers('accept-language') acceptLanguage: string
  ): Promise<User> {
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

    const emitPortfolioChangedEvent = 'baseCurrency' in data;

    const userSettings: UserSettings = merge(
      {},
      this.request.user.Settings.settings as UserSettings,
      data
    );

    for (const key in userSettings) {
      if (userSettings[key] === false || userSettings[key] === null) {
        delete userSettings[key];
      }
    }

    return this.userService.updateUserSetting({
      emitPortfolioChangedEvent,
      userSettings,
      userId: this.request.user.id
    });
  }

  private async rotateUserAccessToken(
    userId: string
  ): Promise<AccessTokenResponse> {
    const { accessToken, hashedAccessToken } =
      this.userService.generateAccessToken({
        userId
      });

    await this.prismaService.user.update({
      data: { accessToken: hashedAccessToken },
      where: { id: userId }
    });

    return { accessToken };
  }

  private async validateAccessToken(
    accessToken: string,
    userId: string
  ): Promise<UserModel> {
    const hashedAccessToken = this.userService.createAccessToken({
      password: accessToken,
      salt: this.configurationService.get('ACCESS_TOKEN_SALT')
    });

    const [user] = await this.userService.users({
      where: { accessToken: hashedAccessToken, id: userId }
    });

    if (!user) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return user;
  }
}
