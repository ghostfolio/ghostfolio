import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CreateAccessDto, UpdateAccessDto } from '@ghostfolio/common/dtos';
import { SubscriptionType } from '@ghostfolio/common/enums';
import {
  canApplyFiltersToAccess,
  isValidGranteeOfAccess
} from '@ghostfolio/common/helper';
import { Access, AccessSettings } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { getScopesOfAccess } from '@ghostfolio/common/scopes';
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
import { Access as AccessModel } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { AccessService } from './access.service';

@AllowDuringImpersonation()
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

    return accessesWithGranteeUser.map((accessItem) => {
      const { alias, expiresAt, granteeUser, id, lastUsedAt, settings, type } =
        accessItem;

      const { filters } = (settings ?? {}) as AccessSettings;

      return {
        alias,
        expiresAt,
        id,
        lastUsedAt,
        type,
        grantee: granteeUser?.id,
        scopes: getScopesOfAccess(accessItem),
        settings: canApplyFiltersToAccess({ type }) ? { filters } : {}
      };
    });
  }

  @HasPermission(permissions.createAccess)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createAccess(
    @Body() data: CreateAccessDto
  ): Promise<AccessModel> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription?.type === SubscriptionType.Basic
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    const type = data.type ?? (data.granteeUserId ? 'PRIVATE' : 'PUBLIC');

    if (
      type === 'MCP' &&
      !this.configurationService.get('ENABLE_FEATURE_MCP')
    ) {
      // The client hides the type while the feature is disabled, hence an
      // access of this type must not become a credential which is dormant
      // until the feature is enabled
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    if (!isValidGranteeOfAccess({ granteeUserId: data.granteeUserId, type })) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    if (data.filters?.length && !canApplyFiltersToAccess({ type })) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      return await this.accessService.createAccess({
        type,
        alias: data.alias || undefined,
        expiresAt: new Date(data.expiresAt),
        granteeUser: data.granteeUserId
          ? { connect: { id: data.granteeUserId } }
          : undefined,
        scopes: getScopesOfAccess({
          type,
          scopes: data.scopes
        }),
        settings: this.accessService.buildSettings(data.filters),
        user: { connect: { id: this.request.user.id } }
      });
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
  public async deleteAccess(@Param('id') id: string): Promise<void> {
    const originalAccess = await this.accessService.access({
      id,
      OR: [
        { granteeUserId: this.request.user.id },
        { userId: this.request.user.id }
      ]
    });

    if (!originalAccess) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    await this.accessService.deleteAccess({
      id
    });
  }

  @HasPermission(permissions.updateAccess)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateAccess(
    @Body() data: UpdateAccessDto,
    @Param('id') id: string
  ): Promise<AccessModel> {
    if (
      this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') &&
      this.request.user.subscription?.type === SubscriptionType.Basic
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

    if (
      !isValidGranteeOfAccess({
        granteeUserId: data.granteeUserId,
        type: originalAccess.type
      })
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    if (
      data.filters?.length &&
      !canApplyFiltersToAccess({ type: originalAccess.type })
    ) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }

    try {
      return await this.accessService.updateAccess({
        data: {
          alias: data.alias,
          expiresAt: new Date(data.expiresAt),
          granteeUser: data.granteeUserId
            ? { connect: { id: data.granteeUserId } }
            : { disconnect: true },
          scopes: getScopesOfAccess({
            scopes: data.scopes ?? originalAccess.scopes,
            type: originalAccess.type
          }),
          settings: this.accessService.buildSettings(data.filters)
        },
        where: { id }
      });
    } catch {
      throw new HttpException(
        getReasonPhrase(StatusCodes.BAD_REQUEST),
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
