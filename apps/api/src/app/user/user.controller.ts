import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { CustomThrottlerGuard } from '@ghostfolio/api/guards/custom-throttler.guard';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ImpersonationGuard } from '@ghostfolio/api/guards/impersonation.guard';
import { decodeDataSource } from '@ghostfolio/api/helper/data-source.helper';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { TransformDataSourceInResponseInterceptor } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  THROTTLE_SIGNUP_LIMIT,
  THROTTLE_SIGNUP_TTL
} from '@ghostfolio/common/config';
import {
  DeleteOwnUserDto,
  UpdateOwnAccessTokenDto,
  UpdateUserSettingDto
} from '@ghostfolio/common/dtos';
import { isUserSettingOfAuthenticatedUser } from '@ghostfolio/common/helper';
import {
  AccessTokenResponse,
  User,
  UserItem,
  UserSettings
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

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
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { User as UserModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { merge, size } from 'lodash';

import { UserService } from './user.service';

@AllowDuringImpersonation()
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
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async getUser(
    @Headers('accept-language') acceptLanguage: string,
    @Impersonation() { isActive, userId }: ImpersonationContext
  ): Promise<User> {
    return this.userService.getUser({
      impersonationUserId: isActive ? userId : undefined,
      locale: acceptLanguage?.split(',')?.[0],
      user: this.request.user
    });
  }

  @Post()
  @Throttle({
    default: {
      limit: THROTTLE_SIGNUP_LIMIT,
      ttl: THROTTLE_SIGNUP_TTL
    }
  })
  @UseGuards(CustomThrottlerGuard)
  public async signupUser(): Promise<UserItem> {
    const isUserSignupEnabled =
      await this.propertyService.isUserSignupEnabled();

    if (!isUserSignupEnabled) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const { accessToken, id, role } = await this.userService.createUser();

    return {
      accessToken,
      role,
      authToken: this.jwtService.sign({
        id
      })
    };
  }

  @Put('setting')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard, ImpersonationGuard)
  @UseInterceptors(TransformDataSourceInResponseInterceptor)
  public async updateUserSetting(
    @Body() data: UpdateUserSettingDto,
    @Impersonation() { isActive }: ImpersonationContext
  ) {
    if (
      isActive &&
      Object.keys(data).some((key) => {
        return !isUserSettingOfAuthenticatedUser(key);
      })
    ) {
      // While impersonating, the presented settings of the impersonated user
      // must not be written back to the authenticated user
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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
      this.request.user.settings.settings as UserSettings,
      data
    );

    if (userSettings['filters.dataSource']) {
      userSettings['filters.dataSource'] = decodeDataSource(
        userSettings['filters.dataSource']
      );
    }

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
