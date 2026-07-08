import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import { SubscriptionType } from '@ghostfolio/common/enums';
import {
  Access,
  AccessSettings,
  CreateAccessResponse
} from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
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
import { AuthGuard } from '@nestjs/passport';
import {
  AccessPermission,
  AccessType,
  Access as AccessModel
} from '@prisma/client';
import { endOfDay, isBefore, parseISO } from 'date-fns';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { omit } from 'lodash';

import { AccessService } from './access.service';

@Controller('access')
export class AccessController {
  public constructor(
    private readonly accessService: AccessService,
    private readonly configurationService: ConfigurationService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getAllAccesses(): Promise<Access[]> {
    const accessesWithGranteeUser = await this.accessService.accesses({
      include: {
        granteeUser: true
      },
      orderBy: [{ granteeUserId: 'desc' }, { createdAt: 'asc' }],
      where: { userId: this.request.user.id }
    });

    return accessesWithGranteeUser.map(
      ({ alias, expiresAt, granteeUser, id, permissions, settings, type }) => {
        if (type === AccessType.API) {
          return {
            alias,
            id,
            permissions,
            type,
            expiresAt: expiresAt ?? undefined,
            settings: settings as AccessSettings
          };
        }

        if (granteeUser) {
          return {
            alias,
            id,
            permissions,
            type,
            grantee: granteeUser?.id,
            settings: settings as AccessSettings
          };
        }

        return {
          alias,
          id,
          permissions,
          type,
          grantee: 'Public',
          settings: settings as AccessSettings
        };
      }
    );
  }

  @HasPermission(permissions.createAccess)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccess(
    @Body() data: CreateAccessDto
  ): Promise<CreateAccessResponse> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === SubscriptionType.Basic
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const type =
      data.type ??
      (data.granteeUserId ? AccessType.PRIVATE : AccessType.PUBLIC);
    const isApiAccess = type === AccessType.API;

    const expiresAt = data.expiresAt
      ? endOfDay(parseISO(data.expiresAt))
      : undefined;

    if (
      (type === AccessType.PRIVATE && !data.granteeUserId) ||
      (type !== AccessType.PRIVATE && data.granteeUserId) ||
      (!isApiAccess && expiresAt) ||
      (expiresAt && isBefore(expiresAt, new Date()))
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      const { apiToken, hashedApiToken } = isApiAccess
        ? this.accessService.createApiToken()
        : { apiToken: undefined, hashedApiToken: undefined };

      const access = await this.accessService.createAccess({
        expiresAt,
        hashedApiToken,
        type,
        alias: data.alias || undefined,
        granteeUser: data.granteeUserId
          ? { connect: { id: data.granteeUserId } }
          : undefined,
        permissions: isApiAccess ? [AccessPermission.READ] : data.permissions,
        settings: this.accessService.buildSettings(data.filters),
        user: { connect: { id: this.request.user.id } }
      });

      return {
        ...omit(access, 'hashedApiToken'),
        apiToken
      };
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  @HasPermission(permissions.deleteAccess)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteAccess(
    @Param('id') id: string
  ): Promise<Omit<AccessModel, 'hashedApiToken'>> {
    const originalAccess = await this.accessService.access({
      id,
      userId: this.request.user.id
    });

    if (!originalAccess) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const access = await this.accessService.deleteAccess({
      id
    });

    return omit(access, 'hashedApiToken');
  }

  @HasPermission(permissions.updateAccess)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateAccess(
    @Body() data: UpdateAccessDto,
    @Param('id') id: string
  ): Promise<Omit<AccessModel, 'hashedApiToken'>> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription.type === SubscriptionType.Basic
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const originalAccess = await this.accessService.access({
      id,
      userId: this.request.user.id
    });

    if (!originalAccess) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const isApiAccess = originalAccess.type === AccessType.API;

    if (
      (originalAccess.type === AccessType.PRIVATE && !data.granteeUserId) ||
      (originalAccess.type !== AccessType.PRIVATE && data.granteeUserId)
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      const access = await this.accessService.updateAccess({
        data: {
          alias: data.alias,
          granteeUser: data.granteeUserId
            ? { connect: { id: data.granteeUserId } }
            : undefined,
          permissions: isApiAccess ? undefined : data.permissions,
          settings: data.filters
            ? this.accessService.buildSettings(data.filters)
            : undefined
        },
        where: { id }
      });

      return omit(access, 'hashedApiToken');
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
